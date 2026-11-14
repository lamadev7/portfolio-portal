import * as THREE from "three";
import type { Character, CharState, NpcKind, SceneCtx, V3 } from "../../contracts";
import { mat4, prep } from "./lib";
import { mergeAll } from "./props";
import { rng } from "./tex";

/* NPCs from ctx.characters: standing groups and walkers on closed loops (loops are validated against colliders like paths). */

interface Walker { c: Character; pts: V3[]; seg: number[]; total: number; d: number; v: number; yaw: number }

export class People {
  readonly group = new THREE.Group();
  private still: Character[] = [];
  private walkers: Walker[] = [];
  readonly loops: Record<string, V3[]> = {};
  constructor(private ctx: SceneCtx) { this.group.name = "npcs"; }

  async stand(kind: NpcKind, seed: number, p: V3, yaw: number, act: CharState = "idle", look?: V3) {
    const c = await this.ctx.characters.npc(kind, seed);
    c.root.position.set(p[0], p[1], p[2]); c.root.rotation.y = yaw; c.play(act, 0); if (look) c.lookAt(look);
    this.group.add(c.root); this.still.push(c); return c;
  }

  async walk(kind: NpcKind, seed: number, loop: V3[], v: number, phase: number, name?: string) {
    const c = await this.ctx.characters.npc(kind, seed);
    const pts = [...loop, loop[0]], seg: number[] = []; let total = 0;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][2] - pts[i][2]); seg.push(l); total += l; }
    const w: Walker = { c, pts, seg, total, d: phase * total, v, yaw: 0 };
    c.play("walk", 0); c.setLocomotion(v); this.group.add(c.root); this.walkers.push(w); this.place(w, 0, true);
    this.loops[name ?? `npc-loop-${this.walkers.length}`] = pts;
    return c;
  }

  private place(w: Walker, dt: number, snap = false) {
    w.d = (w.d + w.v * dt) % w.total;
    let d = w.d, i = 0; while (d > w.seg[i] && i < w.seg.length - 1) { d -= w.seg[i]; i++; }
    const a = w.pts[i], b = w.pts[i + 1], t = w.seg[i] > 0 ? d / w.seg[i] : 0;
    w.c.root.position.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    const target = Math.atan2(b[0] - a[0], b[2] - a[2]);
    let dy = target - w.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    w.yaw = snap ? target : w.yaw + dy * Math.min(1, dt * 5);
    w.c.root.rotation.y = w.yaw;
  }

  update(dt: number) {
    for (const c of this.still) c.update(dt);
    for (const w of this.walkers) { this.place(w, dt); w.c.update(dt); }
  }

  dispose() { for (const c of this.still) c.dispose(); for (const w of this.walkers) w.c.dispose(); this.group.removeFromParent(); }
}

/* ---------- low-poly instanced figures for distant crowds (one draw call per variant) ---------- */

const SKIN = [0x8d5a3b, 0xa06a48, 0x7a4c32, 0xb07a55, 0x6e432c];
const HAIR = [0x141010, 0x1c1512, 0x0e0c0b];

export type FigureStyle = "casual" | "graduate" | "graduateToss" | "monk" | "suit";

