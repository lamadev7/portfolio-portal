import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { mat4, prep } from "./ktm/lib";
import { palette, cityBlock, streetLamp, tree, carGeo, distantLights, chairGeo, mergeAll, type Kit } from "./ktm/props";
import { assemble, lin, wall, pane, columns } from "./ktm/arch";
import { People, bakeCrowd } from "./ktm/people";
import { gradScreen, gradSide, heraldWordmark } from "./ktm/brand";
import { P, rng } from "./ktm/tex";

/* Herald graduation, hotel ballroom. Hotel tower faces south (z+) onto a porte-cochère; the ballroom sits behind the lobby.
   Inside: crystal chandeliers, a lighting truss, black drapes, LED screens, blue patterned carpet, 70+ graduates and a cap toss. */

const BZ0 = -50, BZ1 = -18, BX = 21, BH = 9;

function hotel(k: Kit) {
  const { b } = k;
  b.aabb("asphalt", -420, -0.2, -420, 420, -0.05, 420, { uv: 8, color: 0x8a8a8a });
  b.aabb("asphalt", -170, -0.1, 20, 170, 0, 30, { uv: 6 });
  b.aabb("pavers", -40, -0.1, -2, 40, 0, 20, { uv: 3, color: 0xb0a898 });
  b.aabb("concrete", -170, -0.1, 30, 170, 0.15, 32, { uv: 3, color: 0x9a968e });
  /* tower: lobby on the ground floor, ten lit floors above */
  const tx0 = -24, tx1 = 24, tz0 = -18, tz1 = -2, TH = 38;
  const fac = (x: number, z: number, w: number, h: number, ry: number) => b.quad("facade", x, 5 + h / 2, z, w, h, ry, { uv: [24, 24], color: 0xd9d2c2 });
  fac(0, tz1, tx1 - tx0, TH - 5, 0); fac(0, tz0, tx1 - tx0, TH - 5, Math.PI); fac(tx1, (tz0 + tz1) / 2, tz1 - tz0, TH - 5, Math.PI / 2); fac(tx0, (tz0 + tz1) / 2, tz1 - tz0, TH - 5, -Math.PI / 2);
  b.aabb("concrete", tx0, TH, tz0, tx1, TH + 0.3, tz1, { color: 0x9a968e });
  b.aabb("paint", tx0 - 0.3, TH, tz0 - 0.3, tx1 + 0.3, TH + 1.6, tz1 + 0.3, { color: 0xcfc6b2, uv: 4 });
  for (let y = 8; y < TH; y += 3) b.aabb("paint", tx0 - 0.15, y - 0.12, tz1, tx1 + 0.15, y + 0.06, tz1 + 0.3, { color: 0xcfc6b2 });
  wall(k, "paint", "x", tz1 - 0.15, tx0, tx1, 0, 5, 0.3, [{ a: -10, b: 10, lo: 0, hi: 4.2 }], { color: 0xcfc6b2 });
  pane(k, "x", tz1 - 0.05, -10, -2, 0, 4.2, 0xb08a40, "glassT", 0xe8d8b8); pane(k, "x", tz1 - 0.05, 2, 10, 0, 4.2, 0xb08a40, "glassT", 0xe8d8b8);
  for (const x of [-2, 2]) b.box("metal", x, 0, tz1 - 0.05, 0.08, 4.2, 0.1, 0, { color: 0xb08a40 });
  b.aabb("paint", tx0, 4.6, tz0, tx1, 5.0, tz1, { color: 0xe8e2d6 });
  wall(k, "paint", "z", tx0 + 0.15, tz0, tz1, 0, 5, 0.3, [], { color: 0xcfc6b2 }); wall(k, "paint", "z", tx1 - 0.15, tz0, tz1, 0, 5, 0.3, [], { color: 0xcfc6b2 });
  /* porte-cochère */
  b.aabb("paint", -8, 4.4, -2, 8, 5.2, 9, { color: 0xeee8dc, uv: 3 });
  b.aabb("gold", -8.1, 4.4, 8.9, 8.1, 4.55, 9.05, { color: 0xffffff });
  columns(k, "paint", [[-7.2, 8.2], [7.2, 8.2]], 0, 4.4, 0.35, 0xe8e2d6);
  for (const x of [-7.2, 7.2]) b.collide(x - 0.4, 0, 7.8, x + 0.4, 4.4, 8.6);
  for (let x = -6; x <= 6; x += 2) for (const z of [1.5, 5]) b.cyl("glow", x, 4.37, z, 0.16, 0.16, 0.03, 10, { color: lin(1.6, 1.25, 0.8) });
  k.pool([0, 4.2, 3.5], 10, 0xffd59a, 0.9);
  b.quad("sign", 0, 4.8, 9.07, 9, 0.62, 0, { uv: heraldWordmark(k.atlas, 900, 62, { bg: "#0d0d10", fg: "#e8d8a8", sub: "GRADUATION CEREMONY" }), color: lin(0.55) });
  /* lobby interior (marble, warm) */
  b.aabb("tile", tx0 + 0.3, 0, tz0 + 0.3, tx1 - 0.3, 0.02, tz1 - 0.3, { uv: 2, color: 0xe8e0d0 });
  for (let x = -16; x <= 16; x += 8) b.cyl("glow", x, 4.55, -10, 0.5, 0.5, 0.04, 16, { color: lin(1.2, 1.0, 0.7) });
  k.pool([0, 4.2, -9], 12, 0xffe2b8, 0.45);
  for (const x of [-14, 14]) { b.box("wood", x, 0, -12, 3.2, 0.42, 1.0, 0, { color: 0x6a4a30, collide: true }); }
  /* ballroom box */
  wall(k, "paint", "x", BZ1 - 0.15, -BX, BX, 0, BH, 0.3, [{ a: -1.6, b: 1.6, lo: 0, hi: 3 }], { color: 0x2a2228 });
  b.aabb("wood", -1.7, 3, BZ1 - 0.35, 1.7, 3.15, BZ1 + 0.05, { color: 0xb08a40 });
  wall(k, "paint", "x", BZ0 + 0.15, -BX, BX, 0, BH, 0.3, [], { color: 0xcfc6b2 });
  wall(k, "paint", "z", -BX + 0.15, BZ0, BZ1, 0, BH, 0.3, [], { color: 0xcfc6b2 }); wall(k, "paint", "z", BX - 0.15, BZ0, BZ1, 0, BH, 0.3, [], { color: 0xcfc6b2 });
  b.aabb("concrete", -BX - 0.3, BH, BZ0 - 0.3, BX + 0.3, BH + 0.5, BZ1 + 0.3, { color: 0x8a8680 });
  for (const s of [-1, 1]) b.quad("facade", s * (BX + 0.01), 4.5, (BZ0 + BZ1) / 2, BZ1 - BZ0, 9, s * Math.PI / 2, { uv: [30, 30], color: 0xd2cab8 });
  /* outside: drive, trees, cars, street */
  for (const [x, z, s] of [[-30, 6, 1.4], [30, 6, 1.4], [-34, -10, 1.2], [34, -10, 1.3], [-20, 15, 1.1], [22, 15, 1.1]] as const) { tree(k, x, z, s, (x * 3 + z) | 0); b.collide(x - 0.4, 0, z - 0.4, x + 0.4, 4, z + 0.4); }
  for (const [x, z, c] of [[-16, 4, 0x1a1a1e], [-19, 4, 0xd8d8dc], [16, 4, 0x2a3a5a], [19, 4, 0xe8e8e8]] as const) { const g = carGeo(c); b.add("paint", g, mat4(x, 0, z, 0), { uv: 1 }); g.dispose(); b.collide(x - 1, 0, z - 2.2, x + 1, 1.5, z + 2.2); }
  for (let x = -150; x <= 150; x += 25) streetLamp(k, x, 30.6, Math.PI, { color: 0xffd9a8 });
  for (const [x, z] of [[-12, 12], [12, 12]] as const) { streetLamp(k, x, z, 0, { h: 4.5, color: 0xfff1d6, pool: 4 }); b.collide(x - 0.12, 0, z - 0.12, x + 0.12, 4.5, z + 0.12); }
  const blocks: [number, number][] = [[-170, -120], [-114, -70], [-64, -20], [-14, 30], [36, 80], [86, 130], [136, 175]];
  blocks.forEach(([a, c], i) => cityBlock(k, a, 32, c, 60, 500 + i, { front: ["n"], floors: [3, 7] }));
  cityBlock(k, -140, -80, -46, 16, 510, { floors: [3, 7] }); cityBlock(k, 46, -80, 140, 16, 511, { floors: [3, 7] });
  cityBlock(k, -40, -130, 40, -60, 512, { floors: [4, 8] });
  distantLights(k, 0, -20, 180, 420, 130, 21);
}

