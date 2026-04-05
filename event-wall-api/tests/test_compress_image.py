import subprocess
import pytest
from PIL import Image
import io
from processors.compress_image import compress_image


@pytest.fixture
def jpeg_bytes(tmp_path):
    output = tmp_path / "test.jpg"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "color=red:size=1920x1080:duration=1",
        "-frames:v", "1", str(output)
    ], check=True, capture_output=True)
    return output.read_bytes()


@pytest.fixture
def png_bytes(tmp_path):
    output = tmp_path / "test.png"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "color=blue:size=1920x1080:duration=1",
        "-frames:v", "1", str(output)
    ], check=True, capture_output=True)
    return output.read_bytes()


@pytest.fixture
def small_jpeg_bytes(tmp_path):
    # image smaller than 480px — thumbnail should not upscale
    output = tmp_path / "small.jpg"
    subprocess.run([
        "ffmpeg", "-f", "lavfi", "-i", "color=green:size=200x150:duration=1",
        "-frames:v", "1", str(output)
    ], check=True, capture_output=True)
    return output.read_bytes()


# ── return values ─────────────────────────────────────────────────────────────

def test_returns_two_values(jpeg_bytes):
    # compress_image should return (full, thumb)
    result = compress_image(jpeg_bytes)
    assert len(result) == 2


def test_both_outputs_are_bytes(jpeg_bytes):
    full, thumb = compress_image(jpeg_bytes)
    assert isinstance(full, bytes)
    assert isinstance(thumb, bytes)


def test_both_outputs_are_non_empty(jpeg_bytes):
    full, thumb = compress_image(jpeg_bytes)
    assert len(full) > 0
    assert len(thumb) > 0


# ── output format ─────────────────────────────────────────────────────────────

def test_full_output_is_webp(jpeg_bytes):
    full, _ = compress_image(jpeg_bytes)
    img = Image.open(io.BytesIO(full))
    assert img.format == "WEBP"


def test_thumb_output_is_webp(jpeg_bytes):
    _, thumb = compress_image(jpeg_bytes)
    img = Image.open(io.BytesIO(thumb))
    assert img.format == "WEBP"


# ── thumbnail dimensions ──────────────────────────────────────────────────────

def test_thumb_width_is_at_most_480(jpeg_bytes):
    _, thumb = compress_image(jpeg_bytes)
    img = Image.open(io.BytesIO(thumb))
    assert img.width <= 480


def test_thumb_height_is_at_most_480(jpeg_bytes):
    _, thumb = compress_image(jpeg_bytes)
    img = Image.open(io.BytesIO(thumb))
    assert img.height <= 480


def test_thumb_preserves_aspect_ratio(jpeg_bytes):
    # input is 1920x1080 (16:9) — thumbnail should maintain 16:9
    _, thumb = compress_image(jpeg_bytes)
    img = Image.open(io.BytesIO(thumb))
    ratio = img.width / img.height
    assert abs(ratio - (16 / 9)) < 0.02


# ── full image dimensions ─────────────────────────────────────────────────────

def test_full_image_is_larger_than_thumb(jpeg_bytes):
    full, thumb = compress_image(jpeg_bytes)
    full_img = Image.open(io.BytesIO(full))
    thumb_img = Image.open(io.BytesIO(thumb))
    assert full_img.width >= thumb_img.width
    assert full_img.height >= thumb_img.height
# ── small image handling ──────────────────────────────────────────────────────

def test_small_image_thumb_does_not_upscale(small_jpeg_bytes):
    # input is 200x150 — thumbnail should not be larger than original
    _, thumb = compress_image(small_jpeg_bytes)
    img = Image.open(io.BytesIO(thumb))
    assert img.width <= 200
    assert img.height <= 150


# ── file size ─────────────────────────────────────────────────────────────────

def test_thumb_is_smaller_than_full(jpeg_bytes):
    full, thumb = compress_image(jpeg_bytes)
    assert len(thumb) < len(full)

# ── works with png input ──────────────────────────────────────────────────────

def test_accepts_png_input(png_bytes):
    full, thumb = compress_image(png_bytes)
    assert len(full) > 0
    assert len(thumb) > 0


def test_png_input_produces_webp_output(png_bytes):
    full, thumb = compress_image(png_bytes)
    assert Image.open(io.BytesIO(full)).format == "WEBP"
    assert Image.open(io.BytesIO(thumb)).format == "WEBP"