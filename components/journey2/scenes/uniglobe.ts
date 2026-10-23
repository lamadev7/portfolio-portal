import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { mat4 } from "./ktm/lib";
import { palette, cityBlock, streetLamp, poleLine, tree, hedge, scooterGeo, carGeo, Traffic, distantLights, type Kit } from "./ktm/props";
import { wallWindows, railing, columns, assemble, spot, point, lin } from "./ktm/arch";
import { People } from "./ktm/people";
import { uniglobeTowerSign, uniglobeCanopySign, uniglobeBanner, busLivery, courtTex } from "./ktm/brand";
import { rng } from "./ktm/tex";

/* Uniglobe SS / College, Kamaladi. The school faces south onto a busy street (z+); origin is the gate. */

const WHITE = 0xf1efe9, RED = 0xc8463a, TEAL = 0x17a07a;

function ground(k: Kit) {
  const { b } = k;
  b.aabb("asphalt", -170, -0.1, 3.5, 170, 0, 12.5, { uv: 6 });
  b.aabb("concrete", -170, -0.1, 12.5, 170, 0.15, 14.5, { uv: 3, color: 0x9a968e });
  b.aabb("concrete", -170, -0.1, 2.0, -5, 0.15, 3.5, { uv: 3, color: 0x9a968e });
  b.aabb("concrete", 5, -0.1, 2.0, 170, 0.15, 3.5, { uv: 3, color: 0x9a968e });
  b.aabb("pavers", -5, -0.1, 1.2, 5, 0.0, 3.5, { uv: 4 });
  b.aabb("pavers", -48, -0.1, -62, 48, 0.0, 1.2, { uv: 4 });
  b.aabb("asphalt", -420, -0.2, -420, 420, -0.05, 420, { uv: 8, color: 0x8a8a8a });
  for (let x = -160; x < 160; x += 6) b.aabb("paint", x, 0.001, 7.95, x + 3, 0.01, 8.08, { color: lin(0.55) });
}

function tower(k: Kit) {
  const { b } = k, x0 = -3.8, x1 = 3.8, z0 = -24.4, z1 = -16.6, H = 26.4;
  b.aabb("paint", x0, 0, z0, x1, H, z0 + 0.3, { color: WHITE, uv: 3 });
  for (let f = 0; f < 8; f++) {
    const y = f * 3.45;
    b.aabb("concrete", x0 + 0.2, y, z0 + 0.3, x1 - 0.2, y + 0.25, z1 - 0.4, { color: 0x6a6a6a });
    const lx = f % 2 ? 1 : -1;
    for (let s = 0; s < 10; s++) b.box("concrete", lx * (0.2 + s * 0.28), y + 0.25 + s * 0.32, z0 + 1.6, 0.3, 0.06, 1.5, 0, { color: 0x9a9a96 });
    b.box("glowSoft", 0, y + 3.0, z0 + 3.2, 1.6, 0.05, 0.4, 0, { color: lin(1.2, 1.25, 1.15) });
    if (f % 2 === 1) k.pool([0, y + 2.6, z0 + 3.8], 5, 0x7affc0, 1.0);
  }
  b.aabb("glowSoft", x0 + 0.3, 0.3, z0 + 0.31, x1 - 0.3, H - 0.5, z0 + 0.35, { color: lin(0.12, 0.34, 0.22) });
  b.quad("glassT", 0, H / 2, z1, x1 - x0, H, 0, { color: 0x3fbf8f });
  b.quad("glassT", x1, H / 2, (z0 + z1) / 2, z1 - z0, H, Math.PI / 2, { color: 0x3fbf8f });
  for (let i = 0; i <= 6; i++) {
    const x = x0 + i * (x1 - x0) / 6; b.aabb("metal", x - 0.06, 0, z1, x + 0.06, H, z1 + 0.16, { color: TEAL });
    const z = z0 + i * (z1 - z0) / 6; b.aabb("metal", x1, 0, z - 0.06, x1 + 0.16, H, z + 0.06, { color: TEAL });
  }
  for (let j = 0; j <= 12; j++) {
    const y = j * H / 12; b.aabb("metal", x0, y - 0.05, z1, x1, y + 0.05, z1 + 0.16, { color: TEAL }); b.aabb("metal", x1, y - 0.05, z0, x1 + 0.16, y + 0.05, z1, { color: TEAL });
  }
  b.aabb("paint", x0 - 0.3, H, z0 - 0.3, x1 + 0.3, H + 3.4, z1 + 0.3, { color: 0x13865f, uv: 3 });
  b.aabb("paint", x0 - 0.45, H + 3.4, z0 - 0.45, x1 + 0.45, H + 4.0, z1 + 0.45, { color: WHITE, uv: 3 });
  b.aabb("paint", x0 - 0.45, H - 0.3, z0 - 0.45, x1 + 0.45, H, z1 + 0.45, { color: WHITE, uv: 3 });
  const sg = uniglobeTowerSign(k.atlas);
  b.quad("sign", 0, H + 1.7, z1 + 0.32, 7.3, 2.7, 0, { uv: sg, color: lin(0.85) });
  b.quad("sign", x1 + 0.32, H + 1.7, (z0 + z1) / 2, 7.3, 2.7, Math.PI / 2, { uv: sg, color: lin(0.85) });
  k.pool([0, H + 1.7, z1 + 2], 6, 0x2fd08f, 0.7);
  b.collide(x0, 0, z0, x1 + 0.2, H + 4, z1 + 0.2);
  b.aabb("wood", -6.6, 0, -21, x0, 21, -17.2, { color: 0xe8c8a0, uv: [0.6, 4] });
  for (let i = 0; i < 10; i++) b.aabb("dark", -6.55 + i * 0.29, 0, -17.22, -6.52 + i * 0.29, 21, -17.18, { color: 0x6a5238 });
  b.collide(-6.6, 0, -21, x0, 21, -17.2);
}

