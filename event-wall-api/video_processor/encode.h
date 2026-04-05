#pragma once
extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libswscale/swscale.h>
#include <libavutil/opt.h>
}

#include <string>

void encode_output(AVFormatContext *format_ctx, int video_idx, const std::string& outdir, int crf, int max_w, int duration_s, bool audio);
SwsContext* open_scaler(AVCodecParameters* in_params, int out_w, int out_h);
AVCodecContext* open_encoder(int width, int height, int crf);
AVCodecContext* open_decoder(const AVFormatContext *format_ctx, int stream_idx);
AVFormatContext* open_output_file(const std::string &out_path, const AVCodecContext *enc_ctx);
