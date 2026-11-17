import React from "react";
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import type {Scene, Storyboard} from "./types";
import {THEMES, Theme} from "./themes";
import {BarChartAnimated} from "./components/BarChartAnimated";
import {ChecklistCard} from "./components/ChecklistCard";
import {ComparisonSplit} from "./components/ComparisonSplit";
import {DisclaimerCard} from "./components/DisclaimerCard";
import {FlowchartNodes} from "./components/FlowchartNodes";
import {IllustrationScene, QuoteTitle} from "./components/IllustrationScene";
import {MathFormulaBox} from "./components/MathFormulaBox";
import {CartoonScene} from "./components/Cartoon";
import {TitleCard} from "./components/TitleCard";
import {Captions, setLook, ShortCards, ShortDonut, ShortHook, ShortLine, ShortList, ShortStat} from "./components/Shorts";

const COMPONENTS: Record<Scene["type"], React.FC<any>> = {
  TitleCard, QuoteTitle, IllustrationScene, ComparisonSplit, FlowchartNodes, BarChartAnimated, MathFormulaBox, ChecklistCard,
  ShortHook, ShortCards, ShortDonut, ShortLine, ShortStat, ShortList, CartoonScene,
};

const Fade: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame(), {durationInFrames: d} = useVideoConfig();
  return <AbsoluteFill style={{opacity: interpolate(f, [0, 4, d - 4, d], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}}>{children}</AbsoluteFill>;
};

const SceneView: React.FC<{scene: Scene; theme: Theme}> = ({scene, theme}) => {
  const C = COMPONENTS[scene.type];
  const cue = (ref: string, i: number, n: number) =>
    scene.cues.find((c) => c.ref === ref)?.offset_frames ?? Math.min(Math.round(scene.duration_frames * 0.8), 20 + i * 60);
  return (
    <>
      <C scene={scene} p={scene.props} theme={theme} cue={cue} />
      {theme.name.endsWith("shorts") && <Captions words={scene.words ?? []} />}
    </>
  );
};

export const VideoComposition: React.FC<{storyboard: Storyboard}> = ({storyboard: sb}) => {
  const theme = THEMES[sb.meta.theme];
  setLook(sb.meta.theme);
  const last = sb.scenes[sb.scenes.length - 1];
  const audioEnd = last.start_frame + last.duration_frames;
  return (
    <AbsoluteFill style={{background: theme.bg}}>
      {sb.meta.audio ? <Audio src={staticFile(sb.meta.audio)} /> : null}
      {sb.scenes.map((s) => (
        <Sequence key={s.id} from={s.start_frame} durationInFrames={s.duration_frames}>
          <Fade><SceneView scene={s} theme={theme} /></Fade>
        </Sequence>
      ))}
      {sb.meta.disclaimer && sb.meta.disclaimer_seconds > 0 ? (
        <Sequence from={audioEnd} durationInFrames={Math.max(sb.meta.total_frames - audioEnd, 1)}>
          <DisclaimerCard text={sb.meta.disclaimer} theme={theme} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
