#include "frame.h"

AudioTimeline build_audio_timeline(AVFormatContext *format_ctx, int audio_idx) {

    AudioTimeline timeline;

    if (audio_idx < 0 ) {
        return timeline; // no audio
    }

    // pulls out audio stream
    AVStream* stream = format_ctx->streams[audio_idx];

    // get code parameters
    AVCodecParameters*  codec_params = format_ctx->streams[audio_idx]->codecpar;

    const AVCodec * codec = avcodec_find_decoder(codec_params->codec_id);

    if (!codec) {
        return timeline; // couldn't find a decoder, return no audio
    }
    AVCodecContext * codec_ctx = avcodec_alloc_context3(codec);

    // copy params over to context
    int ok = avcodec_parameters_to_context(codec_ctx, codec_params);

    if (ok < 0) {
        return timeline; // couldnt copy over, return no audio
    }

    ok = avcodec_open2(codec_ctx, codec, nullptr);

    if (ok < 0) {
        return timeline; // couldnt initialize codex, return no audio
    }

    double window_start = 0.0;
    double rms_acc = 0.0;
    int sample_count = 0;

    AVPacket* packet = av_packet_alloc();
    AVFrame* frame = av_frame_alloc();

    // read until the end of the file
    // decode audio, get RMS for each window
    while (av_read_frame(format_ctx, packet) >= 0) {
        constexpr double window_size = 0.5;

        // audio packets share the same audio index
        if (packet->stream_index != audio_idx) {
            // free packet
            av_packet_unref(packet);
            continue;
        }

        // reset when 0.5s boundary is crossed
        if (const double timestamp = packet->pts * av_q2d(stream->time_base); timestamp >= window_start + window_size && sample_count > 0) {
            timeline.entries.emplace_back(window_start, sqrtf(rms_acc / sample_count));

            // advance window
            window_start += window_size;
            rms_acc = 0.0;
            sample_count = 0;
        }

        // decode and gather samples
        avcodec_send_packet(codec_ctx, packet);

        while (avcodec_receive_frame(codec_ctx, frame) >= 0) {
            const auto* samples = reinterpret_cast<float *>(frame->data[0]);

            // for each sample in the frame, square the value
            for (int i = 0; i < frame->nb_samples; ++i) {
                rms_acc += samples[i] * samples[i];
                sample_count++;
            }
        }

        av_packet_unref(packet);
    }
    if ( sample_count > 0 ) {
        timeline.entries.emplace_back(window_start, sqrtf(rms_acc / sample_count));
    }

    av_frame_free(&frame);
    av_packet_free(&packet);
    return timeline;
}

float rms_at(const AudioTimeline &timeline, const double timestamp) {
    if (timeline.entries.empty()) {
        return 1.0f; // no audio - return something neutral
    }

    // search through timeline and return rms
    for (auto& [time, rms] : timeline.entries) {
        if (time <= timestamp && timestamp < time +0.5) {
            return rms;
        }
    }

    // timestamp is at the end, return last known rms value
    return timeline.entries.back().second;
}

float get_sharpness(const AVFrame* frame) {
    const cv::Mat frame_mat(frame->height, frame->width, CV_8UC1, frame->data[0], frame->linesize[0]);
    cv::Mat output;
    cv::Scalar mean;
    cv::Scalar stddev;

    cv::Laplacian(frame_mat, output, CV_64F);
    cv::meanStdDev(output, mean, stddev);

    return static_cast<float>(stddev[0] * stddev[0]);

}

float mean_brightness(const AVFrame* frame) {
    const cv::Mat frame_mat(frame->height, frame->width, CV_8UC1, frame->data[0], frame->linesize[0]);
    auto brightness_mean =  cv::mean(frame_mat);

    return static_cast<float>(brightness_mean[0]);

}

