import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { mat4 } from "./ktm/lib";
import { palette, cityBlock, streetLamp, tree, distantLights, Traffic, scooterGeo, carGeo, type Kit } from "./ktm/props";
import { assemble, lin, railing, plinth, wallWindows } from "./ktm/arch";
import { People, crowd } from "./ktm/people";
import { pond } from "./ktm/water";
import { rng } from "./ktm/tex";

/* Rani Pokhari: the walled pond with Balgopaleshwar's white domed shrine on its island, reached by an arched causeway
   from the west bank, white railings round the water, blue-roofed college blocks and the Ghantaghar beyond. Origin = shrine. */

const PW = 128, PD = 96, BANK = 1.3, WHITE = 0xf3f1ec, RED = 0xb8322a;

function lampPost(k: Kit, x: number, z: number, y = BANK) {
  k.b.cyl("metal", x, y, z, 0.05, 0.09, 3.4, 8, { color: 0x2a2a2e });
  k.b.add("glow", new THREE.SphereGeometry(0.2, 12, 8), mat4(x, y + 3.55, z), { color: lin(1.8, 1.55, 1.1) });
  k.b.cyl("metal", x, y + 3.3, z, 0.12, 0.06, 0.08, 8, { color: 0x2a2a2e });
}

function shrine(k: Kit) {
  const { b } = k;
  /* island plinth: three broad steps, then a railed terrace with four corner chhatris */
  plinth(k, "paint", 0, 0, 22, 22, 3, 0.75, 1.2, WHITE, -0.6);
  b.aabb("paint", -8.6, 1.65, -8.6, 8.6, 1.95, 8.6, { color: 0xe8e4dc });
  for (const [a, c] of [[[-8.4, -8.4], [8.4, -8.4]], [[8.4, -8.4], [8.4, 8.4]], [[8.4, 8.4], [-8.4, 8.4]], [[-8.4, 8.4], [-8.4, 2.4]], [[-8.4, -2.4], [-8.4, -8.4]]] as [number[], number[]][])
    railing(k, "paint", [a[0], 1.95, a[1]], [c[0], 1.95, c[1]], 0.9, { color: WHITE, post: 1.4, bal: 0.35, postW: 0.16 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 8.4, z = sz * 8.4;
    b.box("paint", x, 1.95, z, 1.7, 1.8, 1.7, 0, { color: WHITE }); b.box("paint", x, 3.75, z, 2.0, 0.25, 2.0, 0, { color: 0xe6e2da });
    b.box("paint", x, 1.95, z, 1.76, 0.18, 1.76, 0, { color: RED });
    b.lathe("paint", [[0, 0], [0.75, 0.05], [0.8, 0.4], [0.6, 0.85], [0.25, 1.15], [0.08, 1.35], [0, 1.4]], x, 4.0, z, 16, { color: WHITE });
    b.lathe("gold", [[0, 0], [0.12, 0], [0.06, 0.35], [0.02, 0.6], [0, 0.65]], x, 5.38, z, 8);
  }
  /* upper platform + shrine with a pillared portico on every side */
  plinth(k, "paint", 0, 0, 12.4, 12.4, 3, 0.4, 0.5, WHITE, 1.95);
  b.box("paint", 0, 3.15, 0, 6.4, 4.2, 6.4, 0, { color: WHITE });
  for (const s of [-1, 1]) for (const ax of [0, 1]) {
    for (let i = -1.5; i <= 1.5; i += 1) { const x = ax ? s * 4.9 : i * 2.3, z = ax ? i * 2.3 : s * 4.9; b.cyl("paint", x, 3.15, z, 0.2, 0.22, 3.6, 10, { color: WHITE }); b.box("paint", x, 3.15, z, 0.5, 0.25, 0.5, 0, { color: 0xe6e2da }); }
    const x = ax ? s * 3.21 : 0, z = ax ? 0 : s * 3.21, ry = ax ? (s > 0 ? Math.PI / 2 : -Math.PI / 2) : s > 0 ? 0 : Math.PI;
    b.quad("dark", x, 4.4, z, 1.5, 2.5, ry, { color: 0x2a1a12 }); b.box("paint", x, 3.15, z, ax ? 0.1 : 1.9, 2.9, ax ? 1.9 : 0.1, 0, { color: RED });
  }
  b.box("paint", 0, 6.75, 0, 10.4, 0.45, 10.4, 0, { color: 0xe6e2da });
  b.box("paint", 0, 6.6, 0, 10.5, 0.14, 10.5, 0, { color: RED });
  for (const [a, c] of [[[-5, -5], [5, -5]], [[5, -5], [5, 5]], [[5, 5], [-5, 5]], [[-5, 5], [-5, -5]]] as [number[], number[]][]) {
    railing(k, "paint", [a[0], 7.2, a[1]], [c[0], 7.2, c[1]], 0.75, { color: WHITE, post: 2.5, postW: 0.18 });
    const n = 9;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t; b.add("paint", new THREE.TorusGeometry(0.22, 0.05, 6, 14), mat4(x, 7.58, z, Math.atan2(c[0] - a[0], c[1] - a[1]) + Math.PI / 2), { color: WHITE }); }
  }
  /* drum with lattice windows, cornice, fluted dome, finial + corner pinnacles */
  b.box("paint", 0, 7.2, 0, 5.2, 3.0, 5.2, 0, { color: WHITE });
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const x = Math.sin(ry) * 2.62, z = Math.cos(ry) * 2.62; b.quad("dark", x, 8.7, z, 1.3, 1.4, ry, { color: 0x3a2a20 }); for (let i = 1; i < 4; i++) { b.box("paint", x + Math.cos(ry) * (i - 2) * 0.33, 8.0, z - Math.sin(ry) * (i - 2) * 0.33, 0.05, 1.4, 0.05, ry, { color: 0xd8d0c4 }); b.box("paint", x, 8.0 + i * 0.35, z, Math.abs(Math.cos(ry)) * 1.3 + 0.05, 0.05, Math.abs(Math.sin(ry)) * 1.3 + 0.05, 0, { color: 0xd8d0c4 }); } }
  b.box("paint", 0, 10.2, 0, 6.4, 0.4, 6.4, 0, { color: 0xe6e2da }); b.box("paint", 0, 10.6, 0, 5.6, 0.3, 5.6, 0, { color: WHITE });
  const prof: [number, number][] = [[0, 0], [2.3, 0], [2.55, 0.5], [2.6, 1.2], [2.4, 2.1], [1.9, 2.9], [1.2, 3.5], [0.5, 3.85], [0, 3.95]];
  const dome = new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 32), p = dome.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), f = 1 + 0.035 * Math.abs(Math.sin(a * 8)); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
  dome.computeVertexNormals(); b.add("paint", dome, mat4(0, 10.9, 0), { color: 0xf6f4f0 }); dome.dispose();
  b.lathe("gold", [[0, 0], [0.4, 0], [0.45, 0.25], [0.2, 0.5], [0.35, 0.8], [0.12, 1.3], [0.22, 1.5], [0.05, 2.3], [0, 2.4]], 0, 14.8, 0, 12);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.box("paint", sx * 2.7, 10.9, sz * 2.7, 0.6, 0.5, 0.6, 0, { color: WHITE }); b.lathe("paint", [[0, 0], [0.28, 0], [0.2, 0.5], [0.06, 0.9], [0, 1.0]], sx * 2.7, 11.4, sz * 2.7, 10, { color: WHITE }); b.lathe("gold", [[0, 0], [0.05, 0], [0, 0.4]], sx * 2.7, 12.4, sz * 2.7, 6); }
  for (const [x, z] of [[-11, 3.6], [-11, -3.6], [11, 0]] as const) { b.box("stone", x, 0.05, z, 0.8, 0.35, 0.5, 0, { color: 0x8a8a84 }); }
  b.collide(-11, -1, -11, 11, 16, 11);
}

