import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { canvasTex, hash, rng } from "./tex";
import { cyl, paint, uvScale } from "./geo";
import type { Mats } from "./mat";

/* tree species: tapered trunk + branches (bark) and alpha-tested leaf cards with crown-spherical normals (leaves),
   instanced per species; leaves sway in the wind, cards light like a soft volume */

export type LeafKind = "broad" | "small" | "needle" | "bamboo" | "frond" | "banana";
export type Species = "sal" | "mango" | "pipal" | "sissoo" | "bamboo" | "banana" | "palm" | "pine" | "fir" | "rhodo" | "shrub" | "juniper";

function leafTexture(kind: LeafKind) {
  return canvasTex("leaf-" + kind, 512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const R = rng(kind.length * 31 + 7);
    if (kind === "frond") {
      /* one pinnate palm frond along the texture's v axis: rib + leaflets */
      g.strokeStyle = "#5d6a32"; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
      for (let i = 0; i < 70; i++) { const y = h - (i / 70) * h, L = (0.12 + 0.36 * Math.sin((i / 70) * Math.PI)) * w, dr = 0.35 + R() * 0.2; for (const s of [-1, 1]) { g.strokeStyle = `hsl(${78 + R() * 18},${38 + R() * 18}%,${26 + R() * 16}%)`; g.lineWidth = 5 + R() * 3; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + s * L * 0.6, y - L * dr * 0.4, w / 2 + s * L, y - L * dr + L * 0.25); g.stroke(); } }
      return;
    }
    if (kind === "banana") {
      g.fillStyle = "#4f7a2a"; g.beginPath(); g.moveTo(w / 2, h); g.bezierCurveTo(w * 0.02, h * 0.7, w * 0.05, h * 0.15, w / 2, 0); g.bezierCurveTo(w * 0.95, h * 0.15, w * 0.98, h * 0.7, w / 2, h); g.fill();
      for (let i = 0; i < 26; i++) { const y = (i / 26) * h; g.strokeStyle = "rgba(30,50,15,0.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, y + 10); g.lineTo(0, y - 30); g.moveTo(w / 2, y + 10); g.lineTo(w, y - 30); g.stroke(); if (R() < 0.35) { g.clearRect(R() < 0.5 ? 0 : w * 0.6, y, w * 0.4, 3); } }
      g.strokeStyle = "#a9b46a"; g.lineWidth = 7; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke(); return;
    }
    const n = kind === "needle" ? 1600 : kind === "bamboo" ? 340 : kind === "small" ? 900 : 360;
    /* twigs first */
    g.strokeStyle = "#3b3024"; for (let i = 0; i < 14; i++) { g.lineWidth = 2 + R() * 3; const a = R() * 6.283; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w * 0.4, h / 2 + Math.sin(a) * h * 0.4); g.stroke(); }
    for (let i = 0; i < n; i++) {
      const a = R() * 6.283, r = Math.sqrt(R()) * w * 0.44, x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r * 0.92;
      const depth = r / (w * 0.44), top = 1 - y / h;
      const hue = kind === "needle" ? 95 + R() * 25 : kind === "bamboo" ? 72 + R() * 20 : kind === "small" ? 80 + R() * 30 : 88 + R() * 26;
      const lt = (kind === "needle" ? 18 : 22) + R() * 20 + depth * 8 + top * 8;
      g.fillStyle = `hsl(${hue},${30 + R() * 28}%,${lt}%)`;
      g.save(); g.translate(x, y); g.rotate(a + (R() - 0.5) * 1.2);
      if (kind === "needle") { g.fillRect(0, -1, 18 + R() * 16, 2.2); }
      else if (kind === "bamboo") { g.beginPath(); g.ellipse(0, 0, 34 + R() * 16, 4.5, 0, 0, 6.283); g.fill(); }
      else if (kind === "small") { g.beginPath(); g.ellipse(0, 0, 9 + R() * 5, 6 + R() * 3, 0, 0, 6.283); g.fill(); }
      else { g.beginPath(); g.moveTo(-20, 0); g.quadraticCurveTo(0, -11 - R() * 4, 22 + R() * 8, 0); g.quadraticCurveTo(0, 11 + R() * 4, -20, 0); g.fill(); g.strokeStyle = `hsla(${hue},25%,${lt + 14}%,0.5)`; g.lineWidth = 1; g.beginPath(); g.moveTo(-18, 0); g.lineTo(20, 0); g.stroke(); }
      g.restore();
    }
  });
}

