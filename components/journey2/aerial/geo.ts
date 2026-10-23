import type { LL } from "../contracts";

export const RAD = Math.PI / 180;
export const R_EARTH = 6371008.8;
/** Terrain exaggeration of the rendered DEM; every altitude in this module is in rendered metres. */
export const EXAG = 1.2;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const smoother = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10));
export const shortest = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;
export const wrap360 = (a: number) => ((a % 360) + 360) % 360;

export function distM(a: LL, b: LL): number {
  const dLat = (b[1] - a[1]) * RAD, dLng = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingTo(a: LL, b: LL): number {
  const f1 = a[1] * RAD, f2 = b[1] * RAD, dl = (b[0] - a[0]) * RAD;
  return wrap360(Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) / RAD);
}

/** Local tangent plane around `o`: x east, z south (metres), the same frame as the location scenes. */
export function toXZ(o: LL, p: LL): [number, number] {
  return [(p[0] - o[0]) * RAD * R_EARTH * Math.cos(o[1] * RAD), -(p[1] - o[1]) * RAD * R_EARTH];
}

export function fromXZ(o: LL, x: number, z: number): LL {
  return [o[0] + x / (R_EARTH * Math.cos(o[1] * RAD)) / RAD, o[1] - z / R_EARTH / RAD];
}

/** Unit vector (x east, z south) for a compass bearing. */
export const dirXZ = (b: number): [number, number] => [Math.sin(b * RAD), -Math.cos(b * RAD)];
export const headingXZ = (x: number, z: number) => wrap360(Math.atan2(x, -z) / RAD);

/** Unit vector toward a sky direction given azimuth (clockwise from north) and elevation: x east, y up, z south. */
export function skyDir(azDeg: number, elDeg: number): [number, number, number] {
  const a = azDeg * RAD, e = elDeg * RAD;
  return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)];
}

/** Slippy-map tile coordinates (fractional) for a point. */
export function tileXY(ll: LL, z: number): [number, number] {
  const n = 2 ** z, lat = ll[1] * RAD;
  return [((ll[0] + 180) / 360) * n, ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n];
}

export const tileLng = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
export const tileLat = (y: number, z: number) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) / RAD;

/** Deterministic hash noise in [0, 1). */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1;
}

export const CIRCUMFERENCE = 2 * Math.PI * R_EARTH;
const mercX = (lng: number) => (lng + 180) / 360;
const mercY = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / Math.PI) / 2;

/** Metres in the frame of MapLibre's getMatrixForModel(o): exact in mercator, so far points land where the map draws them. */
export function mercLocal(o: LL, p: LL): [number, number] {
  const k = CIRCUMFERENCE * Math.cos(o[1] * RAD);
  return [(mercX(p[0]) - mercX(o[0])) * k, (mercY(p[1]) - mercY(o[1])) * k];
}