/* arched causeway from the west bank to the island */
function causeway(k: Kit) {
  const { b } = k, x0 = -PW / 2, x1 = -11, w = 4.6, y = 2.3, n = 9, step = (x1 - x0) / n;
  b.aabb("paint", x0, y - 0.35, -w / 2, x1, y, w / 2, { color: WHITE, uv: 2 });
  b.aabb("pavers", x0, y, -w / 2 + 0.25, x1, y + 0.02, w / 2 - 0.25, { uv: 2, color: 0xc8c4bc });
  for (let i = 0; i < n; i++) {
    const cx = x0 + step * (i + 0.5);
    for (const s of [-1, 1]) {
      const shape = new THREE.Shape(); const hw = step / 2;
      shape.moveTo(-hw, -1.4); shape.lineTo(hw, -1.4); shape.lineTo(hw, y - 0.35); shape.lineTo(-hw, y - 0.35); shape.lineTo(-hw, -1.4);
      const hole = new THREE.Path(); const ar = Math.min(hw * 0.55, 1.2); hole.moveTo(-ar, -1); hole.lineTo(-ar, 0.5); hole.absarc(0, 0.5, ar, Math.PI, 0, true); hole.lineTo(ar, -1); hole.lineTo(-ar, -1); shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false, curveSegments: 10 });
      b.add("paint", g, mat4(cx, 0, s > 0 ? w / 2 - 0.35 : -w / 2, 0), { color: WHITE, uv: 2 }); g.dispose();
    }
  }
  for (const s of [-1, 1]) {
    railing(k, "paint", [x0, y, s * (w / 2 - 0.12)], [x1, y, s * (w / 2 - 0.12)], 0.95, { color: WHITE, post: 1.8, bal: 0.3, postW: 0.14 });
    for (let x = x0 + 1.8; x < x1; x += 1.8 * 3) b.box("paint", x, y + 0.95, s * (w / 2 - 0.12), 0.2, 0.12, 0.2, 0, { color: RED });
  }
  for (let x = x0 + 8; x < x1; x += 13) for (const s of [-1, 1]) lampPost(k, x, s * (w / 2 - 0.12), y);
  b.box("paint", x1 + 0.6, 0, 0, 1.2, 2.3, w + 0.6, 0, { color: WHITE });
  for (let s = 0; s < 5; s++) b.box("paint", x1 + 1.4 + s * 0.45, 0, 0, 0.45, 2.3 - s * 0.4, 3.2, 0, { color: 0xeeeae2 });
}

