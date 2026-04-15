# ── Stage 1: Build C++ binary ─────────────────────────────────────────────────
FROM python:3.13-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake make g++ pkg-config \
    libavcodec-dev libavformat-dev libavutil-dev \
    libswscale-dev libswresample-dev \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY video_processor/ .
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --target video_processor -j$(nproc)


# ── Stage 2: Python runtime ───────────────────────────────────────────────────
FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libavcodec61 libavformat61 libavutil59 libswscale8 libswresample5 \
    libopencv-imgcodecs410 \
    libheif1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /src/build/video_processor /app/video_processor_bin

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV VIDEO_PROCESSOR_PATH=/app/video_processor_bin
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
