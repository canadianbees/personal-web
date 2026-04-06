#include "encode.h"

// Opens a decoder for a given stream in the input file.
AVCodecContext* open_decoder(const AVFormatContext *format_ctx, const int stream_idx) {

    if (stream_idx < 0) {
        return nullptr;
    }
    const AVCodecParameters* params = format_ctx->streams[stream_idx]->codecpar;
    const AVCodec* codec = avcodec_find_decoder(params->codec_id);
    if (!codec) {
        return nullptr;
    }
    AVCodecContext* ctx = avcodec_alloc_context3(codec);
    if (avcodec_parameters_to_context(ctx, params) < 0) {
        avcodec_free_context(&ctx);
        return nullptr;
    }
    if (avcodec_open2(ctx, codec, nullptr) < 0) {
        avcodec_free_context(&ctx);
        return nullptr;
    }
    return ctx;
}

// Opens an H.264 encoder with the given dimensions and quality setting.
AVCodecContext* open_encoder(const int width, const int height, const int crf) {

    const AVCodec* codec = avcodec_find_encoder(AV_CODEC_ID_H264);
    if (!codec) {
        return nullptr;
    }
    AVCodecContext* ctx = avcodec_alloc_context3(codec);
    ctx->width     = width;
    ctx->height    = height;
    ctx->pix_fmt   = AV_PIX_FMT_YUV420P;
    ctx->time_base = (AVRational){1, 60};
    av_opt_set_int(ctx, "crf", crf, AV_OPT_SEARCH_CHILDREN);
    if (avcodec_open2(ctx, codec, nullptr) < 0) {
        avcodec_free_context(&ctx);
        return nullptr;
    }
    return ctx;
}

// Creates an output file context with a video stream, and optionally an audio stream.
AVFormatContext* open_output_file(const std::string &out_path, const AVCodecContext* video_enc_ctx, const AVCodecContext* audio_enc_ctx) {
    AVFormatContext* ctx = nullptr;
    if (avformat_alloc_output_context2(&ctx, nullptr, nullptr, out_path.c_str()) < 0) {
        return nullptr;
    }

    AVStream* video_stream = avformat_new_stream(ctx, nullptr);
    avcodec_parameters_from_context(video_stream->codecpar, video_enc_ctx);
    video_stream->time_base = video_enc_ctx->time_base;

    if (audio_enc_ctx) {
        AVStream* audio_stream = avformat_new_stream(ctx, nullptr);
        avcodec_parameters_from_context(audio_stream->codecpar, audio_enc_ctx);
        audio_stream->time_base = audio_enc_ctx->time_base;
    }

    if (avio_open(&ctx->pb, out_path.c_str(), AVIO_FLAG_WRITE) < 0) {
        avformat_free_context(ctx);
        return nullptr;
    }
    if (avformat_write_header(ctx, nullptr) < 0) {
        avformat_free_context(ctx);
        return nullptr;
    }
    return ctx;
}

// Sets up a scaler to convert frames from input dimensions/format to output dimensions.
SwsContext* open_scaler(AVCodecParameters* in_params, const int out_w, const int out_h) {
    return sws_getContext(
        in_params->width, in_params->height, static_cast<AVPixelFormat>(in_params->format),
        out_w, out_h, AV_PIX_FMT_YUV420P,
        SWS_BILINEAR, nullptr, nullptr, nullptr
    );
}

// Flushes any remaining frames out of the encoder.
void flush_encoder(AVCodecContext* enc_ctx, AVFormatContext* out_ctx, AVPacket* out_packet) {
    avcodec_send_frame(enc_ctx, nullptr);
    while (avcodec_receive_packet(enc_ctx, out_packet) >= 0) {
        out_packet->stream_index = 0;
        av_packet_rescale_ts(out_packet, enc_ctx->time_base, out_ctx->streams[0]->time_base);
        av_interleaved_write_frame(out_ctx, out_packet);
        av_packet_unref(out_packet);
    }
}