function bank(k: Kit) {
  const { b } = k, hw = PW / 2, hd = PD / 2;
  b.aabb("stone", -hw - 1, -3, -hd - 1, hw + 1, -0.25, hd + 1, { color: 0x1a2224 });
  for (const [x0, z0, x1, z1] of [[-hw - 1.2, -hd - 1.2, hw + 1.2, -hd], [-hw - 1.2, hd, hw + 1.2, hd + 1.2], [-hw - 1.2, -hd, -hw, hd], [hw, -hd, hw + 1.2, hd]] as const) b.aabb("brick", x0, -1.5, z0, x1, BANK, z1, { uv: 2.5 });
  b.aabb("pavers", -hw - 9, BANK - 0.05, -hd - 9, -hw - 1.2, BANK, hd + 9, { uv: 3 }); b.aabb("pavers", hw + 1.2, BANK - 0.05, -hd - 9, hw + 9, BANK, hd + 9, { uv: 3 });
  b.aabb("pavers", -hw - 1.2, BANK - 0.05, -hd - 9, hw + 1.2, BANK, -hd - 1.2, { uv: 3 }); b.aabb("pavers", -hw - 1.2, BANK - 0.05, hd + 1.2, hw + 1.2, BANK, hd + 9, { uv: 3 });
  for (const [x0, z0, x1, z1] of [[-hw - 9.5, -hd - 9.5, hw + 9.5, -hd - 1.2], [-hw - 9.5, hd + 1.2, hw + 9.5, hd + 9.5], [-hw - 9.5, -hd - 1.2, -hw - 1.2, hd + 1.2], [hw + 1.2, -hd - 1.2, hw + 9.5, hd + 1.2]] as const) b.aabb("concrete", x0, 0, z0, x1, BANK - 0.05, z1, { color: 0x8a8680 });
  const edge: [number, number][][] = [[[-hw - 0.6, -hd - 0.6], [hw + 0.6, -hd - 0.6]], [[hw + 0.6, -hd - 0.6], [hw + 0.6, hd + 0.6]], [[hw + 0.6, hd + 0.6], [-hw - 0.6, hd + 0.6]], [[-hw - 0.6, hd + 0.6], [-hw - 0.6, 2.6]], [[-hw - 0.6, -2.6], [-hw - 0.6, -hd - 0.6]]];
  for (const [a, c] of edge) railing(k, "paint", [a[0], BANK, a[1]], [c[0], BANK, c[1]], 1.0, { color: WHITE, post: 2.2, bal: 0.42, postW: 0.14 });
  for (const [a, c] of [[[-hw - 9, -hd - 9], [hw + 9, -hd - 9]], [[hw + 9, -hd - 9], [hw + 9, hd + 9]], [[hw + 9, hd + 9], [-hw - 9, hd + 9]], [[-hw - 9, hd + 9], [-hw - 9, 3]], [[-hw - 9, -3], [-hw - 9, -hd - 9]]] as [number[], number[]][]) {
    b.aabb("paint", Math.min(a[0], c[0]) - 0.25, BANK, Math.min(a[1], c[1]) - 0.25, Math.max(a[0], c[0]) + 0.25, BANK + 0.6, Math.max(a[1], c[1]) + 0.25, { color: 0xe8e4dc });
    railing(k, "metal", [a[0], BANK + 0.6, a[1]], [c[0], BANK + 0.6, c[1]], 1.1, { color: 0xe8e8e8, post: 2.6, bal: 0.36, postW: 0.08 });
  }
  for (let x = -hw + 4; x <= hw - 4; x += 12) { lampPost(k, x, -hd - 3); lampPost(k, x, hd + 3); }
  for (let z = -hd + 4; z <= hd - 4; z += 12) { if (Math.abs(z) > 4) lampPost(k, -hw - 3, z); lampPost(k, hw + 3, z); }
  for (const [x, z] of [[-hw - 5, -hd - 5], [hw + 5, -hd - 5], [hw + 5, hd + 5], [-hw - 5, hd + 5]] as const) {
    plinth(k, "paint", x, z, 4, 4, 2, 0.4, 0.4, WHITE, BANK);
    b.box("paint", x, BANK + 0.8, z, 2.2, 2.0, 2.2, 0, { color: WHITE }); b.box("paint", x, BANK + 0.8, z, 2.26, 0.16, 2.26, 0, { color: RED });
    b.lathe("paint", [[0, 0], [1.2, 0], [1.0, 0.7], [0.5, 1.4], [0.1, 1.9], [0, 2.0]], x, BANK + 2.8, z, 12, { color: WHITE });
    b.lathe("gold", [[0, 0], [0.12, 0], [0, 0.6]], x, BANK + 4.8, z, 6);
  }
  const r = rng(11);
  for (let i = 0; i < 26; i++) { const side = i % 4, t = r(); const x = side < 2 ? -hw - 6 + t * (PW + 12) : side === 2 ? -hw - 6 : hw + 6, z = side < 2 ? (side ? hd + 6 : -hd - 6) : -hd - 6 + t * (PD + 12); if (Math.abs(z) < 6 && x < 0) continue; tree(k, x, z, 1.2 + r() * 0.7, 300 + i, BANK, 1); }
}

