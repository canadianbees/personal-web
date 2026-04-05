#include "encode.h"

// Opens a decoder for a given stream in the input file.
// A decoder takes compressed video data (like H.264) and turns it into raw frames we can work with.
AVCodecContext* open_decoder(const AVFormatContext *format_ctx, const int stream_idx) {

    if (stream_idx < 0) {
        return nullptr;
    }
    // grab the codec parameters from the stream (tells us what format the video is in)
    const AVCodecParameters* params = format_ctx->streams[stream_idx]->codecpar;

    // find the right decoder for this format (e.g. H.264 decoder, HEVC decoder)
    const AVCodec* codec = avcodec_find_decoder(params->codec_id);
    if (!codec) {
        return nullptr;
    }

    // allocate a decoder context — this holds all the state for the decoder
    AVCodecContext* ctx = avcodec_alloc_context3(codec);

    // copy the stream's codec settings into the decoder context
    if (avcodec_parameters_to_context(ctx, params) < 0) {
        avcodec_free_context(&ctx);
        return nullptr;
    }

    // actually initialize and open the decoder so it's ready to decode packets
    if (avcodec_open2(ctx, codec, nullptr) < 0) {
        avcodec_free_context(&ctx);
        return nullptr;
    }

    return ctx;
}

// Opens an H.264 encoder with the given dimensions and quality setting.
// An encoder takes raw frames and compresses them back into a video format.
// crf controls quality; lower = better quality, larger file. 26 is a good default.
AVCodecContext* open_encoder(const int width, const int height, const int crf) {

    // find the H.264 encoder — this is the most widely supported video codec
    const AVCodec* codec = avcodec_find_encoder(AV_CODEC_ID_H264);
    if (!codec) {
        return nullptr;
    }

    // allocate the encoder context
    AVCodecContext* ctx = avcodec_alloc_context3(codec);

    // set output video dimensions
    ctx->width = width;
    ctx->height = height;

    // YUV420P is the standard pixel format for H.264 — every encoder expects this
    ctx->pix_fmt = AV_PIX_FMT_YUV420P;

    // time base defines how timestamps are measured — 1/60 means 60 frames per second
    ctx->time_base = (AVRational){1, 60};

    // set the quality — crf (constant rate factor) controls file size vs quality tradeoff
    av_opt_set_int(ctx, "crf", crf, AV_OPT_SEARCH_CHILDREN);

    // open the encoder so it's ready to receive frames
    if (avcodec_open2(ctx, codec, nullptr) < 0) {
        avcodec_free_context(&ctx);
        return nullptr;
    }

    return ctx;
}

// Creates an output file context — this represents the file we're writing to.
// It sets up the MP4 container, adds a video stream, and opens the file on disk.
AVFormatContext* open_output_file(const std::string &out_path, const AVCodecContext* enc_ctx) {
    AVFormatContext* ctx = nullptr;

    // allocate an output context — FFmpeg figures out the container format from the file extension
    if (avformat_alloc_output_context2(&ctx, nullptr, nullptr, out_path.c_str()) < 0) {
        return nullptr;
    }

    // add a video stream to the output file
    const AVStream* stream = avformat_new_stream(ctx, nullptr);

    // copy the encoder settings into the stream so the file knows what codec was used
    avcodec_parameters_from_context(stream->codecpar, enc_ctx);

    // open the actual file on disk for writing
    if (avio_open(&ctx->pb, out_path.c_str(), AVIO_FLAG_WRITE) < 0) {
        avformat_free_context(ctx);
        return nullptr;
    }

    // write the file header — every MP4 file starts with metadata about the streams
    if (avformat_write_header(ctx, nullptr) < 0) {
        avformat_free_context(ctx);
        return nullptr;
    }

    return ctx;
}

// Sets up a scaler that converts frames from the input dimensions/format to the output dimensions.
// We need this because the input video might be 4K and we want to output 1280px wide.
// SWS_BILINEAR is the scaling algorithm — a good balance of quality and speed.
SwsContext* open_scaler(AVCodecParameters* in_params, const int out_w, const int out_h) {
    return sws_getContext(
        in_params->width, in_params->height, static_cast<AVPixelFormat>(in_params->format),  // input dimensions + format
        out_w, out_h, AV_PIX_FMT_YUV420P,                                        // output dimensions + format
        SWS_BILINEAR, nullptr, nullptr, nullptr
    );
}

// Flushes any remaining frames out of the encoder after the input is exhausted.
// Encoders buffer frames internally — passing nullptr signals "no more input, give me everything you have left".
void flush_encoder(AVCodecContext* enc_ctx, AVFormatContext* out_ctx, AVPacket* out_packet) {
    avcodec_send_frame(enc_ctx, nullptr);

    // drain all remaining encoded packets
    while (avcodec_receive_packet(enc_ctx, out_packet) >= 0) {
        out_packet->stream_index = 0;
        av_interleaved_write_frame(out_ctx, out_packet);
        av_packet_unref(out_packet);
    }
}

