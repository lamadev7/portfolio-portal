import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Base, Land } from "./assets";
import type { ClothSpec } from "./materials";
import { clip, maskBody, mergeSkinned, rigid, shell, weld, type WMesh } from "./mesh";

/* Garments are fields over the bind-pose (T-pose) body: f >= 0 is covered. Shells offset the clipped skin; skirts are generated tubes
   blended between pelvis and thighs; props are rigid parts skinned to one bone. Everything merges into one skinned mesh with material slots. */

type V = THREE.Vector3;
export type Field = (p: V, L: Land) => number;
export type Thick = (p: V, f: number, L: Land) => number;

export type Piece =
  | { k: "shell"; slot: string; field: Field; t: Thick; hide?: boolean; smooth?: number; floorY?: number; rim?: boolean }
  | { k: "tube"; slot: string; y0: (L: Land) => number; y1: (L: Land) => number; flare: number; pad?: number; open?: boolean }
  | { k: "rigid"; slot: string; bone: string; geo: (L: Land, ex: Extent) => THREE.BufferGeometry; tag?: string }
  | { k: "shoe"; slot: string; style: "dress" | "sneaker" | "boot" | "sandal" };

export interface OutfitDef {
  pal: Record<string, ClothSpec>;
  pieces: Piece[];
  hair: string | null;
  brows?: boolean;
  beard?: boolean;
}

export interface Extent { at(y: number): { x: number; z0: number; z1: number; cz: number }; front(x: number, y: number): number; skin(x: number, y: number, z: number): [number, number][] }

const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const front = (p: V) => ss(-0.02, 0.05, p.z);
const arm = (p: V, L: Land) => ss(L.shX - 0.05, L.shX + 0.02, Math.abs(p.x));

/* ---------- fields ---------- */

/** crew / collar neckline: low in front, rises away from the neck so shoulders and arms stay inside */
const neckline = (p: V, L: Land, drop = 0.012, v = 0) => L.neckY + 0.005 - drop * front(p) - v * front(p) * ss(0.06, 0, Math.abs(p.x)) + Math.max(0, Math.abs(p.x) - 0.085) * 4;

export const F = {
  top: (hemY: (L: Land) => number, sleeveX: (L: Land) => number, drop = 0.012, v = 0): Field => (p, L) => Math.min(p.y - hemY(L), neckline(p, L, drop, v) - p.y, sleeveX(L) - Math.abs(p.x)),
  highTop: (hemY: (L: Land) => number, sleeveX: (L: Land) => number): Field => (p, L) => Math.min(p.y - hemY(L), (L.chinY - 0.012 + Math.max(0, Math.abs(p.x) - 0.08) * 4 - 0.02 * front(p) * 0) - p.y, sleeveX(L) - Math.abs(p.x)),
  legs: (topY: (L: Land) => number, hemY: (L: Land) => number): Field => (p, L) => Math.min(topY(L) - p.y, p.y - hemY(L), L.wrX - 0.05 - Math.abs(p.x)),
  band: (y0: (L: Land) => number, y1: (L: Land) => number, xMax = 0.3): Field => (p, L) => Math.min(p.y - y0(L), y1(L) - p.y, xMax - Math.abs(p.x)),
  feet: (topY: (L: Land) => number): Field => (p, L) => Math.min(topY(L) - p.y, 0.5 - Math.abs(p.x)),
  collar: (h = 0.03): Field => (p, L) => Math.min(p.y - (L.neckY - 0.012 - 0.01 * front(p)), L.neckY + h - 0.014 * front(p) - p.y, 0.075 - Math.abs(p.x), p.z > 0.0 ? Math.abs(p.x) - 0.03 + (p.y - L.neckY) * 0.4 : 1),
  cap: (lift = 0.012): Field => (p, L) => Math.min(p.y - (L.browY + lift - 0.05 * ss(0.0, -0.09, p.z) - 0.015 * ss(0.05, 0.08, Math.abs(p.x))), 1),
  straps: (x0 = 0.095, w = 0.022): Field => (p, L) => Math.min(w - Math.abs(Math.abs(p.x) - x0 - 0.01 * front(p)), p.y - (L.chestY - 0.13), L.shX - 0.02 - Math.abs(p.x)),
  sash: (): Field => (p, L) => { const d = (p.y - L.chestY) - (p.x * 0.9) * (p.z > 0 ? 1 : -1); return Math.min(0.07 - Math.abs(d), p.y - L.waistY + 0.05, L.shX + 0.03 - Math.abs(p.x)); },
  headband: (): Field => (p, L) => Math.min(0.016 - Math.abs(p.y - (L.browY + 0.02) - 0.03 * ss(0, -0.1, p.z)), p.y - L.eyeY),
  harness: (): Field => (p, L) => {
    const strap = Math.min(0.02 - Math.abs(Math.abs(p.x) - 0.1), p.y - L.waistY + 0.02, L.shX - 0.03 - Math.abs(p.x));
    const chest = Math.min(0.016 - Math.abs(p.y - (L.chestY - 0.03)), 0.16 - Math.abs(p.x), p.z);
    const leg = Math.min(0.022 - Math.abs(p.y - (L.crotchY - 0.04) - 0.06 * ss(0.05, -0.1, p.z)), 0.24 - Math.abs(p.x), Math.abs(p.x) - 0.03);
    const waist = Math.min(0.025 - Math.abs(p.y - L.waistY), 0.3 - Math.abs(p.x));
    return Math.max(strap, chest, leg, waist);
  },
};

