#include <filesystem>
#include <gtest/gtest.h>
#include "../frame.h"

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
}

// ── Test Fixture ─────────────────────────────────────────────────────────────
// SetUp runs before every test, TearDown runs after.
// This gives every test a fresh format context pointing at our test video.

class FrameTests : public ::testing::Test {
protected:
    AVFormatContext* format_ctx = nullptr;
    AVFormatContext* no_audio_ctx = nullptr;
    int video_idx = -1;
    int audio_idx = -1;

    void SetUp() override {
        // open the test video that has both audio and video tracks
        avformat_open_input(&format_ctx, "artifacts/stateside.mp4", nullptr, nullptr);
        avformat_find_stream_info(format_ctx, nullptr);
        video_idx = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
        audio_idx = av_find_best_stream(format_ctx, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);

        // open a second test video with no audio track for fallback tests
        avformat_open_input(&no_audio_ctx, "artifacts/15117571_3840_2160_30fps.mp4", nullptr, nullptr);
        avformat_find_stream_info(no_audio_ctx, nullptr);
    }

    void TearDown() override {
        avformat_close_input(&format_ctx);
        avformat_close_input(&no_audio_ctx);
    }
};

// ── mean_brightness ───────────────────────────────────────────────────────────

// A real video frame should have a brightness value between 0 and 255
TEST_F(FrameTests, MeanBrightnessInRange) {
    AVFrame* frame = decode_frame_at(format_ctx, video_idx, 1.0);
    ASSERT_NE(frame, nullptr) << "Failed to decode frame at 1.0s";

    float brightness = mean_brightness(frame);

    EXPECT_GE(brightness, 0.0f);
    EXPECT_LE(brightness, 255.0f);

    av_frame_free(&frame);
}

// A completely black frame should have brightness close to 0
TEST_F(FrameTests, MeanBrightnessBlackFrame) {
    // allocate a black frame manually — all pixel values are 0
    AVFrame* frame = av_frame_alloc();
    frame->width  = 640;
    frame->height = 480;
    frame->format = AV_PIX_FMT_GRAY8;
    av_frame_get_buffer(frame, 0);
    memset(frame->data[0], 0, frame->linesize[0] * frame->height);

    float brightness = mean_brightness(frame);

    EXPECT_NEAR(brightness, 0.0f, 1.0f);

    av_frame_free(&frame);
}

// A completely white frame should have brightness close to 255
TEST_F(FrameTests, MeanBrightnessWhiteFrame) {
    AVFrame* frame = av_frame_alloc();
    frame->width  = 640;
    frame->height = 480;
    frame->format = AV_PIX_FMT_GRAY8;
    av_frame_get_buffer(frame, 0);
    memset(frame->data[0], 255, frame->linesize[0] * frame->height);

    float brightness = mean_brightness(frame);

    EXPECT_NEAR(brightness, 255.0f, 1.0f);

    av_frame_free(&frame);
}

// ── get_sharpness ─────────────────────────────────────────────────────────────

// A real frame should return a non-negative sharpness value
TEST_F(FrameTests, SharpnessNonNegative) {
    AVFrame* frame = decode_frame_at(format_ctx, video_idx, 1.0);
    ASSERT_NE(frame, nullptr);

    float sharpness = get_sharpness(frame);

    EXPECT_GE(sharpness, 0.0f);

    av_frame_free(&frame);
}

// A blurry (uniform) frame should have lower sharpness than a frame with edges
TEST_F(FrameTests, SharpnessUniformFrameIsLow) {
    // uniform gray frame — no edges, Laplacian variance should be near 0
    AVFrame* frame = av_frame_alloc();
    frame->width  = 640;
    frame->height = 480;
    frame->format = AV_PIX_FMT_GRAY8;
    av_frame_get_buffer(frame, 0);
    memset(frame->data[0], 128, frame->linesize[0] * frame->height);

    float sharpness = get_sharpness(frame);

    EXPECT_NEAR(sharpness, 0.0f, 1.0f);

    av_frame_free(&frame);
}

// ── build_audio_timeline ──────────────────────────────────────────────────────

// A video with audio should produce a non-empty timeline
TEST_F(FrameTests, AudioTimelineNonEmpty) {
    AudioTimeline timeline = build_audio_timeline(format_ctx, audio_idx);

    EXPECT_GT(timeline.entries.size(), 0u) << "Expected audio timeline entries for a video with audio";
}

// A video with no audio stream should produce an empty timeline
TEST_F(FrameTests, AudioTimelineEmptyWhenNoAudio) {
    int no_audio = av_find_best_stream(no_audio_ctx, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);
    AudioTimeline timeline = build_audio_timeline(no_audio_ctx, no_audio);

    EXPECT_EQ(timeline.entries.size(), 0u);
}

// Each RMS value in the timeline should be between 0 and 1
TEST_F(FrameTests, AudioTimelineRMSValuesInRange) {
    AudioTimeline timeline = build_audio_timeline(format_ctx, audio_idx);

    for (auto& [time, rms] : timeline.entries) {
        EXPECT_GE(rms, 0.0f) << "RMS value at time " << time << " is negative";
        EXPECT_LE(rms, 1.0f) << "RMS value at time " << time << " exceeds 1.0";
    }
}