interface Part { wood: THREE.BufferGeometry[]; leaves: THREE.BufferGeometry[] }
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** a tapered limb from a to b as a cylinder (bark UVs in metres) */
function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, seg = 6) {
  const d = b.clone().sub(a), L = d.length(), g = cyl(r1, r0, L, seg, true);
  g.translate(0, L / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g;
}
/** a leaf card centred at c, random orientation, normals blended toward the crown centre's outward direction */
function card(c: THREE.Vector3, size: number, crown: THREE.Vector3, R: () => number, upBias = 0.4, aspect = 1) {
  const g = new THREE.PlaneGeometry(size * aspect, size);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * Math.PI * (1 - upBias) - upBias * Math.PI * 0.5 * (R() < 0.5 ? 1 : 0.6), R() * Math.PI * 2, (R() - 0.5) * 0.8, "YXZ"));
  g.applyQuaternion(q); g.translate(c.x, c.y, c.z);
  const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute, o = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) { o.set(p.getX(i), p.getY(i), p.getZ(i)).sub(crown).normalize(); o.y = o.y * 0.7 + 0.35; o.normalize(); n.setXYZ(i, o.x, o.y, o.z); }
  return g;
}

function broadleaf(R: () => number, o: { h: number; r: number; crown: [number, number]; crownY: number; branches: number; cards: number; card: number; lean?: number; spread?: number; lod?: number }): Part {
  const wood: THREE.BufferGeometry[] = [], leaves: THREE.BufferGeometry[] = [];
  const lean = V((R() - 0.5) * (o.lean ?? 0.3), 0, (R() - 0.5) * (o.lean ?? 0.3));
  const pts = [V(0, 0, 0)]; const segs = 4;
  for (let i = 1; i <= segs; i++) { const t = i / segs; pts.push(V(lean.x * t * o.h + (R() - 0.5) * 0.25, t * o.crownY, lean.z * t * o.h + (R() - 0.5) * 0.25)); }
  if (o.lod) { wood.push(limb(V(0, -0.2, 0), pts[segs], o.r * 1.1, o.r * 0.5, 5)); }
  else {
    for (let i = 0; i < segs; i++) wood.push(limb(pts[i], pts[i + 1], o.r * (1 - i / segs * 0.45) * (i === 0 ? 1.25 : 1), o.r * (1 - (i + 1) / segs * 0.45), 7));
    /* root flare */
    wood.push(limb(V(0, -0.2, 0), V(0, 0.7, 0), o.r * 1.7, o.r * 1.05, 7));
  }
  const top = pts[segs], cc = V(top.x, o.crownY + o.crown[1] * 0.55, top.z);
  const ends: THREE.Vector3[] = [];
  for (let i = 0; i < o.branches; i++) {
    const a = (i / o.branches) * Math.PI * 2 + R() * 0.6, start = pts[Math.max(2, segs - 1 - Math.floor(R() * 2))].clone().lerp(top, R());
    const el = 0.35 + R() * 0.6, L = o.crown[0] * (0.55 + R() * 0.45) * (o.spread ?? 1);
    const mid = start.clone().add(V(Math.cos(a) * L * 0.5, L * el * 0.6, Math.sin(a) * L * 0.5));
    const end = start.clone().add(V(Math.cos(a) * L, L * el + o.crown[1] * 0.25 * R(), Math.sin(a) * L));
    if (!o.lod) wood.push(limb(start, mid, o.r * 0.42, o.r * 0.26, 4), limb(mid, end, o.r * 0.26, o.r * 0.08, 3));
    ends.push(end, mid.clone().lerp(end, 0.5));
  }
  for (let i = 0; i < o.cards; i++) {
    let c: THREE.Vector3;
    if (i < ends.length * 3) c = ends[i % ends.length].clone().add(V((R() - 0.5) * o.card * 1.2, (R() - 0.3) * o.card, (R() - 0.5) * o.card * 1.2));
    else { const u = R() * 2 - 1, th = R() * 6.283, s = Math.sqrt(1 - u * u), rr = Math.cbrt(0.35 + R() * 0.65); c = cc.clone().add(V(Math.cos(th) * s * o.crown[0] * rr, u * o.crown[1] * 0.5 * rr, Math.sin(th) * s * o.crown[0] * rr)); }
    leaves.push(card(c, o.card * (0.75 + R() * 0.5), cc, R));
  }
  return { wood, leaves };
}

