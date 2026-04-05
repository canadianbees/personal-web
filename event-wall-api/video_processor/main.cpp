extern "C" {
#include <libavformat/avformat.h>
#include <libswscale/swscale.h>
#include <libavutil/opt.h>
}

#include <string>

#include "encode.h"
#include "frame.h"

int main(const int argc, char* argv[]) {

    fprintf(stderr, "Starting video_processor\n");
    fprintf(stderr, "argc: %d\n", argc);

    if (argc < 3) {
        fprintf(stderr, "Usage: video_processor <input> <output_file>\n");
        return 1;
    }

    const char* input = argv[1];
    const char* outdir = argv[2];

    // open video file and find video stream
    AVFormatContext* format_ctx = nullptr;
    fprintf(stderr, "Opening input file: %s\n", input);

    avformat_open_input(&format_ctx, input, nullptr, nullptr);

    fprintf(stderr, "Finding stream info\n");
    avformat_find_stream_info(format_ctx, nullptr);

    fprintf(stderr, "Finding streams\n");

    int video_idx = av_find_best_stream(format_ctx, AVMEDIA_TYPE_VIDEO, -1, -1, nullptr, 0);
    int audio_idx = av_find_best_stream(format_ctx, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);

    fprintf(stderr, "video_idx: %d, audio_idx: %d\n", video_idx, audio_idx);
    fprintf(stderr, "Starting encode_output full\n");
    // decode and re-encode
    // full h.264 (crf=26, scale= 1280:-2, aac audio)
    encode_output(format_ctx, video_idx, outdir + std::string("/full.mp4"), /*crf=*/26, /*max_w=*/1280, /*duration_s=*/-1, /*audio=*/true);

    fprintf(stderr, "Starting encode_output preview\n");

    // first 6 seconds, no audio, scale = 480:-2, crf=32
    encode_output(format_ctx, video_idx, outdir + std::string("/preview.mp4"), /*crf=*/32, /*max_w=*/480, /*duration_s=*/6, /*audio=*/false);

    fprintf(stderr, "Starting extract_best_frame\n");

    // poster frame
    extract_best_frame(format_ctx, video_idx, audio_idx, outdir + std::string("/thumb.webp"), 480);

    fprintf(stderr, "Done\n");

    avformat_close_input(&format_ctx);

    return 0;
}