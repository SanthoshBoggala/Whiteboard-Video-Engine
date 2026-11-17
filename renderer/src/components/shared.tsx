import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import type {Scene} from "../types";
import type {Theme} from "../themes";
import {Sketch, progressAt, rRect} from "../lib/rough";

export type CP<P> = {
  scene: Scene;
  p: P;
  theme: Theme;
  /** frame (relative to scene start) at which element `ref` should appear; falls back to an even spread */
  cue: (ref: string, index: number, total: number) => number;
};

export const headStyle = (t: Theme, size: number): React.CSSProperties => ({
  fontFamily: t.heading, fontSize: size, color: t.ink, lineHeight: 1.1, margin: 0,
  textTransform: t.upper ? "uppercase" : "none", fontWeight: t.name === "whiteboard" ? 400 : 400,
});
export const bodyStyle = (t: Theme, size: number): React.CSSProperties => ({
  fontFamily: t.body, fontSize: size, color: t.ink, lineHeight: 1.25, margin: 0,
  textTransform: t.upper ? "uppercase" : "none",
});

/** Page frame: rounded solid border (illustrated) or hand-drawn border that draws on (whiteboard). */
export const Frame: React.FC<{theme: Theme; children?: React.ReactNode}> = ({theme, children}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: theme.bg}}>
      {/* border removed on request; padding below keeps content off the edges */}
      <AbsoluteFill style={{padding: "90px 110px"}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} style={{position: "absolute", left: 0, top: 0}}>{children}</svg>
);
