import asyncio
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

async def record_upload(event_id: str, upload_id: str, media_type: str, full_url: str, thumb_url: str, preview_url: str = None, width: int = None, height: int = None, size_kb: float = None) -> bool:
    params = {
        "id": upload_id,
        "event_id": event_id,
        "media_type": media_type,
        "full_url": full_url,
        "thumb_url": thumb_url,
        "preview_url": preview_url,
        "width": width,
        "height": height,
        "size_kb": size_kb,
    }

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.table("uploads").insert(params).execute()
        )
        return True
    except Exception as e:
        print(f"[record_upload] error recording upload: {e} ")
        return False


async def record_conversion(upload_id: str, asset_name: str, source: str, before_kb: float, after_kb: float, reduction_pct: float, codec: str):
    params = {
        "upload_id": upload_id,
        "asset_name": asset_name,
        "source": source,
        "before_kb": before_kb,
        "after_kb": after_kb,
        "reduction_pct": reduction_pct,
        "codec": codec,
    }

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.table("asset_conversions").insert(params).execute()
        )
        return True
    except Exception as e:
        print(f"[record_conversion] error converting asset: {e} ")
        return False