export function figureGeo(style: FigureStyle, seed: number, o: { cloth?: number; pants?: number; female?: boolean } = {}) {
  const r = rng(seed), parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4, c: number) => { parts.push(prep(g, m, { color: c })); g.dispose(); };
  const skin = SKIN[(r() * SKIN.length) | 0], hair = HAIR[(r() * HAIR.length) | 0], fem = o.female ?? r() < 0.45;
  const cloth = o.cloth ?? [0x2f4a6e, 0x7a2f2f, 0x3d5a3a, 0xc9b28a, 0x5a5a62, 0xd8d4cc, 0x8a5a2a][(r() * 7) | 0];
  const pants = o.pants ?? [0x1e2430, 0x2a2a2a, 0x3a3a46, 0x4a3c2c][(r() * 4) | 0];
  const H = fem ? 1.6 : 1.7, gown = style.startsWith("graduate") || style === "monk";
  const body = style.startsWith("graduate") ? 0x111114 : style === "monk" ? 0x8a2a1e : cloth;
  if (gown) {
    add(new THREE.LatheGeometry([[0.0, 0], [0.3, 0.02], [0.27, 0.6], [0.22, 1.1], [0.2, 1.36], [0.08, 1.44], [0, 1.45]].map(([a, b]) => new THREE.Vector2(a, b * H / 1.7)), 10), mat4(0, 0, 0), body);
  } else {
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.075, 0.06, 0.82 * H / 1.7, 6), mat4(s * 0.1, 0.42 * H / 1.7, 0), pants);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.11, 0.07, 0.24), mat4(s * 0.1, 0.035, 0.04), 0x1a1a1a);
    add(new THREE.CylinderGeometry(fem ? 0.17 : 0.2, 0.16, 0.6 * H / 1.7, 8), mat4(0, (0.82 + 0.3) * H / 1.7, 0, 0, 1, 1, 0.7), style === "suit" ? 0x1d2230 : cloth);
  }
  const shoulder = 1.38 * H / 1.7;
  const up = style === "graduateToss";
  for (const s of [-1, 1]) {
    if (up && (s > 0 || r() < 0.6)) add(new THREE.CylinderGeometry(0.06, 0.05, 0.62, 6), mat4(s * 0.24, shoulder + 0.28, 0.02, 0, 1, 1, 1, 0, -s * 0.25), body);
    else if (style.startsWith("graduate")) add(new THREE.CylinderGeometry(0.075, 0.07, 0.42, 6), mat4(s * 0.16, shoulder - 0.2, 0.12, 0, 1, 1, 1, -1.0, -s * 0.2), body);
    else add(new THREE.CylinderGeometry(0.055, 0.045, 0.62, 6), mat4(s * 0.24, shoulder - 0.3, 0, 0, 1, 1, 1, 0, s * 0.08), style === "monk" ? 0x8a2a1e : cloth);
  }
  add(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 6), mat4(0, shoulder + 0.06, 0), skin);
  add(new THREE.SphereGeometry(0.105, 10, 8), mat4(0, shoulder + 0.2, 0.01, 0, 0.92, 1.08, 1), skin);
  if (style !== "monk") add(new THREE.SphereGeometry(0.112, 10, 6, 0, Math.PI * 2, 0, Math.PI * (fem ? 0.62 : 0.5)), mat4(0, shoulder + 0.215, -0.005), hair);
  if (fem && style !== "monk") add(new THREE.BoxGeometry(0.2, 0.32, 0.08), mat4(0, shoulder + 0.05, -0.08), hair);
  if (style.startsWith("graduate")) {
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(0.07, 0.55, 0.02), mat4(s * 0.09, shoulder - 0.27, 0.19, 0, 1, 1, 1, -0.12, s * 0.05), 0xb3201c);
      add(new THREE.BoxGeometry(0.075, 0.035, 0.022), mat4(s * 0.09, shoulder - 0.06, 0.205, 0, 1, 1, 1, -0.12), 0xd9a632);
    }
    if (!up) {
      add(new THREE.BoxGeometry(0.24, 0.3, 0.025), mat4(0, shoulder - 0.36, 0.3, 0, 1, 1, 1, -0.5), 0x1d3566);
      add(new THREE.BoxGeometry(0.3, 0.025, 0.3), mat4(0, shoulder + 0.32, 0.0, Math.PI / 4), 0x0c0c0e);
      add(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8), mat4(0, shoulder + 0.28, 0.0), 0x0c0c0e);
    }
  }
  return mergeAll(parts);
}

/* N figures of a style spread across variants; returns instanced meshes keyed by variant */
export function crowd(parent: THREE.Object3D, mat: THREE.Material, style: FigureStyle, spots: { p: V3; yaw: number }[], seed: number, variants = 4) {
  const ims: THREE.InstancedMesh[] = [];
  const buckets: { p: V3; yaw: number }[][] = Array.from({ length: variants }, () => []);
  spots.forEach((s, i) => buckets[(i * 7 + seed) % variants].push(s));
  buckets.forEach((list, vi) => {
    if (!list.length) return;
    const g = figureGeo(style, seed * 13 + vi * 101, { female: vi % 2 === 1 });
    const im = new THREE.InstancedMesh(g, mat, list.length);
    list.forEach((s, i) => im.setMatrixAt(i, mat4(s.p[0], s.p[1], s.p[2], s.yaw, 1, 0.96 + ((i * 37) % 9) / 100, 1)));
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); parent.add(im); ims.push(im);
  });
  return ims;
}

/* ---------- baked crowds: real NPCs from ctx.characters, posed once, skinned on the CPU and instanced ---------- */

const _m = new THREE.Matrix4(), _b = new THREE.Matrix4(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _n3 = new THREE.Matrix3();

function pickMesh(root: THREE.Object3D, maxTris: number) {
  const found: (THREE.Mesh | THREE.SkinnedMesh)[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) found.push(o as THREE.Mesh); });
  const tris = (m: THREE.Mesh) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
  found.sort((a, b) => tris(b) - tris(a));
  return found.find((m) => tris(m) <= maxTris) ?? found[found.length - 1];
}