function conifer(R: () => number, o: { h: number; r: number; base: number; width: number; tiers: number; card: number; droop: number; lod?: number }): Part {
  const wood: THREE.BufferGeometry[] = [limb(V(0, -0.2, 0), V(0, o.h, 0), o.r, o.r * 0.15, o.lod ? 4 : 7)], leaves: THREE.BufferGeometry[] = [];
  for (let t = 0; t < o.tiers; t++) {
    const f = t / (o.tiers - 1), y = o.base + f * (o.h - o.base) * 0.96, rad = o.width * (1 - f * 0.92) * (0.85 + R() * 0.3), n = o.lod ? Math.max(3, Math.round(5 * (1 - f) + 2)) : Math.max(4, Math.round(10 * (1 - f) + 3));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + R() * 0.5, tip = V(Math.cos(a) * rad, y - rad * o.droop, Math.sin(a) * rad);
      if (!o.lod && f < 0.75 && k % 2 === 0) wood.push(limb(V(0, y, 0), tip.clone().multiplyScalar(0.8).setY(y - rad * o.droop * 0.7), o.r * 0.25, o.r * 0.06, 4));
      const c = tip.clone().multiplyScalar(0.62).setY(y - rad * o.droop * 0.5);
      const g = new THREE.PlaneGeometry(rad * 1.5 + o.card * 0.6, o.card * (1.0 + R() * 0.5));
      g.rotateX(-Math.PI / 2 + 0.25 + o.droop * 0.6); g.rotateY(-a + Math.PI / 2); g.translate(c.x, c.y, c.z);
      const nn = g.attributes.normal as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute, v = V(0, 0, 0);
      for (let i = 0; i < nn.count; i++) { v.set(p.getX(i), (p.getY(i) - o.h * 0.45) * 0.4, p.getZ(i)).normalize(); v.y = v.y * 0.6 + 0.45; v.normalize(); nn.setXYZ(i, v.x, v.y, v.z); }
      leaves.push(g);
    }
  }
  return { wood, leaves };
}

function palm(R: () => number, h: number, fronds: number, len: number, kind: "frond" | "banana"): Part {
  const wood: THREE.BufferGeometry[] = [], leaves: THREE.BufferGeometry[] = [];
  const bend = V((R() - 0.5) * 0.12 * h, 0, (R() - 0.5) * 0.12 * h), pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(V(bend.x * t * t, t * h, bend.z * t * t)); }
  const tr = kind === "banana" ? 0.13 : 0.14;
  for (let i = 0; i < 6; i++) wood.push(limb(pts[i], pts[i + 1], tr * (i === 0 ? 1.3 : 1) * (1 - i * 0.04), tr * (1 - (i + 1) * 0.04), 7));
  const top = pts[6];
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + R() * 0.4, up = kind === "banana" ? 0.9 + R() * 0.4 : 0.35 + R() * 0.55, wdt = kind === "banana" ? 0.55 : 0.9, segs = 6, pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const dir = V(Math.cos(a), 0, Math.sin(a)), side = V(-Math.sin(a), 0, Math.cos(a));
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, c = top.clone().addScaledVector(dir, t * len).add(V(0, Math.sin(t * Math.PI * 0.55) * up * len * 0.6 - t * t * len * (kind === "banana" ? 0.35 : 0.75), 0));
      const ww = wdt * Math.sin(Math.min(1, t * 1.2 + 0.08) * Math.PI) * (kind === "banana" ? 1 : 1) * 0.5 + 0.02, droop = t * 0.15;
      for (const sd of [-1, 1]) { const p = c.clone().addScaledVector(side, sd * ww).add(V(0, -Math.abs(sd) * droop * ww * 2, 0)); pos.push(p.x, p.y, p.z); uv.push(sd < 0 ? 0 : 1, t); }
      if (s < segs) { const b = s * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const nn = g.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < nn.count; i++) { const v = V(nn.getX(i), Math.abs(nn.getY(i)) + 0.5, nn.getZ(i)).normalize(); nn.setXYZ(i, v.x, v.y, v.z); }
    leaves.push(g.toNonIndexed());
  }
  return { wood, leaves };
}

