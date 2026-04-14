#include "analyze.h"
#include "encode.h"  // open_decoder() — reuse consistent with rest of codebase

#include <cmath>
#include <cstdio>

// Compute mean absolute difference of the Y (luma) plane between two frames.
//
// IMPORTANT: Must step by linesize[0], NOT width.
// FFmpeg aligns rows to 32-byte boundaries so linesize[0] >= width.
// This matches the pattern used by mean_brightness() and get_sharpness() in frame.cpp.
//
// Subsampling every STEP pixels keeps this fast (~0.5ms per frame pair at 1080p)
// without meaningfully affecting the motion estimate.
static float luma_mad(const AVFrame* a, const AVFrame* b) {
    constexpr int STEP = 4;
    long long acc = 0;
    int count = 0;

    for (int y = 0; y < a->height; y += STEP) {
        const uint8_t* row_a = a->data[0] + y * a->linesize[0];
        const uint8_t* row_b = b->data[0] + y * b->linesize[0];
        for (int x = 0; x < a->width; x += STEP) {
            int d = static_cast<int>(row_a[x]) - static_cast<int>(row_b[x]);
            acc += d < 0 ? -d : d;
            ++count;
        }
    }

    return count > 0 ? static_cast<float>(acc) / static_cast<float>(count) : 0.0f;
}

float analyze_complexity(AVFormatContext* fmt_ctx, int video_idx) {
    constexpr float FALLBACK = 0.5f;  // maps to CRF 26 — the previous hardcoded default

    if (!fmt_ctx || video_idx < 0) return FALLBACK;

    // Determine sample interval: decode ~1 frame per second.
    // Guard against 0/0 rational (some MPEG-TS streams) and absurdly high fps
    // (e.g. when avg_frame_rate is reported as the stream time_base reciprocal).
    AVStream* stream = fmt_ctx->streams[video_idx];
    double fps = av_q2d(stream->avg_frame_rate);
    if (fps <= 0.0 || fps > 240.0) fps = 30.0;
    const int skip = static_cast<int>(fps + 0.5);

    // Reuse open_decoder() for consistency — same flags, thread_count=0, etc.
    AVCodecContext* dec = open_decoder(fmt_ctx, video_idx);
    if (!dec) return FALLBACK;

    AVPacket* pkt  = av_packet_alloc();
    AVFrame*  cur  = av_frame_alloc();
    AVFrame*  prev = av_frame_alloc();
    bool has_prev  = false;
    int  frame_n   = 0;   // total frames decoded
    int  sample_n  = 0;   // frame pairs compared (~1 per second)
    double mad_sum = 0.0;

    // Called for every decoded frame.
    // av_frame_move_ref transfers the buffer reference from cur → prev without
    // copying pixel data, then resets cur to an empty allocatable frame.
    auto process = [&]() {
        if (frame_n % skip == 0) {
            if (has_prev
                && cur->width  == prev->width
                && cur->height == prev->height
                && cur->data[0] != nullptr
                && prev->data[0] != nullptr) {
                mad_sum += luma_mad(prev, cur);
                ++sample_n;
            }
            av_frame_unref(prev);
            av_frame_move_ref(prev, cur);   // prev takes ownership; cur is reset
            has_prev = true;
        }
        av_frame_unref(cur);
        ++frame_n;
    };

    // Main decode loop
    while (av_read_frame(fmt_ctx, pkt) >= 0) {
        if (pkt->stream_index == video_idx) {
            if (avcodec_send_packet(dec, pkt) >= 0) {
                while (avcodec_receive_frame(dec, cur) >= 0) {
                    process();
                }
            }
        }
        av_packet_unref(pkt);
    }

    // Flush decoder — H.264 with B-frames holds back 2–4 frames internally.
    // Without this flush, the last few seconds of a 30s video are never sampled.
    avcodec_send_packet(dec, nullptr);
    while (avcodec_receive_frame(dec, cur) >= 0) {
        process();
    }

    av_frame_free(&cur);
    av_frame_free(&prev);
    av_packet_free(&pkt);
    avcodec_free_context(&dec);

    // Short video guard: fewer than 3 diffs makes the estimate unreliable.
    // (A 2s video at 30fps yields at most 1 diff pair with skip=30.)
    if (sample_n < 3) {
        fprintf(stderr, "analyze: too few samples (%d), using fallback score\n", sample_n);
        return FALLBACK;
    }

    // Normalize to [0, 1].
    // Raw per-pixel MAD ranges for real-world video:
    //   0–2:   static (locked camera, screen recording)
    //   2–10:  low motion (conversation, slow pan)
    //   10–25: moderate (walking, gentle crowd movement)
    //   25–50: high motion (concert crowd, dancing)
    //   50+:   extreme (shaky cam, rapid cuts, strobe lighting)
    // Dividing by 50 maps the practical ceiling to 1.0.
    const float avg_mad = static_cast<float>(mad_sum / sample_n);
    const float score   = std::min(avg_mad / 50.0f, 1.0f);

    fprintf(stderr, "analyze: frames=%d samples=%d avg_mad=%.2f score=%.4f\n",
            frame_n, sample_n, avg_mad, score);

    return score;
}

int complexity_to_crf(float score) {
    if (score < 0.04f) return 32;
    if (score < 0.10f) return 30;
    if (score < 0.20f) return 28;
    if (score < 0.35f) return 26;
    if (score < 0.55f) return 24;
    return 22;
}
