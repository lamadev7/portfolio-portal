import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { mat4 } from "./ktm/lib";
import { palette, scooterGeo, streetLamp, distantLights, cityBlock, type Kit } from "./ktm/props";
import { assemble, lin, columns, wallWindows } from "./ktm/arch";
import { People, crowd } from "./ktm/people";
import { newariArt, pagoda, newariHouse, type Art } from "./ktm/newari";
import { kalBhairav } from "./ktm/brand";
import { rng } from "./ktm/tex";

/* Kathmandu Durbar Square (with Bhaktapur's five-tier Nyatapola as the tall landmark): multi-tier pagodas on stepped brick
   plinths, carved struts and windows, red/gold eave trims, the white palace front, the Kal Bhairav shrine, brick paving,
   people and motorbikes. Origin = centre of the square. */

function shrineKal(k: Kit, x: number, z: number) {
  const { b } = k;
  b.box("stone", x, 0, z, 7.4, 0.5, 4.2, 0, { color: 0x6a645a });
  b.box("brick", x, 0.5, z - 1.4, 6.6, 6.4, 1.0, 0, { uv: 2.6, color: 0xa86040 });
  b.quad("atlas", x, 3.4, z - 0.88, 4.6, 5.6, 0, { uv: kalBhairav(k.atlas) });
  b.aabb("wood", x - 2.6, 0.5, z - 0.9, x - 2.3, 6.4, z - 0.6, { color: 0x3a2214 }); b.aabb("wood", x + 2.3, 0.5, z - 0.9, x + 2.6, 6.4, z - 0.6, { color: 0x3a2214 });
  b.hipRoof("roof", x, 6.9, z - 0.6, 8.6, 4.2, 1.4, { uv: 2, color: 0xb87a5a });
  b.box("fabric", x, 6.3, z + 1.45, 8.4, 0.36, 0.03, 0, { color: 0xb3201c }); b.box("gold", x, 6.75, z + 1.5, 8.6, 0.06, 0.05, 0);
  for (let i = -3; i <= 3; i++) b.box("metal", x + i * 1.1, 0.5, z + 1.6, 0.05, 1.1, 0.05, 0, { color: 0x2a2a2a });
  b.tube("metal", [[x - 3.3, 1.55, z + 1.6], [x + 3.3, 1.55, z + 1.6]], 0.03, 5, { color: 0x2a2a2a });
  for (let i = 0; i < 9; i++) b.cyl("glow", x - 2 + i * 0.5, 0.5, z - 0.6, 0.05, 0.05, 0.08, 6, { color: lin(2.2, 1.3, 0.4) });
  b.collide(x - 3.7, 0, z - 2.1, x + 3.7, 6.8, z + 1.8);
  k.pool([x, 2.4, z + 2.2], 6, 0xffa850, 0.9);
}

