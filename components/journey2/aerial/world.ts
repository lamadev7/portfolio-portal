import type { LL } from "../contracts";
import { NIGHT } from "../contracts";
import type { CloudSet, Glint, Puff } from "./fx";
import { EXAG, clamp, distM, hash, mercLocal, skyDir } from "./geo";
import type { Dem } from "./tiles";

/** Cloud decks where the night air really pools: the Mahabharat/Chure mid-hills and the south faces of the Himalaya (real metres ASL). */
const DECKS: Array<{ line: LL[]; width: number; base: number; top: number; cover: number }> = [
  { line: [[83.25, 27.98], [83.7, 27.88], [84.2, 27.72], [84.75, 27.56], [85.25, 27.47], [85.75, 27.38], [86.3, 27.25], [86.8, 27.18]], width: 34000, base: 1900, top: 2700, cover: 0.74 },
  { line: [[83.65, 28.42], [83.95, 28.46], [84.25, 28.45], [84.6, 28.42]], width: 16000, base: 4200, top: 5400, cover: 0.66 },
  { line: [[86.5, 27.72], [86.66, 27.84], [86.82, 27.94], [87.0, 28.0]], width: 18000, base: 4300, top: 5700, cover: 0.55 },
  { line: [[84.8, 28.15], [85.2, 28.12], [85.6, 28.1], [86.1, 27.98]], width: 16000, base: 4000, top: 5200, cover: 0.5 },
];

const MAX_PUFFS = 700;

/**
 * Moonlit cloud clusters near a leg: scenery along the decks within reach of the track, plus clusters placed right on
 * the track wherever the camera climbs or descends through a deck, so every leg over the ranges flies through cloud.
 */
export function cloudsFor(anchor: LL, track: Array<{ ll: LL; alt: number }>, dem: Dem): CloudSet {
  const moon = skyDir(NIGHT.moon.azimuthDeg, NIGHT.moon.elevationDeg);
  const clusters: Array<{ c: LL; y: number; rx: number; ry: number; seed: number; near: number }> = [];
  const nearTrack = (p: LL) => {
    let d = Infinity;
    for (let i = 0; i < track.length; i += 2) d = Math.min(d, distM(p, track[i].ll));
    return d;
  };
  DECKS.forEach((deck, di) => {
    for (let s = 0; s < deck.line.length - 1; s++) {
      const a = deck.line[s], b = deck.line[s + 1];
      const L = distM(a, b), n = Math.ceil(L / 3800);
      for (let i = 0; i < n; i++)
        for (let row = -1; row <= 1; row++) {
          const seed = di * 1000 + s * 100 + i * 3 + row + 7;
          if (hash(seed) > deck.cover) continue;
          const t = (i + hash(seed * 1.3)) / n;
          const dx = b[0] - a[0], dy = b[1] - a[1], nl = Math.hypot(dx, dy) || 1;
          const off = (row * 0.33 + (hash(seed * 2.1) - 0.5) * 0.25) * deck.width / 111000;
          const c: LL = [a[0] + dx * t - (dy / nl) * off, a[1] + dy * t + (dx / nl) * off];
          const near = nearTrack(c);
          if (near > 55000) continue;
          const y = (deck.base + (deck.top - deck.base) * (0.3 + 0.5 * hash(seed * 3.7))) * EXAG;
          clusters.push({ c, y, rx: 1500 + hash(seed * 4.1) * 1300, ry: 220 + hash(seed * 5.3) * 220, seed, near });
        }
    }
    let lastHit = -99, hits = 0;
    for (let i = 3; i < track.length - 2 && hits < 2; i++) {
      const p = track[i];
      if (i - lastHit < 7 || p.alt < deck.base * EXAG) continue;
      let dd = Infinity;
      for (let s = 0; s < deck.line.length - 1; s++) dd = Math.min(dd, segDist(p.ll, deck.line[s], deck.line[s + 1]));
      if (dd > deck.width * 0.5) continue;
      lastHit = i;
      hits++;
      const y = p.alt <= deck.top * EXAG ? ((deck.base + deck.top) / 2) * EXAG : p.alt - 120;
      const rx = clamp((p.alt - deck.base * EXAG) * 0.45, 1600, 5200);
      for (let k = 0; k < 3; k++) {
        const seed = 5000 + di * 97 + i * 7 + k;
        const c: LL = [p.ll[0] + (hash(seed) - 0.5) * rx / 70000, p.ll[1] + (hash(seed * 1.7) - 0.5) * rx / 80000];
        clusters.push({ c, y: y + (hash(seed * 2.3) - 0.5) * rx * 0.08, rx: rx * (0.7 + hash(seed * 3.1) * 0.5), ry: rx * 0.16, seed, near: -1 });
      }
    }
  });
  clusters.sort((a, b) => a.near - b.near);
  const puffs: Puff[] = [];
  const cells: CloudSet["cells"] = [];
  for (const k of clusters) {
    const g = dem.ground(k.c, 9);
    if (g != null && k.y - k.ry < g + 120) k.y = g + 120 + k.ry;
    const n = 9 + Math.floor(hash(k.seed * 6.1) * 7);
    if (puffs.length + n > MAX_PUFFS) break;
    const [cx, cz] = mercLocal(anchor, k.c);
    cells.push({ p: [cx, k.y, cz], r: k.rx * 0.95, h: k.ry * 1.5, d: 0.95 });
    for (let j = 0; j < n; j++) {
      const s = k.seed * 13.7 + j * 1.91;
      const a = hash(s) * Math.PI * 2, r = Math.sqrt(hash(s * 1.3)) * 0.85;
      const ox = Math.cos(a) * r, oz = Math.sin(a) * r, oy = (hash(s * 2.9) - 0.4) * 0.9;
      const lit = clamp(0.32 + 0.38 * oy + 0.32 * (ox * moon[0] + oz * moon[2]) / Math.max(0.3, Math.hypot(ox, oz)), 0.08, 1);
      puffs.push({ p: [cx + ox * k.rx, k.y + oy * k.ry, cz + oz * k.rx], size: (0.85 + hash(s * 3.3) * 0.7) * k.rx * 0.85, shade: lit, seed: hash(s * 4.4) });
    }
  }
  return { anchor, puffs, cells };
}

