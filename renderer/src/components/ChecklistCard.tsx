import React from "react";
import {useCurrentFrame} from "remotion";
import type {ChecklistCardP} from "../types";
import {Sketch, fit, progressAt, rRect} from "../lib/rough";
import {CP, Frame, Svg, bodyStyle} from "./shared";

export const ChecklistCard: React.FC<CP<ChecklistCardP>> = ({p, theme, cue}) => {
  const frame = useCurrentFrame();
  const n = p.items.length, rowH = Math.min(150, 700 / n), y0 = 150 + (700 - rowH * n) / 2;
  return (
    <Frame theme={theme}>
      <Svg>
        {p.items.map((_, i) => {
          const at = cue(`item.${i}`, i, n), y = y0 + i * rowH;
          return (
            <g key={i}>
              <Sketch paths={rRect(`cb${i}`, 190, y + 8, 70, 70, theme.rough)} progress={progressAt(frame, at, 10)} color={theme.ink} width={theme.stroke} />
              <Sketch paths={[`M 202 ${y + 44} L 222 ${y + 64} L 256 ${y + 10}`]} progress={progressAt(frame, at + 8, 14)} color={theme.accent.green} width={10} />
            </g>
          );
        })}
      </Svg>
      {p.items.map((t, i) => (
        <div key={i} style={{...bodyStyle(theme, fit(t, 56, 48, 34)), position: "absolute", left: 300, right: 120, top: y0 + i * rowH + 6, opacity: progressAt(frame, cue(`item.${i}`, i, n), 12)}}>
          {t}
        </div>
      ))}
      {p.disclaimer && <div style={{...bodyStyle(theme, 28), position: "absolute", left: 190, right: 120, bottom: 90, opacity: 0.7}}>{p.disclaimer}</div>}
    </Frame>
  );
};
