import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SURF, blot, grain, rng } from './textures';
import { rbox, lathe } from './kit';
import type { OutfitName } from './types';

/* ==== a procedurally modelled, skinned human: 7.5 heads tall, one continuous skin per limb so knees and elbows bend smoothly,
   a sculpted head with hair, eyes and lids, hands with fingers, and clothing per chapter. Metres throughout; faces +z. ==== */

export interface BodySpec {
  height?: number; female?: boolean; teen?: boolean; build?: number;
  skin?: string; hair?: string; hairStyle?: 'short' | 'side' | 'long' | 'braid' | 'bun' | 'none';
  outfit: Outfit; seed?: number; lod?: 0 | 1 | 2;
}
export interface Outfit {
  top: 'tee' | 'shirt' | 'shirtShort' | 'hoodie' | 'sweater' | 'puffer' | 'kurta' | 'blouse' | 'vest';
  topC: string; low: 'trousers' | 'jeans' | 'skirt' | 'track' | 'cargo' | 'sari'; lowC: string; shoeC: string;
  shoe?: 'formal' | 'sneaker' | 'boot' | 'sandal'; sole?: string;
  tie?: string; collarC?: string; belt?: string; pack?: string; packBig?: boolean; gown?: boolean; stole?: [string, string];
  mortar?: boolean; beanie?: string; cap?: string; vestC?: string; rolled?: boolean; sariC?: string; dupatta?: string; laptop?: boolean;
}

export const OUTFITS: Record<OutfitName, Outfit> = {
  school: { top: 'shirtShort', topC: '#a9c8e6', low: 'trousers', lowC: '#1f2a4d', shoeC: '#18181a', shoe: 'formal', tie: '#6e1d2a', collarC: '#b9d3ec', belt: '#151515' },
  college: { top: 'hoodie', topC: '#5c6470', low: 'jeans', lowC: '#34507a', shoeC: '#e8e6e1', shoe: 'sneaker', sole: '#f4f2ee', pack: '#23272f' },
  home: { top: 'tee', topC: '#2b3445', low: 'track', lowC: '#1d1f24', shoeC: '#2a2a2c', shoe: 'sandal' },
  office: { top: 'shirt', topC: '#c9dcef', low: 'trousers', lowC: '#3a3f48', shoeC: '#4a2f1d', shoe: 'formal', collarC: '#d6e5f4', belt: '#2a1a10', rolled: true, laptop: true },
  gown: { top: 'shirt', topC: '#e8eef5', low: 'trousers', lowC: '#24262b', shoeC: '#141414', shoe: 'formal', gown: true, stole: ['#a3192c', '#d9a93a'], mortar: true, collarC: '#f0f3f7' },
  smart: { top: 'sweater', topC: '#253247', low: 'trousers', lowC: '#2f3238', shoeC: '#e9e7e2', shoe: 'sneaker', sole: '#f4f2ee', collarC: '#eef2f6' },
  trek: { top: 'puffer', topC: '#b8402e', low: 'cargo', lowC: '#2e3136', shoeC: '#4a3826', shoe: 'boot', sole: '#222', pack: '#2b5fa8', packBig: true, beanie: '#d9a52b' },
};

export const BONES = ['root', 'pelvis', 'spine', 'chest', 'neck', 'head', 'clavL', 'armL', 'foreL', 'handL', 'clavR', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'footL', 'toeL', 'thighR', 'shinR', 'footR', 'toeR'] as const;
export type BoneName = typeof BONES[number];
const PARENT: Record<BoneName, BoneName | null> = { root: null, pelvis: 'root', spine: 'pelvis', chest: 'spine', neck: 'chest', head: 'neck', clavL: 'chest', armL: 'clavL', foreL: 'armL', handL: 'foreL', clavR: 'chest', armR: 'clavR', foreR: 'armR', handR: 'foreR', thighL: 'pelvis', shinL: 'thighL', footL: 'shinL', toeL: 'footL', thighR: 'pelvis', shinR: 'thighR', footR: 'shinR', toeR: 'footR' };

export interface Dims { k: number; sw: number; hw: number; head: number; hipY: number; kneeY: number; ankY: number; shY: number; elY: number; wrY: number; thigh: number; shin: number; upper: number; fore: number; neckY: number; headY: number; chestY: number; spineY: number; pelvisY: number; foot: number }
export function dims(b: BodySpec): Dims {
  const H = b.height || (b.female ? 1.6 : 1.74), k = H / 1.74, f = b.female ? 1 : 0, teen = b.teen ? 1 : 0;
  const sw = (0.185 - 0.02 * f - 0.012 * teen) * k, hw = (0.092 + 0.006 * f) * k;
  const d: Dims = { k, sw, hw, head: (1 + 0.06 * teen + 0.03 * f) * k, pelvisY: 0.97 * k, spineY: 1.08 * k, chestY: 1.26 * k, neckY: 1.465 * k, headY: 1.548 * k, shY: 1.415 * k, elY: 1.11 * k, wrY: 0.86 * k, hipY: 0.94 * k, kneeY: 0.515 * k, ankY: 0.085 * k, thigh: 0, shin: 0, upper: 0, fore: 0, foot: 0.135 * k };
  d.thigh = d.hipY - d.kneeY; d.shin = d.kneeY - d.ankY; d.upper = d.shY - d.elY; d.fore = d.elY - d.wrY; return d;
}
function bindPos(d: Dims): Record<BoneName, [number, number, number]> {
  return {
    root: [0, 0, 0], pelvis: [0, d.pelvisY, 0], spine: [0, d.spineY, -0.01 * d.k], chest: [0, d.chestY, -0.01 * d.k], neck: [0, d.neckY, -0.015 * d.k], head: [0, d.headY, 0],
    clavL: [0.035 * d.k, d.shY + 0.015 * d.k, -0.01 * d.k], armL: [d.sw, d.shY, -0.02 * d.k], foreL: [d.sw, d.elY, -0.02 * d.k], handL: [d.sw, d.wrY, -0.02 * d.k],
    clavR: [-0.035 * d.k, d.shY + 0.015 * d.k, -0.01 * d.k], armR: [-d.sw, d.shY, -0.02 * d.k], foreR: [-d.sw, d.elY, -0.02 * d.k], handR: [-d.sw, d.wrY, -0.02 * d.k],
    thighL: [d.hw, d.hipY, 0], shinL: [d.hw, d.kneeY, 0], footL: [d.hw, d.ankY, 0], toeL: [d.hw, 0.025 * d.k, d.foot],
    thighR: [-d.hw, d.hipY, 0], shinR: [-d.hw, d.kneeY, 0], footR: [-d.hw, d.ankY, 0], toeR: [-d.hw, 0.025 * d.k, d.foot],
  };
}

/* ---- the skinned tube: key rings (height, centre, radii, bulges) are interpolated, swept round, and weighted to bones by height ---- */
interface Ring { y: number; rx: number; rz: number; cx?: number; cz?: number; f?: number; b?: number; o?: number }
type Weigh = (y: number) => [number, number][];
interface TubeOpt { seg?: number; sub?: number; n?: number; side?: number; capTop?: boolean; capBot?: boolean; wave?: (t: number, th: number) => number; uvU?: number }

function lerpRing(a: Ring, b: Ring, t: number, p: Ring, q: Ring): Ring {
  const cr = (k: keyof Ring) => { const p0 = (p[k] ?? 0) as number, p1 = (a[k] ?? 0) as number, p2 = (b[k] ?? 0) as number, p3 = (q[k] ?? 0) as number; const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  return { y: a.y + (b.y - a.y) * t, rx: Math.max(0.001, cr('rx')), rz: Math.max(0.001, cr('rz')), cx: cr('cx'), cz: cr('cz'), f: cr('f'), b: cr('b'), o: cr('o') };
}
export function skinTube(keys: Ring[], weigh: Weigh, o: TubeOpt = {}) {
  const seg = o.seg || 18, sub = o.sub ?? 2, n = o.n || 2, side = o.side || 1, rings: Ring[] = [];
  for (let i = 0; i < keys.length - 1; i++) { const p = keys[Math.max(0, i - 1)], q = keys[Math.min(keys.length - 1, i + 2)]; for (let s = 0; s <= sub; s++) { if (s === sub && i < keys.length - 2) continue; rings.push(lerpRing(keys[i], keys[i + 1], s / sub, p, q)); } }
  const pos: number[] = [], uv: number[] = [], si: number[] = [], sw: number[] = [], idx: number[] = [];
  const pushW = (y: number) => { const w = weigh(y).slice(0, 4); let tot = 0; w.forEach((x) => tot += x[1]); for (let k = 0; k < 4; k++) { si.push(w[k] ? w[k][0] : 0); sw.push(w[k] ? w[k][1] / tot : 0); } };
  let v = 0; const cols = seg + 1;
  rings.forEach((r, ri) => {
    if (ri) v += Math.hypot(r.y - rings[ri - 1].y, (r.rx - rings[ri - 1].rx));
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2, s = Math.sin(th), c = Math.cos(th), e = 2 / n;
      const sx = Math.sign(s) * Math.pow(Math.abs(s), e), cz = Math.sign(c) * Math.pow(Math.abs(c), e);
      let m = 1 + (r.f || 0) * Math.pow(Math.max(0, c), 2) + (r.b || 0) * Math.pow(Math.max(0, -c), 2) + (r.o || 0) * Math.pow(Math.max(0, s * side), 2);
      if (o.wave) m += o.wave(ri / (rings.length - 1), th);
      pos.push((r.cx || 0) + r.rx * sx * m, r.y, (r.cz || 0) + r.rz * cz * m);
      uv.push((j / seg) * (o.uvU || Math.PI * (r.rx + r.rz)), v); pushW(r.y);
    }
  });
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) { const a = i * cols + j, b = a + cols; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const pole = (ri: number, top: boolean) => {
    const r = rings[ri], pi = pos.length / 3; pos.push(r.cx || 0, r.y + (top ? 1 : -1) * Math.min(r.rx, r.rz) * 0.55, r.cz || 0); uv.push(0.5, top ? v + 0.02 : -0.02); pushW(r.y);
    for (let j = 0; j < seg; j++) { const a = ri * cols + j; if (top) idx.push(a, a + 1, pi); else idx.push(a + 1, a, pi); }
  };
  if (o.capTop !== false) pole(0, true); if (o.capBot !== false) pole(rings.length - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx);
  g.computeVertexNormals();
  const nr = g.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < rings.length; i++) { const a = i * cols, b = a + seg; const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b), l = Math.hypot(x, y, z) || 1; nr.setXYZ(a, x / l, y / l, z / l); nr.setXYZ(b, x / l, y / l, z / l); }
  return g;
}
const BI = (b: BoneName) => BONES.indexOf(b);
const blend = (y: number, hi: number, lo: number, a: BoneName, b: BoneName): [number, number][] => { if (y >= hi) return [[BI(a), 1]]; if (y <= lo) return [[BI(b), 1]]; const t = (y - lo) / (hi - lo), s = t * t * (3 - 2 * t); return [[BI(a), s], [BI(b), 1 - s]]; };

/* ---- body parts ---- */
function torsoRings(d: Dims, b: BodySpec, loose: number, from = 0, to = 9): Ring[] {
  const k = d.k, f = b.female ? 1 : 0, bw = 1 + 0.08 * ((b.build ?? 0.5) - 0.5), w = (x: number) => x * k * bw;
  const R: Ring[] = [
    { y: 0.845 * k, rx: w(0.06), rz: w(0.05), cz: -0.005 * k },
    { y: 0.875 * k, rx: w(0.135 + 0.012 * f), rz: w(0.095), cz: -0.008 * k },
    { y: 0.93 * k, rx: w(0.168 + 0.015 * f), rz: w(0.112), cz: -0.012 * k, b: 0.16 },
    { y: 1.0 * k, rx: w(0.163 + 0.012 * f), rz: w(0.108), cz: -0.01 * k, b: 0.08 },
    { y: 1.08 * k, rx: w(0.146 - 0.012 * f), rz: w(0.1), cz: -0.004 * k },
    { y: 1.16 * k, rx: w(0.152 - 0.01 * f), rz: w(0.104), cz: 0, f: 0.03 },
    { y: 1.24 * k, rx: w(0.164 - 0.012 * f), rz: w(0.112), cz: 0.002 * k, f: 0.06 + 0.12 * f },
    { y: 1.31 * k, rx: w(0.173 - 0.018 * f), rz: w(0.115), cz: 0.0, f: 0.06 + 0.1 * f },
    { y: 1.37 * k, rx: w(0.176 - 0.02 * f), rz: w(0.106), cz: -0.006 * k },
    { y: 1.405 * k, rx: w(0.172 - 0.02 * f), rz: w(0.092), cz: -0.01 * k },
    { y: 1.438 * k, rx: w(0.135 - 0.02 * f), rz: w(0.078), cz: -0.012 * k },
    { y: 1.458 * k, rx: w(0.095), rz: w(0.066), cz: -0.012 * k },
    { y: 1.475 * k, rx: w(0.058), rz: w(0.054), cz: -0.012 * k },
  ];
  return R.slice(from, to + 4).map((r) => ({ ...r, rx: r.rx + loose, rz: r.rz + loose * 0.9 }));
}
const torsoW = (d: Dims): Weigh => (y) => y > d.chestY - 0.02 ? blend(y, d.chestY + 0.06, d.chestY - 0.03, 'chest', 'spine') : blend(y, d.spineY + 0.02, d.pelvisY - 0.01, 'spine', 'pelvis');