// The main re-encoding function.
void encode_output(AVFormatContext* format_ctx, const int video_idx, const std::string& outdir, const int crf, const int max_w, const int duration_s, bool audio) {

    if (video_idx < 0) return;

    AVCodecParameters *in_params = format_ctx->streams[video_idx]->codecpar;
    int new_h = (in_params->height * max_w / in_params->width);
    new_h = (new_h % 2 == 0) ? new_h : new_h + 1;

    AVCodecContext *decoder_ctx = open_decoder(format_ctx, video_idx);
    if (!decoder_ctx) return;

    AVCodecContext *encoder_ctx = open_encoder(max_w, new_h, crf);
    if (!encoder_ctx) {
        avcodec_free_context(&decoder_ctx);
        return;
    }

    // ── Audio setup ───────────────────────────────────────────────────────────
    int audio_idx = -1;
    AVCodecContext *audio_dec_ctx  = nullptr;
    AVCodecContext *audio_enc_ctx  = nullptr;
    SwrContext     *swr_ctx        = nullptr;
    AVAudioFifo    *audio_fifo     = nullptr;
    int64_t         audio_pts      = 0;

    if (audio) {
        audio_idx = av_find_best_stream(format_ctx, AVMEDIA_TYPE_AUDIO, -1, -1, nullptr, 0);
        if (audio_idx >= 0) {
            audio_dec_ctx = open_decoder(format_ctx, audio_idx);
            if (!audio_dec_ctx) audio_idx = -1;
        }

        if (audio_idx >= 0) {
            const AVCodec* aenc = avcodec_find_encoder(AV_CODEC_ID_AAC);
            if (aenc) {
                audio_enc_ctx = avcodec_alloc_context3(aenc);
                audio_enc_ctx->sample_rate = audio_dec_ctx->sample_rate;
                av_channel_layout_copy(&audio_enc_ctx->ch_layout, &audio_dec_ctx->ch_layout);
                audio_enc_ctx->sample_fmt  = AV_SAMPLE_FMT_FLTP;
                audio_enc_ctx->bit_rate    = 128000;
                audio_enc_ctx->time_base   = {1, audio_dec_ctx->sample_rate};
                if (avcodec_open2(audio_enc_ctx, aenc, nullptr) < 0) {
                    avcodec_free_context(&audio_enc_ctx);
                    audio_idx = -1;
                }
            }
        }

        if (audio_enc_ctx) {
            swr_alloc_set_opts2(&swr_ctx,
                &audio_enc_ctx->ch_layout, AV_SAMPLE_FMT_FLTP, audio_enc_ctx->sample_rate,
                &audio_dec_ctx->ch_layout, audio_dec_ctx->sample_fmt, audio_dec_ctx->sample_rate,
                0, nullptr);
            swr_init(swr_ctx);
            audio_fifo = av_audio_fifo_alloc(AV_SAMPLE_FMT_FLTP,
                audio_enc_ctx->ch_layout.nb_channels,
                audio_enc_ctx->frame_size * 4);
        }
    }

    // ── Output file ───────────────────────────────────────────────────────────
    AVFormatContext *out_ctx = open_output_file(outdir, encoder_ctx, audio_enc_ctx);
    if (!out_ctx) {
        avcodec_free_context(&decoder_ctx);
        avcodec_free_context(&encoder_ctx);
        if (audio_dec_ctx) avcodec_free_context(&audio_dec_ctx);
        if (audio_enc_ctx) avcodec_free_context(&audio_enc_ctx);
        if (swr_ctx)       swr_free(&swr_ctx);
        if (audio_fifo)    av_audio_fifo_free(audio_fifo);
        return;
    }

    const int audio_out_idx = audio_enc_ctx ? 1 : -1;

    SwsContext *sws_ctx    = open_scaler(in_params, max_w, new_h);
    AVPacket   *in_packet  = av_packet_alloc();
    AVFrame    *dec_frame  = av_frame_alloc();
    AVFrame    *scaled     = av_frame_alloc();
    AVPacket   *out_packet = av_packet_alloc();

    scaled->width  = max_w;
    scaled->height = new_h;
    scaled->format = AV_PIX_FMT_YUV420P;
    av_frame_get_buffer(scaled, 0);

    // Helper: drain audio FIFO into the encoder and write packets
    auto drain_audio_fifo = [&](bool flush) {
        while (av_audio_fifo_size(audio_fifo) >= audio_enc_ctx->frame_size ||
               (flush && av_audio_fifo_size(audio_fifo) > 0)) {
            int nb = flush ? av_audio_fifo_size(audio_fifo) : audio_enc_ctx->frame_size;
            AVFrame* af = av_frame_alloc();
            af->nb_samples  = nb;
            af->sample_rate = audio_enc_ctx->sample_rate;
            af->format      = AV_SAMPLE_FMT_FLTP;
            av_channel_layout_copy(&af->ch_layout, &audio_enc_ctx->ch_layout);
            av_frame_get_buffer(af, 0);
            av_audio_fifo_read(audio_fifo, reinterpret_cast<void**>(af->data), nb);
            af->pts = audio_pts;
            audio_pts += nb;
            avcodec_send_frame(audio_enc_ctx, af);
            av_frame_free(&af);
            while (avcodec_receive_packet(audio_enc_ctx, out_packet) >= 0) {
                out_packet->stream_index = audio_out_idx;
                av_packet_rescale_ts(out_packet, audio_enc_ctx->time_base,
                                     out_ctx->streams[audio_out_idx]->time_base);
                av_interleaved_write_frame(out_ctx, out_packet);
                av_packet_unref(out_packet);
            }
        }
    };

    // ── Main decode/encode loop ───────────────────────────────────────────────
    while (av_read_frame(format_ctx, in_packet) >= 0) {

        if (in_packet->stream_index == video_idx) {
            if (duration_s > 0) {
                double ts = in_packet->pts * av_q2d(format_ctx->streams[video_idx]->time_base);
                if (ts > duration_s) { av_packet_unref(in_packet); break; }
            }
            avcodec_send_packet(decoder_ctx, in_packet);
            av_packet_unref(in_packet);
            while (avcodec_receive_frame(decoder_ctx, dec_frame) >= 0) {
                sws_scale(sws_ctx, dec_frame->data, dec_frame->linesize, 0,
                          decoder_ctx->height, scaled->data, scaled->linesize);
                scaled->pts = av_rescale_q(dec_frame->pts,
                    format_ctx->streams[video_idx]->time_base,
                    encoder_ctx->time_base);
                avcodec_send_frame(encoder_ctx, scaled);
                while (avcodec_receive_packet(encoder_ctx, out_packet) >= 0) {
                    out_packet->stream_index = 0;
                    av_packet_rescale_ts(out_packet, encoder_ctx->time_base,
                                         out_ctx->streams[0]->time_base);
                    av_interleaved_write_frame(out_ctx, out_packet);
                    av_packet_unref(out_packet);
                }
                av_frame_unref(dec_frame);
            }

        } else if (audio_enc_ctx && in_packet->stream_index == audio_idx) {
            if (duration_s > 0) {
                double ts = in_packet->pts * av_q2d(format_ctx->streams[audio_idx]->time_base);
                if (ts > duration_s) { av_packet_unref(in_packet); break; }
            }
            avcodec_send_packet(audio_dec_ctx, in_packet);
            av_packet_unref(in_packet);
            while (avcodec_receive_frame(audio_dec_ctx, dec_frame) >= 0) {
                uint8_t** converted = nullptr;
                int out_samples = swr_get_out_samples(swr_ctx, dec_frame->nb_samples);
                av_samples_alloc_array_and_samples(&converted, nullptr,
                    audio_enc_ctx->ch_layout.nb_channels, out_samples, AV_SAMPLE_FMT_FLTP, 0);
                out_samples = swr_convert(swr_ctx, converted, out_samples,
                    const_cast<const uint8_t**>(dec_frame->data), dec_frame->nb_samples);
                av_audio_fifo_write(audio_fifo, reinterpret_cast<void**>(converted), out_samples);
                av_freep(&converted[0]);
                av_freep(&converted);
                av_frame_unref(dec_frame);
                drain_audio_fifo(false);
            }

        } else {
            av_packet_unref(in_packet);
        }
    }

    // ── Flush ─────────────────────────────────────────────────────────────────
    flush_encoder(encoder_ctx, out_ctx, out_packet);

    if (audio_enc_ctx) {
        drain_audio_fifo(true);
        avcodec_send_frame(audio_enc_ctx, nullptr);
        while (avcodec_receive_packet(audio_enc_ctx, out_packet) >= 0) {
            out_packet->stream_index = audio_out_idx;
            av_packet_rescale_ts(out_packet, audio_enc_ctx->time_base,
                                 out_ctx->streams[audio_out_idx]->time_base);
            av_interleaved_write_frame(out_ctx, out_packet);
            av_packet_unref(out_packet);
        }
    }

    av_write_trailer(out_ctx);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    sws_freeContext(sws_ctx);
    av_frame_free(&dec_frame);
    av_frame_free(&scaled);
    av_packet_free(&in_packet);
    av_packet_free(&out_packet);
    avcodec_free_context(&decoder_ctx);
    avcodec_free_context(&encoder_ctx);
    avio_closep(&out_ctx->pb);
    avformat_free_context(out_ctx);

    if (audio_dec_ctx) avcodec_free_context(&audio_dec_ctx);
    if (audio_enc_ctx) avcodec_free_context(&audio_enc_ctx);
    if (swr_ctx)       swr_free(&swr_ctx);
    if (audio_fifo)    av_audio_fifo_free(audio_fifo);
}
