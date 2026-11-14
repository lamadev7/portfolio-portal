import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../../contracts";
import type { UVRect } from "./tex";

/* Static geometry batcher: every piece is baked into one merged mesh per material (vertex-coloured, world-space UVs),
   so a whole district costs a handful of draw calls. Colliders are collected alongside. */

export type UVMode = number | [number, number] | "keep" | UVRect;
export interface AddOpts { color?: number | THREE.Color; uv?: UVMode; collide?: boolean }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

export function mat4(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  return new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, "YXZ")), _s.set(sx, sy, sz));
}

function worldUV(g: THREE.BufferGeometry, tu: number, tv: number) {
  const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 3) {
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 3; k++) { nx += n.getX(i + k); ny += n.getY(i + k); nz += n.getZ(i + k); }
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      if (ay >= ax && ay >= az) uv.setXY(i + k, x / tu, z / tv);
      else if (ax >= az) uv.setXY(i + k, (nx > 0 ? -z : z) / tu, y / tv);
      else uv.setXY(i + k, (nz > 0 ? x : -x) / tu, y / tv);
    }
  }
  uv.needsUpdate = true;
}

function rectUV(g: THREE.BufferGeometry, r: UVRect) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
}

export function prep(src: THREE.BufferGeometry, m?: THREE.Matrix4, o: AddOpts = {}) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv" && k !== "color") g.deleteAttribute(k);
  g.morphAttributes = {}; g.clearGroups();
  const n = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  const uvm = o.uv ?? 1;
  if (typeof uvm === "object" && !Array.isArray(uvm)) rectUV(g, uvm);
  if (m) g.applyMatrix4(m);
  if (typeof uvm === "number") worldUV(g, uvm, uvm); else if (Array.isArray(uvm)) worldUV(g, uvm[0], uvm[1]);
  if (o.color !== undefined || !g.attributes.color || g.attributes.color.itemSize !== 3) {
    _c.set((o.color ?? 0xffffff) as THREE.ColorRepresentation);
    const col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  }
  return g;
}

interface Batch { geos: THREE.BufferGeometry[]; cast: boolean; receive: boolean }

export class Builder {
  readonly group = new THREE.Group();
  readonly colliders: THREE.Box3[] = [];
  readonly mats = new Map<string, THREE.Material>();
  /** vertical offset applied to everything added while set (terrain shelves) */
  lift = 0;
  private batches = new Map<string, Batch>();
  private trash: { dispose(): void }[] = [];

  mat(key: string, m: THREE.Material, cast = true, receive = true) {
    (m as THREE.MeshStandardMaterial).vertexColors = true;
    this.mats.set(key, m); this.batches.set(key, { geos: [], cast, receive }); this.trash.push(m);
    return m;
  }
  own<T extends { dispose(): void }>(x: T) { this.trash.push(x); return x; }

  /** a second batch set sharing this builder's materials (e.g. far scenery that can be toggled as one group) */
  child() {
    const c = new Builder();
    for (const [k, m] of this.mats) { c.mats.set(k, m); const b = this.batches.get(k)!; c.batches.set(k, { geos: [], cast: b.cast, receive: b.receive }); }
    this.trash.push({ dispose: () => c.dispose() });
    return c;
  }

  add(key: string, g: THREE.BufferGeometry, m?: THREE.Matrix4, o: AddOpts = {}) {
    const b = this.batches.get(key); if (!b) throw new Error("no material " + key);
    const p = prep(g, this.lift ? new THREE.Matrix4().makeTranslation(0, this.lift, 0).multiply(m ?? new THREE.Matrix4()) : m, o); b.geos.push(p);
    if (o.collide) { p.computeBoundingBox(); this.colliders.push(p.boundingBox!.clone()); }
    return p;
  }

