import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import type {CartoonSceneP, CharP, ItemP, VsSideP} from "../types";
import {fit, popAt, progressAt} from "../lib/rough";
import type {CP} from "./shared";

// Free "stick figure explainer" look: everything is drawn in code (no images, no API).
const INK = "#1A1A1A", W = 1920, H = 1080;
const S = {stroke: INK, strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const};
const font = "Inter, sans-serif";
type Pt = [number, number];
const pts = (a: Pt[]) => a.map((p) => p.join(",")).join(" ");

/* ---------- backgrounds ---------- */
const Place: React.FC<{place: CartoonSceneP["place"]}> = ({place}) => {
  if (place === "room") return (
    <g {...S}>
      <rect x="0" y="0" width={W} height="800" fill="#F0DDB8" stroke="none" />
      <rect x="0" y="0" width={W} height="90" fill="#F7ECD2" stroke="none" />
      <line x1="0" y1="90" x2={W} y2="90" />
      <polygon points={`0,800 ${W},800 ${W},${H} 0,${H}`} fill="#7A5232" />
      {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={200 + i * 300} y1="800" x2={i * 380 - 300} y2={H} strokeWidth={3} />)}
      <rect x="1500" y="190" width="300" height="400" fill="#BFE6FA" /><line x1="1650" y1="190" x2="1650" y2="590" /><line x1="1500" y1="390" x2="1800" y2="390" />
      <path d="M 880 0 L 1040 0 L 1010 60 L 910 60 Z" fill="#F4D77A" />
      <rect x="520" y="560" width="880" height="270" rx="30" fill="#7F8FA3" />
      <rect x="470" y="620" width="120" height="210" rx="30" fill="#8B9BB0" /><rect x="1330" y="620" width="120" height="210" rx="30" fill="#8B9BB0" />
      <path d="M 220 800 L 220 560 M 220 700 Q 120 640 130 560 M 220 700 Q 320 640 310 540 M 220 640 Q 190 540 230 470" fill="none" stroke="#3F7A3F" strokeWidth={14} />
      <path d="M 150 800 L 175 900 L 265 900 L 290 800 Z" fill="#B87A56" />
    </g>);
  if (place === "outdoor") return (
    <g {...S}>
      <rect width={W} height="720" fill="#BFE6FA" stroke="none" />
      <circle cx="1680" cy="150" r="80" fill="#F7D774" />
      <path d="M 300 160 q 40 -60 100 -30 q 50 -50 110 0 q 60 0 50 50 L 300 180 Z" fill="#fff" />
      <path d={`M 0 700 Q 600 660 1200 705 T ${W} 690 L ${W} ${H} L 0 ${H} Z`} fill="#D2B48C" />
      <rect x="1560" y="420" width="46" height="300" fill="#8B5E3C" /><circle cx="1583" cy="360" r="150" fill="#6DB36D" />
      {[0, 1, 2].map((i) => <path key={i} d={`M ${400 + i * 560} 900 l -10 -40 M ${400 + i * 560} 900 l 6 -46 M ${400 + i * 560} 900 l 22 -36`} fill="none" strokeWidth={4} />)}
    </g>);
  if (place === "office") return (
    <g {...S}>
      <rect width={W} height="800" fill="#E7ECF2" stroke="none" />
      <rect x="0" y="800" width={W} height="280" fill="#9AA5B1" />
      <rect x="1590" y="150" width="270" height="440" fill="#BFE6FA" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={1606 + i * 62} y={340 - (i % 2) * 90} width="48" height={250 + (i % 2) * 90} fill="#AEBBC9" />)}
      <rect x="260" y="720" width="1400" height="46" fill="#B07A4A" /><rect x="320" y="766" width="40" height="180" fill="#B07A4A" /><rect x="1560" y="766" width="40" height="180" fill="#B07A4A" />
    </g>);
  if (place === "city") return (
    <g {...S}>
      <rect width={W} height="760" fill="#BFE6FA" stroke="none" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const h = 260 + ((i * 97) % 280), x = 40 + i * 270;
        return <g key={i}><rect x={x} y={760 - h} width="230" height={h} fill={i % 2 ? "#A9B7C6" : "#C3CEDA"} />
          {Array.from({length: 12}).map((_, k) => <rect key={k} x={x + 26 + (k % 3) * 62} y={760 - h + 30 + Math.floor(k / 3) * 56} width="34" height="30" fill="#F4F1DE" strokeWidth={3} />)}</g>;
      })}
      <rect y="760" width={W} height="320" fill="#6B6F76" />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={120 + i * 320} y="930" width="170" height="14" fill="#F4F1DE" stroke="none" />)}
    </g>);
  if (place === "desert") return (
    <g {...S}>
      <rect width={W} height={H} fill="#CDA574" stroke="none" />
      <rect width={W} height="330" fill="#BFE6FA" stroke="none" /><line x1="0" y1="330" x2={W} y2="330" />
      <path d="M 120 760 Q 300 600 700 610 Q 1000 560 1400 620 Q 1800 650 1800 760 Q 1700 900 1300 930 Q 900 960 500 920 Q 160 890 120 760 Z" fill="#AB8559" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <g key={i}><rect x={90 + i * 250} y={420 + (i % 2) * 20} width="18" height="70" fill="#8B5E3C" /></g>)}
      <path d="M 60 430 Q 600 470 1860 430" fill="none" strokeWidth={3} />
    </g>);
  if (place === "sunset") return (
    <g {...S}>
      <defs><linearGradient id="sunsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2B1A4" /><stop offset="1" stopColor="#F9D6AA" /></linearGradient></defs>
      <rect width={W} height="560" fill="url(#sunsky)" stroke="none" />
      <rect y="560" width={W} height="520" fill="#C99C65" stroke="none" /><line x1="0" y1="560" x2={W} y2="560" />
      {[[100, 100, 700], [900, 190, 1500], [300, 260, 800]].map(([x, y, x2], i) => <line key={i} x1={x} y1={y} x2={x2} y2={y} stroke="#F7C2B4" strokeWidth={14} />)}
      <path d="M 0 700 Q 500 650 1000 700 T 1920 690" fill="none" strokeWidth={3} stroke="#B58A55" />
    </g>);
  if (place === "night") return (
    <g {...S}>
      <rect width={W} height={H} fill="#14213D" stroke="none" />
      {Array.from({length: 26}).map((_, i) => <circle key={i} cx={(i * 211) % W} cy={30 + ((i * 97) % 520)} r={i % 3 ? 3 : 5} fill="#F4F1DE" stroke="none" />)}
      <circle cx="1620" cy="170" r="75" fill="#F4F1DE" />
      <rect y="760" width={W} height="320" fill="#2B3A55" stroke="none" /><line x1="0" y1="760" x2={W} y2="760" />
    </g>);
  return (
    <g {...S}>
      <rect width={W} height={H} fill="#F4EFE2" stroke="none" />
      <rect y="860" width={W} height="220" fill="#E6DCC3" stroke="none" /><line x1="0" y1="860" x2={W} y2="860" />
    </g>);
};

