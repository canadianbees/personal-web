"use client";
"use strict";
exports.__esModule = true;
var react_1 = require("motion/react");
var sections = [
    { label: "home", href: "#home" },
    { label: "experience", href: "#experience" },
    { label: "projects", href: "#projects" },
];
var Navbar = function () {
    var handleClick = function (e, href) {
        e.preventDefault();
        var target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: "smooth" });
        }
    };
    return (React.createElement(react_1.motion.nav, { initial: { y: -100, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { type: "spring", damping: 20, stiffness: 150 }, className: "fixed top-0 left-0 right-0 z-50 flex justify-center py-4 pl-10 md:pl-0" },
        React.createElement("div", { className: "flex gap-8 px-8 py-3 rounded-full backdrop-blur-md bg-white/5 border border-white/10" }, sections.map(function (_a) {
            var label = _a.label, href = _a.href;
            return (React.createElement("a", { key: href, href: href, onClick: function (e) { return handleClick(e, href); }, className: "font-mono text-sm text-white/60 hover:text-yellow-300 transition-colors duration-200" }, label));
        }))));
};
exports["default"] = Navbar;
