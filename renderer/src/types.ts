// Mirrors pipeline/models.py (hand-kept in sync; pipeline validates before this ever sees data).
export type Accent = "blue" | "green" | "red";
export type ThemeName = "whiteboard" | "illustrated" | "shorts" | "dark" | "paper" | "papershorts" | "cartoon";

export type Asset = { id: string; query: string; prompt?: string; cue_word?: string; path?: string | null };
export type Cue = { ref: string; word: string; offset_frames: number };

export type Bubble = { text: string; anchor_asset?: string };
export type TitleCardP = { title: string; subtitle?: string };
export type QuoteTitleP = { number?: number; quote: string; body?: string; bubble?: Bubble };
export type IllustrationSceneP = { heading?: string; body: string; bubble?: Bubble };
export type Side = { label: string; items: string[]; accent: Accent };
export type ComparisonSplitP = { left: Side; right: Side };
export type FlowchartNodesP = { nodes: { id: string; label: string }[]; edges: { from: string; to: string }[] };
export type BarChartAnimatedP = {
  bars: { label: string; value: number; color: Accent }[];
  unit: string;
  callouts: { bar: string; text: string }[];
};
export type MathFormulaBoxP = { steps: { expr: string; note?: string }[]; highlight_last: boolean };
export type ChecklistCardP = { items: string[]; disclaimer?: string };

export type Tone = "blue" | "teal" | "amber" | "red" | "green";
export type Mark = "check" | "cross" | "rupee" | "user" | "debt";
export type ShortHookP = {tag: string; title: string; accent?: string; icon: "vault" | "building" | "bank" | "person" | "coins"};
export type ShortCardsP = {cards: {label?: string; text: string; tone: Tone; mark?: Mark}[]};
export type DonutP = {title: string; pill: string; pill_tone: Tone; slices: {label: string; pct: number; tone: Tone}[]};
export type ShortDonutP = {before: DonutP; after: DonutP; answer?: string};
export type ShortLineP = {label: string; points: number[]; tag?: string; tone: Tone};
export type ShortStatP = {label: string; value: string; sub?: string; tone: Tone};
export type ShortListP = {title?: string; items: string[]; tone: Tone};
export type CharP = {
  mood: "happy" | "shocked" | "thinking" | "sad" | "angry" | "excited" | "worried";
  pose: "down" | "cheer" | "shrug" | "point" | "think" | "wide" | "kneel" | "bend" | "sit";
  hat: "none" | "cap" | "explorer"; hair: "none" | "messy"; outfit: "none" | "fur" | "suit"; shake: boolean; say?: string;
};
export type ItemP = {kind: string; label?: string; arrow?: "up" | "down"};
export type VsSideP = {mark?: "check" | "cross"; label?: string; character?: CharP; items: ItemP[]};
export type CartoonSceneP = {
  layout: "stage" | "versus";
  place: "room" | "outdoor" | "office" | "city" | "plain" | "desert" | "sunset" | "night";
  characters: CharP[];
  items: ItemP[];
  caption?: string;
  versus?: {first: VsSideP; second: VsSideP};
};

export type SceneType =
  | "TitleCard" | "QuoteTitle" | "IllustrationScene" | "ComparisonSplit"
  | "FlowchartNodes" | "BarChartAnimated" | "MathFormulaBox" | "ChecklistCard"
  | "ShortHook" | "ShortCards" | "ShortDonut" | "ShortLine" | "ShortStat" | "ShortList" | "CartoonScene";

export type Scene = {
  id: string;
  type: SceneType;
  narration: string;
  props: any;
  assets: Asset[];
  cues: Cue[];
  words?: [string, number][];
  start_frame: number;
  duration_frames: number;
};

export type Meta = {
  fps: number; width: number; height: number; theme: ThemeName;
  audio: string; disclaimer: string; disclaimer_seconds: number; total_frames: number;
};
export type Storyboard = { meta: Meta; scenes: Scene[] };
