extern "C" {
#include <libavformat/avformat.h>
#include <libswscale/swscale.h>
#include <libavutil/opt.h>
}

#include <chrono>
#include <string>
#include <thread>

#include "encode.h"
#include "frame.h"

static AVFormatContext* open_input(const char* input) {
    AVFormatContext* ctx = nullptr;
    if (avformat_open_input(&ctx, input, nullptr, nullptr) < 0) return nullptr;
    if (avformat_find_stream_info(ctx, nullptr) < 0) {
        avformat_close_input(&ctx);
        return nullptr;
    }
    return ctx;
}

int main(const int argc, char* argv[]) {

    fprintf(stderr, "Starting video_processor\n");

    if (argc < 3) {
        fprintf(stderr, "Usage: video_processor <input> <output_file>\n");
        return 1;
    }

    const char* input = argv[1];
    const char* outdir = argv[2];

    // Open three independent contexts — one per output so threads share no state
    fprintf(stderr, "Opening input contexts\n");
    AVFormatContext* full_ctx    = open_input(input);
    AVFormatContext* preview_ctx = open_input(input);
    AVFormatContext* frame_ctx   = open_input(input);

    if (!full_ctx || !preview_ctx || !frame_ctx) {
        fprintf(stderr, "Error: could not open input file: %s\n", input);
        if (full_ctx)    avformat_close_input(&full_ctx);
        if (preview_ctx) avformat_close_input(&preview_ctx);
        if (frame_ctx)   avformat_close_input(&frame_ctx);
        return 1;
    }

    const int full_video_idx    = av_find_best_stream(full_ctx,    AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    const int preview_video_idx = av_find_best_stream(preview_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    const int frame_video_idx   = av_find_best_stream(frame_ctx,   AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    const int frame_audio_idx   = av_find_best_stream(frame_ctx,   AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);

    fprintf(stderr, "Launching parallel encode threads\n");

    using clk = std::chrono::steady_clock;
    long long full_ms = 0, preview_ms = 0, frame_ms = 0;

    std::thread full_thread([&]() {
        fprintf(stderr, "Thread: full encode start\n");
        auto t0 = clk::now();
        encode_output(full_ctx, full_video_idx, outdir + std::string("/full.mp4"),
                      /*crf=*/26, /*max_w=*/1280, /*duration_s=*/-1, /*audio=*/true);
        full_ms = std::chrono::duration_cast<std::chrono::milliseconds>(clk::now() - t0).count();
        fprintf(stderr, "Thread: full encode done\n");
    });

    std::thread preview_thread([&]() {
        fprintf(stderr, "Thread: preview encode start\n");
        auto t0 = clk::now();
        encode_output(preview_ctx, preview_video_idx, outdir + std::string("/preview.mp4"),
                      /*crf=*/26, /*max_w=*/1280, /*duration_s=*/6, /*audio=*/false);
        preview_ms = std::chrono::duration_cast<std::chrono::milliseconds>(clk::now() - t0).count();
        fprintf(stderr, "Thread: preview encode done\n");
    });

    std::thread frame_thread([&]() {
        fprintf(stderr, "Thread: frame extraction start\n");
        auto t0 = clk::now();
        extract_best_frame(frame_ctx, frame_video_idx, frame_audio_idx, outdir, 960);
        frame_ms = std::chrono::duration_cast<std::chrono::milliseconds>(clk::now() - t0).count();
        fprintf(stderr, "Thread: frame extraction done\n");
    });

    full_thread.join();
    preview_thread.join();
    frame_thread.join();

    fprintf(stderr, "TIMING full_encode_ms %lld\n", full_ms);
    fprintf(stderr, "TIMING preview_encode_ms %lld\n", preview_ms);
    fprintf(stderr, "TIMING frame_extraction_ms %lld\n", frame_ms);

    avformat_close_input(&full_ctx);
    avformat_close_input(&preview_ctx);
    avformat_close_input(&frame_ctx);

    fprintf(stderr, "Done\n");
    return 0;
}