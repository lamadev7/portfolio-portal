import * as THREE from "three";
import type { V3 } from "../../contracts";
import { canvasTex, blot, grain, hash } from "./tex";
import type { SceneKit } from "./scene";

/* procedurally sculpted, skinned wildlife: an Asian elephant and a greater one-horned rhino. Bodies are lofted from
   cross-sections, bound to a small skeleton, and walked with a stepping gait: planted feet stay fixed in the world
   (two-bone IK per leg), swing feet arc to the next footfall, body bobs with the cycle. */

type W = [number, number, number];
interface Part { pos: number[]; uv: number[]; idx: number[]; skin: number[]; wt: number[]; col: number[] }
const newPart = (): Part => ({ pos: [], uv: [], idx: [], skin: [], wt: [], col: [] });

/** lofted surface: rings of `seg` vertices; ring(i) returns world points; weight(i, j) returns [boneA, boneB, wB] */
function loftRings(p: Part, rings: THREE.Vector3[][], uvLen: number[], weight: (i: number) => W, color: (i: number, j: number) => number, capStart = true, capEnd = true) {
  const base = p.pos.length / 3, seg = rings[0].length, C = new THREE.Color();
  rings.forEach((r, i) => r.forEach((v, j) => {
    p.pos.push(v.x, v.y, v.z); p.uv.push((j / seg) * 2.4, uvLen[i]);
    const [a, b, w] = weight(i); p.skin.push(a, b, 0, 0); p.wt.push(1 - w, w, 0, 0); C.set(color(i, j)); p.col.push(C.r, C.g, C.b);
  }));
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = base + i * seg + j, b = base + i * seg + ((j + 1) % seg), c = a + seg, d = b + seg; p.idx.push(a, b, c, b, d, c);
  }
  const cap = (ri: number, flip: boolean) => {
    const r = rings[ri], ctr = r.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / seg), ci = p.pos.length / 3;
    p.pos.push(ctr.x, ctr.y, ctr.z); p.uv.push(0, uvLen[ri]); const [a, b, w] = weight(ri); p.skin.push(a, b, 0, 0); p.wt.push(1 - w, w, 0, 0); C.set(color(ri, 0)); p.col.push(C.r, C.g, C.b);
    for (let j = 0; j < seg; j++) { const a2 = base + ri * seg + j, b2 = base + ri * seg + ((j + 1) % seg); flip ? p.idx.push(ci, a2, b2) : p.idx.push(ci, b2, a2); }
  };
  if (capStart) cap(0, false); if (capEnd) cap(rings.length - 1, true);
}
/** superellipse ring in the plane ⟂ to `dir` around centre c */
function ring(c: THREE.Vector3, dir: THREE.Vector3, rx: number, ryTop: number, ryBot: number, seg: number, n = 2.4, upHint = new THREE.Vector3(0, 1, 0)) {
  const d = dir.clone().normalize(), side = new THREE.Vector3().crossVectors(upHint, d); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
  const up = new THREE.Vector3().crossVectors(d, side).normalize(), out: THREE.Vector3[] = [];
  for (let j = 0; j < seg; j++) {
    const a = (j / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), ex = 2 / n;
    const x = rx * Math.sign(ca) * Math.abs(ca) ** ex, y = (sa > 0 ? ryTop : ryBot) * Math.sign(sa) * Math.abs(sa) ** ex;
    out.push(c.clone().addScaledVector(side, x).addScaledVector(up, y));
  }
  return out;
}
/** tapered tube along a polyline */
function limbRings(pts: THREE.Vector3[], radius: (t: number) => [number, number], seg: number, upHint = new THREE.Vector3(0, 0, 1)) {
  const rings: THREE.Vector3[][] = [], lens: number[] = []; let L = 0;
  pts.forEach((p, i) => {
    if (i) L += p.distanceTo(pts[i - 1]);
    const dir = (i < pts.length - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1])).normalize();
    const t = i / (pts.length - 1), [rx, ry] = radius(t); rings.push(ring(p, dir, rx, ry, ry, seg, 2.1, upHint)); lens.push(L);
  });
  return { rings, lens };
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function skinTex(kind: "elephant" | "rhino") {
  return canvasTex("skin-" + kind, 512, 512, (g, w, h) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    blot(g, w, h, 60, kind.length, "0,0,0", 0.03, 0.08, 20, 90); grain(g, w, h, 20000, 7, 0.1);
    g.strokeStyle = "rgba(0,0,0,0.35)";
    if (kind === "elephant") { for (let i = 0; i < 900; i++) { g.lineWidth = 0.6 + hash(i, 3) * 1.4; g.beginPath(); let x = hash(i, 1) * w, y = hash(i, 2) * h; g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (hash(i * 4 + s, 5) - 0.5) * 30; y += (hash(i * 4 + s, 6) - 0.5) * 14; g.lineTo(x, y); } g.stroke(); } }
    else { for (let i = 0; i < 2600; i++) { const x = hash(i, 11) * w, y = hash(i, 12) * h, r = 2 + hash(i, 13) * 4; g.fillStyle = `rgba(0,0,0,${(0.12 + hash(i, 14) * 0.2).toFixed(2)})`; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, 6.283); g.fill(); } }
  }, true, true);
}

