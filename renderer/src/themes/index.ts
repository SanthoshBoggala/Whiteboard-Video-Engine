import {loadFont} from "@remotion/fonts";
import {staticFile} from "remotion";
import type {Accent, ThemeName} from "../types";

// Fonts are bundled in public/fonts (no network needed at render time).
const face = (family: string, file: string, weight: string) => loadFont({family, url: staticFile(`fonts/${file}`), weight});
face("Architects Daughter", "architects-daughter-latin-400-normal.woff2", "400");
face("Inter", "inter-latin-400-normal.woff2", "400");
face("Inter", "inter-latin-700-normal.woff2", "700");
face("Bebas Neue", "bebas-neue-latin-400-normal.woff2", "400");
const arch = "'Architects Daughter', cursive", inter = "Inter, sans-serif", bebas = "'Bebas Neue', sans-serif";

export type Theme = {
  name: ThemeName;
  bg: string;
  ink: string;
  accent: Record<Accent, string>;
  heading: string;
  body: string;
  upper: boolean; // all-caps headings
  rough: number; // rough.js roughness (0.3 = near clean)
  stroke: number;
};

const accent = {blue: "#2563EB", green: "#16A34A", red: "#DC2626"};

export const THEMES: Record<ThemeName, Theme> = {
  whiteboard: {name: "whiteboard", bg: "#FAFAFA", ink: "#1E1E1E", accent, heading: arch, body: inter, upper: false, rough: 1.3, stroke: 5},
  shorts: {name: "shorts", bg: "#0A1428", ink: "#FFFFFF", accent, heading: inter, body: inter, upper: false, rough: 0.3, stroke: 6},
  dark: {name: "dark", bg: "#0A1428", ink: "#FFFFFF", accent: {blue: "#4C8DF6", green: "#59D48C", red: "#F26B6B"}, heading: inter, body: inter, upper: false, rough: 0.3, stroke: 6},
  paper: {name: "paper", bg: "#EDEBDD", ink: "#15233F", accent: {blue: "#2B5FB8", green: "#2FA36B", red: "#C0392B"}, heading: inter, body: inter, upper: false, rough: 0.3, stroke: 6},
  papershorts: {name: "papershorts", bg: "#EDEBDD", ink: "#15233F", accent: {blue: "#2B5FB8", green: "#2FA36B", red: "#C0392B"}, heading: inter, body: inter, upper: false, rough: 0.3, stroke: 6},
  cartoon: {name: "cartoon", bg: "#F0DDB8", ink: "#1A1A1A", accent: {blue: "#4C7BD9", green: "#5BAA5B", red: "#D9534F"}, heading: inter, body: inter, upper: false, rough: 0.3, stroke: 6},
  illustrated: {name: "illustrated", bg: "#FFFFFF", ink: "#000000", accent, heading: bebas, body: bebas, upper: true, rough: 0.3, stroke: 6},
};
