import random
import string
import uuid
import os

from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException, Header, Depends
from processors import compress_image, compress_video
from storage.gcs import upload_to_gcs
from db.db import record_upload, record_conversion
from monitoring.metrics import (
    record_upload_success, record_upload_failure,
    record_processing_latency, record_compression, timed
)

app = FastAPI()

API_SECRET = os.getenv("API_SECRET")  #TODO: set in Cloud Run env vars
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200MB


async def verify_secret(api_secret: str = Header(None)):
    if api_secret != API_SECRET:
        raise HTTPException(401, "Unauthorized")


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

async def process_and_store(raw: bytes, content_type: str, slug: str, event_id: str):

    upload_id = str(uuid.uuid4())
    asset_name = generate_asset(slug)
    media_type = "video" if "video" in content_type else "image"

    try:
        if media_type == "video":
            with timed("video") as t:
                full, preview, thumb = await compress_video(raw)
            record_processing_latency("video", t["ms"])

            reduct, before_kb, after_kb = calculate_reduction(raw, full)
            record_compression("H264", before_kb, after_kb, reduct)

            ok = await handle_upload(event_id=event_id, full=full, thumb=thumb, slug=slug, upload_id=upload_id, for_video=True, preview=preview)
            if not ok:
                raise HTTPException(500, "[process_and_store] error uploading video")

            await record_conversion(upload_id=upload_id, asset_name=asset_name, source="compress_video", before_kb=before_kb, after_kb=after_kb, reduction_pct=reduct, codec="H264")

        else:
            with timed("image") as t:
                full, thumb = await compress_image(raw)
            record_processing_latency("image", t["ms"])

            reduct, before_kb, after_kb = calculate_reduction(raw, full)
            record_compression("WEBP", before_kb, after_kb, reduct)

            ok = await handle_upload(event_id=event_id, full=full, thumb=thumb, slug=slug, upload_id=upload_id)
            if not ok:
                raise HTTPException(500, "[process_and_store] error uploading image")

            await record_conversion(upload_id=upload_id, asset_name=asset_name, source="compress_image", before_kb=before_kb, after_kb=after_kb, reduction_pct=reduct, codec="WEBP")

        record_upload_success(media_type)

    except Exception as e:
        record_upload_failure(media_type)
        raise


def get_kb(raw: bytes) -> float:
    return len(raw) / 1000

def generate_asset(slug:str) -> str:
    length = 8
    asset_id = ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    return f"{slug}.{asset_id}"

def calculate_reduction(raw: bytes, transformed:bytes) -> tuple[float, float, float]:
    before_kb = get_kb(raw)
    after_kb = get_kb(transformed)

    determinant = (after_kb / before_kb) * 100

    return 100 - determinant, before_kb, after_kb

async def handle_upload(event_id: str, full: bytes, thumb: bytes, slug: str, upload_id: str, for_video: bool = True, preview: bytes = None):

    if for_video:
        full_url    = await upload_to_gcs(full,    slug, upload_id=upload_id, prefix="full",    content_type="video/mp4")
        thumb_url   = await upload_to_gcs(thumb,   slug, upload_id=upload_id, prefix="thumbs",  content_type="image/webp")
        preview_url = await upload_to_gcs(preview, slug, upload_id=upload_id, prefix="preview", content_type="video/mp4")

        return await record_upload(upload_id=upload_id, event_id=event_id, full_url=full_url, thumb_url=thumb_url, preview_url=preview_url, media_type="video")

    full_url  = await upload_to_gcs(full,  slug, upload_id=upload_id, prefix="full",   content_type="image/webp")
    thumb_url = await upload_to_gcs(thumb, slug, upload_id=upload_id, prefix="thumbs", content_type="image/webp")

    return await record_upload(upload_id=upload_id, event_id=event_id, full_url=full_url, thumb_url=thumb_url, media_type="image")
