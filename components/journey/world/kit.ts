import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SURF, leafTex, blobTex, glowTex } from './textures';

/* ---- materials: one per surface kind, white base colour, tinted per vertex so a whole scene draws each surface once ---- */

type SurfKey = keyof typeof SURF;
const TILE: Partial<Record<SurfKey, number>> = { plaster: 3, brick: 1.3, concrete: 4, tin: 1.4, asphalt: 6, dirt: 5, grass: 4, paver: 2, wood: 1.6, fabric: 0.35, denim: 0.2, knit: 0.12, leather: 0.25, carpet: 1, rock: 3, snow: 5, container: 2.6, hair: 0.12 };
export interface MatSpec { surf?: SurfKey; r?: number; m?: number; env?: number; ns?: number; side?: boolean; alpha?: number; emissive?: number; flat?: boolean; inner?: number }
export const MATS: Record<string, MatSpec> = {
  plaster: { surf: 'plaster', r: 0.92, ns: 0.6 }, brick: { surf: 'brick', r: 0.9, ns: 1 }, concrete: { surf: 'concrete', r: 0.88, ns: 0.6 },
  paint: { r: 0.62 }, matte: { r: 0.9 }, tin: { surf: 'tin', r: 0.48, m: 0.45, env: 0.6, ns: 1 }, asphalt: { surf: 'asphalt', r: 0.96, ns: 0.5 },
  dirt: { surf: 'dirt', r: 1, ns: 0.9 }, grass: { surf: 'grass', r: 0.95, ns: 0.6 }, paver: { surf: 'paver', r: 0.85, ns: 0.8 }, wood: { surf: 'wood', r: 0.62, ns: 0.4 },
  fabric: { surf: 'fabric', r: 0.95, ns: 0.6 }, carpet: { surf: 'carpet', r: 1, ns: 0.5 }, rock: { surf: 'rock', r: 0.92, ns: 1.2 }, snow: { surf: 'snow', r: 0.7, ns: 0.6 },
  container: { surf: 'container', r: 0.55, m: 0.35, env: 0.35, ns: 1.2 }, metal: { r: 0.32, m: 0.85, env: 0.8 }, steel: { r: 0.45, m: 0.7, env: 0.5 },
  glass: { r: 0.1, m: 0.55, env: 1.1 }, glassTint: { r: 0.34, m: 0.15, env: 0.4 }, car: { r: 0.3, m: 0.35, env: 0.9 }, plastic: { r: 0.42, env: 0.25 }, rubber: { r: 0.88 },
  leaf: { r: 0.8, alpha: 0.42, side: true }, leafF: { r: 0.8, alpha: 0.42, side: true }, leafB: { r: 0.8, alpha: 0.42, side: true },
  glow: { r: 0.5, emissive: 1 }, screen: { r: 0.25, emissive: 1 },
  /* interiors: a little self-light stands in for bounce light under a roof */
  plasterIn: { surf: 'plaster', r: 0.92, ns: 0.5, inner: 0.32 }, woodIn: { surf: 'wood', r: 0.55, ns: 0.4, inner: 0.28 }, fabricIn: { surf: 'fabric', r: 0.95, ns: 0.5, inner: 0.28 }, paintIn: { r: 0.6, inner: 0.28 }, carpetIn: { surf: 'carpet', r: 1, ns: 0.4, inner: 0.28 }, concreteIn: { surf: 'concrete', r: 0.8, ns: 0.4, inner: 0.3 },
};
const mats = new Map<string, THREE.MeshStandardMaterial>();
let ENV: THREE.Texture | null = null;
export function setEnv(t: THREE.Texture | null) { ENV = t; mats.forEach((m) => { if (m.userData.env) { m.envMap = t; m.needsUpdate = true; } }); }
export function material(key: string): THREE.MeshStandardMaterial {
  const hit = mats.get(key); if (hit) return hit;
  const sp = MATS[key] || MATS.paint, p: THREE.MeshStandardMaterialParameters = { color: 0xffffff, roughness: sp.r ?? 0.8, metalness: sp.m || 0, vertexColors: true };
  if (sp.surf) { const pr = SURF[sp.surf](), tl = TILE[sp.surf] || 2; pr.map.repeat.set(1 / tl, 1 / tl); p.map = pr.map; if (pr.normalMap) { pr.normalMap.repeat.set(1 / tl, 1 / tl); p.normalMap = pr.normalMap; p.normalScale = new THREE.Vector2(sp.ns ?? 1, sp.ns ?? 1); } }
  if (key === 'leaf' || key === 'leafF' || key === 'leafB') { p.map = leafTex(key === 'leafF' ? 'fine' : key === 'leafB' ? 'broad' : 'mango'); p.alphaTest = sp.alpha; }
  if (sp.side) p.side = THREE.DoubleSide;
  if (sp.env) { p.envMap = ENV; p.envMapIntensity = sp.env; }
  if (sp.emissive) { p.emissive = new THREE.Color(0xffffff); p.emissiveIntensity = 0.9; }
  if (sp.inner) { p.emissive = new THREE.Color(0xfff1e0); p.emissiveIntensity = sp.inner; if (p.map) p.emissiveMap = p.map; }
  const m = new THREE.MeshStandardMaterial(p); m.userData.env = !!sp.env; m.userData.key = key;
  if (sp.emissive || sp.inner) { m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor.rgb;'); }; m.customProgramCacheKey = () => 'emisVC'; }
  if (sp.inner) m.userData.inner = sp.inner;
  mats.set(key, m); return m;
}
export function allMaterials() { return mats; }

/* ---- geometry with UVs in metres, so every texture tiles at its real size on any wall or prop ---- */

export function uvScale(g: THREE.BufferGeometry, su: number, sv: number) { const uv = g.attributes.uv as THREE.BufferAttribute; if (!uv) return g; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
export function box(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv as THREE.BufferAttribute, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
}
/* a box with softened edges (bevel via a rounded rectangle extrusion), for furniture, vehicles and bodies of things */
export function rbox(w: number, h: number, d: number, r: number, seg = 3) {
  r = Math.max(1e-3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  const iw = w - 2 * r, ih = h - 2 * r, s = new THREE.Shape();
  s.moveTo(-iw / 2, -ih / 2); s.lineTo(iw / 2, -ih / 2); s.lineTo(iw / 2, ih / 2); s.lineTo(-iw / 2, ih / 2); s.lineTo(-iw / 2, -ih / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: seg, curveSegments: 1 });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals();
  const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); uv.setXY(i, ax > 0.6 ? p.getZ(i) : p.getX(i), ay > 0.6 ? p.getZ(i) : p.getY(i)); }
  return g;
}
export function cyl(rt: number, rb: number, h: number, seg = 16, open = false) { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); return uvScale(g, Math.PI * (rt + rb), h); }
export function sphere(r: number, ws = 16, hs = 12) { const g = new THREE.SphereGeometry(r, ws, hs); return uvScale(g, Math.PI * 2 * r, Math.PI * r); }
export function plane(w: number, h: number) { const g = new THREE.PlaneGeometry(w, h); return uvScale(g, w, h); }
export function lathe(pts: [number, number][], seg = 18) { const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); let mr = 0, len = 0; pts.forEach((p, i) => { mr = Math.max(mr, p[0]); if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); }); return uvScale(g, Math.PI * 2 * mr, len); }
/* a tube along a list of points (cables, rails, handrails, pipes) */
export function tube(pts: THREE.Vector3[], r: number, seg = 24, rs = 6) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false); let len = 0; for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]); return uvScale(g, len, Math.PI * 2 * r); }
/* sagging cable between two points (catenary approximated by a parabola) */
export function cable(a: THREE.Vector3, b: THREE.Vector3, sag: number, r = 0.012) { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -4 * sag * t * (1 - t), 0))); } return tube(pts, r, 16, 4); }
/* a wall-end wedge or any profile in the (z, y) plane, given thickness along x */
export function profileZY(pts: [number, number][], t: number) { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); g.translate(0, 0, -t / 2); g.rotateY(-Math.PI / 2); return g; }
export function extrude(shape: THREE.Shape, depth: number, bevel = 0) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 }); g.translate(0, 0, -depth / 2); return g; }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function mat4(x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) { _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)); }