function legRings(d: Dims, side: number, garment: 'bare' | 'trousers' | 'jeans' | 'track' | 'cargo' | 'skirt'): Ring[] {
  const k = d.k, x = side * d.hw, g = garment;
  const base: [number, number, number, number, number][] = [
    [1.0, 0.055, 0.06, 0, 0], [0.965, 0.086, 0.092, 0.02, 0.06], [0.9, 0.084, 0.09, 0.05, 0.04], [0.79, 0.074, 0.078, 0.06, 0], [0.67, 0.064, 0.066, 0.05, 0],
    [0.575, 0.055, 0.056, 0.03, 0], [0.515, 0.052, 0.052, 0.05, 0], [0.455, 0.05, 0.051, 0, 0.06], [0.39, 0.05, 0.054, 0, 0.14], [0.3, 0.044, 0.047, 0, 0.08],
    [0.2, 0.035, 0.037, 0, 0.02], [0.12, 0.031, 0.034, 0, 0], [0.085, 0.031, 0.035, 0, 0.02]];
  const minR = g === 'trousers' ? 0.061 : g === 'jeans' ? 0.05 : g === 'track' ? 0.056 : g === 'cargo' ? 0.064 : 0, add = g === 'bare' ? 0 : g === 'jeans' ? 0.006 : 0.011;
  return base.map(([y, rx, rz, f, b]) => {
    const below = y < 0.62 ? 1 : 0, mr = minR * (0.85 + 0.15 * (1 - below)), cuff = g !== 'bare' && y < 0.11;
    let RX = rx + add, RZ = rz + add; if (g !== 'bare') { RX = Math.max(RX, mr); RZ = Math.max(RZ, mr * 1.05); if (cuff) { RX = Math.max(RX, mr * 0.95); RZ = Math.max(RZ, mr); } }
    if (g === 'track' && y < 0.12) { RX = 0.034; RZ = 0.038; }
    return { y: y * k, rx: RX * k, rz: RZ * k, cx: x + side * (y > 0.85 ? 0.004 : 0) * k, cz: (y < 0.2 ? 0.006 : 0) * k, f: g === 'bare' ? f : f * 0.4, b: g === 'bare' ? b : b * 0.35 };
  });
}
const legW = (d: Dims, s: 'L' | 'R'): Weigh => (y) => { if (y > d.hipY - 0.01) { const t = Math.min(1, (y - d.hipY + 0.01) / 0.06); return [[BI(('thigh' + s) as BoneName), 1 - 0.45 * t], [BI('pelvis'), 0.45 * t]]; } return blend(y, d.kneeY + 0.045, d.kneeY - 0.04, ('thigh' + s) as BoneName, ('shin' + s) as BoneName); };

function armRings(d: Dims, side: number, sleeve: number, to: number, bell = 0): Ring[] {
  const k = d.k, x = side * d.sw;
  const base: [number, number, number, number, number][] = [
    [1.428, 0.024, 0.03, 0, 0], [1.412, 0.045, 0.049, 0, 0], [1.37, 0.049, 0.052, 0.04, 0.02], [1.31, 0.044, 0.046, 0.08, 0], [1.21, 0.04, 0.041, 0.03, 0.04],
    [1.13, 0.036, 0.037, 0, 0.06], [1.06, 0.04, 0.038, 0.02, 0.02], [0.98, 0.035, 0.031, 0, 0], [0.905, 0.028, 0.022, 0, 0], [0.87, 0.027, 0.02, 0, 0]];
  return base.filter((r) => r[0] * k >= to - 1e-6).map(([y, rx, rz, f, b]) => {
    const t = Math.max(0, (1.3 - y) / 0.43), bl = bell * t * t;
    return { y: y * k, rx: (rx + sleeve + bl) * k, rz: (rz + sleeve * 1.1 + bl) * k, cx: x - side * 0.012 * k * smt(1.36, 1.44, y), cz: -0.02 * k + (y < 1.0 ? 0.004 : 0) * k, f, b, o: 0 };
  });
}
const armW = (d: Dims, s: 'L' | 'R'): Weigh => (y) => { if (y > d.shY + 0.015) { const t = Math.min(1, (y - d.shY - 0.015) / 0.04); return [[BI(('arm' + s) as BoneName), 1 - 0.5 * t], [BI('chest'), 0.5 * t]]; } return blend(y, d.elY + 0.035, d.elY - 0.035, ('arm' + s) as BoneName, ('fore' + s) as BoneName); };

/* ==== the head: an implicit surface in centimetres (x to his left, y up, z forward, origin mid-skull). Rays from the centre, packed tightest
   across the face, find the surface; the ray grid's uv carries the hero's painted skin, and the crowd's faces are painted into vertex colours. ==== */
const smt = (a: number, b2: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b2 - a))); return t * t * (3 - 2 * t); };
const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const g1 = (d: number, r: number) => Math.exp(-(d * d) / (r * r));
const g2 = (x: number, y: number, rx: number, ry: number) => Math.exp(-(x * x) / (rx * rx) - (y * y) / (ry * ry));
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);
function ell(x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) {
  const X = (x - cx) / rx, Y = (y - cy) / ry, Z = (z - cz) / rz, k0 = Math.sqrt(X * X + Y * Y + Z * Z), k1 = Math.sqrt((X * X) / (rx * rx) + (Y * Y) / (ry * ry) + (Z * Z) / (rz * rz));
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
function capsule(x: number, y: number, z: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number) {
  const px = x - ax, py = y - ay, pz = z - az, dx = bx - ax, dy = by - ay, dz = bz - az, t = c01((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz));
  return Math.hypot(px - dx * t, py - dy * t, pz - dz * t) - r;
}
const seg2 = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => { const dx = bx - ax, dy = by - ay, t = c01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); };

