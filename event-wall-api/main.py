import random
import string
import uuid
import os

from fastapi import FastAPI, UploadFile, BackgroundTasks, HTTPException, Header, Depends
from processors import compress_image, compress_video
from storage.gcs import upload_to_gcs
from db.db import record_upload, record_conversion

app = FastAPI()

API_SECRET = os.environ["API_SECRET"]  #TODO: set in Cloud Run env vars
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

    for file in files:
        if file.size and file.size > MAX_UPLOAD_BYTES:
            print(413, "File too large. Max 200MB. Skipping file")
            continue

        raw = await file.read(MAX_UPLOAD_BYTES + 1)

        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "File too large. Max 200MB.")

        bg.add_task(process_and_store, raw, file.content_type, event_slug, event_id)
    return { "queued": len(files) }

async def process_and_store(raw: bytes, content_type: str, slug: str, event_id: str):

    upload_id = str(uuid.uuid4())
    asset_name = generate_asset(slug)

    if "video" in content_type:
        # calls C++ binary
        full, preview, thumb = await compress_video(raw)
        reduct, before_kb, after_kb = calculate_reduction(raw, full)
        await record_conversion(upload_id=upload_id, asset_name=asset_name , source="compress_video" , before_kb=before_kb, after_kb=after_kb, reduction_pct=reduct, codec="H264"  )

        ok = await handle_upload(event_id=event_id, full=full, thumb=thumb,slug=slug,upload_id=upload_id, for_video=True, preview=preview)

        if not ok:
            raise HTTPException(413, "[process_and_store] error uploading video")

    else:
        full, thumb = await compress_image(raw)
        reduct, before_kb, after_kb = calculate_reduction(raw, full)
        await record_conversion(upload_id=upload_id, asset_name=asset_name , source="compress_image" , before_kb=before_kb, after_kb=after_kb, reduction_pct=reduct, codec="WEBP"  )

        ok = await handle_upload(event_id=event_id, full=full, thumb=thumb,slug=slug,upload_id=upload_id)

        if not ok:
            raise HTTPException(413, "[process_and_store] error uploading image")


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

async def handle_upload(event_id: str,full: bytes, thumb: bytes, slug: str, upload_id: str, for_video: bool = True,  preview: bytes = None):

    if for_video:
        full_url    = await upload_to_gcs(full,    slug, upload_id=upload_id, prefix="full")
        thumb_url   = await upload_to_gcs(thumb,   slug, upload_id=upload_id, prefix="thumbs")
        preview_url = await upload_to_gcs(preview, slug, upload_id=upload_id, prefix="preview")

        return await record_upload(upload_id=upload_id,event_id=event_id, full_url=full_url, thumb_url=thumb_url, preview_url=preview_url, media_type="video")


    full_url    = await upload_to_gcs(full,    slug, upload_id=upload_id, prefix="full")
    thumb_url   = await upload_to_gcs(thumb,   slug, upload_id=upload_id, prefix="thumbs")

    return await record_upload(upload_id=upload_id,event_id=event_id, full_url=full_url, thumb_url=thumb_url, media_type="image")

