import type { Light } from "./trekker";

const RAD = Math.PI / 180;

export interface Grade {
  /** Sun altitude this grade was built for, in degrees. */
  alt: number;
  sky: string;
  horizon: string;
  fog: string;
  brightness: number;
  saturation: number;
  contrast: number;
  light: Light;
  /** Colour of the low-sun glow used while descending into a place. */
  glow: string;
}

/** Approximate solar azimuth (deg from north, clockwise) and altitude (deg) for a place and time. */
export function sunAt([lng, lat]: [number, number], date = new Date()): { az: number; alt: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86400000;
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (day - 81)) * RAD;
  const solar = ((date.getUTCHours() + date.getUTCMinutes() / 60 + lng / 15) % 24 + 24) % 24;
  const H = (solar - 12) * 15 * RAD;
  const phi = lat * RAD;
  const sinAlt = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / RAD + 180;
  return { az: (az + 360) % 360, alt: alt / RAD };
}

type Key = Omit<Grade, "light" | "alt"> & { a: number; sun: string; sunI: number; hs: string; hg: string; hi: number };

/** Keyed by sun altitude: night, blue hour, golden hour, warm morning/evening, full day. */
const KEYS: Key[] = [
  { a: -14, sky: "#0b1730", horizon: "#273d63", fog: "#1d2c48", brightness: 0.6, saturation: -0.32, contrast: 0.1, sun: "#9db4e0", sunI: 0.7, hs: "#4b6593", hg: "#161b26", hi: 0.55, glow: "#4f6fa8" },
  { a: -4, sky: "#24395f", horizon: "#e39a7c", fog: "#86809a", brightness: 0.78, saturation: -0.18, contrast: 0.08, sun: "#ff9f72", sunI: 1.1, hs: "#8396c2", hg: "#3a3030", hi: 0.6, glow: "#ff8f6a" },
  { a: 4, sky: "#5a7db4", horizon: "#ffcb93", fog: "#e2bb94", brightness: 0.96, saturation: -0.02, contrast: 0.06, sun: "#ffb66e", sunI: 2.5, hs: "#b8c8e8", hg: "#6b4f35", hi: 0.7, glow: "#ffb874" },
  { a: 14, sky: "#5c89c5", horizon: "#f0dcc2", fog: "#cdc5bb", brightness: 1, saturation: -0.05, contrast: 0.05, sun: "#ffe3ba", sunI: 2.4, hs: "#cfdcf3", hg: "#6b5a40", hi: 0.75, glow: "#ffd7a3" },
  { a: 35, sky: "#5f8fc7", horizon: "#d7e3ee", fog: "#b7c8d8", brightness: 1, saturation: -0.08, contrast: 0.04, sun: "#fff3e0", sunI: 2.3, hs: "#d6e4ff", hg: "#6b5a40", hi: 0.8, glow: "#e8eef6" },
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) =>
  "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function gradeFor(ll: [number, number], date = new Date()): Grade {
  const { az, alt } = sunAt(ll, date);
  const a = Math.max(KEYS[0].a, Math.min(KEYS[KEYS.length - 1].a, alt));
  let i = 0;
  while (i < KEYS.length - 2 && a > KEYS[i + 1].a) i++;
  const k0 = KEYS[i], k1 = KEYS[i + 1];
  const t = (a - k0.a) / (k1.a - k0.a);
  return {
    alt,
    sky: mix(k0.sky, k1.sky, t),
    horizon: mix(k0.horizon, k1.horizon, t),
    fog: mix(k0.fog, k1.fog, t),
    brightness: lerp(k0.brightness, k1.brightness, t),
    saturation: lerp(k0.saturation, k1.saturation, t),
    contrast: lerp(k0.contrast, k1.contrast, t),
    glow: mix(k0.glow, k1.glow, t),
    light: {
      az: alt < -2 ? (az + 180) % 360 : az,
      alt: alt < -2 ? 38 : Math.max(alt, 5),
      sun: mix(k0.sun, k1.sun, t),
      sunI: lerp(k0.sunI, k1.sunI, t),
      sky: mix(k0.hs, k1.hs, t),
      ground: mix(k0.hg, k1.hg, t),
      hemiI: lerp(k0.hi, k1.hi, t),
    },
  };
}