function shikharaTemple(k: Kit, x: number, z: number, s: number) {
  const { b } = k;
  for (let i = 0; i < 3; i++) b.box("stone", x, i * 0.4 * s, z, (7 - i * 1.2) * s, 0.4 * s, (7 - i * 1.2) * s, 0, { color: 0x8a8476 });
  b.box("stone", x, 1.2 * s, z, 3.6 * s, 3 * s, 3.6 * s, 0, { color: 0x9a9284 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.box("stone", x + sx * 2.1 * s, 1.2 * s, z + sz * 2.1 * s, 0.9 * s, 2.6 * s, 0.9 * s, 0, { color: 0x9a9284 }); b.lathe("stone", [[0, 0], [0.5, 0], [0.35, 1], [0, 1.6]], x + sx * 2.1 * s, 3.8 * s, z + sz * 2.1 * s, 8, { s, color: 0x9a9284 }); }
  const g = new THREE.LatheGeometry([[0, 0], [2.0, 0], [1.9, 2], [1.55, 4], [1.0, 5.5], [0.6, 6.2], [0, 6.5]].map(([r, h]) => new THREE.Vector2(r * s, h * s)), 8);
  b.add("stone", g, mat4(x, 4.2 * s, z, Math.PI / 8), { color: 0x9a9284 }); g.dispose();
  b.lathe("gold", [[0, 0], [0.25, 0], [0, 1.2]], x, 10.6 * s, z, 8, { s });
  b.collide(x - 3.5 * s, 0, z - 3.5 * s, x + 3.5 * s, 11 * s, z + 3.5 * s);
}

function palace(k: Kit, art: Art) {
  const { b } = k, x0 = -46, x1 = 6, z0 = -60, z1 = -42, H = 15;
  b.aabb("paint", x0, 0, z0, x1, H, z1, { color: 0xf0ece2, uv: 4, collide: true });
  b.aabb("paint", x0 - 0.3, H, z0 - 0.3, x1 + 0.3, H + 1.0, z1 + 0.3, { color: 0xe4ddd0 });
  for (let x = x0 + 2; x <= x1 - 2; x += 4) { b.cyl("paint", x, 0, z1 + 0.8, 0.45, 0.5, 9, 14, { color: 0xf4f0e8 }); b.box("paint", x, 9, z1 + 0.8, 1.3, 0.5, 1.3, 0, { color: 0xe4ddd0 }); }
  b.aabb("paint", x0, 9.5, z1, x1, 10.3, z1 + 1.6, { color: 0xe8e2d6 });
  b.collide(x0, 0, z1, x1, 10, z1 + 1.4);
  wallWindows(k, { cx: (x0 + x1) / 2, cz: z1, ry: 0, len: x1 - x0 - 2, y0: 1.4, floors: 3, floorH: 4.4, bay: 4, ww: 1.6, wh: 2.4, frame: 0x8a7a60, seed: 7, lit: 0.55, litColor: lin(1.0, 0.68, 0.32) });
  const pd = new THREE.Shape(); pd.moveTo(-9, 0); pd.lineTo(9, 0); pd.lineTo(0, 3.2); pd.lineTo(-9, 0);
  const pg = new THREE.ExtrudeGeometry(pd, { depth: 1.2, bevelEnabled: false }); b.add("paint", pg, mat4((x0 + x1) / 2, H + 1, z1 - 0.9), { color: 0xf0ece2 }); pg.dispose();
  /* Newari palace wing (east) and Taleju-scale pagoda behind it */
  newariHouse(k, art, 12, -62, 46, -44, 5, "s", 3);
  pagoda(k, art, 30, -76, { steps: 6, stepH: 0.9, base: 22, stepIn: 0.8, body: 9, tiers: 3, tierH: 4.0, roof0: 15, roofStep: 3.6, roofKey: "gold", seed: 21, stairs: false });
}

function surroundings(k: Kit, art: Art) {
  const { b } = k;
  const r = rng(31);
  const row = (fixed: number, a0: number, a1: number, depth: number, front: "n" | "s" | "e" | "w", seed: number) => {
    let a = a0;
    while (a < a1 - 3) {
      const w = Math.min(a1 - a, 6 + r() * 5), fl = 3 + ((r() * 2.6) | 0), pl = r() < 0.3;
      if (front === "e") newariHouse(k, art, fixed - depth, a, fixed, a + w - 0.1, fl, "e", seed++, pl);
      else if (front === "w") newariHouse(k, art, fixed, a, fixed + depth, a + w - 0.1, fl, "w", seed++, pl);
      else if (front === "n") newariHouse(k, art, a, fixed, a + w - 0.1, fixed + depth, fl, "n", seed++, pl);
      else newariHouse(k, art, a, fixed - depth, a + w - 0.1, fixed, fl, "s", seed++, pl);
      a += w;
    }
  };
  row(-50, -38, 46, 12, "e", 100); row(52, -40, 6, 12, "w", 140); row(52, 30, 60, 12, "w", 160);
  row(48, -62, 50, 12, "n", 200); row(-40, -70, -48, 12, "s", 240);
  cityBlock(k, -160, -100, -66, 120, 900, { floors: [3, 6] }); cityBlock(k, 66, -100, 160, 120, 901, { floors: [3, 6] });
  cityBlock(k, -64, 62, 64, 120, 902, { floors: [3, 6] }); cityBlock(k, -64, -140, 64, -96, 903, { floors: [3, 6] });
  distantLights(k, 0, 0, 200, 430, 130, 81);
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = palette(ctx.renderer, { facadeSeed: 71, lit: 0.4 }), { b } = k;
  const art = newariArt(k);
  b.aabb("herring", -70, -0.1, -70, 70, 0, 64, { uv: 6 });
  b.aabb("asphalt", -420, -0.2, -420, 420, -0.05, 420, { uv: 8, color: 0x8a8a8a });
  const maju = pagoda(k, art, -12, -6, { steps: 9, stepH: 0.5, base: 20, stepIn: 0.55, body: 8, tiers: 3, tierH: 3.6, roof0: 14, roofStep: 3.4, seed: 11, lit: 0.4 });
  pagoda(k, art, 12, -20, { steps: 5, stepH: 0.45, base: 12, stepIn: 0.5, body: 5.6, tiers: 3, tierH: 3.0, roof0: 9.6, roofStep: 2.4, seed: 12, lit: 0.4 });
  const nyata = pagoda(k, art, 24, 16, { steps: 5, stepH: 1.3, base: 22, stepIn: 1.5, body: 6.6, tiers: 5, tierH: 2.7, roof0: 12.4, roofStep: 1.9, seed: 13, guardians: true, lit: 0.5, rise: 0.26 });
  pagoda(k, art, -24, -26, { steps: 3, stepH: 0.5, base: 9, stepIn: 0.5, body: 4.6, tiers: 2, tierH: 3.0, roof0: 8, roofStep: 2.2, seed: 14, lit: 0.3 });
  shrineKal(k, -32, 22); shikharaTemple(k, -36, -6, 1);
  palace(k, art); surroundings(k, art);
  b.cyl("stone", 2, 0, 8, 0.5, 0.6, 7.5, 12, { color: 0x6a645a, collide: true }); b.box("stone", 2, 0, 8, 2.2, 0.6, 2.2, 0, { color: 0x6a645a });
  b.box("gold", 2, 7.5, 8, 1.4, 0.3, 1.0, 0); b.cyl("gold", 2, 7.8, 8, 0.25, 0.35, 0.9, 10); b.add("gold", new THREE.SphereGeometry(0.22, 10, 8), mat4(2, 8.9, 8));
  b.collide(0.9, 0, 6.9, 3.1, 8, 9.1);
  /* bell pavilion */
  columns(k, "wood", [[6, -4], [9, -4], [6, -1], [9, -1]], 0.4, 3.2, 0.14, 0x3a2214);
  b.box("stone", 7.5, 0, -2.5, 4.2, 0.4, 4.2, 0, { color: 0x7a746a }); b.hipRoof("roof", 7.5, 3.6, -2.5, 5.2, 5.2, 1.6, { color: 0xb87a5a });
  b.lathe("gold", [[0, 0], [0.5, 0], [0.62, 0.8], [0.5, 1.1], [0, 1.15]], 7.5, 1.9, -2.5, 16);
  b.collide(5.6, 0, -4.4, 9.4, 3.6, -0.6);
  /* lamps, motorbikes */
  for (const [x, z] of [[-6, 14], [8, 14], [-26, 4], [10, 2], [36, -6], [-40, 10], [-4, -28], [40, 34], [-20, 34]] as const) { streetLamp(k, x, z, (x * 13) % 6, { h: 5.5, color: 0xffd8a0, pool: 5 }); b.collide(x - 0.12, 0, z - 0.12, x + 0.12, 5.5, z + 0.12); }
  const sc = [0x8a1f1f, 0x1f3f8a, 0x222222, 0xd8d8d8, 0x3d6b3d];
  for (let i = 0; i < 22; i++) { const g = scooterGeo(sc[i % 5]); b.add("paint", g, mat4(-14 + i * 0.85, 0, 44, Math.PI * 0.5 + Math.sin(i) * 0.15), { uv: 1 }); g.dispose(); }
  for (let i = 0; i < 12; i++) { const g = scooterGeo(sc[(i + 2) % 5]); b.add("paint", g, mat4(36 + Math.sin(i) * 0.2, 0, -36 + i * 0.85, Math.sin(i) * 0.15), { uv: 1 }); g.dispose(); }
  b.collide(-15, 0, 43.2, 5, 1.2, 44.8); b.collide(35.2, 0, -37, 36.8, 1.2, -26);

  /* people: instanced crowd on the open paving + a few rigged characters */
  const r = rng(17), spots: { p: V3; yaw: number }[] = [];
  const free = (x: number, z: number) => !b.colliders.some((c) => x > c.min.x - 0.6 && x < c.max.x + 0.6 && z > c.min.z - 0.6 && z < c.max.z + 0.6);
  for (let i = 0; i < 400 && spots.length < 110; i++) { const x = -40 + r() * 86, z = -36 + r() * 80; if (free(x, z)) spots.push({ p: [x, 0, z], yaw: r() * 6.28 }); }
  crowd(b.group, b.mats.get("fabric")!, "casual", spots, 9, 5);
  const people = new People(ctx);
  await Promise.all([
    people.stand("local", 91, [-6, 0, 20], 0.4, "talk"), people.stand("local", 92, [-5.2, 0, 21.2], -2.6, "idle"), people.stand("trekker", 93, [14, 0, 30], -0.6, "look"),
    people.stand("local", 94, [-30, 0, 26.5], Math.PI, "idle"), people.walk("local", 95, [[-36, 0, 32], [16, 0, 32], [16, 0, 36], [-36, 0, 36]], 1.2, 0.2, "south-lane"),
    people.walk("trekker", 96, [[-0.6, 0, -32], [-0.6, 0, 30], [0.4, 0, 30], [0.4, 0, -32]], 1.1, 0.5, "middle"),
  ]);

  /* warm sodium uplights on the plinths and struts, butter lamps along the bottom steps */
  const lampM: THREE.Matrix4[] = [], lampC: number[] = [], lr = rng(5);
  for (const [cx, cz, top, body, base, step] of [[-12, -6, 4.5, 8, 20, 0.5], [12, -20, 2.25, 5.6, 12, 0.45], [24, 16, 6.5, 6.6, 22, 1.3], [-24, -26, 1.5, 4.6, 9, 0.5]] as const) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) k.pool([cx + dx * (body / 2 + 1.4), top + 0.4, cz + dz * (body / 2 + 1.4)], body * 0.95 + 1.5, 0xffc890, 1.25);
    for (let s2 = 0; s2 < 4; s2++) for (let t = -base / 2 + 0.4; t < base / 2 - 0.3; t += 0.55) {
      if (lr() < 0.35) continue;
      const e = base / 2 - 0.15, x = s2 < 2 ? cx + t : cx + (s2 === 2 ? e : -e), z = s2 < 2 ? cz + (s2 === 0 ? e : -e) : cz + t;
      lampM.push(mat4(x, step + 0.03, z)); lampC.push(lr() < 0.5 ? 0xffb040 : 0xff9020);
    }
  }
  const lg = new THREE.SphereGeometry(0.045, 6, 4); b.inst("glow", lg, lampM, { colors: lampC, cast: false }); lg.dispose();
  k.pool([30, 8, -70], 16, 0xffa850, 1.0); k.pool([-20, 6, -44], 16, 0xffd8a8, 0.8);
  k.pool([0, 3, 30], 14, 0xffc070, 0.7); k.pool([-40, 3, 0], 12, 0xffc070, 0.7);
  const S1 = new THREE.SpotLight(0xffc888, 1800, 110, 0.36, 0.7, 1.6); S1.position.set(8, 2, 14); S1.target.position.set(-12, maju.apex * 0.5, -6);
  const S2 = new THREE.SpotLight(0xffc888, 1800, 110, 0.32, 0.7, 1.6); S2.position.set(6, 2, 34); S2.target.position.set(24, nyata.apex * 0.5, 16);
  const P1 = new THREE.PointLight(0xffa850, 14, 14, 1.6); P1.position.set(-32, 4, 26);
  const P2 = new THREE.PointLight(0xffd8a0, 16, 26, 1.6); P2.position.set(4, 6, 6);
  b.group.add(S1.target, S2.target);
  return assemble({
    id: "durbar", k, people, lights: [S1, S2, P1, P2],
    env: { fog: { color: 0x141a28, near: 90, far: 470 }, moon: 1.05, skyTint: 0x1e2440 },
    arrival: { cam: [62, 50, 84], look: [0, 8, 0], fov: 50 },
    spawn: { pos: [0, 0, 50], yaw: Math.PI },
    stands: { flyby: { pos: [-2, 26, 0], yaw: 0, act: "idle", outfit: "college", shot: { cam: [38, 22, 40], look: [-2, 11, 0], fov: 52 } } },
    paths: {},
  });
}

