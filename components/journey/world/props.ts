import * as THREE from 'three';
import { Batch, Blobs, box, rbox, cyl, sphere, plane, lathe, tube, cable, mat4, face } from './kit';
import { h2, canvasTex } from './textures';

/* ==== props shared by the chapter scenes. Static ones write into a Batch (merged per surface); animated ones return objects. ==== */

type B = Batch;
const M4 = mat4;

/* broadleaf tree: tapered trunk and limbs, canopy of alpha-tested leaf cards with normals pointing out of the crown */
export function tree(b: B, bl: Blobs, x: number, y: number, z: number, s = 1, kind: 'mango' | 'broad' | 'fine' = 'broad', seed = 1) {
  const trunkH = (kind === 'mango' ? 1.9 : 3.2) * s, tr = (kind === 'mango' ? 0.24 : 0.17) * s, bark = kind === 'mango' ? 0x4a3a2c : 0x5a4a3a;
  b.add(cyl(tr * 0.7, tr, trunkH, 9), 'wood', bark, M4(x, y + trunkH / 2, z));
  const cr = (kind === 'mango' ? 3.3 : 2.5) * s, cy = y + trunkH + cr * (kind === 'mango' ? 0.55 : 0.7);
  for (let i = 0; i < 4; i++) { const a = h2(i, seed) * 6.28, l = cr * 0.8; b.add(tube([new THREE.Vector3(x, y + trunkH * 0.85, z), new THREE.Vector3(x + Math.cos(a) * l * 0.5, cy - cr * 0.2, z + Math.sin(a) * l * 0.5), new THREE.Vector3(x + Math.cos(a) * l, cy + cr * 0.1, z + Math.sin(a) * l)], tr * 0.45, 6, 5), 'wood', bark, undefined); }
  const inner = sphere(cr * (kind === 'fine' ? 0.6 : 0.82), 10, 8); inner.scale(1, kind === 'mango' ? 0.75 : 0.85, 1); b.add(inner, 'matte', kind === 'mango' ? 0x2c4321 : 0x34492a, M4(x, cy, z), true);
  const n = Math.round((kind === 'mango' ? 70 : kind === 'fine' ? 90 : 55) * Math.min(1.6, Math.max(0.8, s))), pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = h2(i, seed + 3) * 2 - 1, th = h2(i, seed + 4) * 6.283, r = cr * (0.62 + 0.42 * Math.cbrt(h2(i, seed + 5))), sq = Math.sqrt(1 - u * u);
    const cx = x + Math.cos(th) * sq * r, cyy = cy + u * r * (kind === 'mango' ? 0.72 : 0.85), cz = z + Math.sin(th) * sq * r, sz = (kind === 'mango' ? 1.9 : 1.6) * s * (0.8 + 0.4 * h2(i, seed + 6));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(h2(i, seed + 7) * 3, h2(i, seed + 8) * 6.28, h2(i, seed + 9) * 3));
    const nv = new THREE.Vector3(cx - x, (cyy - cy) * 1.3 + r * 0.25, cz - z).normalize(), base = pos.length / 3;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, c2]) => { const v = new THREE.Vector3(a * sz / 2, c2 * sz / 2, 0).applyQuaternion(q); pos.push(cx + v.x, cyy + v.y, cz + v.z); nor.push(nv.x, nv.y, nv.z); uv.push((a + 1) / 2, (c2 + 1) / 2); });
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  b.add(g, kind === 'mango' ? 'leaf' : kind === 'fine' ? 'leafF' : 'leafB', 0xffffff);
  bl.add(x, y, z, cr * 2.4, cr * 2.2);
}
export function shrub(b: B, x: number, y: number, z: number, s = 1, col = 0x3c5a26) {
  for (let i = 0; i < 4; i++) { const g = sphere(0.5 * s * (0.7 + 0.4 * h2(i, x)), 9, 7); g.scale(1, 0.75, 1); b.add(g, 'grass', col, M4(x + (h2(i, z) - 0.5) * 0.7 * s, y + 0.32 * s, z + (h2(i, x + 1) - 0.5) * 0.6 * s), true); }
}

