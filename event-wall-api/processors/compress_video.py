import asyncio
import tempfile
import subprocess
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BINARY = os.getenv("VIDEO_PROCESSOR_PATH", "./video_processor")

async def compress_video(raw: bytes) -> tuple[bytes, bytes, bytes, dict[str, float]]:
    with tempfile.TemporaryDirectory() as tmpdir:
        input_file = Path(tmpdir) / "input.mp4"
        input_file.write_bytes(raw)

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(
                [BINARY, str(input_file), tmpdir],
                capture_output=True, timeout=600
            )
        )

        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode())

        timings: dict[str, float] = {}
        for line in result.stderr.decode().splitlines():
            if line.startswith("TIMING ") or line.startswith("INFO "):
                parts = line.split()
                if len(parts) == 3:
                    try:
                        timings[parts[1]] = float(parts[2])
                    except ValueError:
                        pass

        return (
            (Path(tmpdir) / "full.mp4").read_bytes(),
            (Path(tmpdir) / "preview.mp4").read_bytes(),
            (Path(tmpdir) / "thumb.webp").read_bytes(),
            timings,
        )
