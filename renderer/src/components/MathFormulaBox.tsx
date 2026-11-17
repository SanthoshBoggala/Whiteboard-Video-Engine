import React from "react";
import {useCurrentFrame} from "remotion";
import type {MathFormulaBoxP} from "../types";
import {Sketch, fit, progressAt, rLine, rRect} from "../lib/rough";
import {CP, Frame, Svg, bodyStyle, headStyle} from "./shared";

export const MathFormulaBox: React.FC<CP<MathFormulaBoxP>> = ({p, theme, cue}) => {
  const frame = useCurrentFrame();
  const n = p.steps.length, rowH = Math.min(170, 640 / n), y0 = 170 + (700 - rowH * n) / 2;
  const last = n - 1, size = (i: number) => fit(p.steps[i].expr, 84, 26, 44);
  return (
    <Frame theme={theme}>
      <Svg>
        <Sketch paths={rRect("math-box", 300, 140, 1320, 800, theme.rough)} progress={progressAt(frame, 4, 26)} color={theme.ink} width={theme.stroke} />
        {p.highlight_last && (
          <Sketch
            paths={rLine("math-ul", 420, y0 + last * rowH + size(last) * 1.05, 420 + p.steps[last].expr.length * size(last) * 0.5, y0 + last * rowH + size(last) * 1.05, theme.rough)}
            progress={progressAt(frame, cue(`step.${last}`, last, n) + 12, 16)} color={theme.accent.green} width={9} />
        )}
      </Svg>
      {p.steps.map((s, i) => {
        const a = progressAt(frame, cue(`step.${i}`, i, n), 14);
        return (
          <div key={i} style={{position: "absolute", left: 420, right: 400, top: y0 + i * rowH, opacity: a, transform: `translateY(${(1 - a) * 20}px)`}}>
            <div style={{...headStyle(theme, size(i)), color: p.highlight_last && i === last ? theme.accent.green : theme.ink}}>{s.expr}</div>
            {s.note && <div style={{...bodyStyle(theme, 34), opacity: 0.75, marginTop: 16}}>{s.note}</div>}
          </div>
        );
      })}
    </Frame>
  );
};
