import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { mat4, prep } from "./ktm/lib";
import { palette, cityBlock, streetLamp, tree, chairGeo, monitor, plant, carGeo, distantLights, type Kit } from "./ktm/props";
import { assemble, lin, wall, pane } from "./ktm/arch";
import { People } from "./ktm/people";
import { muralTex, dashTex, nodeLabel } from "./ktm/brand";
import { fitText, SANS } from "./ktm/tex";

/* PortPro, Lalitpur. A white two-level block with a cantilevered glass box, facing a lawn (z+). Ground floor = open office.
   "agents": orchestrator + dispatcher / billing / CSR sub-agent holograms over his three-monitor desk. */

const WHITE = 0xf2f1ee;
const X0 = -14, X1 = 26, Z0 = -30, Z1 = -8;

function shell(k: Kit) {
  const { b } = k;
  b.aabb("asphalt", -420, -0.2, -420, 420, -0.05, 420, { uv: 8, color: 0x8a8a8a });
  b.aabb("grass", -40, -0.1, Z1, 44, 0.0, 30, { uv: 4 });
  b.aabb("pavers", -40, -0.1, -44, 44, 0.0, Z1, { uv: 3 });
  b.add("concrete", new THREE.BoxGeometry(2.4, 0.06, 46), mat4(16.75, 0.0, 11, 0.61), { color: 0xc8c4bc, uv: 2 });
  b.aabb("concrete", 1.5, -0.05, Z1, 6, 0.03, -3, { color: 0xc8c4bc, uv: 2 });
  b.aabb("asphalt", -170, -0.1, 31, 170, 0, 40, { uv: 6 });
  /* ground floor: glazing on the front, ribbon window on the west wall */
  const ops = [{ a: -12, b: 1.6, lo: 0.1, hi: 3.9 }, { a: 1.6, b: 5.4, lo: 0, hi: 3.0 }, { a: 5.4, b: 25, lo: 0.1, hi: 3.9 }];
  wall(k, "paint", "x", Z1 - 0.15, X0, X1, 0, 4.2, 0.3, ops, { color: WHITE });
  for (const o of ops) pane(k, "x", Z1 - 0.05, o.a, o.b, o.lo, o.hi, 0x1c1e22, "glassT", 0xc8d8e0);
  for (let x = -12; x < 25; x += 2.2) if (x < 1.6 || x > 5.4) b.box("metal", x, 0.1, Z1 - 0.05, 0.06, 3.8, 0.1, 0, { color: 0x1c1e22 });
  wall(k, "paint", "z", X0 + 0.15, Z0, Z1, 0, 4.2, 0.3, [{ a: -26, b: -10, lo: 1.1, hi: 3.6 }], { color: WHITE });
  pane(k, "z", X0 + 0.05, -26, -10, 1.1, 3.6, 0x1c1e22, "glassT", 0xc8d8e0);
  for (let z = -25.5; z < -10; z += 0.8) b.box("paint", X0 - 0.35, 0, z, 0.5, 4.1, 0.08, 0, { color: 0xf4f4f2 });
  wall(k, "paint", "z", X1 - 0.15, Z0, Z1, 0, 4.2, 0.3, [], { color: WHITE });
  wall(k, "paint", "x", Z0 + 0.15, X0, X1, 0, 4.2, 0.3, [], { color: WHITE });
  b.aabb("paint", X0 - 0.2, 4.0, Z0 - 0.2, X1 + 0.2, 4.4, Z1 + 0.25, { color: WHITE, uv: 4 });
  /* level 1: long lit band, glass railing terrace to the east */
  b.aabb("paint", X0, 4.4, Z0, X1, 8.0, Z1 - 1.2, { color: WHITE, uv: 4 });
  b.quad("glowSoft", 4, 6.1, Z1 - 1.19, 34, 2.9, 0, { color: lin(0.62, 0.5, 0.34) });
  b.quad("glassT", 4, 6.1, Z1 - 0.9, 34, 3.0, 0, { color: 0x8aa0b0 });
  for (let x = -13; x <= 21; x += 2) b.box("metal", x, 4.6, Z1 - 0.88, 0.06, 3.0, 0.06, 0, { color: 0x1c1e22 });
  for (let x = -12.5; x < 21; x += 2.4) { b.box("dark", x + 0.6, 4.6, Z1 - 1.6, 0.7, 1.1, 0.5, 0, { color: 0x3a3028 }); b.box("dark", x - 0.4, 4.6, Z1 - 1.8, 1.4, 0.75, 0.6, 0, { color: 0xe8e4dc }); }
  b.aabb("glassT", -14, 4.45, Z1 - 0.02, 26, 5.4, Z1 + 0.06, { color: 0x90a8b0 });
  b.tube("metal", [[-14, 5.4, Z1 + 0.02], [26, 5.4, Z1 + 0.02]], 0.03, 5, { color: 0xb8bcc0 });
  /* level 2: cantilevered box with a deep white frame and recessed glazing */
  const cx0 = -16, cx1 = 8, cz0 = -28, cz1 = -3, y0 = 8.2, y1 = 12.6;
  b.aabb("paint", cx0, y0, cz0, cx1, y0 + 0.5, cz1, { color: WHITE, uv: 4 });
  b.aabb("paint", cx0, y1 - 0.6, cz0, cx1, y1, cz1, { color: WHITE, uv: 4 });
  b.aabb("paint", cx0, y0, cz0, cx0 + 0.6, y1, cz1, { color: WHITE, uv: 4 }); b.aabb("paint", cx1 - 0.6, y0, cz0, cx1, y1, cz1, { color: WHITE, uv: 4 });
  b.aabb("paint", cx0, y0, cz0, cx1, y1, cz0 + 0.3, { color: WHITE, uv: 4 });
  b.quad("glowSoft", (cx0 + cx1) / 2, (y0 + y1) / 2 + 0.1, cz1 - 3, cx1 - cx0 - 1.2, y1 - y0 - 1.1, 0, { color: lin(0.55, 0.45, 0.32) });
  b.quad("glassT", (cx0 + cx1) / 2, (y0 + y1) / 2 - 0.05, cz1 - 1.2, cx1 - cx0 - 1.2, y1 - y0 - 1.1, 0, { color: 0x8aa0b0 });
  for (let x = cx0 + 0.6; x <= cx1 - 0.6; x += 3.8) b.box("metal", x, y0 + 0.5, cz1 - 1.18, 0.1, y1 - y0 - 1.1, 0.1, 0, { color: 0x1c1e22 });
  b.aabb("metal", cx0 + 0.6, 10.2, cz1 - 1.25, cx1 - 0.6, 10.3, cz1 - 1.1, { color: 0x1c1e22 });
  for (let z = -26; z < -4; z += 3) b.box("dark", (cx0 + cx1) / 2 + ((z * 7) % 5), y0 + 0.5, z, 1.6, 0.75, 0.8, 0, { color: 0xe0dcd2 });
  for (let x = cx0 + 2; x < cx1; x += 4) for (const z of [-6, -4.5]) b.cyl("glow", x, y0 - 0.02, z, 0.12, 0.12, 0.02, 10, { color: lin(1.4, 1.2, 0.9) });
  b.aabb("paint", cx0 - 0.4, y1, cz0 - 0.4, cx1 + 0.4, y1 + 0.35, cz1 + 0.4, { color: WHITE, uv: 4 });
  b.aabb("paint", X0, 8.0, Z0, X1, 8.2, -9, { color: 0xd8d6d0 });
  /* sign */
  const logo = k.atlas.put(520, 120, (g, w, h) => { g.fillStyle = "#0d1016"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffffff"; fitText(g, "PortPro", w / 2 + 30, h / 2, w - 140, SANS, 92); g.fillStyle = "#3b82f6"; g.beginPath(); g.moveTo(40, 30); g.lineTo(100, 60); g.lineTo(40, 90); g.closePath(); g.fill(); });
  b.aabb("dark", 9.6, 4.75, Z1 - 0.62, 15.4, 5.95, Z1 - 0.5, { color: 0x0d1016 });
  b.quad("sign", 12.5, 5.35, Z1 - 0.49, 5.6, 1.15, 0, { uv: logo, color: lin(0.75) });
  /* lawn lights + trees + wall + gate */
  const bol: [number, number][] = [[-8, -4], [-2, -4], [10, -4], [18, -4]];
  for (let t = 0.12; t < 0.84; t += 0.12) for (const s of [-1, 1]) bol.push([30 - 26.5 * t + s * 1.8 * 0.82, 30 - 38 * t - s * 1.8 * 0.57]);
  for (const [x, z] of bol) { b.cyl("dark", x, 0, z, 0.08, 0.08, 0.7, 8, { color: 0x222226 }); b.cyl("glow", x, 0.62, z, 0.07, 0.07, 0.06, 8, { color: lin(1.6, 1.3, 0.9) }); k.pools.add(x, 0, z, 1.6, 0xffd8a0, 0.2); b.collide(x - 0.1, 0, z - 0.1, x + 0.1, 0.7, z + 0.1); }
  for (const [x, z, s] of [[-30, -2, 1.6], [-26, 12, 1.4], [-34, 20, 1.3], [36, -4, 1.4], [38, 14, 1.2], [-36, -26, 1.5], [36, -30, 1.4]] as const) { tree(k, x, z, s, (x * 11 + z) | 0); b.collide(x - 0.4, 0, z - 0.4, x + 0.4, 4, z + 0.4); }
  wall(k, "paint", "x", 30, -40, 44, 0, 2.0, 0.35, [{ a: 26, b: 34, lo: 0, hi: 2 }], { color: 0xe0dcd2 });
  wall(k, "paint", "z", -40, -44, 30, 0, 2.0, 0.35, [], { color: 0xe0dcd2 }); wall(k, "paint", "z", 44, -44, 30, 0, 2.0, 0.35, [], { color: 0xe0dcd2 });
  wall(k, "paint", "x", -44, -40, 44, 0, 2.0, 0.35, [], { color: 0xe0dcd2 });
  for (const [x, z, c] of [[-28, -36, 0x1a1a1e], [-24, -36, 0xd8d8dc], [-20, -36, 0x8a1f1f]] as const) { const g = carGeo(c); b.add("paint", g, mat4(x, 0, z, 0), { uv: 1 }); g.dispose(); b.collide(x - 1, 0, z - 2.2, x + 1, 1.5, z + 2.2); }
  for (let x = -150; x <= 150; x += 25) streetLamp(k, x, 40.6, Math.PI, { color: 0xffd9a8 });
  const blocks: [number, number][] = [[-170, -120], [-114, -70], [-64, -20], [-14, 30], [36, 80], [86, 130], [136, 175]];
  blocks.forEach(([a, c], i) => cityBlock(k, a, 42, c, 70, 600 + i, { front: ["n"], floors: [3, 6] }));
  cityBlock(k, -140, -80, -50, 26, 610, { floors: [3, 6] }); cityBlock(k, 50, -80, 140, 26, 611, { floors: [3, 6] }); cityBlock(k, -48, -130, 48, -50, 612, { floors: [3, 7] });
  distantLights(k, 0, -20, 180, 420, 130, 31);
  k.pool([12.5, 4.0, -6.5], 8, 0xdfe8ff, 0.5); k.pool([-4, 7.6, -3], 10, 0xffe2b8, 0.5);
  for (const [x, y, z] of [[-10, 1, -5], [2, 1, -5], [16, 1, -5], [-17, 6, -2], [10, 9, -1]] as const) k.pool([x, y, z], 9, 0xffe6c8, 0.45);
}

/* rounded-rectangle linear pendant (dark frame, lit underside) */
function pendant(k: Kit, x: number, z: number, len: number, y = 3.0) {
  const { b } = k, w = 0.9;
  for (const s of [-1, 1]) { b.box("dark", x + s * w / 2, y, z, 0.06, 0.05, len - w, 0, { color: 0x1a1a1c }); b.box("glow", x + s * w / 2, y - 0.012, z, 0.04, 0.01, len - w, 0, { color: lin(1.1, 1.05, 0.95) }); }
  for (const s of [-1, 1]) {
    const t = new THREE.TorusGeometry(w / 2, 0.03, 4, 12, Math.PI); b.add("dark", t, mat4(x, y + 0.025, z + s * (len - w) / 2, s > 0 ? 0 : Math.PI, 1, 1, 1, Math.PI / 2), { color: 0x1a1a1c }); t.dispose();
  }
  for (const s of [-1, 1]) b.tube("metal", [[x, y, z + s * (len / 2 - 0.5)], [x, 4.0, z + s * (len / 2 - 0.5)]], 0.004, 3, { color: 0x888888 });
}

function office(k: Kit) {
  const { b } = k;
  b.mat("floor", new THREE.MeshStandardMaterial({ map: (b.mats.get("paint") as THREE.MeshStandardMaterial).map, roughness: 0.32, metalness: 0.05, vertexColors: true }), false, true);
  k.enhance(b.mats.get("floor")!, "floor");
  b.aabb("floor", X0 + 0.3, 0, Z0 + 0.3, X1 - 0.3, 0.02, Z1 - 0.3, { uv: 5, color: 0x9a9894 });
  b.aabb("clean", X0, 3.98, Z0, X1, 4.0, Z1, { color: 0xf8f4ee });
  for (let x = -10; x < 25; x += 5) for (let z = -27; z < -9; z += 5) b.cyl("glow", x, 3.96, z, 0.25, 0.25, 0.02, 12, { color: lin(1.1, 1.0, 0.85) });
  /* back wall with the mural + orange felt booths */
  b.aabb("clean", X0 + 0.3, 0, Z0 + 0.3, X1 - 0.3, 3.98, Z0 + 0.32, { color: 0xfaf6ee });
  for (const x of [3.4, 6.6]) { b.box("dark", x, 3.7, Z0 + 0.6, 0.18, 0.18, 0.3, 0, { color: 0x1a1a1c }); b.add("glow", new THREE.CircleGeometry(0.07, 10), mat4(x, 3.7, Z0 + 0.76, 0, 1, 1, 1, 0.5), { color: lin(1.8, 1.5, 1.1) }); }
  b.quad("atlas", 5, 1.95, Z0 + 0.34, 4.6, 3.7, 0, { uv: muralTex(k.atlas) });
  for (const x of [-1.5, 11.5]) { b.box("fabric", x, 0, Z0 + 1.2, 2.2, 2.6, 1.8, 0, { color: 0xd8732e, collide: true }); b.box("fabric", x, 2.6, Z0 + 1.2, 2.3, 0.08, 1.9, 0, { color: 0x2a2a2c }); }
  /* benches: desks on both sides of red dividers, monitors, chairs */
  const chair = chairGeo(0xd06a2a, 0x1a1a1c), cm: THREE.Matrix4[] = [];
  let si = 0; const dash = [dashTex(k.atlas, 1), dashTex(k.atlas, 2), dashTex(k.atlas, 3)];
  for (const bx of [-9.6, -4.4, 0.8, 9.2, 14.4, 19.6]) {
    const n = 6, zc = -18.5, len = n * 1.5;
    for (const side of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const z = zc - len / 2 + (i + 0.5) * 1.5, x = bx + side * 0.42;
        b.box("paint", x, 0.72, z, 0.8, 0.04, 1.44, 0, { color: 0xf2f2ee });
        monitor(k, bx + side * 0.18, 0.74, z, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0.58, 0.36, dash[si++ % 3]);
        b.box("dark", bx + side * 0.6, 0.745, z, 0.16, 0.01, 0.42, 0, { color: 0x111111 });
        cm.push(mat4(bx + side * 1.2, 0, z + (i % 2 ? 0.1 : -0.1), side > 0 ? -Math.PI / 2 + 0.15 : Math.PI / 2 - 0.1));
      }
      b.box("metal", bx + side * 0.75, 0, zc - len / 2 + 0.05, 0.06, 0.72, 0.06, 0, { color: 0x2c2c2e }); b.box("metal", bx + side * 0.75, 0, zc + len / 2 - 0.05, 0.06, 0.72, 0.06, 0, { color: 0x2c2c2e });
    }
    b.box("glassT", bx, 0.76, zc, 0.04, 0.5, len - 0.2, 0, { color: 0xd82c2c });
    b.box("paint", bx, 0.76, zc, 0.03, 0.5, len - 0.2, 0, { color: 0xc8241f });
    for (const pz of [zc - 2, zc + 2.5]) { b.box("paint", bx, 1.26, pz, 0.3, 0.2, 0.9, 0, { color: 0xf0f0ee }); for (let i = 0; i < 4; i++) { const g = new THREE.IcosahedronGeometry(0.16, 1); b.add("foliage", g, mat4(bx + (i % 2 - 0.5) * 0.12, 1.52, pz - 0.35 + i * 0.23), { color: new THREE.Color().setHSL(0.27, 0.5, 0.24) }); g.dispose(); } }
    b.collide(bx - 0.85, 0, zc - len / 2, bx + 0.85, 1.3, zc + len / 2);
    pendant(k, bx, zc, len - 0.6);
  }
  cm.push(mat4(-11.9, 0, -12.0, -Math.PI / 2));
  b.inst("dark", chair, cm); chair.dispose();
  plant(k, -12.8, 0, -28.8, 2.4, 7); plant(k, 24.8, 0, -28.8, 2.4, 8); plant(k, 24.8, 0, -9.2, 2.4, 9);
  b.collide(-13.3, 0, -29.3, -12.3, 1.5, -28.3); b.collide(24.3, 0, -29.3, 25.3, 1.5, -28.3); b.collide(24.3, 0, -9.7, 25.3, 1.5, -8.7);
  /* his desk: white top, black A-frame legs, three monitors with dashboards, lamps */
  const dz = -12.0, dx = X0 + 0.95;
  b.box("paint", dx, 0.73, dz, 0.8, 0.04, 2.8, 0, { color: 0xf4f4f2 });
  for (const s of [-1, 1]) for (const t of [-1, 1]) b.add("dark", new THREE.BoxGeometry(0.05, 0.76, 0.06), mat4(dx + t * 0.28, 0.36, dz + s * 1.2, 0, 1, 1, 1, 0, t * 0.12), { color: 0x1a1a1c });
  b.box("dark", dx, 0.62, dz, 0.6, 0.04, 2.5, 0, { color: 0x1a1a1c });
  for (let i = -1; i <= 1; i++) { const ang = Math.PI / 2 - i * 0.28; monitor(k, dx - 0.12 - Math.abs(i) * 0.05, 0.75, dz + i * 0.8, ang, 0.74, 0.44, dash[i + 1], { arm: true }); }
  b.box("dark", dx + 0.22, 0.752, dz, 0.16, 0.015, 0.46, 0, { color: 0x151515 }); b.box("dark", dx + 0.24, 0.752, dz + 0.42, 0.07, 0.02, 0.1, 0, { color: 0x151515 });
  b.cyl("paint", dx - 0.05, 0.75, dz - 1.15, 0.045, 0.04, 0.1, 10, { color: 0xffffff }); b.cyl("dark", dx + 0.05, 0.75, dz - 0.98, 0.04, 0.04, 0.1, 10, { color: 0x111111 });
  b.box("paint", dx - 0.1, 0.75, dz + 1.18, 0.24, 0.1, 0.3, 0, { color: 0x2a3a5a }); b.box("dark", dx - 0.1, 0.75, dz - 1.32, 0.3, 0.12, 0.2, 0, { color: 0x1c1c1e });
  b.cyl("dark", dx + 0.1, 0, dz + 1.75, 0.15, 0.2, 0.03, 10, { color: 0x111111 }); b.tube("dark", [[dx + 0.1, 0, dz + 1.75], [dx + 0.1, 1.6, dz + 1.75], [dx + 0.3, 1.75, dz + 1.5]], 0.015, 5, { color: 0x111111 });
  b.add("dark", new THREE.ConeGeometry(0.1, 0.16, 12, 1, true), mat4(dx + 0.32, 1.7, dz + 1.45, 0, 1, 1, 1, 0.5), { color: 0x111111 }); b.add("glow", new THREE.CircleGeometry(0.08, 10), mat4(dx + 0.34, 1.64, dz + 1.42, 0, 1, 1, 1, -Math.PI / 2 + 0.5), { color: lin(1.8, 1.4, 0.9) });
  b.collide(X0 + 0.3, 0, dz - 1.45, dx + 0.42, 1.2, dz + 1.45);
  k.pool([dx + 0.2, 1.4, dz], 3.2, 0x8fc8ff, 0.5); k.pool([dx + 0.4, 1.6, dz + 1.4], 2.5, 0xffd09a, 0.6);
  k.pool([5, 3.6, -18], 14, 0xffeedc, 0.85); k.pool([-6, 3.6, -16], 10, 0xffeedc, 0.75); k.pool([16, 3.6, -16], 10, 0xffeedc, 0.75); k.pool([5, 2.6, -27.4], 5, 0xffe0b8, 1.1); k.pool([-4, 3.6, -26], 9, 0xffeedc, 0.6); k.pool([16, 3.6, -26], 9, 0xffeedc, 0.6); k.pool([-8, 3.6, -11], 8, 0xffeedc, 0.45);
}

/* orchestrator hologram: central node + three sub-agent nodes, links with travelling pulses */
function hologram(k: Kit, c: V3) {
  const g = new THREE.Group(); g.position.set(...c); g.name = "agents-holo";
  const add = (m: THREE.Material) => { k.b.own(m); return m; };
  const blend = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false } as const;
  const cyan = add(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.1, 1.6), ...blend, opacity: 0.85 }));
  const wire = add(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.8, 1.3), ...blend, wireframe: true, opacity: 0.6 }));
  const lab = add(new THREE.MeshBasicMaterial({ map: k.atlas.tex, color: new THREE.Color(1.4, 1.4, 1.4), ...blend }));
  const nodes: { m: THREE.Object3D; p: THREE.Vector3; col: THREE.Color }[] = [];
  const mk = (p: V3, r: number, color: THREE.Color, label: string, hex: string) => {
    const n = new THREE.Group(); n.position.set(...p);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.55, 1), add(new THREE.MeshBasicMaterial({ color, ...blend, opacity: 0.9 })));
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), wire);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.35, r * 0.04, 6, 40), add(new THREE.MeshBasicMaterial({ color, ...blend, opacity: 0.7 }))); ring.rotation.x = Math.PI / 2;
    const tag = new THREE.Mesh(prep(new THREE.PlaneGeometry(r * 3.6, r * 0.9), undefined, { uv: nodeLabel(k.atlas, label, hex) }), lab); tag.position.y = -r * 1.7;
    n.add(core, shell, ring, tag); g.add(n); nodes.push({ m: n, p: new THREE.Vector3(...p), col: color });
    return n;
  };
  mk([0, 0.55, 0], 0.17, new THREE.Color(0.5, 1.2, 1.8), "Orchestrator", "#7fe0ff");
  mk([-0.75, 0.0, -0.55], 0.1, new THREE.Color(1.6, 0.9, 0.3), "Dispatcher", "#ffb45a");
  mk([0.0, -0.1, -0.85], 0.1, new THREE.Color(0.5, 1.6, 0.7), "Billing", "#7dffa8");
  mk([0.75, 0.0, -0.55], 0.1, new THREE.Color(1.3, 0.6, 1.6), "CSR", "#e08cff");
  const links: { a: THREE.Vector3; b: THREE.Vector3; pulse: THREE.Mesh; back: THREE.Mesh }[] = [];
  const pg = new THREE.SphereGeometry(0.03, 8, 6); k.b.own(pg);
  for (let i = 1; i < 4; i++) {
    const a = nodes[0].p, bb = nodes[i].p, len = a.distanceTo(bb);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, len, 4, 1, true), cyan);
    line.position.copy(a).add(bb).multiplyScalar(0.5); line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bb.clone().sub(a).normalize()); g.add(line);
    const pulse = new THREE.Mesh(pg, add(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2), ...blend })));
    const back = new THREE.Mesh(pg, add(new THREE.MeshBasicMaterial({ color: nodes[i].col.clone().multiplyScalar(1.4), ...blend })));
    g.add(pulse, back); links.push({ a, b: bb, pulse, back });
  }
  const base = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.7, 48), add(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.35, 0.5), ...blend, side: THREE.DoubleSide, opacity: 0.6 })));
  base.rotation.x = -Math.PI / 2; base.position.y = -0.3; g.add(base);
  g.traverse((o) => { o.renderOrder = 5; });
  let vis = 0;
  return {
    group: g,
    update(t: number, dt: number, on: boolean) {
      vis += ((on ? 1 : 0) - vis) * Math.min(1, dt * 2.5); g.visible = vis > 0.02; if (!g.visible) return;
      g.scale.setScalar(0.6 + 0.4 * vis);
      nodes.forEach((n, i) => { n.m.rotation.y = t * (i ? 0.6 : 0.35); n.m.position.y = n.p.y + Math.sin(t * 1.4 + i) * 0.03; });
      links.forEach((l, i) => { const u = (t * 0.45 + i / 3) % 1, w = (t * 0.45 + i / 3 + 0.5) % 1; l.pulse.position.lerpVectors(l.a, l.b, u); l.back.position.lerpVectors(l.b, l.a, w); });
    },
  };
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = palette(ctx.renderer, { facadeSeed: 37, lit: 0.42 }), { b } = k;
  shell(k); office(k);
  const holo = hologram(k, [-12.55, 1.75, -12.0]);
  holo.group.rotation.y = Math.PI / 2; b.group.add(holo.group);

  const people = new People(ctx);
  await Promise.all([
    ...([[-9.6, -1, 1], [-9.6, 1, 3], [-4.4, -1, 4], [-4.4, 1, 0], [0.8, -1, 2], [0.8, 1, 5], [9.2, -1, 1], [9.2, 1, 3], [14.4, -1, 0], [14.4, 1, 4], [19.6, -1, 2], [19.6, 1, 5], [0.8, 1, 1]] as const).map(([bx, side, i], n) =>
      people.stand("colleague", 31 + n, [bx + side * 1.2, 0, -23 + (i + 0.5) * 1.5 + (i % 2 ? 0.1 : -0.1)], side > 0 ? -Math.PI / 2 + 0.15 : Math.PI / 2 - 0.1, n % 4 === 3 ? "sit" : "type")),
    people.stand("colleague", 55, [6.9, 0, -27.4], 2.6, "talk"), people.stand("colleague", 56, [6.3, 0, -28.3], 0.4, "idle"),
    people.stand("colleague", 57, [7.0, 0, -21.6], -2.4, "talk"), people.stand("colleague", 58, [6.3, 0, -22.4], 0.9, "idle"),
    people.stand("local", 38, [31.5, 0, 31.6], Math.PI, "idle"),
  ]);

  const S1 = new THREE.SpotLight(0xffeedc, 70, 26, 0.45, 0.7, 1.6), S2 = new THREE.SpotLight(0xffeedc, 40, 26, 0.6, 0.8, 1.6);
  S1.position.set(6.2, 3.9, -11); S1.target.position.set(4.2, 1.0, -16); S2.position.set(-9.5, 3.9, -14.5); S2.target.position.set(-12.6, 0.8, -12);
  const P1 = new THREE.PointLight(0xfff4e6, 12, 18, 1.6), P2 = new THREE.PointLight(0xfff4e6, 12, 18, 1.6);
  P1.position.set(2.8, 3.4, -19); P2.position.set(14, 3.4, -19); P1.color.setHex(0xffe8cc); P2.color.setHex(0xffe8cc); P1.intensity = P2.intensity = 18;
  b.group.add(S1.target, S2.target);

  const gate: V3 = [29, 0, 28.6], door: V3 = [3.5, 0, -6.2], inDoor: V3 = [3.5, 0, -9.8];
  const sPort: V3 = [4.2, 0, -15.6], sAgents: V3 = [-11.9, 0, -12.0];
  const toPort: V3[] = [gate, [7.0, 0, -3.0], door, inDoor, sPort];
  const toAgents: V3[] = [gate, [7.0, 0, -3.0], door, inDoor, [-4.4, 0, -10.6], [-10.6, 0, -11.6], sAgents];
  const out = (p: V3[]) => [...p].reverse().map((q, i, a) => (i === a.length - 1 ? [30.5, 0, 30.6] as V3 : q));
  return assemble({
    id: "office", k, people, lights: [S1, S2, P1, P2],
    env: { fog: { color: 0x121a28, near: 70, far: 430 }, moon: 0.9, skyTint: 0x1a2440 },
    arrival: { cam: [22, 13, 26], look: [0, 5.5, -10], fov: 52 },
    spawn: { pos: gate, yaw: -2.5 },
    stands: {
      portpro: { pos: sPort, yaw: 0.25, act: "talk", outfit: "office", bubbleSide: "right", shot: { cam: [6.2, 1.65, -9.6], look: [4.4, 1.9, -25], fov: 54 } },
      agents: { pos: sAgents, yaw: -Math.PI / 2, act: "type", outfit: "office", bubbleSide: "left", shot: { cam: [-8.7, 2.0, -9.3], look: [-12.7, 1.55, -12.3], fov: 54 } },
    },
    paths: { "spawn>portpro": toPort, "portpro>exit": out(toPort), "spawn>agents": toAgents, "agents>exit": out(toAgents) },
    tick: (t, dt, f) => { holo.update(t, dt, f.chapter === "agents"); },
  });
}

