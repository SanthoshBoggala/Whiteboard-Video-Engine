import React from "react";
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from "remotion";
import {evolvePath} from "@remotion/paths";
import type {DonutP, Mark, ShortCardsP, ShortDonutP, ShortHookP, ShortLineP, ShortListP, ShortStatP, Tone} from "../types";
import {fit, popAt, progressAt} from "../lib/rough";
import type {CP} from "./shared";

// Dark glass look for 1080x1920 Shorts. Everything is drawn in code: no external images.
// Colours are swapped per video by setLook() (one theme per render), so every component below reads K / TONE.
const DARK = {
  K: {card: "rgba(19,36,74,0.62)", border: "#2A3D66", dim: "#AEB8CC", text: "#FFFFFF", faint: "#6B7A99", panel: "#13244A", col: "#E8EDF8", ink: "#0A1428", gold: "#F2C94C", shadow: "0 4px 18px rgba(0,0,0,.6)", bw: 2,
    bg1: "#0E1A33", bg2: "#0A1428", grid: "none", serif: ""},
  TONE: {blue: "#4C8DF6", teal: "#5CCFB2", amber: "#F2C94C", red: "#F26B6B", green: "#59D48C"} as Record<Tone, string>,
};
const PAPER = {  // cream grid paper, navy ink, rust accent
  K: {card: "rgba(255,255,255,0.72)", border: "#15233F", dim: "#5B6478", text: "#15233F", faint: "#8A8F9C", panel: "#F6F4EA", col: "#FFFFFF", ink: "#15233F", gold: "#E8B93F", shadow: "none", bw: 3,
    bg1: "#EDEBDD", bg2: "#EDEBDD", grid: "linear-gradient(#E0DDCC 2px, transparent 2px), linear-gradient(90deg, #E0DDCC 2px, transparent 2px)", serif: "Georgia, 'Times New Roman', serif"},
  TONE: {blue: "#2B5FB8", teal: "#2A9D8F", amber: "#B8481F", red: "#C0392B", green: "#2FA36B"} as Record<Tone, string>,
};
export const K = {...DARK.K}, TONE = {...DARK.TONE};
export const setLook = (theme: string) => {const l = theme.startsWith("paper") ? PAPER : DARK; Object.assign(K, l.K); Object.assign(TONE, l.TONE);};
const font = "Inter, sans-serif";

/** true on the 16:9 `dark` theme, false on the vertical `shorts` theme */
const useWide = () => {const {width, height} = useVideoConfig(); return width > height;};