function ballroom(k: Kit) {
  const { b, bank } = k;
  const carpet = bank.canvas(512, 512, P.carpet), drape = bank.canvas(256, 64, P.drape);
  b.mat("carpet", new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }), false, true);
  b.mat("drape", new THREE.MeshStandardMaterial({ map: drape, roughness: 1 }), false, true);
  k.enhance(b.mats.get("carpet")!, "carpet"); k.enhance(b.mats.get("drape")!, "drape");
  const x0 = -BX + 0.3, x1 = BX - 0.3, z0 = BZ0 + 0.3, z1 = BZ1 - 0.3;
  b.aabb("carpet", x0, 0, z0, x1, 0.02, z1, { uv: 4.2 });
  /* black drapes on the walls (front wall gets panelling) */
  b.quad("drape", 0, BH / 2 - 0.5, z0 + 0.05, x1 - x0, BH - 1, 0, { uv: [3, 40] });
  b.quad("drape", x0 + 0.05, BH / 2 - 0.5, (z0 + z1) / 2, z1 - z0, BH - 1, Math.PI / 2, { uv: [3, 40] });
  b.quad("drape", x1 - 0.05, BH / 2 - 0.5, (z0 + z1) / 2, z1 - z0, BH - 1, -Math.PI / 2, { uv: [3, 40] });
  b.aabb("clean", x0, 0, z1 - 0.1, x1, BH, z1, { color: 0x4a3c34 });
  /* coffered ceiling with gold coves */
  b.aabb("clean", x0, BH - 0.6, z0, x1, BH, z1, { color: 0xe6e0d6 });
  for (const cx of [-10, 10]) for (const cz of [-41, -27]) {
    b.aabb("clean", cx - 7, BH - 1.2, cz - 5.5, cx + 7, BH - 0.6, cz - 5.0, { color: 0xe0d8cc }); b.aabb("clean", cx - 7, BH - 1.2, cz + 5.0, cx + 7, BH - 0.6, cz + 5.5, { color: 0xe0d8cc });
    b.aabb("clean", cx - 7, BH - 1.2, cz - 5.5, cx - 6.5, BH - 0.6, cz + 5.5, { color: 0xe0d8cc }); b.aabb("clean", cx + 6.5, BH - 1.2, cz - 5.5, cx + 7, BH - 0.6, cz + 5.5, { color: 0xe0d8cc });
    b.aabb("gold", cx - 6.5, BH - 1.25, cz - 5.0, cx + 6.5, BH - 1.15, cz - 4.9); b.aabb("gold", cx - 6.5, BH - 1.25, cz + 4.9, cx + 6.5, BH - 1.15, cz + 5.0);
    b.box("glow", cx, BH - 0.62, cz - 5.25, 13, 0.04, 0.12, 0, { color: lin(0.9, 0.62, 0.3) }); b.box("glow", cx, BH - 0.62, cz + 5.25, 13, 0.04, 0.12, 0, { color: lin(0.9, 0.62, 0.3) });
  }
  for (let x = -18; x <= 18; x += 4) for (let z = -47; z <= -21; z += 4) b.cyl("glow", x, BH - 1.23, z, 0.09, 0.09, 0.02, 8, { color: lin(1.3, 1.2, 1.0) });
  /* LED screens with green side columns */
  b.aabb("dark", -5.2, 0.2, z0 + 0.1, 5.2, 6.4, z0 + 0.5, { color: 0x111111 });
  b.quad("sign", 0, 3.3, z0 + 0.52, 10, 5.6, 0, { uv: gradScreen(k.atlas), color: lin(0.5) });
  for (const s of [-1, 1]) {
    b.aabb("glow", s * 5.2 - 0.5, 0.2, z0 + 0.3, s * 5.2 + 0.5, 6.4, z0 + 0.6, { color: lin(0.06, 0.28, 0.1) });
    b.box("dark", s * 10.5, 1.4, z0 + 0.9, 6.4, 3.8, 0.3, -s * 0.12, { color: 0x111111 });
    b.quad("sign", s * 10.5 + s * 0.02, 3.3, z0 + 1.07, 6.2, 3.5, -s * 0.12, { uv: gradSide(k.atlas), color: lin(0.42) });
    b.box("metal", s * 10.5, 0, z0 + 0.9, 0.12, 1.4, 0.12, 0, { color: 0x222222 });
  }
  /* risers for the back rows */
  for (let r = 0; r < 2; r++) b.aabb("carpet", -8.5, 0, -37.4, 8.5, 0.25 * (r + 1), -34.8 - r * 1.2, { uv: 4.2, color: 0x7a8aaa });
  /* lighting truss with spot cans */
  const truss = (a: V3, c: V3) => {
    for (const [dy, dz] of [[0, -0.2], [0, 0.2], [0.4, -0.2], [0.4, 0.2]]) b.tube("metal", [[a[0], a[1] + dy, a[2] + dz], [c[0], c[1] + dy, c[2] + dz]], 0.035, 5, { color: 0x9aa0a6 });
    const len = Math.hypot(c[0] - a[0], c[2] - a[2]), n = Math.round(len / 0.5);
    for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; b.tube("metal", [[a[0] + (c[0] - a[0]) * t0, a[1], a[2] + (c[2] - a[2]) * t0 + 0.2], [a[0] + (c[0] - a[0]) * t1, a[1] + 0.4, a[2] + (c[2] - a[2]) * t1 + 0.2]], 0.015, 3, { color: 0x9aa0a6 }); }
  };
  truss([-17, 7.2, -40], [17, 7.2, -40]); truss([-17, 7.2, -26], [17, 7.2, -26]);
  for (const x of [-17, 17]) { const g = new THREE.BoxGeometry(0.5, 0.45, 14); b.add("metal", g, mat4(x, 7.4, -33), { color: 0x9aa0a6 }); g.dispose(); }
  for (let x = -15; x <= 15; x += 3.3) for (const z of [-40, -26]) {
    b.box("dark", x, 6.55, z + 0.1, 0.42, 0.55, 0.42, 0, { color: 0x0e0e10 });
    b.add("glow", new THREE.CircleGeometry(0.16, 14), mat4(x, 6.62, z + 0.33, 0, 1, 1, 1, -0.9), { color: lin(1.6, 1.4, 1.1) });
  }
  /* guest chairs near the doors */
  const chair = chairGeo(0xd8c8a0, 0xd8c8a0), ms: THREE.Matrix4[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 16; c++) { if (c === 7 || c === 8) continue; ms.push(mat4(-12 + c * 1.6, 0, -21.0 - r * 1.3, Math.PI)); }
  b.inst("fabric", chair, ms); chair.dispose();
  b.collide(-12.5, 0, -24.0, -2.0, 1, -20.4); b.collide(2.0, 0, -24.0, 12.5, 1, -20.4);
  k.pool([0, 5, -31], 14, 0xfff0d8, 0.55); k.pool([-10, 6.5, -27], 10, 0xffe0b0, 0.4); k.pool([10, 6.5, -27], 10, 0xffe0b0, 0.4);
  k.pool([-10, 6.5, -41], 9, 0xffe0b0, 0.28); k.pool([10, 6.5, -41], 9, 0xffe0b0, 0.28); k.pool([0, 3.2, -48.5], 7, 0xe8ffe8, 0.3);
}

