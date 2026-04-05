import subprocess
import pytest
import asyncio
import os
from processors.compress_video import compress_video

# path to the compiled C++ binary in WSL
BINARY_PATH = "/home/celina_alzenor/video_processor/build/video_processor"
# cd "/mnt/c/Users/Celina Alzenor/Desktop/Projects/personal-web/event-wall-api"
# pytest tests/test_compress_video.py -v

@pytest.fixture
def mp4_bytes(tmp_path):
    output = tmp_path / "test.mp4"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=10:size=1280x720:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=10",
        "-c:v", "libx264", "-c:a", "aac", str(output)
    ], check=True, capture_output=True)
    return output.read_bytes()


@pytest.fixture
def short_mp4_bytes(tmp_path):
    # video under 3 seconds — tests the short video fallback in extract_best_frame
    output = tmp_path / "short.mp4"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=2:size=640x480:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
        "-c:v", "libx264", "-c:a", "aac", str(output)
    ], check=True, capture_output=True)
    return output.read_bytes()


@pytest.fixture
def no_audio_mp4_bytes(tmp_path):
    # video with no audio stream — tests audio fallback scoring
    output = tmp_path / "no_audio.mp4"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=10:size=640x480:rate=30",
        "-c:v", "libx264", "-an", str(output)
    ], check=True, capture_output=True)
    return output.read_bytes()


# ── binary exists ─────────────────────────────────────────────────────────────

def test_binary_exists():
    assert os.path.exists(BINARY_PATH), f"video_processor binary not found at {BINARY_PATH}"


# ── return values ─────────────────────────────────────────────────────────────

def test_returns_three_values(mp4_bytes):
    result = asyncio.run(compress_video(mp4_bytes))
    assert len(result) == 3


def test_all_outputs_are_bytes(mp4_bytes):
    full, preview, thumb = asyncio.run(compress_video(mp4_bytes))
    assert isinstance(full, bytes)
    assert isinstance(preview, bytes)
    assert isinstance(thumb, bytes)


def test_all_outputs_are_non_empty(mp4_bytes):
    full, preview, thumb = asyncio.run(compress_video(mp4_bytes))
    assert len(full) > 0
    assert len(preview) > 0
    assert len(thumb) > 0


# ── output formats ────────────────────────────────────────────────────────────

def test_full_output_is_valid_mp4(mp4_bytes, tmp_path):
    full, _, _ = asyncio.run(compress_video(mp4_bytes))
    output = tmp_path / "full.mp4"
    output.write_bytes(full)

    # ffprobe returns 0 if the file is a valid video
    result = subprocess.run([
        "ffprobe", "-v", "error", str(output)
    ], capture_output=True)
    assert result.returncode == 0, "full.mp4 is not a valid video file"


def test_preview_output_is_valid_mp4(mp4_bytes, tmp_path):
    _, preview, _ = asyncio.run(compress_video(mp4_bytes))
    output = tmp_path / "preview.mp4"
    output.write_bytes(preview)

    result = subprocess.run([
        "ffprobe", "-v", "error", str(output)
    ], capture_output=True)
    assert result.returncode == 0, "preview.mp4 is not a valid video file"


def test_thumb_output_is_valid_webp(mp4_bytes, tmp_path):
    _, _, thumb = asyncio.run(compress_video(mp4_bytes))
    output = tmp_path / "thumb.webp"
    output.write_bytes(thumb)

    result = subprocess.run([
        "ffprobe", "-v", "error", str(output)
    ], capture_output=True)
    assert result.returncode == 0, "thumb.webp is not a valid image file"


# ── preview duration ──────────────────────────────────────────────────────────

def test_preview_is_shorter_than_full(mp4_bytes, tmp_path):
    full, preview, _ = asyncio.run(compress_video(mp4_bytes))

    full_path = tmp_path / "full.mp4"
    preview_path = tmp_path / "preview.mp4"
    full_path.write_bytes(full)
    preview_path.write_bytes(preview)

    # get duration of each using ffprobe
    def get_duration(path):
        result = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path)
        ], capture_output=True, text=True)
        return float(result.stdout.strip())

    full_duration    = get_duration(full_path)
    preview_duration = get_duration(preview_path)

    assert preview_duration <= 6.5, f"Preview duration {preview_duration}s exceeds 6s limit"
    assert preview_duration < full_duration, "Preview should be shorter than full video"


# ── file sizes ────────────────────────────────────────────────────────────────

def test_preview_is_smaller_than_full(mp4_bytes):
    full, preview, _ = asyncio.run(compress_video(mp4_bytes))
    assert len(preview) < len(full), "Preview should be smaller than full video"


def test_full_is_smaller_than_input(mp4_bytes):
    full, _, _ = asyncio.run(compress_video(mp4_bytes))
    assert len(full) < len(mp4_bytes), "Encoded full video should be smaller than raw input"


# ── edge cases ────────────────────────────────────────────────────────────────

def test_short_video_does_not_crash(short_mp4_bytes):
    # videos under 3s use middle frame fallback — should not crash
    full, preview, thumb = asyncio.run(compress_video(short_mp4_bytes))
    assert len(full) > 0
    assert len(thumb) > 0


def test_no_audio_video_does_not_crash(no_audio_mp4_bytes):
    # videos with no audio stream use visual-only scoring — should not crash
    full, preview, thumb = asyncio.run(compress_video(no_audio_mp4_bytes))
    assert len(full) > 0
    assert len(thumb) > 0