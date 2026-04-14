import asyncio
import datetime
import os
from dotenv import load_dotenv
import google.auth
import google.auth.transport.requests
from google.cloud import storage

load_dotenv()

STORAGE_CLIENT = storage.Client()
EVENTS_BUCKET = os.getenv("GCS_EVENT_BUCKET")
ASSETS_BUCKET = os.getenv("GCS_ASSETS_BUCKET")

async def upload_to_gcs(data: bytes, slug: str, prefix: str, upload_id: str, to_events=True, content_type: str = "application/octet-stream"):
    """Uploads a file to the bucket."""
    dest_path = os.path.join(slug, prefix, upload_id)

    bucket_name = EVENTS_BUCKET if to_events else ASSETS_BUCKET
    db_url = dest_path if to_events else f"https://storage.googleapis.com/{ASSETS_BUCKET}/{dest_path}"

    bucket = STORAGE_CLIENT.bucket(bucket_name)
    blob = bucket.blob(dest_path)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: blob.upload_from_string(data, content_type=content_type))

    return db_url


def generate_signed_upload_url(gcs_path: str, content_type: str, expiration_minutes: int = 15) -> str:
    """Returns a signed PUT URL for direct client-to-GCS upload."""
    from google.auth import compute_engine, impersonated_credentials

    source_credentials = compute_engine.Credentials()
    source_credentials.refresh(google.auth.transport.requests.Request())

    signing_credentials = impersonated_credentials.Credentials(
        source_credentials=source_credentials,
        target_principal=source_credentials.service_account_email,
        target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )

    bucket = STORAGE_CLIENT.bucket(EVENTS_BUCKET)
    blob = bucket.blob(gcs_path)
    return blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=expiration_minutes),
        method="PUT",
        content_type=content_type,
        credentials=signing_credentials,
    )


async def download_from_gcs(gcs_path: str) -> bytes:
    """Downloads raw bytes from the events bucket."""
    blob = STORAGE_CLIENT.bucket(EVENTS_BUCKET).blob(gcs_path)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, blob.download_as_bytes)


async def delete_from_gcs(gcs_path: str):
    """Deletes a blob from the events bucket."""
    blob = STORAGE_CLIENT.bucket(EVENTS_BUCKET).blob(gcs_path)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, blob.delete)
