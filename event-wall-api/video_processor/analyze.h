#pragma once

extern "C" {
#include <libavformat/avformat.h>
}

// Decodes ~1 frame per second of the video stream, computes the mean absolute
// difference of the Y (luma) channel between consecutive sampled frames, and
// returns a normalized complexity score in [0, 1].
//
// Returns 0.5 (neutral / current default CRF 26) if:
//   - fmt_ctx is null or video_idx < 0
//   - the decoder could not be opened
//   - fewer than 3 frame diffs were successfully sampled (e.g. very short video)
float analyze_complexity(AVFormatContext* fmt_ctx, int video_idx);

// Maps a normalized complexity score to an H.264 CRF value.
// Lower score  → lower motion → higher CRF (smaller file, quality preserved).
// Higher score → high motion  → lower CRF (larger file, detail preserved).
//
//   score < 0.04  → CRF 32  (nearly static: posed shots, locked-off camera)
//   score < 0.10  → CRF 30  (low motion: conversation, slow walking)
//   score < 0.20  → CRF 28  (moderate motion)
//   score < 0.35  → CRF 26  (medium — matches previous hardcoded default)
//   score < 0.55  → CRF 24  (high motion: dancing, crowd movement)
//   score >= 0.55 → CRF 22  (very high: concerts, mosh pit, shaky cam)
int complexity_to_crf(float score);
