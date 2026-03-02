"use client";
"use strict";
exports.__esModule = true;
var react_1 = require("motion/react");
var motion_1 = require("../utils/motion");
var morphing_text_1 = require("@/components/ui/morphing-text");
var orbiting_circles_1 = require("@/components/ui/orbiting-circles");
var tech_stack_icons_1 = require("tech-stack-icons");
var aurora_text_1 = require("@/components/ui/aurora-text");
var avatar_1 = require("@heroui/avatar");
var DeviconCplusplus_1 = require("../../icons/DeviconCplusplus");
var DeviconTypescript_1 = require("@/components/icons/DeviconTypescript");
var DeviconPython_1 = require("@/components/icons/DeviconPython");
var DeviconJava_1 = require("@/components/icons/DeviconJava");
var DeviconGithubactions_1 = require("@/components/icons/DeviconGithubactions");
var simple_icons_1 = require("@styled-icons/simple-icons");
var simple_icons_2 = require("@styled-icons/simple-icons");
var simple_icons_3 = require("@styled-icons/simple-icons");
var simple_icons_4 = require("@styled-icons/simple-icons");
var simple_icons_5 = require("@styled-icons/simple-icons");
var HeroContent = function () {
    return (React.createElement(react_1.motion.div, { initial: "hidden", animate: "visible", className: 'flex flex-row items-center justify-center px-6 md:px-20 w-full h-screen z-20' },
        React.createElement("div", { className: 'h-full w-full flex flex-col justify-center items-center md:items-start m-auto text-center md:text-start' },
            React.createElement(react_1.motion.div, { variants: motion_1.slideInFromTop, className: "flex flex-col md:gap-5 gap-10 font-mono font-bold w-full max-w-full md:max-w-150 text-4xl md:text-6xl" },
                React.createElement(morphing_text_1.MorphingText, { texts: ["celina alzenor", "software engineer", "platypus enjoyer", "solitaire enthusiast"] }),
                React.createElement(react_1.motion.div, { variants: motion_1.slideInFromLeft(0.8), className: "flex flex-col text-lg text-gray-400 max-w-full md:max-w-150 gap-10" },
                    React.createElement(aurora_text_1.AuroraText, { speed: 5 },
                        "Seeking new opportunites and roles",
                        React.createElement("div", { className: "flex gap-5" },
                            React.createElement(simple_icons_1.Linkedin, { size: 25, color: "#0A66C2" }),
                            React.createElement(simple_icons_2.Github, { size: 25, color: "#FFFFFF" }),
                            React.createElement(simple_icons_1.Linkedin, { size: 25, color: "#0A66C2" })))))),
        React.createElement(react_1.motion.div, { variants: motion_1.slideInFromRight(0.9), className: "w-full h-full justify-evenly items-center hidden lg:flex" },
            React.createElement(orbiting_circles_1.OrbitingCircles, { iconSize: 70, radius: 275, path: false },
                React.createElement(DeviconPython_1["default"], { width: "8em", height: "8em" }),
                React.createElement(DeviconCplusplus_1.DeviconCplusplus, { width: "8em", height: "8em" }),
                React.createElement(simple_icons_4.Go, { size: 100, color: "#29BEB0" }),
                React.createElement(DeviconTypescript_1["default"], { width: "8em", height: "8em" }),
                React.createElement(DeviconJava_1["default"], { width: "8em", height: "8em" })),
            React.createElement(avatar_1.Avatar, { isBordered: true, color: "success", className: "w-135 h-136 text-large z-[-1]", src: '/DSC01275.jpg' }),
            React.createElement(orbiting_circles_1.OrbitingCircles, { radius: 200, iconSize: 50, reverse: true, path: false },
                React.createElement(tech_stack_icons_1["default"], { name: "gcloud", variant: "dark" }),
                React.createElement(simple_icons_3.Docker, { size: 100, color: "#2560FF" }),
                React.createElement(simple_icons_2.Github, { size: 100, color: "#FFFFFF" }),
                React.createElement(simple_icons_5.Openai, { size: 100, color: "#FFFFFF" }),
                React.createElement(DeviconGithubactions_1["default"], { width: "8em", height: "8em" }),
                React.createElement("img", { src: "/BigQuery.svg", width: "70", height: "70", alt: "BigQuery" })))));
};
exports["default"] = HeroContent;