/* ---------- stick figure ---------- */
const mir = (a: [Pt, Pt]): [Pt, Pt] => [[-a[0][0], a[0][1]], [-a[1][0], a[1][1]]];
const DOWN: [Pt, Pt] = [[-45, -225], [-55, -150]];
const STAND: Pt[][] = [[[0, -180], [-42, 0]], [[0, -180], [42, 0]]];
type Skel = {dy: number; rot: number; legs: Pt[][]; arms: [[Pt, Pt], [Pt, Pt]]};
// upper body is drawn in a group shifted down by dy and rotated by rot around the hip; legs are absolute.
const SK: Record<string, Skel> = {
  down: {dy: 0, rot: 0, legs: STAND, arms: [DOWN, mir(DOWN)]},
  cheer: {dy: 0, rot: 0, legs: STAND, arms: [[[-75, -350], [-95, -440]], mir([[-75, -350], [-95, -440]])]},
  shrug: {dy: 0, rot: 0, legs: STAND, arms: [[[-95, -255], [-160, -300]], mir([[-95, -255], [-160, -300]])]},
  wide: {dy: 0, rot: 0, legs: STAND, arms: [[[-110, -322], [-215, -400]], mir([[-110, -322], [-215, -400]])]},
  point: {dy: 0, rot: 0, legs: STAND, arms: [DOWN, [[90, -310], [235, -330]]]},
  think: {dy: 0, rot: 0, legs: STAND, arms: [DOWN, [[65, -235], [18, -335]]]},
  bend: {dy: 0, rot: 38, legs: STAND, arms: [[[40, -262], [112, -232]], [[52, -250], [126, -214]]]},
  sit: {dy: 140, rot: 0, legs: [[[0, -40], [-85, -108], [-140, -8]], [[0, -40], [85, -26], [168, -8]]], arms: [DOWN, mir(DOWN)]},
  kneel: {dy: 95, rot: 14, legs: [[[0, -85], [70, -14], [-32, 2]], [[0, -85], [-34, -50], [-104, 0]]], arms: [[[40, -262], [112, -232]], [[52, -250], [126, -214]]]},
};
const Face: React.FC<{mood: string}> = ({mood}) => {
  const line = {fill: "none", stroke: INK, strokeWidth: 5, strokeLinecap: "round" as const};
  const eye = mood === "excited" ? <><circle cx="-26" cy="-420" r="13" fill="#fff" stroke={INK} strokeWidth={4} /><circle cx="26" cy="-420" r="13" fill="#fff" stroke={INK} strokeWidth={4} /><circle cx="-26" cy="-420" r="5" fill={INK} /><circle cx="26" cy="-420" r="5" fill={INK} /></>
    : <><circle cx="-26" cy="-420" r={mood === "shocked" ? 9 : mood === "angry" ? 5 : 6} fill={INK} /><circle cx="26" cy="-420" r={mood === "shocked" ? 9 : mood === "angry" ? 5 : 6} fill={INK} /></>;
  return (
    <g>
      {eye}
      {mood === "happy" && <path d="M -26 -390 Q 0 -362 26 -390" {...line} />}
      {mood === "sad" && <path d="M -24 -372 Q 0 -396 24 -372" {...line} />}
      {mood === "shocked" && <ellipse cx="0" cy="-378" rx="12" ry="18" fill={INK} />}
      {mood === "thinking" && <><path d="M -20 -378 L 20 -384" {...line} /><path d="M -46 -446 L -12 -454" {...line} /></>}
      {mood === "angry" && <><path d="M -46 -452 L -12 -436" {...line} /><path d="M 46 -452 L 12 -436" {...line} /><path d="M -24 -372 L -12 -384 L 0 -372 L 12 -384 L 24 -372" {...line} strokeWidth={4} /></>}
      {mood === "excited" && <path d="M -26 -388 Q 0 -346 26 -388 Z" fill="#F28B9B" stroke={INK} strokeWidth={4} strokeLinejoin="round" />}
      {mood === "worried" && <><path d="M -46 -438 L -14 -452" {...line} /><path d="M 46 -438 L 14 -452" {...line} /><path d="M -20 -376 Q -10 -388 0 -376 Q 10 -364 20 -376" {...line} strokeWidth={4} /></>}
    </g>);
};
const Hat: React.FC<{hat: string}> = ({hat}) => hat === "cap" ? (
  <g {...S}><path d="M -78 -428 A 78 78 0 0 1 78 -428 Z" fill="#4C7BD9" /><path d="M 20 -432 L 135 -420 L 135 -404 L 20 -412 Z" fill="#3A63B8" /></g>
) : hat === "explorer" ? (
  <g {...S}><path d="M -72 -470 Q -68 -545 0 -548 Q 68 -545 72 -470 Z" fill="#C9A66B" /><ellipse cx="0" cy="-468" rx="128" ry="22" fill="#D6B67E" /><path d="M -70 -490 Q 0 -478 70 -490" fill="none" /></g>
) : null;
const Hair: React.FC = () => {  // spiky brown fringe over the top of the head
  const out: Pt[] = [];
  const n = 11;
  for (let k = 0; k <= n; k++) {
    const a = Math.PI * (1.08 + (0.84 * k) / n), r = k % 2 ? 104 : 80;
    out.push([Math.cos(a) * r, -408 + Math.sin(a) * r]);
  }
  const inner: Pt[] = [];
  for (let k = n; k >= 0; k--) { const a = Math.PI * (1.08 + (0.84 * k) / n); inner.push([Math.cos(a) * 62, -408 + Math.sin(a) * 62 + (k % 2 ? 14 : 0)]); }
  return <polygon points={pts([...out, ...inner])} fill="#6B4423" {...S} strokeWidth={5} />;
};
const Outfit: React.FC<{outfit: string}> = ({outfit}) => outfit === "fur" ? (
  <polygon points={pts([[-52, -300], [30, -306], [58, -250], [52, -190], [40, -170], [28, -196], [14, -166], [0, -194], [-14, -164], [-28, -194], [-44, -170], [-56, -230]])} fill="#8B5A2B" {...S} strokeWidth={5} />
) : outfit === "suit" ? (
  <g {...S} strokeWidth={5}><polygon points="-52,-306 52,-306 56,-180 -56,-180" fill="#22345A" /><polygon points="-14,-306 14,-306 0,-250" fill="#fff" strokeWidth={3} /><polygon points="-6,-296 6,-296 10,-230 0,-214 -10,-230" fill="#D9534F" strokeWidth={3} /></g>
) : null;

