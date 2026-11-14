import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Mats } from "./mat";

/* geometry with UVs in metres, so every surface texture tiles at its real size */

export function uvScale(g: THREE.BufferGeometry, su: number, sv: number) { const uv = g.attributes.uv as THREE.BufferAttribute; if (!uv) return g; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }

export function box(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv as THREE.BufferAttribute, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
}
/** box resting on y=0 */
export const boxB = (w: number, h: number, d: number) => box(w, h, d).translate(0, h / 2, 0);

/** rounded box (bevelled extrusion) for furniture, bodies, soft masses */
export function rbox(w: number, h: number, d: number, r: number, seg = 2) {
  r = Math.max(1e-3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  const iw = w - 2 * r, ih = h - 2 * r, s = new THREE.Shape();
  s.moveTo(-iw / 2, -ih / 2); s.lineTo(iw / 2, -ih / 2); s.lineTo(iw / 2, ih / 2); s.lineTo(-iw / 2, ih / 2); s.lineTo(-iw / 2, -ih / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: seg, curveSegments: 1 });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals();
  const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); uv.setXY(i, ax > 0.6 ? p.getZ(i) : p.getX(i), ay > 0.6 ? p.getZ(i) : p.getY(i)); }
  return g;
}
export function cyl(rt: number, rb: number, h: number, seg = 12, open = false) { return uvScale(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), Math.PI * (rt + rb), h); }
export const cylB = (rt: number, rb: number, h: number, seg = 12) => cyl(rt, rb, h, seg).translate(0, h / 2, 0);
export function sphere(r: number, ws = 12, hs = 8) { return uvScale(new THREE.SphereGeometry(r, ws, hs), Math.PI * 2 * r, Math.PI * r); }
export function plane(w: number, h: number) { return uvScale(new THREE.PlaneGeometry(w, h), w, h); }
export function lathe(pts: [number, number][], seg = 16) { const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); let mr = 0, len = 0; pts.forEach((p, i) => { mr = Math.max(mr, p[0]); if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); }); return uvScale(g, Math.PI * 2 * mr, len); }
export function tube(pts: THREE.Vector3[], r: number, seg = 16, rs = 6) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false); let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]); return uvScale(g, len, Math.PI * 2 * r); }
/** sagging rope between two points (parabola), returns the sample points too */
export function catenary(a: THREE.Vector3, b: THREE.Vector3, sag: number, n = 12) { const pts: THREE.Vector3[] = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -4 * sag * t * (1 - t), 0))); } return pts; }
export function cable(a: THREE.Vector3, b: THREE.Vector3, sag: number, r = 0.012) { return tube(catenary(a, b, sag), r, 16, 4); }
export function extrude(shape: THREE.Shape, depth: number, bevel = 0) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 }); g.translate(0, 0, -depth / 2); return g; }
/** polygon in the xz plane extruded up by h (plinths, platforms, pond rims) */
export function prism(pts: [number, number][], h: number) { const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; }

