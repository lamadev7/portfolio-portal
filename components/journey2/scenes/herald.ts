import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { mat4, prep } from "./ktm/lib";
import { palette, cityBlock, streetLamp, tree, chairGeo, deskRow, monitor, plant, carGeo, distantLights, Traffic, scooterGeo, type Kit } from "./ktm/props";
import { wallWindows, railing, columns, assemble, lin, wall, pane } from "./ktm/arch";
import { People, bakeCrowd } from "./ktm/people";
import { heraldWordmark, ingLogo, awardBanner, slideTex } from "./ktm/brand";
import { rng } from "./ktm/tex";

/* Herald College Kathmandu, Naxal. Building faces south (z+) onto a paved court; origin is the court.
   Inside: lobby (herald), double-height hall with stage (aaa-2023 / aaa-2024, two dressings), computing lab (supervisor). */

const WHITE = 0xf2f2ef, LIME = 0x93c66a, BLUE = 0x2b4f8e;
const ZF = -16, ZB = -42;

function exterior(k: Kit) {
  const { b } = k;
  /* right volume (white, tall blue glazing) */
  const strips: [number, number][] = [[1.4, 4.2], [7.8, 11.5], [15.9, 20.8]];
  const frontOps = strips.map(([a, c]) => ({ a, b: c, lo: a === 7.8 ? 0 : 0.6, hi: 13.2 }));
  wall(k, "paint", "x", ZF + 0.15, -2, 26, 0, 14.6, 0.3, frontOps, { color: WHITE });
  for (const [a, c] of strips) {
    pane(k, "x", ZF + 0.3, a, c, a === 7.8 ? 2.8 : 0.6, 13.2, 0x1d2430, "glassT", 0x3a62b0);
    for (let y = 4.4; y < 13; y += 4.4) b.aabb("metal", a, y - 0.05, ZF + 0.22, c, y + 0.05, ZF + 0.36, { color: 0x1d2430 });
    const n = Math.round((c - a) / 1.25); for (let i = 1; i < n; i++) b.aabb("metal", a + i * (c - a) / n - 0.03, 0.6, ZF + 0.22, a + i * (c - a) / n + 0.03, 13.2, ZF + 0.36, { color: 0x1d2430 });
    const r = rng(a * 10);
    for (let f = 1; f < 3; f++) for (let i = 0; i < n; i++) {
      const lit = r() < 0.5, x = a + (i + 0.5) * (c - a) / n;
      b.quad("glowSoft", x, f * 4.4 + 2.3, ZF - 0.6, (c - a) / n - 0.05, 4.2, 0, { color: lit ? lin(0.42, 0.45, 0.5) : lin(0.03, 0.04, 0.06) });
    }
  }
  pane(k, "x", ZF + 0.3, 7.8, 11.5, 0, 2.8, 0x1d2430, "glassT", 0x7fa0d0);
  b.aabb("paint", -2, 13.9, ZF, 26, 14.6, ZF + 0.4, { color: WHITE });
  b.aabb("paint", 19.5, 10.4, ZF + 0.3, 26.2, 13.4, ZF + 0.4, { color: LIME });
  b.aabb("paint", 25.9, 10.4, ZF - 6, 26.2, 13.4, ZF + 0.4, { color: LIME });
  wall(k, "paint", "z", 26 - 0.15, ZB, ZF, 0, 14.6, 0.3, [], { color: WHITE });
  wall(k, "paint", "x", ZB + 0.15, -26, 26, 0, 14.6, 0.3, [], { color: WHITE });
  wallWindows(k, { cx: 26, cz: -29, ry: Math.PI / 2, len: 22, y0: 5.4, floors: 2, floorH: 4.2, bay: 4.4, ww: 1.4, wh: 1.4, frame: 0x30343a, seed: 5, lit: 0.4 });
  wallWindows(k, { cx: 0, cz: ZB, ry: Math.PI, len: 48, y0: 1.2, floors: 3, floorH: 4.4, bay: 4, ww: 1.6, wh: 1.5, frame: 0x30343a, seed: 6, lit: 0.3 });
  for (let i = 0; i < 4; i++) { b.box("paint", 26.5, 6 + (i % 2) * 4.2, -22 - i * 4.5, 0.8, 0.6, 0.9, 0, { color: 0xe4e4e0 }); b.add("dark", new THREE.CylinderGeometry(0.22, 0.22, 0.05, 14), mat4(26.92, 6.3 + (i % 2) * 4.2, -22 - i * 4.5, 0, 1, 1, 1, 0, Math.PI / 2), { color: 0x444444 }); }
  b.aabb("concrete", -26.4, 14.4, ZB - 0.4, 26.4, 14.6, ZF + 0.4, { color: 0xb0b0ac });
  /* external steel stair on the east side */
  for (let f = 0; f < 3; f++) {
    const y0 = f * 4.4, dir = f % 2 ? -1 : 1, z0 = dir > 0 ? -30 : -19, z1 = dir > 0 ? -19 : -30;
    for (let s = 0; s < 15; s++) { const t = s / 15; b.box("metal", 27.3, y0 + t * 4.4, z0 + (z1 - z0) * t, 1.2, 0.05, 0.32, 0, { color: 0xd9dcdf }); }
    b.tube("metal", [[27.95, y0 + 1, z0], [27.95, y0 + 5.4, z1]], 0.03, 5, { color: 0xc23a2e });
    b.box("metal", 27.3, y0 + 4.4, z1 + (dir > 0 ? 0.6 : -0.6), 1.4, 0.08, 1.4, 0, { color: 0xd9dcdf });
  }
  for (const z of [-31, -18]) b.box("metal", 27.95, 0, z, 0.12, 14, 0.12, 0, { color: 0xc23a2e });
  b.collide(26, 0, -31.2, 28.1, 14, -17.8);

  /* left volume: recessed ground floor + terrace, cantilever slab with AC units, lime-green upper volume, white roof frame */
  wall(k, "paint", "x", -20.15, -26, -2, 0, 4.2, 0.3, [{ a: -15.5, b: -13.3, lo: 0, hi: 2.7 }, { a: -24, b: -17, lo: 0.9, hi: 3.2 }, { a: -11, b: -4, lo: 0.9, hi: 3.2 }], { color: WHITE });
  wall(k, "paint", "x", -20.15, -26, -2, 4.2, 7.2, 0.3, [{ a: -24.5, b: -3.5, lo: 4.5, hi: 7.0 }], { color: WHITE });
  pane(k, "x", -20.0, -15.5, -13.3, 0, 2.7, 0x30343a, "glassT", 0xb8d0c0);
  pane(k, "x", -20.0, -24, -17, 0.9, 3.2); pane(k, "x", -20.0, -11, -4, 0.9, 3.2);
  pane(k, "x", -20.0, -24.5, -3.5, 4.5, 7.0, 0x30343a, "glassT", 0xb8d0c0);
  b.aabb("paint", -26, 4.0, -20.3, -2, 4.4, -13.6, { color: WHITE, uv: 3 });
  b.aabb("concrete", -25.9, 4.4, -20, -2.1, 4.42, -13.7, { color: 0x8a8a86 });
  railing(k, "metal", [-25.6, 4.4, -13.75], [-2.4, 4.4, -13.75], 1.05, { color: 0xd0d4d8, post: 2.4 });
  b.aabb("glassT", -25.6, 4.45, -13.8, -2.4, 5.4, -13.7, { color: 0xa8c8c0 });
  for (let x = -24; x < -4; x += 3.5) { b.cyl("paint", x, 4.42, -14.4, 0.25, 0.2, 0.45, 10, { color: 0xeeeeea }); plantTop(k, x, 4.87, -14.4); }
  b.aabb("paint", -26, 7.2, -16.2, -2, 7.6, -12.8, { color: WHITE, uv: 3 });
  for (const x of [-12.5, -9.8, -7.1]) { b.box("paint", x, 7.6, -15.2, 1.0, 0.75, 0.5, 0, { color: 0xe8e8e4 }); b.add("dark", new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), mat4(x, 7.98, -14.94, 0, 1, 1, 1, Math.PI / 2), { color: 0x3a3a3a }); }
  columns(k, "paint", [[-24.3, -14.0], [-18, -14.0], [-9, -14.0], [-3.2, -14.0]], 0, 4.0, 0.22, WHITE);
  for (const x of [-24.3, -18, -9, -3.2]) b.collide(x - 0.25, 0, -14.25, x + 0.25, 4, -13.75);
  b.aabb("paint", -26, 7.6, ZB, -2, 13.6, ZF, { color: LIME, uv: 4 });
  b.aabb("paint", -26.5, 13.4, ZB - 0.5, -1.6, 14.6, ZF + 0.5, { color: WHITE, uv: 4 });
  b.aabb("paint", -26.5, 4.0, ZF - 0.3, -25.7, 14.6, ZF + 0.5, { color: WHITE, uv: 4 });
  b.aabb("paint", -26.3, 0, -20.3, -25.7, 4.0, -16.2, { color: LIME, uv: 3, collide: true });
  b.quad("atlas", -20.8, 12.1, ZF + 0.02, 5.6, 2.15, 0, { uv: ingLogo(k.atlas) });
  wallWindows(k, { cx: -14, cz: ZF, ry: 0, len: 22, y0: 8.6, floors: 2, floorH: 2.6, bay: 3.6, ww: 2.2, wh: 1.3, frame: 0x6aa04a, seed: 9, lit: 0.35, skip: (f, i) => f === 1 && i < 2 });
  wall(k, "paint", "z", -25.85, ZB, -20.3, 0, 13.6, 0.3, [], { color: WHITE });
  wallWindows(k, { cx: -26, cz: -31, ry: -Math.PI / 2, len: 20, y0: 8.4, floors: 2, floorH: 2.6, bay: 4, ww: 2.2, wh: 1.3, frame: 0x6aa04a, seed: 10, lit: 0.3 });
  /* entrance canopy sign for the lobby door */
  b.aabb("paint", 7.4, 2.85, ZF + 0.3, 11.9, 3.35, ZF + 1.6, { color: WHITE });
  b.quad("sign", 9.65, 3.1, ZF + 1.62, 4.2, 0.42, 0, { uv: heraldWordmark(k.atlas, 600, 60, { bg: "#ffffff", fg: "#1f3a2a" }), color: lin(0.7) });
  for (const x of [8, 9.65, 11.3]) b.cyl("glow", x, 2.83, ZF + 1, 0.12, 0.12, 0.02, 10, { color: lin(1.6, 1.4, 1.1) });
  k.pool([9.65, 2.6, ZF + 1.2], 6, 0xffe2b8, 0.8);
  for (const x of [-22, -12, 2, 13, 22]) k.pool([x, 0.6, ZF + 1.8], 9.5, x < -2 ? 0xffe6c4 : 0xf2f4ff, 1.0);
  for (const x of [-20, -8, 14]) k.pool([x, 10.5, ZF + 2.6], 8, x < -2 ? 0xf0ffe0 : 0xf2f4ff, 0.75);
}

