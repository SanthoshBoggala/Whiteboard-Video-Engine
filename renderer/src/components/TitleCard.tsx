import React from "react";
import {useCurrentFrame} from "remotion";
import type {TitleCardP} from "../types";
import {Sketch, fit, progressAt, rLine} from "../lib/rough";
import {CP, Frame, Svg, bodyStyle, headStyle} from "./shared";

export const TitleCard: React.FC<CP<TitleCardP>> = ({p, theme, cue}) => {
  const frame = useCurrentFrame();
  const size = fit(p.title, 150, 28, 70);
  const tIn = progressAt(frame, 10, 20);
  return (
    <Frame theme={theme}>
      <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 160px"}}>
        <h1 style={{...headStyle(theme, size), opacity: tIn, transform: `translateY(${(1 - tIn) * 30}px)`}}>{p.title}</h1>
        {p.subtitle && <p style={{...bodyStyle(theme, 52), marginTop: 50, opacity: progressAt(frame, cue("subtitle", 1, 2), 20)}}>{p.subtitle}</p>}
      </div>
      <Svg><Sketch paths={rLine("tc-ul", 560, 800, 1360, 800, theme.rough)} progress={progressAt(frame, 30, 24)} color={theme.accent.blue} width={8} /></Svg>
    </Frame>
  );
};