/* the midline profile, height → depth, before the nose, lips and chin are added */
const PROF = [[12, 3], [8, 7.5], [5, 8.6], [2.5, 8.95], [1, 9.0], [-0.5, 8.65], [-3, 8.65], [-5.0, 9.1], [-7.0, 9.05], [-8.7, 8.7], [-10.2, 8.3], [-11.3, 7.0], [-13, 4]];
function prof(y: number) {
  let i = 0; while (i < PROF.length - 2 && y < PROF[i + 1][0]) i++;
  const q = (k: number) => PROF[Math.max(0, Math.min(PROF.length - 1, k))][1], t = c01((PROF[i][0] - y) / (PROF[i][0] - PROF[i + 1][0])), t2 = t * t, t3 = t2 * t;
  const p0 = q(i - 1), p1 = q(i), p2 = q(i + 1), p3 = q(i + 2);
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
const EYE = { x: 3.18, y: -0.48, z: 7.25, r: 1.22 }, MOUTH_Y = -6.98;
/* the vermilion borders: the upper lip's Cupid's bow and the lower lip's curve, meeting at the corners */
const lipTop = (ax: number) => -6.24 + 0.09 * g1(ax - 0.46, 0.32) - 0.08 * g1(ax, 0.2) - 0.62 * (ax / 2.45) ** 2;
const lipBot = (ax: number) => -7.8 + 0.84 * (ax / 2.35) ** 2;
function lipMask(x: number, y: number) { const ax = Math.abs(x), e = 0.06; return smt(lipTop(ax) + e, lipTop(ax) - e, y) * smt(lipBot(ax) - e, lipBot(ax) + e, y) * (1 - smt(2.25, 2.5, ax)); }
const browY = (ax: number) => { const t = c01((ax - 1.15) / 4.1); return 1.18 + 0.42 * Math.sin(Math.PI * Math.pow(t, 1.45)) - 0.12 * t; };
function browMask(ax: number, y: number) { const t = c01((ax - 1.15) / 4.1), th = 0.36 - 0.2 * t; return smt(th, th * 0.45, Math.abs(y - browY(ax))) * smt(0.95, 1.35, ax) * (1 - smt(4.9, 5.4, ax)); }

/* the front of the face as a depth over (x, y) */
function faceZ(x: number, y: number, f: number, coarse = false) {
  const ax = Math.abs(x), m = 1 - 0.4 * f;
  let z = prof(y) - (0.008 * x * x + 0.0037 * x ** 4) * (1 + 0.08 * smt(2, 7, y) + 0.45 * smt(-3, -7.5, y) + 1.2 * smt(-7.5, -11, y));
  z += 0.42 * m * g1(y - 1.35, 0.85) * (1 - smt(3.8, 6, ax));
  z -= 0.28 * g2(x, y - 0.25, 1.1, 0.85);
  const ex = ax - EYE.x, ey = y - EYE.y;
  z -= 0.52 * Math.exp(-((ex / (ex < 0 ? 1.2 : 1.0)) ** 2) - (ey / (ey > 0 ? 0.67 : 0.4)) ** 2);
  z += 0.5 * g2(ax - 4.55, y + 0.35, 0.6, 1.2);
  z += 0.65 * g2(ax - 4.4, y + 2.5, 1.6, 1.3);
  z += 0.1 * g2(ax - 3.2, y + 1.4, 1.2, 0.5);
  /* nose: a dorsum rising from the nasion to a rounded tip, alae either side, the underside sloping back to the lip */
  const t = c01((0.45 - y) / 4.38), w = 0.56 + 0.32 * t;
  let nose = ((0.12 + 2.25 * t ** 1.2) / (1 + (x / w) ** 4)) * smt(1.5, 0.3, y);
  nose += 0.4 * g2(x, y + 3.88, 0.76, 0.68);
  nose *= 1 - smt(-4.08, -4.93, y);
  nose = smax(nose, 0.98 * g2(ax - 1.28, y + 4.46, 0.58, 0.52), 0.35);
  if (!coarse) nose -= 0.1 * g1(Math.hypot((ax - 1.28) / 0.58, (y + 4.46) / 0.52) - 1.12, 0.22) * smt(-4.98, -4.28, y);
  z += nose;
  if (!coarse) z -= 0.22 * g2(ax - 0.6, y + 4.76, 0.26, 0.17);
  z -= 0.1 * g1(seg2(ax, y, 2.0, -4.55, 2.9, -7.2), 0.3);
  /* mouth */
  z += 0.42 * g2(x, y + 6.6, 2.8, 2.1);
  if (!coarse) { z -= 0.1 * g2(x, y + 5.63, 0.28, 0.55); z += 0.04 * g2(ax - 0.46, y + 5.63, 0.16, 0.55); }
  const lu = lipTop(ax), lb = lipBot(ax), lw = 1 - smt(1.5, 2.35, ax);
  const vu = (y - MOUTH_Y) / Math.max(0.12, lu - MOUTH_Y), vl = (MOUTH_Y - y) / Math.max(0.15, MOUTH_Y - lb);
  if (coarse) z += 0.3 * lw * g1(y - MOUTH_Y + 0.1, 0.6);
  else {
    z += 0.22 * lw * Math.pow(Math.sin(Math.PI * c01(vu * 0.92 + 0.04)), 0.7) * (vu > 1 ? g1(vu - 1, 0.25) : 1);
    z += 0.44 * lw * Math.pow(Math.sin(Math.PI * c01(vl * 0.9 + 0.05)), 0.8) * (vl > 1 ? g1(vl - 1, 0.3) : 1);
    z -= 0.18 * g1(y - MOUTH_Y, 0.06) * (1 - smt(2.1, 2.55, ax));
    z -= 0.08 * g2(ax - 2.42, y - MOUTH_Y, 0.3, 0.3);
  }
  z += 0.55 * g2(ax - 3.9, y + 4.6, 2.0, 2.0);
  z -= (coarse ? 0.15 : 0.32) * g2(x, y + 8.38, 1.6, coarse ? 0.6 : 0.36);
  z += 0.65 * g2(x, y + 9.7, 1.9, 1.05) + 0.15 * (1 - f) * g2(ax - 1.3, y + 9.9, 0.8, 0.7);
  return z;
}
/* faceZ tabulated over |x| and y (it is symmetric), read back bilinearly: the head is sampled hundreds of thousands of times */
const FT = new Map<number, Float32Array>(), FS = 0.04, FX = 211, FY0 = -13.5, FY = 651;
function faceZT(x: number, y: number, f: number, coarse: boolean) {
  const key = f + (coarse ? 2 : 0); let T = FT.get(key); if (!T) { T = new Float32Array(FX * FY); for (let j = 0; j < FY; j++) for (let i = 0; i < FX; i++) T[j * FX + i] = faceZ(i * FS, FY0 + j * FS, f, coarse); FT.set(key, T); }
  const fx = Math.abs(x) / FS, fy = (y - FY0) / FS; if (fx >= FX - 1 || fy < 0 || fy >= FY - 1) return faceZ(x, y, f, coarse);
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * FX + i;
  return (T[k] * (1 - tx) + T[k + 1] * tx) * (1 - ty) + (T[k + FX] * (1 - tx) + T[k + FX + 1] * tx) * ty;
}
/* the whole head: cranium blended with the face, which is bounded at the sides and cut under the jaw; `shut` fills the eyes for the crowd */
function headField(x: number, y: number, z: number, f: number, shut: boolean) {
  const ax = Math.abs(x), cran = ell(x, y, z, 0, 1.6, -1.4, 7.85 * (1 - 0.02 * f), 9.7, 9.4);
  const sx = ax / (6.45 - 0.3 * f), sy = Math.abs(y + 2.2) / 9.8, sz = Math.abs(z - 2.6) / 10.2;
  let face = smax(z - faceZT(x, y, f, shut), (Math.cbrt(sx * sx * sx + sy * sy * sy + sz * sz * sz) - 1) * 6.5, 1.2);
  face = smax(face, -11.3 + 0.3 * Math.max(0, 7.4 - z) + 0.07 * x * x - y, 0.8);
  let d = smin(cran, face, 2.2);
  d = smin(d, capsule(ax, y, z, 5.0, -2.3, 4.6, 6.9, -1.7, -0.6, 0.85), 1.4);
  if (shut) d = smin(d, Math.hypot(ax - EYE.x, y - EYE.y, z - EYE.z) - 1.3, 0.25);
  return d;
}
type Field = (x: number, y: number, z: number) => number;
/* the outermost surface along a ray: march in from outside the head with steps bounded by the field, then bisect */
function castRay(F: Field, dx: number, dy: number, dz: number, rMax = 14) {
  let hi = rMax, lo = rMax, v = F(dx * lo, dy * lo, dz * lo);
  while (v > 0 && lo > 0.5) { hi = lo; lo -= Math.max(0.05, 0.45 * v); v = F(dx * lo, dy * lo, dz * lo); }
  for (let k = 0; k < 10; k++) { const m = (lo + hi) / 2; if (F(dx * m, dy * m, dz * m) <= 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function gradN(F: Field, x: number, y: number, z: number, o: number[]) {
  const e = 0.025, nx = F(x + e, y, z) - F(x - e, y, z), ny = F(x, y + e, z) - F(x, y - e, z), nz = F(x, y, z + e) - F(x, y, z - e), l = Math.hypot(nx, ny, nz) || 1;
  o[0] = nx / l; o[1] = ny / l; o[2] = nz / l;
}
/* grid angles: columns crowd onto the face (longitude 0), rows onto the eyes-to-chin band; v runs crown (q = 0) to throat (q = 1) */
const LONK = 0.62, LATK = 0.5;
const lonOf = (u: number, k = LONK) => { const t = 2 * u - 1; return Math.PI * (t - (k * Math.sin(Math.PI * t)) / Math.PI); };
const latOf = (q: number, k = LATK) => { const s = 1 - 2 * q; return (Math.PI / 2) * (s - (k * Math.sin(Math.PI * s)) / Math.PI); };
function unwarp(a: number, k: number) { let t = a; for (let i = 0; i < 6; i++) t -= (t - (k * Math.sin(Math.PI * t)) / Math.PI - a) / (1 - k * Math.cos(Math.PI * t)); return t; }
function uvOfPoint(x: number, y: number, z: number): [number, number] { const lon = Math.atan2(x, z), lat = Math.atan2(y, Math.hypot(x, z)); return [(unwarp(lon / Math.PI, LONK) + 1) / 2, (1 - unwarp(lat / (Math.PI / 2), LATK)) / 2]; }

interface HeadGrid { C: number; R: number; P: Float32Array; N: Float32Array; ao: Float32Array; f: number; shut: boolean }
const grids = new Map<string, HeadGrid>();
function headGrid(C: number, R: number, f: number, shut: boolean, lonk = LONK, latk = LATK): HeadGrid {
  const key = `${C}|${R}|${f}|${shut}|${lonk}|${latk}`, hit = grids.get(key); if (hit) return hit;
  const W = C + 1, n = W * (R + 1), P = new Float32Array(n * 3), N = new Float32Array(n * 3), ao = new Float32Array(n), F: Field = (x, y, z) => headField(x, y, z, f, shut), nn = [0, 0, 0];
  for (let i = 0; i <= C; i++) {
    const lon = lonOf(i / C, lonk), sl = Math.sin(lon), cl = Math.cos(lon);
    for (let j = 0; j <= R; j++) {
      const lat = latOf(j / R, latk), cb = Math.cos(lat), dx = sl * cb, dy = Math.sin(lat), dz = cl * cb, k = j * W + i;
      const r = castRay(F, dx, dy, dz); const x = dx * r, y = dy * r, z = dz * r; P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z;
      gradN(F, x, y, z, nn); N[k * 3] = nn[0]; N[k * 3 + 1] = nn[1]; N[k * 3 + 2] = nn[2];
      const o1 = 0.25 - F(x + nn[0] * 0.25, y + nn[1] * 0.25, z + nn[2] * 0.25), o2 = 0.8 - F(x + nn[0] * 0.8, y + nn[1] * 0.8, z + nn[2] * 0.8);
      ao[k] = c01(1 - 0.6 * Math.max(0, o1) - 0.2 * Math.max(0, o2));
    }
  }
  const G = { C, R, P, N, ao, f, shut }; grids.set(key, G); return G;
}
function sampleGrid(G: HeadGrid, u: number, q: number, o: number[]) {
  const fx = u * G.C, fy = q * G.R, i = Math.min(G.C - 1, Math.max(0, Math.floor(fx))), j = Math.min(G.R - 1, Math.max(0, Math.floor(fy))), tx = fx - i, ty = fy - j, W = G.C + 1;
  for (let c = 0; c < 3; c++) { const a = G.P[(j * W + i) * 3 + c], b = G.P[(j * W + i + 1) * 3 + c], d = G.P[((j + 1) * W + i) * 3 + c], e = G.P[((j + 1) * W + i + 1) * 3 + c]; o[c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty; }
}

/* skin tone at a head point as multipliers on the base skin, plus roughness: warmer cheeks, nose and lips, shaded lids and under-eyes, dark
   nostrils and mouth line. The crowd also gets brows and eyes here; the hero carries those as strokes and geometry. */
function tone(x: number, y: number, z: number, crowd: boolean, o: number[]) {
  const ax = Math.abs(x), fr = smt(1.5, 5.5, z); let r = 1, g = 1, b = 1, ro = 0.6;
  const mul = (w: number, mr: number, mg: number, mb: number) => { r *= 1 + (mr - 1) * w; g *= 1 + (mg - 1) * w; b *= 1 + (mb - 1) * w; };
  const ch = g2(ax - 3.9, y + 3.1, 1.9, 1.5) * fr; mul(ch, 1.03, 0.97, 0.96); ro += 0.04 * ch;
  const no = g2(x, y + 3.5, 1.2, 1.3) * fr; mul(no, 1.04, 0.97, 0.96); ro -= 0.12 * no;
  const fh = smt(2.5, 5.5, y) * fr * (1 - smt(4, 6.5, ax)); mul(fh, 1.02, 1.01, 0.99); ro -= 0.08 * fh;
  mul(g2(ax - 3.15, y + 1.7, 1.3, 0.5) * fr, 0.9, 0.86, 0.88);
  mul(g2(ax - EYE.x, y - EYE.y - 1.0, 1.5, 0.5) * fr, 0.92, 0.89, 0.9);
  mul(g2(ax - 2.9, y + 6.8, 0.6, 0.6) * fr, 0.93, 0.9, 0.9);
  const lp = lipMask(x, y) * fr; mul(lp, 0.88, 0.72, 0.72); ro -= 0.12 * lp;
  if (crowd) mul(g1(y - MOUTH_Y + 0.05, 0.28) * (1 - smt(1.6, 2.4, ax)) * fr, 0.58, 0.46, 0.46); else mul(g1(y - MOUTH_Y, 0.045) * (1 - smt(2.1, 2.6, ax)) * fr, 0.5, 0.36, 0.36);
  mul(g2(ax - 0.6, y + 4.8, crowd ? 0.5 : 0.28, crowd ? 0.3 : 0.17) * fr, crowd ? 0.8 : 0.6, crowd ? 0.75 : 0.52, crowd ? 0.75 : 0.52);
  if (crowd) {
    mul(browMask(ax, y) * fr, 0.42, 0.4, 0.4);
    const e = Math.hypot((ax - EYE.x) / 1.3, (y - EYE.y + 0.05 * (ax - EYE.x)) / 0.6); mul(smt(1.1, 0.6, e) * fr, 0.4, 0.37, 0.37);
  }
  o[0] = r; o[1] = g; o[2] = b; o[3] = ro;
}
function beard(x: number, y: number, z: number) {
  const ax = Math.abs(x), by = ax < 2.4 ? -5.15 : -5.15 + 0.6 * (ax - 2.4);
  return smt(by + 0.35, by - 0.45, y) * (1 - lipMask(x, y)) * (1 - g2(ax - 0.6, y + 4.8, 0.6, 0.35)) * (1 - smt(-10.4, -11.4, y) * smt(6.5, 3.5, z));
}
/* how much of a point rides the lower jaw when the mouth opens */
function jawW(x: number, y: number, z: number) {
  const ax = Math.abs(x), yb = MOUTH_Y + (Math.max(0, 7.8 - z) / 8.8) * 4.6;
  const side = smt(yb + 0.3, yb - 1.2, y), lips = smt(MOUTH_Y + 0.05, MOUTH_Y - 0.12, y), near = (1 - smt(2.0, 3.0, ax)) * smt(6.8, 8.2, z);
  return (side * (1 - near) + lips * near) * smt(-4, -1, z);
}
interface HeadDims { A: number; Bh: number; Cd: number; oy: number; oz: number }
function headDims(d: Dims, b: BodySpec): HeadDims { const s = d.head, f = b.female ? 1 : 0; return { A: 0.08 * s * (1 - 0.04 * f), Bh: 0.113 * s * (1 - 0.03 * f), Cd: 0.098 * s, oy: 0.074 * s, oz: 0.014 * s }; }
/* centimetre head space → the head bone's metres */
const cmToHead = (H: HeadDims) => new THREE.Matrix4().makeTranslation(0, H.oy, H.oz).multiply(new THREE.Matrix4().makeScale(H.A / 8, H.Bh / 11.3, H.Cd / 9.8));
function hairline(x: number, y: number, z: number, b: BodySpec) {
  const long = b.hairStyle === 'long' || b.hairStyle === 'braid' || b.hairStyle === 'bun', ax = Math.abs(x);
  let line = -0.44 - (long ? 0.36 : 0) + (0.3 + 0.44 + (long ? 0.36 : 0)) * smt(-0.55, -0.1, z);
  line += 0.38 * smt(0.2, 0.55, z) - 0.07 * smt(0.2, 0.55, z) * smt(0.15, 0.45, ax) + 0.04 * smt(0.5, 0.75, ax) * smt(0.2, 0.5, z);
  if (b.hairStyle === 'side' && z > 0.3) line -= 0.05 * smt(-0.5, 0.5, x);
  const ear = smt(0.62, 0.8, ax) * (1 - smt(0.22, 0.45, Math.abs(z))); line += ear * Math.max(0, 0.3 - 0.1 * smt(-0.4, 0, z) - line);
  return line;
}
const hairAt = (x: number, y: number, z: number, b: BodySpec, lo = -0.01, hi = 0.28) => { const l = hairline(x / 8, y / 11.3, z / 9.8, b); return smt(l + lo, l + hi, y / 11.3); };

/* the head mesh from its grid: the hero's carries uv for the painted skin and a jaw-open morph; the crowd's paints its face into colours */
function headMesh(G: HeadGrid, H: HeadDims, spec: BodySpec, lod: number, skin: THREE.Color) {
  const W = G.C + 1, n = W * (G.R + 1), sx = H.A / 8, sy = H.Bh / 11.3, sz = H.Cd / 9.8, o = [0, 0, 0, 0];
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const adult = !spec.female && !spec.teen, hairOn = spec.hairStyle !== 'none', base = lod ? skin : new THREE.Color(1, 1, 1);
  const nrm = (k: number, nx: number, ny: number, nz: number, out: Float32Array) => { const X = nx / sx, Y = ny / sy, Z = nz / sz, l = Math.hypot(X, Y, Z) || 1; out[k * 3] = X / l; out[k * 3 + 1] = Y / l; out[k * 3 + 2] = Z / l; };
  for (let k = 0; k < n; k++) {
    const x = G.P[k * 3], y = G.P[k * 3 + 1], z = G.P[k * 3 + 2];
    pos[k * 3] = x * sx; pos[k * 3 + 1] = H.oy + y * sy; pos[k * 3 + 2] = H.oz + z * sz; nrm(k, G.N[k * 3], G.N[k * 3 + 1], G.N[k * 3 + 2], nor);
    uv[k * 2] = (k % W) / G.C; uv[k * 2 + 1] = 1 - Math.floor(k / W) / G.R;
    let r = 1, g = 1, b = 1; if (lod) { tone(x, y, z, true, o); r = o[0]; g = o[1]; b = o[2]; }
    const a = 0.6 + 0.4 * G.ao[k]; r *= a; g *= a; b *= a;
    if (adult) { const bd = beard(x, y, z) * (lod ? 0.4 : 0.85); r *= 1 - 0.18 * bd; g *= 1 - 0.18 * bd; b *= 1 - 0.15 * bd; }
    if (hairOn) { const hm = hairAt(x, y, z, spec, -0.05, 0.02); r *= 1 - 0.5 * hm; g *= 1 - 0.52 * hm; b *= 1 - 0.52 * hm; }
    col[k * 3] = base.r * r; col[k * 3 + 1] = base.g * g; col[k * 3 + 2] = base.b * b;
  }
  const jw = new Float32Array(n); if (!lod) for (let k = 0; k < n; k++) jw[k] = jawW(G.P[k * 3], G.P[k * 3 + 1], G.P[k * 3 + 2]);
  const slit = (a: number, b: number) => !lod && Math.max(jw[a], jw[a + 1]) < 0.5 && Math.min(jw[b], jw[b + 1]) >= 0.5 && Math.abs(G.P[a * 3]) < 2.1 && G.P[a * 3 + 2] > 8;
  const idx: number[] = []; for (let j = 0; j < G.R; j++) for (let i = 0; i < G.C; i++) { const a = j * W + i, b = a + W; if (!slit(a, b)) idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  if (!lod) {
    /* the jaw swings about its hinge in front of the ears; lips part along the mouth line */
    const dp = new Float32Array(n * 3), dn = new Float32Array(n * 3), th = 0.09, c = Math.cos(th), s = Math.sin(th), PY = -2.8, PZ = -1.0, tmp = new Float32Array(3);
    for (let k = 0; k < n; k++) {
      const x = G.P[k * 3], y = G.P[k * 3 + 1], z = G.P[k * 3 + 2], w = jw[k]; if (w < 1e-3) continue;
      const ry = y - PY, rz = z - PZ; dp[k * 3 + 1] = (PY + ry * c - rz * s - y) * w * sy; dp[k * 3 + 2] = (PZ + ry * s + rz * c - z) * w * sz;
      const nx = G.N[k * 3], ny = G.N[k * 3 + 1], nz = G.N[k * 3 + 2]; nrm(0, nx, ny * c - nz * s, ny * s + nz * c, tmp);
      for (let q = 0; q < 3; q++) dn[k * 3 + q] = (tmp[q] - nor[k * 3 + q]) * w;
    }
    geo.morphAttributes.position = [new THREE.BufferAttribute(dp, 3)]; geo.morphAttributes.normal = [new THREE.BufferAttribute(dn, 3)]; geo.morphTargetsRelative = true;
  }
  if (lod) geo.userData.face = { G, H, jaw: new Float32Array(n).map((_, k) => jawW(G.P[k * 3], G.P[k * 3 + 1], G.P[k * 3 + 2])) };
  geo.computeBoundingSphere(); return geo;
}
/* a crowd talker's lips part a little: the jaw drops about its hinge and the line between the lips darkens */
export function partLips(r: Rig, k = 1) {
  const head = r.bones.head.children.find((o) => (o as THREE.Mesh).geometry?.userData.face) as THREE.Mesh | undefined; if (!head) return;
  const g = head.geometry, F = g.userData.face as { G: HeadGrid; H: HeadDims; jaw: Float32Array }, P = g.attributes.position as THREE.BufferAttribute, C = g.attributes.color as THREE.BufferAttribute;
  const sy = F.H.Bh / 11.3, sz = F.H.Cd / 9.8, th = 0.07 * k, c = Math.cos(th), s = Math.sin(th);
  for (let i = 0; i < P.count; i++) {
    const y = F.G.P[i * 3 + 1], z = F.G.P[i * 3 + 2], w = F.jaw[i], ry = y + 2.8, rz = z + 1.0, d = 1 - 0.55 * k * g1(y - MOUTH_Y + 0.2, 0.45) * (1 - smt(1.6, 2.3, Math.abs(F.G.P[i * 3]))) * smt(6, 8, z);
    if (w > 1e-3) { P.setY(i, F.H.oy + (-2.8 + ry * c - rz * s) * sy * w + y * sy * (1 - w)); P.setZ(i, F.H.oz + (-1.0 + ry * s + rz * c) * sz * w + z * sz * (1 - w)); }
    C.setXYZ(i, C.getX(i) * d, C.getY(i) * d, C.getZ(i) * d);
  }
  P.needsUpdate = true; C.needsUpdate = true; g.computeVertexNormals();
}

/* ---- the hero's skin: tones evaluated on a 256 grid over the head's uv, enlarged, then mottled, grained, and given brow hairs and lip lines ---- */
const skinMaps = new Map<string, { map: THREE.Texture; rough: THREE.Texture }>();
function paintSkin(G: HeadGrid, skin: THREE.Color, hair: THREE.Color) {
  const key = skin.getHexString() + hair.getHexString() + G.f, hit = skinMaps.get(key); if (hit) return hit;
  const S = 256, T = 1024, cv = (w: number) => { const c = document.createElement('canvas'); c.width = c.height = w; return c; }, lo = cv(S), ro = cv(S), big = cv(T);
  const lg = lo.getContext('2d')!, rg = ro.getContext('2d')!, a = lg.createImageData(S, S), b = rg.createImageData(S, S), p = [0, 0, 0], o = [0, 0, 0, 0];
  const sc = skin.clone().convertLinearToSRGB();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    sampleGrid(G, (x + 0.5) / S, (y + 0.5) / S, p); tone(p[0], p[1], p[2], false, o); const k = (y * S + x) * 4;
    a.data[k] = 255 * c01(sc.r * o[0]); a.data[k + 1] = 255 * c01(sc.g * o[1]); a.data[k + 2] = 255 * c01(sc.b * o[2]); a.data[k + 3] = 255;
    b.data[k] = b.data[k + 1] = b.data[k + 2] = 255 * c01(o[3]); b.data[k + 3] = 255;
  }
  lg.putImageData(a, 0, 0); rg.putImageData(b, 0, 0);
  const g = big.getContext('2d')!; g.imageSmoothingQuality = 'high'; g.drawImage(lo, 0, 0, T, T);
  blot(g, T, T, 160, 7, '70,35,20', 0.02, 0.05, 4, 16); blot(g, T, T, 90, 9, '255,225,205', 0.015, 0.035, 4, 12); grain(g, T, T, 14000, 11, 0.04, 1);
  const hc = hair.clone().convertLinearToSRGB(), hs = `${Math.round(hc.r * 255)},${Math.round(hc.g * 255)},${Math.round(hc.b * 255)}`, R = rng(31);
  const px = (x: number, y: number): [number, number] => { const [u, q] = uvOfPoint(x, y, faceZ(x, y, G.f)); return [u * T, q * T]; };
  g.lineCap = 'round';
  for (const sd of [1, -1]) for (let i = 0; i < 360; i++) {
    const s = R(), ax = 1.15 + 4.0 * s, th = 0.36 - 0.2 * s, y0 = browY(ax) + (R() + R() + R() - 1.5) * th * 0.7;
    const ang = 1.2 * (1 - smt(0, 0.4, s)) + 0.15 - 0.4 * smt(0.6, 1, s) + (R() - 0.5) * 0.35, len = 0.42 + 0.3 * R() - 0.12 * smt(0.6, 1, s), dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
    const p0 = px(sd * ax, y0), p1 = px(sd * (ax + dx * 0.5), y0 + dy * 0.5 + 0.04), p2 = px(sd * (ax + dx), y0 + dy);
    g.strokeStyle = `rgba(${hs},${(0.4 + 0.45 * R()).toFixed(2)})`; g.lineWidth = 0.9 + 0.7 * R();
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); g.stroke();
  }
  g.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const up = i % 2 === 0, x = (R() * 2 - 1) * 2.0, ax = Math.abs(x), y0 = up ? lipTop(ax) - 0.04 : MOUTH_Y - 0.08, y1 = up ? MOUTH_Y + 0.08 : lipBot(ax) + 0.06, p0 = px(x, y0), p1 = px(x + (R() - 0.5) * 0.1, y1);
    g.strokeStyle = `rgba(60,22,20,${(0.06 + 0.06 * R()).toFixed(3)})`; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  const map = new THREE.CanvasTexture(big); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(ro); const out = { map, rough }; skinMaps.set(key, out); return out;
}
let PORES: THREE.Texture | null = null;
function poreMap() {
  if (PORES) return PORES;
  const S = 512, nc = document.createElement('canvas'); nc.width = nc.height = S; const R = rng(41), hf = new Float32Array(S * S), tmp = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) tmp[i] = R();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let a = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) a += tmp[((y + v + S) % S) * S + ((x + u + S) % S)]; hf[y * S + x] = a / 9; }
  for (let i = 0; i < 5000; i++) { const cx = Math.floor(R() * S), cy = Math.floor(R() * S), dep = 0.15 + 0.25 * R(); for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) hf[((cy + v + S) % S) * S + ((cx + u + S) % S)] -= dep * (u || v ? 0.4 : 1); }
  const ng = nc.getContext('2d')!, id = ng.createImageData(S, S), H = (x: number, y: number) => hf[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * 0.5, dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * 0.5, l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    id.data[i] = (-dx / l * 0.5 + 0.5) * 255; id.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; id.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; id.data[i + 3] = 255;
  }
  ng.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(nc); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 8; PORES = t; return t;
}
/* the eyeball's paint, rows running from the cornea (top) to the back: pupil, a fibrous brown iris with a dark limbal ring, sclera; and a catchlight */
let EYES: { map: THREE.Texture; glint: THREE.Texture } | null = null;
function eyeMaps() {
  if (EYES) return EYES;
  const W = 256, Hh = 256, row = (deg: number) => (deg / 180) * Hh, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d')!, R = rng(17);
  const sg = g.createLinearGradient(0, row(28), 0, Hh); sg.addColorStop(0, '#ebe5db'); sg.addColorStop(0.35, '#e2d8cd'); sg.addColorStop(1, '#b8a397'); g.fillStyle = sg; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 26; i++) { const x = R() * W; g.strokeStyle = `rgba(170,60,50,${(0.06 + 0.1 * R()).toFixed(3)})`; g.lineWidth = 0.6 + R(); g.beginPath(); g.moveTo(x, Hh); g.quadraticCurveTo(x + (R() - 0.5) * 30, row(70), x + (R() - 0.5) * 40, row(38 + 20 * R())); g.stroke(); }
  const ig = g.createLinearGradient(0, 0, 0, row(31)); ig.addColorStop(0, '#060403'); ig.addColorStop(10 / 31, '#0a0604'); ig.addColorStop(11.5 / 31, '#3a1f0d'); ig.addColorStop(17 / 31, '#5e3618'); ig.addColorStop(24 / 31, '#4a2911'); ig.addColorStop(27.5 / 31, '#24130a'); ig.addColorStop(29.5 / 31, '#1a0e07'); ig.addColorStop(1, 'rgba(26,14,7,0)');
  g.fillStyle = ig; g.fillRect(0, 0, W, row(31));
  for (let i = 0; i < 520; i++) { const x = R() * W, y0 = row(11 + 3 * R()), y1 = row(20 + 8 * R()), lt = R() > 0.45; g.strokeStyle = lt ? `rgba(150,100,55,${(0.12 + 0.2 * R()).toFixed(3)})` : `rgba(20,10,5,${(0.15 + 0.25 * R()).toFixed(3)})`; g.lineWidth = 0.6 + 1.2 * R(); g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (R() - 0.5) * 4, y1); g.stroke(); }
  g.fillStyle = 'rgba(130,85,45,0.22)'; g.fillRect(0, row(15.5), W, row(1.6));
  g.fillStyle = '#050302'; g.fillRect(0, 0, W, row(9.8));
  const gl = document.createElement('canvas'); gl.width = W; gl.height = Hh; const q = gl.getContext('2d')!; q.fillStyle = '#000'; q.fillRect(0, 0, W, Hh);
  const gr = q.createRadialGradient(0.71 * W, row(13), 0, 0.71 * W, row(13), 7); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(0, 0, W, Hh);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; const glint = new THREE.CanvasTexture(gl);
  EYES = { map, glint }; return EYES;
}
let LASH: THREE.Texture | null = null;
function lashMap() {
  if (LASH) return LASH;
  const W = 256, Hh = 64, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d')!, R = rng(23);
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) { const x = R() * W, lean = 6 + (R() - 0.5) * 16, top = Hh * (0.05 + 0.45 * R()); g.strokeStyle = `rgba(14,9,7,${(0.75 + 0.25 * R()).toFixed(2)})`; g.lineWidth = 0.9 + 0.7 * R(); g.beginPath(); g.moveTo(x, Hh); g.quadraticCurveTo(x + lean * 0.2, Hh * 0.5, x + lean, top); g.stroke(); }
  g.fillStyle = 'rgba(14,9,7,1)'; g.fillRect(0, Hh - 6, W, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; LASH = t; return t;
}