/* skinned → static geometry in root space; `dropAbove` removes the part (aPart) that sits highest on the head (a mortarboard) */
function bake(mesh: THREE.Mesh, root: THREE.Object3D, dropCap: boolean) {
  const src = mesh.geometry, g = new THREE.BufferGeometry();
  const P = src.attributes.position as THREE.BufferAttribute, N = src.attributes.normal as THREE.BufferAttribute | undefined, n = P.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
  const sk = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? (mesh as THREE.SkinnedMesh) : null;
  const J = src.attributes.skinIndex as THREE.BufferAttribute | undefined, W = src.attributes.skinWeight as THREE.BufferAttribute | undefined;
  const bones = sk?.skeleton.bones, inv = sk?.skeleton.boneInverses;
  const boneM = bones ? bones.map((bn, i) => new THREE.Matrix4().multiplyMatrices(bn.matrixWorld, inv![i])) : [];
  for (let i = 0; i < n; i++) {
    _v.fromBufferAttribute(P, i); if (N) _n.fromBufferAttribute(N, i); else _n.set(0, 1, 0);
    if (sk && J && W) {
      _m.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      for (let j = 0; j < 4; j++) { const w = W.getComponent(i, j); if (!w) continue; const e = boneM[J.getComponent(i, j)].elements, d = _m.elements; for (let q = 0; q < 16; q++) d[q] += e[q] * w; }
      _b.multiplyMatrices(sk.bindMatrixInverse, _m).multiply(sk.bindMatrix);
      _v.applyMatrix4(_b); _n.applyMatrix3(_n3.setFromMatrix4(_b));
    }
    _v.applyMatrix4(toRoot); _n.applyMatrix3(_n3.setFromMatrix4(toRoot)).normalize();
    pos.set([_v.x, _v.y, _v.z], i * 3); nor.set([_n.x, _n.y, _n.z], i * 3);
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  for (const k of Object.keys(src.attributes)) if (!["position", "normal", "skinIndex", "skinWeight"].includes(k)) g.setAttribute(k, src.attributes[k]);
  let index = src.index ? Array.from(src.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i);
  const part = src.attributes.aPart as THREE.BufferAttribute | undefined;
  if (dropCap && part) {
    let top = -1e9; for (let i = 0; i < n; i++) top = Math.max(top, pos[i * 3 + 1]);
    const votes = new Map<number, number>();
    for (let i = 0; i < n; i++) if (pos[i * 3 + 1] > top - 0.06) { const p = Math.round(part.getX(i)); votes.set(p, (votes.get(p) ?? 0) + 1); }
    let capPart = -1, best = 0; votes.forEach((c, p) => { if (c > best && p >= 4) { best = c; capPart = p; } });
    if (capPart >= 0) { const keep: number[] = []; for (let t = 0; t < index.length; t += 3) if (Math.round(part.getX(index[t])) !== capPart) keep.push(index[t], index[t + 1], index[t + 2]); index = keep; }
  }
  g.setIndex(index); g.computeBoundingSphere();
  return g;
}

function boneRootPos(root: THREE.Object3D, re: RegExp) {
  let hit: THREE.Object3D | null = null; root.traverse((o) => { if (!hit && re.test(o.name)) hit = o; });
  if (!hit) return null;
  return new THREE.Vector3().setFromMatrixPosition((hit as THREE.Object3D).matrixWorld).applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());
}

export interface Baked { meshes: THREE.InstancedMesh[]; templates: Character[]; hands: { l: THREE.Vector3 | null; r: THREE.Vector3 | null }[] }

/* one InstancedMesh per variant (seed); spots are distributed round-robin. Templates stay alive (they own the materials). */
export async function bakeCrowd(ctx: SceneCtx, parent: THREE.Object3D, kind: NpcKind, seeds: number[], act: CharState, spots: { p: V3; yaw: number; s?: number }[], o: { maxTris?: number; settle?: number; dropCap?: boolean } = {}): Promise<Baked> {
  const meshes: THREE.InstancedMesh[] = [], templates: Character[] = [], hands: Baked["hands"] = [];
  const holder = new THREE.Group();
  for (let v = 0; v < seeds.length; v++) {
    const c = await ctx.characters.npc(kind, seeds[v]); templates.push(c); holder.add(c.root);
    c.play(act, 0); for (let i = 0; i < Math.round((o.settle ?? 0.8) * 30); i++) c.update(1 / 30);
    holder.updateMatrixWorld(true);
    const mesh = pickMesh(c.root, o.maxTris ?? 2600), geo = bake(mesh, c.root, !!o.dropCap);
    hands.push({ l: boneRootPos(c.root, /^hand_l$/i), r: boneRootPos(c.root, /^hand_r$/i) });
    const list = spots.filter((_, i) => i % seeds.length === v);
    if (!list.length) { geo.dispose(); continue; }
    const im = new THREE.InstancedMesh(geo, mesh.material as THREE.Material, list.length);
    list.forEach((s, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(...s.p), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw), new THREE.Vector3(1, 1, 1).multiplyScalar(s.s ?? 1))));
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.userData.variant = v; parent.add(im); meshes.push(im);
  }
  holder.clear();
  return { meshes, templates, hands };
}
