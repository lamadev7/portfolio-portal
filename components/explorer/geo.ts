type LngLat = [number, number];

const RAD = Math.PI / 180;

/** Points along the great circle from a to b, with longitudes unwrapped so the line never jumps across the antimeridian. */
export function greatCircle(a: LngLat, b: LngLat, steps = 96): LngLat[] {
  const toVec = ([lng, lat]: LngLat) => [Math.cos(lat * RAD) * Math.cos(lng * RAD), Math.cos(lat * RAD) * Math.sin(lng * RAD), Math.sin(lat * RAD)];
  const va = toVec(a), vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const w = Math.acos(dot);
  if (w < 1e-6) return [a, b];
  const sw = Math.sin(w);
  const out: LngLat[] = [];
  let prev = a[0];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k1 = Math.sin((1 - t) * w) / sw, k2 = Math.sin(t * w) / sw;
    const x = k1 * va[0] + k2 * vb[0], y = k1 * va[1] + k2 * vb[1], z = k1 * va[2] + k2 * vb[2];
    let lng = Math.atan2(y, x) / RAD;
    const lat = Math.atan2(z, Math.hypot(x, y)) / RAD;
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    prev = lng;
    out.push([lng, lat]);
  }
  return out;
}

export interface CamFrame {
  c: LngLat;
  z: number;
  p: number;
  b: number;
  e: number;
}

const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

/** Catmull-Rom camera path through the keyframes; s in [0, 1]. */
export function sampleFlight(frames: CamFrame[], s: number): CamFrame {
  const n = frames.length - 1;
  const x = Math.min(Math.max(s, 0), 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const t = x - i;
  const f = (k: number) => frames[Math.min(Math.max(k, 0), n)];
  const p0 = f(i - 1), p1 = f(i), p2 = f(i + 1), p3 = f(i + 2);
  return {
    c: [cr(p0.c[0], p1.c[0], p2.c[0], p3.c[0], t), cr(p0.c[1], p1.c[1], p2.c[1], p3.c[1], t)],
    z: cr(p0.z, p1.z, p2.z, p3.z, t),
    p: cr(p0.p, p1.p, p2.p, p3.p, t),
    b: cr(p0.b, p1.b, p2.b, p3.b, t),
    e: cr(p0.e, p1.e, p2.e, p3.e, t),
  };
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const fmtCoord = ([lng, lat]: LngLat) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