/* ---- the static batch: every add() lands in a per-material list; build() merges each list into one mesh ---- */

const C = new THREE.Color();
export class Batch {
  lists = new Map<string, THREE.BufferGeometry[]>();
  root: THREE.Matrix4 | null = null;
  stack: THREE.Matrix4[] = [];
  /** push a local frame (a vehicle, a room) so its parts are written in its own coordinates */
  push(m: THREE.Matrix4) { const top = this.root ? this.root.clone().multiply(m) : m.clone(); this.stack.push(top); this.root = top; return this; }
  pop() { this.stack.pop(); this.root = this.stack.length ? this.stack[this.stack.length - 1] : null; return this; }
  add(geo: THREE.BufferGeometry, key: string, color: THREE.ColorRepresentation, m?: THREE.Matrix4, shadow = true) {
    let g = geo.index ? geo : geo.clone();
    if (!g.index) { const n = g.attributes.position.count, idx = new Array(n); for (let i = 0; i < n; i++) idx[i] = i; g = g === geo ? g.clone() : g; g.setIndex(idx); } else g = g.clone();
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'uv') g.deleteAttribute(a);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const M = m ? (this.root ? this.root.clone().multiply(m) : m) : this.root; if (M) g.applyMatrix4(M);
    if (shadow) { g.computeBoundingSphere(); if (g.boundingSphere!.radius < 0.7) shadow = false; }
    C.set(color); const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const k = key + (shadow ? '|s' : ''); let l = this.lists.get(k); if (!l) { l = []; this.lists.set(k, l); } l.push(g);
    return this;
  }
  build(into: THREE.Group) {
    this.lists.forEach((list, k) => {
      const [key, sh] = k.split('|'), geo = mergeGeometries(list, false); list.forEach((g) => g.dispose()); if (!geo) return;
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material(key)); mesh.castShadow = sh === 's'; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.userData.batch = key; into.add(mesh);
    });
    this.lists.clear();
    return into;
  }
}