function bambooClump(R: () => number, n: number, h: number): Part {
  const wood: THREE.BufferGeometry[] = [], leaves: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const a = R() * 6.283, r0 = R() * 0.9, base = V(Math.cos(a) * r0, 0, Math.sin(a) * r0), hh = h * (0.7 + R() * 0.4), out = 0.18 + R() * 0.25;
    const pts: THREE.Vector3[] = []; for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push(base.clone().add(V(Math.cos(a) * out * hh * t * t, hh * t * (1 - t * t * out * 0.6), Math.sin(a) * out * hh * t * t))); }
    for (let k = 0; k < 5; k++) wood.push(limb(pts[k], pts[k + 1], 0.06 * (1 - k * 0.12), 0.06 * (1 - (k + 1) * 0.12), 5));
    for (let k = 0; k < 9; k++) { const t = 0.4 + R() * 0.6, p = pts[Math.min(4, Math.floor(t * 5))].clone().lerp(pts[Math.min(5, Math.floor(t * 5) + 1)], (t * 5) % 1); leaves.push(card(p.add(V((R() - 0.5) * 1.2, (R() - 0.5) * 0.8, (R() - 0.5) * 1.2)), 1.8 + R() * 0.8, V(0, hh * 0.6, 0), R, 0.2)); }
  }
  return { wood, leaves };
}

const LEAF_OF: Record<Species, LeafKind> = { sal: "broad", mango: "broad", pipal: "small", sissoo: "small", bamboo: "bamboo", banana: "banana", palm: "frond", pine: "needle", fir: "needle", rhodo: "broad", shrub: "small", juniper: "needle" };
const TINT: Record<Species, [number, number]> = { sal: [0x6a5a4a, 0xb4c08a], mango: [0x4e4236, 0x8fa66a], pipal: [0x7a6e60, 0xa8b878], sissoo: [0x5a4c40, 0xa2b07a], bamboo: [0x8c9a50, 0xb6c27e], banana: [0x8a9058, 0xa8c070], palm: [0x7a6c5a, 0xa0aa70], pine: [0x4a3c30, 0x7f9a6a], fir: [0x3e342c, 0x6f8c66], rhodo: [0x4a3c30, 0x88a070], shrub: [0x4a3c30, 0x96a874], juniper: [0x4a3c30, 0x78906a] };

function make(sp: Species, seed: number, lod: 0 | 1): Part {
  const R = rng(seed * 101 + sp.length * 7), k = lod ? 0.16 : 1, c = (n: number) => Math.max(6, Math.round(n * k));
  switch (sp) {
    case "sal": return broadleaf(R, { h: 22, r: 0.42, crown: [4.8, 9], crownY: 12, branches: 7, cards: c(90), card: 3.2, lean: 0.08, lod });
    case "mango": return broadleaf(R, { h: 10, r: 0.42, crown: [6, 6.5], crownY: 2.8, branches: 8, cards: c(110), card: 3, spread: 1.1, lod });
    case "pipal": return broadleaf(R, { h: 14, r: 0.9, crown: [9, 7], crownY: 4, branches: 10, cards: c(150), card: 3.4, spread: 1.15, lod });
    case "sissoo": return broadleaf(R, { h: 12, r: 0.3, crown: [4, 5], crownY: 6, branches: 6, cards: c(70), card: 2.6, lean: 0.4, lod });
    case "rhodo": return broadleaf(R, { h: 5, r: 0.18, crown: [2.4, 2.6], crownY: 1.6, branches: 5, cards: c(40), card: 1.5, lean: 0.6, lod });
    case "shrub": return broadleaf(R, { h: 1.6, r: 0.06, crown: [1.1, 1], crownY: 0.25, branches: 3, cards: c(18), card: 0.9, lean: 0.2, lod });
    case "juniper": return broadleaf(R, { h: 1.2, r: 0.05, crown: [1.2, 0.8], crownY: 0.15, branches: 3, cards: c(16), card: 0.8, lean: 0.2, lod });
    case "pine": return conifer(R, { h: 18, r: 0.32, base: 4, width: 3.6, tiers: lod ? 6 : 13, card: lod ? 3.2 : 2.4, droop: 0.2, lod });
    case "fir": return conifer(R, { h: 16, r: 0.3, base: 1.5, width: 3.4, tiers: lod ? 6 : 15, card: lod ? 3.0 : 2.2, droop: 0.4, lod });
    case "palm": return palm(R, 12 + R() * 4, lod ? 7 : 12, 3.6, "frond");
    case "banana": return palm(R, 2.6 + R() * 0.8, lod ? 5 : 8, 2.2, "banana");
    case "bamboo": return bambooClump(R, lod ? 8 : 18, 11);
  }
}