/* tiered crystal chandelier: gold frame + instanced crystals */
function chandeliers(k: Kit) {
  const { b } = k, crystals: THREE.Matrix4[] = [];
  const spots: [number, number, number][] = [[-10, -27, 1.5], [10, -27, 1.5], [-10, -41, 1.25], [10, -41, 1.25]];
  for (const [cx, cz, s] of spots) {
    const top = BH - 0.62;
    b.cyl("gold", cx, top - 0.5, cz, 0.04, 0.04, 0.5, 6);
    b.lathe("gold", [[0, 0], [1.9 * s, 0.05], [1.95 * s, 0.25], [1.3 * s, 0.3], [0.2, 0.32]], cx, top - 0.85, cz, 28);
    const tiers = 6;
    for (let t = 0; t < tiers; t++) {
      const R = (1.9 - t * 0.27) * s, y = top - 0.95 - t * 0.36 * s, n = Math.round(R * 26), len = (0.55 - t * 0.05) * s;
      b.add("gold", new THREE.TorusGeometry(R, 0.025, 4, 32), mat4(cx, y, cz, 0, 1, 1, 1, Math.PI / 2));
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + t * 0.2; for (let j = 0; j < 3; j++) { crystals.push(mat4(cx + Math.cos(a) * R, y - 0.1 - j * len * 0.38, cz + Math.sin(a) * R, a, 1, 1 + (j === 2 ? 0.4 : 0), 1)); } }
    }
    b.lathe("gold", [[0, 0], [0.35 * s, 0.1], [0.25 * s, 0.4], [0, 0.55]], cx, top - 0.95 - tiers * 0.38 * s - 0.4, cz, 16);
  }
  const cg = new THREE.OctahedronGeometry(0.07, 0); cg.scale(0.7, 1.9, 0.7);
  b.inst("glowSoft", cg, crystals, { cast: false }); cg.dispose();
  for (const [cx, cz] of spots) k.pool([cx, BH - 2.2, cz], 7, 0xfff0d8, 0.35);
}