export interface AnimalSpec {
  kind: "elephant" | "rhino";
  body: { z0: number; z1: number; top: (z: number) => number; bot: (z: number) => number; half: (z: number) => number };
  legs: { x: number; z: number; hipY: number; l1: number; l2: number; foot: number; r: number }[];
  color: number; seg: number;
}

export interface Animal {
  root: THREE.Object3D;
  /** walk a route (closed loop or there-and-back); speed m/s */
  route(pts: V3[], o?: { speed?: number; closed?: boolean; pause?: number; graze?: number }): void;
  update(t: number, dt: number): void;
  dispose(): void;
}

function sculpt(kind: "elephant" | "rhino") {
  const p = newPart(), bones: THREE.Bone[] = [], B = (name: string, pos: THREE.Vector3, parent?: THREE.Bone) => { const b = new THREE.Bone(); b.name = name; b.position.copy(pos); (parent ?? null)?.add(b); bones.push(b); return bones.length - 1; };
  const E = kind === "elephant";
  /* proportions (metres): Asian elephant ~2.7 m at the shoulder; greater one-horned rhino ~1.75 m */
  const body = E ? { z0: -1.65, z1: 1.55, cy: 1.95 } : { z0: -1.3, z1: 1.15, cy: 1.18 };
  const top = (z: number) => E ? 2.62 + 0.24 * Math.sin(((z - body.z0) / (body.z1 - body.z0)) * Math.PI * 0.95 + 0.1) - 0.08 * Math.max(0, z - 1.0) : 1.6 + 0.12 * Math.exp(-((z - 0.55) ** 2) * 5) + 0.06 * Math.exp(-((z + 0.85) ** 2) * 8) + 0.035 * (Math.exp(-((z - 0.72) ** 2) * 160) + Math.exp(-((z + 0.75) ** 2) * 160));
  const bot = (z: number) => E ? 1.12 + 0.18 * (Math.abs(z) / 1.6) ** 2 + 0.12 * Math.max(0, z - 1.0) : 0.66 + 0.1 * (Math.abs(z) / 1.2) ** 2;
  const half = (z: number) => E ? 0.78 - 0.18 * (Math.abs(z - 0.05) / 1.6) ** 2.2 : 0.6 - 0.14 * (Math.abs(z + 0.05) / 1.25) ** 2.4 + (Math.exp(-((z - 0.72) ** 2) * 160) + Math.exp(-((z + 0.75) ** 2) * 160)) * 0.04;
  const iBody = B("body", V(0, body.cy, 0));
  const legs = E
    ? [{ x: -0.5, z: 1.02, hipY: 1.9, l1: 0.98, l2: 0.72, foot: 0.2, r: 0.25 }, { x: 0.5, z: 1.02, hipY: 1.9, l1: 0.98, l2: 0.72, foot: 0.2, r: 0.25 }, { x: -0.5, z: -1.15, hipY: 1.85, l1: 0.92, l2: 0.73, foot: 0.2, r: 0.26 }, { x: 0.5, z: -1.15, hipY: 1.85, l1: 0.92, l2: 0.73, foot: 0.2, r: 0.26 }]
    : [{ x: -0.38, z: 0.72, hipY: 1.05, l1: 0.5, l2: 0.42, foot: 0.13, r: 0.17 }, { x: 0.38, z: 0.72, hipY: 1.05, l1: 0.5, l2: 0.42, foot: 0.13, r: 0.17 }, { x: -0.38, z: -0.82, hipY: 1.08, l1: 0.52, l2: 0.43, foot: 0.13, r: 0.18 }, { x: 0.38, z: -0.82, hipY: 1.08, l1: 0.52, l2: 0.43, foot: 0.13, r: 0.18 }];
  const legB = legs.map((l, i) => { const h = B("hip" + i, V(l.x, l.hipY - body.cy, l.z), bones[iBody]); const k = B("knee" + i, V(0, -l.l1, 0), bones[h]); const f = B("foot" + i, V(0, -l.l2, 0), bones[k]); return { h, k, f }; });
  const base = E ? 0x7a7672 : 0x6a625a, pink = 0xb08a80, crease = E ? 0x5e5a56 : 0x4a443e;
  const iNeck = B("neck", V(0, (E ? 2.35 : 1.3) - body.cy, body.z1 - 0.1), bones[iBody]);
  const iHead = B("head", V(0, E ? 0.05 : -0.05, E ? 0.45 : 0.32), bones[iNeck]);
  /* torso */
  const seg = 22, rings: THREE.Vector3[][] = [], lens: number[] = [], n = 26;
  for (let i = 0; i <= n; i++) { const z = body.z0 + ((body.z1 - body.z0) * i) / n, t = top(z), b2 = bot(z), cy = (t + b2) / 2; rings.push(ring(V(0, cy, z), V(0, 0, 1), half(z), t - cy, cy - b2, seg, E ? 2.3 : 2.5)); lens.push(z); }
  /* rounded rump and chest: extra shrinking rings */
  const z0r = body.z0, cy0 = (top(z0r) + bot(z0r)) / 2; rings.unshift(ring(V(0, cy0, z0r - 0.12), V(0, 0, 1), half(z0r) * 0.75, (top(z0r) - cy0) * 0.8, (cy0 - bot(z0r)) * 0.8, seg, 2.2)); lens.unshift(z0r - 0.12);
  rings.unshift(ring(V(0, cy0, z0r - 0.2), V(0, 0, 1), half(z0r) * 0.4, (top(z0r) - cy0) * 0.45, (cy0 - bot(z0r)) * 0.45, seg, 2.2)); lens.unshift(z0r - 0.2);
  rings.unshift(ring(V(0, cy0, z0r - 0.25), V(0, 0, 1), half(z0r) * 0.12, (top(z0r) - cy0) * 0.14, (cy0 - bot(z0r)) * 0.14, seg, 2.2)); lens.unshift(z0r - 0.25);
  /* neck: the torso flows up and forward into the head (no seam, no cap) */
  const z1 = body.z1, c1 = (top(z1) + bot(z1)) / 2, neckLen = E ? 0.38 : 0.34, jy = E ? 2.38 : 1.2, nr = E ? [0.52, 0.5, 0.58] : [0.36, 0.3, 0.34];
  const nTorso = rings.length;
  for (const t of [0.3, 0.6, 1.0]) { const z = z1 + t * neckLen, y = THREE.MathUtils.lerp(c1, jy, t), e2 = t * t * (3 - 2 * t); rings.push(ring(V(0, y, z), V(0, 0.4, 1), THREE.MathUtils.lerp(half(z1), nr[0], e2), THREE.MathUtils.lerp(top(z1) - c1, nr[1], e2), THREE.MathUtils.lerp(c1 - bot(z1), nr[2], e2), seg, 2.3)); lens.push(z); }
  loftRings(p, rings, lens, (i) => (i < nTorso - 1 ? [iBody, iBody, 0] : [iBody, iNeck, Math.min(1, (i - nTorso + 2) * 0.33)]), (i, j) => {
    const z = lens[i]; const fold = !E && (Math.abs(z - 0.72) < 0.05 || Math.abs(z + 0.75) < 0.05); const belly = Math.sin((j / seg) * Math.PI * 2) < -0.4;
    return fold || (!E && i >= nTorso) && j % 3 === 0 ? crease : belly ? (E ? 0x6c6864 : 0x5e5650) : base;
  }, true, false);
  /* head */
  if (E) {
    const hc = V(0, 2.45, body.z1 + 0.45), headRings: THREE.Vector3[][] = [], hl: number[] = [];
    const prof = [[-0.3, 0.44, 0.48, 0.5], [-0.12, 0.5, 0.58, 0.5], [0.06, 0.49, 0.62, 0.44], [0.24, 0.42, 0.56, 0.38], [0.4, 0.33, 0.4, 0.36], [0.52, 0.24, 0.24, 0.3]];
    prof.forEach(([dz, rx, rt, rb]) => { headRings.push(ring(V(0, hc.y - dz * 0.35, hc.z + dz), V(0, -0.35, 1), rx, rt, rb, seg, 2.2)); hl.push(dz); });
    loftRings(p, headRings, hl, (i) => (i < 1 ? [iNeck, iHead, 0.5] : [iHead, iHead, 0]), (i, j) => (i > 3 && Math.cos((j / seg) * 6.283) > -0.2 ? pink : base));
    /* twin forehead domes */
    for (const sx of [-1, 1]) { const dome = ring(V(sx * 0.2, hc.y + 0.5, hc.z + 0.05), V(0, 1, 0.2), 0.22, 0.06, 0.06, 12, 2); loftRings(p, [dome, ring(V(sx * 0.2, hc.y + 0.58, hc.z + 0.05), V(0, 1, 0.2), 0.12, 0.04, 0.04, 12, 2)], [0, 0.1], () => [iHead, iHead, 0], () => base, false, true); }
    /* trunk: 5-bone chain hanging and curling forward at the tip */
    const tp = [V(0, 2.25, body.z1 + 0.95), V(0, 1.85, body.z1 + 1.12), V(0, 1.4, body.z1 + 1.2), V(0, 0.98, body.z1 + 1.22), V(0, 0.62, body.z1 + 1.28), V(0, 0.38, body.z1 + 1.42)];
    const headW = V(0, body.cy, 0).add(bones[iNeck].position).add(bones[iHead].position), trunkB: number[] = [];
    for (let i = 0; i < 5; i++) trunkB.push(B("trunk" + i, i === 0 ? tp[0].clone().sub(headW) : tp[i].clone().sub(tp[i - 1]), bones[i === 0 ? iHead : trunkB[i - 1]]));
    const tr = limbRings(tp, (t) => [0.24 - 0.17 * t, 0.22 - 0.16 * t], 16);
    loftRings(p, tr.rings, tr.lens.map((l) => l * 2), (i) => (i === 0 ? [iHead, trunkB[0], 0.5] : i < 5 ? [trunkB[i - 1], trunkB[i], 0.5] : [trunkB[4], trunkB[4], 0]), (i, j) => (i < 2 && j > 4 && j < 12 ? pink : base));
    /* ears: rounded flaps folded at the top edge */
    for (const sx of [-1, 1]) {
      const eb = B("ear" + (sx < 0 ? "L" : "R"), V(sx * 0.42, 0.1, -0.1), bones[iHead]);
      const er: THREE.Vector3[][] = []; for (let i = 0; i <= 6; i++) { const t = i / 6, hgt = 1.0 * Math.sin(t * Math.PI * 0.92 + 0.12); const top0 = hc.y + 0.42 - t * 0.08, row: THREE.Vector3[] = []; for (let j = 0; j < 8; j++) { const s = j / 7, y = top0 - s * hgt, z = hc.z - 0.02 - t * 0.72 + s * 0.12 * Math.sin(t * 3); row.push(V(sx * (0.5 + 0.07 * Math.sin(s * Math.PI) + 0.06 * t + (s < 0.12 ? 0.06 : 0)), y, z)); } er.push(row); }
      const bi = p.pos.length / 3; er.forEach((row, i) => row.forEach((v) => { p.pos.push(v.x, v.y, v.z); p.uv.push(i * 0.2, v.y); p.skin.push(eb, iHead, 0, 0); p.wt.push(0.85, 0.15, 0, 0); const c = new THREE.Color(base).multiplyScalar(0.92); p.col.push(c.r, c.g, c.b); }));
      for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) { const a = bi + i * 8 + j, b = a + 1, c = a + 8, d = c + 1; if (sx > 0) p.idx.push(a, c, b, b, c, d, a, b, c, b, d, c); else p.idx.push(a, b, c, b, d, c, a, c, b, b, c, d); }
    }
  } else {
    /* rhino head: long, low wedge from neck to the prehensile lip, single horn, tubular ears */
    const hz = body.z1, headRings: THREE.Vector3[][] = [], hl: number[] = [];
    const prof = [[0.05, 1.22, 0.33, 0.3, 0.32], [0.32, 1.1, 0.29, 0.27, 0.29], [0.6, 0.94, 0.23, 0.23, 0.24], [0.85, 0.8, 0.18, 0.18, 0.19], [1.02, 0.7, 0.15, 0.13, 0.15], [1.12, 0.64, 0.1, 0.08, 0.1]];
    prof.forEach(([dz, y, rx, rt, rb]) => { headRings.push(ring(V(0, y, hz + dz), V(0, -0.5, 1), rx, rt, rb, seg, 2.6)); hl.push(dz); });
    loftRings(p, headRings, hl, (i) => (i < 1 ? [iNeck, iHead, 0.5] : [iHead, iHead, 0]), (i) => (i === 1 ? crease : base));
    const horn = limbRings([V(0, 0.93, hz + 0.9), V(0, 1.1, hz + 0.9), V(0, 1.24, hz + 0.85), V(0, 1.32, hz + 0.76)], (t) => [0.12 * (1 - t) + 0.012, 0.11 * (1 - t) + 0.012], 10, V(0, 0, 1));
    loftRings(p, horn.rings, horn.lens, () => [iHead, iHead, 0], () => 0x3a3430, false, true);
    for (const sx of [-1, 1]) { const ear = limbRings([V(sx * 0.17, 1.42, hz + 0.18), V(sx * 0.22, 1.55, hz + 0.13), V(sx * 0.25, 1.68, hz + 0.1)], (t) => [0.07 + 0.02 * t, 0.05 + 0.03 * t], 8, V(0, 0, 1)); loftRings(p, ear.rings, ear.lens, () => [iHead, iHead, 0], () => base, true, false); }
  }
  /* legs: pillar legs with knee bulge and round feet with toenails */
  legs.forEach((l, i) => {
    const hip = V(l.x, l.hipY + (E ? 0.25 : 0.12), l.z), knee = V(l.x, l.hipY - l.l1, l.z), ankle = V(l.x, l.hipY - l.l1 - l.l2, l.z), sole = V(l.x, 0.0, l.z);
    const pts = [hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle, sole];
    const rr = limbRings(pts, (t) => { const r = l.r * (t < 0.4 ? (E ? 1.55 - t * 1.2 : 1.35 - t * 0.8) : t < 0.5 ? 1.0 : t < 0.85 ? 0.92 : 1.12); return [r, r * 0.95]; }, 14);
    const lb = legB[i];
    loftRings(p, rr.rings, rr.lens, (k) => (k < 2 ? [lb.h, lb.h, 0] : k === 2 ? [lb.h, lb.k, 0.5] : k < 4 ? [lb.k, lb.k, 0] : k === 4 ? [lb.k, lb.f, 0.5] : [lb.f, lb.f, 0]), (k, j) => (k === 5 && (j < 3 || j > 11) ? (E ? 0xb8b0a0 : 0x4a443e) : base), false, true);
  });
  /* tail */
  const iT0 = B("tail0", V(0, (E ? 2.3 : 1.45) - body.cy, body.z0 - 0.15), bones[iBody]), iT1 = B("tail1", V(0, -0.45, -0.06), bones[iT0]), iT2 = B("tail2", V(0, -0.45, 0), bones[iT1]);
  const tl = E ? 1.0 : 0.55, tpts = [V(0, E ? 2.3 : 1.45, body.z0 - 0.1), V(0, (E ? 2.3 : 1.45) - tl * 0.45, body.z0 - 0.2), V(0, (E ? 2.3 : 1.45) - tl, body.z0 - 0.22)];
  const tr2 = limbRings(tpts, (t) => [0.05 - 0.03 * t, 0.05 - 0.03 * t], 6, V(0, 0, 1));
  loftRings(p, tr2.rings, tr2.lens, (i) => (i === 0 ? [iT0, iT0, 0] : i === 1 ? [iT0, iT1, 0.6] : [iT1, iT2, 0.7]), () => base, false, true);
  /* eyes */
  for (const sx of [-1, 1]) { const e = E ? V(sx * 0.42, 2.5, body.z1 + 0.6) : V(sx * 0.235, 1.06, body.z1 + 0.5); const er = ring(e, V(sx, 0, 0.3), 0.035, 0.03, 0.03, 8, 2); loftRings(p, [er, ring(e.clone().add(V(sx * 0.02, 0, 0.005)), V(sx, 0, 0.3), 0.02, 0.018, 0.018, 8, 2)], [0, 0.02], () => [iHead, iHead, 0], () => 0x0a0806, false, true); }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p.pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(p.uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(p.col, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(p.skin, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(p.wt, 4));
  g.setIndex(p.idx); g.computeVertexNormals(); g.computeBoundingSphere();
  return { geo: g, bones, legs, legB, iBody, iNeck, iHead, tail: [iT0, iT1, iT2], body };
}

export function makeAnimal(k: SceneKit, kind: "elephant" | "rhino", ground: (x: number, z: number) => number, at: V3, yaw = 0): Animal {
  const S = sculpt(kind), E = kind === "elephant";
  const tex = skinTex(kind), m = k.mats.own(new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.92, vertexColors: true, bumpMap: tex, bumpScale: E ? 1.2 : 2 }));
  k.mats.enhance(m, [], "animal-" + kind);
  const mesh = new THREE.SkinnedMesh(S.geo, m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const root = new THREE.Group(); root.add(mesh);
  const rootBone = S.bones[S.iBody]; mesh.add(rootBone); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(S.bones));
  root.position.set(at[0], at[1], at[2]); root.rotation.y = yaw; k.group.add(root);
  const body = S.bones[S.iBody], neck = S.bones[S.iNeck], head = S.bones[S.iHead], tail = S.tail.map((i) => S.bones[i]);
  const trunk = S.bones.filter((b) => b.name.startsWith("trunk")), ears = S.bones.filter((b) => b.name.startsWith("ear"));
  const restY = body.position.y;
  /* gait: lateral sequence walk (LH, LF, RH, RF); stride and swing tuned per species */
  const stride = E ? 1.5 : 0.85, swingFrac = E ? 0.32 : 0.3, offs = [0.25, 0.75, 0.0, 0.5];
  const home = S.legs.map((l) => new THREE.Vector3(l.x, 0, l.z));
  const feet = home.map((h) => h.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(new THREE.Vector3(at[0], 0, at[2])));
  feet.forEach((f) => (f.y = ground(f.x, f.z)));
  const swing = S.legs.map(() => ({ on: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() }));
  const lastCycle = S.legs.map(() => -99); let total = 0;
  let phase = 0, speed = 0, heading = yaw, routePts: THREE.Vector3[] = [], ri = 1, dir = 1, closed = true, pause = 0, wait = 0, grazeT = 0, graze = 0, vMax = E ? 1.0 : 0.6;
  const inv = new THREE.Matrix4(), tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  const ik = (i: number) => {
    const l = S.legs[i], b = S.legB[i], hip = S.bones[b.h], knee = S.bones[b.k], foot = S.bones[b.f];
    body.updateMatrixWorld(true); inv.copy(body.matrixWorld).invert();
    const F = tmp.copy(feet[i]).applyMatrix4(inv); /* foot sole in body space */
    const dy = F.y + l.foot - hip.position.y, dz = F.z - hip.position.z, L1 = l.l1, L2 = l.l2;
    const D = Math.min(L1 + L2 - 1e-3, Math.max(Math.abs(L1 - L2) + 1e-3, Math.hypot(dy, dz)));
    const a = Math.atan2(dz, -dy), gam = Math.acos(THREE.MathUtils.clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)), beta = Math.PI - Math.acos(THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
    hip.rotation.x = -(a + gam); knee.rotation.x = beta; foot.rotation.x = a + gam - beta;
  };

  return {
    root,
    route(pts, o = {}) { routePts = pts.map((q) => new THREE.Vector3(...q)); closed = !!o.closed; pause = o.pause ?? 3; graze = o.graze ?? 0; vMax = o.speed ?? vMax; ri = 1; dir = 1; root.position.copy(routePts[0]); },
    update(t, dt) {
      /* locomotion along the route; stops = graze / look about */
      let want = 0;
      if (routePts.length > 1) {
        if (wait > 0) { wait -= dt; grazeT += dt; }
        else {
          const tg = routePts[ri], dx = tg.x - root.position.x, dz = tg.z - root.position.z, L = Math.hypot(dx, dz);
          if (L < 0.3) { if (closed) ri = (ri + 1) % routePts.length; else { if (ri + dir < 0 || ri + dir >= routePts.length) { dir = -dir as 1 | -1; wait = pause; } ri += dir; } if (graze && Math.random() < graze) wait = pause; }
          else { want = vMax; let dh = Math.atan2(dx, dz) - heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); heading += dh * Math.min(1, dt * (E ? 0.9 : 1.4)); if (Math.abs(dh) > 0.9) want *= 0.35; }
        }
      }
      speed += (want - speed) * Math.min(1, dt * 1.5);
      const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
      root.position.addScaledVector(fwd, speed * dt); root.rotation.y = heading;
      total += (speed * dt) / stride; phase = total % 1;
      /* feet: start a swing when the leg's window opens (moving), or a settle step if far from home (stopped) */
      root.updateMatrixWorld(true);
      S.legs.forEach((_, i) => {
        const sw = swing[i], lp = total - offs[i], cyc = Math.floor(lp), ph = lp - cyc;
        const homeW = home[i].clone().applyMatrix4(root.matrixWorld);
        if (!sw.on) {
          const moving = speed > 0.05, far = homeW.distanceTo(feet[i]) > 0.18;
          const otherSwinging = swing.some((s2, j) => j !== i && s2.on);
          if ((moving && ph < swingFrac && lastCycle[i] !== cyc) || (!moving && far && !otherSwinging)) {
            lastCycle[i] = cyc; sw.on = true; sw.t = 0; sw.from.copy(feet[i]);
            sw.to.copy(homeW).addScaledVector(fwd, moving ? stride * (0.5 + swingFrac / 2) - 0.05 : 0); sw.to.y = ground(sw.to.x, sw.to.z);
          }
        }
        if (sw.on) {
          const dur = speed > 0.05 ? (stride * swingFrac) / Math.max(speed, 0.2) : 0.6; sw.t += dt / dur;
          const tt = Math.min(1, sw.t), e = tt * tt * (3 - 2 * tt);
          feet[i].lerpVectors(sw.from, sw.to, e); feet[i].y += Math.sin(tt * Math.PI) * (E ? 0.22 : 0.12);
          if (tt >= 1) { sw.on = false; feet[i].copy(sw.to); }
        }
      });
      /* body height follows the ground and bobs with the gait; slight roll toward the planted side */
      const gy = ground(root.position.x, root.position.z); root.position.y = gy;
      const bob = Math.sin(phase * Math.PI * 4) * 0.025 * Math.min(1, speed / 0.5);
      body.position.y = restY + bob - (E ? 0.02 : 0.01); body.rotation.z = Math.sin(phase * Math.PI * 2) * 0.025 * Math.min(1, speed / 0.5);
      body.rotation.x = Math.atan2(ground(root.position.x + fwd.x, root.position.z + fwd.z) - ground(root.position.x - fwd.x, root.position.z - fwd.z), 2) * -0.6;
      S.legs.forEach((_, i) => ik(i));
      /* head, trunk, ears, tail */
      const grazing = !E && speed < 0.1 ? 1 : 0;
      neck.rotation.x = E ? 0.08 + Math.sin(phase * Math.PI * 4) * 0.03 : THREE.MathUtils.lerp(0.05, 0.62, grazing) + Math.sin(t * 1.3) * 0.04 * grazing;
      head.rotation.y = Math.sin(t * 0.4) * (grazing ? 0.18 : 0.08); head.rotation.x = grazing ? 0.15 + Math.max(0, Math.sin(t * 2.4)) * 0.06 : Math.sin(phase * Math.PI * 4) * 0.02;
      trunk.forEach((b, i) => { b.rotation.x = Math.sin(t * 0.9 + i * 0.6) * 0.05 + (i > 2 ? Math.sin(t * 0.5) * 0.1 : 0) - (speed > 0.1 ? 0.04 * Math.sin(phase * Math.PI * 2 + i) : 0); b.rotation.z = Math.sin(t * 0.7 + i * 0.5) * 0.06 * (1 + i * 0.3); });
      ears.forEach((b, i) => { b.rotation.y = (i ? -1 : 1) * (0.1 + 0.25 * Math.max(0, Math.sin(t * 0.8 + i * 0.4)) ** 4); });
      tail.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.6 + i * 0.7) * 0.18 * (i + 1) * 0.6; b.rotation.x = 0.05 * i; });
      void up;
    },
    dispose() { S.geo.dispose(); root.removeFromParent(); },
  };
}
