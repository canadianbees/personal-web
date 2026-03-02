"use client";
"use strict";
exports.__esModule = true;
exports.MorphingText = void 0;
var react_1 = require("react");
var utils_1 = require("@/lib/utils");
var morphTime = 1.5;
var cooldownTime = 0.5;
var useMorphingText = function (texts) {
    var textIndexRef = react_1.useRef(0);
    var morphRef = react_1.useRef(0);
    var cooldownRef = react_1.useRef(0);
    var timeRef = react_1.useRef(new Date());
    var text1Ref = react_1.useRef(null);
    var text2Ref = react_1.useRef(null);
    var setStyles = react_1.useCallback(function (fraction) {
        var _a = [text1Ref.current, text2Ref.current], current1 = _a[0], current2 = _a[1];
        if (!current1 || !current2)
            return;
        current2.style.filter = "blur(" + Math.min(8 / fraction - 8, 100) + "px)";
        current2.style.opacity = Math.pow(fraction, 0.4) * 100 + "%";
        var invertedFraction = 1 - fraction;
        current1.style.filter = "blur(" + Math.min(8 / invertedFraction - 8, 100) + "px)";
        current1.style.opacity = Math.pow(invertedFraction, 0.4) * 100 + "%";
        current1.textContent = texts[textIndexRef.current % texts.length];
        current2.textContent = texts[(textIndexRef.current + 1) % texts.length];
    }, [texts]);
    var doMorph = react_1.useCallback(function () {
        morphRef.current -= cooldownRef.current;
        cooldownRef.current = 0;
        var fraction = morphRef.current / morphTime;
        if (fraction > 1) {
            cooldownRef.current = cooldownTime;
            fraction = 1;
        }
        setStyles(fraction);
        if (fraction === 1) {
            textIndexRef.current++;
        }
    }, [setStyles]);
    var doCooldown = react_1.useCallback(function () {
        morphRef.current = 0;
        var _a = [text1Ref.current, text2Ref.current], current1 = _a[0], current2 = _a[1];
        if (current1 && current2) {
            current2.style.filter = "none";
            current2.style.opacity = "100%";
            current1.style.filter = "none";
            current1.style.opacity = "0%";
        }
    }, []);
    react_1.useEffect(function () {
        var animationFrameId;
        var animate = function () {
            animationFrameId = requestAnimationFrame(animate);
            var newTime = new Date();
            var dt = (newTime.getTime() - timeRef.current.getTime()) / 1500;
            timeRef.current = newTime;
            cooldownRef.current -= dt;
            if (cooldownRef.current <= 0)
                doMorph();
            else
                doCooldown();
        };
        animate();
        return function () {
            cancelAnimationFrame(animationFrameId);
        };
    }, [doMorph, doCooldown]);
    return { text1Ref: text1Ref, text2Ref: text2Ref };
};
var Texts = function (_a) {
    var texts = _a.texts;
    var _b = useMorphingText(texts), text1Ref = _b.text1Ref, text2Ref = _b.text2Ref;
    return (React.createElement(React.Fragment, null,
        React.createElement("span", { className: "absolute inset-x-0 top-0 m-auto inline-block w-full", ref: text1Ref }),
        React.createElement("span", { className: "absolute inset-x-0 top-0 m-auto inline-block w-full", ref: text2Ref })));
};
var SvgFilters = function () { return (React.createElement("svg", { id: "filters", className: "fixed h-0 w-0", preserveAspectRatio: "xMidYMid slice" },
    React.createElement("defs", null,
        React.createElement("filter", { id: "threshold" },
            React.createElement("feColorMatrix", { "in": "SourceGraphic", type: "matrix", values: "1 0 0 0 0\n                  0 1 0 0 0\n                  0 0 1 0 0\n                  0 0 0 3000 -150" }))))); };
exports.MorphingText = function (_a) {
    var texts = _a.texts, className = _a.className;
    return (React.createElement("div", { className: utils_1.cn("relative mx-auto h-16 md:h-1 w-full max-w-3xl text-yellow-300 font-sans text-[30pt] leading-none font-bold filter-[url(#threshold)_blur(0.6px)]  md:text-[32pt] lg:text-[40pt]", className) },
        React.createElement(Texts, { texts: texts }),
        React.createElement(SvgFilters, null)));
};