/* plastic event chair (the red or white one at every Nepali function) */
export function plasticChair(b: B, bl: Blobs, x: number, y: number, z: number, yaw: number, col = 0xb3262a) {
  b.push(M4(x, y, z, yaw)); b.add(rbox(0.44, 0.04, 0.42, 0.015), 'plastic', col, M4(0, 0.45, 0)); const back = rbox(0.42, 0.42, 0.035, 0.015); b.add(back, 'plastic', col, M4(0, 0.7, -0.2, 0, 0.12));
  [[0.19, 0.18], [-0.19, 0.18], [0.19, -0.18], [-0.19, -0.18]].forEach(([a, c]) => b.add(cyl(0.018, 0.022, 0.46, 6), 'plastic', col, M4(a, 0.23, c, 0, c > 0 ? 0.08 : -0.08, a > 0 ? -0.06 : 0.06), false));
  b.pop(); bl.add(x, y, z, 0.7, 0.7);
}
export function woodChair(b: B, bl: Blobs, x: number, y: number, z: number, yaw: number, col = 0x6b4a30) {
  b.push(M4(x, y, z, yaw)); b.add(box(0.44, 0.04, 0.42), 'wood', col, M4(0, 0.45, 0)); b.add(box(0.42, 0.36, 0.03), 'wood', col, M4(0, 0.7, -0.2, 0, 0.08));
  [[0.19, 0.18], [-0.19, 0.18], [0.19, -0.19], [-0.19, -0.19]].forEach(([a, c]) => b.add(box(0.035, c < 0 ? 0.88 : 0.45, 0.035), 'wood', col, M4(a, c < 0 ? 0.44 : 0.225, c), false));
  b.pop(); bl.add(x, y, z, 0.7, 0.7);
}
export function officeChair(b: B, bl: Blobs, x: number, y: number, z: number, yaw: number, col = 0x24272d) {
  b.push(M4(x, y, z, yaw)); b.add(rbox(0.5, 0.08, 0.48, 0.03), 'fabric', col, M4(0, 0.48, 0)); b.add(rbox(0.46, 0.55, 0.06, 0.03), 'fabric', col, M4(0, 0.82, -0.24, 0, 0.1));
  b.add(cyl(0.025, 0.025, 0.38, 8), 'metal', 0x9aa0a8, M4(0, 0.27, 0)); for (let i = 0; i < 5; i++) { const a = i * 1.2566; b.add(box(0.03, 0.03, 0.32), 'plastic', 0x1c1d20, M4(Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.15, a), false); }
  b.pop(); bl.add(x, y, z, 0.8, 0.8);
}
export function table(b: B, bl: Blobs, x: number, y: number, z: number, w: number, d: number, yaw = 0, opts: { cloth?: number; top?: number; h?: number } = {}) {
  const h = opts.h || 0.76; b.push(M4(x, y, z, yaw));
  if (opts.cloth != null) { b.add(box(w + 0.04, 0.03, d + 0.04), 'fabric', opts.cloth, M4(0, h, 0)); b.add(box(w + 0.06, h - 0.06, 0.02), 'fabric', opts.cloth, M4(0, (h - 0.02) / 2 + 0.04, d / 2 + 0.03)); b.add(box(0.02, h - 0.06, d + 0.04), 'fabric', opts.cloth, M4(w / 2 + 0.03, (h - 0.02) / 2 + 0.04, 0)); b.add(box(0.02, h - 0.06, d + 0.04), 'fabric', opts.cloth, M4(-w / 2 - 0.03, (h - 0.02) / 2 + 0.04, 0)); }
  else { b.add(box(w, 0.04, d), 'wood', opts.top ?? 0xcaa57a, M4(0, h - 0.02, 0)); [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, c]) => b.add(box(0.045, h - 0.04, 0.045), 'steel', 0x3a3d42, M4(a * (w / 2 - 0.05), (h - 0.04) / 2, c * (d / 2 - 0.05)), false)); }
  b.pop(); bl.add(x, y, z, w + 0.6, d + 0.6, yaw);
}
export function pot(b: B, x: number, y: number, z: number, s = 1, flower?: number) {
  b.add(lathe([[0, 0], [0.16 * s, 0], [0.2 * s, 0.32 * s], [0.22 * s, 0.34 * s], [0.18 * s, 0.34 * s], [0, 0.3 * s]], 14), 'concrete', 0xa86a46, M4(x, y, z));
  for (let i = 0; i < 6; i++) { const g = sphere(0.18 * s, 8, 6); g.scale(1, 0.8, 1); b.add(g, 'grass', 0x3f6b2a, M4(x + Math.cos(i) * 0.12 * s, y + (0.42 + 0.14 * (i % 2)) * s, z + Math.sin(i) * 0.12 * s), false); }
  if (flower != null) for (let i = 0; i < 7; i++) b.add(sphere(0.045 * s, 6, 5), 'paint', flower, M4(x + Math.cos(i * 2.1) * 0.17 * s, y + (0.55 + 0.08 * (i % 3)) * s, z + Math.sin(i * 2.1) * 0.17 * s), false);
}
/* marigold garland: an instanced string of flowers sagging between points */
export function garland(pts: THREE.Vector3[], sag: number, col = [0xf29a1a, 0xf2c230]) {
  const list: THREE.Vector3[] = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], c = pts[i + 1], n = Math.ceil(a.distanceTo(c) / 0.06); for (let k = 0; k < n; k++) { const t = k / n; list.push(new THREE.Vector3().lerpVectors(a, c, t).add(new THREE.Vector3(0, -4 * sag * t * (1 - t), 0))); } }
  const g = new THREE.IcosahedronGeometry(0.035, 0), m = new THREE.MeshStandardMaterial({ roughness: 0.9 }), im = new THREE.InstancedMesh(g, m, list.length), d = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((p, i) => { d.position.copy(p); d.rotation.set(i, i * 2, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.set(col[i % col.length])); }); return im;
}

