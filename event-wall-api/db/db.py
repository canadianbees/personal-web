import asyncio
import os
import random
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

async def record_upload_pending(upload_id: str, event_id: str, media_type: str) -> bool:
    """Inserts a placeholder upload row immediately so the record exists even if processing fails."""
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.table("uploads").insert({
                "id": upload_id,
                "event_id": event_id,
                "media_type": media_type,
            }).execute()
        )
        return True
    except Exception as e:
        print(f"[record_upload_pending] error: {e}")
        return False


async def update_upload(upload_id: str, full_url: str, thumb_url: str, preview_url: str = None, width: int = None, height: int = None, size_kb: float = None) -> bool:
    """Updates the upload row with real URLs after transcoding completes."""
    params = {
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
            lambda: supabase.table("uploads").update(params).eq("id", upload_id).execute()
        )
        return True
    except Exception as e:
        print(f"[update_upload] error: {e}")
        return False


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


async def record_processing_start(upload_id: str, event_id: str):
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.table("processing_jobs").insert({
                "id": upload_id,
                "event_id": event_id,
                "status": "processing",
            }).execute()
        )
    except Exception as e:
        print(f"[record_processing_start] error: {e}")


async def record_processing_done(upload_id: str):
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.table("processing_jobs")
                .update({"status": "done"})
                .eq("id", upload_id)
                .execute()
        )
    except Exception as e:
        print(f"[record_processing_done] error: {e}")


async def record_processing_failed(upload_id: str, error: str):
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.table("processing_jobs")
                .update({"status": "failed", "error": error})
                .eq("id", upload_id)
                .execute()
        )
    except Exception as e:
        print(f"[record_processing_failed] error: {e}")


async def set_cover_url(event_id: str, thumb_url: str) -> None:
    """Unconditionally sets events.cover_url — called on every upload so the cover is always fresh."""
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.table("events").update({"cover_url": thumb_url}).eq("id", event_id).execute()
        )
    except Exception as e:
        print(f"[set_cover_url] error: {e}")


async def rotate_all_covers() -> int:
    """Picks a random thumb_url per event and updates cover_url. Returns count of events updated."""
    try:
        loop = asyncio.get_event_loop()
        events_result = await loop.run_in_executor(
            None,
            lambda: supabase.table("events").select("id").execute()
        )
        updated = 0
        for event in (events_result.data or []):
            eid = event["id"]
            uploads_result = await loop.run_in_executor(
                None,
                lambda: supabase.table("uploads").select("thumb_url").eq("event_id", eid).not_("thumb_url", "is", "null").execute()
            )
            thumbs = [u["thumb_url"] for u in (uploads_result.data or []) if u.get("thumb_url")]
            if not thumbs:
                continue
            chosen = random.choice(thumbs)
            await loop.run_in_executor(
                None,
                lambda: supabase.table("events").update({"cover_url": chosen}).eq("id", eid).execute()
            )
            updated += 1
        return updated
    except Exception as e:
        print(f"[rotate_all_covers] error: {e}")
        return 0


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
