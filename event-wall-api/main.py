import asyncio
import random
import string
import uuid
import os
import io

from PIL import Image
from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException, Header, Depends
from pydantic import BaseModel
from processors import compress_image, compress_video
from storage.gcs import upload_to_gcs, generate_signed_upload_url, download_from_gcs, delete_from_gcs
from db.db import record_upload, record_upload_pending, update_upload, record_conversion, record_processing_start, record_processing_done, record_processing_failed, set_cover_url, rotate_all_covers
from monitoring.metrics import (
    record_upload_success, record_upload_failure,
    record_processing_latency, record_compression, record_gcs_latency, record_encode_step_latency, timed
)

app = FastAPI()

API_SECRET = os.getenv("API_SECRET")  #TODO: set in Cloud Run env vars
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200MB

# Limit concurrent processing jobs to avoid OOM — each video job can use ~1GB RAM.
# 4GiB Cloud Run instance: 3 concurrent jobs = ~3GB peak, leaving 1GB headroom.
_processing_semaphore = asyncio.Semaphore(3)


async def verify_secret(api_secret: str = Header(None)):
    if api_secret != API_SECRET:
        raise HTTPException(401, "Unauthorized")


@app.post("/upload/init", dependencies=[Depends(verify_secret)])
async def upload_init(event_slug: str, event_id: str, content_type: str):
    """Returns a signed GCS URL for direct large-file upload. Call /upload/process after the PUT completes."""
    gcs_path = f"temp/{uuid.uuid4()}/raw"
    signed_url = generate_signed_upload_url(gcs_path, content_type)
    return {"signed_url": signed_url, "gcs_path": gcs_path}


class _InitItem(BaseModel):
    content_type: str

class _BatchInitRequest(BaseModel):
    event_slug: str
    event_id: str
    files: list[_InitItem]

@app.post("/upload/batch-init", dependencies=[Depends(verify_secret)])
async def upload_batch_init(req: _BatchInitRequest):
    """Returns signed GCS URLs for all files in one call."""
    results = []
    for item in req.files:
        gcs_path = f"temp/{uuid.uuid4()}/raw"
        signed_url = generate_signed_upload_url(gcs_path, item.content_type)
        results.append({"signed_url": signed_url, "gcs_path": gcs_path})
    return {"results": results}


class _ProcessItem(BaseModel):
    gcs_path: str
    content_type: str

class _BatchProcessRequest(BaseModel):
    event_slug: str
    event_id: str
    files: list[_ProcessItem]

@app.post("/upload/batch-process", dependencies=[Depends(verify_secret)])
async def upload_batch_process(req: _BatchProcessRequest, bg: BackgroundTasks):
    """Kicks off processing for all files already uploaded to GCS via /upload/batch-init."""
    upload_ids = []
    for item in req.files:
        upload_id = str(uuid.uuid4())
        bg.add_task(process_from_gcs, item.gcs_path, item.content_type, req.event_slug, req.event_id, upload_id)
        upload_ids.append(upload_id)
    return {"upload_ids": upload_ids}


@app.post("/upload/process", dependencies=[Depends(verify_secret)])
async def upload_process(
    event_slug: str,
    event_id: str,
    gcs_path: str,
    content_type: str,
    bg: BackgroundTasks,
):
    """Kicks off processing for a file already uploaded to GCS via /upload/init."""
    upload_id = str(uuid.uuid4())
    bg.add_task(process_from_gcs, gcs_path, content_type, event_slug, event_id, upload_id)
    return {"queued": 1, "upload_id": upload_id}


@app.post("/upload", dependencies=[Depends(verify_secret)])
async def ingest(
        files: list[UploadFile],
        event_slug: str,
        event_id: str,
        bg: BackgroundTasks
):

    queued = 0
    for file in files:
        if file.size and file.size > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "File too large. Max 200MB.")

        raw = await file.read(MAX_UPLOAD_BYTES + 1)

        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "File too large. Max 200MB.")

        bg.add_task(process_and_store, raw, file.content_type, event_slug, event_id)
        queued += 1
    return { "queued": queued }

@app.post("/admin/rotate-covers", dependencies=[Depends(verify_secret)])
async def rotate_covers():
    """Called by Cloud Scheduler every 6 hours to randomise event cover images."""
    count = await rotate_all_covers()
    return {"rotated": count}