/* ---------- thickness profiles ---------- */

export const T = {
  shirt: (base = 0.007, hemBand = 0.003): Thick => (p, f, L) => base + 0.006 * arm(p, L) * ss(L.shX, L.elX, Math.abs(p.x)) + hemBand * (1 - ss(0.0, 0.018, f)) + 0.006 * ss(L.waistY + 0.04, L.hipY - 0.04, p.y) * (1 - arm(p, L)),
  pants: (base = 0.011): Thick => (p, f, L) => base + 0.012 * ss(L.kneeY, L.ankleY, p.y) + 0.009 * ss(L.waistY - 0.07, L.waistY - 0.03, p.y) + 0.004 * ss(L.hipY - 0.02, L.crotchY, p.y),
  down: (): Thick => (p, f, L) => {
    const ax = Math.abs(p.x), a = arm(p, L);
    const q = a > 0.5 ? (ax - L.shX) / 0.08 : (p.y - L.waistY) / 0.09;
    return 0.026 + 0.009 * (0.5 - 0.5 * Math.cos(q * Math.PI * 2)) + 0.004 * (1 - ss(0, 0.02, f)) - 0.008 * a * ss(L.elX + 0.08, L.wrX, ax);
  },
  gown: (): Thick => (p, f, L) => 0.02 + 0.07 * ss(L.elX - 0.05, L.wrX - 0.02, Math.abs(p.x)) + 0.012 * (1 - arm(p, L)) * ss(L.chestY, L.hipY, p.y),
  c: (v: number): Thick => () => v,
  shoe: (v = 0.009): Thick => (p) => v + 0.006 * ss(0.03, 0.12, p.z),
};

/* ---------- rigid props (bind space) ---------- */

/** mirrored pair of strips following the body's front surface between y0 and y1 (x by u = 0 bottom .. 1 top); optional per-height skin weights */
function ribbons(ex: Extent, y0: number, y1: number, xAt: (u: number) => number, w: number, off: number) {
  const N = 12, pos: number[] = [], idx: number[] = [], si: number[] = [], sw: number[] = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3, Z: number[] = [];
    for (let i = N; i >= 0; i--) {
      const u = i / N, y = y0 + (y1 - y0) * u, x = side * xAt(u);
      const zs = Math.max(ex.front(x - w * 0.7, y), ex.front(x + w * 0.7, y), ex.front(x, y)) + off;
      Z[i] = i === N ? zs : Math.max(zs, Z[i + 1] - 0.12 * ((y1 - y0) / N));
    }
    for (let i = 0; i <= N; i++) {
      const u = i / N, y = y0 + (y1 - y0) * u, x = side * xAt(u), z = Z[i];
      pos.push(x - w, y, z, x + w, y, z);
      const k = ex.skin(x, y, z - off);
      for (let r = 0; r < 2; r++) for (let j = 0; j < 4; j++) { si.push(k[j][0]); sw.push(k[j][1]); }
    }
    for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

const rbox = (w: number, h: number, d: number, r = 0.01) => new RoundedBoxGeometry(w, h, d, 2, r).toNonIndexed();
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
const merge = (gs: THREE.BufferGeometry[]) => { const ok = gs.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k); return n; }); return mergeGeometries(ok)!; };