  /* axis-aligned slab from min/max corners */
  aabb(key: string, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, o: AddOpts = {}) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    this.add(key, g, mat4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), o); g.dispose();
  }

  /* box centred at x,z, base at y */
  box(key: string, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, o: AddOpts = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    this.add(key, g, mat4(x, y + h / 2, z, ry), o); g.dispose();
  }

  cyl(key: string, x: number, y: number, z: number, rTop: number, rBot: number, h: number, seg = 12, o: AddOpts & { open?: boolean; ry?: number } = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, o.open ?? false);
    this.add(key, g, mat4(x, y + h / 2, z, o.ry ?? 0), o); g.dispose();
  }

  lathe(key: string, pts: [number, number][], x: number, y: number, z: number, seg = 24, o: AddOpts & { s?: number; ry?: number } = {}) {
    const g = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
    const s = o.s ?? 1; this.add(key, g, mat4(x, y, z, o.ry ?? 0, s, s, s), o); g.dispose();
  }

  /* plane facing +Z before rotation; centred at x,y,z */
  quad(key: string, x: number, y: number, z: number, w: number, h: number, ry = 0, o: AddOpts & { rx?: number } = {}) {
    const g = new THREE.PlaneGeometry(w, h);
    this.add(key, g, mat4(x, y, z, ry, 1, 1, 1, o.rx ?? 0), o); g.dispose();
  }

  /* hip roof (rise 0 → flat) with overhang; ridge along the longer axis; flare lifts the eaves (Newari) */
  hipRoof(key: string, cx: number, y: number, cz: number, w: number, d: number, rise: number, o: AddOpts & { ridge?: number; ry?: number; thick?: number } = {}) {
    const hw = w / 2, hd = d / 2, along = w >= d, rr = o.ridge ?? (along ? Math.max(0, hw - hd) : Math.max(0, hd - hw));
    const top = along ? [[-rr, rise, 0], [rr, rise, 0]] : [[0, rise, -rr], [0, rise, rr]];
    const c = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]];
    const tri: number[] = [];
    const T = (a: number[], b: number[], cc: number[]) => tri.push(...a, ...b, ...cc);
    const [r0, r1] = top;
    if (along) {
      T(c[3], c[2], r1); T(c[3], r1, r0);
      T(c[1], c[0], r0); T(c[1], r0, r1);
      T(c[2], c[1], r1); T(c[0], c[3], r0);
    } else {
      T(c[0], c[3], r1); T(c[0], r1, r0);
      T(c[2], c[1], r0); T(c[2], r0, r1);
      T(c[3], c[2], r1); T(c[1], c[0], r0);
    }
    const th = o.thick ?? 0.18;
    T([-hw, -th, -hd], [hw, -th, -hd], [hw, -th, hd]); T([-hw, -th, -hd], [hw, -th, hd], [-hw, -th, hd]);
    for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; T(a, b, [b[0], -th, b[2]]); T(a, [b[0], -th, b[2]], [a[0], -th, a[2]]); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(tri, 3)); g.computeVertexNormals();
    this.add(key, g, mat4(cx, y, cz, o.ry ?? 0), o); g.dispose();
  }

  /* gable roof, ridge along X before rotation */
  gable(key: string, cx: number, y: number, cz: number, w: number, d: number, rise: number, o: AddOpts & { ry?: number; thick?: number } = {}) {
    const hw = w / 2, hd = d / 2, th = o.thick ?? 0.18, tri: number[] = [];
    const T = (...v: number[]) => tri.push(...v);
    T(-hw, 0, hd, hw, 0, hd, hw, rise, 0); T(-hw, 0, hd, hw, rise, 0, -hw, rise, 0);
    T(hw, 0, -hd, -hw, 0, -hd, -hw, rise, 0); T(hw, 0, -hd, -hw, rise, 0, hw, rise, 0);
    T(-hw, 0, -hd, -hw, 0, hd, -hw, rise, 0); T(hw, 0, hd, hw, 0, -hd, hw, rise, 0);
    T(-hw, -th, -hd, hw, -th, -hd, hw, -th, hd); T(-hw, -th, -hd, hw, -th, hd, -hw, -th, hd);
    T(-hw, 0, hd, -hw, -th, hd, hw, -th, hd); T(-hw, 0, hd, hw, -th, hd, hw, 0, hd);
    T(hw, 0, -hd, hw, -th, -hd, -hw, -th, -hd); T(hw, 0, -hd, -hw, -th, -hd, -hw, 0, -hd);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(tri, 3)); g.computeVertexNormals();
    this.add(key, g, mat4(cx, y, cz, o.ry ?? 0), o); g.dispose();
  }

  /* thin tube between points (wires, rails, pipes) */
  tube(key: string, pts: V3[], r: number, radial = 4, o: AddOpts = {}) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]), len = a.distanceTo(b); if (len < 1e-4) continue;
      const g = new THREE.CylinderGeometry(r, r, len, radial, 1, true);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      this.add(key, g, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), o); g.dispose();
    }
  }

  /* sagging wire between two points */
  wire(key: string, a: V3, b: V3, sag: number, r = 0.012, o: AddOpts = {}) {
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
    this.tube(key, pts, r, 3, o);
  }

  collide(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    y0 += this.lift; y1 += this.lift;
    this.colliders.push(new THREE.Box3(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1))));
  }

  build(parent: THREE.Object3D = this.group) {
    for (const [key, b] of this.batches) {
      if (!b.geos.length) continue;
      const g = mergeGeometries(b.geos, false)!; for (const x of b.geos) x.dispose(); b.geos.length = 0;
      g.computeBoundingSphere(); g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, this.mats.get(key)!); mesh.name = key; mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      parent.add(mesh); this.trash.push(g);
    }
    return parent;
  }

  /* repeated dynamic or numerous objects: one InstancedMesh */
  inst(key: string, src: THREE.BufferGeometry, ms: THREE.Matrix4[], o: { colors?: number[]; cast?: boolean; parent?: THREE.Object3D } = {}) {
    const g = prep(src); const m = this.mats.get(key)!;
    const im = new THREE.InstancedMesh(g, m, Math.max(1, ms.length));
    ms.forEach((x, i) => im.setMatrixAt(i, x)); im.count = ms.length;
    if (o.colors) o.colors.forEach((c, i) => im.setColorAt(i, _c.set(c)));
    im.castShadow = o.cast ?? true; im.receiveShadow = true; im.computeBoundingSphere();
    (o.parent ?? this.group).add(im); this.trash.push(g);
    return im;
  }

  dispose() { for (const t of this.trash) t.dispose(); this.trash.length = 0; }
}

