#include <filesystem>
#include <gtest/gtest.h>
#include "../encode.h"

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
}

// ── Test Fixture ──────────────────────────────────────────────────────────────
// Opens the test video before each test and closes it after.
// Each test gets a fresh format context so the file cursor is at the start.

class EncodeTests : public testing::Test {
protected:
    AVFormatContext* format_ctx = nullptr;
    int video_idx = -1;

    void SetUp() override {
        ASSERT_EQ(avformat_open_input(&format_ctx, "artifacts/stateside.mp4", nullptr, nullptr), 0)
            << "Failed to open test video — is artifacts/ in your build directory?";
        avformat_find_stream_info(format_ctx, nullptr);
        video_idx = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    }

    void TearDown() override {
        avformat_close_input(&format_ctx);
    }

    // helper — opens a fresh format context so we can encode twice in the same test
    // (av_read_frame advances the cursor, so you can't encode the same ctx twice)
    AVFormatContext* fresh_ctx() {
        AVFormatContext* ctx = nullptr;
        avformat_open_input(&ctx, "artifacts/stateside.mp4", nullptr, nullptr);
        avformat_find_stream_info(ctx, nullptr);
        return ctx;
    }
};

// ── open_decoder ──────────────────────────────────────────────────────────────

// should return a valid decoder context with correct dimensions
TEST_F(EncodeTests, OpenDecoderValidStream) {
    AVCodecContext* ctx = open_decoder(format_ctx, video_idx);

    ASSERT_NE(ctx, nullptr) << "Expected a valid decoder context";
    EXPECT_GT(ctx->width, 0);
    EXPECT_GT(ctx->height, 0);

    avcodec_free_context(&ctx);
}

// should return nullptr for an invalid stream index
TEST_F(EncodeTests, OpenDecoderInvalidStream) {
    AVCodecContext* ctx = open_decoder(format_ctx, -1);

    EXPECT_EQ(ctx, nullptr);
}

// ── open_encoder ─────────────────────────────────────────────────────────────

// should return a valid encoder context with the correct dimensions
TEST_F(EncodeTests, OpenEncoderValidParams) {
    AVCodecContext* ctx = open_encoder(1280, 720, 26);

    ASSERT_NE(ctx, nullptr);
    EXPECT_EQ(ctx->width, 1280);
    EXPECT_EQ(ctx->height, 720);
    EXPECT_EQ(ctx->pix_fmt, AV_PIX_FMT_YUV420P);

    avcodec_free_context(&ctx);
}

// preview encoder should use smaller dimensions
TEST_F(EncodeTests, OpenEncoderPreviewDimensions) {
    AVCodecContext* ctx = open_encoder(480, 270, 32);

    ASSERT_NE(ctx, nullptr);
    EXPECT_EQ(ctx->width, 480);
    EXPECT_EQ(ctx->height, 270);

    avcodec_free_context(&ctx);
}

// both high and low quality encoders should open successfully
TEST_F(EncodeTests, OpenEncoderDifferentCRF) {
    AVCodecContext* high_quality = open_encoder(1280, 720, 18);
    AVCodecContext* low_quality  = open_encoder(1280, 720, 40);

    ASSERT_NE(high_quality, nullptr);
    ASSERT_NE(low_quality,  nullptr);
    EXPECT_EQ(high_quality->width, low_quality->width);

    avcodec_free_context(&high_quality);
    avcodec_free_context(&low_quality);
}

// ── open_scaler ───────────────────────────────────────────────────────────────

// should return a valid scaler context for real video dimensions
TEST_F(EncodeTests, OpenScalerReturnsValidContext) {
    AVCodecParameters* params = format_ctx->streams[video_idx]->codecpar;
    SwsContext* sws = open_scaler(params, 1280, 720);

    EXPECT_NE(sws, nullptr);

    sws_freeContext(sws);
}

// scaler should work for preview dimensions too
TEST_F(EncodeTests, OpenScalerPreviewDimensions) {
    AVCodecParameters* params = format_ctx->streams[video_idx]->codecpar;
    SwsContext* sws = open_scaler(params, 480, 270);

    EXPECT_NE(sws, nullptr);

    sws_freeContext(sws);
}

// ── encode_output (full video) ────────────────────────────────────────────────

