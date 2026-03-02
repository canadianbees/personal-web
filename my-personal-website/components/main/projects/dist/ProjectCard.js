"use client";
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
var image_1 = require("next/image");
var react_1 = require("react");
var react_2 = require("motion/react");
var hyper_text_1 = require("@/components/ui/hyper-text");
var backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};
var modalVariants = {
    hidden: { scale: 0.3, opacity: 0, y: 40 },
    visible: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.8, opacity: 0, y: 20 }
};
var modalTransition = {
    type: "spring",
    damping: 18,
    stiffness: 120,
    mass: 0.8
};
var cardHoverVariants = {
    rest: {
        scale: 1,
        rotateY: 0,
        y: 0,
        boxShadow: "0 0px 0px rgba(0,0,0,0)"
    },
    hover: {
        scale: 1.05,
        rotateY: 4,
        y: -8,
        boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
    }
};
var cardTransition = {
    type: "spring",
    damping: 100,
    stiffness: 500,
    mass: 1
};
var Card = function (_a) {
    var src = _a.src, title = _a.title, description = _a.description, onClick = _a.onClick;
    var _b = react_1.useState(false), hovered = _b[0], setHovered = _b[1];
    return (react_1["default"].createElement(react_2.motion.div, { onClick: onClick, variants: cardHoverVariants, initial: "rest", whileHover: "hover", transition: cardTransition, onHoverStart: function () { return setHovered(true); }, onHoverEnd: function () { return setHovered(false); }, className: "\n        " + (hovered ? "rainbow-border-active" : "") + "\n        rainbow-border\n        relative flex flex-col\n        w-80 h-96\n        font-mono rounded-lg shadow-lg backdrop-blur-lg\n        cursor-pointer overflow-hidden\n        z-25\n      " },
        react_1["default"].createElement("div", { className: "relative w-full h-48 shrink-0 overflow-hidden bg-white/5" },
            react_1["default"].createElement(image_1["default"], { src: src, alt: title, fill: true, className: "object-cover" })),
        react_1["default"].createElement("div", { className: "p-4 flex flex-col flex-1 overflow-hidden gap-1" },
            react_1["default"].createElement(hyper_text_1.HyperText, { className: "text-base font-semibold text-white line-clamp-2 h-14" }, title),
            react_1["default"].createElement("p", { className: "mt-2 text-gray-400 text-xs line-clamp-3" }, description),
            react_1["default"].createElement("p", { className: "mt-auto pt-2 text-xs text-white/40" }, "click to read more \u2192"))));
};
var Modal = function (_a) {
    var src = _a.src, title = _a.title, description = _a.description, link = _a.link, onClose = _a.onClose;
    return (react_1["default"].createElement(react_2.motion.div, { className: "fixed inset-0 z-50 flex items-center justify-center p-4", variants: backdropVariants, initial: "hidden", animate: "visible", exit: "exit", onClick: onClose },
        react_1["default"].createElement("div", { className: "absolute inset-0 bg-black/70 backdrop-blur-sm" }),
        react_1["default"].createElement(react_2.motion.div, { className: "\r\n        relative z-10\r\n        bg-[#0a0a0a]/90 border border-white/10\r\n        rounded-2xl shadow-2xl\r\n        max-w-2xl w-full max-h-[85vh] overflow-y-auto\r\n      ", variants: modalVariants, transition: modalTransition, onClick: function (e) { return e.stopPropagation(); } },
            react_1["default"].createElement("div", { className: "relative w-full h-56" },
                react_1["default"].createElement(image_1["default"], { src: src, alt: title, fill: true, className: "object-cover rounded-t-2xl" })),
            react_1["default"].createElement("div", { className: "p-6" },
                react_1["default"].createElement("h2", { className: "text-2xl font-bold text-white mb-4" }, title),
                react_1["default"].createElement("p", { className: "text-gray-300 text-sm leading-relaxed whitespace-pre-line" }, description),
                link && (react_1["default"].createElement("a", { href: link, target: "_blank", rel: "noopener noreferrer", className: "\r\n              inline-block mt-6 px-4 py-2 rounded-lg\r\n              bg-white/10 hover:bg-white/20\r\n              text-white text-sm\r\n              transition-colors duration-200\r\n            " }, "View Project \u2192"))),
            react_1["default"].createElement("button", { onClick: onClose, className: "\r\n          absolute top-4 right-4\r\n          w-8 h-8 rounded-full\r\n          flex items-center justify-center\r\n          bg-black/40 text-white/60 hover:text-white\r\n          text-xl font-bold transition-colors\r\n        " }, "\u2715"))));
};
var ProjectCard = function (props) {
    var _a = react_1.useState(false), open = _a[0], setOpen = _a[1];
    return (react_1["default"].createElement(react_1["default"].Fragment, null,
        react_1["default"].createElement(Card, __assign({}, props, { onClick: function () { return setOpen(true); } })),
        react_1["default"].createElement(react_2.AnimatePresence, null, open && react_1["default"].createElement(Modal, __assign({}, props, { onClose: function () { return setOpen(false); } })))));
};
exports["default"] = ProjectCard;
