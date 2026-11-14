import * as THREE from "three";
import { box, boxB, cyl, cylB, gableRoof, gableEnds, hipRoof, mat4, rockGeo, lathe, type Batch } from "./geo";
import { rng } from "./tex";
import { railing, windowAt, door } from "./build";
import type { SceneKit } from "./scene";

/* vernacular houses of the Terai and the hills: stilt houses, mud-and-thatch homes, cowsheds, haystacks, woodpiles.
   Each takes a world position + yaw (front faces +z before rotation) and registers its own collider. */

export interface HouseOpts { lit?: number; seed?: number; pool?: boolean }

const warm = 0xffc27a;

/** small timber window / opening with shutters */
function opening(b: Batch, x: number, y: number, z: number, w: number, h: number, ry: number, lit: number, wood = 0x5a3e28) {
  b.push(mat4(x, y, z, ry));
  if (lit > 0) b.add(new THREE.PlaneGeometry(w, h), "glow", warm, mat4(0, 0, 0.01), false, lit);
  else b.add(new THREE.PlaneGeometry(w, h), "matte", 0x0a0908, mat4(0, 0, 0.01), false);
  b.add(box(w + 0.16, 0.08, 0.1), "wood", wood, mat4(0, h / 2 + 0.04, 0.04), false); b.add(box(w + 0.2, 0.08, 0.12), "wood", wood, mat4(0, -h / 2 - 0.04, 0.05), false);
  b.add(box(0.07, h, 0.08), "wood", wood, mat4(-w / 2 - 0.035, 0, 0.04), false); b.add(box(0.07, h, 0.08), "wood", wood, mat4(w / 2 + 0.035, 0, 0.04), false);
  for (let i = 1; i < 4; i++) b.add(box(0.025, h, 0.025), "wood", wood, mat4(-w / 2 + (w * i) / 4, 0, 0.05), false);
  b.pop();
}