/* ---- eyes and lids, in centimetres about the eye's centre; lid margins in degrees of elevation by τ (−1 inner corner … 1 outer corner) ---- */
const D2R = Math.PI / 180, TC = 64, OPEN = 0.4;
const canth = (tl: number) => -2.5 + 2.5 * tl;
const lidUp = (tl: number) => canth(tl) + (Math.abs(tl) < 1 ? 17 * Math.pow(1 - tl * tl, 0.55) * (1 - 0.12 * tl) : 0);
const lidLo = (tl: number) => canth(tl) - (Math.abs(tl) < 1 ? 17 * Math.pow(1 - tl * tl, 0.75) * (1 + 0.1 * tl) : 0);
const edir = (th: number, ph: number, o: number[]) => { o[0] = Math.sin(th) * Math.cos(ph); o[1] = Math.sin(ph); o[2] = Math.cos(th) * Math.cos(ph); };
const restRot = (g: THREE.BufferGeometry) => g.applyMatrix4(new THREE.Matrix4().makeRotationX(OPEN));
function eyeballGeo() {
  const g = new THREE.SphereGeometry(EYE.r, 40, 28); g.rotateX(Math.PI / 2);
  const P = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < P.count; i++) { const z = P.getZ(i) / EYE.r, k = 1 + 0.045 * smt(0.86, 1, z); P.setXYZ(i, P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k); }
  g.computeVertexNormals(); return g;
}
/* a lid is a shell just off the eyeball, from its margin (with a rolled edge carrying the lash line) out under the surrounding skin; the upper
   lid is built rotated shut by OPEN so the walk cycle's rotation.x = −0.4 opens it and a blink closes it */