function block(k: Kit, x0: number, z0: number, x1: number, z1: number, h: number, o: { roof?: number; floors: number; floorH: number; seed: number; frame?: number; front?: boolean; back?: boolean; west?: boolean; east?: boolean; lit?: number; ww?: number }) {
  const { b } = k;
  b.aabb("paint", x0, 0, z0, x1, h, z1, { color: WHITE, uv: 4, collide: true });
  for (let f = 1; f <= o.floors; f++) b.aabb("paint", x0 - 0.12, f * o.floorH - 0.12, z0 - 0.12, x1 + 0.12, f * o.floorH + 0.06, z1 + 0.12, { color: 0xe4e1da });
  const W = { y0: 1.0, floors: o.floors, floorH: o.floorH, bay: 3.1, ww: o.ww ?? 1.5, wh: 1.65, frame: o.frame ?? 0x5a3a24, lit: o.lit ?? 0.42 };
  if (o.front !== false) wallWindows(k, { ...W, cx: (x0 + x1) / 2, cz: z1, ry: 0, len: x1 - x0 - 1, seed: o.seed });
  if (o.back !== false) wallWindows(k, { ...W, cx: (x0 + x1) / 2, cz: z0, ry: Math.PI, len: x1 - x0 - 1, seed: o.seed + 1 });
  if (o.west !== false) wallWindows(k, { ...W, cx: x0, cz: (z0 + z1) / 2, ry: -Math.PI / 2, len: z1 - z0 - 1, seed: o.seed + 2 });
  if (o.east !== false) wallWindows(k, { ...W, cx: x1, cz: (z0 + z1) / 2, ry: Math.PI / 2, len: z1 - z0 - 1, seed: o.seed + 3 });
  if (o.roof) b.hipRoof("tin", (x0 + x1) / 2, h, (z0 + z1) / 2, x1 - x0 + 1.6, z1 - z0 + 1.6, o.roof, { color: RED, uv: 3 });
}

