import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import type {Theme} from "../themes";
import {progressAt} from "../lib/rough";
import {bodyStyle} from "./shared";

export const DisclaimerCard: React.FC<{text: string; theme: Theme}> = ({text, theme}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: theme.bg, justifyContent: "center", alignItems: "center", padding: "0 220px"}}>
      <p style={{...bodyStyle(theme, 52), textAlign: "center", opacity: progressAt(frame, 0, 12) * 0.85}}>{text}</p>
    </AbsoluteFill>
  );
};