void save_frame_as_webp(const AVFrame *frame, const std::string &outdir, int max_w) {
    cv::Mat frame_mat(frame->height, frame->width, CV_8UC1, frame->data[0], frame->linesize[0]);
    const int new_h = frame->height * max_w / frame->width;

    cv::resize(frame_mat, frame_mat, cv::Size(max_w, new_h));

    cv::imwrite(outdir+ "/thumb.webp", frame_mat);

}

AVFrame* decode_frame_at(AVFormatContext *format_ctx, int video_idx, double timestamp) {
    AVFrame* frame = nullptr;

    if (video_idx < 0) {
        return frame;
    }

    AVCodecParameters* codec_params = format_ctx->streams[video_idx]->codecpar;
    const AVCodec* codec = avcodec_find_decoder(codec_params->codec_id);

    if (!codec) {
        return frame;
    }

    AVCodecContext* codec_ctx = avcodec_alloc_context3(codec);

    int ok = avcodec_parameters_to_context(codec_ctx, codec_params);
    if (ok < 0) {
        avcodec_free_context(&codec_ctx);
        return frame;
    }

    ok = avcodec_open2(codec_ctx, codec, nullptr);
    if (ok < 0) {
        avcodec_free_context(&codec_ctx);
        return frame;
    }

    AVPacket* packet = av_packet_alloc();
    frame = av_frame_alloc();

    const auto seek_ts = static_cast<int64_t>(timestamp * AV_TIME_BASE);
    ok = av_seek_frame(format_ctx, -1, seek_ts, AVSEEK_FLAG_BACKWARD);
    if (ok < 0) {
        av_frame_free(&frame);
        av_packet_free(&packet);
        avcodec_free_context(&codec_ctx);
        return nullptr;
    }

    while (av_read_frame(format_ctx, packet) >= 0) {
        if (packet->stream_index != video_idx) {
            av_packet_unref(packet);
            continue;
        }

        avcodec_send_packet(codec_ctx, packet);
        av_packet_unref(packet);

        while (avcodec_receive_frame(codec_ctx, frame) >= 0) {
            av_packet_free(&packet);
            avcodec_free_context(&codec_ctx);
            return frame;
        }
    }

    // no frame found - clean up
    av_frame_free(&frame);
    av_packet_free(&packet);
    avcodec_free_context(&codec_ctx);
    return nullptr;
}

void extract_frame_at(AVFormatContext *format_ctx, const int video_idx,const std::string& outdir, const double timestamp, const int max_w) {

    const AVFrame* frame = decode_frame_at(format_ctx, video_idx, timestamp);

    if (!frame) {
        return;
    }
    save_frame_as_webp(frame, outdir, max_w);
}

void extract_best_frame(AVFormatContext *format_ctx, int video_idx, int audio_idx, const std::string &outdir, int max_w) {

    const double duration = format_ctx->duration / static_cast<double>(AV_TIME_BASE);
    std::cerr << "duration: " << duration << std::endl;
    std::cerr << "audio_idx: " << audio_idx << std::endl;

    // if the video is short, just use the middle frame
    if (duration < 3.0) {
        extract_frame_at(format_ctx, video_idx, outdir, duration / 2.0, max_w);
        return;
    }

    const auto audio_timeline = build_audio_timeline(format_ctx, audio_idx);

    FrameCandidate best{};
    best.brightness = 0;
    best.sharpness = 0;
    best.audio_rms = 0;

    // sample every half second, give each frame a score
    for (double seek = 0.5; seek < duration - 0.5; seek += 0.5 ) {
        AVFrame* frame = decode_frame_at(format_ctx, video_idx, seek);

        if (!frame) {
            continue;
        }

        FrameCandidate candidate{};

        candidate.timestamp = seek;
        candidate.audio_rms = rms_at(audio_timeline, seek);
        candidate.brightness = mean_brightness(frame);
        candidate.sharpness = get_sharpness(frame);

        if (candidate.score() > best.score()) {
            best = candidate;

            //save frame to desk immediately, overwrite if better is found
            save_frame_as_webp(frame, outdir, max_w);
        }

        av_frame_free(&frame);
    }

}