function plantTop(k: Kit, x: number, y: number, z: number) {
  for (let i = 0; i < 3; i++) { const g = new THREE.IcosahedronGeometry(0.22, 1); k.b.add("foliage", g, mat4(x + (i - 1) * 0.12, y + 0.1 + (i % 2) * 0.1, z), { color: new THREE.Color().setHSL(0.27, 0.5, 0.22) }); g.dispose(); }
}

function court(k: Kit) {
  const { b } = k;
  b.aabb("pavers", -44, -0.1, ZF, 44, 0, 22, { uv: 3 });
  b.aabb("asphalt", -170, -0.1, 23, 170, 0, 32, { uv: 6 });
  for (let x = -160; x < 160; x += 6) b.aabb("paint", x, 0.001, 27.45, x + 3, 0.01, 27.55, { color: lin(0.55) });
  b.aabb("asphalt", -420, -0.2, -420, 420, -0.05, 420, { uv: 8, color: 0x8a8a8a });
  b.aabb("concrete", -170, -0.1, 32, 170, 0.15, 34, { uv: 3, color: 0x9a968e });
  wall(k, "paint", "x", 22.5, -44, 44, 0, 2.2, 0.35, [{ a: 27.5, b: 36.5, lo: 0, hi: 2.2 }], { color: 0xe2ddd2 });
  wall(k, "paint", "z", -44, -60, 22.3, 0, 2.2, 0.35, [], { color: 0xe2ddd2 });
  wall(k, "paint", "z", 44, -60, 22.3, 0, 2.2, 0.35, [], { color: 0xe2ddd2 });
  wall(k, "paint", "x", -60, -44, 44, 0, 2.2, 0.35, [], { color: 0xe2ddd2 });
  b.aabb("pavers", -44, -0.1, -60, 44, 0, ZB, { uv: 3 }); b.aabb("pavers", -44, -0.1, ZB, -26, 0, ZF, { uv: 3 }); b.aabb("pavers", 26, -0.1, ZB, 44, 0, ZF, { uv: 3 });
  for (const x of [27.2, 36.8]) { b.box("paint", x, 0, 22.5, 0.8, 2.8, 0.8, 0, { color: 0xe6e2d8, collide: true }); b.add("glow", new THREE.SphereGeometry(0.2, 12, 8), mat4(x, 3.0, 22.5), { color: lin(1.6, 1.45, 1.2) }); }
  b.aabb("paint", 30, 0, -14.2, 40, 2.4, -13.8, { color: 0xebebe8, collide: true });
  b.quad("atlas", 33, 1.4, -13.78, 0.5, 0.5, 0, { uv: k.atlas.put(64, 64, (g) => { g.fillStyle = "#e8c31c"; g.fillRect(0, 0, 64, 64); }) });
  /* planters along the glazing, tree with a round brick planter, bollards with chains */
  for (const [a, c] of [[-1.5, 7.2], [12.2, 25]] as const) { b.aabb("paint", a, 0, ZF + 0.5, c, 0.45, ZF + 1.3, { color: 0xd8d8d4, collide: true }); for (let x = a + 0.6; x < c; x += 1.1) plantTop(k, x, 0.35, ZF + 0.9); }
  b.cyl("brick", -20, 0, -7, 2.0, 2.0, 0.55, 20, { uv: 1 }); tree(k, -20, -7, 1.6, 31, 0.55); b.collide(-22, 0, -9, -18, 3, -5);
  b.cyl("paint", -16.5, 0, -6, 0.5, 0.5, 0.42, 12, { color: 0xd2d0c8 });
  for (let x = -30; x <= -17.5; x += 2.5) { b.cyl("dark", x, 0, -10.5, 0.07, 0.08, 0.9, 8, { color: 0x1c1c1e }); if (x < -17.5) b.wire("dark", [x, 0.82, -10.5], [x + 2.5, 0.82, -10.5], 0.15, 0.015, { color: 0x222222 }); }
  b.collide(-30.2, 0, -10.7, -17.3, 0.9, -10.3);
  for (const [x, z, s] of [[-36, 4, 1.5], [-38, -24, 1.4], [38, -30, 1.3], [-33, 16, 1.2], [14, 15, 1.1], [-8, 17, 1.2], [38, 4, 1.3]] as const) { tree(k, x, z, s, (x * 5 + z) | 0); b.collide(x - 0.4, 0, z - 0.4, x + 0.4, 4, z + 0.4); }
  const r = rng(3);
  for (const [x, z, ry, c] of [[-34, -2, 0.1, 0xd0d4d8], [-34, 6, -0.05, 0x1f2a3a], [34, 10, Math.PI / 2, 0x8a2020]] as const) {
    const g = carGeo(c); b.add("paint", g, mat4(x, 0, z, ry), { uv: 1 }); g.dispose(); b.collide(x - 1.3, 0, z - 2.3, x + 1.3, 1.5, z + 2.3);
  }
  for (let i = 0; i < 9; i++) { const g = scooterGeo([0x8a1f1f, 0x1f3f8a, 0x222222, 0xd8d8d8][i % 4]); b.add("paint", g, mat4(-38 + i * 0.95, 0, 18.5, Math.PI * 0.5 + (r() - 0.5) * 0.2), { uv: 1 }); g.dispose(); }
  b.collide(-38.6, 0, 17.6, -30, 1.2, 19.4);
  for (let x = -160; x <= 160; x += 26) streetLamp(k, x, 32.6, Math.PI, { color: 0xffd9a8 });
  for (const [x, z] of [[-30, 10], [0, 10], [30, 0], [-30, -10]] as const) { streetLamp(k, x, z, 0, { h: 4.5, color: 0xfff1d6, pool: 4 }); b.collide(x - 0.12, 0, z - 0.12, x + 0.12, 4.5, z + 0.12); }
  k.pool([0, 4.4, 11.2], 9, 0xfff1d6, 0.6); k.pool([-30, 4.4, 11.2], 8, 0xfff1d6, 0.6); k.pool([30, 4.4, 1.2], 8, 0xfff1d6, 0.6);
  const blocks: [number, number][] = [[-170, -120], [-114, -70], [-64, -20], [-14, 30], [36, 80], [86, 130], [136, 175]];
  blocks.forEach(([a, c], i) => cityBlock(k, a, 34, c, 62, 400 + i, { front: ["n"], floors: [3, 6] }));
  cityBlock(k, -140, -60, -50, 20, 410, { floors: [3, 6] }); cityBlock(k, 50, -60, 140, 20, 411, { floors: [3, 6] });
  cityBlock(k, -60, -120, 60, -66, 412, { floors: [3, 7] });
  distantLights(k, 0, -10, 180, 420, 130, 13);
}