function buildings(k: Kit) {
  const { b } = k;
  tower(k);
  block(k, -24, -27, -6.2, -15, 11.4, { roof: 2.0, floors: 3, floorH: 3.6, seed: 11, east: false });
  block(k, -20, -40, -4, -27, 15.0, { roof: 2.2, floors: 4, floorH: 3.6, seed: 21, front: false });
  block(k, 7, -27, 20, -13, 16.4, { floors: 4, floorH: 3.7, seed: 31, frame: 0xe8e8e8, ww: 1.3, lit: 0.45 });
  b.aabb("paint", 3.8, 0, -28, 7, 15, -24.4, { color: WHITE, uv: 3, collide: true });
  b.aabb("paint", -6.6, 0, -27, -3.8, 18, -21, { color: WHITE, uv: 3, collide: true });
  b.aabb("paint", 6.8, 16.4, -27.2, 20.2, 17.2, -12.8, { color: WHITE, uv: 3 });
  b.aabb("paint", 13.5, 16.4, -20, 20, 19.0, -13.5, { color: WHITE, uv: 3 });
  b.hipRoof("tin", 16.75, 19.0, -16.75, 7.6, 7.6, 1.5, { color: RED, uv: 3 });
  b.hipRoof("tin", 9.8, 17.2, -20.5, 5.6, 13.4, 1.2, { color: RED, uv: 3 });
  for (let i = 0; i < 24; i++) b.box("metal", 20.12, 5.2, -25.6 + i * 0.36, 0.22, 10, 0.06, 0, { color: 0x8c9196 });
  const ban = uniglobeBanner(k.atlas);
  b.quad("atlas", 18.6, 10.6, -12.9, 2.2, 5.6, 0, { uv: ban });
  b.aabb("paint", 13.6, 13.9, -12.95, 19.6, 15.4, -12.75, { color: 0x13865f });
  b.quad("sign", 16.6, 14.65, -12.7, 5.6, 1.3, 0, { uv: uniglobeTowerSign(k.atlas), color: lin(0.7) });
  /* two-storey annex in front of the right block, red pitched roof */
  b.aabb("paint", 9, 0, -13, 20, 7.2, -9.6, { color: WHITE, uv: 3, collide: true });
  wallWindows(k, { cx: 14.5, cz: -9.6, ry: 0, len: 10, y0: 1.0, floors: 2, floorH: 3.4, bay: 3.1, ww: 1.5, wh: 1.65, frame: 0x5a3a24, seed: 51, lit: 0.5 });
  b.hipRoof("tin", 14.5, 7.2, -11.3, 12.2, 4.8, 1.3, { color: RED, uv: 3 });
  /* entrance canopy */
  b.aabb("paint", -11, 4.2, -16.9, 2, 5.8, -8, { color: WHITE, uv: 3 });
  b.hipRoof("tin", -4.5, 5.8, -12.45, 14.2, 9.9, 1.5, { color: RED, uv: 3 });
  b.quad("sign", -4.5, 5.0, -7.97, 9.2, 1.38, 0, { uv: uniglobeCanopySign(k.atlas), color: lin(0.62) });
  columns(k, "metal", [[-10.5, -8.5], [1.5, -8.5]], 0, 4.2, 0.24, TEAL);
  b.collide(-10.8, 0, -8.8, -10.2, 4.2, -8.2); b.collide(1.2, 0, -8.8, 1.8, 4.2, -8.2);
  for (const [x, z] of [[-8.5, -10], [-4.5, -10], [-0.5, -10], [-8.5, -13.5], [-4.5, -13.5], [-0.5, -13.5]] as const) {
    b.cyl("glow", x, 4.17, z, 0.18, 0.18, 0.03, 12, { color: lin(1.4, 1.2, 0.95) });
  }
  b.aabb("paint", -9.8, 0, -15.05, -6.2, 3.1, -14.98, { color: 0x2a2f33 });
  b.quad("glowSoft", -8.0, 1.5, -14.93, 3.4, 2.9, 0, { color: lin(0.55, 0.4, 0.24) });
  for (const x of [-9.2, -8.0, -6.8]) b.box("metal", x, 0, -14.9, 0.06, 3.0, 0.06, 0, { color: 0x30363a });
  k.pool([-4.5, 3.6, -11.5], 9, 0xffd7a0, 1.4);
  k.pool([6, 7, -9], 14, 0xfff0dc, 0.6); k.pool([-16, 7, -10], 12, 0xffe0b8, 0.7); k.pool([-15, 1, -13.5], 9, 0xffe8c8, 0.9); k.pool([14.5, 1, -8], 9, 0xffe8c8, 0.9); k.pool([12, 12, -11], 10, 0xfff0dc, 0.6); k.pool([-31, 1, -10], 8, 0xffe8c8, 0.7);
  /* left low wing with yellow awning + roof terrace */
  block(k, -38, -24, -24.2, -12, 7.4, { floors: 2, floorH: 3.4, seed: 41, east: false, lit: 0.15 });
  for (let i = 0; i < 6; i++) b.box("metal", -37.5 + i * 2.6, 0, -9.7, 0.08, 3.2, 0.08, 0, { color: 0x666666 });
  b.add("tin", new THREE.BoxGeometry(14, 0.08, 2.6), mat4(-31.1, 3.35, -10.8, 0, 1, 1, 1, -0.12), { color: 0xe0b43c, uv: 3 });
  railing(k, "metal", [-38, 7.4, -12], [-24.2, 7.4, -12], 1.05, { color: 0xdedede, bal: 0.25 });
  railing(k, "metal", [-38, 7.4, -24], [-38, 7.4, -12], 1.05, { color: 0xdedede, bal: 0.25 });
}

