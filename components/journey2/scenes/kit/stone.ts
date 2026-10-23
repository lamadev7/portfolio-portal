import * as THREE from "three";
import { box, boxB, cylB, lathe, mat4, rockGeo, sphere, type Batch } from "./geo";
import { hash, rng } from "./tex";
import { prayerFlags } from "./flags";
import type { SceneKit } from "./scene";

/* dry-stone work of the hills and the Khumbu: walls with cap slabs and proud stones, stone steps, a prayer-flag
   cairn built stone by stone, a whitewashed chorten */

/** dry-stone wall along a polyline on the ground; returns nothing, adds colliders when `solid` */
export function stoneWall(k: SceneKit, b: Batch, pts: [number, number][], ground: (x: number, z: number) => number, o: { h?: number; t?: number; snow?: boolean; solid?: boolean; seed?: number } = {}) {
  const h = o.h ?? 1.1, t = o.t ?? 0.6, R = rng(o.seed ?? 7);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 2.5));
    for (let s = 0; s < n; s++) {
      const t0 = s / n, t1 = (s + 1) / n, x = ax + (bx - ax) * (t0 + t1) / 2, z = az + (bz - az) * (t0 + t1) / 2, y = ground(x, z), l = L / n + 0.04;
      b.add(boxB(t, h, l), "stone", 0xc8c2b8, mat4(x, y - 0.25, z, ry));
      b.add(box(t + 0.12, 0.12, l), "stone", 0xd4d0c8, mat4(x, y - 0.25 + h + 0.06, z, ry, 0, (R() - 0.5) * 0.06), false);
      if (o.snow) b.add(box(t + 0.04, 0.06, l * 0.9), "snow", 0xffffff, mat4(x, y - 0.25 + h + 0.15, z, ry), false);
      for (let q = 0; q < 3; q++) { const u = (R() - 0.5) * l * 0.9, side = R() < 0.5 ? -1 : 1, yy = y - 0.15 + R() * h * 0.9; b.add(rockGeo(0.12 + R() * 0.1, i * 31 + s * 7 + q, 0, 0.7), "stone", 0xb8b2a8, mat4(x + Math.cos(ry) * side * t * 0.45 + Math.sin(ry) * u, yy, z - Math.sin(ry) * side * t * 0.45 + Math.cos(ry) * u, R() * 6), false); }
      if (o.solid !== false) k.foot(x, z, t, l, ry, y - 0.3, h + 0.2);
    }
  }
}

/** stone stairs climbing from a to b (each step a slab) */
export function stoneSteps(b: Batch, a: THREE.Vector3, c: THREE.Vector3, w = 1.6) {
  const rise = c.y - a.y, run = Math.hypot(c.x - a.x, c.z - a.z), n = Math.max(2, Math.round(Math.abs(rise) / 0.18)), ry = Math.atan2(c.x - a.x, c.z - a.z);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, y = a.y + rise * ((i + 1) / n); b.add(boxB(w, Math.abs(rise) / n + 0.3, run / n + 0.1), "flagstone", 0xa8a49c, mat4(a.x + (c.x - a.x) * t, y - Math.abs(rise) / n - 0.3, a.z + (c.z - a.z) * t, ry + (hash(i, 3) - 0.5) * 0.04)); }
}

/** a small prayer-flag cairn (~1.8 m): a tapering pile of ~90 mixed stones and slabs, a short pole, flag strings
    wrapped tight from the pole down onto the stones and wound round the pile */
