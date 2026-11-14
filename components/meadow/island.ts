// Island shape, baked ground map and blade planting. All CPU, all seeded.
import { rng as makeRng, fbm, vnoise, smooth, clamp01 } from "./noise";

export const EXTENT = 14.5;        // local domain is [-EXTENT, EXTENT]^2
export const RX = 9.0, RZ = 8.2;  // island radii before warping: a wide, roughly round blob seen from every side
export const GROUND_RES = 512;

// Blade types (must match grass.ts)
export const T_GRASS = 0, T_WISP = 1, T_RED = 2, T_CHIP = 3, T_STEM = 4, T_SEED = 5;

// m > 0 inside, ~1 at the centre, 0 at the coast.
export function islandMask(x: number, z: number): number {
  const bound = Math.min(EXTENT - 1.0 - Math.abs(x), EXTENT - 1.0 - Math.abs(z)) * 0.4; // stay inside the baked domain
  x += 0.4; z += 0.4;   // recentre the warped outline on the turntable axis
  const wx = fbm(x * 0.085 + 3.1, z * 0.085 - 1.7, 3, 101) - 0.5;
  const wz = fbm(x * 0.085 - 5.3, z * 0.085 + 2.9, 3, 202) - 0.5;
  const nx = x / RX + wx * 0.5;
  const nz = z / RZ + wz * 0.5;
  const r = Math.hypot(nx, nz);
  const a = Math.atan2(nz, nx), ca = Math.cos(a), sa = Math.sin(a);
  const lobes = 0.11 * Math.sin(5 * a + 0.7) + 0.06 * Math.sin(3 * a + 2.4) + 0.045 * Math.sin(7 * a + 1.9) + 0.03 * Math.sin(11 * a + 0.3);
  const fine = (fbm(x * 0.42, z * 0.42, 3, 303) - 0.5) * 0.34;
  // spiky fingers and spits along the whole shore (seamless around the circle)
  const spikes = Math.pow(vnoise(ca * 3.4 + 40.0, sa * 3.4 + 40.0, 404), 3.0) * 0.3 - 0.04
    + Math.pow(vnoise(ca * 9.0 + 7.0, sa * 9.0 + 7.0, 414), 4.0) * 0.18;
  return Math.min(1 + lobes + fine + spikes - r, bound);
}

export const MOUND = 1.0;          // terrain height at the centre; must match the shaders in grass.ts
// Large soft patches (2-4 of each across the island): olive-light, blue-green hollow, tan/dry. 0..1 each.
export function zoneAt(x: number, z: number): [number, number, number] {
  const light = smooth(0.5, 0.64, fbm(x * 0.085 + 11.0, z * 0.085 - 4.0, 3, 601));
  const cool = smooth(0.52, 0.66, fbm(x * 0.085 - 7.0, z * 0.085 + 9.0, 3, 602)) * (1 - light * 0.8);
  const tan = smooth(0.56, 0.68, fbm(x * 0.11 + 3.0, z * 0.11 + 13.0, 3, 603)) * (1 - cool);
  return [light, cool, tan];
}
export const ZONE_RES = 128;

// Red-orange grows in many small clusters scattered over the field; 1 at a cluster's heart, 0 between them.
const RED_CLUSTERS = (() => {
  const R = makeRng(7177), out: [number, number, number][] = [];
  for (let c = 0; c < 24; c++) {
    const a = R() * Math.PI * 2, r = 0.15 + 0.72 * Math.sqrt(R());
    out.push([Math.cos(a) * RX * r, Math.sin(a) * RZ * r, 0.45 + 0.5 * R()]);
  }
  return out;
})();
export function redZoneAt(x: number, z: number): number {
  let v = 0;
  for (const [cx, cz, cr] of RED_CLUSTERS) v = Math.max(v, 1 - smooth(0.25 * cr, cr, Math.hypot(x - cx, z - cz)));
  return v;
}

export const groundHeight = (m: number): number => MOUND * smooth(0.0, 1.0, m);

