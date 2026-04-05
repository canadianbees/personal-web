import os
from dotenv import load_dotenv, dotenv_values
from google.cloud import storage

load_dotenv()

STORAGE_CLIENT = storage.Client()
EVENTS_BUCKET = os.getenv("GCS_EVENT_BUCKET")
ASSETS_BUCKET = os.getenv("GCS_ASSETS_BUCKET")

async def upload_to_gcs(data: bytes, slug: str, prefix:str, upload_id: str, to_events=True):
   """Uploads a file to the bucket."""

   dest_path = os.path.join(slug, prefix, upload_id)

   bucket_name = EVENTS_BUCKET if to_events else ASSETS_BUCKET
   db_url = dest_path if to_events else f"https://storage.googleapis.com/{ASSETS_BUCKET}/{dest_path}"

   bucket = STORAGE_CLIENT.bucket(bucket_name)
   blob = bucket.blob(dest_path)

   blob.upload_from_string(data)

   return db_url



