cmake_minimum_required(VERSION 3.16)
project(video_processor)

set(CMAKE_CXX_STANDARD 17)

find_package(PkgConfig REQUIRED)
pkg_check_modules(FFMPEG REQUIRED
  libavcodec libavformat libswscale libavutil libswresample)

find_package(OpenCV REQUIRED)
find_package(Threads REQUIRED)

add_executable(video_processor main.cpp encode.cpp frame.cpp)
target_include_directories(video_processor PRIVATE ${FFMPEG_INCLUDE_DIRS} ${OpenCV_INCLUDE_DIRS})
target_link_directories(video_processor PRIVATE ${FFMPEG_LIBRARY_DIRS})
target_link_libraries(video_processor PRIVATE
        avcodec avformat swscale avutil swresample
        ${OpenCV_LIBS}
        Threads::Threads)

find_package(GTest QUIET)

if(GTest_FOUND)
  add_executable(tests
          tests/test_frame.cpp
          tests/test_encode.cpp
          tests/test_main.cpp
          frame.cpp
          encode.cpp
  )
  target_include_directories(tests PRIVATE ${FFMPEG_INCLUDE_DIRS} ${OpenCV_INCLUDE_DIRS})
  target_link_directories(tests PRIVATE ${FFMPEG_LIBRARY_DIRS})
  target_link_libraries(tests PRIVATE
          avcodec avformat swscale avutil swresample
          ${OpenCV_LIBS}
          Threads::Threads
          GTest::GTest GTest::Main
  )

  target_compile_options(tests PRIVATE --coverage)
  target_link_options(tests PRIVATE --coverage)

  add_custom_target(coverage
    COMMAND ${CMAKE_COMMAND} ${CMAKE_SOURCE_DIR}
    COMMAND lcov --capture --directory . --output-file cov.info
    COMMAND lcov --remove cov.info '/opt/*' '/Library/*' --output-file cov.info
    COMMAND genhtml cov.info --output-directory coverage_html
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Generating HTML coverage report"
  )

  add_custom_target(run_tests
    COMMAND ${CMAKE_COMMAND} ${CMAKE_SOURCE_DIR}
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_CURRENT_BINARY_DIR} --target tests
    COMMAND $<TARGET_FILE:tests>
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Configuring, building, and running tests"
  )

  file(GENERATE OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/run_parallel_tests.sh"
    CONTENT "#!/bin/sh
GTEST_TOTAL_SHARDS=4 GTEST_SHARD_INDEX=0 $<TARGET_FILE:tests> &
GTEST_TOTAL_SHARDS=4 GTEST_SHARD_INDEX=1 $<TARGET_FILE:tests> &
GTEST_TOTAL_SHARDS=4 GTEST_SHARD_INDEX=2 $<TARGET_FILE:tests> &
GTEST_TOTAL_SHARDS=4 GTEST_SHARD_INDEX=3 $<TARGET_FILE:tests> &
wait
")

  add_custom_target(run_tests_parallel
    COMMAND ${CMAKE_COMMAND} ${CMAKE_SOURCE_DIR}
    COMMAND ${CMAKE_COMMAND} --build ${CMAKE_CURRENT_BINARY_DIR} --target tests
    COMMAND sh run_parallel_tests.sh
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Configuring, building, and running tests in parallel"
  )

  add_custom_target(test_pipeline
    COMMAND ${CMAKE_COMMAND} ${CMAKE_SOURCE_DIR}
    COMMAND ${CMAKE_COMMAND} -E rm -rf /tmp/test_main_pipeline
    COMMAND $<TARGET_FILE:tests> --gtest_filter=MainPipelineTests.*
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
    COMMENT "Running MainPipelineTests"
  )
else()
  message(STATUS "GTest not found — skipping test target")
endif()