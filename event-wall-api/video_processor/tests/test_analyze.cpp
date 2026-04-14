#include <gtest/gtest.h>
#include "../analyze.h"

extern "C" {
#include <libavformat/avformat.h>
}

class AnalyzeTests : public testing::Test {
protected:
    AVFormatContext* format_ctx = nullptr;
    int video_idx = -1;

    void SetUp() override {
        ASSERT_EQ(avformat_open_input(&format_ctx, "artifacts/stateside.mp4", nullptr, nullptr), 0);
        avformat_find_stream_info(format_ctx, nullptr);
        video_idx = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    }

    void TearDown() override {
        if (format_ctx) avformat_close_input(&format_ctx);
    }
};

// Score for a real video must be in [0, 1]
TEST_F(AnalyzeTests, ScoreInRange) {
    float score = analyze_complexity(format_ctx, video_idx);
    EXPECT_GE(score, 0.0f);
    EXPECT_LE(score, 1.0f);
}

// Invalid stream index returns fallback 0.5
TEST_F(AnalyzeTests, InvalidStreamReturnsFallback) {
    float score = analyze_complexity(format_ctx, -1);
    EXPECT_FLOAT_EQ(score, 0.5f);
}

// Null context returns fallback 0.5
TEST_F(AnalyzeTests, NullContextReturnsFallback) {
    float score = analyze_complexity(nullptr, 0);
    EXPECT_FLOAT_EQ(score, 0.5f);
}

// complexity_to_crf must always return a value in the valid H.264 CRF range
TEST_F(AnalyzeTests, CRFAlwaysInValidRange) {
    for (float s : {0.0f, 0.03f, 0.05f, 0.12f, 0.25f, 0.40f, 0.60f, 1.0f}) {
        int crf = complexity_to_crf(s);
        EXPECT_GE(crf, 22) << "CRF below minimum for score=" << s;
        EXPECT_LE(crf, 32) << "CRF above maximum for score=" << s;
    }
}

// Monotonicity: higher score → lower or equal CRF (more motion → more bits)
TEST_F(AnalyzeTests, CRFMonotonicallyDecreases) {
    int prev_crf = complexity_to_crf(0.0f);
    for (float s : {0.05f, 0.15f, 0.25f, 0.40f, 0.60f, 1.0f}) {
        int crf = complexity_to_crf(s);
        EXPECT_LE(crf, prev_crf)
            << "CRF should not increase as complexity score increases (score=" << s << ")";
        prev_crf = crf;
    }
}

// Full pipeline: analyze a real video, pick CRF, verify it's in valid range
TEST_F(AnalyzeTests, FullVideoProducesValidCRF) {
    float score = analyze_complexity(format_ctx, video_idx);
    int   crf   = complexity_to_crf(score);
    EXPECT_GE(crf, 22);
    EXPECT_LE(crf, 32);
}