const Bg: React.FC<{children: React.ReactNode; row?: boolean}> = ({children, row}) => {
  const wide = useWide();
  const box: React.CSSProperties = wide
    ? {left: 110, right: 110, top: 80, bottom: 80}
    : {left: 60, right: 60, top: 150, height: 1230};
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg,${K.bg1} 0%,${K.bg2} 100%)`, fontFamily: font, color: K.text}}>
      {K.grid !== "none" && <AbsoluteFill style={{backgroundImage: K.grid, backgroundSize: "56px 56px", opacity: 0.7}} />}
      <div style={{position: "absolute", ...box, display: "flex", flexDirection: row ? "row" : "column", justifyContent: "center", alignItems: row ? "center" : undefined, gap: wide ? 40 : 36}}>{children}</div>
    </AbsoluteFill>
  );
};

const glass = (): React.CSSProperties => ({background: K.card, border: `${K.bw}px solid ${K.border}`, borderRadius: 36});  // function: reads the palette at render time
const Pill: React.FC<{text: string; tone: Tone}> = ({text, tone}) => (
  <span style={{fontSize: 26, fontWeight: 700, letterSpacing: 2, padding: "8px 20px", borderRadius: 14, color: TONE[tone], background: `${TONE[tone]}26`}}>{text.toUpperCase()}</span>
);
const Illustration = () => <div style={{alignSelf: "flex-end", fontSize: 22, letterSpacing: 3, color: K.faint, fontWeight: 700}}>ILLUSTRATION</div>;

const MarkIcon: React.FC<{mark: Mark; color: string; size?: number}> = ({mark, color, size = 64}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
    {mark === "check" && <path d="M14 34 L27 46 L50 20" />}
    {mark === "cross" && <path d="M18 18 L46 46 M46 18 L18 46" />}
    {mark === "user" && <><circle cx="32" cy="22" r="10" /><path d="M12 54 Q32 28 52 54" /></>}
    {mark === "debt" && <><path d="M32 10 V54" /><path d="M20 38 L32 54 L44 38" /></>}
    {mark === "rupee" && <text x="32" y="46" textAnchor="middle" fontSize="44" fontWeight="700" fill={color} stroke="none" fontFamily={font}>₹</text>}
  </svg>
);

/* ---------- hook / title ---------- */
const Icon: React.FC<{kind: ShortHookP["icon"]; label?: string}> = ({kind, label}) => {
  const a = K.gold, line = K.border, fill = K.panel;
  return (
    <svg width={680} height={578} viewBox="0 0 200 170">
      {(kind === "building" || kind === "bank") && <>
        <polygon points="100,12 20,52 180,52" fill={a} stroke={line} strokeWidth={3} />
        <text x="100" y="45" textAnchor="middle" fontSize="22" fontWeight="800" fill={K.ink} fontFamily={font}>{kind === "building" ? label : ""}</text>
        <rect x="26" y="56" width="148" height="12" fill={K.ink} stroke={line} strokeWidth={2} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={38 + i * 34} y="72" width="18" height="62" rx="3" fill={K.col} />)}
        <rect x="18" y="138" width="164" height="10" rx="3" fill={fill} stroke={line} strokeWidth={2} />
        <rect x="8" y="150" width="184" height="10" rx="3" fill={fill} stroke={line} strokeWidth={2} />
      </>}
      {kind === "vault" && <>
        <rect x="25" y="15" width="150" height="140" rx="20" fill={fill} stroke={TONE.blue} strokeWidth={4} />
        <circle cx="100" cy="85" r="46" fill={K.ink} stroke={a} strokeWidth={5} />
        <circle cx="100" cy="85" r="8" fill={a} />
        {[0, 60, 120, 180, 240, 300].map((r) => <line key={r} x1="100" y1="85" x2="100" y2="50" stroke={a} strokeWidth={5} strokeLinecap="round" transform={`rotate(${r} 100 85)`} />)}
      </>}
      {kind === "person" && <>
        <circle cx="100" cy="85" r="75" fill={`${a}22`} stroke={a} strokeWidth={4} />
        <circle cx="100" cy="66" r="24" fill={a} />
        <path d="M52 128 Q100 60 148 128 Z" fill={a} />
      </>}
      {kind === "coins" && [0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${12 + i * 14} ${105 - i * 36})`}>
          <ellipse cx="70" cy="30" rx="62" ry="22" fill={a} stroke={line} strokeWidth={3} />
          <text x="70" y="40" textAnchor="middle" fontSize="28" fontWeight="800" fill={K.ink} fontFamily={font}>₹</text>
        </g>
      ))}
    </svg>
  );
};

export const ShortHook: React.FC<CP<ShortHookP>> = ({p}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const parts = p.accent && p.title.includes(p.accent) ? p.title.split(p.accent) : [p.title];
  const wide = useWide(), size = wide ? fit(p.title, 150, 22, 96) : fit(p.title, 160, 18, 92);
  const tag = <div style={{alignSelf: wide ? "flex-start" : "center", opacity: progressAt(frame, 0, 10), marginBottom: wide ? 30 : 0}}><Pill text={p.tag} tone="blue" /></div>;
  const icon = <div style={{alignSelf: "center", transform: `scale(${popAt(frame, fps, 14) * (wide ? 0.85 : 1)})`}}><Icon kind={p.icon} label={/\bIPO\b/i.test(`${p.title} ${p.tag}`) ? "IPO" : ""} /></div>;
  const h1 = (
      <h1 style={{margin: 0, textAlign: wide ? "left" : "center", fontSize: size, lineHeight: 1.08, fontWeight: 800, opacity: progressAt(frame, 4, 14), transform: `translateY(${(1 - progressAt(frame, 4, 14)) * 40}px)`}}>
        {parts.length === 2 ? <>{parts[0]}<span style={{color: TONE.amber, ...(K.serif ? {fontFamily: K.serif, fontStyle: "italic"} : {})}}>{p.accent}</span>{parts[1]}</> : p.title}
      </h1>
  );
  return wide ? (
    <Bg row><div style={{flex: 1}}>{tag}{h1}</div>{icon}</Bg>
  ) : (
    <Bg>{tag}{h1}{icon}</Bg>
  );
};