/** two-storey Terai stilt house: timber posts, plank/plaster upper floor with a front balcony, rusted tin hip roof */
export function stiltHouse(k: SceneKit, b: Batch, x: number, y: number, z: number, yaw: number, o: HouseOpts = {}) {
  const R = rng(o.seed ?? 5), W = 7.2, D = 5.2, fl = 2.1, wallH = 2.4, wallC = [0x5fb0b0, 0x7cc0c8, 0x9cc4a0][Math.floor(R() * 3)], band = [0xc87a7a, 0xd09080, 0xb86a5a][Math.floor(R() * 3)];
  const post = 0x6a5038, tin = [0x9a4a26, 0x8a5032, 0xa65a30][Math.floor(R() * 3)];
  b.push(mat4(x, y, z, yaw));
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
    const px = -W / 2 + 0.2 + (i * (W - 0.4)) / 3, pz = -D / 2 + 0.2 + (j * (D - 0.4)) / 2;
    b.add(rockGeo(0.28, i * 3 + j, 0, 0.55), "stone", 0x8a847a, mat4(px, 0.05, pz)); b.add(boxB(0.22, fl, 0.22), "wood", post, mat4(px, 0, pz));
  }
  /* floor deck + joists */
  b.add(boxB(W + 0.3, 0.22, D + 1.6), "wood", 0x6a5038, mat4(0, fl, 0.7));
  for (let i = 0; i < 7; i++) b.add(box(0.14, 0.18, D + 1.6), "wood", 0x4e3a28, mat4(-W / 2 + (i * W) / 6, fl - 0.09, 0.7));
  /* upper floor walls: plastered planks, colour band at the bottom */
  const yW = fl + 0.22;
  b.add(boxB(W, wallH, D), "plaster", wallC, mat4(0, yW, 0)); b.add(boxB(W + 0.02, 0.75, D + 0.02), "plaster", band, mat4(0, yW, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(boxB(0.16, wallH, 0.16), "wood", post, mat4(sx * W / 2, yW, sz * D / 2));
  const lit = o.lit ?? 0;
  opening(b, -1.8, yW + 1.35, D / 2 + 0.01, 0.8, 0.8, 0, lit > 0 && R() < 0.8 ? lit : 0); opening(b, 1.8, yW + 1.35, D / 2 + 0.01, 0.8, 0.8, 0, 0);
  b.add(box(0.9, 1.9, 0.06), "wood", 0x5a3a24, mat4(0, yW + 0.95, D / 2 + 0.03));
  opening(b, -W / 2 - 0.01, yW + 1.35, 0, 0.7, 0.7, -Math.PI / 2, 0); opening(b, W / 2 + 0.01, yW + 1.35, 0, 0.7, 0.7, Math.PI / 2, lit > 0 && R() < 0.5 ? lit * 0.8 : 0);
  opening(b, 1.5, yW + 1.35, -D / 2 - 0.01, 0.7, 0.7, Math.PI, 0);
  /* balcony with balustrade, posts up to the lower roof skirt */
  railing(b, -W / 2, W / 2, yW, D / 2 + 1.35, 0.85, 0x7a5a3e, "wood");
  for (let i = 0; i < 4; i++) b.add(boxB(0.14, wallH, 0.14), "wood", post, mat4(-W / 2 + 0.1 + (i * (W - 0.2)) / 3, yW, D / 2 + 1.4));
  /* roof: hip over the room, lean-to skirt over the balcony */
  b.add(hipRoof(W, D, 1.5, 0.6), "tin", tin, mat4(0, yW + wallH + 0.05, 0));
  b.add(box(W + 1.2, 0.04, 2.0), "tin", tin, mat4(0, yW + wallH - 0.15, D / 2 + 0.95, 0, 0.32));
  /* under the house: woodpile, a ladder, a charpai */
  for (let i = 0; i < 18; i++) b.add(cyl(0.06, 0.06, 1.2, 6), "bark", 0x7a6248, mat4(W / 2 - 1.2 + (i % 6) * 0.13, 0.08 + Math.floor(i / 6) * 0.12, -D / 2 + 0.9, 0, 0, Math.PI / 2), false);
  for (let i = 0; i < 6; i++) b.add(box(0.5, 0.04, 0.06), "wood", 0x6a5038, mat4(-W / 2 + 0.6, 0.3 + i * 0.32, D / 2 + 0.5, 0, -0.35), false);
  b.add(boxB(0.9, 0.42, 1.9), "wood", 0x6a5038, mat4(-1.5, 0, -0.6));
  b.pop();
  k.foot(x, z, W + 0.6, D + 1.8, yaw, y, fl + wallH + 2);
  if (o.pool && lit) k.mats.pool([x + Math.sin(yaw) * (D / 2 + 2), y + 3.2, z + Math.cos(yaw) * (D / 2 + 2)], 7, warm, 0.8);
}

/** single-storey mud house: white-washed upper wall, ochre lower band, thatch gable roof, front verandah lean-to */
export function mudHouse(k: SceneKit, b: Batch, x: number, y: number, z: number, yaw: number, o: HouseOpts & { w?: number; d?: number; tinVerandah?: boolean; tile?: boolean } = {}) {
  const R = rng(o.seed ?? 9), W = o.w ?? 6.5 + R() * 2, D = o.d ?? 4.2 + R(), H = 2.5, rise = 2.1, ochre = [0xb86a3a, 0xa85a32, 0xc0784a][Math.floor(R() * 3)];
  const lit = o.lit ?? 0;
  b.push(mat4(x, y, z, yaw));
  b.add(boxB(W + 0.5, 0.3, D + 2.2), "mud", 0x9a8064, mat4(0, 0, 0.8));
  b.add(boxB(W, H, D), "mud", 0xeee6d8, mat4(0, 0.3, 0)); b.add(boxB(W + 0.03, 0.9, D + 0.03), "mud", ochre, mat4(0, 0.3, 0));
  b.add(gableEnds(W, D, rise, 0.25).translate(0, 0.3 + H, 0), "mud", 0xeee6d8);
  b.add(gableRoof(W + 0.2, D, rise, 0.75, 0.32), o.tile ? "tile" : "thatch", o.tile ? 0x9a5a3a : 0xc9a46a, mat4(0, 0.3 + H, 0));
  b.add(cyl(0.12, 0.12, W + 1.6, 6), o.tile ? "tile" : "thatch", 0xa8844e, mat4(0, 0.3 + H + rise + 0.05, 0, 0, 0, Math.PI / 2));
  /* verandah */
  const vy = 0.3 + H - 0.25;
  for (let i = 0; i < 4; i++) b.add(boxB(0.14, vy - 0.3, 0.14), "wood", 0x5e4430, mat4(-W / 2 + 0.3 + (i * (W - 0.6)) / 3, 0.3, D / 2 + 1.6));
  b.add(box(W + 0.6, 0.12, 0.14), "wood", 0x5e4430, mat4(0, vy, D / 2 + 1.6));
  b.add(box(W + 0.8, 0.05, 2.2), o.tinVerandah ? "tin" : "thatch", o.tinVerandah ? 0x8a8a86 : 0xb8945a, mat4(0, vy + 0.2, D / 2 + 1.05, 0, 0.22));
  b.add(box(1.0, 1.95, 0.06), "wood", 0x4e3624, mat4(-0.6, 0.3 + 0.98, D / 2 + 0.03));
  opening(b, 1.4, 0.3 + 1.4, D / 2 + 0.01, 0.6, 0.6, 0, lit > 0 ? lit : 0);
  opening(b, -W / 2 - 0.01, 0.3 + 1.4, 0, 0.5, 0.5, -Math.PI / 2, 0);
  opening(b, 0.8, 0.3 + 1.4, -D / 2 - 0.01, 0.5, 0.5, Math.PI, lit > 0 && R() < 0.5 ? lit * 0.7 : 0);
  if (lit > 0) { b.add(cylB(0.05, 0.05, 0.12, 6), "glow", warm, mat4(0.2, vy - 0.2, D / 2 + 0.6), false, 4); }
  b.pop();
  k.foot(x, z, W + 1, D + 2.4, yaw, y, 0.3 + H + rise + 0.4);
  if (o.pool && lit) k.mats.pool([x + Math.sin(yaw) * (D / 2 + 0.8) + Math.cos(yaw) * 0.2, y + vy - 0.3, z + Math.cos(yaw) * (D / 2 + 0.8) - Math.sin(yaw) * 0.2], 6.5, warm, 1.1);
}

/** open cowshed / store: thatch roof on posts, a manger, hay */
export function cowshed(k: SceneKit, b: Batch, x: number, y: number, z: number, yaw: number, seed = 1) {
  const W = 5, D = 3.2; void seed;
  b.push(mat4(x, y, z, yaw));
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) b.add(boxB(0.14, 2.2 - (sz < 0 ? 0 : 0.5), 0.14), "wood", 0x5e4430, mat4(sx * W / 2, 0, sz * D / 2));
  b.add(box(W + 1, 0.12, D + 1.6), "thatch", 0xb89660, mat4(0, 2.0, 0, 0, -0.18));
  b.add(boxB(W - 0.6, 0.5, 0.6), "mud", 0x8a6a4a, mat4(0, 0, -D / 2 + 0.5));
  b.add(rockGeo(0.9, seed, 1, 0.5), "thatch", 0xc8a868, mat4(-1.2, 0.2, -0.6));
  b.pop();
  k.foot(x, z, W + 0.4, D + 0.4, yaw, y, 2.4);
}

