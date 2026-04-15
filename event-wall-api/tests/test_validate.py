import subprocess
import io
import pytest
from PIL import Image
from processors.validate import validate_file_type

@pytest.fixture
def jpeg_file(tmp_path):
    output = tmp_path / "test.jpg"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "color=red:size=640x480:duration=1",
        "-frames:v", "1", str(output)
    ], check=True, capture_output=True)
    return output

@pytest.fixture
def png_file(tmp_path):
    output = tmp_path / "test.png"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "color=blue:size=640x480:duration=1",
        "-frames:v", "1", str(output)
    ], check=True, capture_output=True)
    return output

@pytest.fixture
def webp_file(tmp_path):
    # ffmpeg's default build doesn't include libwebp — use Pillow instead
    output = tmp_path / "test.webp"
    Image.new("RGB", (640, 480), color=(0, 128, 0)).save(str(output), "WEBP")
    return output

@pytest.fixture
def mp4_file(tmp_path):
    output = tmp_path / "test.mp4"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=5:size=640x480:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
        "-c:v", "libx264", "-c:a", "aac", str(output)
    ], check=True, capture_output=True)
    return output

@pytest.fixture
def mov_file(tmp_path):
    output = tmp_path / "test.mov"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=5:size=640x480:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
        "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", str(output)
    ], check=True, capture_output=True)
    return output

@pytest.fixture
def invalid_file(tmp_path):
    # just random bytes — not a valid image or video
    output = tmp_path / "invalid.bin"
    output.write_bytes(b'\x00\x01\x02\x03\x04\x05\x06\x07')
    return output

# ── valid files ───────────────────────────────────────────────────────────────

def test_jpeg_is_valid(jpeg_file):
    raw = jpeg_file.read_bytes()
    assert validate_file_type(raw, "image/jpeg") == True

def test_png_is_valid(png_file):
    raw = png_file.read_bytes()
    assert validate_file_type(raw, "image/png") == True

def test_webp_is_valid(webp_file):
    raw = webp_file.read_bytes()
    assert validate_file_type(raw, "image/webp") == True

def test_mp4_is_valid(mp4_file):
    raw = mp4_file.read_bytes()
    assert validate_file_type(raw, "video/mp4") == True

def test_mov_is_valid(mov_file):
    raw = mov_file.read_bytes()
    assert validate_file_type(raw, "video/quicktime") == True

# ── invalid files ─────────────────────────────────────────────────────────────

def test_invalid_image_returns_false(invalid_file):
    raw = invalid_file.read_bytes()
    assert validate_file_type(raw, "image/jpeg") == False

def test_invalid_video_returns_false(invalid_file):
    raw = invalid_file.read_bytes()
    assert validate_file_type(raw, "video/mp4") == False

def test_unknown_content_type_returns_false(invalid_file):
    # unknown content type returns False
    raw = invalid_file.read_bytes()
    assert validate_file_type(raw, "application/octet-stream") == False

# ── mismatched content type ───────────────────────────────────────────────────

def test_video_bytes_labeled_as_image_returns_false(mp4_file):
    # MP4 bytes but labeled as image — should fail image magic byte check
    raw = mp4_file.read_bytes()
    assert validate_file_type(raw, "image/jpeg") == False

def test_image_bytes_labeled_as_video_returns_false(jpeg_file):
    # JPEG bytes but labeled as video — should fail video magic byte check
    raw = jpeg_file.read_bytes()
    assert validate_file_type(raw, "video/mp4") == False
