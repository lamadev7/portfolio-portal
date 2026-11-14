import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { mat4 } from "./ktm/lib";
import { palette, cityBuilding, cityBlock, streetLamp, poleLine, tree, chairGeo, plant, cityLights, ridges, type Kit } from "./ktm/props";
import { assemble, lin, wall, pane, wallWindows, railing } from "./ktm/arch";
import { People } from "./ktm/people";
import { codeTex } from "./ktm/brand";
import { rng } from "./ktm/tex";

/* His remote-work room, second floor of a Kathmandu house. The desk faces north with a window onto the valley's lights. */

const FL = 6.4, RX0 = -4.6, RX1 = 0, RZ0 = -5.86, RZ1 = -1.2, CH = 2.9;

function house(k: Kit) {
  const { b } = k, x0 = -5, x1 = 5, z0 = -6, z1 = 4, H = 12.8, col = 0xe7d6b4;
  b.aabb("asphalt", -170, -0.2, -14, 170, -0.05, 170, { uv: 8, color: 0x8a8a8a });
  b.add("grass", new THREE.PlaneGeometry(340, 100), mat4(0, -17, -62, 0, 1, 1, 1, -Math.PI / 2 + Math.atan2(34, 96)), { uv: 6, color: 0x6a6a5a });
  b.aabb("dark", -4000, -36, -4000, 4000, -35, 4000, { color: 0x05070a });
  b.aabb("concrete", -60, -0.1, 4, 60, 0.0, 9, { uv: 3, color: 0x7a7670 });
  /* outer shell with openings for the study window (north) and a few lit windows */
  wall(k, "paint", "x", z0 + 0.12, x0, x1, 0, H, 0.24, [{ a: -2.4, b: -0.5, lo: FL + 0.9, hi: FL + 2.5 }, { a: 1.5, b: 3.5, lo: 1.0, hi: 2.4 }, { a: 1.5, b: 3.5, lo: 4.2, hi: 5.6 }, { a: 1.5, b: 3.5, lo: 10.6, hi: 12.0 }], { color: col });
  pane(k, "x", z0 + 0.05, -2.4, -0.5, FL + 0.9, FL + 2.5, 0x5a3a24, "glassT", 0xb8c8d0);
  for (const [lo, hi, lit] of [[1.0, 2.4, 0.6], [4.2, 5.6, 0.0], [10.6, 12.0, 0.4]] as const) b.quad(lit ? "glowSoft" : "glass", 2.5, (lo + hi) / 2, z0 + 0.3, 2, hi - lo, Math.PI, { color: lit ? lin(lit * 0.9, lit * 0.65, lit * 0.35) : 0x2a323a });
  wall(k, "paint", "x", z1 - 0.12, x0, x1, 0, H, 0.24, [{ a: -1, b: 1, lo: 0, hi: 2.3 }], { color: col });
  b.box("wood", 0, 0, z1 - 0.1, 1.9, 2.25, 0.08, 0, { color: 0x5a3a24 });
  wall(k, "paint", "z", x0 + 0.12, z0, z1, 0, H, 0.24, [], { color: col }); wall(k, "paint", "z", x1 - 0.12, z0, z1, 0, H, 0.24, [], { color: col });
  wallWindows(k, { cx: 0, cz: z1, ry: 0, len: 9, y0: 4.3, floors: 3, floorH: 3.2, bay: 3, ww: 1.4, wh: 1.4, frame: 0x5a3a24, seed: 3, lit: 0.45 });
  wallWindows(k, { cx: x1, cz: -1, ry: Math.PI / 2, len: 9, y0: 1.1, floors: 4, floorH: 3.2, bay: 3, ww: 1.2, wh: 1.3, frame: 0x5a3a24, seed: 4, lit: 0.3 });
  wallWindows(k, { cx: x0, cz: -1, ry: -Math.PI / 2, len: 9, y0: 1.1, floors: 4, floorH: 3.2, bay: 3, ww: 1.2, wh: 1.3, frame: 0x5a3a24, seed: 5, lit: 0.3 });
  for (let f = 1; f <= 4; f++) b.aabb("paint", x0 - 0.15, f * 3.2 - 0.12, z0 - 0.15, x1 + 0.15, f * 3.2 + 0.08, z1 + 0.15, { color: 0xd8c4a0 });
  /* front balconies, roof parapet, tank, solar heater, prayer flags */
  for (const y of [3.2, 6.4, 9.6]) { b.aabb("paint", -4, y - 0.15, z1, 4, y + 0.05, z1 + 1.1, { color: 0xd8c4a0 }); railing(k, "metal", [-4, y + 0.05, z1 + 1.05], [4, y + 0.05, z1 + 1.05], 0.95, { color: 0x3a3a3a, bal: 0.14, post: 2 }); }
  b.aabb("concrete", x0, H - 0.1, z0, x1, H, z1, { color: 0x8a8580 });
  for (const [a, c, d, e] of [[x0, z0, x1, z0 + 0.15], [x0, z1 - 0.15, x1, z1], [x0, z0, x0 + 0.15, z1], [x1 - 0.15, z0, x1, z1]] as const) b.aabb("paint", a, H, c, d, H + 1.0, e, { color: col });
  b.cyl("dark", 2.8, H, -3.5, 0.65, 0.7, 1.4, 12, { color: 0x1a1a1c }); b.cyl("dark", 2.8, H + 1.4, -3.5, 0.2, 0.55, 0.2, 12, { color: 0x1a1a1c });
  b.add("metal", new THREE.BoxGeometry(2.0, 0.08, 1.2), mat4(-2.6, H + 0.9, -3.2, 0, 1, 1, 1, -0.6), { color: 0x2a3a5a }); b.box("metal", -2.6, H, -3.0, 2.0, 0.6, 0.12, 0, { color: 0x888888 });
  b.cyl("metal", -2.6, H + 1.2, -2.6, 0.18, 0.18, 1.8, 10, { color: 0xc8c8c8, ry: 0 });
  const fl = ["#1f4fd0", "#f2f2f2", "#d02020", "#20a040", "#f0c020"];
  b.cyl("metal", 4.4, H, 3.4, 0.03, 0.03, 3.2, 6, { color: 0x666666 });
  for (let i = 0; i < 14; i++) { const t = i / 13, x = 4.4 - 8.6 * t, y = H + 3.1 - 2.0 * t - Math.sin(t * Math.PI) * 0.4, z = 3.4 - 6.4 * t; b.quad("fabric", x, y - 0.14, z, 0.22, 0.28, 0.65, { color: new THREE.Color(fl[i % 5]) }); }
  b.tube("dark", [[4.4, H + 3.15, 3.4], [-4.2, H + 1.0, -3.0]], 0.008, 3, { color: 0x222222 });
}

