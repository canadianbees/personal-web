#pragma once
extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>

}
#include <opencv4/opencv2/opencv.hpp>

#include <string>
#include <vector>

struct AudioTimeline {
    //timestamp, rms energy
    std::vector<std::pair<double, float>> entries ;
};

struct FrameCandidate {
    double timestamp; // seconds
    float audio_rms; // RMS energy of audio window at this time,  no audio = 1
    float brightness; // mean luma (0-255), eliminated even if audio peaks
    float sharpness; // lapacian variance (higher = sharper)
    [[nodiscard]] float score () const {
        float bright_factor = std::max(0.0f, (brightness- 30.0f) / 255.0f);
        float sharp_factor = std::min(sharpness / 500.0f, 1.0f); //normalize

        return audio_rms * bright_factor * sharp_factor;
    }
};

AudioTimeline build_audio_timeline(AVFormatContext* format_ctx, int audio_idx);
AVFrame* decode_frame_at(AVFormatContext *format_ctx, int video_idx, double timestamp);
void extract_best_frame(AVFormatContext *format_ctx, int video_idx, int audio_idx, const std::string& outdir, int max_w);
void extract_frame_at(AVFormatContext *format_ctx, int video_idx, const std::string& outdir, double timestamp, int max_w);
void save_frame_as_webp(const AVFrame* frame, const std::string& outdir, int max_w);
float rms_at(const AudioTimeline& timeline, double timestamp);
float get_sharpness(const AVFrame* frame);
float mean_brightness(const AVFrame* frame);