function lidGeo(side: number, upper: boolean) {
  const rl = upper ? 1.31 : 1.29, C = 40, R = 16, W = C + 1, sg = upper ? 1 : -1, pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [], d = [0, 0, 0], c = new THREE.Color(), wet = new THREE.Color(0.95, 0.72, 0.7);
  for (let j = 0; j <= R + 2; j++) for (let i = 0; i <= C; i++) {
    const thd = -84 + (168 * i) / C, tl = Math.max(-1, Math.min(1, (side * thd) / TC)), mg = upper ? lidUp(tl) : lidLo(tl);
    let ph = mg, r = rl;
    if (j === 0) { r = rl - 0.09; c.copy(wet); }
    else if (j === 1) c.setScalar(upper ? 0.16 : 0.5);
    else { const t = (j - 2) / R; ph = mg + sg * (1.2 + (76.8 - sg * mg) * Math.pow(t, 1.7)); r = rl + 0.03 * Math.sin(Math.PI * t); c.setScalar((j === 2 ? (upper ? 0.3 : 0.62) : j === 3 ? (upper ? 0.66 : 0.82) : 0.92) * (upper ? 1 - 0.15 * smt(0.3, 1, t) : 0.97)); }
    edir(thd * D2R, ph * D2R, d); pos.push(d[0] * r, d[1] * r, d[2] * r); col.push(c.r, c.g, c.b); uv.push(...uvOfPoint(side * EYE.x + d[0] * r, EYE.y + d[1] * r, EYE.z + d[2] * r));
  }
  for (let j = 0; j < R + 2; j++) for (let i = 0; i < C; i++) { const a = j * W + i, b = a + W; if (upper) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  if (upper) restRot(g); return g;
}
function lashGeo(side: number) {
  const C = 30, pos: number[] = [], uv: number[] = [], idx: number[] = [], n = [0, 0, 0], A = [0, 0.35, 0.7, 1], OUT = [0, 0.32, 0.6, 0.72], UP = [0, -0.04, 0.1, 0.32];
  for (let i = 0; i <= C; i++) {
    const tl = -0.96 + (1.92 * i) / C, th = side * tl * TC * D2R, ph = (lidUp(tl) + 0.6) * D2R, L = 0.5 * Math.pow(1 - tl * tl, 0.3) * (1 + 0.35 * Math.max(0, tl));
    edir(th, ph, n); const ux = -Math.sin(th) * Math.sin(ph), uy = Math.cos(ph), uz = -Math.cos(th) * Math.sin(ph);
    for (let k = 0; k < 4; k++) { const r = 1.33 + L * OUT[k], u = L * UP[k]; pos.push(n[0] * r + ux * u, n[1] * r + uy * u, n[2] * r + uz * u); uv.push((i / C) * 7, A[k]); }
  }
  for (let i = 0; i < C; i++) for (let k = 0; k < 3; k++) { const a = i * 4 + k, b = a + 4; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); restRot(g); return g;
}
/* an ear: a rounded plate with helix rim, antihelix, a scooped concha, tragus and lobe, standing a little off the head */
function earGeo(H: HeadDims, side: number, lod: number, skin: THREE.Color) {
  const A = lod ? 10 : 32, Rn = lod ? 3 : 9, fl = 0.45, tilt = 0.18, parts: THREE.BufferGeometry[] = [];
  const out = new THREE.Vector3(side * Math.cos(fl), 0, Math.sin(fl)), back = new THREE.Vector3(side * Math.sin(fl), 0, -Math.cos(fl)), up = new THREE.Vector3(0, Math.cos(tilt), -Math.sin(tilt)); up.addScaledVector(back, -up.dot(back)).normalize();
  const root = new THREE.Vector3(side * 6.85, -2.1, -1.2), warm = new THREE.Color().copy(skin).multiply(new THREE.Color(1.03, 0.93, 0.92)), c = new THREE.Color(), p = new THREE.Vector3();
  for (const front of [true, false]) {
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    for (let j = 0; j <= Rn; j++) for (let i = 0; i <= A; i++) {
      const r = j / Rn, a = (i / A) * Math.PI * 2, A0 = Math.atan2(Math.sin(a), Math.cos(a)) / D2R, e1 = r * Math.cos(a) * (Math.cos(a) > 0 ? 1.75 : 1.15), e2 = r * Math.sin(a) * (Math.sin(a) > 0 ? 3.05 : 2.9);
      let h: number, sh = 1;
      if (front) {
        const helix = smt(-75, -55, A0) * (1 - smt(145, 165, A0)), anti = smt(-35, -15, A0) * (1 - smt(105, 125, A0)), bowl = g2(e1 + 0.15, e2 + 0.4, 0.75, 0.85);
        h = (0.32 * (1 - r ** 6) + 0.34 * g1(r - 0.86, 0.1) * helix + 0.2 * g1(r - 0.6, 0.1) * anti - 0.5 * bowl + 0.12 * smt(-1.6, -2.4, e2) + 0.25 * g2(e1 + 0.95, e2 + 0.35, 0.3, 0.35)) * (1 - r ** 10);
        h *= 0.45 + 0.55 * smt(-1.15, -0.6, e1); sh = 1 - 0.3 * bowl;
      } else h = -0.12 * (1 - r * r);
      p.copy(root).addScaledVector(back, 1.2 + e1).addScaledVector(up, e2).addScaledVector(out, h); pos.push(p.x, p.y, p.z);
      c.copy(warm).multiplyScalar(front ? sh : 0.95); col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < Rn; j++) for (let i = 0; i < A; i++) { const a = j * (A + 1) + i, b = a + A + 1; if (front === (side > 0)) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); parts.push(g);
  }
  const g = mergeGeometries(parts); g.applyMatrix4(cmToHead(H)); g.computeVertexNormals(); return g;
}

/* ---- hair ---- */
/* the cap: the scalp pushed out along its normal and tucked under the skin past the hairline; the hero's is a thin under-layer for his clumps */
function hairShell(G: HeadGrid, H: HeadDims, b: BodySpec, seed: number, under: boolean) {
  const style = b.hairStyle || 'short', long = style === 'long' || style === 'braid' || style === 'bun', W = G.C + 1, n = W * (G.R + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), on = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    const x = G.P[k * 3], y = G.P[k * 3 + 1], z = G.P[k * 3 + 2], ux = x / 8, uy = y / 11.3, uz = z / 9.8, m = hairAt(x, y, z, b), top = smt(-0.3, 1, uy), clump = 0.5 + 0.5 * Math.sin(ux * 9 + seed) * Math.sin(uz * 11 + uy * 4 + seed * 2);
    let t = (style === 'short' ? 0.09 : style === 'side' ? 0.12 : 0.08) * (0.2 + 0.8 * top * top) * m + 0.03 * clump * top * m;
    if (style === 'side' && uy > 0.3) t += 0.06 * smt(-0.8, 0.6, ux) * m * smt(-0.2, 0.5, uz);
    if (long && uz < 0.2) t += 0.05 * m;
    const off = m > 0.001 ? (under ? 0.1 + t * 2.6 : t * 8.5 + 0.12) : -0.4; on[k] = m > 0.001 ? 1 : 0;
    let fz = 0, fy = 0; if (!under && style !== 'short' && uz > 0.45 && uy > 0.3 && uy < 0.62) { fz = 1.2 * m; fy = -1.0 * m; }
    pos[k * 3] = x + G.N[k * 3] * off; pos[k * 3 + 1] = y + G.N[k * 3 + 1] * off + fy; pos[k * 3 + 2] = z + G.N[k * 3 + 2] * off + fz;
    uv[k * 2] = ((k % W) / G.C) * 6; uv[k * 2 + 1] = (Math.floor(k / W) / G.R) * 4;
  }
  const idx: number[] = []; for (let j = 0; j < G.R; j++) for (let i = 0; i < G.C; i++) { const a = j * W + i, c = a + W; if (on[a] | on[c] | on[a + 1] | on[c + 1]) idx.push(a, c, a + 1, a + 1, c, c + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.applyMatrix4(cmToHead(H)); g.computeVertexNormals();
  const N = g.attributes.normal as THREE.BufferAttribute; for (let j = 0; j <= G.R; j++) { const a = j * W, c = a + G.C, x = N.getX(a) + N.getX(c), y = N.getY(a) + N.getY(c), z = N.getZ(a) + N.getZ(c), l = Math.hypot(x, y, z) || 1; N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(c, x / l, y / l, z / l); }
  return g;
}
/* a ponytail or braid down the back, or a bun */
function hairExtras(H: HeadDims, s: number, style: string) {
  if (style === 'long' || style === 'braid') {
    const pts: THREE.Vector3[] = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(0, H.oy - 0.02 * s - t * (style === 'braid' ? 0.42 : 0.3) * s, H.oz - H.Cd * 0.98 - 0.012 * s - 0.075 * s * smt(0, 0.35, t))); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, (style === 'braid' ? 0.022 : 0.045) * s, 8, false), tp = tg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i), t = Math.min(1, Math.max(0, (H.oy - y) / (0.4 * s))); tp.setX(i, tp.getX(i) * (1 - 0.5 * t)); tp.setZ(i, tp.getZ(i) + (style === 'braid' ? 0.006 * Math.sin(y * 160) : 0)); }
    tg.computeVertexNormals(); return tg;
  }
  if (style === 'bun') { const bg = new THREE.SphereGeometry(0.045 * s, 12, 10); bg.translate(0, H.oy + 0.05 * s, H.oz - H.Cd * 1.05); return bg; }
  return null;
}
/* the hero's hair: tapered clumps rooted inside the hairline and combed along a flow field (a side part on his left, the top swept to his right
   and back, short tapered sides and nape), each a curved ribbon darkened toward its root so the layers read */
function flow(x: number, y: number, z: number, part: number | null): [number, number, number] {
  const wt = smt(4.5, 7.5, y) * smt(-7, -3, z), wb = smt(-2, -6, z) * (1 - 0.6 * wt), ws = Math.max(0, 1 - wt - wb), sx = Math.sign(x) || 1, fr = smt(2, 6, z);
  const top: [number, number, number] = part == null ? [0, 0.05 + 0.2 * fr, -1] : x < part ? [-1, 0.12 * fr, -0.35 + 0.23 * fr] : [1, -0.15, -0.45];
  return [wt * top[0] + wb * 0.05 * sx + ws * 0.25 * sx, wt * top[1] - wb - ws, wt * top[2] - wb * 0.2 - ws * 0.55];
}
const clumpCache = new Map<string, THREE.BufferGeometry>();
function clumpGeo(b: BodySpec, f: number, seed: number) {
  const key = `${b.hairStyle}|${f}|${seed}`, hit = clumpCache.get(key); if (hit) return hit;
  const F: Field = (x, y, z) => headField(x, y, z, f, false), R = rng(seed * 977 + 13), part = b.hairStyle === 'side' ? 2.3 : null, K = 6, N = 680;
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [], nn = [0, 0, 0], v = new THREE.Vector3(), n = new THREE.Vector3(), bn = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Vector3();
  for (let made = 0, tries = 0; made < N && tries < N * 12; tries++) {
    const dy = 1 - 2 * R(), ph = R() * Math.PI * 2, q = Math.sqrt(1 - dy * dy), r = castRay(F, q * Math.cos(ph), dy, q * Math.sin(ph));
    p.set(q * Math.cos(ph) * r, dy * r, q * Math.sin(ph) * r); const m = hairAt(p.x, p.y, p.z, b, 0.02, 0.2); if (m < 0.35 || p.y < -8) continue;
    const wt = smt(4.5, 7.5, p.y) * smt(-7, -3, p.z), wb = smt(-2, -6, p.z), lay = R(), shade = 0.82 + 0.32 * R();
    const L = (wt * (4.4 + 1.4 * R()) + (1 - wt) * (wb > 0.5 ? 2.5 + 0.8 * R() : 1.9 + 0.6 * R())) * (m < 0.75 ? 0.6 : 1), w0 = (0.55 + 0.45 * wt) * (0.8 + 0.5 * R());
    const h0 = 0.08 + (0.1 + 0.42 * wt) * lay, arc = (0.1 + 0.32 * wt) * (0.4 + 0.6 * lay), base = pos.length / 3;
    for (let k = 0; k <= K; k++) {
      const s = k / K; gradN(F, p.x, p.y, p.z, nn); n.set(nn[0], nn[1], nn[2]);
      const fv = flow(p.x, p.y, p.z, part); v.set(fv[0], fv[1], fv[2]).addScaledVector(n, -v.dot(n)); if (v.lengthSq() < 1e-6) v.set(0, -1, 0).addScaledVector(n, -n.y); v.normalize();
      bn.crossVectors(v, n).normalize(); const h = h0 + arc * Math.sin(Math.PI * Math.min(1, s * 1.4)) * (1 - 0.5 * s), w = w0 * (1 - 0.85 * Math.pow(s, 1.4));
      c.copy(p).addScaledVector(n, h); const tone = shade * (0.4 + 0.6 * smt(0, 0.55, s)) * (1 + 0.08 * s);
      for (let e = 0; e < 3; e++) { const side = e - 1, lift = e === 1 ? 0.07 * w : -0.04; pos.push(c.x + bn.x * side * w * 0.5 + n.x * lift, c.y + bn.y * side * w * 0.5 + n.y * lift, c.z + bn.z * side * w * 0.5 + n.z * lift); uv.push((e / 2) * (w0 / 1.6), (s * L) / 2.5); col.push(tone, tone, tone); }
      if (k < K) { p.addScaledVector(v, L / K); const l = p.length(); p.multiplyScalar(castRay(F, p.x / l, p.y / l, p.z / l) / l); }
    }
    for (let k = 0; k < K; k++) for (let e = 0; e < 2; e++) { const a = base + k * 3 + e, bb = a + 3; idx.push(a, a + 1, bb, a + 1, bb + 1, bb); }
    made++;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  clumpCache.set(key, g); return g;
}

/* hands: palm and four two-joint fingers plus thumb, curled per pose; palm faces the thigh, fingers hang down */
export type HandPose = 'relax' | 'fist' | 'open' | 'point' | 'grip' | 'type' | 'flat';
const CURL: Record<HandPose, [number, number, number]> = { relax: [0.45, 0.6, 0.35], fist: [1.5, 1.6, 0.9], open: [0.12, 0.15, 0.1], point: [1.4, 1.5, 0.8], grip: [1.05, 1.15, 0.6], type: [0.55, 0.7, 0.2], flat: [0.05, 0.05, 0.05] };
function handGeo(k: number, side: number, pose: HandPose, female: boolean, lod = 0) {
  const s = k * (female ? 0.9 : 1), parts: THREE.BufferGeometry[] = [], [c1, c2, ct] = CURL[pose], inward = -side;
  const palm = new THREE.SphereGeometry(1, 12, 10), pp = palm.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), tz = 0.5 + 0.5 * -y; pp.setXYZ(i, x * 0.0125 * s * (x * inward > 0 ? 0.8 : 1), -0.045 * s + y * 0.046 * s, z * 0.04 * s * (0.85 + 0.15 * tz)); }
  palm.deleteAttribute('uv'); parts.push(palm);
  (lod > 1 ? [[0.0, 0.074, 0.02]] : [[0.026, 0.074, 0.0088], [0.0085, 0.08, 0.0092], [-0.0085, 0.076, 0.0087], [-0.025, 0.06, 0.0078]]).forEach((f, i) => {
    const zz = f[0] * s, L = f[1] * s, r = f[2] * s, pt = pose === 'point' && i === 0, cc = pt ? 0.05 : c1 * (1 + i * 0.1), cc2 = pt ? 0.05 : c2 * (1 + i * 0.05);
    const pts: THREE.Vector3[] = [new THREE.Vector3(0, -0.084 * s + Math.abs(f[0]) * 0.25 * s, zz)]; let ang = 0, p = pts[0].clone();
    for (let seg = 0; seg < 3; seg++) { ang += seg === 0 ? cc * 0.55 : cc2 * 0.6; const l = L * [0.46, 0.3, 0.24][seg]; p = p.clone().add(new THREE.Vector3(inward * Math.sin(ang) * l, -Math.cos(ang) * l, 0)); pts.push(p); }
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), lod ? 3 : 8, r, lod > 1 ? 5 : lod ? 4 : 7, false), tp = tg.attributes.position as THREE.BufferAttribute;
    for (let q = 0; q < tp.count; q++) { const t = Math.min(1, Math.max(0, (pts[0].y - tp.getY(q)) / L)); const cx = tp.getX(q), cz = tp.getZ(q); tp.setZ(q, zz + (cz - zz) * (1 - 0.15 * t)); tp.setX(q, cx); }
    const cap = new THREE.SphereGeometry(r * 0.86, 7, 5); cap.translate(p.x, p.y, p.z);
    tg.deleteAttribute('uv'); cap.deleteAttribute('uv'); parts.push(tg.toNonIndexed(), cap.toNonIndexed());
  });
  const ta = 0.35 + ct * 0.9, tb = [new THREE.Vector3(inward * 0.004 * s, -0.022 * s, 0.03 * s)];
  tb.push(tb[0].clone().add(new THREE.Vector3(inward * 0.012 * s * Math.sin(ta), -0.026 * s, 0.013 * s)), tb[0].clone().add(new THREE.Vector3(inward * 0.028 * s * Math.sin(ta), -0.052 * s, 0.018 * s * Math.cos(ta))));
  const tt = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tb), 8, 0.0105 * s, 7, false); tt.deleteAttribute('uv'); parts.push(tt.toNonIndexed());
  const tc = new THREE.SphereGeometry(0.0095 * s, 7, 5); tc.translate(tb[2].x, tb[2].y, tb[2].z); tc.deleteAttribute('uv'); parts.push(tc.toNonIndexed());
  const g = mergeGeometries(parts.map((q) => q.index ? q.toNonIndexed() : q)); g.computeVertexNormals(); return g;
}
/* shoes, split at the ball of the foot so the toe stays flat when the heel lifts */
function shoeGeo(k: number, kind: string, part: 'rear' | 'toe', female: boolean) {
  const s = k * (female ? 0.92 : 1), L = 0.27 * s, heel = 0.06 * s, ball = 0.135 * s, H0 = (kind === 'boot' ? 0.15 : kind === 'sandal' ? 0.03 : 0.085) * s;
  const sh = new THREE.Shape(); const z0 = part === 'rear' ? -heel : ball - 0.005 * s, z1 = part === 'rear' ? ball + 0.005 * s : L - heel;
  const top = (z: number) => z < 0.02 * s ? H0 : z < ball ? H0 - (H0 - 0.055 * s) * (z - 0.02 * s) / (ball - 0.02 * s) : 0.055 * s - 0.03 * s * ((z - ball) / (L - heel - ball)) ** 1.6;
  const N = 10; sh.moveTo(z0, -0.085 * s); for (let i = 0; i <= N; i++) { const z = z0 + (z1 - z0) * i / N; sh.lineTo(z, top(z) - 0.085 * s); }
  sh.lineTo(z1, -0.085 * s); sh.lineTo(z0, -0.085 * s);
  const W = (kind === 'boot' ? 0.1 : 0.092) * s, g = new THREE.ExtrudeGeometry(sh, { depth: W - 0.02 * s, bevelEnabled: true, bevelSize: 0.01 * s, bevelThickness: 0.01 * s, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -(W - 0.02 * s) / 2); g.rotateY(-Math.PI / 2);
  const P = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < P.count; i++) { const z = P.getZ(i), y = P.getY(i); let x = P.getX(i); const t = Math.max(0, (z - 0.08 * s) / (L - heel - 0.08 * s)); x *= 1 - 0.38 * t * t; if (z < -0.03 * s) x *= 1 - 0.25 * ((-0.03 * s - z) / (heel)) ** 2; P.setXYZ(i, x + 0.004 * s * t, y, z); }
  g.deleteAttribute('uv'); g.computeVertexNormals();
  if (part === 'toe') g.translate(0, 0.085 * s - 0.025 * s, -ball);
  return g;
}

