import asyncio
import pytest
from unittest import mock
from fastapi.testclient import TestClient

import main
from main import app, calculate_reduction, generate_asset, get_kb

client = TestClient(app, raise_server_exceptions=True)
SECRET = 'test-secret'
HEADERS = {'api-secret': SECRET}


@pytest.fixture
def mock_externals(monkeypatch):
    monkeypatch.setattr(main, 'upload_to_gcs', mock.AsyncMock(return_value='http://url'))
    monkeypatch.setattr(main, 'record_upload', mock.AsyncMock(return_value=True))
    monkeypatch.setattr(main, 'record_conversion', mock.AsyncMock(return_value=True))


# ── pure functions ────────────────────────────────────────────────────────────

def test_get_kb():
    assert get_kb(b'x' * 1000) == 1.0


def test_calculate_reduction_50_percent():
    reduction, before, after = calculate_reduction(b'x' * 1000, b'x' * 500)
    assert before == 1.0
    assert after == 0.5
    assert reduction == 50.0


def test_calculate_reduction_no_change():
    reduction, _, _ = calculate_reduction(b'x' * 1000, b'x' * 1000)
    assert reduction == 0.0


def test_generate_asset_format():
    asset = generate_asset('my-event')
    slug, suffix = asset.split('.')
    assert slug == 'my-event'
    assert len(suffix) == 8
    assert suffix.isalnum()


# ── auth ──────────────────────────────────────────────────────────────────────

def test_missing_secret_returns_401():
    response = client.post('/upload', params={'event_slug': 'slug', 'event_id': 'eid'})
    assert response.status_code == 401


def test_wrong_secret_returns_401():
    response = client.post(
        '/upload', headers={'api-secret': 'wrong'},
        params={'event_slug': 'slug', 'event_id': 'eid'}
    )
    assert response.status_code == 401


def test_correct_secret_is_accepted():
    with mock.patch.object(main, 'process_and_store', mock.AsyncMock()):
        response = client.post(
            '/upload', headers=HEADERS,
            params={'event_slug': 'slug', 'event_id': 'eid'},
            files=[('files', ('test.jpg', b'\xff\xd8\xff', 'image/jpeg'))]
        )
    assert response.status_code == 200


# ── ingest ────────────────────────────────────────────────────────────────────

def test_upload_single_file_returns_queued_1():
    with mock.patch.object(main, 'process_and_store', mock.AsyncMock()):
        response = client.post(
            '/upload', headers=HEADERS,
            params={'event_slug': 'slug', 'event_id': 'eid'},
            files=[('files', ('test.jpg', b'\xff\xd8\xff', 'image/jpeg'))]
        )
    assert response.json() == {'queued': 1}


def test_upload_multiple_files_returns_correct_count():
    with mock.patch.object(main, 'process_and_store', mock.AsyncMock()):
        response = client.post(
            '/upload', headers=HEADERS,
            params={'event_slug': 'slug', 'event_id': 'eid'},
            files=[
                ('files', ('a.jpg', b'\xff\xd8\xff', 'image/jpeg')),
                ('files', ('b.jpg', b'\xff\xd8\xff', 'image/jpeg')),
            ]
        )
    assert response.json() == {'queued': 2}


def test_oversized_file_returns_413():
    with mock.patch.object(main, 'MAX_UPLOAD_BYTES', 10):
        with mock.patch.object(main, 'process_and_store', mock.AsyncMock()):
            response = client.post(
                '/upload', headers=HEADERS,
                params={'event_slug': 'slug', 'event_id': 'eid'},
                files=[('files', ('big.mp4', b'x' * 20, 'video/mp4'))]
            )
    assert response.status_code == 413



# ── process_and_store ─────────────────────────────────────────────────────────

def test_process_and_store_image_calls_compress_image(mock_externals):
    with mock.patch.object(main, 'compress_image', mock.AsyncMock(return_value=(b'full', b'thumb'))):
        asyncio.run(main.process_and_store(b'raw', 'image/jpeg', 'slug', 'eid'))
        main.compress_image.assert_called_once_with(b'raw')


