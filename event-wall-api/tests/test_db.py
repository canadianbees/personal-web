import asyncio
import pytest
from unittest import mock
import db.db as db_module


@pytest.fixture(autouse=True)
def mock_supabase():
    with mock.patch.object(db_module, 'supabase') as m:
        yield m


# ── record_upload ─────────────────────────────────────────────────────────────

def test_record_upload_returns_true_on_success(mock_supabase):
    result = asyncio.run(db_module.record_upload(
        event_id="evt-1", upload_id="upl-1", media_type="image",
        full_url="http://full", thumb_url="http://thumb"
    ))
    assert result == True


def test_record_upload_inserts_into_uploads_table(mock_supabase):
    asyncio.run(db_module.record_upload(
        event_id="evt-1", upload_id="upl-1", media_type="video",
        full_url="http://full", thumb_url="http://thumb", preview_url="http://preview"
    ))
    mock_supabase.table.assert_called_with("uploads")


def test_record_upload_returns_false_on_exception(mock_supabase):
    mock_supabase.table.side_effect = Exception("DB error")
    result = asyncio.run(db_module.record_upload(
        event_id="evt-1", upload_id="upl-1", media_type="image",
        full_url="http://full", thumb_url="http://thumb"
    ))
    assert result == False


# ── record_conversion ─────────────────────────────────────────────────────────

def test_record_conversion_returns_true_on_success(mock_supabase):
    result = asyncio.run(db_module.record_conversion(
        upload_id="upl-1", asset_name="event.abcd1234", source="compress_image",
        before_kb=200.0, after_kb=100.0, reduction_pct=50.0, codec="WEBP"
    ))
    assert result == True


def test_record_conversion_inserts_into_conversions_table(mock_supabase):
    asyncio.run(db_module.record_conversion(
        upload_id="upl-1", asset_name="event.abcd1234", source="compress_video",
        before_kb=500.0, after_kb=300.0, reduction_pct=40.0, codec="H264"
    ))
    mock_supabase.table.assert_called_with("asset_conversions")


def test_record_conversion_returns_false_on_exception(mock_supabase):
    mock_supabase.table.side_effect = Exception("DB error")
    result = asyncio.run(db_module.record_conversion(
        upload_id="upl-1", asset_name="event.abcd1234", source="compress_image",
        before_kb=200.0, after_kb=100.0, reduction_pct=50.0, codec="WEBP"
    ))
    assert result == False
