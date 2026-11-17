import React from "react";
import rough from "roughjs";
import {evolvePath} from "@remotion/paths";
import {Easing, interpolate, spring} from "remotion";

const gen = rough.generator();
// Seed from element id: strokes are identical on every frame (no jitter) and every render.
const seedOf = (id: string) => ([...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 2147483647) + 1;
const opts = (id: string, r: number) => ({seed: seedOf(id), roughness: r, bowing: 1, strokeWidth: 1});
const toD = (d: any) => gen.toPaths(d).map((p) => p.d);

export const rRect = (id: string, x: number, y: number, w: number, h: number, r: number) =>
  toD(gen.rectangle(x, y, w, h, opts(id, r)));
export const rLine = (id: string, x1: number, y1: number, x2: number, y2: number, r: number) =>
  toD(gen.line(x1, y1, x2, y2, opts(id, r)));
export const rEllipse = (id: string, cx: number, cy: number, w: number, h: number, r: number) =>
  toD(gen.ellipse(cx, cy, w, h, opts(id, r)));
export const rArrow = (id: string, x1: number, y1: number, x2: number, y2: number, r: number) => {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 28, s = 0.45;
  return [
    ...rLine(id, x1, y1, x2, y2, r),
    ...rLine(id + "h1", x2, y2, x2 - L * Math.cos(a - s), y2 - L * Math.sin(a - s), r),
    ...rLine(id + "h2", x2, y2, x2 - L * Math.cos(a + s), y2 - L * Math.sin(a + s), r),
  ];
};

/** Animated "pen draw-on" for a set of SVG path strings. progress 0..1. */
export const Sketch: React.FC<{paths: string[]; progress: number; color: string; width?: number}> = ({paths, progress, color, width = 5}) => (
  <>
    {paths.map((d, i) => (
      <path key={i} d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
        {...(progress >= 1 ? {} : evolvePath(Math.max(progress, 0), d))} opacity={progress <= 0 ? 0 : 1} />
    ))}
  </>
);

export const progressAt = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});

export const popAt = (frame: number, fps: number, at: number) =>
  frame < at ? 0 : spring({frame: frame - at, fps, config: {damping: 12, stiffness: 140}});

/** Shrinks font size for long text so LLM-written copy never overflows its box. */
export const fit = (text: string, base: number, charsAtBase: number, min = 36) =>
  Math.max(min, Math.min(base, (base * charsAtBase) / Math.max(text.length, 1)));
