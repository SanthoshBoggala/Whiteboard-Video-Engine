import React from "react";
import {Composition, staticFile} from "remotion";
import {VideoComposition} from "./VideoComposition";
import type {Storyboard} from "./types";

const placeholder: Storyboard = {
  meta: {fps: 60, width: 1920, height: 1080, theme: "whiteboard", audio: "", disclaimer: "", disclaimer_seconds: 4, total_frames: 60},
  scenes: [],
};

export const Root: React.FC = () => (
  <Composition
    id="Video"
    component={VideoComposition as React.FC<any>}
    durationInFrames={60}
    fps={60}
    width={1920}
    height={1080}
    defaultProps={{storyboard: placeholder}}
    calculateMetadata={async () => {
      const sb: Storyboard = await (await fetch(staticFile("storyboard.json"))).json();
      return {durationInFrames: sb.meta.total_frames, fps: sb.meta.fps, width: sb.meta.width, height: sb.meta.height, props: {storyboard: sb}};
    }}
  />
);