// encode_output should produce a non-empty .mp4 file at the output path
TEST_F(EncodeTests, EncodeOutputProducesFile) {
    std::string out_path = "/tmp/test_full.mp4";

    encode_output(format_ctx, video_idx, out_path, 26, 1280, -1, true);

    EXPECT_TRUE(std::filesystem::exists(out_path))
        << "Expected output file at " << out_path;
    EXPECT_GT(std::filesystem::file_size(out_path), 0u);
}

// output file should be openable by FFmpeg — verifies it is a valid MP4
TEST_F(EncodeTests, EncodeOutputIsValidVideo) {
    std::string out_path = "/tmp/test_valid.mp4";

    encode_output(format_ctx, video_idx, out_path, 26, 1280, -1, true);

    AVFormatContext* out_ctx = nullptr;
    int ok = avformat_open_input(&out_ctx, out_path.c_str(), nullptr, nullptr);

    EXPECT_EQ(ok, 0) << "Output file could not be opened by FFmpeg — may be corrupt";

    if (out_ctx) avformat_close_input(&out_ctx);
}

// output file should have a video stream
TEST_F(EncodeTests, EncodeOutputHasVideoStream) {
    std::string out_path = "/tmp/test_has_video.mp4";

    encode_output(format_ctx, video_idx, out_path, 26, 1280, -1, true);

    AVFormatContext* out_ctx = nullptr;
    avformat_open_input(&out_ctx, out_path.c_str(), nullptr, nullptr);
    avformat_find_stream_info(out_ctx, nullptr);

    int out_video_idx = av_find_best_stream(out_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);

    EXPECT_GE(out_video_idx, 0) << "Output file has no video stream";

    avformat_close_input(&out_ctx);
}

// ── encode_output (preview) ───────────────────────────────────────────────────

// preview should produce a non-empty file
TEST_F(EncodeTests, EncodePreviewProducesFile) {
    std::string out_path = "/tmp/test_preview.mp4";

    // duration_s=6 means only the first 6 seconds, no audio
    encode_output(format_ctx, video_idx, out_path, 32, 480, 6, false);

    EXPECT_TRUE(std::filesystem::exists(out_path));
    EXPECT_GT(std::filesystem::file_size(out_path), 0u);
}

// preview should be smaller than full encode (lower res + shorter duration)
TEST_F(EncodeTests, PreviewIsSmallerThanFull) {
    std::string full_path    = "/tmp/test_full_compare.mp4";
    std::string preview_path = "/tmp/test_preview_compare.mp4";

    encode_output(format_ctx, video_idx, full_path, 26, 1280, -1, true);

    // need a fresh context — av_read_frame already advanced the cursor
    AVFormatContext* ctx2 = fresh_ctx();
    int v2 = av_find_best_stream(ctx2, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    encode_output(ctx2, v2, preview_path, 32, 480, 6, false);
    avformat_close_input(&ctx2);

    size_t full_size    = std::filesystem::file_size(full_path);
    size_t preview_size = std::filesystem::file_size(preview_path);

    EXPECT_LT(preview_size, full_size)
        << "Preview should be smaller than full encode";
}

// preview output should also be a valid MP4
TEST_F(EncodeTests, PreviewIsValidVideo) {
    std::string out_path = "/tmp/test_preview_valid.mp4";

    encode_output(format_ctx, video_idx, out_path, 32, 480, 6, false);

    AVFormatContext* out_ctx = nullptr;
    int ok = avformat_open_input(&out_ctx, out_path.c_str(), nullptr, nullptr);

    EXPECT_EQ(ok, 0) << "Preview file could not be opened by FFmpeg";

    if (out_ctx) avformat_close_input(&out_ctx);
}

// ── encode_output (output dimensions) ────────────────────────────────────────

// output video should have the correct width
TEST_F(EncodeTests, EncodeOutputCorrectWidth) {
    std::string out_path = "/tmp/test_width.mp4";

    encode_output(format_ctx, video_idx, out_path, 26, 480, -1, true);

    AVFormatContext* out_ctx = nullptr;
    avformat_open_input(&out_ctx, out_path.c_str(), nullptr, nullptr);
    avformat_find_stream_info(out_ctx, nullptr);

    int out_video_idx = av_find_best_stream(out_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    ASSERT_GE(out_video_idx, 0);

    int out_width = out_ctx->streams[out_video_idx]->codecpar->width;

    EXPECT_EQ(out_width, 480) << "Output width should be 480";

    avformat_close_input(&out_ctx);
}