function surroundings(k: Kit, far: Kit) {
  const { b } = k, hw = PW / 2, hd = PD / 2;
  b.aabb("asphalt", -420, -0.2, -420, 420, -0.05, 420, { uv: 8, color: 0x8a8a8a });
  b.aabb("asphalt", -hw - 22, -0.1, -hd - 22, hw + 22, 0, hd + 22, { uv: 6 });
  /* blue-roofed college blocks with pink pillars (north), Ghantaghar clock tower (west) */
  const college = (x0: number, z0: number, x1: number, z1: number, seed: number) => {
    const h = 10.8; b.aabb("paint", x0, 0, z0, x1, h, z1, { color: 0xe8d8b0, uv: 4, collide: true });
    wallWindows(k, { cx: (x0 + x1) / 2, cz: z1, ry: 0, len: x1 - x0 - 1, y0: 1.0, floors: 3, floorH: 3.4, bay: 3.2, ww: 1.4, wh: 1.7, frame: 0x6a4a3a, seed, lit: 0.3 });
    for (let x = x0 + 1.6; x < x1; x += 3.2) b.box("paint", x, 0, z1 + 0.2, 0.7, h, 0.5, 0, { color: 0xc8605a });
    b.hipRoof("tin", (x0 + x1) / 2, h, (z0 + z1) / 2, x1 - x0 + 1.6, z1 - z0 + 1.6, 2.0, { color: 0x2c64b8, uv: 3 });
  };
  college(-60, -hd - 50, 10, -hd - 34, 3); college(22, -hd - 48, 66, -hd - 34, 4);
  const gx = -hw - 40, gz = 10;
  b.box("paint", gx, 0, gz, 5, 22, 5, 0, { color: 0xf0ece2, collide: true }); b.box("paint", gx, 22, gz, 5.6, 0.6, 5.6, 0, { color: 0xe0d8c8 });
  b.box("paint", gx, 22.6, gz, 4.2, 3.6, 4.2, 0, { color: 0xf0ece2 });
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const x = gx + Math.sin(ry) * 2.12, z = gz + Math.cos(ry) * 2.12;
    b.add("glowSoft", new THREE.CircleGeometry(1.25, 32), mat4(x, 24.4, z, ry), { color: lin(1.1, 1.0, 0.8) });
    b.box("dark", x + Math.sin(ry) * 0.02, 24.4, z + Math.cos(ry) * 0.02, 0.08, 0.9, 0.02, ry, { color: 0x111111 });
  }
  b.hipRoof("tin", gx, 26.2, gz, 5, 5, 2.6, { color: 0x2c64b8 }); b.lathe("gold", [[0, 0], [0.15, 0], [0, 1.2]], gx, 28.8, gz, 8);
  k.pool([gx + 4, 18, gz], 10, 0xfff0d0, 0.6);
  const blocks: [number, number, number, number][] = [[-170, -hd - 30, -66, -hd - 140], [72, -hd - 30, 170, -hd - 140], [-170, hd + 24, -60, hd + 90], [-54, hd + 24, 54, hd + 70], [60, hd + 24, 170, hd + 90], [hw + 24, -hd - 24, hw + 100, hd + 20], [-hw - 110, -hd - 24, -hw - 50, -6], [-hw - 110, 28, -hw - 26, hd + 20]];
  blocks.forEach(([x0, z0, x1, z1], i) => cityBlock(far, Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), 800 + i, { floors: [3, 6], front: ["n", "s", "e", "w"] }));
  distantLights(far, 0, 0, 200, 430, 140, 51);
  for (let x = -150; x <= 150; x += 22) { streetLamp(far, x, hd + 21, Math.PI, { color: 0xffd9a8 }); streetLamp(far, x, -hd - 21, 0, { color: 0xffd9a8 }); }
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = palette(ctx.renderer, { facadeSeed: 53, lit: 0.45 }), { b } = k;
  const far: Kit = { ...k, b: b.child() };
  bank(k); shrine(k); causeway(k); surroundings(k, far);
  far.b.build(); b.group.add(far.b.group); b.colliders.push(...far.b.colliders);
  const skip: THREE.Object3D[] = [far.b.group], water = pond(PW, PD, ctx.renderer, 0x9aaab4, skip); b.group.add(water.mesh);

  const spots: { p: V3; yaw: number }[] = [], r = rng(13);
  for (let i = 0; i < 26; i++) { const t = r(); spots.push({ p: [-PW / 2 + 2 + t * (PW - 4), BANK, -PD / 2 - 4.5 - r() * 2.5], yaw: r() * 6.28 }); }
  for (let i = 0; i < 18; i++) { const t = r(); spots.push({ p: [-PW / 2 - 4.5 - r() * 2, BANK, -PD / 2 + 8 + t * (PD - 16)], yaw: r() * 6.28 }); }
  for (let i = 0; i < 8; i++) spots.push({ p: [-PW / 2 + 6 + r() * 40, 2.3, (r() - 0.5) * 2.4], yaw: r() < 0.5 ? Math.PI / 2 : -Math.PI / 2 });
  skip.push(...crowd(b.group, b.mats.get("fabric")!, "casual", spots, 7, 4));
  const people = new People(ctx); skip.push(people.group);
  await Promise.all([people.stand("local", 71, [-20, 2.3, 0.8], Math.PI / 2, "look"), people.stand("local", 72, [-19.2, 2.3, -0.6], -2.4, "talk")]);

  const hw = PW / 2, hd = PD / 2;
  const traffic = new Traffic(b.group, [{ a: [-hw - 15, 0, -170], b: [-hw - 15, 0, 170] }, { a: [hw + 15, 0, 170], b: [hw + 15, 0, -170] }, { a: [-170, 0, hd + 15], b: [170, 0, hd + 15] }, { a: [170, 0, -hd - 15], b: [-170, 0, -hd - 15] }], [
    { geo: scooterGeo(0x2a2a2a), mat: b.mats.get("paint")!, n: 14, v: [7, 11], lamp: 1.0 },
    { geo: carGeo(0xd8d8dc), mat: b.mats.get("paint")!, n: 8, v: [6, 9], lamp: 0.75 },
  ], 4, k.bank.canvas(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false, false));

  k.pool([0, 6, 14], 18, 0xfff2dc, 0.7); k.pool([0, 6, -14], 16, 0xfff2dc, 0.55); k.pool([-14, 8, 0], 14, 0xfff2dc, 0.5); k.pool([14, 8, 0], 14, 0xfff2dc, 0.5);
  k.pool([-38, 4, 0], 16, 0xffe6c0, 0.5);
  const S1 = new THREE.SpotLight(0xfff4e4, 2400, 90, 0.32, 0.6, 1.6); S1.position.set(30, 22, 40); S1.target.position.set(0, 8, 0);
  const S2 = new THREE.SpotLight(0xffe8cc, 1500, 90, 0.34, 0.6, 1.6); S2.position.set(-36, 18, -30); S2.target.position.set(0, 8, 0);
  const P1 = new THREE.PointLight(0xffe6c0, 18, 24, 1.6); P1.position.set(0, 9, 0);
  b.group.add(S1.target, S2.target);
  return assemble({
    id: "ranipokhari", k, people, lights: [S1, S2, P1],
    env: { fog: { color: 0x121a28, near: 90, far: 480 }, moon: 0.9, skyTint: 0x1a2440 },
    arrival: { cam: [-62, 46, 84], look: [0, 4, 0], fov: 50 },
    spawn: { pos: [-hw - 5, BANK, 4], yaw: Math.PI / 2 },
    stands: { flyby: { pos: [0, 16.5, 0], yaw: 0, act: "idle", outfit: "college", shot: { cam: [42, 17, 36], look: [0, 7, 0], fov: 50 } } },
    paths: {},
    tick: (t, dt) => { water.update(t); traffic.update(dt); },
    dispose: () => { water.dispose(); traffic.dispose(); },
  });
}

