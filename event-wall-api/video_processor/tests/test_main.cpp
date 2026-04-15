// Integration tests for the video_processor binary.
// Runs the compiled binary as a subprocess and verifies its exit codes and outputs.
// Assumes tests are executed from the build/ directory where the binary lives.

#include <filesystem>
#include <string>
#include <cstdlib>
#include <sys/wait.h>
#include <gtest/gtest.h>

extern "C" {
#include <libavformat/avformat.h>
}

static const char* BINARY     = "./video_processor";
static const char* TEST_VIDEO = "artifacts/stateside.mp4";

// ── argument validation ───────────────────────────────────────────────────────

// running the binary with no arguments should exit 1
TEST(MainArgTests, NoArgsReturnsOne) {
    int ret = std::system((std::string(BINARY) + " 2>/dev/null").c_str());
    EXPECT_EQ(WEXITSTATUS(ret), 1);
}

// running with only one argument (missing output dir) should also exit 1
TEST(MainArgTests, OneArgReturnsOne) {
    int ret = std::system((std::string(BINARY) + " input.mp4 2>/dev/null").c_str());
    EXPECT_EQ(WEXITSTATUS(ret), 1);
}

// ── full pipeline ─────────────────────────────────────────────────────────────
// Run the binary once per fixture so we don't re-encode for every assertion.

class MainPipelineTests : public testing::Test {
protected:
    static std::string outdir;

    static void SetUpTestSuite() {
        outdir = "/tmp/test_main_pipeline";
        std::filesystem::create_directories(outdir);
        std::string cmd = std::string(BINARY) + " " + TEST_VIDEO + " " + outdir + " 2>/dev/null";
        std::system(cmd.c_str());
    }
};

std::string MainPipelineTests::outdir;

// binary should exit 0 for a valid input
TEST_F(MainPipelineTests, ValidInputExitsZero) {
    std::string cmd = std::string(BINARY) + " " + TEST_VIDEO + " " + outdir + " 2>/dev/null";
    int ret = std::system(cmd.c_str());
    EXPECT_EQ(WEXITSTATUS(ret), 0);
}

// all three output files should exist
TEST_F(MainPipelineTests, ProducesFullMp4) {
    EXPECT_TRUE(std::filesystem::exists(outdir + "/full.mp4"));
}

TEST_F(MainPipelineTests, ProducesPreviewMp4) {
    EXPECT_TRUE(std::filesystem::exists(outdir + "/preview.mp4"));
}

TEST_F(MainPipelineTests, ProducesThumbWebp) {
    EXPECT_TRUE(std::filesystem::exists(outdir + "/thumb.webp"));
}

// all three output files should be non-empty
TEST_F(MainPipelineTests, AllOutputFilesAreNonEmpty) {
    EXPECT_GT(std::filesystem::file_size(outdir + "/full.mp4"),    static_cast<uintmax_t>(0));
    EXPECT_GT(std::filesystem::file_size(outdir + "/preview.mp4"), static_cast<uintmax_t>(0));
    EXPECT_GT(std::filesystem::file_size(outdir + "/thumb.webp"),  static_cast<uintmax_t>(0));
}

// full.mp4 should be openable by FFmpeg
TEST_F(MainPipelineTests, FullMp4IsValidVideo) {
    AVFormatContext* ctx = nullptr;
    int ok = avformat_open_input(&ctx, (outdir + "/full.mp4").c_str(), nullptr, nullptr);
    EXPECT_EQ(ok, 0) << "full.mp4 should be a valid video file";
    if (ctx) avformat_close_input(&ctx);
}

// preview.mp4 should be openable by FFmpeg
TEST_F(MainPipelineTests, PreviewMp4IsValidVideo) {
    AVFormatContext* ctx = nullptr;
    int ok = avformat_open_input(&ctx, (outdir + "/preview.mp4").c_str(), nullptr, nullptr);
    EXPECT_EQ(ok, 0) << "preview.mp4 should be a valid video file";
    if (ctx) avformat_close_input(&ctx);
}

// preview.mp4 should be smaller than full.mp4 (lower res + shorter duration)
TEST_F(MainPipelineTests, PreviewIsSmallerThanFull) {
    auto full_size    = std::filesystem::file_size(outdir + "/full.mp4");
    auto preview_size = std::filesystem::file_size(outdir + "/preview.mp4");
    EXPECT_LT(preview_size, full_size) << "Preview should be smaller than full encode";
}

// full.mp4 should have an audio stream
TEST_F(MainPipelineTests, FullMp4HasAudioStream) {
    AVFormatContext* ctx = nullptr;
    avformat_open_input(&ctx, (outdir + "/full.mp4").c_str(), nullptr, nullptr);
    avformat_find_stream_info(ctx, nullptr);
    int audio_idx = av_find_best_stream(ctx, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);
    EXPECT_GE(audio_idx, 0) << "full.mp4 should contain an audio stream";
    if (ctx) avformat_close_input(&ctx);
}

// preview.mp4 should have no audio stream
TEST_F(MainPipelineTests, PreviewMp4HasNoAudioStream) {
    AVFormatContext* ctx = nullptr;
    avformat_open_input(&ctx, (outdir + "/preview.mp4").c_str(), nullptr, nullptr);
    avformat_find_stream_info(ctx, nullptr);
    int audio_idx = av_find_best_stream(ctx, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);
    EXPECT_LT(audio_idx, 0) << "preview.mp4 should have no audio stream";
    if (ctx) avformat_close_input(&ctx);
}