/* two-wheelers: scooter (the Kathmandu default), motorbike, bicycle */
export function scooter(b: B, bl: Blobs, x: number, y: number, z: number, yaw: number, col = 0xc8302a) {
  b.push(M4(x, y, z, yaw));
  [0.62, -0.6].forEach((zz) => { const t = new THREE.TorusGeometry(0.2, 0.065, 8, 18); t.rotateY(Math.PI / 2); b.add(t, 'rubber', 0x1b1c1f, M4(0, 0.26, zz)); b.add(cyl(0.1, 0.1, 0.1, 12), 'metal', 0xb0b4ba, M4(0, 0.26, zz, 0, 0, Math.PI / 2), false); });
  b.add(rbox(0.36, 0.34, 1.0, 0.1), 'car', col, M4(0, 0.48, -0.15)); b.add(rbox(0.32, 0.12, 0.62, 0.05), 'leather', 0x1d1e22, M4(0, 0.7, -0.22)); b.add(rbox(0.36, 0.62, 0.18, 0.06), 'car', col, M4(0, 0.62, 0.45, 0, -0.25));
  b.add(rbox(0.3, 0.06, 0.36, 0.02), 'rubber', 0x2a2b2e, M4(0, 0.34, 0.2)); b.add(cyl(0.022, 0.022, 0.6, 8), 'metal', 0x2a2b2e, M4(0, 1.0, 0.5, 0, 0, Math.PI / 2)); b.add(rbox(0.18, 0.1, 0.1, 0.03), 'car', col, M4(0, 0.98, 0.56));
  b.add(cyl(0.05, 0.05, 0.03, 12), 'glass', 0xfff4d8, M4(0, 0.9, 0.56, 0, Math.PI / 2), false);
  b.pop(); bl.add(x, y, z, 0.7, 1.7, yaw);
}
export function bicycle(b: B, bl: Blobs, x: number, y: number, z: number, yaw: number, col = 0x2f6fd4, lean = 0) {
  b.push(M4(x, y, z, yaw, 0, lean));
  [0.5, -0.5].forEach((zz) => { const t = new THREE.TorusGeometry(0.33, 0.02, 6, 24); t.rotateY(Math.PI / 2); b.add(t, 'rubber', 0x18191b, M4(0, 0.35, zz), false); for (let k = 0; k < 6; k++) b.add(cyl(0.003, 0.003, 0.64, 3), 'metal', 0xc0c4c8, M4(0, 0.35, zz, 0, k * 0.52), false); });
  const P = (a: number[], c: number[]) => b.add(tube([new THREE.Vector3(...a), new THREE.Vector3(...c)], 0.016, 2, 6), 'paint', col, undefined, false);
  P([0, 0.35, -0.5], [0, 0.55, -0.12]); P([0, 0.55, -0.12], [0, 0.82, -0.18]); P([0, 0.55, -0.12], [0, 0.78, 0.36]); P([0, 0.82, -0.18], [0, 0.78, 0.36]); P([0, 0.35, -0.5], [0, 0.82, -0.18]); P([0, 0.78, 0.36], [0, 0.35, 0.5]);
  b.add(rbox(0.1, 0.04, 0.24, 0.02), 'leather', 0x1d1e22, M4(0, 0.88, -0.2)); b.add(cyl(0.012, 0.012, 0.5, 6), 'metal', 0x2a2b2e, M4(0, 0.98, 0.33, 0, 0, Math.PI / 2), false); P([0, 0.78, 0.36], [0, 0.98, 0.33]);
  b.pop(); bl.add(x, y, z, 0.4, 1.6, yaw);
}

