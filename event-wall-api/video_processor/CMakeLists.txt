cmake_minimum_required(VERSION 3.16)
project(video_processor)

add_executable(video_processor main.cpp encode.cpp frame.cpp
        frame.cpp)

find_package(PkgConfig REQUIRED)
pkg_check_modules(FFMPEG REQUIRED
  libavcodec libavformat libswscale libavutil)

find_package(OpenCV REQUIRED)
target_include_directories(video_processor PRIVATE ${FFMPEG_INCLUDE_DIRS} ${OpenCV_INCLUDE_DIRS})
target_link_libraries(video_processor PRIVATE
        avcodec avformat swscale avutil
        ${OpenCV_LIBS})
find_package(GTest REQUIRED)

add_executable(tests
        tests/test_frame.cpp
        tests/test_encode.cpp
        frame.cpp
        encode.cpp
        tests/test_encode.cpp
)

target_include_directories(tests PRIVATE ${FFMPEG_INCLUDE_DIRS} ${OpenCV_INCLUDE_DIRS})
target_link_libraries(tests PRIVATE
        avcodec avformat swscale avutil
        ${OpenCV_LIBS}
        GTest::GTest GTest::Main
)