/** conical haystack on a pole (common in Terai yards) */
export function haystack(k: SceneKit, b: Batch, x: number, y: number, z: number, s = 1) {
  b.add(lathe([[0.01, 0], [1.25, 0.15], [1.35, 0.9], [1.1, 1.9], [0.55, 2.8], [0.08, 3.3]].map(([r, h]) => [r * s, h * s] as [number, number]), 12), "thatch", 0xd2b070, mat4(x, y, z));
  b.add(cyl(0.04, 0.04, 1.0 * s, 5), "wood", 0x5e4430, mat4(x, y + 3.6 * s, z), false);
  k.box(x - 1.3 * s, y, z - 1.3 * s, x + 1.3 * s, y + 3.3 * s, z + 1.3 * s);
}

/** low wall of stacked firewood or a bamboo fence run between two points (no collider: decorative edges) */
export function bambooFence(b: Batch, ax: number, az: number, bx: number, bz: number, y: (x: number, z: number) => number, h = 1.1) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 0.22)), ry = Math.atan2(bx - ax, bz - az);
  for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; b.add(cyl(0.025, 0.03, h * (0.9 + ((i * 7) % 5) * 0.04), 5), "bark", 0x8a7a50, mat4(x, y(x, z) + h / 2, z, 0, (((i * 13) % 7) - 3) * 0.02), false); }
  for (const hh of [0.35, 0.8]) { const m = mat4((ax + bx) / 2, y((ax + bx) / 2, (az + bz) / 2) + hh * h, (az + bz) / 2, ry); b.add(box(0.03, 0.03, L), "bark", 0x7a6a44, m, false); }
}