/* cap toss: rigid caps with gravity, tumbling and a damped bounce on the carpet */
class Caps {
  im: THREE.InstancedMesh; private p: THREE.Vector3[] = []; private v: THREE.Vector3[] = []; private q: THREE.Quaternion[] = []; private w: THREE.Vector3[] = []; private alive: boolean[] = [];
  private home: THREE.Vector3[]; t = -1;
  constructor(parent: THREE.Object3D, mat: THREE.Material, heads: V3[], private zone: THREE.Box3) {
    const parts = [prep(new THREE.BoxGeometry(0.3, 0.02, 0.3), mat4(0, 0.06, 0), { color: 0x0c0c0e }), prep(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10), mat4(0, 0.02, 0), { color: 0x0c0c0e }), prep(new THREE.BoxGeometry(0.012, 0.12, 0.012), mat4(0.12, 0.0, 0.12), { color: 0xd9a632 })];
    this.im = new THREE.InstancedMesh(mergeAll(parts), mat, heads.length); this.im.castShadow = true; this.im.frustumCulled = false; this.im.count = 0; parent.add(this.im);
    this.home = heads.map((h) => new THREE.Vector3(...h));
    for (let i = 0; i < heads.length; i++) { this.p.push(new THREE.Vector3()); this.v.push(new THREE.Vector3()); this.q.push(new THREE.Quaternion()); this.w.push(new THREE.Vector3()); this.alive.push(false); }
  }
  toss(seed: number) {
    const r = rng(seed); this.t = 0;
    this.home.forEach((h, i) => {
      this.p[i].copy(h); this.v[i].set((r() - 0.5) * 1.6, 5.6 + r() * 2.4, 0.6 + r() * 2.2); this.q[i].setFromEuler(new THREE.Euler(r() * 0.3, r() * 6, r() * 0.3));
      this.w[i].set((r() - 0.5) * 14, (r() - 0.5) * 8, (r() - 0.5) * 14); this.alive[i] = true;
    });
    this.im.count = this.home.length;
  }
  private dq = new THREE.Quaternion(); private m = new THREE.Matrix4(); private one = new THREE.Vector3(1, 1, 1); private zero = new THREE.Vector3();
  update(dt: number) {
    if (this.t < 0) return false;
    this.t += dt; const h = Math.min(dt, 1 / 60);
    for (let i = 0; i < this.home.length; i++) {
      if (!this.alive[i]) { this.m.compose(this.p[i], this.q[i], this.zero); this.im.setMatrixAt(i, this.m); continue; }
      const p = this.p[i], v = this.v[i], w = this.w[i];
      v.y -= 9.81 * h; v.multiplyScalar(1 - 0.12 * h); p.addScaledVector(v, h);
      const wl = w.length(); if (wl > 1e-4) { this.dq.setFromAxisAngle(this.zero.copy(w).divideScalar(wl), wl * h); this.q[i].premultiply(this.dq); this.zero.set(0, 0, 0); }
      if (v.y < 0 && p.y < 1.95 && this.zone.containsPoint(p)) { this.alive[i] = false; }
      if (p.y < 0.03) {
        p.y = 0.03; if (Math.abs(v.y) > 0.6) { v.y = -v.y * 0.32; v.x *= 0.6; v.z *= 0.6; w.multiplyScalar(0.45); }
        else { v.set(0, 0, 0); w.multiplyScalar(0.8); const e = new THREE.Euler().setFromQuaternion(this.q[i], "YXZ"); this.q[i].slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, e.y, 0, "YXZ")), Math.min(1, h * 8)); }
      }
      this.m.compose(p, this.q[i], this.one); this.im.setMatrixAt(i, this.m);
    }
    this.im.instanceMatrix.needsUpdate = true;
    if (this.t > 9) { this.t = -1; this.im.count = 0; return true; }
    return false;
  }
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = palette(ctx.renderer, { facadeSeed: 23, lit: 0.55 }), { b } = k;
  hotel(k); ballroom(k); chandeliers(k);

  /* graduates: 4 rows on the carpet + risers, folders in hand; a second set with arms up for the toss */
  const spots: { p: V3; yaw: number }[] = [], heads: V3[] = [], r = rng(5);
  for (let row = 0; row < 4; row++) {
    const n = row === 0 ? 15 : 17, y = row < 2 ? 0 : 0.25 * (row - 1), z = -33.0 - row * 1.2;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.82 + (row % 2) * 0.3 + (r() - 0.5) * 0.12;
      if (row === 0 && Math.abs(x) < 2.2) continue;
      spots.push({ p: [x, y, z + (r() - 0.5) * 0.2], yaw: (r() - 0.5) * 0.4 - x * 0.02 }); heads.push([x, y + 1.72, z]);
    }
  }
  const fmat = b.mats.get("fabric")!, front = spots.filter((sp) => sp.p[2] > -34.8), back = spots.filter((sp) => sp.p[2] <= -34.8);
  const fs = [301, 302, 303, 304], bs = [305, 306, 307];
  const calmF = await bakeCrowd(ctx, b.group, "graduate", fs, "cert", front, { maxTris: 2600, settle: 0.6 }), calmK = await bakeCrowd(ctx, b.group, "graduate", bs, "cert", back, { maxTris: 1300, settle: 0.6 });
  const upF = await bakeCrowd(ctx, b.group, "graduate", fs, "toss", front, { maxTris: 2600, settle: 0.5, dropCap: true }), upK = await bakeCrowd(ctx, b.group, "graduate", bs, "toss", back, { maxTris: 1300, settle: 0.5, dropCap: true });
  const calm = [...calmF.meshes, ...calmK.meshes], up = [...upF.meshes, ...upK.meshes]; up.forEach((m) => (m.visible = false));
  [...calmK.meshes, ...upK.meshes].forEach((m) => (m.castShadow = false));
  const fm: THREE.Matrix4[] = [];
  [[front, calmF] as const, [back, calmK] as const].forEach(([list, bk]) => list.forEach((sp, i) => {
    const h = bk.hands[i % bk.hands.length]; if (!h || !h.l || !h.r) return;
    const mid = h.l.clone().add(h.r).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.02, 0.05));
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sp.yaw), p = mid.applyQuaternion(q).add(new THREE.Vector3(...sp.p));
    fm.push(new THREE.Matrix4().compose(p, q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, 0, 0))), new THREE.Vector3(1, 1, 1)));
  }));
  const folders = b.inst("fabric", new THREE.BoxGeometry(0.24, 0.31, 0.02), fm, { colors: fm.map(() => 0x1d3566) });
  calm.push(folders);
  const caps = new Caps(b.group, fmat, heads, new THREE.Box3(new THREE.Vector3(-9, 0, -39.3), new THREE.Vector3(9, 3, -32.2)));

  const people = new People(ctx);
  await Promise.all([
    people.stand("graduate", 91, [-1.5, 0, -32.2], 0.15, "clap"), people.stand("graduate", 92, [1.6, 0, -32.3], -0.2, "wave"),
    people.stand("guest", 95, [-5.6, 0, -21.0], Math.PI, "sit"), people.stand("guest", 96, [4.0, 0, -21.0], Math.PI, "sit"), people.stand("guest", 97, [7.2, 0, -22.3], Math.PI, "sit"),
    people.stand("guest", 98, [-14.5, 0, -28], 0.9, "clap"),
    people.stand("local", 100, [9, 0, 2.5], -0.4, "idle"), people.stand("guest", 101, [-4, 0, 5], 2.6, "talk"), people.stand("guest", 102, [-4.8, 0, 4.2], 0.6, "idle"),
  ]);

  const S1 = new THREE.SpotLight(0xfff0dc, 0, 30, 0.4, 0.6, 1.6), S2 = new THREE.SpotLight(0xfff0dc, 0, 30, 0.6, 0.7, 1.6), P1 = new THREE.PointLight(0xffe2b8, 0, 16, 1.6), P2 = new THREE.PointLight(0xffe2b8, 0, 16, 1.6);
  b.group.add(S1.target, S2.target);
  const rig = (inside: boolean) => {
    if (inside) { S1.position.set(0, 6.4, -25.8); S1.target.position.set(0, 0.8, -35); S1.intensity = 260; S1.angle = 0.85; S1.penumbra = 0.8; S2.position.set(1.5, 4.5, -23); S2.target.position.set(0, 1.3, -30.4); S2.intensity = 40; S2.angle = 0.3; P1.position.set(-9, 5.5, -30); P1.intensity = 10; P2.position.set(9, 5.5, -30); P2.intensity = 10; }
    else { S1.position.set(0, 4.2, 6); S1.target.position.set(0, 0, 3); S1.intensity = 40; S2.position.set(0, 12, 22); S2.target.position.set(0, 10, -2); S2.intensity = 900; S2.angle = 0.7; P1.position.set(-4, 3.8, -9); P1.intensity = 8; P2.position.set(4, 3.8, -9); P2.intensity = 8; }
  };
  let inside: boolean | null = null, auto = 3, tossed = false;
  const stand: V3 = [0, 0, -30.4];
  const route: V3[] = [[-14, 0, 17], [-3, 0, 6.5], [0, 0, 1.2], [0, 0, -3.2], [0, 0, -16.6], [0, 0, -19.6], [0, 0, -25.5], stand];
  return assemble({
    id: "graduation", k, people, lights: [S1, S2, P1, P2],
    env: { fog: { color: 0x121827, near: 80, far: 440 }, moon: 0.75, skyTint: 0x1a2440 },
    arrival: { cam: [26, 24, 34], look: [0, 10, -12], fov: 52 },
    spawn: { pos: route[0], yaw: Math.PI * 0.75 },
    stands: { graduation: { pos: stand, yaw: 0, act: "talk", outfit: "graduate", bubbleSide: "right", shot: { cam: [1.3, 1.75, -23.6], look: [-0.1, 2.9, -40], fov: 56 }, sign: { center: [0, 3.3, -49.2], halfW: 5, halfH: 2.8 } } },
    paths: { "spawn>graduation": route, "graduation>exit": [...route].reverse().map((p, i, a) => (i === a.length - 1 ? [-16, 0, 19] as V3 : p)) },
    events: { beat: (bt) => { if (bt === "toss") { caps.toss(Date.now() % 997); calm.forEach((m) => (m.visible = false)); up.forEach((m) => (m.visible = true)); tossed = true; } } },
    dispose: () => { [calmF, calmK, upF, upK].forEach((x) => x.templates.forEach((c) => c.dispose())); },
    tick: (t, dt, f) => {
      const inn = f.heroPos[2] < -2; if (inn !== inside) { inside = inn; rig(inn); }
      if (f.beat === "toss" && !tossed) { caps.toss(Math.round(t * 100)); calm.forEach((m) => (m.visible = false)); up.forEach((m) => (m.visible = true)); tossed = true; }
      if (f.line === undefined && f.chapter === "graduation") { auto -= dt; if (auto < 0 && caps.t < 0) { auto = 3; caps.toss(Math.round(t * 100)); calm.forEach((m) => (m.visible = false)); up.forEach((m) => (m.visible = true)); } }
      if (caps.update(dt)) { calm.forEach((m) => (m.visible = true)); up.forEach((m) => (m.visible = false)); if (f.beat !== "toss") tossed = false; }
    },
  });
}
