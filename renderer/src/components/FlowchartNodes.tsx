import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import type {FlowchartNodesP} from "../types";
import {Sketch, fit, popAt, progressAt, rArrow, rRect} from "../lib/rough";
import {CP, Frame, Svg, headStyle} from "./shared";

const W = 440, H = 150, GX = 190;

/** Centered grid, snaking (odd rows right-to-left) so arrows always flow forward. 4 nodes -> 2x2. */
const place = (i: number, n: number) => {
  const pr = n <= 3 ? n : n === 4 ? 2 : 3, row = Math.floor(i / pr), rows = Math.ceil(n / pr);
  const col = row % 2 ? pr - 1 - (i % pr) : i % pr, x0 = (1920 - (pr * W + (pr - 1) * GX)) / 2;
  return {cx: x0 + W / 2 + col * (W + GX), cy: rows === 1 ? 540 : 340 + row * 380};
};

const clip = (dx: number, dy: number) => Math.min(dx ? (W / 2 + 12) / Math.abs(dx) : Infinity, dy ? (H / 2 + 12) / Math.abs(dy) : Infinity);

export const FlowchartNodes: React.FC<CP<FlowchartNodesP>> = ({p, theme, cue}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const size = fit(p.nodes.reduce((a, b) => (b.label.length > a.length ? b.label : a), ""), 56, 13, 30); // one size for all nodes
  const n = p.nodes.length, idx =new Map(p.nodes.map((nd, i) => [nd.id, i]));
  const at = (i: number) => cue(`node.${p.nodes[i].id}`, i, n);
  const edges = (p.edges.length ? p.edges : p.nodes.slice(1).map((nd, i) => ({from: p.nodes[i].id, to: nd.id})))
    .filter((e) => idx.has(e.from) && idx.has(e.to));
  return (
    <Frame theme={theme}>
      <Svg>
        {p.nodes.map((nd, i) => {
          const {cx, cy} = place(i, n);
          return <Sketch key={nd.id} paths={rRect(`n-${nd.id}`, cx - W / 2, cy - H / 2, W, H, theme.rough)} progress={progressAt(frame, at(i), 14)} color={theme.accent.blue} width={theme.stroke} />;
        })}
        {edges.map((e, k) => {
          const a = place(idx.get(e.from)!, n), b = place(idx.get(e.to)!, n), dx = b.cx - a.cx, dy = b.cy - a.cy;
          const ta = clip(dx, dy), tb = clip(dx, dy);
          return <Sketch key={k} paths={rArrow(`e${k}`, a.cx + dx * ta, a.cy + dy * ta, b.cx - dx * tb, b.cy - dy * tb, theme.rough)} progress={progressAt(frame, Math.max(0, at(idx.get(e.to)!) - 16), 18)} color={theme.ink} width={6} />;
        })}
      </Svg>
      {p.nodes.map((nd, i) => {
        const {cx, cy} = place(i, n), s = popAt(frame, fps, at(i));
        return (
          <div key={nd.id} style={{...headStyle(theme, size), position: "absolute", left: cx - W / 2, top: cy - H / 2, width: W, height: H, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 14, opacity: Math.min(s, 1), transform: `scale(${0.8 + 0.2 * Math.min(s, 1)})`}}>
            {nd.label}
          </div>
        );
      })}
    </Frame>
  );
};