/* a vehicle body lofted from a side profile and a width, rounded edges; wheels with tyres and rims */
function wheel(b: B, x: number, y: number, z: number, r: number, w: number) { const t = new THREE.TorusGeometry(r - w * 0.35, w * 0.45, 10, 24); t.rotateY(Math.PI / 2); t.scale(w / (w * 0.9), 1, 1); b.add(t, 'rubber', 0x18191b, M4(x, y, z)); b.add(cyl(r * 0.55, r * 0.55, w * 0.6, 16), 'metal', 0xb9bdc3, M4(x, y, z, 0, 0, Math.PI / 2), false); }
export function bus(b: B, bl: Blobs, x: number, y: number, z: number, yaw: number, col: number, side: THREE.Texture | null, extra: THREE.Group) {
  b.push(M4(x, y, z, yaw)); const L = 9.2, W = 2.35, H = 2.75;
  b.add(rbox(W, H - 0.55, L, 0.18, 3), 'car', col, M4(0, 0.55 + (H - 0.55) / 2, 0)); b.add(rbox(W - 0.08, 0.12, L - 0.2, 0.05), 'paint', 0xf1efe9, M4(0, H + 0.02, 0));
  for (const sx of [1, -1]) { b.add(box(0.03, 0.85, L - 2.2), 'glass', 0x26313c, M4(sx * (W / 2 + 0.005), 1.95, -0.6), false); for (let i = 0; i < 6; i++) b.add(box(0.035, 0.85, 0.07), 'paint', 0x1d1f24, M4(sx * (W / 2 + 0.01), 1.95, -4.4 + i * 1.6), false); b.add(box(0.03, 0.06, L - 0.3), 'paint', 0x1d3f8f, M4(sx * (W / 2 + 0.01), 1.32, 0), false); }
  b.add(box(W - 0.25, 1.05, 0.03), 'glass', 0x26313c, M4(0, 1.95, L / 2 + 0.005), false); b.add(box(W - 0.3, 0.28, 0.03), 'paint', 0x121418, M4(0, 2.62, L / 2 + 0.01), false);
  b.add(box(W - 0.1, 0.32, 0.12), 'steel', 0x2a2b2e, M4(0, 0.62, L / 2 + 0.02)); b.add(box(W - 0.1, 0.32, 0.12), 'steel', 0x2a2b2e, M4(0, 0.62, -L / 2 - 0.02));
  [[3.0], [-2.8]].forEach(([wz]) => { for (const sx of [1, -1]) wheel(b, sx * (W / 2 - 0.2), 0.5, wz, 0.5, 0.32); });
  [0.75, -0.75].forEach((sx) => { b.add(cyl(0.11, 0.11, 0.04, 12), 'glass', 0xfff4d8, M4(sx, 0.95, L / 2 + 0.06, 0, Math.PI / 2), false); b.add(box(0.18, 0.3, 0.04), 'glass', 0xb3201c, M4(sx, 1.0, -L / 2 - 0.06), false); });
  b.pop(); bl.add(x, y, z, W + 0.9, L + 0.8, yaw);
  if (side) { for (const sx of [1, -1]) { const f = face(side, L - 0.6, 0.6); f.position.set(sx * (W / 2 + 0.02), 0.95, 0); f.rotation.y = sx * Math.PI / 2; const gg = new THREE.Group(); gg.position.set(x, y, z); gg.rotation.y = yaw; gg.add(f); extra.add(gg); } }
}
/* a US-style day-cab tractor with a skeletal chassis; a container sits on it when asked */
export function chassisTruck(b: B, bl: Blobs, x: number, y: number, z: number, yaw: number, col: number) {
  b.push(M4(x, y, z, yaw));
  b.add(rbox(2.45, 2.15, 2.3, 0.16), 'car', col, M4(0, 1.95, 4.6)); b.add(rbox(2.4, 0.9, 1.6, 0.14), 'car', col, M4(0, 1.25, 6.35)); b.add(box(2.1, 0.9, 0.03), 'glass', 0x1e2730, M4(0, 2.45, 5.76, 0, -0.18), false);
  b.add(box(1.3, 0.75, 0.05), 'metal', 0xc9ccd2, M4(0, 1.25, 7.17)); for (const sx of [1, -1]) { b.add(box(0.03, 0.75, 1.1), 'glass', 0x1e2730, M4(sx * 1.235, 2.4, 4.6), false); b.add(cyl(0.09, 0.09, 2.6, 10), 'metal', 0xc9ccd2, M4(sx * 1.1, 2.8, 3.35)); b.add(cyl(0.3, 0.3, 1.1, 14), 'metal', 0xc9ccd2, M4(sx * 1.05, 0.75, 4.2, 0, Math.PI / 2)); }
  b.add(box(1.0, 0.25, 12.2), 'steel', 0x22252a, M4(0, 1.1, -0.6)); b.add(box(2.4, 0.12, 0.2), 'steel', 0x22252a, M4(0, 1.22, -6.5)); b.add(box(2.4, 0.12, 0.2), 'steel', 0x22252a, M4(0, 1.22, 5.4));
  [6.0, 3.35, 2.3, -4.3, -5.4].forEach((wz) => { for (const sx of [1, -1]) wheel(b, sx * 0.98, 0.5, wz, 0.5, 0.36); });
  b.pop(); bl.add(x, y, z, 3.2, 14.5, yaw);
}
/* shipping containers: one instanced mesh per scene, corrugated, each with its own colour */
export function containers(list: { x: number; y: number; z: number; yaw: number; col: string; len?: number }[]) {
  const g = new THREE.BoxGeometry(1, 1, 1), uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4.5, uv.getY(i) * 1.0);
  const tex = canvasTex('ctr', 512, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 10) { c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(x, 0, 4, h); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 5, 0, 2, h); } c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6); for (let q = 0; q < 50; q++) { c.fillStyle = `rgba(110,60,30,${(0.08 + h2(q, 171) * 0.2).toFixed(2)})`; c.fillRect(h2(q, 172) * w, h2(q, 173) * h, 2 + h2(q, 174) * 5, 6 + h2(q, 175) * 30); } }, true);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 }), im = new THREE.InstancedMesh(g, m, list.length), d = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((q, i) => { d.position.set(q.x, q.y + 1.3, q.z); d.rotation.set(0, q.yaw, 0); d.scale.set(2.44, 2.59, q.len || 12.19); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.set(q.col)); });
  im.castShadow = im.receiveShadow = true; return im;
}
/* rubber-tyred gantry: two legs frames, a girder box, a trolley with spreader */
export function rtg(b: B, bl: Blobs, x: number, y: number, z: number, span: number, len: number, H = 18, col = 0xe2a316) {
  for (const sz of [len / 2, -len / 2]) for (const sx of [span / 2, -span / 2]) { b.add(box(0.7, H, 0.7), 'paint', col, M4(x + sx, y + H / 2 + 0.6, z + sz)); b.add(box(1.0, 0.9, 1.6), 'steel', 0x2a2b2e, M4(x + sx, y + 0.5, z + sz)); bl.add(x + sx, y, z + sz, 2, 3); }
  for (const sx of [span / 2, -span / 2]) { b.add(box(1.0, 1.2, len + 0.8), 'paint', col, M4(x + sx, y + H + 0.6, z)); b.add(box(0.5, 0.6, len), 'paint', col, M4(x + sx, y + 2.2, z)); b.add(box(0.25, H * 0.7, 0.25), 'paint', col, M4(x + sx, y + H * 0.6, z, 0, 0.5)); }
  for (const sz of [len / 2, -len / 2]) b.add(box(span + 1, 1.3, 1.0), 'paint', col, M4(x, y + H + 0.65, z + sz));
  b.add(box(3.6, 1.6, len * 0.4), 'paint', 0x2f3238, M4(x - span * 0.12, y + H + 1.2, z)); b.add(box(2.6, 0.3, 12.2), 'paint', col, M4(x - span * 0.12, y + H * 0.48, z)); for (const q of [-1, 1]) b.add(cyl(0.03, 0.03, H * 0.5, 4), 'steel', 0x222222, M4(x - span * 0.12 + q * 0.8, y + H * 0.73, z), false);
}
export function lightMast(b: B, bl: Blobs, x: number, y: number, z: number, H = 16) { b.add(cyl(0.12, 0.22, H, 10), 'metal', 0x9aa0a8, M4(x, y + H / 2, z)); b.add(box(1.8, 0.5, 0.5), 'steel', 0x2a2b2e, M4(x, y + H, z)); bl.add(x, y, z, 1, 1); }
/* utility pole with the tangle of cables Kathmandu streets are known for */
export function pole(b: B, x: number, y: number, z: number, H = 8) { b.add(cyl(0.11, 0.15, H, 8), 'concrete', 0xb0aca4, M4(x, y + H / 2, z)); b.add(box(1.2, 0.08, 0.08), 'steel', 0x3a3d42, M4(x, y + H - 0.4, z)); b.add(rbox(0.5, 0.7, 0.4, 0.05), 'steel', 0x6d7278, M4(x + 0.35, y + H - 1.4, z)); }
export function wires(b: B, a: THREE.Vector3, c: THREE.Vector3, n = 4) { for (let i = 0; i < n; i++) { const o = new THREE.Vector3((h2(i, a.x) - 0.5) * 0.6, -0.1 * i - 0.4, (h2(i, a.z) - 0.5) * 0.3); b.add(cable(a.clone().add(o), c.clone().add(o.clone().multiplyScalar(0.7)), 0.25 + 0.2 * h2(i, c.x), 0.012), 'rubber', 0x111111, undefined, false); } }
export function hoop(b: B, x: number, y: number, z: number, yaw: number) {
  b.push(M4(x, y, z, yaw)); b.add(cyl(0.08, 0.1, 3.4, 10), 'paint', 0x1d3f8f, M4(0, 1.7, -1.1)); b.add(box(0.1, 0.1, 1.1), 'paint', 0x1d3f8f, M4(0, 3.25, -0.55)); b.add(box(1.8, 1.05, 0.05), 'plastic', 0xf2f0ea, M4(0, 3.35, 0)); b.add(box(0.59, 0.45, 0.06), 'plastic', 0xc8302a, M4(0, 3.25, 0.005), false);
  const ring = new THREE.TorusGeometry(0.23, 0.012, 6, 24); ring.rotateX(Math.PI / 2); b.add(ring, 'paint', 0xe2621b, M4(0, 3.05, 0.27), false);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; b.add(tube([new THREE.Vector3(Math.cos(a) * 0.23, 3.05, 0.27 + Math.sin(a) * 0.23), new THREE.Vector3(Math.cos(a + 0.4) * 0.15, 2.65, 0.27 + Math.sin(a + 0.4) * 0.15)], 0.004, 2, 3), 'paint', 0xf2f0ea, undefined, false); }
  b.pop();
}
export function goal(b: B, x: number, y: number, z: number, yaw: number) {
  b.push(M4(x, y, z, yaw)); const W = 3, H = 2;
  b.add(cyl(0.045, 0.045, H, 8), 'paint', 0xf2f0ea, M4(W / 2, H / 2, 0)); b.add(cyl(0.045, 0.045, H, 8), 'paint', 0xf2f0ea, M4(-W / 2, H / 2, 0)); b.add(cyl(0.045, 0.045, W, 8), 'paint', 0xf2f0ea, M4(0, H, 0, 0, 0, Math.PI / 2));
  for (let i = 0; i <= 10; i++) b.add(cable(new THREE.Vector3(-W / 2 + i * W / 10, H, 0), new THREE.Vector3(-W / 2 + i * W / 10, 0, -1), 0.05, 0.006), 'paint', 0xdddddd, undefined, false);
  b.pop();
}
/* the national flag of Nepal, two stacked pennants, waving in a vertex shader */
export function nepalFlag(h = 1.2) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.27, 0); s.lineTo(0.43, 0.84); s.lineTo(1.06, 0.84); s.lineTo(0, 1.67); s.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(s, 12), P = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, P.getX(i) / 1.27, P.getY(i) / 1.67);
  const tex = canvasTex('npflag', 256, 336, (c, w, H) => { const sc = w / 1.27; c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, H); c.save(); c.translate(0, H); c.scale(sc, -sc);
    const path = (inset: number) => { c.beginPath(); c.moveTo(inset * 0.4, inset); c.lineTo(1.27 - inset * 2.4, inset); c.lineTo(0.43 + inset * 0.2, 0.84 - inset * 0.3); c.lineTo(1.06 - inset * 2.4, 0.84 - inset * 0.3); c.lineTo(inset * 0.4, 1.67 - inset * 2.2); c.closePath(); };
    c.fillStyle = '#003893'; path(0); c.fill(); c.fillStyle = '#dc143c'; path(0.06); c.fill(); c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(0.3, 0.38, 0.13, 0, 6.283); c.fill(); c.beginPath(); c.arc(0.3, 1.18, 0.09, 0, Math.PI); c.fill(); c.beginPath(); c.arc(0.3, 1.24, 0.07, 0, 6.283); c.fill(); c.restore(); });
  const m = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.85, alphaTest: 0.5, transparent: false });
  const U = { uTime: { value: 0 } }; m.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tfloat fx = transformed.x; transformed.z += sin(fx * 4.0 - uTime * 5.0 + transformed.y * 0.8) * 0.09 * fx + sin(fx * 9.0 - uTime * 8.0) * 0.02 * fx; transformed.x -= 0.04 * fx * fx;'); };
  m.customProgramCacheKey = () => 'flagwave';
  const mesh = new THREE.Mesh(g, m); mesh.scale.setScalar(h / 1.67); mesh.castShadow = true; mesh.userData.U = U; return mesh;
}
/* prayer flags: a line of small cloth squares in the five colours, each fluttering on its own */
export function prayerFlags(a: THREE.Vector3, c: THREE.Vector3, sag: number) {
  const n = Math.round(a.distanceTo(c) / 0.38), g = new THREE.PlaneGeometry(0.3, 0.36, 4, 1); g.translate(0, -0.2, 0);
  const cols = ['#1f5fc4', '#f4f1e8', '#c8302a', '#2f8a4a', '#e8b923'], m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 }), U = { uTime: { value: 0 } };
  m.onBeforeCompile = (sh) => { sh.uniforms.uTime = U.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tfloat iy = -transformed.y; float ph = instanceMatrix[3][0] * 3.1 + instanceMatrix[3][2] * 1.7; transformed.z += sin(uTime * 6.0 + ph) * 0.12 * iy + sin(uTime * 11.0 + ph * 2.0) * 0.03 * iy; transformed.x += sin(uTime * 3.0 + ph) * 0.03 * iy;'); };
  m.customProgramCacheKey = () => 'prayerflag';
  const im = new THREE.InstancedMesh(g, m, n), d = new THREE.Object3D(), col = new THREE.Color(), dir = new THREE.Vector3().subVectors(c, a), yaw = Math.atan2(dir.x, dir.z) - Math.PI / 2;
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; d.position.lerpVectors(a, c, t).add(new THREE.Vector3(0, -4 * sag * t * (1 - t), 0)); d.rotation.set(0, yaw, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, col.set(cols[i % 5])); }
  const grp = new THREE.Group(); grp.add(im); const line = new THREE.Mesh(cable(a, c, sag, 0.008), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 })); grp.add(line); grp.userData.U = U; return grp;
}
/* building block with a gridded facade: storeys, windows, sills and bands, plus a flat roof with parapet and water tanks */
export interface Facade { w: number; d: number; floors: number; fh?: number; col?: number; band?: number; win?: number; mat?: string; tanks?: boolean; balcony?: boolean; shop?: number }
export function building(b: B, bl: Blobs, x: number, y: number, z: number, yaw: number, f: Facade) {
  const fh = f.fh || 3.1, H = f.floors * fh, mat = f.mat || 'plaster', col = f.col ?? 0xe7dfcf;
  b.push(M4(x, y, z, yaw)); b.add(box(f.w, H, f.d), mat, col, M4(0, H / 2, 0));
  for (let fl = 0; fl < f.floors; fl++) {
    const yy = fl * fh;
    if (f.band != null) b.add(box(f.w + 0.08, 0.18, f.d + 0.08), 'paint', f.band, M4(0, yy + fh - 0.09, 0), false);
    const nw = Math.max(1, Math.floor(f.w / 2.6));
    for (let i = 0; i < nw; i++) {
      const wx = -f.w / 2 + (i + 0.5) * f.w / nw;
      if (fl === 0 && f.shop != null) { b.add(box(f.w / nw - 0.5, 2.3, 0.06), 'steel', f.shop, M4(wx, yy + 1.2, f.d / 2 + 0.03), false); for (let k = 0; k < 10; k++) b.add(box(f.w / nw - 0.5, 0.02, 0.07), 'steel', 0x000000, M4(wx, yy + 0.2 + k * 0.22, f.d / 2 + 0.04), false); continue; }
      { const r = h2(i * 7 + fl, x + z); b.add(box(1.25, 1.35, 0.06), 'glass', r > 0.75 ? 0x8a7a66 : r > 0.55 ? 0x6b7f8f : (f.win ?? 0x2b3846), M4(wx, yy + 1.55, f.d / 2 + 0.01), false); }
      b.add(box(1.4, 0.07, 0.16), 'concrete', 0xd8d2c6, M4(wx, yy + 0.85, f.d / 2 + 0.07), false); b.add(box(1.4, 0.1, 0.12), 'concrete', 0xd8d2c6, M4(wx, yy + 2.27, f.d / 2 + 0.05), false);
      b.add(box(0.04, 1.35, 0.08), 'steel', 0x3a3d42, M4(wx, yy + 1.55, f.d / 2 + 0.04), false);
      if (f.balcony && fl > 0 && i % 2 === 0) { b.add(box(1.6, 0.12, 0.8), 'concrete', 0xd8d2c6, M4(wx, yy + 0.05, f.d / 2 + 0.4)); for (let k = 0; k < 9; k++) b.add(box(0.025, 0.9, 0.025), 'steel', 0x2a2b2e, M4(wx - 0.75 + k * 0.19, yy + 0.55, f.d / 2 + 0.78), false); b.add(box(1.6, 0.04, 0.04), 'steel', 0x2a2b2e, M4(wx, yy + 1.0, f.d / 2 + 0.78), false); }
    }
  }
  b.add(box(f.w + 0.1, 0.9, 0.15), mat, col, M4(0, H + 0.45, f.d / 2 - 0.07)); b.add(box(f.w + 0.1, 0.9, 0.15), mat, col, M4(0, H + 0.45, -f.d / 2 + 0.07)); b.add(box(0.15, 0.9, f.d), mat, col, M4(f.w / 2 - 0.07, H + 0.45, 0)); b.add(box(0.15, 0.9, f.d), mat, col, M4(-f.w / 2 + 0.07, H + 0.45, 0));
  if (f.tanks) { b.add(cyl(0.6, 0.6, 1.3, 16), 'plastic', 0x1a1b1e, M4(f.w * 0.25, H + 0.65, -f.d * 0.2)); b.add(cyl(0.55, 0.55, 1.2, 16), 'plastic', 0x1a1b1e, M4(f.w * 0.25 - 1.3, H + 0.6, -f.d * 0.2)); }
  b.pop(); bl.add(x, y, z, f.w + 1.5, f.d + 1.5, yaw, 0.8);
  return H;
}
/* rocks: displaced icosahedra */
export function rock(b: B, x: number, y: number, z: number, s: number, seed: number, col = 0x8b8780) {
  const g = new THREE.IcosahedronGeometry(1, 2), P = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i), n = 0.75 + 0.35 * h2(Math.round(v.x * 7 + v.y * 13 + v.z * 5), seed); v.multiplyScalar(n); v.y *= 0.62; P.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); const u = new Float32Array(P.count * 2); for (let i = 0; i < P.count; i++) { u[i * 2] = P.getX(i) * s + P.getZ(i) * s; u[i * 2 + 1] = P.getY(i) * s; } g.setAttribute('uv', new THREE.BufferAttribute(u, 2));
  b.add(g, 'rock', col, M4(x, y + s * 0.3, z, h2(seed, 2) * 6, 0, 0, s, s, s));
}
/* a certificate in a folder: cream paper with a gold border and seal, readable from the front */
export function certificate(title = 'CERTIFICATE', sub = '') {
  const t = canvasTex('cert-' + title + sub, 512, 360, (g, w, h) => { g.fillStyle = '#f6f0e1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b8902f'; g.lineWidth = 14; g.strokeRect(14, 14, w - 28, h - 28); g.lineWidth = 3; g.strokeRect(34, 34, w - 68, h - 68); g.fillStyle = '#2b2b2b'; g.textAlign = 'center'; g.font = '700 40px Georgia, serif'; g.fillText(title, w / 2, 110); g.font = '500 24px Georgia, serif'; g.fillText(sub, w / 2, 160); g.fillStyle = 'rgba(40,40,40,.5)'; for (let i = 0; i < 3; i++) g.fillRect(110, 200 + i * 26, w - 220 - i * 40, 4); g.fillStyle = '#b3261e'; g.beginPath(); g.arc(w - 110, h - 90, 34, 0, 6.283); g.fill(); g.fillStyle = '#d9a93a'; g.beginPath(); g.arc(w - 110, h - 90, 22, 0, 6.283); g.fill(); });
  const grp = new THREE.Group(), paper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.21, 0.004), [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial(i === 4 ? { map: t, roughness: 0.7 } : { color: 0x1d2a5a, roughness: 0.6 })));
  paper.castShadow = true; grp.add(paper); return grp;
}
export { plane };