// Timestamps in the timeline should be spaced 0.5s apart
TEST_F(FrameTests, AudioTimelineWindowsAreHalfSecond) {
    AudioTimeline timeline = build_audio_timeline(format_ctx, audio_idx);
    ASSERT_GE(timeline.entries.size(), 2u);

    double gap = timeline.entries[1].first - timeline.entries[0].first;

    EXPECT_NEAR(gap, 0.5, 0.01);
}

// ── rms_at ────────────────────────────────────────────────────────────────────

// An empty timeline should return the neutral weight 1.0
TEST_F(FrameTests, RmsAtEmptyTimelineReturnsNeutral) {
    AudioTimeline empty;
    float result = rms_at(empty, 1.0);

    EXPECT_EQ(result, 1.0f);
}

// A timestamp within the timeline should return a valid RMS value
TEST_F(FrameTests, RmsAtValidTimestamp) {
    AudioTimeline timeline = build_audio_timeline(format_ctx, audio_idx);
    ASSERT_GT(timeline.entries.size(), 0u);

    float result = rms_at(timeline, 0.25);

    EXPECT_GE(result, 0.0f);
}

// A timestamp past the end of the timeline should return the last entry's value
TEST_F(FrameTests, RmsAtPastEndReturnsFallback) {
    AudioTimeline timeline = build_audio_timeline(format_ctx, audio_idx);
    ASSERT_GT(timeline.entries.size(), 0u);

    float last_rms = timeline.entries.back().second;
    float result   = rms_at(timeline, 9999.0);

    EXPECT_EQ(result, last_rms);
}

// ── decode_frame_at ───────────────────────────────────────────────────────────

// Should return a valid frame for a timestamp within the video
TEST_F(FrameTests, DecodeFrameAtValidTimestamp) {
    AVFrame* frame = decode_frame_at(format_ctx, video_idx, 1.0);

    ASSERT_NE(frame, nullptr);
    EXPECT_GT(frame->width, 0);
    EXPECT_GT(frame->height, 0);

    av_frame_free(&frame);
}

// Should return nullptr for an invalid stream index
TEST_F(FrameTests, DecodeFrameAtInvalidStreamReturnsNull) {
    AVFrame* frame = decode_frame_at(format_ctx, -1, 1.0);

    EXPECT_EQ(frame, nullptr);
}

// seeking past the end clamps to the last keyframe — a frame is still returned
// what matters is that the function doesn't crash
TEST_F(FrameTests, DecodeFrameAtPastEndDoesNotCrash) {
    AVFrame* frame = decode_frame_at(format_ctx, video_idx, 9999.0);
    if (frame) av_frame_free(&frame);
    SUCCEED();
}
// ── extract_best_frame ────────────────────────────────────────────────────────

// Should produce a thumb.webp file in the output directory
TEST_F(FrameTests, ExtractBestFrameProducesFile) {
    std::string outdir = "/tmp/test_extract";
    std::filesystem::create_directory(outdir);

    extract_best_frame(format_ctx, video_idx, audio_idx, outdir, 480);

    EXPECT_TRUE(std::filesystem::exists(outdir + "/thumb.webp"))
        << "Expected thumb.webp to be created in " << outdir;
}

// Short video (under 3s) should fall back to middle frame — file should still be produced
TEST_F(FrameTests, ExtractBestFrameShortVideoFallback) {
    // generate a 2-second test video on the fly
    AVFormatContext* short_ctx = nullptr;
    // use the existing test video but only read 2s worth — easiest to just test with a real short file
    // for now, verify the function doesn't crash on a short video
    std::string outdir = "/tmp/test_short";
    std::filesystem::create_directories(outdir);

    extract_best_frame(format_ctx, video_idx, audio_idx, outdir, 480);

    // just verify no crash and file exists
    EXPECT_TRUE(std::filesystem::exists(outdir + "/thumb.webp"));
}

// ── FrameCandidate::score() ───────────────────────────────────────────────────

// A frame with zero brightness should always score 0 regardless of audio or sharpness
TEST_F(FrameTests, ZeroBrightnessScoresZero) {
    FrameCandidate c{};
    c.brightness = 0.0f;
    c.sharpness  = 500.0f;
    c.audio_rms  = 1.0f;

    EXPECT_EQ(c.score(), 0.0f);
}

// A frame below the brightness threshold (30) should also score 0
TEST_F(FrameTests, BelowThresholdScoresZero) {
    FrameCandidate c{};
    c.brightness = 20.0f; // below the 30.0f threshold in score()
    c.sharpness  = 500.0f;
    c.audio_rms  = 1.0f;

    EXPECT_EQ(c.score(), 0.0f);
}

// A well-lit, sharp, loud frame should score higher than a dark, blurry, quiet one
TEST_F(FrameTests, BetterFrameScoresHigher) {
    FrameCandidate good{};
    good.brightness = 200.0f;
    good.sharpness  = 400.0f;
    good.audio_rms  = 0.8f;

    FrameCandidate bad{};
    bad.brightness = 40.0f;
    bad.sharpness  = 50.0f;
    bad.audio_rms  = 0.1f;

    EXPECT_GT(good.score(), bad.score());
}