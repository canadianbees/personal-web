import tempfile, subprocess, os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BINARY = os.getenv("VIDEO_PROCESSOR_PATH", "./video_processor")

async def compress_video(raw: bytes) -> tuple[bytes, bytes, bytes]:
    with tempfile.TemporaryDirectory() as tmpdir:
        input_file = Path(tmpdir) / "input.mp4"
        input_file.write_bytes(raw)

        # TODO: run in executor to avoid blocking the event loop
        result = subprocess.run(
            [BINARY, str(input_file), tmpdir],
            capture_output=True, timeout=120
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode())

        return (
            (Path(tmpdir) / "full.mp4").read_bytes(),
            (Path(tmpdir) / "preview.mp4").read_bytes(),
            (Path(tmpdir) / "thumb.webp").read_bytes(),
        )