export interface TreeAt { sp: Species; x: number; y: number; z: number; s?: number; yaw?: number }

/** instanced forest: per species and LOD (near casts shadows, far is a lighter build) */
export class Trees {
  readonly group = new THREE.Group();
  private leafMats = new Map<LeafKind, THREE.Material>();
  constructor(private mats: Mats, list: TreeAt[], o: { near?: number; centre?: [number, number]; farShadow?: boolean } = {}) {
    const near = o.near ?? 120, [cx, cz] = o.centre ?? [0, 0];
    const groups = new Map<string, TreeAt[]>();
    for (const t of list) { const lod = Math.hypot(t.x - cx, t.z - cz) < near ? 0 : 1, k = t.sp + "|" + lod; (groups.get(k) || groups.set(k, []).get(k)!).push(t); }
    const bark = mats.get("bark"), C = new THREE.Color(), M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    groups.forEach((ts, k) => {
      const [sp, l] = k.split("|") as [Species, string], lod = +l as 0 | 1, part = make(sp, 1, lod), [wc, lc] = TINT[sp];
      const wood = paint(uvScale(mergeGeometries(part.wood.map((g) => (g.index ? g.toNonIndexed() : g)))!, 1, 1), wc);
      const leaves = paint(mergeGeometries(part.leaves.map((g) => (g.index ? g.toNonIndexed() : g)))!, lc);
      const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow: boolean) => {
        const im = new THREE.InstancedMesh(geo, mat, ts.length);
        ts.forEach((t, i) => { const sc = t.s ?? 1; M.compose(p.set(t.x, t.y, t.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.yaw ?? hash(i, t.x) * 6.283), s.set(sc, sc * (0.92 + hash(t.z, i) * 0.16), sc)); im.setMatrixAt(i, M); im.setColorAt(i, C.setScalar(0.78 + hash(i, t.z + 3) * 0.44)); });
        im.castShadow = shadow; im.receiveShadow = true; im.computeBoundingSphere(); this.group.add(im); return im;
      };
      mk(wood, bark, lod === 0 || !!o.farShadow); mk(leaves, this.leafMat(LEAF_OF[sp]), lod === 0 || !!o.farShadow);
      part.wood.forEach((g) => g.dispose()); part.leaves.forEach((g) => g.dispose());
    });
  }
  private leafMat(kind: LeafKind) {
    const hit = this.leafMats.get(kind); if (hit) return hit;
    const m = this.mats.own(new THREE.MeshStandardMaterial({ map: leafTexture(kind), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.82 }));
    const sway = kind === "needle" ? 0.25 : kind === "frond" || kind === "banana" ? 1.4 : 1;
    this.mats.enhance(m, [(sh) => {
      sh.uniforms.uTime = this.mats.time;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <begin_vertex>", `#include <begin_vertex>
{ vec3 base = vec3(0.0);
#ifdef USE_INSTANCING
  base = instanceMatrix[3].xyz;
#endif
  float ph = base.x * 0.37 + base.z * 0.21, hf = max(position.y - 1.0, 0.0);
  float sw = (sin(uTime * 1.1 + ph) * 0.6 + sin(uTime * 2.3 + ph * 1.7) * 0.3) * hf * 0.012 * ${sway.toFixed(2)};
  transformed.x += sw + sin(uTime * 4.1 + position.x * 1.9 + position.z * 1.3 + ph) * 0.035 * ${sway.toFixed(2)};
  transformed.z += sw * 0.6 + cos(uTime * 3.7 + position.y * 1.7 + position.x + ph) * 0.035 * ${sway.toFixed(2)}; }`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\nnormal = normalize(vNormal);");
    }], "leaf-" + kind);
    this.leafMats.set(kind, m); return m;
  }
}
