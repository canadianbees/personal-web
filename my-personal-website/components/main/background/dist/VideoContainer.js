"use strict";
exports.__esModule = true;
var react_1 = require("react");
var background_video_1 = require("next-video/background-video");
var VID_20260226_225927_MP4_1 = require("../../../videos/VID_20260226_225927.MP4");
var VideoContainer = function () {
    return (react_1["default"].createElement("div", { className: 'fixed inset-0 z-[-1] pointer-events-none' },
        react_1["default"].createElement(background_video_1["default"], { src: VID_20260226_225927_MP4_1["default"], autoPlay: true, muted: true, loop: true, playsInline: true, preload: "auto", className: 'w-full h-full object-cover' })));
};
exports["default"] = VideoContainer;