function room(k: Kit) {
  const { b } = k;
  b.aabb("wood", RX0, FL - 0.02, RZ0, RX1, FL, RZ1, { uv: 1.2, color: 0x9a7452 });
  b.aabb("clean", RX0 - 0.3, FL + CH, RZ0 - 0.3, RX1 + 0.3, FL + CH + 0.2, RZ1 + 0.3, { color: 0xe6e2da });
  wall(k, "clean", "z", RX1 + 0.1, RZ0, RZ1, FL, FL + CH, 0.2, [{ a: -3.1, b: -2.1, lo: FL, hi: FL + 2.1 }], { color: 0xd8dcd6 });
  wall(k, "clean", "x", RZ1 + 0.1, RX0, RX1 + 0.2, FL, FL + CH, 0.2, [], { color: 0xd8dcd6 });
  wall(k, "clean", "z", RX0 - 0.1, RZ0, RZ1, FL, FL + CH, 0.2, [], { color: 0xd8dcd6 });
  wall(k, "clean", "x", -5.87, RX0, RX1, FL, FL + CH, 0.02, [{ a: -2.4, b: -0.5, lo: FL + 0.9, hi: FL + 2.5 }], { color: 0xd8dcd6, collide: false });
  /* desk + monitor with code, laptop, lamp */
  const dx = -3.3, dz = -5.2;
  b.box("wood", dx, FL + 0.72, dz, 1.6, 0.04, 0.7, 0, { color: 0x6a4a30 });
  for (const s of [-1, 1]) b.box("dark", dx + s * 0.74, FL, dz, 0.05, 0.72, 0.6, 0, { color: 0x1a1a1c });
  b.box("wood", dx + 0.5, FL, dz, 0.5, 0.65, 0.6, 0, { color: 0x6a4a30 });
  b.box("dark", dx, FL + 0.745, dz - 0.12, 0.22, 0.02, 0.16, 0, { color: 0x1c1c1e }); b.box("dark", dx, FL + 0.75, dz - 0.14, 0.05, 0.22, 0.04, 0, { color: 0x1c1c1e });
  b.box("dark", dx, FL + 0.92, dz - 0.18, 0.72, 0.42, 0.03, 0, { color: 0x111114 });
  b.quad("sign", dx, FL + 1.13, dz - 0.163, 0.69, 0.4, 0, { uv: codeTex(k.atlas), color: lin(0.42) });
  b.box("dark", dx - 0.05, FL + 0.745, dz + 0.12, 0.44, 0.015, 0.14, 0, { color: 0x222226 }); b.box("dark", dx + 0.3, FL + 0.745, dz + 0.12, 0.06, 0.02, 0.1, 0, { color: 0x222226 });
  b.box("dark", dx - 0.62, FL + 0.745, dz + 0.02, 0.32, 0.015, 0.22, 0.3, { color: 0x9a9aa0 }); b.add("dark", new THREE.BoxGeometry(0.32, 0.2, 0.01), mat4(dx - 0.66, FL + 0.85, dz - 0.08, 0.3, 1, 1, 1, -0.3), { color: 0x9a9aa0 });
  b.add("glowSoft", new THREE.PlaneGeometry(0.29, 0.17), mat4(dx - 0.656, FL + 0.85, dz - 0.073, 0.3, 1, 1, 1, -0.3), { color: lin(0.12, 0.22, 0.4) });
  b.cyl("dark", dx + 0.6, FL + 0.74, dz - 0.15, 0.08, 0.09, 0.02, 10, { color: 0x1a1a1c });
  b.tube("dark", [[dx + 0.6, FL + 0.76, dz - 0.15], [dx + 0.62, FL + 1.15, dz - 0.18], [dx + 0.45, FL + 1.3, dz - 0.05]], 0.012, 5, { color: 0x1a1a1c });
  b.add("dark", new THREE.ConeGeometry(0.09, 0.14, 14, 1, true), mat4(dx + 0.42, FL + 1.26, dz - 0.02, 0, 1, 1, 1, 0.6), { color: 0x2a2a2c });
  b.add("glow", new THREE.CircleGeometry(0.075, 12), mat4(dx + 0.4, FL + 1.21, dz + 0.01, 0, 1, 1, 1, -Math.PI / 2 + 0.6), { color: lin(2.2, 1.6, 0.9) });
  b.cyl("paint", dx - 0.45, FL + 0.74, dz + 0.2, 0.045, 0.04, 0.1, 10, { color: 0xe8e0d0 });
  b.collide(dx - 0.82, FL, dz - 0.36, dx + 0.82, FL + 0.8, dz + 0.36);
  const ch = chairGeo(0x1a1a1c, 0x1a1a1c); b.add("dark", ch, mat4(dx, FL, -4.35, Math.PI), { uv: 1 }); ch.dispose();
  /* bed, bookshelf, posters, rug, curtains, plant */
  b.box("wood", -3.3, FL, -2.4, 2.1, 0.4, 1.5, 0, { color: 0x5a3a24 }); b.box("fabric", -3.3, FL + 0.4, -2.4, 2.0, 0.2, 1.4, 0, { color: 0x3a4a6a }); b.box("fabric", -4.05, FL + 0.6, -2.4, 0.4, 0.14, 1.0, 0, { color: 0xe8e4dc });
  b.collide(-4.4, FL, -3.2, -2.2, FL + 0.7, -1.6);
  b.box("wood", -0.35, FL, -5.0, 0.4, 2.0, 1.0, 0, { color: 0x6a4a30 });
  const r = rng(9);
  for (let sh = 0; sh < 4; sh++) { b.box("wood", -0.35, FL + 0.05 + sh * 0.5, -5.0, 0.38, 0.03, 0.96, 0, { color: 0x4a3020 }); let z = -5.42; while (z < -4.6) { const w = 0.03 + r() * 0.04, h = 0.25 + r() * 0.15; b.box("fabric", -0.38, FL + 0.08 + sh * 0.5, z + w / 2, 0.22, h, w, 0, { color: new THREE.Color().setHSL(r(), 0.4, 0.3) }); z += w + 0.004; } }
  b.collide(-0.6, FL, -5.55, -0.12, FL + 2, -4.45);
  b.quad("atlas", -4.48, FL + 1.7, -3.6, 0.6, 0.85, Math.PI / 2, { uv: k.atlas.put(120, 170, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1a2a4a"); gr.addColorStop(1, "#0a0f1a"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#e8eef8"; g.beginPath(); g.moveTo(10, 120); g.lineTo(45, 60); g.lineTo(60, 80); g.lineTo(80, 40); g.lineTo(112, 120); g.fill(); g.font = '700 14px Arial'; g.textAlign = "center"; g.fillText("EVEREST", w / 2, 150); }) });
  b.aabb("fabric", -3.8, FL + 0.005, -4.2, -1.0, FL + 0.012, -2.6, { color: 0x7a3a2a });
  for (const s of [-1, 1]) b.add("fabric", new THREE.BoxGeometry(0.35, 2.0, 0.06), mat4(-1.45 + s * 1.1, FL + 1.55, RZ0 + 0.16), { color: 0x8a6a4a });
  plant(k, -1.0, FL, -5.45, 1.0, 12);
  b.collide(-1.25, FL, -5.75, -0.75, FL + 0.8, -5.2);
  /* hallway outside the door */
  b.aabb("tile", 0.2, FL - 0.02, -6, 4.8, FL, 4, { uv: 1.2, color: 0xc8c0b0 });
  b.aabb("clean", 0.2, FL + CH, -6, 4.8, FL + CH + 0.2, 4, { color: 0xe6e2da });
  b.cyl("glow", 2.5, FL + CH - 0.02, -2.6, 0.15, 0.15, 0.02, 10, { color: lin(0.9, 0.75, 0.5) });
  b.aabb("clean", 0.2, FL - 3.2, -6, 4.8, FL - 0.02, -5.8, { color: 0xd8d0c0 });
  b.collide(0.2, FL, -6, 4.8, FL + CH, -5.75); b.collide(0.2, FL, 3.75, 4.8, FL + CH, 4); b.collide(4.75, FL, -6, 5, FL + CH, 4);
  k.pool([dx + 0.4, FL + 1.25, dz + 0.05], 3.0, 0xffc880, 0.9); k.pool([dx, FL + 1.1, dz - 0.05], 1.6, 0x8fb8ff, 0.4); k.pool([2.5, FL + 2.6, -2.6], 4, 0xffe2b8, 0.4);
}

function valley(k: Kit, parent: THREE.Object3D) {
  cityLights(k, parent, { y: -34, rMin: 180, rMax: 1880, n: 12000, seed: 41, a0: -Math.PI * 0.45, a1: Math.PI * 0.45, size: 4.2, rise: 0.12 });
  ridges(k, parent, 2100, -40, 220, Math.PI * 0.55, Math.PI * 0.9, 3);
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = palette(ctx.renderer, { facadeSeed: 43, lit: 0.45 }), { b } = k;
  house(k); room(k); valley(k, b.group);
  /* neighbourhood: tall neighbours east/west/south, low roofs to the north so the window sees the valley */
  cityBuilding(k, { x0: -14, x1: -6, z0: -7, z1: 3, floors: 4, color: 0xd9c8b0, shops: null }, 3);
  cityBuilding(k, { x0: 6, x1: 14, z0: -6, z1: 3, floors: 5, color: 0xc9d4dc, shops: null }, 4);
  cityBlock(k, -60, 9.5, 60, 30, 700, { front: ["n"], floors: [3, 5] });
  cityBlock(k, -60, -8, -16, 4, 701, { floors: [3, 5] }); cityBlock(k, 16, -8, 60, 4, 702, { floors: [3, 5] });
  cityBlock(k, -150, 34, 150, 80, 705, { floors: [3, 6] });
  for (let x = -55; x <= 55; x += 22) streetLamp(k, x, 8.6, Math.PI, { h: 6, color: 0xffd9a8, pool: 5 });
  poleLine(k, [-60, -38, -16, 6, 28, 50].map((x) => [x, 4.5] as [number, number]), 0, 8);
  tree(k, -8, -12, 1.2, 5); tree(k, 9, -13, 1.1, 6);
  { const r = rng(17); for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 300, z = -18 - r() * 88, y = -((-14 - z) * 34 / 96); tree(k, x, z, 1.1 + r() * 0.8, 100 + i, y - 0.3); } }
  k.pool([0, 2.6, 5.5], 7, 0xffd9a8, 0.6); k.pool([-1.4, FL + 1.6, -7], 6, 0xffc880, 0.35);

  const people = new People(ctx);
  await Promise.all([people.walk("local", 61, [[-40, 0, 6.2], [40, 0, 6.2], [40, 0, 6.8], [-40, 0, 6.8]], 1.2, 0.3, "lane")]);

  const lamp = new THREE.PointLight(0xffc27a, 3.2, 6, 1.7); lamp.position.set(-2.9, FL + 1.22, -5.12);
  const screen = new THREE.PointLight(0x8fb8ff, 0.8, 3, 1.8); screen.position.set(-3.3, FL + 1.1, -4.85);
  const fill = new THREE.PointLight(0xffe2c0, 1.2, 8, 1.6); fill.position.set(-1.6, FL + 2.6, -2.4);
  const out = new THREE.SpotLight(0xffd9a8, 300, 40, 0.5, 0.7, 1.6); out.position.set(-6, 9, -16); out.target.position.set(-1, 6, -6); b.group.add(out.target);
  const sp: V3 = [-3.3, FL, -4.35];
  return assemble({
    id: "home", k, people, lights: [lamp, screen, fill, out],
    env: { fog: { color: 0x0f1522, near: 120, far: 1500 }, moon: 0.8, skyTint: 0x1a2440 },
    arrival: { cam: [-9, 17, -26], look: [-1, 7, -3], fov: 50 },
    spawn: { pos: [2.6, FL, -2.6], yaw: -Math.PI / 2 },
    stands: { princelab: { pos: sp, yaw: Math.PI, act: "type", outfit: "college", bubbleSide: "left", shot: { cam: [-1.05, FL + 1.55, -2.45], look: [-3.0, FL + 1.05, -5.4], fov: 56 }, sign: { center: [-3.3, FL + 1.13, -5.36], halfW: 0.36, halfH: 0.21 } } },
    paths: { "spawn>princelab": [[2.6, FL, -2.6], [-0.8, FL, -2.6], [-2.0, FL, -3.6], sp], "princelab>exit": [sp, [-2.0, FL, -3.6], [-0.8, FL, -2.6], [2.6, FL, -2.6], [3.6, FL, 1.5]] },
  });
}
