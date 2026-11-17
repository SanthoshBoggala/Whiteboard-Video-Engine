import React from "react";
import {staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import type {Asset, IllustrationSceneP, QuoteTitleP} from "../types";
import type {Theme} from "../themes";
import {Sketch, fit, popAt, progressAt, rRect} from "../lib/rough";
import {CP, Frame, Svg, bodyStyle, headStyle} from "./shared";

/** Grid cell for asset i of n, in the right half of the frame. Fewer assets -> bigger icons. */
const CELL: Record<number, [number, number]> = {1: [700, 640], 2: [460, 560], 3: [310, 460]};
export const cellSize = (n: number): [number, number] => CELL[n] ?? [310, 330];
export const cell = (i: number, n: number) => {
  const [cw, ch] = cellSize(n), cols = Math.min(n, 3), rows = Math.ceil(n / 3);
  const x0 = 880 + (930 - cols * cw) / 2, y0 = 300 + (700 - rows * ch) / 2;
  return {x: x0 + (i % 3) * cw, y: y0 + Math.floor(i / 3) * ch, w: cw, h: ch};
};

const AssetImg: React.FC<{a: Asset; i: number; n: number; at: number; theme: Theme}> = ({a, i, n, at, theme}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const c = cell(i, n), s = popAt(frame, fps, at);
  return (
    <div style={{position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})`, opacity: Math.min(s, 1)}}>
      {a.path ? (
        <img src={staticFile(a.path)} style={{maxWidth: c.w - 30, maxHeight: c.h - 30, objectFit: "contain", mixBlendMode: "multiply"}} />
      ) : (
        <div style={{...bodyStyle(theme, 34), width: c.w - 40, height: c.h - 60, border: `4px dashed ${theme.ink}`, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 12}}>
          {a.query}
        </div>
      )}
    </div>
  );
};

export const SpeechBubble: React.FC<{text: string; x: number; y: number; at: number; theme: Theme}> = ({text, x, y, at, theme}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const s = popAt(frame, fps, at), w = 330, h = 190;
  const path = `M 30 0 H ${w - 30} Q ${w} 0 ${w} 30 V ${h - 30} Q ${w} ${h} ${w - 30} ${h} H 120 L 30 ${h + 60} L 70 ${h} H 30 Q 0 ${h} 0 ${h - 30} V 30 Q 0 0 30 0 Z`;
  return (
    <div style={{position: "absolute", left: x, top: y, width: w, height: h + 60, transform: `scale(${s})`, transformOrigin: "30px 100%", opacity: Math.min(s, 1)}}>
      <svg width={w + 10} height={h + 70} style={{position: "absolute", overflow: "visible"}}>
        <path d={path} fill="#fff" stroke={theme.ink} strokeWidth={6} strokeLinejoin="round" />
      </svg>
      <div style={{...headStyle(theme, fit(text, 80, 6, 36)), color: theme.accent.red, position: "absolute", left: 0, top: 0, width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center"}}>{text}</div>
    </div>
  );
};

type Props = {heading?: string; body?: string; bubble?: {text: string; anchor_asset?: string}};

const Layout: React.FC<CP<Props>> = ({scene, p, theme, cue}) => {
  const frame = useCurrentFrame();
  const n = scene.assets.length, hasGrid = n > 0;
  const anchorIdx = Math.max(0, scene.assets.findIndex((a) => a.id === p.bubble?.anchor_asset));
  const bc = hasGrid ? cell(anchorIdx, n) : {x: 1400, y: 700, w: 270, h: 300};
  // below the grid when it fits (single row), else tucked over the anchor's lower-left corner
  const gridBottom = hasGrid ? cell(0, n).y + Math.ceil(n / 3) * cellSize(n)[1] : 0;
  const bubbleY = gridBottom + 250 <= 1040 ? gridBottom + 10 : bc.y + bc.h - 140;
  return (
    <Frame theme={theme}>
      {p.heading && <h1 style={{...headStyle(theme, fit(p.heading, 120, 40, 64)), textAlign: "center", opacity: progressAt(frame, 4, 14)}}>{p.heading}</h1>}
      {p.body && (
        <div style={{...bodyStyle(theme, fit(p.body, 84, 70, 48)), position: "absolute", left: 130, top: 340, width: hasGrid ? 700 : 1660, opacity: progressAt(frame, 14, 18), textAlign: hasGrid ? "left" : "center"}}>
          {p.body}
        </div>
      )}
      {scene.assets.map((a, i) => <AssetImg key={a.id} a={a} i={i} n={n} at={i === 0 ? Math.min(cue(a.id, i, n), 24) : cue(a.id, i, n)}  /* first icon shows early */ theme={theme} />)}
      {p.bubble && <SpeechBubble text={p.bubble.text} x={bc.x} y={bubbleY} at={cue(p.bubble.anchor_asset ?? "bubble", n, n + 1) + 6} theme={theme} />}
    </Frame>
  );
};

export const IllustrationScene: React.FC<CP<IllustrationSceneP>> = (props) => <Layout {...props} />;

export const QuoteTitle: React.FC<CP<QuoteTitleP>> = ({p, ...rest}) => (
  <Layout {...rest} p={{heading: `${p.number ? p.number + ". " : ""}"${p.quote}"`, body: p.body, bubble: p.bubble}} />
);