export const PROP = {
  backpack: (w: number, h: number, d: number, yOff = -0.06) => (L: Land, ex: Extent) => {
    const y = L.chestY + yOff, e = ex.at(y), z = e.z0 - d / 2 + 0.012;
    return merge([at(rbox(w, h, d, 0.045), 0, y, z), at(rbox(w * 0.82, h * 0.42, 0.05, 0.02), 0, y - h * 0.18, z - d / 2 - 0.012), at(rbox(w * 0.9, 0.07, d * 0.9, 0.02), 0, y + h / 2 - 0.02, z + 0.004)]);
  },
  trekPack: () => (L: Land, ex: Extent) => {
    const y = L.chestY - 0.08, e = ex.at(y), d = 0.24, z = e.z0 - d / 2 + 0.01;
    const roll = new THREE.CylinderGeometry(0.07, 0.07, 0.42, 14).rotateZ(Math.PI / 2);
    return merge([at(rbox(0.36, 0.58, d, 0.07), 0, y + 0.02, z), at(rbox(0.3, 0.2, 0.06, 0.03), 0, y - 0.06, z - d / 2 - 0.02), at(roll, 0, y + 0.36, z - 0.02), at(rbox(0.36, 0.06, 0.1, 0.02), 0, L.hipY + 0.04, e.z0 - 0.02)]);
  },
  doko: () => (L: Land, ex: Extent) => {
    const y = L.chestY - 0.05, e = ex.at(y), z = e.z0 - 0.2;
    const cone = new THREE.CylinderGeometry(0.26, 0.11, 0.7, 18, 4, true);
    const rim = new THREE.TorusGeometry(0.26, 0.012, 6, 24).rotateX(Math.PI / 2);
    const load = new THREE.SphereGeometry(0.24, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1);
    return merge([at(cone, 0, y + 0.08, z, 0.12), at(rim, 0, y + 0.43, z - 0.04, 0.12), at(load, 0, y + 0.43, z - 0.04, 0.12)]);
  },
  laptop: () => (L: Land) => at(rbox(0.235, 0.018, 0.33, 0.005), L.wrX + 0.13, L.armY - 0.035, -0.05),
  /** ribbon laid over the chest surface from both sides of the neck down to the card */
  lanyard: (off = 0.02) => (L: Land, ex: Extent) => ribbons(ex, L.chestY - 0.05, L.neckY - 0.03, (u) => 0.004 + 0.05 * u * u * (3 - 2 * u), 0.0075, off),
  /** academic stole: two bands from the neck to the hips, over the gown; skinned chest -> pelvis so it rides the torso */
  stole: (w: number, off: number) => (L: Land, ex: Extent) => ribbons(ex, L.hipY - 0.07, L.neckY - 0.005, (u) => 0.072 - 0.012 * u, w, off),
  card: () => (L: Land, ex: Extent) => at(rbox(0.056, 0.084, 0.004, 0.003), 0, L.chestY - 0.095, ex.front(0, L.chestY - 0.095) + 0.02),
  buckle: () => (L: Land, ex: Extent) => { const e = ex.at(L.waistY + 0.015); return at(rbox(0.05, 0.034, 0.008, 0.004), 0, L.waistY + 0.015, e.z1 + 0.024); },
  mortarboard: () => (L: Land) => {
    const y = L.top - 0.03;
    const cap = new THREE.CylinderGeometry(0.098, 0.1, 0.075, 20).scale(1, 1, 1.12);
    const board = rbox(0.26, 0.012, 0.26, 0.003);
    const button = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10);
    const cord = new THREE.CylinderGeometry(0.003, 0.003, 0.13, 5).rotateZ(Math.PI / 2);
    const tassel = new THREE.CylinderGeometry(0.008, 0.014, 0.08, 8);
    return merge([at(cap, 0, y - 0.005, -0.01, -0.12), at(board, 0, y + 0.035, -0.012, -0.12), at(button, 0, y + 0.045, -0.012), at(cord, 0.065, y + 0.044, -0.012), at(tassel, 0.13, y + 0.0, -0.012)]);
  },
  topi: () => (L: Land) => { const g = new THREE.CylinderGeometry(0.088, 0.096, 0.1, 18).scale(1, 1, 1.15); return at(g, 0, L.top - 0.025, -0.012, 0.1); },
  pole: (side: 1 | -1) => (L: Land) => {
    const a = (55 * Math.PI) / 180, dir = new THREE.Vector3(side * Math.sin(a), 0, Math.cos(a));
    const g = new THREE.CylinderGeometry(0.009, 0.006, 1.15, 6);
    const grip = new THREE.CylinderGeometry(0.016, 0.014, 0.13, 8).translate(0, 0.52, 0);
    const basket = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 10).translate(0, -0.48, 0);
    const m = merge([g, grip, basket]);
    m.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir)));
    return m.translate(side * (L.wrX + 0.07) + dir.x * 0.45, L.armY - 0.03, -0.03 + dir.z * 0.45);
  },
  seat: () => (L: Land, ex: Extent) => {
    const e = ex.at(L.crotchY);
    const pod = rbox(0.4, 0.5, 0.2, 0.08);
    const seatB = rbox(0.36, 0.06, 0.3, 0.03);
    return merge([at(pod, 0, L.hipY - 0.02, e.z0 - 0.12, -0.12), at(seatB, 0, L.crotchY - 0.05, e.z0 + 0.02, 0.15)]);
  },
  carabiners: () => (L: Land, ex: Extent) => {
    const e = ex.at(L.chestY - 0.05);
    const t = () => new THREE.TorusGeometry(0.022, 0.006, 6, 12);
    return merge([at(t(), 0.13, L.chestY - 0.07, e.cz + 0.06, 0, Math.PI / 2), at(t(), -0.13, L.chestY - 0.07, e.cz + 0.06, 0, Math.PI / 2)]);
  },
};