/* soft contact shadows for everything standing on the ground: one instanced quad per scene */
export class Blobs {
  list: [number, number, number, number, number, number][] = [];
  add(x: number, y: number, z: number, sx: number, sz = sx, ry = 0, a = 1) { this.list.push([x, y + 0.012, z, sx, sz, ry + a * 0]); return this; }
  build(into: THREE.Group, opacity = 0.55) {
    if (!this.list.length) return;
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const im = new THREE.InstancedMesh(g, m, this.list.length), o = new THREE.Object3D();
    this.list.forEach((b, i) => { o.position.set(b[0], b[1], b[2]); o.rotation.set(0, b[5], 0); o.scale.set(b[3], 1, b[4]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.renderOrder = 1; im.userData.blobs = true; into.add(im);
  }
}

export function glowSprite(color: THREE.ColorRepresentation, size: number, opacity = 0.5) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); return s;
}

/* emissive screen / sign face with its own texture (not batched) */
export function face(tex: THREE.Texture, w: number, h: number, opts: { emissive?: number; rough?: number; env?: number } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: opts.rough ?? 0.6, envMapIntensity: opts.env ?? 0.2 });
  if (opts.emissive) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = tex; m.emissiveIntensity = opts.emissive; m.color.set(0x111111); }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); mesh.receiveShadow = !opts.emissive; return mesh;
}

export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; if (mt && !Array.isArray(mt) && !mats.has(mt.userData?.key)) mt.dispose(); });
}
