import asyncio
import os
import pytest
from unittest import mock
from storage import gcs


@pytest.fixture(autouse=True)
def mock_storage_client():
    with mock.patch.object(gcs, 'STORAGE_CLIENT') as m:
        yield m


# ── return values ─────────────────────────────────────────────────────────────

def test_upload_to_events_bucket_returns_dest_path(mock_storage_client):
    gcs.EVENTS_BUCKET = "test-events"
    result = asyncio.run(gcs.upload_to_gcs(b"data", "slug1", "full", "uid-1", to_events=True))
    assert result == os.path.join("slug1", "full", "uid-1")


def test_upload_to_assets_bucket_returns_public_url(mock_storage_client):
    gcs.ASSETS_BUCKET = "test-assets"
    result = asyncio.run(gcs.upload_to_gcs(b"data", "slug1", "full", "uid-1", to_events=False))
    dest = os.path.join("slug1", "full", "uid-1")
    assert result == f"https://storage.googleapis.com/test-assets/{dest}"


# ── bucket selection ──────────────────────────────────────────────────────────

def test_upload_uses_events_bucket_when_to_events_true(mock_storage_client):
    gcs.EVENTS_BUCKET = "events-bkt"
    asyncio.run(gcs.upload_to_gcs(b"x", "slug", "p", "id", to_events=True))
    mock_storage_client.bucket.assert_called_with("events-bkt")


def test_upload_uses_assets_bucket_when_to_events_false(mock_storage_client):
    gcs.ASSETS_BUCKET = "assets-bkt"
    asyncio.run(gcs.upload_to_gcs(b"x", "slug", "p", "id", to_events=False))
    mock_storage_client.bucket.assert_called_with("assets-bkt")


# ── blob upload ───────────────────────────────────────────────────────────────

def test_upload_calls_upload_from_string_with_data(mock_storage_client):
    mock_blob = mock.MagicMock()
    mock_storage_client.bucket.return_value.blob.return_value = mock_blob
    asyncio.run(gcs.upload_to_gcs(b"hello bytes", "slug", "prefix", "uid", to_events=True))
    args, kwargs = mock_blob.upload_from_string.call_args
    assert args[0] == b"hello bytes"


def test_upload_sets_content_type(mock_storage_client):
    mock_blob = mock.MagicMock()
    mock_storage_client.bucket.return_value.blob.return_value = mock_blob
    asyncio.run(gcs.upload_to_gcs(b"x", "slug", "prefix", "uid", content_type="video/mp4"))
    _, kwargs = mock_blob.upload_from_string.call_args
    assert kwargs["content_type"] == "video/mp4"


def test_upload_uses_correct_blob_path(mock_storage_client):
    mock_blob = mock.MagicMock()
    mock_storage_client.bucket.return_value.blob.return_value = mock_blob
    asyncio.run(gcs.upload_to_gcs(b"x", "my-event", "thumbs", "abc-123", to_events=True))
    expected_path = os.path.join("my-event", "thumbs", "abc-123")
    mock_storage_client.bucket.return_value.blob.assert_called_with(expected_path)