function segDist(p: LL, a: LL, b: LL): number {
  const k = Math.cos(p[1] * Math.PI / 180) * 111320, m = 110540;
  const ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * m, bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * m;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  const t = clamp(-(ax * dx + ay * dy) / L, 0, 1);
  return Math.hypot(ax + dx * t, ay + dy * t);
}

type Water = { kind: "lake"; name: string; ring: LL[] } | { kind: "river"; name: string; width: number; line: LL[] };
let waterData: Promise<Water[]> | null = null;
const loadWater = () => (waterData ??= fetch("/aerial/water.json").then((r) => r.json() as Promise<Water[]>).catch(() => []));

/** Point-in-lake test over the shipped lake outlines, so no lamp floats on Phewa or Rani Pokhari. */
export async function onLake(): Promise<(p: LL) => boolean> {
  const lakes = (await loadWater()).flatMap((w) => (w.kind === "lake" ? [w.ring] : []));
  const boxes = lakes.map((r) => [Math.min(...r.map((p) => p[0])), Math.min(...r.map((p) => p[1])), Math.max(...r.map((p) => p[0])), Math.max(...r.map((p) => p[1]))]);
  return (p) =>
    lakes.some((r, k) => {
      const b = boxes[k];
      if (p[0] < b[0] || p[0] > b[2] || p[1] < b[1] || p[1] > b[3]) return false;
      let inside = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++)
        if (r[i][1] > p[1] !== r[j][1] > p[1] && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) inside = !inside;
      return inside;
    });
}

/** Lakes and rivers (OpenStreetMap, simplified) near a place, as flat triangles for the moon-glint pass. */
export async function waterNear(anchor: LL, radius: number, dem: Dem, triangulate: (ring: Array<[number, number]>) => number[][]): Promise<Glint | null> {
  const all = await loadWater();
  const pick = all.filter((w) => (w.kind === "lake" ? w.ring : w.line).some((p, i, arr) => i % 4 === 0 && distM(p, anchor) < radius) || distM((w.kind === "lake" ? w.ring : w.line)[0], anchor) < radius);
  if (!pick.length) return null;
  const pts = pick.flatMap((w) => (w.kind === "lake" ? w.ring : w.line).filter((_, i) => i % 3 === 0));
  await Promise.all([dem.ensure(pts, 12), dem.ensure(pts, 10)]);
  const out: number[] = [];
  const up = 2.5 * EXAG;
  for (const w of pick) {
    if (w.kind === "lake") {
      const loc = w.ring.map((p) => mercLocal(anchor, p));
      const hs = w.ring.filter((_, i) => i % 2 === 0).map((p) => dem.ground(p) ?? 0).sort((a, b) => a - b);
      const y = (hs[Math.floor(hs.length * 0.2)] ?? 0) + up;
      for (const [a, b, c] of triangulate(loc)) out.push(loc[a][0], y, loc[a][1], loc[b][0], y, loc[b][1], loc[c][0], y, loc[c][1]);
    } else {
      const loc = w.line.map((p) => mercLocal(anchor, p));
      const ys = w.line.map((p) => (dem.ground(p) ?? 0) + up + 1.5);
      for (let i = 0; i < ys.length; i++) {
        const lo = Math.max(0, i - 2), hi = Math.min(ys.length - 1, i + 2);
        let m = Infinity;
        for (let j = lo; j <= hi; j++) m = Math.min(m, ys[j]);
        ys[i] = m;
      }
      const hw = w.width / 2;
      for (let i = 0; i < loc.length - 1; i++) {
        const [ax, az] = loc[i], [bx, bz] = loc[i + 1];
        const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = (-dz / L) * hw, nz = (dx / L) * hw;
        const ya = ys[i], yb = ys[i + 1];
        out.push(ax - nx, ya, az - nz, ax + nx, ya, az + nz, bx + nx, yb, bz + nz, ax - nx, ya, az - nz, bx + nx, yb, bz + nz, bx - nx, yb, bz - nz);
      }
    }
  }
  return { anchor, tris: new Float32Array(out) };
}
