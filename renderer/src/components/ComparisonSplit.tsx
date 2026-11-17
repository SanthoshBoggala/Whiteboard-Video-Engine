import React from "react";
import {useCurrentFrame} from "remotion";
import type {ComparisonSplitP, Side} from "../types";
import {Sketch, fit, progressAt, rLine, rRect} from "../lib/rough";
import {CP, Frame, Svg, bodyStyle, headStyle} from "./shared";

export const ComparisonSplit: React.FC<CP<ComparisonSplitP>> = ({p, theme, cue}) => {
  const frame = useCurrentFrame();
  const cards: [string, Side, number][] = [["left", p.left, 100], ["right", p.right, 1010]];
  return (
    <Frame theme={theme}>
      <Svg>
        {cards.map(([k, s, x], ci) => (
          <g key={k}>
            <Sketch paths={rRect(`card-${k}`, x, 160, 810, 780, theme.rough)} progress={progressAt(frame, 6 + ci * 8, 24)} color={theme.accent[s.accent]} width={theme.stroke} />
            <Sketch paths={rLine(`ul-${k}`, x + 60, 340, x + 750, 340, theme.rough)} progress={progressAt(frame, 24 + ci * 8, 16)} color={theme.accent[s.accent]} width={6} />
          </g>
        ))}
      </Svg>
      {cards.map(([k, s, x]) => (
        <div key={k} style={{position: "absolute", left: x, top: 160, width: 810}}>
          <h2 style={{...headStyle(theme, fit(s.label, 100, 12, 60)), color: theme.accent[s.accent], textAlign: "center", paddingTop: 60, opacity: progressAt(frame, 14, 14)}}>{s.label}</h2>
          <div style={{padding: "70px 60px 0"}}>
            {s.items.map((it, i) => (
              <div key={i} style={{...bodyStyle(theme, fit(it, 62, 30, 40)), marginBottom: 46, opacity: progressAt(frame, cue(`${k}.${i}`, i + (k === "right" ? s.items.length : 0), s.items.length * 2), 12), transform: `translateX(${(1 - progressAt(frame, cue(`${k}.${i}`, i, s.items.length), 12)) * 24}px)`}}>
                • {it}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{...headStyle(theme, 70), position: "absolute", left: 880, top: 460, width: 160, textAlign: "center", background: theme.bg, opacity: progressAt(frame, 20, 12)}}>VS</div>
    </Frame>
  );
};