/* ---------- materials ---------- */

export function std(p: THREE.MeshStandardMaterialParameters) { return new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...p }); }
export function glow(intensity = 3) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity) });
  return m;
}

/* additive light pools on the ground (baked practical light), one draw call for all */
export class Pools {
  private geos: THREE.BufferGeometry[] = [];
  constructor(private tex: THREE.Texture) {}
  add(x: number, y: number, z: number, r: number, color: number, k = 1, sy = 1) {
    const g = new THREE.PlaneGeometry(r * 2, r * 2 * sy);
    this.geos.push(prep(g, mat4(x, y + 0.02, z, 0, 1, 1, 1, -Math.PI / 2), { uv: "keep", color: new THREE.Color(color).multiplyScalar(k) }));
    g.dispose();
  }
  wall(x: number, y: number, z: number, ry: number, w: number, h: number, color: number, k = 1) {
    const g = new THREE.PlaneGeometry(w, h);
    this.geos.push(prep(g, mat4(x, y, z, ry), { uv: "keep", color: new THREE.Color(color).multiplyScalar(k) }));
    g.dispose();
  }
  build(parent: THREE.Object3D) {
    if (!this.geos.length) return null;
    const g = mergeGeometries(this.geos, false)!; this.geos.forEach((x) => x.dispose());
    const m = new THREE.MeshBasicMaterial({ map: this.tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 2; mesh.name = "pools"; mesh.matrixAutoUpdate = false; parent.add(mesh);
    return { mesh, dispose() { g.dispose(); m.dispose(); } };
  }
}

/* ---------- path validation ---------- */

function segHitsBox(ax: number, az: number, bx: number, bz: number, x0: number, z0: number, x1: number, z1: number) {
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  const clip = (p: number, q: number) => { if (Math.abs(p) < 1e-9) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
  return clip(-dx, ax - x0) && clip(dx, x1 - ax) && clip(-dz, az - z0) && clip(dz, z1 - az) && t0 <= t1;
}

/* returns human-readable violations; a path segment may not pass within `r` of any collider that overlaps body height */
export function validatePaths(paths: Record<string, V3[]>, colliders: THREE.Box3[], r = 0.3) {
  const out: string[] = [];
  for (const [k, pts] of Object.entries(paths)) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], yLo = Math.min(a[1], b[1]) + 0.25, yHi = Math.max(a[1], b[1]) + 1.7;
      colliders.forEach((c, j) => {
        if (c.max.y < yLo || c.min.y > yHi) return;
        if (segHitsBox(a[0], a[2], b[0], b[2], c.min.x - r, c.min.z - r, c.max.x + r, c.max.z + r)) out.push(`${k}[${i}] hits collider ${j} (${c.min.x.toFixed(1)},${c.min.z.toFixed(1)})-(${c.max.x.toFixed(1)},${c.max.z.toFixed(1)})`);
      });
    }
  }
  return out;
}

export function pointFree(p: V3, colliders: THREE.Box3[], r = 0.3) {
  return !colliders.some((c) => c.max.y >= p[1] + 0.25 && c.min.y <= p[1] + 1.7 && p[0] > c.min.x - r && p[0] < c.max.x + r && p[2] > c.min.z - r && p[2] < c.max.z + r);
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse((x) => {
    const m = x as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mm = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mm)) mm.forEach((q) => q.dispose()); else mm?.dispose();
  });
}