/* ---------- interiors ---------- */

function lobby(k: Kit) {
  const { b } = k, x0 = -1.85, x1 = 13.85, z0 = -31.85, z1 = ZF;
  b.aabb("tile", x0, 0, z0, x1, 0.02, z1, { uv: 2.4 });
  b.aabb("clean", x0, 4.1, z0, 26, 4.4, z1, { color: 0xdedede, uv: 3 });
  wall(k, "clean", "x", -32, -2, 14, 0, 4.1, 0.3, [], { color: 0xeeeeea });
  b.aabb("paint", 0.6, 0.6, -31.84, 9.4, 3.8, -31.8, { color: LIME });
  b.quad("sign", 5, 2.65, -31.78, 7.6, 1.2, 0, { uv: heraldWordmark(k.atlas, 760, 120, { bg: "#93c66a", fg: "#ffffff", mark: "#ffffff" }), color: lin(0.42) });
  b.quad("atlas", 5, 1.45, -31.78, 3.4, 0.5, 0, { uv: k.atlas.put(340, 50, (g, w, h) => { g.fillStyle = "#93c66a"; g.fillRect(0, 0, w, h); g.fillStyle = "#1f3a2a"; g.font = '600 26px "Helvetica Neue", Arial'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Naxal · Kathmandu", w / 2, h / 2); }) });
  for (const x of [1, 9]) b.box("glow", x, 0.8, -31.75, 0.06, 2.8, 0.04, 0, { color: lin(0.5, 0.55, 0.45) });
  wall(k, "clean", "z", x1 + 0.15, -32, ZF, 0, 4.1, 0.3, [{ a: -24, b: -22.4, lo: 0, hi: 2.4 }], { color: 0xeeeeea });
  b.aabb("wood", x1 + 0.0, 2.4, -24, x1 + 0.3, 2.5, -22.4, { color: 0x8a6a4a });
  b.box("wood", 11.2, 0, -28.6, 3.6, 1.1, 0.8, 0, { color: 0xffffff, collide: true });
  b.box("paint", 11.2, 1.1, -28.6, 3.8, 0.06, 0.95, 0, { color: 0xf4f4f2 });
  b.box("paint", 11.2, 0.15, -28.18, 3.6, 0.8, 0.02, 0, { color: LIME });
  monitor(k, 10.6, 1.13, -28.85, 0, 0.5, 0.32, null);
  for (const [x, z] of [[0.6, -21], [0.6, -25]] as const) {
    b.box("fabric", x, 0, z, 0.9, 0.45, 2.2, 0, { color: 0x2e4a3a }); b.box("fabric", x - 0.35, 0.45, z, 0.2, 0.45, 2.2, 0, { color: 0x2e4a3a });
    b.collide(x - 0.45, 0, z - 1.1, x + 0.45, 0.9, z + 1.1);
  }
  b.box("wood", 2.0, 0, -23, 0.8, 0.42, 1.2, 0, { color: 0xffffff, collide: true });
  plant(k, 0.6, 0, -18.2, 2.2, 3); plant(k, 13.2, 0, -30.8, 2.2, 4); plant(k, 13.2, 0, -17, 2.2, 5); plant(k, -1.2, 0, -31, 2.2, 6);
  for (const [x, z] of [[0.6, -18.2], [13.2, -30.8], [13.2, -17], [-1.2, -31]] as const) b.collide(x - 0.45, 0, z - 0.45, x + 0.45, 1.5, z + 0.45);
  for (let z = -30; z <= -18; z += 4) b.box("glow", 6, 4.06, z, 9, 0.04, 0.12, 0, { color: lin(0.55, 0.55, 0.52) });
  for (let x = 0; x <= 12; x += 3) for (let z = -30; z <= -18; z += 3) b.cyl("glow", x, 4.07, z, 0.14, 0.14, 0.02, 10, { color: lin(1.3, 1.15, 0.9) });
  b.box("glow", 11.2, 0.95, -28.17, 3.5, 0.05, 0.02, 0, { color: lin(0.9, 1.2, 0.6) }); b.box("glow", 11.2, 0.08, -28.17, 3.5, 0.04, 0.02, 0, { color: lin(0.6, 0.8, 0.4) });
  b.aabb("paint", -1.86, 1.7, -24.8, -1.84, 3.6, -20.4, { color: LIME });
  b.quad("sign", -1.83, 2.65, -22.6, 4.1, 0.65, Math.PI / 2, { uv: heraldWordmark(k.atlas, 760, 120, { bg: "#93c66a", fg: "#ffffff", mark: "#ffffff" }), color: lin(0.42) });
  k.room([-1.85, 0, -31.85], [13.85, 4.1, -16], 0xffeedd, 0.18);
  k.pool([5, 3.9, -24], 10, 0xfff3e0, 0.6); k.pool([5, 3.0, -30.6], 4, 0xd8ffc0, 0.4); k.pool([11.2, 1.2, -27.4], 4, 0xe8ffd0, 0.7); k.pool([0, 3.0, -22.6], 5, 0xe8ffd8, 0.5);
}

function hall(k: Kit) {
  const { b } = k, x0 = -25.7, x1 = -2.15, z0 = -41.7, z1 = -20.3, H = 7.2;
  b.aabb("wood", x0, 0, z0, x1, 0.02, z1, { uv: 2, color: 0xd8b088 });
  b.aabb("paint", -26, H, ZB, -2, H + 0.4, -20.3, { color: 0x2a2c30, uv: 3 });
  wall(k, "clean", "z", -2, -32, -20.3, 0, H, 0.3, [{ a: -27.5, b: -25.5, lo: 0, hi: 2.5 }], { color: 0x8a7a6a });
  wall(k, "clean", "z", -2, ZB, -32, 0, H, 0.3, [], { color: 0x8a7a6a });
  b.aabb("fabric", x0 + 0.05, 0, z0, x0 + 0.15, H, z1, { color: 0x3a1c22 });
  for (let z = z0 + 2; z < z1; z += 4) b.box("glow", x0 + 0.22, 3.2, z, 0.06, 0.5, 0.25, 0, { color: lin(1.4, 1.1, 0.75) });
  /* stage */
  const sx0 = -22, sx1 = -6, sz0 = z0, sz1 = -35.5, sh = 0.9, gap0 = -15.6, gap1 = -12.8;
  b.aabb("wood", sx0, 0, sz0, sx1, sh, sz1, { uv: 2, color: 0x2a1e18 });
  b.aabb("fabric", sx0, 0, sz1, sx1, sh - 0.05, sz1 + 0.04, { color: 0x14141a });
  for (let s = 0; s < 3; s++) b.aabb("wood", gap0, 0, sz1 + (2 - s) * 0.4, gap1, (s + 1) * 0.3, sz1 + (3 - s) * 0.4, { uv: 2, color: 0x2a1e18 });
  b.collide(sx0, 0, sz0, gap0, sh, sz1); b.collide(gap1, 0, sz0, sx1, sh, sz1);
  b.aabb("fabric", x0, 0, z0, x1, H, z0 + 0.12, { color: 0x101014 });
  b.aabb("fabric", sx0 - 1.6, 0, z0, sx0 - 0.2, H, z0 + 2.5, { color: 0x15151a }); b.aabb("fabric", sx1 + 0.2, 0, z0, sx1 + 1.6, H, z0 + 2.5, { color: 0x15151a });
  /* podium */
  b.box("wood", -18.8, sh, -37.4, 0.9, 1.15, 0.6, 0.25, { color: 0xf0f0ee });
  b.box("paint", -18.8, sh + 0.25, -37.08, 0.6, 0.6, 0.02, 0.25, { color: LIME });
  b.tube("metal", [[-18.9, sh + 1.15, -37.5], [-18.7, sh + 1.45, -37.25]], 0.01, 4, { color: 0x222222 });
  b.collide(-19.3, sh, -37.8, -18.3, sh + 1.2, -37.0);
  /* truss with stage spots */
  b.tube("metal", [[sx0, 6.4, -34], [sx1, 6.4, -34]], 0.08, 6, { color: 0x6a6e72 }); b.tube("metal", [[sx0, 6.8, -34], [sx1, 6.8, -34]], 0.08, 6, { color: 0x6a6e72 });
  for (let x = sx0 + 1; x < sx1; x += 2.2) { b.box("dark", x, 6.0, -34, 0.35, 0.45, 0.45, 0, { color: 0x111111 }); b.add("glow", new THREE.CircleGeometry(0.13, 12), mat4(x, 6.2, -34.24, Math.PI, 1, 1, 1, 0.5), { color: lin(1.2, 1.1, 1.0) }); }
  /* audience chairs */
  const chair = chairGeo(0x9a3434, 0x8a2c2c), ms: THREE.Matrix4[] = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 12; c++) {
    const x = c < 6 ? -23 + c * 1.25 : -12.0 + (c - 6) * 1.25, z = -31.2 + r * 1.3;
    ms.push(mat4(x, 0, z, Math.PI));
  }
  b.inst("paint", chair, ms); chair.dispose();
  b.collide(-23.4, 0, -31.6, -16.4, 1, -22.6); b.collide(-12.4, 0, -31.6, -5.3, 1, -22.6);
  for (let x = -24; x < -3; x += 3) for (let z = -38; z < -21; z += 4) b.cyl("glow", x, H - 0.03, z, 0.15, 0.15, 0.03, 10, { color: lin(0.7, 0.62, 0.5) });
  k.room([-25.7, 0, -41.7], [-2.15, 7.2, -20.3], 0xffe2c4, 0.22);
  for (let x = -22; x <= -6; x += 4) b.cyl("glow", x, 6.55, -35.3, 0.2, 0.2, 0.05, 10, { color: lin(1.8, 1.6, 1.3) });
  k.pool([-14, 5, -26], 14, 0xffe6c8, 1.0); k.pool([-14, 4, -38], 9, 0xfff6e8, 0.45); k.pool([-20, 5, -30], 9, 0xffe6c8, 0.6); k.pool([-8, 5, -30], 9, 0xffe6c8, 0.6); k.pool([-24.5, 3.2, -30], 7, 0xffc890, 0.18);
}

function lab(k: Kit) {
  const { b } = k, x0 = 14.15, x1 = 25.85, z0 = -31.85;
  b.aabb("tile", x0, 0, z0, x1, 0.02, ZF, { uv: 1.2, color: 0xd8d8dc });
  wall(k, "clean", "x", -32, 14, 26, 0, 4.1, 0.3, [], { color: 0xe6e9ec });
  b.aabb("paint", 18.2, 0.9, -31.84, 21.8, 3.1, -31.82, { color: 0x222222 });
  b.quad("sign", 20, 2.0, -31.8, 3.4, 1.92, 0, { uv: slideTex(k.atlas), color: lin(0.4) });
  b.cyl("dark", 20, 3.95, -27, 0.03, 0.03, 0.15, 6, { color: 0x222222 }); b.box("paint", 20, 3.75, -27, 0.4, 0.2, 0.35, 0, { color: 0xeeeeee });
  k.pool([20, 2.0, -30.8], 4, 0xcfe0ff, 0.3);
  const screens = (n: number) => k.atlas.put(160, 100, (g, w, h) => { g.fillStyle = "#0e1726"; g.fillRect(0, 0, w, h); g.fillStyle = ["#2f7de1", "#14b88a", "#e0a020"][n % 3]; for (let i = 0; i < 6; i++) g.fillRect(10, 10 + i * 14, 40 + ((i * 37 + n * 13) % 90), 6); });
  const desk = (x: number, z: number, ry: number, i: number) => {
    deskRow(k, x, z, 1, { ry, w: 1.3, d: 0.7 });
    const dx = Math.sin(ry), dz = Math.cos(ry); monitor(k, x - dx * 0.2, 0.74, z - dz * 0.2, ry, 0.55, 0.34, screens(i));
  };
  let i = 0;
  for (const z of [-30.2, -28.6, -27.0, -20.0, -18.4]) { desk(14.6 + 0.35, z, Math.PI / 2, i++); }
  for (const z of [-30.2, -28.6, -27.0, -25.4, -23.8, -22.2, -20.6, -19.0]) { desk(25.4 - 0.35, z, -Math.PI / 2, i++); }
  b.collide(14.15, 0, -30.9, 15.7, 1, -26.3); b.collide(14.15, 0, -20.7, 15.7, 1, -17.7); b.collide(24.3, 0, -30.9, 25.85, 1, -18.3);
  const chair = chairGeo(0x1d1d22, 0x1d1d22), ms: THREE.Matrix4[] = [];
  for (const z of [-30.2, -28.6, -20.0, -18.4]) ms.push(mat4(16.0, 0, z, -Math.PI / 2));
  for (const z of [-30.2, -27.0, -23.8, -20.6]) ms.push(mat4(24.0, 0, z, Math.PI / 2));
  ms.push(mat4(18.5, 0, -24.55, Math.PI - 0.6), mat4(17.4, 0, -24.6, Math.PI - 0.2));
  b.inst("paint", chair, ms); chair.dispose();
  b.box("paint", 18.4, 0.72, -25.7, 1.8, 0.04, 0.9, 0, { color: 0xf2f2ee }); for (const s of [-1, 1]) b.box("metal", 18.4 + s * 0.82, 0, -25.7, 0.05, 0.72, 0.75, 0, { color: 0x2c2c2e });
  b.collide(17.5, 0, -26.15, 19.3, 0.76, -25.25);
  b.box("dark", 18.6, 0.76, -25.55, 0.34, 0.02, 0.24, 0.3, { color: 0x222226 }); b.add("glowSoft", new THREE.PlaneGeometry(0.32, 0.2), mat4(18.62, 0.88, -25.7, 0.3, 1, 1, 1, -0.35), { color: lin(0.35, 0.45, 0.6) });
  for (let z = -30; z <= -18; z += 3) b.box("glow", 20, 4.06, z, 8, 0.04, 0.12, 0, { color: lin(0.55, 0.57, 0.6) });
  k.pool([20, 3.9, -24], 10, 0xeef4ff, 0.28); k.pool([20, 3.9, -19], 7, 0xeef4ff, 0.18);
  k.room([14.15, 0, -31.85], [25.85, 4.1, -16], 0xeef2ff, 0.18);
}

/* stage dressings: 2023 = Herald green, 2024 = blue/violet */
function stageLooks(k: Kit, group: THREE.Group) {
  const sign = k.b.mats.get("sign")!, glow = k.b.mats.get("glow")!;
  const mk = (year: number, accent: string, strip: THREE.Color) => {
    const g = new THREE.Group(); g.name = "look-" + year;
    const geo = prep(new THREE.PlaneGeometry(14, 4.2), mat4(-14, 4.3, -41.56), { uv: awardBanner(k.atlas, year, accent), color: lin(0.36) });
    g.add(new THREE.Mesh(geo, sign));
    const sg: THREE.BufferGeometry[] = [];
    for (const x of [-21.6, -6.4]) sg.push(prep(new THREE.BoxGeometry(0.12, 5.6, 0.08), mat4(x, 3.7, -41.5), { color: strip }));
    sg.push(prep(new THREE.BoxGeometry(16, 0.08, 0.08), mat4(-14, 0.95, -35.5), { color: strip }));
    for (const gg of sg) g.add(new THREE.Mesh(gg, glow));
    group.add(g); return g;
  };
  return { a: mk(2023, "#8dc63f", lin(0.12, 0.36, 0.08)), b: mk(2024, "#6f8cff", lin(0.16, 0.14, 0.45)) };
}

type Area = "ext" | "lobby" | "hall" | "lab";

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = palette(ctx.renderer, { facadeSeed: 19, lit: 0.42 }), { b } = k;
  exterior(k); court(k); lobby(k); hall(k); lab(k);
  const looks = stageLooks(k, b.group);

  const people = new People(ctx);
  await Promise.all([
    people.stand("local", 41, [31.5, 0, 20.5], Math.PI, "idle"),
    people.stand("student", 42, [-16.6, 0, -4.4], 2.2, "talk"), people.stand("student", 43, [-17.4, 0, -5.6], 0.6, "idle"),
    people.stand("student", 44, [12.5, 0, -6.5], -0.6, "look"),
    people.walk("student", 45, [[-2, 0, 4], [24, 0, 4], [24, 0, 8], [-2, 0, 8]], 1.25, 0.2, "court-loop"),
    people.stand("colleague", 51, [11.2, 0, -29.6], 0, "idle"),
    people.stand("student", 52, [0.75, 0, -21.6], Math.PI / 2, "sit"), people.stand("student", 53, [0.75, 0, -20.4], Math.PI / 2, "sit"),
    people.stand("student", 54, [3.5, 0, -19.4], -2.6, "talk"), people.stand("student", 55, [4.3, 0, -20.3], 0.7, "idle"),
    people.stand("teacher", 61, [-12.4, 0.9, -38.2], -1.35, "clap"),
    people.stand("guest", 70, [-16.75, 0, -31.2], Math.PI, "clap"), people.stand("student", 71, [-12.0, 0, -31.2], Math.PI, "clap"),
    people.stand("student", 81, [19.0, 0, -29.4], 0.35, "present"), people.stand("student", 82, [20.6, 0, -29.6], -0.2, "point"),
    people.stand("student", 83, [21.8, 0, -29.0], -0.5, "idle"), people.stand("student", 84, [17.6, 0, -29.1], 0.6, "look"),
    people.stand("student", 85, [24.0, 0, -27.0], Math.PI / 2, "type"),
  ]);

  const seats: { p: V3; yaw: number }[] = [], sr = rng(77);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 12; c++) {
    const x = c < 6 ? -23 + c * 1.25 : -12.0 + (c - 6) * 1.25, z = -31.2 + r * 1.3;
    if ((r === 0 && (x === -16.75 || x === -12.0)) || sr() < 0.4) continue;
    seats.push({ p: [x, 0, z], yaw: Math.PI });
  }
  const audience = await bakeCrowd(ctx, b.group, "guest", [91, 92, 93, 94, 95], "sit", seats, { maxTris: 2600, settle: 0.4 });
  const S1 = new THREE.SpotLight(0xffffff, 0, 30, 0.5, 0.6, 1.6), S2 = new THREE.SpotLight(0xffffff, 0, 30, 0.5, 0.6, 1.6);
  const P1 = new THREE.PointLight(0xffffff, 0, 14, 1.6), P2 = new THREE.PointLight(0xffffff, 0, 14, 1.6);
  for (const s of [S1, S2]) b.group.add(s.target);
  type Rig = { s: [V3, V3, number, number, number][]; p: [V3, number, number, number][] };
  const RIGS: Record<Area | "aaa24", Rig> = {
    ext: { s: [[[4, 12, 8], [-2, 6, -16], 0xfff0dc, 1100, 0.85], [[-14, 3.8, -11], [-14, 0, -19], 0xffd7a8, 80, 0.9]], p: [[[9.6, 3.2, -13], 0xffe2b8, 14, 12], [[-10, 6.8, -13.5], 0xfff0dc, 10, 10]] },
    lobby: { s: [[[9.5, 3.9, -27.5], [5.6, 1.1, -24.6], 0xfff1dc, 60, 0.45], [[11.2, 3.9, -26], [11.2, 0.9, -28.6], 0xf4ffe8, 40, 0.6]], p: [[[4, 3.6, -23], 0xfff3e0, 12, 13], [[9, 3.6, -19.5], 0xfff3e0, 8, 10]] },
    hall: { s: [[[-14.2, 6.6, -28.5], [-14.2, 1.5, -38], 0xfff0dc, 260, 0.34], [[-14, 6.6, -36.5], [-14, 0.6, -25.5], 0xffe8d0, 300, 0.8]], p: [[[-14, 6.2, -26], 0xffe2c0, 45, 22], [[-14, 5.8, -39.5], 0xffe8c8, 9, 10]] },
    aaa24: { s: [[[-12, 6.6, -28.5], [-13.6, 1.5, -38], 0xf4f2ff, 260, 0.34], [[-14, 6.6, -36.5], [-14, 0.6, -25.5], 0xece8ff, 300, 0.8]], p: [[[-14, 6.2, -26], 0xffe2c0, 45, 22], [[-14, 5.8, -39.5], 0xe0dcff, 9, 10]] },
    lab: { s: [[[22.5, 3.9, -21.5], [18.5, 0.9, -24.8], 0xf4f8ff, 24, 0.55], [[20, 3.9, -27], [19.6, 1.0, -29.6], 0xf4f8ff, 18, 0.7]], p: [[[20, 3.6, -24], 0xeef4ff, 3, 12], [[20, 1.8, -30.6], 0xbfd4ff, 1.2, 6]] },
  };
  const setRig = (key: keyof typeof RIGS) => {
    const R = RIGS[key];
    [S1, S2].forEach((s, i) => { const [p, t, c, I, a] = R.s[i]; s.position.set(...p); s.target.position.set(...t); s.color.setHex(c); s.intensity = I; s.angle = a; });
    [P1, P2].forEach((l, i) => { const [p, c, I, d] = R.p[i]; l.position.set(...p); l.color.setHex(c); l.intensity = I; l.distance = d; });
  };
  let rig = ""; const pickRig = (pos: V3, chapter?: string) => {
    const [x, , z] = pos, inside = z < ZF - 0.2 && z > ZB && x > -26 && x < 26;
    let a: keyof typeof RIGS = "ext";
    if (inside) a = x < -2 ? "hall" : x < 14 ? "lobby" : "lab";
    if (a === "hall" && chapter === "aaa-2024") a = "aaa24";
    if (a !== rig) { rig = a; setRig(a); looks.a.visible = a !== "aaa24"; looks.b.visible = a === "aaa24"; }
  };
  pickRig([0, 0, 10]);

  const traffic = new Traffic(b.group, [{ a: [-170, 0, 25.5], b: [170, 0, 25.5] }, { a: [170, 0, 29.5], b: [-170, 0, 29.5] }], [
    { geo: scooterGeo(0x2a2a2a), mat: b.mats.get("paint")!, n: 7, v: [7, 11], lamp: 1.0 },
    { geo: carGeo(0xcfd2d6), mat: b.mats.get("paint")!, n: 4, v: [6, 9], lamp: 0.75 },
  ], 9, k.bank.canvas(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false, false));

  const gate: V3 = [32, 0, 21.2], doorOut: V3 = [9.6, 0, -13.2], doorIn: V3 = [9.6, 0, -18.4];
  const sLobby: V3 = [5.2, 0, -24.8], sStage: V3 = [-14.2, 0.9, -37.8], sLab: V3 = [18.5, 0, -24.55];
  const toHall: V3[] = [gate, [-6, 0, -1], [-14.4, 0, -11.5], [-14.4, 0, -18.6], [-14.4, 0, -22], [-14.2, 0, -33.4], [-14.2, 0.9, -35.7], sStage];
  const toLobby: V3[] = [gate, [12, 0, -4], doorOut, doorIn, [7.4, 0, -22.6], sLobby];
  const stageToLab: V3[] = [sStage, [-14.2, 0.9, -35.7], [-14.2, 0, -33.4], [-14.2, 0, -32.6], [-4.5, 0, -32.2], [-4.5, 0, -26.5], [-0.6, 0, -26.5], [1.5, 0, -28.3], [4, 0, -28.3], [8.0, 0, -24.4], [12.5, 0, -23.2], [15.6, 0, -23.2], [17.4, 0, -23.6], sLab];
  const labOut: V3[] = [sLab, [17.4, 0, -23.6], [15.6, 0, -23.2], [12.5, 0, -23.2], [8.4, 0, -21.2], doorIn, doorOut, [12, 0, -4], [32.5, 0, 22.6]];
  const rev = (p: V3[]) => [...p].reverse();

  return assemble({
    id: "herald", k, people, lights: [S1, S2, P1, P2],
    env: { fog: { color: 0x111826, near: 70, far: 430 }, moon: 0.8, skyTint: 0x1a2440 },
    arrival: { cam: [22, 17, 24], look: [-1, 6.5, -18], fov: 52 },
    spawn: { pos: gate, yaw: Math.PI },
    stands: {
      herald: { pos: sLobby, yaw: 2.6, act: "talk", outfit: "college", bubbleSide: "right", shot: { cam: [8.4, 1.75, -31.0], look: [2.8, 1.9, -20.6], fov: 56 }, sign: { center: [-1.83, 2.65, -22.6], halfW: 2.05, halfH: 0.33 } },
      "aaa-2023": { pos: sStage, yaw: 0, act: "cert", outfit: "college", bubbleSide: "right", shot: { cam: [-14.2, 3.9, -21.4], look: [-14.2, 1.7, -37.6], fov: 50 }, sign: { center: [-14, 4.3, -41.5], halfW: 7, halfH: 2.1 } },
      "aaa-2024": { pos: sStage, yaw: 0.15, act: "cert", outfit: "college", bubbleSide: "left", shot: { cam: [-8.6, 3.5, -22.2], look: [-14.6, 1.8, -38.2], fov: 50 }, sign: { center: [-14, 4.3, -41.5], halfW: 7, halfH: 2.1 } },
      supervisor: { pos: sLab, yaw: Math.PI - 0.6, act: "sit", outfit: "office", bubbleSide: "left", shot: { cam: [24.6, 1.75, -21.2], look: [18.6, 1.15, -27.4], fov: 52 }, sign: { center: [20, 2.0, -31.8], halfW: 1.7, halfH: 0.96 } },
    },
    paths: {
      "spawn>herald": toLobby, "herald>exit": [...rev(toLobby).slice(0, -1), [32.5, 0, 22.6]],
      "spawn>aaa-2023": toHall, "aaa-2023>exit": [...rev(toHall).slice(0, -1), [32.5, 0, 22.6]],
      "spawn>aaa-2024": toHall, "aaa-2024>supervisor": stageToLab, "supervisor>exit": labOut,
    },
    tick: (_t, dt, f) => { traffic.update(dt); pickRig(f.heroPos, f.chapter); },
    dispose: () => { traffic.dispose(); audience.templates.forEach((c) => c.dispose()); },
  });
}