// RGBA: R tone (dark..light), G dryness, B grass-height factor, A mask encoded (m + 0.25) / 1.25
export interface Ground { data: Uint8Array; mask: Float32Array; hgt: Float32Array; zone: Uint8Array }
export interface Plant { count: number; root: Float32Array; shape: Float32Array; lean: Float32Array; heads: number[] }
interface ClumpOpts {
  type?: number; count: [number, number]; radius: [number, number]; height: [number, number]; width: [number, number];
  prof: [number, number]; flex: [number, number]; lean0: number; leanSpread: number; clumpTone: number; toneVar: number;
  toneBias?: number; dry?: [number, number];
}
type Accept = (m: number, x: number, z: number) => number;

export function bakeGround(): Ground {
  const N = GROUND_RES;
  const data = new Uint8Array(N * N * 4);
  const mask = new Float32Array(N * N);
  const hgt = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    const z = ((j + 0.5) / N * 2 - 1) * EXTENT;
    for (let i = 0; i < N; i++) {
      const x = ((i + 0.5) / N * 2 - 1) * EXTENT;
      const m = islandMask(x, z);
      const k = j * N + i;
      mask[k] = m;
      let tone = 0.5 + (fbm(x * 0.13 + 9.0, z * 0.13, 4, 11) - 0.5) * 1.8 + (fbm(x * 0.6, z * 0.6, 3, 12) - 0.5) * 1.9;
      tone -= smooth(0.55, 0.75, fbm(x * 0.33 - 2.0, z * 0.33 + 5.0, 3, 13)) * 0.35;   // dark hollows
      const [zl, zc, zt] = zoneAt(x, z);
      tone += zl * 0.3 - zc * 0.36;
      const dry = smooth(0.6, 0.8, fbm(x * 0.2 - 4.0, z * 0.2 + 1.0, 3, 21)) * 0.4 + zt * 0.28 + smooth(0.25, 0.0, m) * 0.15;
      const h = clamp01(0.5 + (fbm(x * 0.1 + 7.0, z * 0.1, 3, 31) - 0.5) * 1.7 + (fbm(x * 0.5, z * 0.5, 2, 32) - 0.5) * 0.7);
      hgt[k] = h;
      data[k * 4] = Math.round(clamp01(tone) * 255);
      data[k * 4 + 1] = Math.round(clamp01(dry) * 255);
      data[k * 4 + 2] = Math.round(h * 255);
      data[k * 4 + 3] = Math.round(clamp01((m + 0.25) / 1.25) * 255);
    }
  }
  const ZN = ZONE_RES, zone = new Uint8Array(ZN * ZN * 4);
  for (let j = 0; j < ZN; j++) {
    for (let i = 0; i < ZN; i++) {
      const zv = zoneAt(((i + 0.5) / ZN * 2 - 1) * EXTENT, ((j + 0.5) / ZN * 2 - 1) * EXTENT), k = (j * ZN + i) * 4;
      const xr = ((i + 0.5) / ZN * 2 - 1) * EXTENT, zr = ((j + 0.5) / ZN * 2 - 1) * EXTENT;
      zone[k] = Math.round(zv[0] * 255); zone[k + 1] = Math.round(zv[1] * 255); zone[k + 2] = Math.round(zv[2] * 255); zone[k + 3] = Math.round(redZoneAt(xr, zr) * 255);
    }
  }
  return { data, mask, hgt, zone };
}

