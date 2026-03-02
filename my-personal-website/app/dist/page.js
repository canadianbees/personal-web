"use client";
"use strict";
exports.__esModule = true;
var Hero_1 = require("@/components/main/hero/Hero");
var VideoContainer_1 = require("@/components/main/background/VideoContainer");
var Projects_1 = require("@/components/main/projects/Projects");
var Resume_1 = require("@/components/main/resume/Resume");
var Navbar_1 = require("@/components/main/navigation/Navbar");
function Home() {
    return (React.createElement("main", { className: "relative w-screen h-screen overflow-x-hidden overflow-y-scroll snap-y snap-mandatory" },
        React.createElement(VideoContainer_1["default"], null),
        React.createElement(Navbar_1["default"], null),
        React.createElement("div", { id: "home", className: "snap-start min-h-screen" },
            React.createElement(Hero_1["default"], null)),
        React.createElement("div", { id: "experience", className: "snap-start min-h-screen flex flex-col items-center" },
            React.createElement(Resume_1["default"], null)),
        React.createElement("div", { id: "projects", className: "snap-start min-h-screen" },
            React.createElement(Projects_1["default"], null))));
}
exports["default"] = Home;