/* ---- the rig ---- */
export interface RigParts { skinned: THREE.SkinnedMesh[]; rigid: THREE.Mesh[]; hands: Record<'L' | 'R', THREE.Mesh>; handGeos: Record<string, THREE.BufferGeometry>; lids: THREE.Mesh[]; mouth: THREE.Mesh | null; tassel: THREE.Object3D | null; pack: THREE.Object3D | null; cap: THREE.Object3D | null; laptop: THREE.Object3D | null }
export interface Rig { group: THREE.Group; bones: Record<BoneName, THREE.Bone>; skeleton: THREE.Skeleton; d: Dims; spec: BodySpec; parts: RigParts; mats: THREE.Material[] }

function clothMat(color: string, kind: 'fabric' | 'denim' | 'knit' | 'leather' | 'hair' | null, rough = 0.9, sheen = 0) {
  const p: THREE.MeshStandardMaterialParameters = { color: new THREE.Color(color), roughness: rough, metalness: 0 };
  if (kind) { const s = SURF[kind](); const r = kind === 'denim' ? 5 : kind === 'knit' ? 8 : kind === 'hair' ? 8 : kind === 'leather' ? 4 : 3; const nm = s.normalMap!.clone(); nm.needsUpdate = true; nm.repeat.set(r, r); p.normalMap = nm; p.normalScale = new THREE.Vector2(kind === 'fabric' ? 0.22 : 0.45, kind === 'fabric' ? 0.22 : 0.45); if (kind !== 'leather' && kind !== 'hair') { const mm = s.map.clone(); mm.needsUpdate = true; mm.repeat.set(r, r); p.map = mm; } }
  const m = new THREE.MeshStandardMaterial(p); if (sheen) m.envMapIntensity = sheen; return m;
}
function wrapSkin(m: THREE.MeshStandardMaterial, key: string) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n\tfloat wrapK = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);\n\treflectedLight.directDiffuse += reflectedLight.directDiffuse * vec3(0.18, 0.05, 0.02) * (1.0 - wrapK);\n\treflectedLight.indirectDiffuse *= vec3(1.06, 0.98, 0.95);'); };
  m.customProgramCacheKey = () => key; return m;
}
function skinMat(c: THREE.Color) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.62, metalness: 0 });
  m.userData.skin = c; return wrapSkin(m, 'skinSSS');
}
/* the shadow map is far coarser than a nose or a lip, so the hero's head casts from a little behind itself and never speckles its own face */
let PUSH: THREE.MeshDepthMaterial | null = null;
function pushDepth() {
  if (PUSH) return PUSH; const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n\tgl_Position.z += 0.002 * gl_Position.w;'); };
  m.customProgramCacheKey = () => 'pushDepth'; PUSH = m; return m;
}
/* the hero's face: painted albedo and roughness, tiled pores, soft specular and a little sheen instead of a plastic highlight */
function faceMat(G: HeadGrid, skin: THREE.Color, hair: THREE.Color) {
  const t = paintSkin(G, skin, hair), m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: t.map, roughnessMap: t.rough, roughness: 1, normalMap: poreMap(), normalScale: new THREE.Vector2(0.2, 0.2), vertexColors: true, specularIntensity: 0.5, sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color(0.5, 0.3, 0.25) });
  m.userData.skin = skin; m.userData.tint = 3; return wrapSkin(m, 'skinFace');
}
const colorize = (g: THREE.BufferGeometry, c: THREE.Color) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };

export function buildRig(spec: BodySpec): Rig {
  const d = dims(spec), bp = bindPos(d), group = new THREE.Group(), bones = {} as Record<BoneName, THREE.Bone>;
  for (const nm of BONES) { const b = new THREE.Bone(); b.name = nm; const P = PARENT[nm], a = bp[nm], pa = P ? bp[P] : [0, 0, 0]; b.position.set(a[0] - pa[0], a[1] - pa[1], a[2] - pa[2]); bones[nm] = b; if (P) bones[P].add(b); }
  group.add(bones.root); group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(BONES.map((n) => bones[n]));
  const O = spec.outfit, lod = spec.lod || 0, seg = lod > 1 ? 8 : lod ? 10 : 18, sub = lod ? 1 : 2, female = !!spec.female;
  const skinC = new THREE.Color(spec.skin || '#a7714c'), hairC = new THREE.Color(spec.hair || '#16110d');
  const mats: THREE.Material[] = [];
  const skinM = skinMat(skinC); skinM.userData.tint = 3; mats.push(skinM);
  const fab = (c: string, k: 'fabric' | 'denim' | 'knit' = 'fabric', r = 0.92) => { const m = clothMat(c, k, r); mats.push(m); return m; };
  const topM = fab(O.topC, O.top === 'sweater' || O.top === 'hoodie' ? 'knit' : 'fabric', O.top === 'puffer' ? 0.55 : 0.92);
  const lowM = fab(O.lowC, O.low === 'jeans' ? 'denim' : 'fabric'); topM.userData.tint = 1; lowM.userData.tint = 2;
  const shoeM = clothMat(O.shoeC, O.shoe === 'sneaker' ? 'fabric' : 'leather', O.shoe === 'formal' ? 0.42 : 0.75); mats.push(shoeM);
  const soleM = new THREE.MeshStandardMaterial({ color: O.sole || '#1a1a1a', roughness: 0.85 }); mats.push(soleM);
  const hairM = clothMat('#ffffff', 'hair', 0.52); hairM.color.copy(hairC); hairM.userData.tint = 4; mats.push(hairM);
  const gownM = O.gown ? fab('#141519', 'fabric', 0.7) : null;
  const geos = new Map<THREE.Material, THREE.BufferGeometry[]>(); const put = (m: THREE.Material, g: THREE.BufferGeometry) => { let l = geos.get(m); if (!l) { l = []; geos.set(m, l); } l.push(g); };
  const shirtLoose = O.top === 'puffer' ? 0.03 : O.top === 'hoodie' ? 0.014 : O.top === 'sweater' ? 0.008 : 0.006;
  /* torso: trousers below the waist, top above; a tucked shirt meets the belt, a loose top overhangs it */
  const tucked = O.top === 'shirt' || O.top === 'shirtShort';
  const lowerT = skinTube(torsoRings(d, spec, 0.006, 0, 3).slice(0, 5), torsoW(d), { seg: seg + 6, sub, n: 2.3 }); put(O.low === 'sari' || O.low === 'skirt' ? topM : lowM, lowerT);
  const upperRings = torsoRings(d, spec, shirtLoose, 0, 12).filter((r) => r.y >= (tucked ? 1.02 : 0.96) * d.k);
  if (!tucked) upperRings[0] = { ...upperRings[0], rx: upperRings[0].rx + 0.008, rz: upperRings[0].rz + 0.008 };
  const puff = O.top === 'puffer' ? (t: number, th: number) => 0.035 * Math.pow(Math.abs(Math.sin(t * Math.PI * 7)), 0.6) + 0.004 * Math.sin(th * 9) : O.top === 'hoodie' || O.top === 'sweater' ? (t: number, th: number) => 0.012 * Math.sin(th * 7 + t * 3) * (t < 0.4 ? 1 : 0.3) : undefined;
  put(topM, skinTube(upperRings, torsoW(d), { seg: seg + 6, sub, n: 2.3, capBot: false, wave: puff }));
  const neckG = skinTube([{ y: d.neckY + 0.13 * d.k, rx: 0.054 * d.k, rz: 0.056 * d.k, cz: 0.0 }, { y: d.neckY + 0.06 * d.k, rx: 0.057 * d.k, rz: 0.06 * d.k, cz: -0.006 * d.k }, { y: d.neckY - 0.03 * d.k, rx: 0.064 * d.k, rz: 0.064 * d.k, cz: -0.012 * d.k }],
    (y) => y > d.headY ? [[BI('head'), 1]] : blend(y, d.neckY + 0.04 * d.k, d.neckY - 0.02 * d.k, 'neck', 'chest'), { seg: lod ? 10 : 14, sub: 1 });
  colorize(neckG, skinC); put(skinM, neckG);
  /* legs */
  const garment = O.low === 'skirt' || O.low === 'sari' ? 'bare' : O.low;
  for (const sd of ['L', 'R'] as const) { const sg = sd === 'L' ? 1 : -1, g = skinTube(legRings(d, sg, garment), legW(d, sd), { seg, sub, side: sg, capBot: garment === 'bare' }); if (garment === 'bare') { colorize(g, skinC); put(skinM, g); } else put(lowM, g); }
  if (O.low === 'skirt' || O.low === 'sari') { const sk = skinTube([{ y: 1.0 * d.k, rx: 0.16 * d.k, rz: 0.11 * d.k }, { y: 0.8 * d.k, rx: 0.2 * d.k, rz: 0.15 * d.k }, { y: (O.low === 'sari' ? 0.05 : 0.45) * d.k, rx: (O.low === 'sari' ? 0.2 : 0.23) * d.k, rz: (O.low === 'sari' ? 0.17 : 0.19) * d.k }], () => [[BI('pelvis'), 1]], { seg: seg + 4, sub: 1, capBot: false, wave: (t, th) => 0.025 * t * Math.sin(th * 11) }); put(O.low === 'sari' ? fab(O.sariC || O.topC) : lowM, sk); }
  /* arms: skin underneath, sleeve over it; the sleeve's end is an open hem */
  const sleeveTo = O.top === 'shirtShort' || O.top === 'tee' || O.top === 'vest' ? 1.24 * d.k : O.rolled ? 1.02 * d.k : O.top === 'kurta' || O.top === 'blouse' ? 1.15 * d.k : 0.9 * d.k;
  for (const sd of ['L', 'R'] as const) {
    const sg = sd === 'L' ? 1 : -1, sk = skinTube(armRings(d, sg, 0, 0), armW(d, sd), { seg: lod ? 8 : 14, sub, side: sg }); colorize(sk, skinC); put(skinM, sk);
    const sl = O.top === 'puffer' ? 0.026 : O.top === 'hoodie' ? 0.012 : 0.007, rings = armRings(d, sg, sl, sleeveTo);
    if (rings.length > 1) put(topM, skinTube(rings, armW(d, sd), { seg: lod ? 8 : 14, sub, side: sg, capBot: false, wave: O.top === 'puffer' ? (t) => 0.06 * Math.pow(Math.abs(Math.sin(t * Math.PI * 4)), 0.6) : undefined }));
    if (O.rolled && rings.length) { const r = rings[rings.length - 1], roll = skinTube([{ ...r, y: r.y + 0.035 * d.k, rx: r.rx + 0.006, rz: r.rz + 0.006 }, { ...r, y: r.y, rx: r.rx + 0.007, rz: r.rz + 0.007 }], armW(d, sd), { seg: 12, sub: 1, capBot: false, capTop: false }); put(topM, roll); }
    if (O.gown && gownM) put(gownM, skinTube(armRings(d, sg, 0.02, 0.92 * d.k, 0.07), armW(d, sd), { seg: 14, sub, side: sg, capBot: false, wave: (t, th) => 0.01 * Math.sin(th * 6) * t }));
  }
  if (O.gown && gownM) {
    put(gownM, skinTube(torsoRings(d, spec, 0.03, 0, 12).filter((r) => r.y >= 1.0 * d.k), torsoW(d), { seg: seg + 6, sub, n: 2.3, capBot: false, wave: (t, th) => 0.008 * Math.sin(th * 10) * (1 - t) }));
    const skirt = skinTube([{ y: 1.04 * d.k, rx: 0.19 * d.k, rz: 0.14 * d.k, cz: -0.01 }, { y: 0.8 * d.k, rx: 0.24 * d.k, rz: 0.2 * d.k }, { y: 0.4 * d.k, rx: 0.3 * d.k, rz: 0.27 * d.k }, { y: 0.24 * d.k, rx: 0.32 * d.k, rz: 0.29 * d.k }], () => [[BI('pelvis'), 1]], { seg: 28, sub: 2, capBot: false, capTop: false, wave: (t, th) => 0.05 * t * Math.sin(th * 12) });
    put(gownM, skirt);
  }
  /* skinned meshes, one per material */
  const skinned: THREE.SkinnedMesh[] = [];
  geos.forEach((list, m) => {
    const clean = list.map((g) => { const c = g.index ? g : g; if (!c.attributes.color) { const n = c.attributes.position.count; c.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); } return c; });
    const g = mergeGeometries(clean); if (!g) return; const sm = new THREE.SkinnedMesh(g, m); if ((m as THREE.MeshStandardMaterial).vertexColors === false && m !== skinM) (m as THREE.MeshStandardMaterial).vertexColors = false;
    sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false; group.add(sm); sm.bind(skeleton, new THREE.Matrix4()); skinned.push(sm);
  });
  skinM.vertexColors = true;
  /* rigid parts */
  const rigid: THREE.Mesh[] = [], attach = (b: BoneName, g: THREE.BufferGeometry, m: THREE.Material, cast = true) => { const me = new THREE.Mesh(g, m); me.castShadow = cast; me.receiveShadow = true; bones[b].add(me); rigid.push(me); return me; };
  /* head: the crowd's is a coarse grid with the face painted in and the eyes shut into the surface; the hero's is fine, with eyes, lids and a jaw */
  const H = headDims(d, spec), fem = female ? 1 : 0, G = lod ? headGrid(lod > 1 ? 22 : 30, lod > 1 ? 18 : 24, fem, true, 0.78, 0.8) : headGrid(140, 128, fem, false);
  let faceM: THREE.Material = skinM; if (!lod) { faceM = faceMat(G, skinC, hairC); mats.push(faceM); }
  const head = attach('head', headMesh(G, H, spec, lod, skinC), faceM);
  [1, -1].forEach((sd) => attach('head', earGeo(H, sd, lod, skinC), skinM));
  const style = spec.hairStyle || 'short', clumped = !lod && (style === 'short' || style === 'side');
  if (style !== 'none') {
    attach('head', hairShell(lod ? G : headGrid(64, 56, fem, false), H, spec, (spec.seed || 1) * 1.7, clumped), hairM);
    const ex = hairExtras(H, d.head, style); if (ex) attach('head', ex, hairM);
    if (clumped) {
      const hs = SURF.hair(), cm = new THREE.MeshPhysicalMaterial({ color: hairC, vertexColors: true, map: hs.map, normalMap: hs.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.42, anisotropy: 0.8, specularIntensity: 0.85, side: THREE.DoubleSide });
      cm.userData.tint = 4; mats.push(cm); attach('head', clumpGeo(spec, fem, spec.seed || 1).clone().applyMatrix4(cmToHead(H)), cm);
    }
  }
  const lids: THREE.Mesh[] = []; let mouth: THREE.Mesh | null = null;
  if (!lod) {
    const em = eyeMaps(), eyeM = new THREE.MeshPhysicalMaterial({ map: em.map, emissiveMap: em.glint, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 0.7 });
    const lashM = new THREE.MeshStandardMaterial({ map: lashMap(), color: 0x3a2a22, alphaTest: 0.4, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.7 }); mats.push(eyeM, lashM);
    const sc = H.A / 8, eyes: THREE.Mesh[] = [], gaze = { last: 0, next: 0, x: 0, y: 0, tx: 0, ty: 0 }, ball = eyeballGeo();
    for (const sd of [1, -1]) {
      const E = new THREE.Vector3(sd * EYE.x, EYE.y, EYE.z).applyMatrix4(cmToHead(H)), put = (m: THREE.Mesh) => { m.position.copy(E); m.scale.setScalar(sc); return m; };
      eyes.push(put(attach('head', ball, eyeM, false)));
      const up = put(attach('head', lidGeo(sd, true), faceM, false)); up.rotation.x = -OPEN; lids.push(up); up.add(new THREE.Mesh(lashGeo(sd), lashM));
      put(attach('head', lidGeo(sd, false), faceM, false));
    }
    /* small saccades: the eyes hold a point, then dart to a nearby one */
    eyes[0].onBeforeRender = () => {
      const t = performance.now() / 1000, dt = Math.min(0.05, t - (gaze.last || t)); gaze.last = t;
      if (t > gaze.next) { gaze.next = t + 0.6 + Math.random() * 2.4; gaze.tx = (Math.random() - 0.5) * 0.22; gaze.ty = (Math.random() - 0.5) * 0.1; }
      const k = 1 - Math.exp(-dt * 30); gaze.x += (gaze.tx - gaze.x) * k; gaze.y += (gaze.ty - gaze.y) * k; eyes.forEach((e) => e.rotation.set(gaze.y, gaze.x, 0));
    };
    const cav = new THREE.SphereGeometry(1, 20, 10); cav.scale(2.3, 1.0, 1.1); cav.translate(0, MOUTH_Y - 0.25, 8.2); cav.applyMatrix4(cmToHead(H));
    const cavM = new THREE.MeshStandardMaterial({ color: 0x1a0705, roughness: 0.6, side: THREE.BackSide }); mats.push(cavM); attach('head', cav, cavM, false);
    const tg = new THREE.CylinderGeometry(2.25, 2.25, 0.5, 18, 1, true, -0.75, 1.5); tg.translate(0, MOUTH_Y + 0.2, 8.8 - 2.25); tg.applyMatrix4(cmToHead(H));
    const tm = new THREE.MeshStandardMaterial({ color: 0xa89f92, roughness: 0.45 }); mats.push(tm); attach('head', tg, tm, false);
    mouth = new THREE.Mesh(new THREE.BufferGeometry(), skinM); mouth.visible = false; bones.head.add(mouth);
    bones.head.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).customDepthMaterial = pushDepth(); });
    const mo = mouth; head.onBeforeRender = () => { if (head.morphTargetInfluences) head.morphTargetInfluences[0] = c01((mo.scale.y - 0.0006) / 0.008); };
  }
  const handGeos: Record<string, THREE.BufferGeometry> = {}, hands = {} as Record<'L' | 'R', THREE.Mesh>;
  for (const sd of ['L', 'R'] as const) { const sg = sd === 'L' ? 1 : -1; (['relax', 'fist', 'open', 'point', 'grip', 'type', 'flat'] as HandPose[]).forEach((p) => { if (lod && p !== 'relax' && p !== 'grip' && p !== 'type' && p !== 'open') return; const g = handGeo(d.k, sg, p, female, lod); colorize(g, skinC); handGeos[sd + p] = g; }); hands[sd] = attach(('hand' + sd) as BoneName, handGeos[sd + 'relax'], skinM); }
  const shoe = O.shoe || 'formal';
  for (const sd of ['L', 'R'] as const) {
    attach(('foot' + sd) as BoneName, shoeGeo(d.k, shoe, 'rear', female), shoeM); attach(('toe' + sd) as BoneName, shoeGeo(d.k, shoe, 'toe', female), shoeM);
    if (O.sole) { const so = rbox(0.098 * d.k, 0.022 * d.k, 0.275 * d.k, 0.008 * d.k, 2); so.translate(0, -0.074 * d.k, 0.07 * d.k); attach(('foot' + sd) as BoneName, so, soleM, false); }
  }
  /* clothing details */
  const k = d.k, chest = (g: THREE.BufferGeometry, m: THREE.Material) => { g.translate(0, -d.chestY, 0); return attach('chest', g, m); };
  if (O.collarC || O.top === 'shirt' || O.top === 'shirtShort') {
    const cm = fab(O.collarC || O.topC), pos: number[] = [], idx: number[] = [], N = 24, gap = O.tie ? 0.1 : O.top === 'sweater' ? 0.5 : 0.62;
    for (let i = 0; i <= N; i++) { const a = -Math.PI + gap / 2 + (Math.PI * 2 - gap) * i / N, sx = Math.sin(a), cz = Math.cos(a); for (let j = 0; j < 2; j++) { const h = j ? 0.034 : 0, r = (0.067 - 0.006 * j) * k; pos.push(sx * r * 1.0, d.neckY - 0.005 * k + h * k, cz * r * 0.98 - 0.008 * k); } if (i < N) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } }
    const band = new THREE.BufferGeometry(); band.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); band.setIndex(idx); band.computeVertexNormals(); const bm = chest(band, cm); (bm.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    if (O.top === 'shirt' || O.top === 'shirtShort') [1, -1].forEach((sd) => { const g = new THREE.BufferGeometry(), y0 = d.neckY; g.setAttribute('position', new THREE.Float32BufferAttribute([sd * 0.01 * k, y0 + 0.024 * k, 0.06 * k, sd * 0.052 * k, y0 + 0.02 * k, 0.045 * k, sd * 0.032 * k, y0 - 0.035 * k, 0.083 * k], 3)); g.setIndex(sd > 0 ? [0, 2, 1] : [0, 1, 2]); g.computeVertexNormals(); const fm = chest(g, cm); (fm.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; });
  }
  if (O.tie) { const tm = fab(O.tie), s = new THREE.Shape(); s.moveTo(-0.012 * k, 0); s.lineTo(0.012 * k, 0); s.lineTo(0.03 * k, -0.33 * k); s.lineTo(0, -0.36 * k); s.lineTo(-0.03 * k, -0.33 * k); s.lineTo(-0.012 * k, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.006 * k, bevelEnabled: false }); const P = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < P.count; i++) { const y = -P.getY(i) / (0.36 * k); P.setZ(i, P.getZ(i) + k * (0.07 * Math.sin(Math.min(1, y * 2.2) * Math.PI / 2) - 0.012 * y)); } g.translate(0, d.neckY - 0.012 * k, 0.062 * k); g.deleteAttribute('uv'); g.computeVertexNormals(); chest(g, tm); const kn = new THREE.SphereGeometry(0.016 * k, 8, 6); kn.scale(1, 0.9, 0.6); kn.translate(0, d.neckY - 0.012 * k, 0.065 * k); chest(kn, tm); }
  if (O.belt) { const bm = clothMat(O.belt, 'leather', 0.5); mats.push(bm); const bt = new THREE.TorusGeometry(1, 0.13, 6, 32); bt.rotateX(Math.PI / 2); bt.scale(0.15 * k, 0.12 * k, 0.106 * k); bt.translate(0, 1.025 * k - d.pelvisY, -0.005 * k); attach('pelvis', bt, bm, false); const bk = rbox(0.045 * k, 0.03 * k, 0.012 * k, 0.003 * k); bk.translate(0, 1.025 * k - d.pelvisY, 0.11 * k); attach('pelvis', bk, new THREE.MeshStandardMaterial({ color: 0xb8b2a4, metalness: 0.9, roughness: 0.3 }), false); }
  if (O.top === 'hoodie') { const hm = topM, hg = new THREE.TorusGeometry(0.075 * k, 0.03 * k, 8, 18, Math.PI * 1.3); hg.rotateX(Math.PI / 2); hg.rotateZ(Math.PI); hg.rotateY(-Math.PI * 0.35); hg.translate(0, d.neckY - 0.02 * k, -0.03 * k); chest(hg, hm); [0.03, -0.03].forEach((x) => { const c = new THREE.CylinderGeometry(0.003 * k, 0.003 * k, 0.12 * k, 5); c.translate(x * k, d.neckY - 0.08 * k, 0.1 * k); chest(c, fab('#e9e6df')); }); }
  if (O.top === 'puffer') { const cg = new THREE.TorusGeometry(0.07 * k, 0.025 * k, 8, 20); cg.rotateX(Math.PI / 2); cg.translate(0, d.neckY + 0.01 * k, -0.008 * k); chest(cg, topM); }
  let pack: THREE.Object3D | null = null;
  if (O.pack) {
    const pm = clothMat(O.pack, 'fabric', 0.75); mats.push(pm); const big = !!O.packBig, w = (big ? 0.32 : 0.29) * k, h = (big ? 0.55 : 0.4) * k, dd = (big ? 0.22 : 0.14) * k;
    pack = new THREE.Group(); pack.position.set(0, (big ? 1.24 : 1.26) * k - d.chestY, -(O.top === 'puffer' ? 0.17 : 0.13) * k - dd / 2); bones.chest.add(pack);
    const add = (g: THREE.BufferGeometry, m: THREE.Material) => { const me = new THREE.Mesh(g, m); me.castShadow = true; pack!.add(me); rigid.push(me); return me; };
    add(rbox(w, h, dd, 0.045 * k, 3), pm); const pk = rbox(w * 0.8, h * 0.42, dd * 0.4, 0.03 * k, 2); pk.translate(0, -h * 0.18, -dd * 0.55); add(pk, pm);
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.8 }); mats.push(dark);
    if (big) { const roll = new THREE.CylinderGeometry(0.075 * k, 0.075 * k, w * 1.1, 14); roll.rotateZ(Math.PI / 2); roll.translate(0, h / 2 + 0.06 * k, 0); add(roll, clothMat('#3d6b45', 'fabric', 0.8)); }
    const fz = (O.top === 'puffer' ? 0.2 : O.top === 'hoodie' ? 0.14 : 0.13) * k, toPack = (x: number, y: number, z: number) => new THREE.Vector3(x, y - pack!.position.y, z - pack!.position.z);
    [1, -1].forEach((sd) => { const pts = [toPack(sd * 0.075 * k, 1.36 * k - d.chestY, -0.1 * k), toPack(sd * 0.1 * k, d.shY + 0.05 * k - d.chestY, -0.02 * k), toPack(sd * 0.11 * k, d.shY - 0.04 * k - d.chestY, fz * 0.8), toPack(sd * 0.12 * k, 1.2 * k - d.chestY, fz), toPack(sd * 0.135 * k, 1.06 * k - d.chestY, fz * 0.85), toPack(sd * 0.15 * k, 0.98 * k - d.chestY, fz * 0.2), toPack(sd * 0.12 * k, 1.0 * k - d.chestY, -0.12 * k)]; const st = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012 * k, 5, false); st.scale(1, 1, 1); add(st, dark); });
  }
  if (O.stole) {
    const [rc, gc] = O.stole, sm = fab(rc, 'fabric', 0.6), gm = fab(gc, 'fabric', 0.5);
    [1, -1].forEach((sd) => { const pts: THREE.Vector3[] = [new THREE.Vector3(sd * 0.05 * k, d.neckY + 0.005 * k, -0.06 * k), new THREE.Vector3(sd * 0.075 * k, d.neckY - 0.01 * k, 0.05 * k), new THREE.Vector3(sd * 0.085 * k, d.neckY - 0.12 * k, 0.165 * k), new THREE.Vector3(sd * 0.082 * k, 1.15 * k, 0.172 * k), new THREE.Vector3(sd * 0.08 * k, 0.95 * k, 0.19 * k)];
      const c = new THREE.CatmullRomCurve3(pts), N = 24, pos: number[] = [], idx: number[] = [];
      for (let i = 0; i <= N; i++) { const p = c.getPoint(i / N), tng = c.getTangent(i / N), sideV = new THREE.Vector3(1, 0, 0).sub(tng.clone().multiplyScalar(tng.x)).normalize(), w = 0.05 * k; pos.push(p.x - sideV.x * w, p.y - sideV.y * w, p.z - sideV.z * w + 0.012 * k, p.x + sideV.x * w, p.y + sideV.y * w, p.z + sideV.z * w + 0.012 * k); if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.translate(0, -d.chestY, 0); const me = attach('chest', g, sm); (me.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      const tr = rbox(0.1 * k, 0.03 * k, 0.006 * k, 0.002 * k); tr.translate(sd * 0.08 * k, 0.965 * k - d.chestY, 0.2 * k); attach('chest', tr, gm, false); });
  }
  let tassel: THREE.Object3D | null = null, cap: THREE.Object3D | null = null;
  if (O.mortar) {
    const cm = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7 }); mats.push(cm); cap = new THREE.Group(); cap.position.set(0, H.oy + H.Bh * 0.86, H.oz - 0.005); cap.rotation.x = -0.12; bones.head.add(cap); cap.userData.home = cap.position.clone(); cap.userData.homeRot = cap.rotation.clone();
    const board = new THREE.Mesh(rbox(0.25 * k, 0.012 * k, 0.25 * k, 0.003 * k), cm); board.position.y = 0.035 * k; board.rotation.y = Math.PI / 4 * 0; board.castShadow = true; cap.add(board); rigid.push(board);
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.083 * d.head, 0.08 * d.head, 0.06 * k, 20, 1, true), cm); sk.position.y = 0.0; sk.scale.set(1, 1, 1.15); cap.add(sk); rigid.push(sk);
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.008 * k, 8, 6), cm); btn.position.y = 0.043 * k; cap.add(btn);
    tassel = new THREE.Group(); tassel.position.set(0, 0.043 * k, 0); cap.add(tassel);
    const gold = new THREE.MeshStandardMaterial({ color: 0xd2a234, roughness: 0.55, metalness: 0.3 }); mats.push(gold);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0025 * k, 0.0025 * k, 0.125 * k, 4), gold); cord.position.set(0.0625 * k, 0, 0.0625 * k); cord.rotation.z = Math.PI / 2; cord.rotation.y = -Math.PI / 4; tassel.add(cord);
    const hang = new THREE.Group(); hang.position.set(0.12 * k, 0, 0.12 * k); tassel.add(hang); tassel.userData.hang = hang;
    const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.006 * k, 0.014 * k, 0.09 * k, 8), gold); tl.position.y = -0.05 * k; hang.add(tl);
  }
  if (O.beanie) { const bm = clothMat(O.beanie, 'knit', 0.95); mats.push(bm); const bg = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55); bg.scale(H.A * 1.12, H.Bh * 0.98, H.Cd * 1.08); bg.translate(0, H.oy + 0.012 * d.head, H.oz - 0.006 * d.head); attach('head', bg, bm); const rim = new THREE.TorusGeometry(1, 0.12, 6, 24); rim.rotateX(Math.PI / 2); rim.scale(H.A * 1.1, H.Bh * 0.9, H.Cd * 1.06); rim.translate(0, H.oy + 0.035 * d.head, H.oz - 0.008 * d.head); attach('head', rim, bm); }
  if (O.cap) { const cm = clothMat(O.cap, 'fabric', 0.9); mats.push(cm); const bg = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5); bg.scale(H.A * 1.1, H.Bh * 0.8, H.Cd * 1.06); bg.translate(0, H.oy + 0.035 * d.head, H.oz - 0.004); attach('head', bg, cm); const br = new THREE.CylinderGeometry(0.07 * k, 0.07 * k, 0.006 * k, 16, 1, false, -Math.PI / 2, Math.PI); br.scale(1, 1, 0.9); br.translate(0, H.oy + 0.04 * d.head, H.oz + H.Cd * 0.85); attach('head', br, cm); }
  if (O.vestC) { const vm = fab(O.vestC, 'fabric', 0.7); const vt = skinTube(torsoRings(d, spec, 0.02, 0, 12).filter((r) => r.y >= 1.0 * d.k && r.y <= 1.42 * d.k), torsoW(d), { seg: 20, sub: 1, capBot: false, capTop: false }); const vs = new THREE.SkinnedMesh(vt, vm); vs.castShadow = true; vs.frustumCulled = false; group.add(vs); vs.bind(skeleton, new THREE.Matrix4()); skinned.push(vs); }
  let laptop: THREE.Object3D | null = null;
  if (O.laptop) { const lm = new THREE.MeshStandardMaterial({ color: 0xa4abb4, roughness: 0.32, metalness: 0.75 }); mats.push(lm); laptop = new THREE.Mesh(rbox(0.018 * k, 0.23 * k, 0.32 * k, 0.006 * k), lm); laptop.position.set(-0.035 * k, -0.07 * k, 0.04 * k); laptop.castShadow = true; laptop.visible = false; bones.handL.add(laptop); }
  return { group, bones, skeleton, d, spec, mats, parts: { skinned, rigid, hands, handGeos, lids, mouth, tassel, pack, cap, laptop } };
}

