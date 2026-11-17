import React from "react";
import {useCurrentFrame} from "remotion";
import type {BarChartAnimatedP} from "../types";
import {Sketch, fit, progressAt, rArrow, rLine, rRect} from "../lib/rough";
import {CP, Frame, Svg, bodyStyle, headStyle} from "./shared";

const BASE = 860, TOP = 300, X0 = 220, X1 = 1700;

export const BarChartAnimated: React.FC<CP<BarChartAnimatedP>> = ({p, theme, cue}) => {
  const frame = useCurrentFrame();
  const n = p.bars.length, max = Math.max(...p.bars.map((b) => b.value));
  const slot = (X1 - X0) / n, bw = Math.min(220, slot * 0.6);
  const bx = (i: number) => X0 + slot * i + (slot - bw) / 2;
  const grow = (i: number) => progressAt(frame, cue(`bar.${i}`, i, n), 30);
  const fmt = (v: number) => (Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1)) + p.unit;
  return (
    <Frame theme={theme}>
      <Svg>
        <Sketch paths={rLine("axis", X0 - 30, BASE, X1 + 30, BASE, theme.rough)} progress={progressAt(frame, 0, 20)} color={theme.ink} width={6} />
        {p.bars.map((b, i) => {
          const h = ((BASE - TOP) * b.value) / max * grow(i);
          return (
            <g key={i}>
              <rect x={bx(i)} y={BASE - h} width={bw} height={h} fill={theme.accent[b.color]} opacity={0.18} />
              <Sketch paths={rRect(`bar${i}`, bx(i), BASE - h, bw, Math.max(h, 1), theme.rough)} progress={grow(i) > 0 ? 1 : 0} color={theme.accent[b.color]} width={theme.stroke} />
            </g>
          );
        })}
        {p.callouts.map((c, k) => {
          const i = p.bars.findIndex((b) => b.label.toLowerCase() === c.bar.toLowerCase());
          if (i < 0) return null;
          const top = BASE - ((BASE - TOP) * p.bars[i].value) / max;
          return <Sketch key={k} paths={rArrow(`co${k}`, bx(i) + bw / 2 + 120, top - 90, bx(i) + bw - 10, top - 20, theme.rough)} progress={progressAt(frame, cue(`bar.${i}`, i, n) + 30, 14)} color={theme.accent.red} width={5} />;
        })}
      </Svg>
      {p.bars.map((b, i) => {
        const g = grow(i), top = BASE - ((BASE - TOP) * b.value) / max * g;
        return (
          <React.Fragment key={i}>
            <div style={{...headStyle(theme, 60), position: "absolute", left: bx(i) - 40, width: bw + 80, top: top - 76, textAlign: "center", color: theme.accent[b.color], opacity: g > 0 ? 1 : 0}}>{fmt(b.value * g)}</div>
            <div style={{...bodyStyle(theme, fit(b.label, 44, 12, 28)), position: "absolute", left: bx(i) - 40, width: bw + 80, top: BASE + 24, textAlign: "center"}}>{b.label}</div>
          </React.Fragment>
        );
      })}
      {p.callouts.map((c, k) => {
        const i = p.bars.findIndex((b) => b.label.toLowerCase() === c.bar.toLowerCase());
        if (i < 0) return null;
        const top = BASE - ((BASE - TOP) * p.bars[i].value) / max;
        return <div key={k} style={{...bodyStyle(theme, 38), position: "absolute", left: bx(i) + bw / 2 + 130, top: top - 150, width: 360, color: theme.accent.red, opacity: progressAt(frame, cue(`bar.${i}`, i, n) + 34, 12)}}>{c.text}</div>;
      })}
    </Frame>
  );
};