/** sloped cheek wall / ramp: length along +z, height h0 at z=0 falling to h1 at z=len, thickness t (centred on x) */
export function wedge(len: number, h0: number, h1: number, t: number) {
  const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(len, 0), new THREE.Vector2(len, h1), new THREE.Vector2(0, h0)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(t / 2, 0, 0); return uvFromWorld(g);
}
/** gable roof over a w×d footprint (ridge along x, eaves at y=0 on the wall line), eave overhang o, slab thickness t */
export function gableRoof(w: number, d: number, rise: number, o = 0.5, t = 0.08) {
  const a = Math.atan2(rise, d / 2), L = (d / 2 + o) / Math.cos(a);
  const A = box(w + 2 * o, t, L).translate(0, -t / 2, -L / 2).rotateX(-a).translate(0, rise, 0);
  const B = box(w + 2 * o, t, L).translate(0, -t / 2, L / 2).rotateX(a).translate(0, rise, 0);
  return mergeGeometries([A.toNonIndexed(), B.toNonIndexed()])!;
}
/** gable end triangles (fill the wall under a gable roof) */
export function gableEnds(w: number, d: number, rise: number, t = 0.25) {
  const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rise)]);
  const e = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); e.rotateY(Math.PI / 2);
  const l = e.clone().translate(-w / 2, 0, 0), r = e.clone().translate(w / 2 - t, 0, 0);
  const g = mergeGeometries([l, r])!; uvFromWorld(g); return g;
}
/** hip roof (pyramid when w==d) with eave overhang; quads built from a footprint and a ridge */
export function hipRoof(w: number, d: number, rise: number, o = 0.5) {
  const hw = w / 2 + o, hd = d / 2 + o, ridge = Math.max(0, hw - hd), y0 = -rise * (o / Math.min(w / 2, d / 2)), top = rise;
  const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const c = [P(-hw, y0, -hd), P(hw, y0, -hd), P(hw, y0, hd), P(-hw, y0, hd)], r0 = P(-ridge, top, 0), r1 = P(ridge, top, 0);
  const tris: THREE.Vector3[] = [c[3], c[2], r1, c[3], r1, r0, c[1], c[0], r0, c[1], r0, r1, c[2], c[1], r1, c[0], c[3], r0];
  const g = new THREE.BufferGeometry().setFromPoints(tris); g.computeVertexNormals(); uvFromWorld(g); return g;
}
/** planar UVs from world position along the dominant normal axis (metres) */
export function uvFromWorld(g: THREE.BufferGeometry) {
  const geo = g.index ? g : g; if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position as THREE.BufferAttribute, n = geo.attributes.normal as THREE.BufferAttribute, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); if (ay >= ax && ay >= az) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getZ(i); } else if (ax >= az) { uv[i * 2] = p.getZ(i); uv[i * 2 + 1] = p.getY(i); } else { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getY(i); } }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); return geo;
}
/** rough rock: noise-displaced icosahedron, flattened base */
export function rockGeo(r: number, seed: number, detail = 1, squash = 0.7) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 3.1 + seed) * Math.cos(v.z * 2.7 + seed * 1.3) * 0.18 + Math.sin(v.y * 4.3 + seed * 2.1) * 0.1; v.multiplyScalar(1 + n); v.y *= squash; if (v.y < -r * 0.25) v.y = -r * 0.25; p.setXYZ(i, v.x, v.y, v.z); }
  const m = mergeVertices(g.deleteAttribute("normal").deleteAttribute("uv")); m.computeVertexNormals(); uvFromWorld(m); return m;
}

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function mat4(x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) { _e.set(rx, ry, rz, "YXZ"); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); }

/* static batch: every add() lands in a per-material list; build() merges each list into one mesh */
const C = new THREE.Color();
export class Batch {
  lists = new Map<string, THREE.BufferGeometry[]>();
  private stack: THREE.Matrix4[] = [];
  private get top() { return this.stack.length ? this.stack[this.stack.length - 1] : null; }
  /** local frame (a building, a vehicle) so its parts are written in its own coordinates */
  push(m: THREE.Matrix4) { this.stack.push(this.top ? this.top.clone().multiply(m) : m.clone()); return this; }
  pop() { this.stack.pop(); return this; }
  add(geo: THREE.BufferGeometry, key: string, color: THREE.ColorRepresentation, m?: THREE.Matrix4, shadow: boolean | "auto" = "auto", intensity = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const a of Object.keys(g.attributes)) if (a !== "position" && a !== "normal" && a !== "uv") g.deleteAttribute(a);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const M = m ? (this.top ? this.top.clone().multiply(m) : m) : this.top; if (M) g.applyMatrix4(M);
    let sh = shadow === true; if (shadow === "auto") { g.computeBoundingSphere(); sh = g.boundingSphere!.radius > 0.6; }
    C.set(color).multiplyScalar(intensity); const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b; }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const k = key + (sh ? "|s" : "|n"); let l = this.lists.get(k); if (!l) { l = []; this.lists.set(k, l); } l.push(g);
    return this;
  }
  build(into: THREE.Object3D, mats: Mats) {
    this.lists.forEach((list, k) => {
      const [key, sh] = k.split("|"), geo = mergeGeometries(list, false); list.forEach((g) => g.dispose()); if (!geo) return;
      geo.computeBoundingSphere();
      const mat = mats.get(key), mesh = new THREE.Mesh(geo, mat);
      const glow = mat.type === "MeshBasicMaterial";
      mesh.castShadow = sh === "s" && !glow; mesh.receiveShadow = !glow; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.userData.batch = key; into.add(mesh);
    });
    this.lists.clear(); return into;
  }
}

/** constant vertex colour (kit materials multiply by it) */
export function paint(g: THREE.BufferGeometry, color: THREE.ColorRepresentation = 0xffffff) { C.set(color); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g; }

/** instanced copies of one geometry/material: transforms + optional per-instance colour */
export function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, list: { m: THREE.Matrix4; c?: THREE.ColorRepresentation }[], shadow = true) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.c !== undefined) im.setColorAt(i, C.set(it.c)); });
  im.count = list.length; im.castShadow = shadow; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere(); return im;
}