export function cairn(k: SceneKit, b: Batch, x: number, y: number, z: number, o: { scale?: number; seed?: number } = {}) {
  const s = o.scale ?? 1, R = rng(o.seed ?? 11), Hh = 1.05 * s, base = 0.8 * s, rAt = (t: number) => base * (1 - t * 0.8);
  const core = rockGeo(base * 0.8, (o.seed ?? 11) + 3, 0, 0.55); core.scale(1, 0.95, 1);
  b.add(core, "stone", 0x6e6a62, mat4(x, y + Hh * 0.28, z), false);
  for (let layer = 0; layer < 9; layer++) {
    const t = layer / 8, r = rAt(t), yy = y + t * Hh, n = Math.max(3, Math.round((r / s) * 14));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + layer * 0.61 + R() * 0.25, rr = r * (0.84 + R() * 0.16), sz = (0.085 + R() * 0.07) * s * (1 - t * 0.3);
      const g = rockGeo(sz, layer * 31 + i + (o.seed ?? 0), 0, 0.5 + R() * 0.25); g.scale(1.25 + R() * 0.5, 0.5 + R() * 0.35, 1 + R() * 0.4);
      const pick = R(), c = new THREE.Color(pick < 0.1 ? 0x9a7e58 : pick < 0.2 ? 0x55524c : 0x8e877c).multiplyScalar(0.72 + R() * 0.42);
      b.add(g, "stone", c, mat4(x + Math.cos(a) * rr, yy + sz * 0.3, z + Math.sin(a) * rr, a + R(), (R() - 0.5) * 0.4, (R() - 0.5) * 0.4), layer < 3);
    }
  }
  /* a carved mani slab leaning on the pile */
  b.add(boxB(0.32 * s, 0.4 * s, 0.05 * s), "stone", 0x6a6660, mat4(x + base * 0.95, y, z + 0.1 * s, 1.2, -0.25), false);
  const top = y + Hh + 0.75 * s;
  b.add(cylB(0.022 * s, 0.03 * s, 0.75 * s + Hh * 0.4, 6), "wood", 0x8a7050, mat4(x, y + Hh * 0.6, z, 0, 0.04, -0.03), false);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + R() * 0.4, tt = 0.35 + R() * 0.4, er = rAt(tt) + 0.05 * s;
    prayerFlags(k, new THREE.Vector3(x + Math.cos(a) * 0.04, top - R() * 0.2 * s, z + Math.sin(a) * 0.04), new THREE.Vector3(x + Math.cos(a) * er, y + tt * Hh, z + Math.sin(a) * er), { sag: 0.05 * s, size: 0.12 * s, gap: 0.015, seed: i + (o.seed ?? 0) });
  }
  for (const [tt, ph] of [[0.62, 0.4]] as const) {
    const r = rAt(tt) + 0.06 * s, n = 8, pts = Array.from({ length: n + 1 }, (_, i) => { const a = ph + (i / n) * Math.PI * 2; return new THREE.Vector3(x + Math.cos(a) * r, y + tt * Hh + 0.05 * s * Math.sin(i * 1.7), z + Math.sin(a) * r); });
    for (let i = 0; i < n; i++) prayerFlags(k, pts[i], pts[i + 1], { sag: 0.02 * s, size: 0.11 * s, gap: 0.012, seed: 40 + i + tt * 10 });
  }
  k.box(x - base, y, z - base, x + base, y + Hh + 0.2, z + base);
}

/** whitewashed chorten: stepped base, dome, harmika with painted eyes band, gilded spire */
export function chorten(k: SceneKit, b: Batch, x: number, y: number, z: number, s = 1) {
  b.add(boxB(3.2 * s, 0.6 * s, 3.2 * s), "stone", 0xb8b2a8, mat4(x, y, z));
  for (let i = 0; i < 3; i++) b.add(boxB((2.6 - i * 0.4) * s, 0.35 * s, (2.6 - i * 0.4) * s), "plaster", 0xf0eee8, mat4(x, y + (0.6 + i * 0.35) * s, z));
  b.add(lathe([[0.95, 0], [1.05, 0.25], [1.0, 0.8], [0.8, 1.15], [0.3, 1.35], [0.01, 1.4]].map(([r, h]) => [r * s, h * s] as [number, number]), 18), "plaster", 0xf4f2ec, mat4(x, y + 1.65 * s, z));
  b.add(boxB(0.6 * s, 0.45 * s, 0.6 * s), "paint", 0xd8c890, mat4(x, y + 2.95 * s, z));
  b.add(lathe([[0.22, 0], [0.2, 0.2], [0.17, 0.4], [0.14, 0.6], [0.11, 0.8], [0.25, 0.9], [0.02, 1.15]].map(([r, h]) => [r * s, h * s] as [number, number]), 10), "gold", 0xd8a840, mat4(x, y + 3.4 * s, z));
  b.add(sphere(0.07 * s, 8, 6), "gold", 0xe0b048, mat4(x, y + 4.6 * s, z), false);
  k.box(x - 1.6 * s, y, z - 1.6 * s, x + 1.6 * s, y + 4.5 * s, z + 1.6 * s);
}