/** Khumbu lodge: stone ground floor or plinth, white-plastered upper floors, rows of coloured-frame windows,
    low tin roof (green / blue / red) with snow on it, chimney; sits level on a stone terrace cut into the slope */
export function lodge(k: SceneKit, b: Batch, x: number, ground: (x: number, z: number) => number, z: number, yaw: number, o: { w?: number; d?: number; floors?: number; roof?: number; frame?: number; lit?: number; seed?: number; snow?: number; simple?: boolean } = {}) {
  const R = rng(o.seed ?? 3), W = o.w ?? 9 + R() * 4, D = o.d ?? 6.5 + R() * 2, F = o.floors ?? 2 + Math.floor(R() * 2), FH = 2.7;
  const roof = o.roof ?? [0x2f7a4a, 0x2a5a9a, 0x3a8a5a, 0xa83a2a][Math.floor(R() * 4)], frame = o.frame ?? [0x2a6a4a, 0x2a4a8a, 0x6a4a2e][Math.floor(R() * 3)];
  const c = Math.cos(yaw), s = Math.sin(yaw);
  let gmin = Infinity, gmax = -Infinity; for (const [u, v] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [0, 0]]) { const gy = ground(x + u * c + v * s, z - u * s + v * c); gmin = Math.min(gmin, gy); gmax = Math.max(gmax, gy); }
  const y0 = gmax + 0.3;
  b.push(mat4(x, y0, z, yaw));
  b.add(boxB(W + 1.4, y0 - gmin + 0.6, D + 2.2), "stone", 0xb8b2a8, mat4(0, gmin - y0 - 0.6, 0.5));
  b.add(boxB(W, FH, D), "stone", 0xc8c2b8, mat4(0, 0, 0));
  b.add(boxB(W + 0.02, (F - 1) * FH, D + 0.02), "plaster", 0xf2f0ea, mat4(0, FH, 0));
  for (let f = 1; f < F; f++) b.add(box(W + 0.2, 0.18, D + 0.2), "wood", 0x6a4a30, mat4(0, f * FH, 0));
  const lit = o.lit ?? 0.5;
  for (let f = 0; f < F; f++) {
    const n = Math.max(2, Math.floor(W / 1.9));
    for (let i = 0; i < n; i++) {
      const wx = -W / 2 + (W * (i + 0.5)) / n;
      if (f === 0 && i === Math.floor(n / 2)) { door(b, wx, 0, D / 2 + 0.02, 1.1, 2.1, 0, 0x5a3a24, frame); continue; }
      windowAt(b, wx, f * FH + 1.45, D / 2 + 0.01, f === 0 ? 1.0 : 1.25, f === 0 ? 1.1 : 1.3, 0, { frame, lit: R() < lit ? 2.2 : 0, cell: 1, panes: 3, simple: o.simple });
    }
    for (const sx of [-1, 1]) windowAt(b, sx * (W / 2 + 0.01), f * FH + 1.45, 0, 1.0, 1.1, sx * Math.PI / 2, { frame, lit: R() < lit * 0.6 ? 2.0 : 0, cell: 1, simple: o.simple });
    windowAt(b, 0, f * FH + 1.45, -D / 2 - 0.01, 1.0, 1.1, Math.PI, { frame, lit: R() < lit * 0.5 ? 2.0 : 0, cell: 1, simple: true });
  }
  const top = F * FH, rise = 1.1;
  b.add(gableEnds(W, D, rise, 0.2).translate(0, top, 0), "plaster", 0xf2f0ea);
  b.add(gableRoof(W, D, rise, 0.55, 0.06), "tin", roof, mat4(0, top, 0));
  if ((o.snow ?? 0.5) > R()) { const sw = W * (0.2 + R() * 0.25); b.add(gableRoof(sw, D * 0.9, rise, 0.3, 0.05), "snow", 0xffffff, mat4((R() < 0.5 ? -1 : 1) * (W - sw) * 0.45, top + 0.07, 0), false); }
  b.add(cyl(0.12, 0.12, 1.4, 8), "metal", 0x3a3a3a, mat4(W * 0.3, top + 1.1, -D * 0.2), false);
  b.pop();
  k.foot(x, z, W + 1.4, D + 2.2, yaw, gmin, top + 2);
  return { floorY: y0, top: y0 + top, w: W, d: D };
}
