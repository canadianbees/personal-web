"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var marquee_1 = require("@/components/ui/marquee");
var scroll_based_velocity_1 = require("@/components/ui/scroll-based-velocity");
var utils_1 = require("@/lib/utils");
var resume_items = [
    {
        name: "University of Central Florida",
        dates: "June 2020 - May 2024",
        body: "Bachelors in Computer Science\nMinor in Math, International Engineering, and Political Science",
        img: (React.createElement("img", { src: "/UCF_Knights_logo.svg", width: "70", height: "70", alt: "BigQuery" }))
    },
    {
        name: "UCF Renew Lab",
        dates: "Jan 2024 - May 2024",
        body: "AI research assistant at UCF's Renew Lab. Built a GPT-3.5 powered chatbot that analyzed and gave feedback on student-written code",
        img: (React.createElement("img", { src: "/UCF-CECS.jpg", width: "70", height: "70", alt: "BigQuery" }))
    },
    {
        name: "Trellix",
        dates: "May 2024 - August 2024",
        body: "Software engineering intern at Trellix. Built a GitHub AI code review bot powered by Gemini 1.5 Pro that automatically reviewed pull requests and enforced best practices across multi-language repositories.",
        img: (React.createElement("img", { src: "/Trellix_Logo.svg", width: "100", height: "100", alt: "BigQuery" }))
    },
    {
        name: "Snap Inc.",
        dates: "August 2024 - Present",
        body: "Game Engine Team, Growth Web Team, Media Delivery Platform Team",
        img: (React.createElement("img", { src: "/snapchat.svg", width: "70", height: "70", alt: "BigQuery" }))
    },
];
var ResumeCard = function (_a) {
    var img = _a.img, name = _a.name, dates = _a.dates, body = _a.body;
    return (React.createElement("figure", { className: utils_1.cn("relative h-full xs:w-10 md:w-125 cursor-pointer overflow-hidden rounded-xl border p-4 bg-white/5 border-white/5 backdrop-blur-md text-white p-3") },
        React.createElement("div", { className: "flex flex-row items-center gap-2" },
            img,
            React.createElement("div", { className: "flex flex-col" },
                React.createElement("figcaption", { className: "text-sm font-medium dark:text-white" }, name),
                React.createElement("p", { className: "text-xs font-medium dark:text-white/40" }, dates))),
        React.createElement("blockquote", { className: "mt-2 text-sm" }, body)));
};
function Resume() {
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: "relative flex md:hidden flex-row w-full h-screen overflow-hidden" },
            React.createElement("div", { className: "w-10 h-full overflow-hidden" },
                React.createElement(marquee_1.Marquee, { repeat: 10, vertical: true, className: "-translate-y-100 text-2xl text-yellow-300 [--duration:5s] font-bold", innerClassName: "[writing-mode:vertical-rl] rotate-180" }, "experience at a glance\u00A0\u00A0\u2022\u00A0\u00A0")),
            React.createElement("div", { className: "relative flex-1 overflow-hidden" },
                React.createElement(marquee_1.Marquee, { pauseOnHover: true, vertical: true, className: "[--duration:15s]" }, resume_items.map(function (card) { return React.createElement(ResumeCard, __assign({ key: card.dates }, card)); })))),
        React.createElement("div", { className: "hidden md:flex flex-col justify-center min-h-screen w-full  z-21" },
            React.createElement("div", { className: "mt-20 w-full text-center overflow-hidden" },
                React.createElement(scroll_based_velocity_1.ScrollVelocityContainer, { className: "text-5xl font-bold tracking-[-0.02em] md:text-7xl md:leading-20" },
                    React.createElement(scroll_based_velocity_1.ScrollVelocityRow, { className: "text-yellow-300", baseVelocity: 20, direction: -1 }, "experience at a glance\u00A0\u00A0\u2022\u00A0\u00A0"))),
            React.createElement("div", { className: "relative flex flex-col h-full w-full overflow-hidden" },
                React.createElement(marquee_1.Marquee, { pauseOnHover: true, className: "[--duration:20s]" }, resume_items.map(function (card) { return React.createElement(ResumeCard, __assign({ key: card.dates }, card)); })),
                React.createElement("div", { className: "pointer-events-none absolute inset-y-0 left-0 w-1/8 bg-linear-to-r from-black to-transparent" }),
                React.createElement("div", { className: "pointer-events-none absolute inset-y-0 right-0 w-1/8 bg-linear-to-l from-black to-transparent" })))));
}
exports["default"] = Resume;