function court(k: Kit) {
  const { b } = k, x0 = 23.5, x1 = 39.5, z0 = -47, z1 = -18;
  b.quad("atlas", (x0 + x1) / 2, 0.012, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, { uv: courtTex(k.atlas), rx: -Math.PI / 2 });
  const posts: [number, number][] = [];
  for (let x = x0; x <= x1 + 0.01; x += 4) posts.push([x, z0], [x, z1]);
  for (let z = z0 + 4; z < z1; z += 4.14) posts.push([x0, z], [x1, z]);
  for (const [x, z] of posts) b.cyl("metal", x, 0, z, 0.05, 0.05, 4.2, 6, { color: 0x3c4448 });
  const fence = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bz - az, bx - ax);
    b.quad("net", (ax + bx) / 2, 2.1, (az + bz) / 2, len, 4.2, -ry, { uv: [0.12, 0.12], color: 0xb8c0c4 });
    b.tube("metal", [[ax, 4.2, az], [bx, 4.2, bz]], 0.04, 5, { color: 0x3c4448 });
  };
  fence(x0, z0, x1, z0); fence(x0, z1, x1 - 6, z1); fence(x0, z0, x0, z1); fence(x1, z0, x1, z1);
  b.collide(x0 - 0.1, 0, z0 - 0.1, x1 + 0.1, 4.2, z0 + 0.1); b.collide(x0 - 0.1, 0, z1 - 0.1, x1 - 6, 4.2, z1 + 0.1);
  b.collide(x0 - 0.1, 0, z0, x0 + 0.1, 4.2, z1); b.collide(x1 - 0.1, 0, z0, x1 + 0.1, 4.2, z1);
  for (const s of [1, -1]) {
    const cz = s > 0 ? z0 + 0.5 : z1 - 0.5, x = (x0 + x1) / 2;
    b.cyl("metal", x, 0, cz, 0.08, 0.1, 3.4, 8, { color: 0x2f3438 });
    b.box("paint", x, 2.9, cz + s * 0.45, 1.8, 1.05, 0.05, 0, { color: 0xf0f0f0 });
    b.add("metal", new THREE.TorusGeometry(0.23, 0.02, 6, 16), mat4(x, 3.05, cz + s * 0.75, 0, 1, 1, 1, Math.PI / 2), { color: 0xe0581c });
    b.aabb("metal", x - 1.5, 0, cz + s * 0.3 - 0.05, x - 1.42, 2, cz + s * 0.3 + 0.05, { color: 0xf2f2f2 });
    b.aabb("metal", x + 1.42, 0, cz + s * 0.3 - 0.05, x + 1.5, 2, cz + s * 0.3 + 0.05, { color: 0xf2f2f2 });
    b.aabb("metal", x - 1.5, 1.92, cz + s * 0.3 - 0.05, x + 1.5, 2, cz + s * 0.3 + 0.05, { color: 0xf2f2f2 });
    b.quad("net", x, 1, cz + s * 0.3 - s * 0.6, 3, 2, 0, { uv: [0.12, 0.12], color: 0xdddddd });
  }
  for (const [x, z] of [[x0 - 0.6, z1 + 0.6], [x1 + 0.6, z0 - 0.6], [x0 - 0.6, z0 - 0.6], [x1 + 0.6, z1 + 0.6]] as const) {
    b.cyl("metal", x, 0, z, 0.09, 0.14, 10, 8, { color: 0x50575c });
    b.box("dark", x, 10, z, 1.2, 0.5, 0.3, Math.atan2((x0 + x1) / 2 - x, (z0 + z1) / 2 - z), { color: 0x222222 });
    b.box("glow", x, 10.05, z, 1.0, 0.36, 0.33, Math.atan2((x0 + x1) / 2 - x, (z0 + z1) / 2 - z), { color: lin(2.2, 2.3, 2.4) });
  }
  k.pool([(x0 + x1) / 2, 9, (z0 + z1) / 2 + 7], 16, 0xe8f0ff, 0.9);
  k.pool([(x0 + x1) / 2, 9, (z0 + z1) / 2 - 7], 16, 0xe8f0ff, 0.9);
}