async def process_and_store(raw: bytes, content_type: str, slug: str, event_id: str, upload_id: str = None):

    upload_id = upload_id or str(uuid.uuid4())
    asset_name = generate_asset(slug)
    media_type = "video" if "video" in content_type else "image"

    await record_upload_pending(upload_id, event_id, media_type)
    await record_processing_start(upload_id, event_id)

    try:
        if media_type == "video":
            with timed("video") as t:
                full, preview, thumb, timings = await compress_video(raw)
            record_processing_latency("video", t["ms"])
            for step, ms in timings.items():
                record_encode_step_latency(step, ms)

            reduct, before_kb, after_kb = calculate_reduction(raw, full)
            record_compression("H264", before_kb, after_kb, reduct)

            width, height = get_dimensions(thumb)
            ok = await handle_upload(event_id=event_id, full=full, thumb=thumb, slug=slug, upload_id=upload_id, for_video=True, preview=preview, width=width, height=height, size_kb=after_kb)
            if not ok:
                raise RuntimeError("[process_and_store] error uploading video")

            await record_conversion(upload_id=upload_id, asset_name=asset_name, source="compress_video", before_kb=before_kb, after_kb=after_kb, reduction_pct=reduct, codec="H264")

        else:
            with timed("image") as t:
                loop = asyncio.get_event_loop()
                full, thumb = await loop.run_in_executor(None, compress_image, raw)
            record_processing_latency("image", t["ms"])

            reduct, before_kb, after_kb = calculate_reduction(raw, full)
            record_compression("WEBP", before_kb, after_kb, reduct)

            width, height = get_dimensions(full)
            ok = await handle_upload(event_id=event_id, full=full, thumb=thumb, slug=slug, upload_id=upload_id, for_video=False, width=width, height=height, size_kb=after_kb)
            if not ok:
                raise RuntimeError("[process_and_store] error uploading image")

            await record_conversion(upload_id=upload_id, asset_name=asset_name, source="compress_image", before_kb=before_kb, after_kb=after_kb, reduction_pct=reduct, codec="WEBP")

        record_upload_success(media_type)
        await record_processing_done(upload_id)

    except Exception as e:
        record_upload_failure(media_type)
        await record_processing_failed(upload_id, str(e))
        raise


async def process_from_gcs(gcs_path: str, content_type: str, slug: str, event_id: str, upload_id: str):
    async with _processing_semaphore:
        raw = await download_from_gcs(gcs_path)
        await process_and_store(raw, content_type, slug, event_id, upload_id)
        await delete_from_gcs(gcs_path)


def get_kb(raw: bytes) -> float:
    return len(raw) / 1000

def get_dimensions(data: bytes) -> tuple[int, int]:
    img = Image.open(io.BytesIO(data))
    return img.width, img.height

def generate_asset(slug:str) -> str:
    length = 8
    asset_id = ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    return f"{slug}.{asset_id}"

def calculate_reduction(raw: bytes, transformed:bytes) -> tuple[float, float, float]:
    before_kb = get_kb(raw)
    after_kb = get_kb(transformed)

    determinant = (after_kb / before_kb) * 100

    return 100 - determinant, before_kb, after_kb

async def handle_upload(event_id: str, full: bytes, thumb: bytes, slug: str, upload_id: str, for_video: bool = True, preview: bytes = None, width: int = None, height: int = None, size_kb: float = None):

    if for_video:
        with timed("gcs_video") as t:
            full_url, thumb_url, preview_url = await asyncio.gather(
                upload_to_gcs(full,    slug, upload_id=upload_id, prefix="full",    content_type="video/mp4"),
                upload_to_gcs(thumb,   slug, upload_id=upload_id, prefix="thumbs",  content_type="image/webp"),
                upload_to_gcs(preview, slug, upload_id=upload_id, prefix="preview", content_type="video/mp4"),
            )
        record_gcs_latency("gcs_video", t["ms"])

        ok = await update_upload(upload_id=upload_id, full_url=full_url, thumb_url=thumb_url, preview_url=preview_url, width=width, height=height, size_kb=size_kb)
        if ok:
            await set_cover_url(event_id, thumb_url)
        return ok

    with timed("gcs_image") as t:
        full_url, thumb_url = await asyncio.gather(
            upload_to_gcs(full,  slug, upload_id=upload_id, prefix="full",   content_type="image/webp"),
            upload_to_gcs(thumb, slug, upload_id=upload_id, prefix="thumbs", content_type="image/webp"),
        )
    record_gcs_latency("gcs_image", t["ms"])

    ok = await update_upload(upload_id=upload_id, full_url=full_url, thumb_url=thumb_url, width=width, height=height, size_kb=size_kb)
    if ok:
        await set_cover_url(event_id, thumb_url)
    return ok