/* ---------- builder ---------- */

interface Ctx { wm: WMesh; L: Land; ex: Extent; body: THREE.BufferGeometry }
const ctxCache = new WeakMap<Base, Ctx[]>();

function ctx(b: Base, lod: number): Ctx {
  let arr = ctxCache.get(b);
  if (!arr) { arr = []; ctxCache.set(b, arr); }
  if (!arr[lod]) {
    const body = b.body[Math.min(lod, b.body.length - 1)];
    const wm = weld(body);
    const ex: Extent = {
      at(y: number) {
        let x = 0, z0 = 0, z1 = 0, n = 0, cz = 0;
        for (let i = 0; i < wm.n; i++) { const py = wm.P[i * 3 + 1], px = wm.P[i * 3]; if (Math.abs(py - y) < 0.02 && Math.abs(px) < b.L.shX - 0.03) { const pz = wm.P[i * 3 + 2]; x = Math.max(x, Math.abs(px)); z0 = Math.min(z0, pz); z1 = Math.max(z1, pz); cz += pz; n++; } }
        return { x, z0, z1, cz: n ? cz / n : 0 };
      },
      front(x: number, y: number) {
        for (let r = 0.018; r < 0.2; r *= 1.6) {
          let z = -1;
          for (let i = 0; i < wm.n; i++) { const pz = wm.P[i * 3 + 2]; if (pz > z && Math.abs(wm.P[i * 3] - x) < r && Math.abs(wm.P[i * 3 + 1] - y) < r && Math.abs(wm.P[i * 3]) < b.L.shX - 0.03) z = pz; }
          if (z > -1) return z;
        }
        return 0;
      },
      skin(x: number, y: number, z: number) {
        let best = 0, bd = Infinity;
        for (let i = 0; i < wm.n; i++) { const d = (wm.P[i * 3] - x) ** 2 + (wm.P[i * 3 + 1] - y) ** 2 + (wm.P[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
        return [0, 1, 2, 3].map((j) => [wm.J[best * 4 + j], wm.W[best * 4 + j]] as [number, number]);
      },
    };
    arr[lod] = { wm, L: b.L, ex, body };
  }
  return arr[lod];
}

const _p = new THREE.Vector3();
function evalField(c: Ctx, f: Field) {
  const out = new Float32Array(c.wm.n);
  for (let i = 0; i < c.wm.n; i++) { _p.set(c.wm.P[i * 3], c.wm.P[i * 3 + 1], c.wm.P[i * 3 + 2]); out[i] = f(_p, c.L); }
  return out;
}

function tube(b: Base, c: Ctx, pc: Extract<Piece, { k: "tube" }>, lod: number) {
  const q = Math.min(lod, 2), L = c.L, y0 = pc.y0(L), y1 = pc.y1(L), S = [40, 24, 14][q], R = [12, 7, 4][q];
  const e0 = c.ex.at(y0), e1 = c.ex.at(Math.max(y0 - 0.12, L.crotchY));
  const pad = pc.pad ?? 0.03;
  const rx0 = Math.max(e0.x, e1.x) + pad, rz0 = Math.max(-e0.z0, e0.z1, -e1.z0, e1.z1) + pad * 0.8, cz = (e0.z0 + e0.z1) / 2;
  const I = b.index, pel = I.pelvis, tl = I.thigh_l, tr = I.thigh_r;
  const pos: number[] = [], si: number[] = [], sw: number[] = [], idx: number[] = [];
  for (let r = 0; r <= R; r++) {
    const u = r / R, y = y0 + (y1 - y0) * u, fl = 1 + pc.flare * u * u * 0.6 + pc.flare * u * 0.4;
    for (let s = 0; s <= S; s++) {
      const th = (s / S) * Math.PI * 2, sx = Math.sin(th), cxz = Math.cos(th);
      const ripple = 1 + 0.025 * u * Math.sin(th * 9 + u * 2);
      pos.push(sx * rx0 * fl * ripple, y, cz + cxz * rz0 * fl * ripple);
      const legW = 0.82 * ss(0, 0.85, u), sl = ss(-0.55, 0.55, sx);
      const w = [1 - legW, legW * sl, legW * (1 - sl)];
      si.push(pel, tl, tr, 0); sw.push(w[0], w[1], w[2], 0);
    }
  }
  for (let r = 0; r < R; r++) for (let s = 0; s < S; s++) { const a = r * (S + 1) + s, d = a + S + 1; idx.push(a, a + 1, d, a + 1, d + 1, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** a shoe lofted along the foot (heel -> toe), flat sole on the ground, skinned foot -> ball */
function shoe(b: Base, c: Ctx, side: 1 | -1, style: "dress" | "sneaker" | "boot" | "sandal", lod: number) {
  const sx = side > 0 ? "l" : "r", I = b.index;
  const F = new THREE.Vector3().setFromMatrixPosition(b.bindWorld[I["foot_" + sx]]), Bl = new THREE.Vector3().setFromMatrixPosition(b.bindWorld[I["ball_" + sx]]);
  let z0 = 9, z1 = -9, x0 = 9, x1 = -9;
  for (let i = 0; i < c.wm.n; i++) { const x = c.wm.P[i * 3], y = c.wm.P[i * 3 + 1], z = c.wm.P[i * 3 + 2]; if (y < 0.07 && Math.sign(x) === side && Math.abs(x - F.x) < 0.09) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
  const sneaker = style === "sneaker", boot = style === "boot", sandal = style === "sandal";
  const heel = z0 - (sandal ? 0.008 : 0.014), toe = z1 + (sandal ? 0.01 : sneaker ? 0.024 : 0.02), len = toe - heel, Wd = x1 - x0 + (sandal ? 0.012 : 0.026), cx = (x0 + x1) / 2;
  const k = len / 0.29, ank = c.L.ankleY;
  const hp = (u: number) => sandal ? 0.014 : boot ? (u < 0.42 ? ank + 0.1 - u * 0.05 : 0.0) + (u >= 0.42 ? (0.085 - (u - 0.42) * 0.07) * k : 0) : (u < 0.38 ? ank - 0.004 + u * 0.03 : (0.082 - (u - 0.38) * 0.065) * k) + (sneaker ? 0.006 : 0);
  const q = Math.min(lod, 2), NU = [24, 12, 8][q], NV = [18, 10, 7][q], uB = (Bl.z - heel) / len;
  const pos: number[] = [], si: number[] = [], sw: number[] = [], idx: number[] = [];
  const fi = I["foot_" + sx], bi = I["ball_" + sx];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, z = heel + len * u;
    const cap = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 4)), 0.5);
    const w = Wd * (0.8 + 0.2 * ss(0.05, 0.6, u)) * (0.25 + 0.75 * cap), h = hp(u) * (0.55 + 0.45 * cap);
    const cxu = cx - side * 0.006 * ss(0.5, 1, u);
    const wb = ss(uB - 0.12, uB + 0.04, u);
    for (let j = 0; j <= NV; j++) {
      const th = (j / NV) * Math.PI * 2, cc = Math.cos(th), sn = Math.sin(th);
      const px = cxu + (w / 2) * Math.sign(cc) * Math.pow(Math.abs(cc), 0.55);
      const py = sn < 0 ? (h * 0.12) * (1 - Math.pow(Math.abs(sn), 0.25)) : (h * 0.12) + (h * 0.88) * Math.pow(sn, 0.75);
      pos.push(px, Math.max(-0.002, py - 0.002), z);
      si.push(fi, bi, 0, 0); sw.push(1 - wb, wb, 0, 0);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, d = a + NV + 1; idx.push(a, d, a + 1, a + 1, d, d + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface Built {
  body: THREE.BufferGeometry;
  cloth: THREE.BufferGeometry | null;
  slotKeys: string[];
  tagged: { tag: string; geo: THREE.BufferGeometry; bone: number; slot: string }[];
}

const builtCache = new Map<string, Built>();

/** outfit -> masked body + one merged skinned cloth geometry (slots by palette key) + separately-toggled props */
export function buildOutfit(b: Base, def: OutfitDef, lod: number, key?: string, mergeTagged = false): Built {
  const ck = key ? `${b.id}|${lod}|${key}|${mergeTagged ? 1 : 0}` : "";
  if (ck && builtCache.has(ck)) return builtCache.get(ck)!;
  const c = ctx(b, lod);
  const slotKeys = Object.keys(def.pal);
  const parts: { g: THREE.BufferGeometry; slot: number }[] = [];
  const hides: Float32Array[] = [];
  const tagged: Built["tagged"] = [];
  for (const pc of def.pieces) {
    const slot = slotKeys.indexOf(pc.slot);
    if (pc.k === "shell") {
      const f = evalField(c, pc.field);
      if (pc.hide) hides.push(f);
      const r = clip(c.wm, f);
      if (!r.n) continue;
      const g = shell(r, { t: (i, p, fv) => pc.t(p, fv, c.L), smooth: lod ? Math.min(lod === 1 ? 5 : 2, pc.smooth ?? 6) : pc.smooth ?? 6, rim: pc.rim, wsmooth: lod > 1 ? 1 : 2 });
      if (pc.floorY !== undefined) { const P = g.getAttribute("position"); for (let i = 0; i < P.count; i++) if (P.getY(i) < pc.floorY) P.setY(i, pc.floorY); g.computeVertexNormals(); }
      parts.push({ g, slot });
    } else if (pc.k === "tube") {
      parts.push({ g: tube(b, c, pc, lod), slot });
      const y0 = pc.y0(c.L) - 0.03, y1 = pc.y1(c.L) + 0.05;
      hides.push(evalField(c, (p, L) => Math.min(y0 - p.y, p.y - y1, L.wrX - 0.1 - Math.abs(p.x))));
    } else if (pc.k === "shoe") {
      parts.push({ g: shoe(b, c, 1, pc.style, lod), slot }, { g: shoe(b, c, -1, pc.style, lod), slot });
      if (pc.style !== "sandal") hides.push(evalField(c, F.feet((L) => (pc.style === "boot" ? L.ankleY + 0.08 : L.ankleY + 0.035))));
    } else {
      const g0 = pc.geo(c.L, c.ex);
      if (!g0.getAttribute("normal")) g0.computeVertexNormals();
      const g = g0.getAttribute("skinIndex") ? g0 : rigid(g0, b.index[pc.bone]);
      if (pc.tag && !mergeTagged) tagged.push({ tag: pc.tag, geo: g, bone: b.index[pc.bone], slot: pc.slot });
      else parts.push({ g, slot });
    }
  }
  const body = hides.length ? maskBody(c.body, c.wm, hides, lod ? 0.006 : 0.01) : c.body;
  const out: Built = { body, cloth: parts.length ? mergeSkinned(parts) : null, slotKeys, tagged };
  if (ck) builtCache.set(ck, out);
  return out;
}