function bus(k: Kit, x: number, z: number, ry: number) {
  const { b } = k, L = 10.4, W = 2.45, liv = busLivery(k.atlas);
  const m = (dx: number, dy: number, dz: number) => { const c = Math.cos(ry), s = Math.sin(ry); return [x + dx * c + dz * s, dy, z - dx * s + dz * c] as V3; };
  const at = (dx: number, dy: number, dz: number, w: number, h: number, d: number, key: string, color: number | THREE.Color) => { const p = m(dx, dy, dz); b.box(key, p[0], p[1], p[2], w, h, d, ry, { color: color as number }); };
  at(0, 0.45, 0, L, 2.3, W, "paint", 0xf3f1ea);
  at(0, 2.75, 0, L - 0.2, 0.25, W - 0.1, "paint", 0xe6e3da);
  at(0, 1.55, 0, L - 1.2, 0.95, W + 0.02, "glass", 0x23303a);
  for (const s of [1, -1]) { const p = m(-0.6, 1.0, s * (W / 2 + 0.012)); b.quad("atlas", p[0], 1.05, p[2], 7.6, 0.75, ry + (s > 0 ? 0 : Math.PI), { uv: liv }); }
  const f = m(L / 2 + 0.01, 1.7, 0); b.quad("glass", f[0], 1.75, f[2], W - 0.2, 1.1, ry + Math.PI / 2, { color: 0x1b252c });
  for (const [dx, dz] of [[3.4, 1], [3.4, -1], [-3.0, 1], [-3.0, -1]]) { const p = m(dx, 0.48, dz * (W / 2 - 0.1)); b.add("dark", new THREE.CylinderGeometry(0.48, 0.48, 0.32, 16), mat4(p[0], 0.48, p[2], ry + Math.PI / 2, 1, 1, 1, Math.PI / 2), { color: 0x121212 }); }
  for (let i = 0; i < 4; i++) { const p = m(-3.5 + i * 2.0, 1.6, 0); b.box("glowSoft", p[0], 2.4, p[2], 0.6, 0.04, 0.3, ry, { color: lin(0.6, 0.65, 0.7) }); }
  const c = Math.cos(ry), s = Math.sin(ry), hx = Math.abs(L / 2 * c) + Math.abs(W / 2 * s), hz = Math.abs(L / 2 * s) + Math.abs(W / 2 * c);
  b.collide(x - hx, 0, z - hz, x + hx, 3, z + hz);
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = palette(ctx.renderer, { facadeSeed: 7, lit: 0.45 }), { b } = k;
  ground(k); buildings(k); court(k);
  b.aabb("paint", -48.3, 0, -62.3, 48.3, 2.4, -62, { color: 0xd8d2c4, uv: 3, collide: true });
  b.aabb("paint", -48.3, 0, -62, -48, 2.4, 1.2, { color: 0xd8d2c4, uv: 3, collide: true });
  b.aabb("paint", 48, 0, -62, 48.3, 2.4, 1.2, { color: 0xd8d2c4, uv: 3, collide: true });
  hedge(k, -48, 1.2, -5.6, 2.0); hedge(k, 5.6, 1.2, 48, 2.0);
  for (const x of [-5.3, 5.3]) {
    b.box("paint", x, 0, 1.6, 0.7, 2.6, 0.7, 0, { color: 0xe6e2d8, collide: true });
    b.add("glow", new THREE.SphereGeometry(0.22, 12, 8), mat4(x, 2.85, 1.6), { color: lin(1.6, 1.45, 1.2) });
    k.pool([x, 2.9, 1.6], 5, 0xffe2b0, 0.9);
  }
  bus(k, 13.4, -4.6, 0);
  for (const [x, z, s] of [[-44, -1.6, 1.2], [-36, -1.6, 1.1], [-28, -1.6, 1.2], [-20, -1.6, 1.0], [26, -1.6, 1.1], [34, -1.6, 1.2], [42, -1.6, 1.1], [-15.5, -6.5, 0.9], [-44, -30, 1.3], [44, -54, 1.2], [-30, -50, 1.3], [20, -55, 1.1]] as const) {
    tree(k, x, z, s, (x * 7 + z * 3) | 0); b.collide(x - 0.35, 0, z - 0.35, x + 0.35, 4, z + 0.35);
  }
  /* street: lamps, poles + wires, parked scooters */
  for (let x = -150; x <= 150; x += 25) { streetLamp(k, x + 12, 3.35, 0, { color: 0xeef4ff }); b.collide(x + 11.9, 0, 3.25, x + 12.1, 7, 3.45); }
  for (let x = -150; x <= 150; x += 25) streetLamp(k, x, 12.75, Math.PI, { color: 0xffd9a8 });
  for (const x of [-12, 13]) k.pool([x, 6.8, 4.6], 9, 0xeef4ff, 0.8);
  for (const x of [0, 25]) k.pool([x, 6.8, 11.4], 9, 0xffd9a8, 0.8);
  poleLine(k, [-160, -138, -116, -94, -72, -50, -28, -6, 16, 38, 60, 82, 104, 126, 148].map((x) => [x, 12.75] as [number, number]), 0, 5);
  const sc = [0x8a1f1f, 0x1f3f8a, 0x222222, 0xd8d8d8, 0x3d6b3d, 0xb08a2a];
  const r = rng(77);
  for (let x = -90; x < 90; x += 0.9) {
    if (r() < 0.35 || Math.abs(x - 2) < 4) continue;
    const g = scooterGeo(sc[(r() * sc.length) | 0]); b.add("paint", g, mat4(x, 0.0, 11.7, Math.PI * 0.62 + (r() - 0.5) * 0.2), { uv: 1 }); g.dispose();
  }
  /* city around */
  const blocksS: [number, number][] = [[-170, -118], [-112, -68], [-62, -20], [-14, 28], [34, 76], [82, 124], [130, 172]];
  blocksS.forEach(([a, c], i) => cityBlock(k, a, 14.5, c, 40, 100 + i, { front: ["n"], floors: [3, 6] }));
  blocksS.forEach(([a, c], i) => cityBlock(k, a, 46, c, 76, 200 + i, { floors: [3, 6] }));
  cityBlock(k, -150, -46, -104, 1.5, 300, { front: ["s"], floors: [3, 6] }); cityBlock(k, -98, -46, -54, 1.5, 301, { front: ["s"], floors: [3, 5] });
  cityBlock(k, 54, -46, 98, 1.5, 302, { front: ["s"], floors: [3, 6] }); cityBlock(k, 104, -46, 150, 1.5, 303, { front: ["s"], floors: [3, 6] });
  cityBlock(k, -150, -100, -54, -52, 304, { floors: [3, 6] }); cityBlock(k, 54, -100, 150, -52, 305, { floors: [3, 6] });
  cityBlock(k, -48, -110, -2, -68, 306, { floors: [4, 7] }); cityBlock(k, 4, -110, 48, -68, 307, { floors: [4, 7] });
  distantLights(k, 0, -10, 180, 420, 140, 9);

  /* people */
  const people = new People(ctx);
  await Promise.all([
    people.stand("local", 3, [4.0, 0, -0.9], -Math.PI / 2, "idle"),
    people.stand("student", 11, [-7.6, 0, -5.8], 2.4, "talk"), people.stand("student", 12, [-8.6, 0, -6.9], 0.8, "idle"), people.stand("student", 13, [-7.0, 0, -7.0], -0.5, "look"),
    people.stand("student", 14, [6.2, 0, -7.6], 1.2, "idle"), people.stand("student", 15, [7.0, 0, -8.3], -1.9, "talk"),
    people.stand("student", 16, [29.5, 0, -27], 0.3, "idle"), people.stand("student", 17, [33, 0, -34], 3.0, "idle"),
    people.walk("local", 21, [[-70, 0.15, 13.35], [70, 0.15, 13.35], [70, 0.15, 14.05], [-70, 0.15, 14.05]], 1.3, 0.1, "far-sidewalk-a"),
    people.walk("local", 22, [[-70, 0.15, 13.35], [70, 0.15, 13.35], [70, 0.15, 14.05], [-70, 0.15, 14.05]], 1.2, 0.62, "far-sidewalk-b"),
    people.walk("student", 23, [[6.5, 0.15, 2.6], [46, 0.15, 2.6], [46, 0.15, 2.85], [6.5, 0.15, 2.85]], 1.25, 0.8, "near-sidewalk"),
  ]);

  const traffic = new Traffic(b.group, [{ a: [-170, 0, 6.0], b: [170, 0, 6.0] }, { a: [170, 0, 10.0], b: [-170, 0, 10.0] }], [
    { geo: scooterGeo(0x9a2020), mat: b.mats.get("paint")!, n: 9, v: [7, 11], lamp: 1.0 },
    { geo: carGeo(0xcfd2d6), mat: b.mats.get("paint")!, n: 4, v: [6, 9], lamp: 0.75 },
    { geo: carGeo(0xe8e4dc, 5.2, 1.9, 2.1), mat: b.mats.get("paint")!, n: 2, v: [5, 7], lamp: 0.8 },
  ], 3, k.bank.canvas(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false, false));

  const lights = [
    spot(0xffd9a6, 260, [2.5, 10, 2], [-4.5, 2.6, -9], 0.55, 34, 0.7),
    point(0xffd2a0, 22, [-4.5, 3.7, -11.5], 12),
    spot(0xe6eeff, 420, [31.5, 13, -14], [31.5, 0, -32], 0.75, 40, 0.5),
    spot(0xfff2e0, 900, [9, 1.2, 1.5], [1, 16, -17], 0.42, 45, 0.6),
  ];

  const stand: V3 = [-2.6, 0, -5.0];
  return assemble({
    id: "uniglobe", k, people, lights,
    env: { fog: { color: 0x121927, near: 60, far: 430 }, moon: 0.75, skyTint: 0x1a2440 },
    arrival: { cam: [33, 31, 22], look: [-2, 11, -19], fov: 50 },
    spawn: { pos: [40, 0.15, 2.8], yaw: -Math.PI / 2 },
    stands: {
      uniglobe: { pos: stand, yaw: 0.62, act: "talk", outfit: "student", bubbleSide: "right", shot: { cam: [5.2, 1.7, 3.8], look: [-3.2, 4.2, -11], fov: 50 }, sign: { center: [-4.5, 5.0, -8], halfW: 4.6, halfH: 0.7 } },
    },
    paths: {
      "spawn>uniglobe": [[40, 0.15, 2.8], [6.6, 0.15, 2.8], [3.6, 0, 2.8], [1.0, 0, 0], stand],
      "uniglobe>exit": [stand, [-1.0, 0, 0], [-3.6, 0, 2.8], [-6.6, 0.15, 2.8], [-60, 0.15, 2.8]],
    },
    tick: (_t, dt) => traffic.update(dt),
    dispose: () => traffic.dispose(),
  });
}