const Figure: React.FC<{x: number; y: number; k: number; c: CharP; at: number; phase: number}> = ({x, y, k, c, at, phase}) => {
  const f = useCurrentFrame(), {fps} = useVideoConfig(), s = popAt(f, fps, at), bob = Math.sin(f / 16 + phase) * 5;
  const sk = SK[c.pose] ?? SK.down;
  const arm = ([e, h]: [Pt, Pt]) => (
    <g>
      <polyline points={`0,-300 ${e[0]},${e[1]} ${h[0]},${h[1]}`} fill="none" {...S} strokeWidth={8} />
      <ellipse cx={h[0]} cy={h[1]} rx="20" ry="13" fill="#fff" {...S} strokeWidth={4} />
    </g>);
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${k * Math.min(s, 1.04)})`} opacity={Math.min(s, 1)} {...S}>
      <ellipse cx="0" cy="8" rx="95" ry="14" fill="#00000022" stroke="none" />
      {sk.legs.map((l, i) => <g key={i}><polyline points={pts(l)} fill="none" strokeWidth={8} /><ellipse cx={l[l.length - 1][0] + (i ? 12 : -12)} cy={l[l.length - 1][1] + 2} rx="30" ry="11" fill="#fff" strokeWidth={5} /></g>)}
      <g transform={`translate(0 ${sk.dy}) rotate(${sk.rot} 0 -180)`}>
        <line x1="0" y1="-330" x2="0" y2="-180" strokeWidth={8} />
        <Outfit outfit={c.outfit} />
        {arm(sk.arms[0])}{arm(sk.arms[1])}
        <circle cx="0" cy="-408" r="78" fill="#fff" strokeWidth={7} />
        {c.hair === "messy" && <Hair />}
        <Face mood={c.mood} /><Hat hat={c.hat} />
      </g>
      {c.shake && (
        <g transform={`translate(0 ${sk.dy})`} fill="none" strokeWidth={5} opacity={0.75 + 0.25 * Math.sin(f / 2.5)}>
          {[-1, 1].map((d) => [0, 1, 2].map((i) => <path key={`${d}${i}`} d={`M ${d * (130 + i * 26)} -400 Q ${d * (160 + i * 30)} -340 ${d * (130 + i * 26)} -280`} />))}
        </g>
      )}
    </g>
  );
};

/* ---------- props ---------- */
const Glyph: React.FC<{kind: string}> = ({kind}) => {
  switch (kind) {
    case "coin": case "dollar": return <g {...S}><circle r="70" fill="#F2C94C" /><circle r="50" fill="none" strokeWidth={3} /><text y="22" textAnchor="middle" fontSize="64" fontWeight="800" fill={INK} stroke="none" fontFamily={font}>$</text></g>;
    case "bag": return <g {...S}><path d="M -50 -20 Q -85 40 -45 78 L 45 78 Q 85 40 50 -20 Z" fill="#7DB36A" /><path d="M -32 -20 L -42 -62 L 42 -62 L 32 -20" fill="#7DB36A" /><text y="52" textAnchor="middle" fontSize="54" fontWeight="800" fill={INK} stroke="none" fontFamily={font}>$</text></g>;
    case "chart_up": case "chart_down": { const up = kind === "chart_up", c = up ? "#4FA85A" : "#D9534F"; return <g {...S}><rect x="-80" y="-70" width="160" height="140" rx="8" fill="#fff" /><polyline points={up ? "-60,40 -20,0 10,15 55,-40" : "-60,-40 -20,0 10,-15 55,40"} fill="none" stroke={c} strokeWidth={10} /><path d={up ? "M 55 -40 L 28 -38 M 55 -40 L 54 -14" : "M 55 40 L 28 38 M 55 40 L 54 14"} fill="none" stroke={c} strokeWidth={10} /></g>; }
    case "car": return <g {...S}><path d="M -90 25 L -80 -5 Q -50 -40 0 -40 Q 45 -40 62 -8 L 90 0 L 90 32 L -90 32 Z" fill="#4C7BD9" /><path d="M -50 -8 L -35 -28 L -2 -28 L -2 -8 Z M 8 -8 L 8 -28 L 36 -28 L 50 -8 Z" fill="#CFE3F7" strokeWidth={3} /><circle cx="-50" cy="34" r="20" fill="#333" /><circle cx="52" cy="34" r="20" fill="#333" /></g>;
    case "house": return <g {...S}><rect x="-60" y="-10" width="120" height="85" fill="#F4D6A0" /><polygon points="-80,-10 0,-70 80,-10" fill="#C0644A" /><rect x="-14" y="30" width="28" height="45" fill="#8B5E3C" /></g>;
    case "bank": return <g {...S}><polygon points="0,-75 -85,-30 85,-30" fill="#F2C94C" /><rect x="-85" y="-30" width="170" height="12" fill="#fff" />{[-60, -20, 20, 60].map((x) => <rect key={x} x={x - 9} y="-16" width="18" height="70" fill="#fff" />)}<rect x="-95" y="54" width="190" height="16" fill="#E6DCC3" /></g>;
    case "laptop": return <g {...S}><rect x="-70" y="-60" width="140" height="95" rx="6" fill="#CFE3F7" /><path d="M -90 35 L 90 35 L 70 58 L -70 58 Z" fill="#C9CFD6" /></g>;
    case "clock": return <g {...S}><circle r="70" fill="#fff" /><path d="M 0 0 L 0 -45 M 0 0 L 32 14" fill="none" strokeWidth={8} /></g>;
    case "shield": return <g {...S}><path d="M 0 -78 L 62 -52 Q 62 30 0 78 Q -62 30 -62 -52 Z" fill="#6FA8DC" /><path d="M -26 0 L -6 22 L 28 -22" fill="none" stroke="#fff" strokeWidth={10} /></g>;
    case "doc": return <g {...S}><path d="M -55 -75 L 25 -75 L 55 -45 L 55 75 L -55 75 Z" fill="#fff" />{[-30, -5, 20, 45].map((y) => <line key={y} x1="-32" y1={y} x2="32" y2={y} strokeWidth={4} />)}</g>;
    case "campfire": return <g {...S}>{Array.from({length: 8}).map((_, i) => { const a = (i / 8) * Math.PI * 2; return <ellipse key={i} cx={Math.cos(a) * 62} cy={38 + Math.sin(a) * 18} rx="24" ry="17" fill="#A7ADB5" strokeWidth={4} />; })}<path d="M 0 -78 Q 42 -22 22 22 Q 0 44 -22 22 Q -42 -22 0 -78 Z" fill="#F28C28" /><path d="M 0 -34 Q 18 -4 8 16 Q 0 26 -8 16 Q -18 -4 0 -34 Z" fill="#F7D774" strokeWidth={3} /></g>;
    case "rock": return <g {...S}><path d="M -90 55 Q -100 -20 -40 -52 Q 20 -80 72 -32 Q 104 10 90 55 Z" fill="#A7ADB5" /><path d="M -30 -20 Q 0 -34 30 -18" fill="none" strokeWidth={3} /></g>;
    case "spear": return <g {...S}><g transform="rotate(35)"><line x1="0" y1="84" x2="0" y2="-52" stroke="#8B5E3C" strokeWidth={9} /><polygon points="0,-100 -17,-50 17,-50" fill="#A7ADB5" /><line x1="-10" y1="-44" x2="10" y2="-36" strokeWidth={4} /></g></g>;
    case "crate": return <g {...S}><polygon points="-70,-20 -42,-48 98,-48 70,-20" fill="#C79A66" /><rect x="-70" y="-20" width="140" height="82" fill="#B07A4A" /><line x1="-70" y1="12" x2="70" y2="12" strokeWidth={3} /><line x1="-70" y1="40" x2="70" y2="40" strokeWidth={3} /></g>;
    case "bone": return <g {...S}><g transform="rotate(-20)"><rect x="-58" y="-13" width="116" height="26" rx="12" fill="#F3E9CF" />{[[-62, -14], [-62, 14], [62, -14], [62, 14]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="17" fill="#F3E9CF" />)}</g></g>;
    default: return <g {...S}><circle cy="-15" r="50" fill="#F7E27A" /><rect x="-22" y="35" width="44" height="32" rx="6" fill="#C9CFD6" /></g>;
  }
};
const Arrow: React.FC<{dir: "up" | "down"}> = ({dir}) => (
  <path transform={`translate(0 -135) ${dir === "down" ? "scale(1 -1)" : ""}`} d="M 0 -36 L 34 0 L 13 0 L 13 36 L -13 36 L -13 0 L -34 0 Z" fill={dir === "up" ? "#5BAA5B" : "#D9534F"} {...S} strokeWidth={4} />
);
const GROUND = ["campfire", "rock", "spear", "crate", "bone"];
const isGround = (it: ItemP) => GROUND.includes(it.kind);
const ItemView: React.FC<{it: ItemP; x: number; y: number; k: number; at: number}> = ({it, x, y, k, at}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), s = popAt(frame, fps, at);
  return (
    <g transform={`translate(${x} ${y}) scale(${k * Math.min(s, 1.05)})`} opacity={Math.min(s, 1)}>
      <Glyph kind={it.kind} />{it.arrow && <Arrow dir={it.arrow} />}
      {it.label && <text y={isGround(it) ? -92 : 118} textAnchor="middle" fontSize="34" fontWeight="800" fill={INK} stroke="#fff" strokeWidth={5} paintOrder="stroke" fontFamily={font} style={{whiteSpace: "pre"}}>{it.label}</text>}
    </g>);
};

const Bubble: React.FC<{c: CharP; fx: number; fy: number; left: boolean; at: number}> = ({c, fx, fy, left, at}) => {
  const frame = useCurrentFrame();
  const bx = left ? fx - 130 - 360 : fx + 130;
  return (
    <g transform={`translate(${bx} ${fy})`} opacity={progressAt(frame, at, 8)}>
      <polygon points={left ? "340,100 392,150 296,112" : "20,100 -32,150 64,112"} fill="#fff" {...S} />
      <rect width="360" height="120" rx="30" fill="#fff" {...S} />
      <text x="180" y="76" textAnchor="middle" fontSize={fit(c.say ?? "", 52, 12, 34)} fontWeight="800" fill={INK} stroke="none" fontFamily={font}>{c.say}</text>
    </g>);
};
const headY = (c: CharP, k: number, baseY: number) => baseY - k * (408 - (SK[c.pose] ?? SK.down).dy) - 60;

/* ---------- versus (split screen with a tick and a cross) ---------- */
const Mark: React.FC<{kind: "check" | "cross"; x: number; y: number; at: number}> = ({kind, x, y, at}) => {
  const f = useCurrentFrame(), {fps} = useVideoConfig(), s = popAt(f, fps, at);
  return (
    <g transform={`translate(${x} ${y}) scale(${Math.min(s, 1.1)})`} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={20} stroke={kind === "check" ? "#4FA85A" : "#D9534F"}>
      {kind === "check" ? <path d="M -52 6 L -16 44 L 56 -42" /> : <path d="M -46 -46 L 46 46 M 46 -46 L -46 46" />}
    </g>);
};
const SideView: React.FC<{side: VsSideP; cx: number; at: number; phase: number}> = ({side, cx, at, phase}) => {
  const frame = useCurrentFrame(), baseY = 1030, k = 0.98, ch = side.character, n = side.items.length;
  return (
    <g>
      {side.mark && <Mark kind={side.mark} x={cx} y={190} at={at} />}
      {side.label && <text x={cx} y={320} textAnchor="middle" fontSize={fit(side.label, 56, 16, 40)} fontWeight="800" fill={INK} fontFamily={font} opacity={progressAt(frame, at + 4, 10)}>{side.label}</text>}
      {side.items.map((it, i) => ch
        ? <ItemView key={i} it={{...it, label: it.label}} k={1.2} x={cx + (n === 1 ? 250 : i ? 280 : -280)} y={880} at={at + 10 + i * 12} />
        : <ItemView key={i} it={it} k={1.7} x={cx + (n === 1 ? 0 : i ? 190 : -190)} y={610} at={at + 10 + i * 12} />)}
      {ch && <Figure x={cx} y={baseY} k={k} c={ch} at={at + 2} phase={phase} />}
      {ch?.say && <Bubble c={ch} fx={cx} fy={headY(ch, k, baseY) - 20} left={cx < W / 2} at={at + 16} />}
    </g>);
};

export const CartoonScene: React.FC<CP<CartoonSceneP>> = ({scene, p}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const wobble = <defs><filter id="wob" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="5" /></filter></defs>;  // slight hand-inked wobble
  let body: React.ReactNode;
  if (p.layout === "versus" && p.versus) {
    const d = scene.duration_frames, at2 = 10 + Math.round(d * 0.3);
    body = (
      <>
        <rect width={W} height={H} fill="#fff" />
        <line x1={W / 2} y1="40" x2={W / 2} y2="1040" stroke={INK} strokeWidth={7} strokeDasharray="34 26" strokeLinecap="round" />
        <SideView side={p.versus.first} cx={480} at={6} phase={0} />
        <SideView side={p.versus.second} cx={1440} at={at2} phase={2} />
      </>);
  } else {
    const row = p.items.filter((it) => !isGround(it)), ground = p.items.filter(isGround);
    const n = row.length, two = p.characters.length === 2, figX = two ? [600, 1320] : [960], baseY = 1030, k = 0.95;
    const itemX = (i: number) => (n === 1 ? 960 : 520 + (i * 880) / (n - 1));
    const slots = two ? [960, 1730, 190] : [1480, 440, 1730, 190];  // ground props sit beside the characters
    body = (
      <>
        <Place place={p.place} />
        {row.map((it, i) => <ItemView key={i} it={it} x={itemX(i)} y={360} k={1.15} at={10 + Math.round((scene.duration_frames * 0.55 * i) / Math.max(n, 1))} />)}
        {ground.map((it, i) => <ItemView key={"g" + i} it={it} x={slots[i % slots.length]} y={925} k={1.3} at={8 + i * 10} />)}
        {p.characters.map((c, i) => <Figure key={i} x={figX[i]} y={baseY} k={k} c={c} at={4 + i * 6} phase={i * 2} />)}
        {p.characters.map((c, i) => c.say && <Bubble key={"b" + i} c={c} fx={figX[i]} fy={headY(c, k, baseY)} left={two && i === 0} at={18 + i * 8} />)}
      </>);
  }
  return (
    <AbsoluteFill>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute"}}>
        {wobble}
        <g filter="url(#wob)">{body}</g>
      </svg>
      {p.caption && (
        <div style={{position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", background: "#fff", border: `5px solid ${INK}`, borderRadius: 28, padding: "16px 40px", fontFamily: font, fontWeight: 800, fontSize: fit(p.caption, 60, 30, 40), color: INK, opacity: progressAt(frame, 2, 10), whiteSpace: "nowrap"}}>{p.caption}</div>
      )}
    </AbsoluteFill>
  );
};