// The main re-encoding function.
// Takes an input video file, decodes it, scales it, and re-encodes it to a new file.
// crf     — quality setting (26 = full quality, 32 = preview quality)
// max_w   — max output width in pixels (1280 for full, 480 for preview)
// duration_s — how many seconds to encode (-1 = full video, 6 = preview loop)
// audio   — whether to include audio in the output (true for full, false for preview)
void encode_output(AVFormatContext* format_ctx, const int video_idx, const std::string& outdir, const int crf, const int max_w, const int duration_s,
                   bool audio) {

    // grab the input video stream's codec parameters (width, height, format)
    AVCodecParameters *in_params = format_ctx->streams[video_idx]->codecpar;

    // calculate output height to preserve aspect ratio
    int new_h = (in_params->height * max_w / in_params->width);
    new_h = (new_h % 2 == 0) ? new_h : new_h + 1; // must be even for H.264

    // open the decoder for the input video stream
    AVCodecContext *decoder_ctx = open_decoder(format_ctx, video_idx);
    if (!decoder_ctx) {
        return;
    }

    // open the H.264 encoder for the output
    AVCodecContext *encoder_ctx = open_encoder(max_w, new_h, crf);
    if (!encoder_ctx) {
        avcodec_free_context(&decoder_ctx);
        return;
    }

    // open the output file and write the MP4 header
    AVFormatContext *out_ctx = open_output_file(outdir, encoder_ctx);
    if (!out_ctx) {
        avcodec_free_context(&decoder_ctx);
        avcodec_free_context(&encoder_ctx);
        return;
    }

    // set up the scaler to convert input frames to the output dimensions
    SwsContext *sws_ctx = open_scaler(in_params, max_w, new_h);

    // allocate packets and frames we'll reuse throughout the loop
    AVPacket *in_packet = av_packet_alloc();   // holds one compressed input packet
    AVFrame *dec_frame = av_frame_alloc();     // holds one decoded (raw) input frame
    AVFrame *scaled = av_frame_alloc();        // holds the frame after scaling
    AVPacket *out_packet = av_packet_alloc();  // holds one compressed output packet

    // set up the scaled frame buffer with the output dimensions
    scaled->width = max_w;
    scaled->height = new_h;
    scaled->format = AV_PIX_FMT_YUV420P;
    av_frame_get_buffer(scaled, 0);

    // read packets from the input file one at a time
    while (av_read_frame(format_ctx, in_packet) >= 0) {

        // skip packets that aren't from the video stream (e.g. audio packets)
        if (in_packet->stream_index != video_idx) {
            av_packet_unref(in_packet);
            continue;
        }

        // if we have a duration limit, stop once we've passed it
        if (duration_s > 0) {
            double timestamp = in_packet->pts * av_q2d(format_ctx->streams[video_idx]->time_base);
            if (timestamp > duration_s) {
                av_packet_unref(in_packet);
                break;
            }
        }

        // send the compressed packet to the decoder
        avcodec_send_packet(decoder_ctx, in_packet);
        av_packet_unref(in_packet);

        // receive decoded raw frames from the decoder (one packet can produce multiple frames)
        while (avcodec_receive_frame(decoder_ctx, dec_frame) >= 0) {

            // scale the decoded frame from input dimensions to output dimensions
            sws_scale(sws_ctx, dec_frame->data, dec_frame->linesize, 0, decoder_ctx->height, scaled->data,
                      scaled->linesize);

            // preserve the timestamp so the output video plays back at the right speed
            scaled->pts = dec_frame->pts;

            // send the scaled frame to the encoder
            avcodec_send_frame(encoder_ctx, scaled);

            // receive compressed output packets and write them to the output file
            while (avcodec_receive_packet(encoder_ctx, out_packet) >= 0) {
                out_packet->stream_index = 0;
                av_interleaved_write_frame(out_ctx, out_packet);
                av_packet_unref(out_packet);
            }

            // release the decoded frame so it can be reused
            av_frame_unref(dec_frame);
        }
    }

    // flush any frames still buffered inside the encoder
    flush_encoder(encoder_ctx, out_ctx, out_packet);

    // write the MP4 footer — required for a valid MP4 file
    av_write_trailer(out_ctx);

    // free everything
    sws_freeContext(sws_ctx);
    av_frame_free(&dec_frame);
    av_frame_free(&scaled);
    av_packet_free(&in_packet);
    av_packet_free(&out_packet);
    avcodec_free_context(&decoder_ctx);
    avcodec_free_context(&encoder_ctx);
    avio_closep(&out_ctx->pb);
    avformat_free_context(out_ctx);
}