def test_process_and_store_video_calls_compress_video(mock_externals):
    with mock.patch.object(main, 'compress_video', mock.AsyncMock(return_value=(b'full', b'preview', b'thumb'))):
        asyncio.run(main.process_and_store(b'raw', 'video/mp4', 'slug', 'eid'))
        main.compress_video.assert_called_once_with(b'raw')


def test_process_and_store_image_records_webp_conversion(mock_externals):
    with mock.patch.object(main, 'compress_image', mock.AsyncMock(return_value=(b'full', b'thumb'))):
        asyncio.run(main.process_and_store(b'raw', 'image/jpeg', 'slug', 'eid'))
    _, kwargs = main.record_conversion.call_args
    assert kwargs['codec'] == 'WEBP'
    assert kwargs['source'] == 'compress_image'


def test_process_and_store_video_records_h264_conversion(mock_externals):
    with mock.patch.object(main, 'compress_video', mock.AsyncMock(return_value=(b'full', b'preview', b'thumb'))):
        asyncio.run(main.process_and_store(b'raw', 'video/mp4', 'slug', 'eid'))
    _, kwargs = main.record_conversion.call_args
    assert kwargs['codec'] == 'H264'
    assert kwargs['source'] == 'compress_video'


def test_process_and_store_calls_handle_upload(mock_externals):
    with mock.patch.object(main, 'compress_image', mock.AsyncMock(return_value=(b'full', b'thumb'))):
        with mock.patch.object(main, 'handle_upload', mock.AsyncMock(return_value=True)) as mock_hu:
            asyncio.run(main.process_and_store(b'raw', 'image/jpeg', 'slug', 'eid'))
            mock_hu.assert_called_once()


def test_process_and_store_raises_on_failed_video_upload(mock_externals):
    main.record_upload.return_value = False
    with mock.patch.object(main, 'compress_video', mock.AsyncMock(return_value=(b'full', b'preview', b'thumb'))):
        with pytest.raises(Exception):
            asyncio.run(main.process_and_store(b'raw', 'video/mp4', 'slug', 'eid'))


def test_process_and_store_raises_on_failed_image_upload(mock_externals):
    main.record_upload.return_value = False
    with mock.patch.object(main, 'compress_image', mock.AsyncMock(return_value=(b'full', b'thumb'))):
        with pytest.raises(Exception):
            asyncio.run(main.process_and_store(b'raw', 'image/jpeg', 'slug', 'eid'))


# ── handle_upload ─────────────────────────────────────────────────────────────

def test_handle_upload_video_uploads_three_assets(mock_externals):
    asyncio.run(main.handle_upload('eid', b'full', b'thumb', 'slug', 'uid', for_video=True, preview=b'preview'))
    assert main.upload_to_gcs.call_count == 3


def test_handle_upload_image_uploads_two_assets(mock_externals):
    asyncio.run(main.handle_upload('eid', b'full', b'thumb', 'slug', 'uid', for_video=False))
    assert main.upload_to_gcs.call_count == 2


def test_handle_upload_video_media_type(mock_externals):
    asyncio.run(main.handle_upload('eid', b'full', b'thumb', 'slug', 'uid', for_video=True, preview=b'preview'))
    _, kwargs = main.record_upload.call_args
    assert kwargs['media_type'] == 'video'


def test_handle_upload_image_media_type(mock_externals):
    asyncio.run(main.handle_upload('eid', b'full', b'thumb', 'slug', 'uid', for_video=False))
    _, kwargs = main.record_upload.call_args
    assert kwargs['media_type'] == 'image'


def test_handle_upload_video_includes_preview_url(mock_externals):
    asyncio.run(main.handle_upload('eid', b'full', b'thumb', 'slug', 'uid', for_video=True, preview=b'preview'))
    _, kwargs = main.record_upload.call_args
    assert kwargs['preview_url'] is not None


def test_handle_upload_image_has_no_preview_url(mock_externals):
    asyncio.run(main.handle_upload('eid', b'full', b'thumb', 'slug', 'uid', for_video=False))
    _, kwargs = main.record_upload.call_args
    assert 'preview_url' not in kwargs