/* ---------- stacked answer / comparison cards ---------- */
export const ShortCards: React.FC<CP<ShortCardsP>> = ({scene, p}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), n = p.cards.length, wide = useWide(), cols = wide && n > 1;
  return (
    <Bg row={cols}>
      {p.cards.map((c, i) => {
        const at = 6 + Math.round((scene.duration_frames * 0.6 * i) / n), s = popAt(frame, fps, at), col = TONE[c.tone];
        return (
          <div key={i} style={{...glass(), borderColor: `${col}88`, padding: "64px 56px", display: "flex", flexDirection: cols ? "column" : "row", alignItems: cols ? "flex-start" : "center", flex: cols ? 1 : undefined, gap: cols ? 30 : 44, opacity: Math.min(s, 1), transform: `translateY(${(1 - Math.min(s, 1)) * 60}px)`}}>
            {c.mark && <div style={{width: 150, height: 150, borderRadius: 75, background: `${col}22`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none"}}><MarkIcon mark={c.mark} color={col} size={88} /></div>}
            <div>
              {c.label && <div style={{fontSize: 36, fontWeight: 700, letterSpacing: 3, color: col, marginBottom: 12}}>{c.label.toUpperCase()}</div>}
              <div style={{fontSize: fit(c.text, cols ? 84 : 96, 16, 60), fontWeight: 800, lineHeight: 1.12}}>{c.text}</div>
            </div>
          </div>
        );
      })}
    </Bg>
  );
};

/* ---------- before / after donuts ---------- */
const R = 90, CIRC = 2 * Math.PI * R;
const DonutCard: React.FC<{d: DonutP; t: number}> = ({d, t}) => {
  let acc = 0;
  const wide = useWide();
  return (
    <div style={{...glass(), flex: 1, padding: "40px 32px", opacity: Math.min(t * 2, 1)}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28}}>
        <span style={{fontSize: 28, letterSpacing: 2, color: K.dim, fontWeight: 700}}>{d.title.toUpperCase()}</span>
        <Pill text={d.pill} tone={d.pill_tone} />
      </div>
      <svg width="100%" viewBox="0 0 240 240" style={{display: "block", maxWidth: wide ? 360 : undefined, margin: "0 auto"}}>
        <g transform="rotate(-90 120 120)">
          {d.slices.map((s, i) => {
            const len = (s.pct / 100) * CIRC * t, off = -acc * CIRC / 100 * t;
            acc += s.pct;
            return <circle key={i} cx="120" cy="120" r={R} fill="none" stroke={TONE[s.tone]} strokeWidth="38" strokeDasharray={`${Math.max(len - 2, 0)} ${CIRC}`} strokeDashoffset={off} />;
          })}
        </g>
      </svg>
      <div style={{marginTop: 26, display: "flex", flexDirection: "column", gap: 14}}>
        {d.slices.map((s, i) => (
          <div key={i} style={{display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 600, color: i === d.slices.length - 1 && d.slices.length === 3 ? TONE.amber : K.text}}>
            <span style={{width: 22, height: 22, borderRadius: 6, background: TONE[s.tone], flex: "none"}} />{s.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ShortDonut: React.FC<CP<ShortDonutP>> = ({scene, p}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), d = scene.duration_frames;
  const a2 = Math.round(d * 0.35), a3 = Math.round(d * 0.7), s3 = popAt(frame, fps, a3);
  return (
    <Bg>
      <div style={{display: "flex", gap: 28}}>
        <DonutCard d={p.before} t={progressAt(frame, 6, 24)} />
        <DonutCard d={p.after} t={progressAt(frame, a2, 24)} />
      </div>
      <Illustration />
      {p.answer && (
        <div style={{...glass(), padding: "44px 48px", fontSize: 66, fontWeight: 800, opacity: Math.min(s3, 1), transform: `translateY(${(1 - Math.min(s3, 1)) * 50}px)`}}>{p.answer}</div>
      )}
    </Bg>
  );
};

/* ---------- price line ---------- */
export const ShortLine: React.FC<CP<ShortLineP>> = ({scene, p}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const wide = useWide(), W = wide ? 1500 : 900, H = wide ? 400 : 520, pad = 40, lo = Math.min(...p.points), hi = Math.max(...p.points);
  const xy = p.points.map((v, i) => [pad + (i * (W - 2 * pad)) / (p.points.length - 1), H - pad - ((v - lo) / (hi - lo || 1)) * (H - 2 * pad)]);
  const d = "M " + xy.map(([x, y]) => `${x} ${y}`).join(" L ");
  const prog = progressAt(frame, 8, Math.round(scene.duration_frames * 0.65)), col = TONE[p.tone];
  const [ex, ey] = xy[xy.length - 1], tagS = popAt(frame, fps, Math.round(scene.duration_frames * 0.6));
  return (
    <Bg>
      <div style={{...glass(), padding: "40px 30px"}}>
        <div style={{fontSize: 34, fontWeight: 700, letterSpacing: 2, color: K.dim, margin: "0 10px 20px"}}>{p.label.toUpperCase()}</div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad} x2={W - pad} y1={H * f} y2={H * f} stroke={K.border} strokeWidth={2} strokeDasharray="6 10" />)}
          <path d={d} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" {...evolvePath(Math.max(prog, 0.001), d)} />
          {prog >= 1 && <circle cx={ex} cy={ey} r={16} fill={col} />}
        </svg>
      </div>
      <Illustration />
      {p.tag && <div style={{...glass(), borderColor: `${TONE.amber}88`, padding: "44px 48px", fontSize: 64, fontWeight: 800, color: TONE.amber, opacity: Math.min(tagS, 1)}}>{p.tag}</div>}
    </Bg>
  );
};

/* ---------- word-by-word captions ---------- */
export const Captions: React.FC<{words: [string, number][]}> = ({words}) => {
  const frame = useCurrentFrame();
  if (!words.length) return null;
  const cur = Math.max(0, words.findIndex(([, f], i) => frame < (words[i + 1]?.[1] ?? 1e9)));
  const start = Math.floor(cur / 4) * 4, chunk = words.slice(start, start + 4);
  return (
    <div style={{position: "absolute", left: 60, right: 60, top: 1480, height: 300, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: "10px 22px", fontFamily: font}}>
      {chunk.map(([w], i) => (
        <span key={start + i} style={{fontSize: 84, fontWeight: 800, color: start + i === cur ? TONE.amber : K.text, textShadow: K.shadow, transform: start + i === cur ? "scale(1.06)" : "none"}}>{w}</span>
      ))}
    </div>
  );
};

/* ---------- one big number ---------- */
export const ShortStat: React.FC<CP<ShortStatP>> = ({p}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), wide = useWide(), col = TONE[p.tone], s = popAt(frame, fps, 8);
  return (
    <Bg>
      <div style={{textAlign: "center", fontSize: 44, fontWeight: 700, letterSpacing: 5, color: col, opacity: progressAt(frame, 0, 10)}}>{p.label.toUpperCase()}</div>
      <div style={{textAlign: "center", fontSize: fit(p.value, wide ? 360 : 300, 5, 150), fontWeight: 800, lineHeight: 1, color: col, transform: `scale(${0.6 + 0.4 * Math.min(s, 1)})`, opacity: Math.min(s, 1)}}>{p.value}</div>
      {p.sub && <div style={{...glass(), padding: "36px 48px", textAlign: "center", fontSize: wide ? 56 : 60, fontWeight: 700, alignSelf: "center", opacity: progressAt(frame, 24, 14)}}>{p.sub}</div>}
    </Bg>
  );
};

/* ---------- key points ---------- */
export const ShortList: React.FC<CP<ShortListP>> = ({scene, p}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), wide = useWide(), col = TONE[p.tone], n = p.items.length;
  return (
    <Bg>
      {p.title && <div style={{fontSize: 44, fontWeight: 700, letterSpacing: 4, color: col, opacity: progressAt(frame, 0, 10)}}>{p.title.toUpperCase()}</div>}
      {p.items.map((t, i) => {
        const s = popAt(frame, fps, 8 + Math.round((scene.duration_frames * 0.6 * i) / n));
        return (
          <div key={i} style={{...glass(), padding: wide ? "30px 44px" : "44px 48px", display: "flex", alignItems: "center", gap: 36, opacity: Math.min(s, 1), transform: `translateX(${(1 - Math.min(s, 1)) * -60}px)`}}>
            <div style={{width: 84, height: 84, borderRadius: 42, background: `${col}22`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none"}}><MarkIcon mark="check" color={col} size={52} /></div>
            <div style={{fontSize: fit(t, wide ? 64 : 70, 26, 44), fontWeight: 700, lineHeight: 1.15}}>{t}</div>
          </div>
        );
      })}
    </Bg>
  );
};