function sampler(arr: Float32Array): (x: number, z: number) => number {
  const N = GROUND_RES;
  return (x: number, z: number) => {
    const fx = ((x / EXTENT) * 0.5 + 0.5) * N - 0.5, fz = ((z / EXTENT) * 0.5 + 0.5) * N - 0.5;
    const i = Math.max(0, Math.min(N - 2, Math.floor(fx))), j = Math.max(0, Math.min(N - 2, Math.floor(fz)));
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j));
    const a = arr[j * N + i], b = arr[j * N + i + 1], c = arr[(j + 1) * N + i], d = arr[(j + 1) * N + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export function plantIsland(seed: number, budget: number, ground: Ground): Plant {
  const R = makeRng(seed);
  const maskAt = sampler(ground.mask);
  const scale = budget / 160000;
  const cap = Math.ceil(budget * 1.15);
  const root = new Float32Array(cap * 4), shape = new Float32Array(cap * 4), lean = new Float32Array(cap * 4);
  const heads: number[] = [];
  let n = 0;
  const TAU = Math.PI * 2;
  const rr = (a: number, b: number) => a + (b - a) * R();

  const push = (x: number, z: number, type: number, h: number, w: number, prof: number, flex: number, la: number, lamt: number, tone: number, dry: number): number => {
    if (n >= cap) return -1;
    const k = n * 4;
    root[k] = x; root[k + 1] = z; root[k + 2] = R(); root[k + 3] = type;
    shape[k] = h; shape[k + 1] = w; shape[k + 2] = prof; shape[k + 3] = flex;
    lean[k] = la; lean[k + 1] = lamt; lean[k + 2] = tone; lean[k + 3] = dry;
    return n++;
  };

  const BX = RX * 1.42, BZ = RZ * 1.42;
  // rejection-sample a point whose mask passes accept(m, x, z)
  const pick = (accept: Accept, tries = 40): [number, number, number] | null => {
    for (let t = 0; t < tries; t++) {
      const x = (R() * 2 - 1) * BX, z = (R() * 2 - 1) * BZ;
      const m = maskAt(x, z);
      if (R() < accept(m, x, z)) return [x, z, m];
    }
    return null;
  };

  // A clump: blades fan outward from a centre, centre blades tallest.
  const clump = (cx: number, cz: number, o: ClumpOpts) => {
    const count = Math.round(rr(o.count[0], o.count[1]));
    const rad = rr(o.radius[0], o.radius[1]);
    const H = rr(o.height[0], o.height[1]);
    const v = R();
    const ctone = (R() - 0.5) * o.clumpTone + (o.toneBias || 0) + (o.dry ? 0 : v < 0.22 ? 0.12 : v > 0.8 ? -0.14 : 0);
    const cdry = o.dry ? rr(o.dry[0], o.dry[1]) : v < 0.22 ? rr(0.12, 0.3) : 0;
    for (let i = 0; i < count; i++) {
      const a = R() * TAU, r = rad * Math.sqrt(R());
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.85;
      const q = rad > 0 ? r / rad : 0;
      const la = a + (R() - 0.5) * 0.7;
      const lamt = o.lean0 + q * o.leanSpread + R() * 0.12;
      const h = H * (1 - 0.42 * q) * rr(0.72, 1.18);
      const wv = R() < 0.18 ? rr(1.3, 1.75) : rr(0.6, 1.1);
      push(x, z, o.type ?? T_GRASS, h, rr(o.width[0], o.width[1]) * wv, rr(o.prof[0], o.prof[1]), rr(o.flex[0], o.flex[1]),
        la, lamt, ctone + (R() - 0.5) * o.toneVar, Math.min(1, cdry + (R() - 0.5) * 0.12));
    }
  };

  // patchy coast: density near the shore is broken up by mid-frequency noise
  const coast = (m: number, x: number, z: number, a: number, b: number) => smooth(a, b, m + (vnoise(x * 1.6, z * 1.6, 515) - 0.5) * 0.34);

  // 1. filler: the low mat between clumps, broad flat strokes and a few narrow ones, kept dark
  const nFill = Math.round(15000 * scale);
  for (let i = 0; i < nFill; i++) {
    const p = pick((m, x, z) => coast(m, x, z, 0.06, 0.32));
    if (!p) continue;
    const leafy = R() < 0.82;
    const prof = leafy ? rr(1.8, 3.0) : rr(1.2, 1.7);
    push(p[0], p[1], T_GRASS, rr(0.55, 1.2), leafy ? rr(0.075, 0.13) : rr(0.045, 0.07), prof, rr(0.35, 0.6),
      R() * TAU, rr(0.35, 1.15), (R() - 0.5) * 0.5 - 0.1, 0);
  }

  // 2. low leafy puffs
  const nPuff = Math.round(5600 * scale);
  for (let i = 0; i < nPuff; i++) {
    const p = pick((m, x, z) => coast(m, x, z, 0.07, 0.34));
    if (!p) continue;
    clump(p[0], p[1], {
      count: [6, 12], radius: [0.08, 0.26], height: [0.65, 1.2], width: [0.08, 0.14], prof: [1.9, 3.2], flex: [0.3, 0.5],
      lean0: 0.25, leanSpread: 1.15, clumpTone: 1.3, toneVar: 0.14,
    });
  }

  // 3. tall fountain tufts: the clumps that give the mass its silhouette; light-topped, a third darker
  const nTuft = Math.round(2100 * scale);
  for (let i = 0; i < nTuft; i++) {
    const p = pick((m, x, z) => coast(m, x, z, 0.04, 0.22));
    if (!p) continue;
    clump(p[0], p[1], {
      count: [9, 16], radius: [0.1, 0.28], height: [1.3, 2.4], width: [0.07, 0.13], prof: [1.6, 2.6], flex: [0.55, 0.85],
      lean0: 0.32, leanSpread: 1.4, clumpTone: 1.3, toneVar: 0.14, toneBias: R() < 0.32 ? -0.22 : 0.14,
    });
  }

  // 3a. a few tall clumps that break the top line
  const nTall = Math.round(110 * scale);
  for (let i = 0; i < nTall; i++) {
    const p = pick((m) => smooth(0.12, 0.4, m));
    if (!p) continue;
    clump(p[0], p[1], {
      count: [10, 16], radius: [0.1, 0.24], height: [2.2, 3.0], width: [0.08, 0.14], prof: [1.6, 2.4], flex: [0.55, 0.85],
      lean0: 0.2, leanSpread: 1.1, clumpTone: 1.0, toneVar: 0.14, toneBias: R() < 0.5 ? -0.25 : 0.1,
    });
  }

  // 3b. bold dark fountains: broad leaves fanning hard from the root
  const nFount = Math.round(300 * scale);
  for (let i = 0; i < nFount; i++) {
    const p = pick((m, x, z) => coast(m, x, z, 0.04, 0.25));
    if (!p) continue;
    clump(p[0], p[1], {
      count: [10, 18], radius: [0.06, 0.16], height: [1.5, 2.5], width: [0.08, 0.14], prof: [1.6, 2.6], flex: [0.45, 0.7],
      lean0: 0.2, leanSpread: 1.3, clumpTone: 0.3, toneVar: 0.22, toneBias: -0.3,
    });
  }

  // 4. dry khaki clumps
  const nDry = Math.round(900 * scale);
  for (let i = 0; i < nDry; i++) {
    const p = pick((m, x, z) => coast(m, x, z, 0.06, 0.32) * (0.15 + 0.85 * zoneAt(x, z)[2]));
    if (!p) continue;
    clump(p[0], p[1], {
      count: [7, 13], radius: [0.07, 0.18], height: [0.9, 1.7], width: [0.07, 0.13], prof: [1.7, 3.0], flex: [0.4, 0.7],
      lean0: 0.18, leanSpread: 0.85, clumpTone: 0.4, toneVar: 0.3, dry: [0.55, 0.85],
    });
  }

  // 4b. a few pale straw tufts: thin, light, a little taller than the mass
  const nStraw = Math.round(170 * scale);
  for (let i = 0; i < nStraw; i++) {
    const p = pick((m) => smooth(0.1, 0.4, m));
    if (!p) continue;
    clump(p[0], p[1], {
      count: [6, 11], radius: [0.05, 0.12], height: [1.0, 1.6], width: [0.05, 0.09], prof: [1.1, 1.6], flex: [0.8, 1.1],
      lean0: 0.1, leanSpread: 0.75, clumpTone: 0.3, toneVar: 0.2, toneBias: 0.3, dry: [0.85, 1.0],
    });
  }

  // 5. red-orange in 7 clusters spread around the island (most ground between them has none): dense tufts
  //    whose broad upper strokes sit on the clump crowns and faces, a few taller leaves, and low dabs/smears
  const redZone = redZoneAt;
  const redField = (m: number, x: number, z: number) => smooth(0.04, 0.2, m) * redZone(x, z);
  const nRed = Math.round(110 * scale);
  for (let i = 0; i < nRed; i++) {
    const p = pick(redField, 80);
    if (!p) continue;
    const tall = R() < 0.1;
    clump(p[0], p[1], {
      type: T_RED, count: [4, 8], radius: [0.05, 0.14], height: tall ? [1.8, 2.6] : [1.1, 1.8], width: [0.11, 0.19], prof: [1.3, 2.0], flex: [0.5, 0.8],
      lean0: tall ? 0.2 : 0.55, leanSpread: 0.9, clumpTone: 0.6, toneVar: 0.4,
    });
  }
  const nDab = Math.round(1300 * scale);
  for (let i = 0; i < nDab; i++) {
    const p = pick((m, x, z) => smooth(0.0, 0.05, m) * redZone(x, z), 60);
    if (!p) continue;
    // a smear: 2-6 broad dabs lying side by side in one direction
    const g = Math.round(rr(2, 6.4));
    const la = R() * TAU, ca = Math.cos(la + Math.PI / 2), sa = Math.sin(la + Math.PI / 2);
    for (let k = 0; k < g; k++) {
      const o = (k - g / 2) * rr(0.05, 0.09);
      push(p[0] + ca * o + (R() - 0.5) * 0.06, p[1] + sa * o + (R() - 0.5) * 0.06, T_RED, rr(0.18, 0.5), rr(0.1, 0.2), rr(1.6, 2.4), rr(0.1, 0.25),
        la + (R() - 0.5) * 0.35, rr(0.9, 1.35), (R() - 0.5) * 0.7, 0);
    }
  }

  // 5b. single red strokes scattered over the field at crown height (a few broad areas stay clear)
  const nScatter = Math.round(900 * scale);
  for (let i = 0; i < nScatter; i++) {
    const p = pick((m, x, z) => smooth(0.06, 0.25, m) * smooth(0.4, 0.5, fbm(x * 0.16 - 6.0, z * 0.16 + 2.0, 2, 79)));
    if (!p) continue;
    const g = R() < 0.35 ? 2 : 1;
    for (let k = 0; k < g; k++) {
      push(p[0] + (R() - 0.5) * 0.08, p[1] + (R() - 0.5) * 0.08, T_RED, rr(0.9, 1.6), rr(0.1, 0.18), rr(1.4, 2.0), rr(0.5, 0.8),
        R() * TAU, rr(0.45, 1.0), (R() - 0.5) * 0.7, 0);
    }
  }

  // 5c. broad leafy strokes: wide, short, darker, fanned low like foreground clumps
  const nBroad = Math.round(900 * scale);
  for (let i = 0; i < nBroad; i++) {
    const p = pick((m, x, z) => coast(m, x, z, 0.05, 0.25));
    if (!p) continue;
    clump(p[0], p[1], {
      count: [4, 8], radius: [0.05, 0.14], height: [0.5, 0.95], width: [0.18, 0.3], prof: [2.4, 3.2], flex: [0.25, 0.45],
      lean0: 0.45, leanSpread: 0.9, clumpTone: 0.4, toneVar: 0.12, toneBias: -0.45,
    });
  }

  // 6. sparse tall thin wisps that stick out above the mass
  const nWisp = Math.round(115 * scale);
  for (let i = 0; i < nWisp; i++) {
    const p = pick((m) => smooth(0.12, 0.6, m));
    if (!p) continue;
    const g = Math.round(rr(1, 2.6));
    const H = rr(2.5, 4.8) * (0.6 + 0.4 * smooth(0.1, 0.7, p[2]));
    const baseLean = R() * TAU;
    for (let k = 0; k < g; k++) {
      push(p[0] + (R() - 0.5) * 0.12, p[1] + (R() - 0.5) * 0.1, R() < 0.35 ? T_SEED : T_WISP, H * rr(0.75, 1.1), rr(0.011, 0.02), rr(0.7, 1.05), rr(1.2, 1.6),
        baseLean + (R() - 0.5) * 1.2, rr(0.18, 0.65), (R() - 0.5) * 0.6, rr(0.0, 0.5));
    }
  }

  // 7. a ragged rim: flat chips in a broken band, loose flakes scattered onto the paper in clusters,
  //    and long dry-brush streaks lying along the shore
  const shoreNoise = (x: number, z: number) => vnoise(x * 2.6, z * 2.6, 909) * 0.6 + vnoise(x * 7.0, z * 7.0, 919) * 0.4;
  const nChip = Math.round(8600 * scale);
  for (let i = 0; i < nChip; i++) {
    const p = pick((m, x, z) => {
      if (m > 0.18) return 0;
      const hf = shoreNoise(x, z);
      if (m >= 0) return 0.65 * (1 - smooth(0.0, 0.18, m)) * (hf > 0.38 ? 1 : 0.3);
      return 0.7 * smooth(-0.24, 0.0, m + (hf - 0.55) * 0.3) * (hf > 0.55 ? 1 : 0.08);
    });
    if (!p) continue;
    const outside = p[2] < 0;
    const g = R() < (outside ? 0.35 : 0.55) ? Math.round(rr(2, outside ? 4 : 5)) : 1;
    const red = R() < 0.3 * redZone(p[0], p[1]);
    const inner = p[2] > 0.06;
    const la = R() * TAU;
    for (let k = 0; k < g; k++) {
      push(p[0] + (R() - 0.5) * 0.24, p[1] + (R() - 0.5) * 0.24, red ? T_RED : T_CHIP,
        inner ? rr(0.16, 0.32) : outside ? rr(0.08, 0.26) : rr(0.12, 0.3), (outside ? rr(0.03, 0.06) : rr(0.035, 0.07)) * (R() < 0.2 ? 1.6 : 1), rr(1.1, 1.6), rr(0.08, 0.18),
        la + (R() - 0.5) * 0.8, inner ? rr(1.0, 1.35) : rr(1.25, 1.48),
        (R() - 0.5) * 0.9 + (outside ? -0.05 : -0.2), R() < (outside ? 0.18 : 0.08) ? rr(0.3, 0.6) : 0);
    }
  }
  const nStreak = Math.round(1300 * scale);
  for (let i = 0; i < nStreak; i++) {
    const p = pick((m, x, z) => (m > -0.12 && m < 0.1 ? 0.8 : 0) * (shoreNoise(x, z) > 0.45 ? 1 : 0.25));
    if (!p) continue;
    const la = R() * TAU;
    const g = Math.round(rr(1, 3.4));
    for (let k = 0; k < g; k++) {
      push(p[0] + (R() - 0.5) * 0.1, p[1] + (R() - 0.5) * 0.1, T_CHIP, rr(0.3, 0.7), rr(0.022, 0.045), rr(1.0, 1.3), rr(0.05, 0.12),
        la + (R() - 0.5) * 0.25, rr(1.38, 1.52), (R() - 0.5) * 0.6 + 0.05, R() < 0.45 ? rr(0.35, 0.75) : 0);
    }
  }

  // 8. tiny blossoms on thin stems (stem is a blade; the head is drawn at its tip)
  const nBloom = Math.round(60 * scale);
  for (let i = 0; i < nBloom; i++) {
    const p = pick((m) => smooth(0.08, 0.35, m));
    if (!p) continue;
    const idx = push(p[0], p[1], T_STEM, rr(0.8, 1.45), 0.02, 0.9, rr(0.6, 0.9), R() * TAU, rr(0.05, 0.35), 0, 0);
    if (idx < 0) break;
    const v = R();
    heads.push(idx, v < 0.6 ? 0 : v < 0.88 ? 1 : 2, rr(1.05, 1.5));
  }

  return {
    count: n,
    root: root.subarray(0, n * 4), shape: shape.subarray(0, n * 4), lean: lean.subarray(0, n * 4),
    heads,
  };
}