export function setHand(r: Rig, side: 'L' | 'R', pose: HandPose) { const g = r.parts.handGeos[side + pose] || r.parts.handGeos[side + 'relax']; if (r.parts.hands[side].geometry !== g) r.parts.hands[side].geometry = g; }

/* ---- bake a posed rig into one vertex-coloured geometry for instanced crowds; tint channels: 0 fixed, 1 top, 2 bottom, 3 skin, 4 hair ---- */
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _mtx = new THREE.Matrix4(), _sum = new THREE.Matrix4();
export function bakeRig(r: Rig, tintOf: (m: THREE.Material) => number, partOf: (b: BoneName) => number) {
  r.group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(r.group.matrixWorld).invert(), boneM = r.skeleton.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld).multiply(r.skeleton.boneInverses[i]));
  const outs: THREE.BufferGeometry[] = [];
  const colorOf = (m: THREE.Material) => { const mm = m as THREE.MeshStandardMaterial; return mm.userData.skin ? new THREE.Color(1, 1, 1) : mm.color.clone(); };
  for (const sm of r.parts.skinned) {
    const g = sm.geometry, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex as THREE.BufferAttribute, SW = g.attributes.skinWeight as THREE.BufferAttribute, n = P.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), part = new Float32Array(n), tint = new Float32Array(n).fill(tintOf(sm.material as THREE.Material)), col = new Float32Array(n * 3), base = colorOf(sm.material as THREE.Material), vc = g.attributes.color;
    for (let i = 0; i < n; i++) {
      _sum.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); let best = 0, bw = -1;
      for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (!w) continue; const bi = SI.getComponent(i, j); const e = boneM[bi].elements, s = _sum.elements; for (let q = 0; q < 16; q++) s[q] += e[q] * w; if (w > bw) { bw = w; best = bi; } }
      _v.fromBufferAttribute(P, i).applyMatrix4(_sum); _n.fromBufferAttribute(N, i).transformDirection(_sum);
      pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z; nor[i * 3] = _n.x; nor[i * 3 + 1] = _n.y; nor[i * 3 + 2] = _n.z; part[i] = partOf(BONES[best]);
      const cr = vc ? vc.getX(i) : 1, cg = vc ? vc.getY(i) : 1, cb = vc ? vc.getZ(i) : 1; col[i * 3] = base.r * cr; col[i * 3 + 1] = base.g * cg; col[i * 3 + 2] = base.b * cb;
    }
    const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); o.setAttribute('color', new THREE.BufferAttribute(col, 3)); o.setAttribute('aPart', new THREE.BufferAttribute(part, 1)); o.setAttribute('aTint', new THREE.BufferAttribute(tint, 1)); o.setIndex(g.index!.clone()); outs.push(o.toNonIndexed());
  }
  for (const me of r.parts.rigid) {
    if (!me.visible || !me.parent?.visible) continue; let vis = true; me.traverseAncestors((a) => { if (!a.visible) vis = false; }); if (!vis) continue;
    const g = me.geometry.index ? me.geometry.toNonIndexed() : me.geometry.clone(); _mtx.multiplyMatrices(inv, me.matrixWorld); g.applyMatrix4(_mtx);
    const n = g.attributes.position.count, base = colorOf(me.material as THREE.Material), vc = g.attributes.color, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = base.r * (vc ? vc.getX(i) : 1); col[i * 3 + 1] = base.g * (vc ? vc.getY(i) : 1); col[i * 3 + 2] = base.b * (vc ? vc.getZ(i) : 1); }
    let b: THREE.Object3D | null = me.parent; while (b && !(b as THREE.Bone).isBone) b = b.parent;
    if (!g.attributes.normal) g.computeVertexNormals(); const o = new THREE.BufferGeometry(); o.setAttribute('position', g.attributes.position); o.setAttribute('normal', g.attributes.normal);
    o.setAttribute('color', new THREE.BufferAttribute(col, 3)); o.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(partOf(((b as THREE.Bone)?.name || 'root') as BoneName)), 1)); o.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(n).fill(tintOf(me.material as THREE.Material)), 1)); outs.push(o);
  }
  return mergeGeometries(outs);
}
export function disposeRig(r: Rig) { r.group.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); }); Object.values(r.parts.handGeos).forEach((g) => g.dispose()); r.mats.forEach((m) => m.dispose()); }
export { lathe };
