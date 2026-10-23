import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { SceneKit } from "./kit/scene";
import { Ground, fbm, polyDist, smooth } from "./kit/ground";
import { Grass } from "./kit/grass";
import { Trees, type TreeAt, type Species } from "./kit/trees";
import { box, boxB, cyl, cylB, hipRoof, mat4, rockGeo, sphere, catenary, type Batch } from "./kit/geo";
import { rccBlock } from "./kit/build";
import { mirrorWater, reflect } from "./kit/mirror";
import { mountains } from "./kit/mountains";
import { demBackdrop } from "./kit/dem";
import { cityLights } from "./kit/lights";
import { makeGlider } from "./kit/glider";
import { signBoard } from "./kit/sign";
import { prayerFlags } from "./kit/flags";
import { hash, rng } from "./kit/tex";

/* Phewa Lake at night from Lakeside: the paved promenade and ghats, rows of colourful wooden doongas, hotels and
   cafés with warm windows and string lights, the Tal Barahi island temple, Sarangkot's forested ridge with village
   lights, Rani Ban and the World Peace Pagoda to the south-west, Machhapuchhre and the Annapurnas under the moon,
   all mirrored in the still lake. The hero glides in and lands on the lakeside lawn. North is -z. */

const shoreX = (z: number) => 2 + 4 * Math.sin(z / 45) + 1.6 * Math.sin(z / 13);
const inLake = (x: number, z: number) => x < shoreX(z) && z > -520 && x > -1400;
const PROM: [number, number][] = [];
for (let z = -200; z <= 200; z += 8) PROM.push([shoreX(z) + 3.2, z]);
const ROAD: [number, number][] = [[30, -260], [29, -100], [27, 0], [29, 120], [32, 260]];
const STAND: V3 = [2.6, height(2.6, -19.5), -19.5];

function height(x: number, z: number) {
  const d = x - shoreX(z);
  if (inLake(x, z)) return -2.5 - Math.min(6, Math.max(0, -d) * 0.08);
  const land = 1.15 + Math.max(0, d - 6) * 0.012 + (fbm(x * 0.02, z * 0.02, 3, 4) - 0.5) * 0.6 * smooth(40, 120, d);
  return d < 0.6 ? THREE.MathUtils.lerp(-2.5, 1.15, smooth(-0.5, 0.6, d)) : land;
}

/** a doonga: pointed wooden rowing boat, outer hull + painted inside + gunwale + thwarts, local +z = bow */
function doonga(b: Batch, x: number, y: number, z: number, ry: number, hull: number, inside: number, rim: number, L = 6.2, W = 1.15, lite = false) {
  const ns = 10, np = 5, outer: number[] = [], inner: number[] = [], idx: number[] = [], idxIn: number[] = [];
  for (let i = 0; i < ns; i++) {
    const t = i / (ns - 1), zz = (t - 0.5) * L, w = (W / 2) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(zz) / (L / 2), 2)), 0.55) + 0.01, h = 0.48 + 0.2 * Math.pow(Math.abs(zz) / (L / 2), 2.2);
    for (let j = 0; j < np; j++) { const a = (j / (np - 1)) * Math.PI, px = -Math.cos(a) * w, py = h - Math.sin(a) * h * (0.95 - 0.25 * Math.abs(zz) / (L / 2)); outer.push(px, py, zz); inner.push(px * 0.9, Math.max(py + 0.06, 0.08), zz * 0.97); }
  }
  for (let i = 0; i < ns - 1; i++) for (let j = 0; j < np - 1; j++) { const a = i * np + j, bb = a + 1, c = a + np, d = c + 1; idx.push(a, c, bb, bb, c, d); idxIn.push(a, bb, c, bb, d, c); }
  const mk = (pos: number[], ix: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2)); g.setIndex(ix); g.computeVertexNormals(); return g; };
  b.push(mat4(x, y, z, ry));
  b.add(mk(outer, idx), "paint", hull, undefined, true); b.add(mk(inner, idxIn), "paint", inside, undefined, false);
  if (!lite) for (const sx of [-1, 1]) for (let i = 0; i < ns - 1; i++) { const a = i * np * 3 + (sx < 0 ? 0 : (np - 1) * 3), c = (i + 1) * np * 3 + (sx < 0 ? 0 : (np - 1) * 3); const p0 = new THREE.Vector3(outer[a], outer[a + 1], outer[a + 2]), p1 = new THREE.Vector3(outer[c], outer[c + 1], outer[c + 2]); const mid = p0.clone().add(p1).multiplyScalar(0.5), len = p0.distanceTo(p1); const gg = box(0.07, 0.07, len + 0.02); gg.lookAt(p1.clone().sub(p0)); b.add(gg, "wood", rim, mat4(mid.x, mid.y + 0.02, mid.z), false); }
  for (const zz of [-1.6, -0.2, 1.3]) { const w = (W / 2) * Math.pow(1 - Math.pow(Math.abs(zz) / (L / 2), 2), 0.55); b.add(box(w * 1.8, 0.05, 0.28), "wood", rim, mat4(0, 0.4, zz), false); }
  b.pop();
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = new SceneKit(ctx, "pokhara"), b = k.b, rb = k.rb, m = k.mats, R = rng(57), H = height;

  /* ---------- ground: lake bed, ghats, lakeside lawns, the town ---------- */
  const ground = new Ground({
    inner: 110, cell: 2, outer: 1000, outerCell: 25, height: H, layers: ["turf", "dirt", "sand", "flagstone"],
    splat(x, z) {
      const d = x - shoreX(z), prom = d > 0.6 && d < 6 ? 1 : 0, road = polyDist(x, z, ROAD) < 4.5 ? 1 : 0, town = d > 22 ? 1 : 0, bed = d < 0.6 ? 1 : 0;
      return [Math.max(0, 1 - prom - road - town - bed), town * 0.6, bed, Math.max(prom, road, town * 0.4)];
    },
    tint(x, z) { const n = fbm(x * 0.05, z * 0.05, 3, 6); return new THREE.Color(1.0 + n * 0.25, 1.0 + n * 0.25, 0.96 + n * 0.2); },
  }, m);
  k.group.add(ground.group);

  /* ---------- the lake: one big planar mirror ---------- */
  mirrorWater(k, new THREE.PlaneGeometry(3300, 4000).rotateX(-Math.PI / 2).translate(-1050, 0, -500), 0, { color: 0x07121c, res: 0.45, distort: 0.008, scale: 9, flow: [0.006, 0.003], glint: 1.2, sky: { zenith: 0x0a1630, horizon: 0x2a3c64 } });

  /* ---------- Sarangkot, Rani Ban and the Annapurna range from real elevation data ---------- */
  const dem = await demBackdrop(k, {
    ll: [83.9586, 28.2096], base: [83.9455, 28.2135], reflect: true, flat: 6,
    bands: [[1300, 0], [6000, 10], [18000, 10], [27000, 10], [36000, 26], [48000, 8], [70000, 4]],
    sectors: [{ az0: -60, az1: -10, step: 0.5 }, { az0: -10, az1: 8, step: 0.18 }, { az0: 8, az1: 75, step: 0.5 }, { az0: 75, az1: 300, step: 2.25 }],
    tiles: [{ z: 9, r: 72 }, { z: 11, r: 7 }, { z: 10, at: [83.95, 28.53], r: 18 }, { z: 12, at: [83.949, 28.495], r: 3 }],
    snow: 4700, tree: 3700, haze: { color: 0x1a2848, dist: 70000, max: 0.4 },
  });
  const ridgeLights: V3[] = [];
  let PG: THREE.Vector3, pgS = 1;
  if (dem) {
    /* Sarangkot and the lakeside villages: lights scattered on the real slopes above the water */
    for (let i = 0; i < 420; i++) { const az = -70 + R() * 130, d = 1400 + Math.pow(R(), 1.5) * 5200, p = dem.project(az, d, 3); if (p.y > 6) ridgeLights.push([p.x, p.y, p.z]); }
    PG = dem.at(83.9447, 28.2004, 0); pgS = PG.length() / 1730;
  } else {
    mountains(k, [
      { az: -62, dist: 2250, h: 300, r: 320, ridges: 4, sharp: 1.5, seed: 2 },
      { az: -25, dist: 2120, h: 520, r: 440, ridges: 5, sharp: 1.35, seed: 5, stretch: 1.7, res: 56 },
      { az: -15, dist: 2060, h: 360, r: 330, ridges: 4, sharp: 1.4, seed: 9, stretch: 1.4 },
      { az: 5, dist: 1980, h: 560, r: 320, ridges: 3, sharp: 2.0, seed: 13, res: 64 },
      { az: 10, dist: 1990, h: 470, r: 200, ridges: 3, sharp: 1.9, seed: 14 },
      { az: 19, dist: 2200, h: 500, r: 380, ridges: 4, sharp: 1.4, seed: 17, stretch: 1.8 },
      { az: 29, dist: 2220, h: 470, r: 360, ridges: 4, sharp: 1.4, seed: 21, stretch: 1.7 },
      { az: 39, dist: 2260, h: 520, r: 400, ridges: 4, sharp: 1.4, seed: 23, stretch: 1.8 },
      { az: 52, dist: 2250, h: 380, r: 300, ridges: 4, sharp: 1.5, seed: 29 },
    ], { base: 60, snowline: 0.3, rock: 0x2c2e36, snow: 0xdde5f2, reflect: true,
      ridge: { az0: -40, az1: 60, dist: 2050, depth: 260, seed: 3, h: (az) => 300 + 90 * Math.sin(az * 0.09) + 60 * Math.cos(az * 0.23) },
      band: { dist: 1350, depth: 560, h: (az) => { const a = ((az + 540) % 360) - 180; return Math.abs(a) < 80 ? 190 : 120; }, color: 0x141a18 } });
    /* Sarangkot ridge to the north, Rani Ban to the south-west (forested, no snow) */
    const hills = mountains(k, [
      { az: -14, dist: 900, h: 115, r: 520, ridges: 3, sharp: 1.3, seed: 31, stretch: 2.3, snow: 9 },
      { az: 28, dist: 1050, h: 105, r: 470, ridges: 3, sharp: 1.3, seed: 35, stretch: 2.0, snow: 9 },
      { az: 236, dist: 1150, h: 165, r: 480, ridges: 3, sharp: 1.25, seed: 37, stretch: 1.9, snow: 9 },
      { az: 268, dist: 1350, h: 150, r: 460, ridges: 3, sharp: 1.25, seed: 41, stretch: 1.7, snow: 9 },
    ], { base: -2, rock: 0x121a16, reflect: true });
    void hills;
    for (let i = 0; i < 260; i++) { const az = THREE.MathUtils.degToRad(-40 + R() * 90), d = 700 + R() * 380; ridgeLights.push([Math.sin(az) * d, 20 + R() * 120 * smooth(600, 1000, d), -Math.cos(az) * d]); }
    const pa = THREE.MathUtils.degToRad(234); PG = new THREE.Vector3(Math.sin(pa) * 1050, 140, -Math.cos(pa) * 1050);
  }
  cityLights(k, ridgeLights, { size: dem ? 5.5 : 2.6, intensity: 2.6, reflect: true });
  rb.add(cylB(18 * pgS, 21 * pgS, 8 * pgS, 24), "plaster", 0xeceae4, mat4(PG.x, PG.y, PG.z), false); rb.add(sphere(15 * pgS, 24, 12).scale(1, 0.62, 1), "plaster", 0xf4f2ec, mat4(PG.x, PG.y + 8 * pgS, PG.z), false);
  rb.add(cylB(1.6 * pgS, 2.2 * pgS, 12 * pgS, 10), "gold", 0xe0b048, mat4(PG.x, PG.y + 16 * pgS, PG.z), false);
  m.pool([PG.x + 30 * pgS, PG.y + 10 * pgS, PG.z + 30 * pgS], 60 * pgS, 0xfff0d6, 0.9);

  /* ---------- Tal Barahi island temple ---------- */
  const IX = -120, IZ = -185;
  rb.add(rockGeo(9, 3, 2, 0.32), "rock", 0x5a5650, mat4(IX, -1.2, IZ)); rb.add(boxB(7, 0.6, 7), "flagstone", 0xb8b4ac, mat4(IX, 0.9, IZ));
  rb.add(boxB(4.2, 3.2, 4.2), "brick", 0xffffff, mat4(IX, 1.5, IZ)); rb.add(hipRoof(4.4, 4.4, 1.3, 1.1), "tile", 0x7a3a26, mat4(IX, 4.7, IZ));
  rb.add(boxB(2.8, 1.6, 2.8), "brick", 0xffffff, mat4(IX, 5.7, IZ)); rb.add(hipRoof(2.8, 2.8, 1.1, 0.9), "tile", 0x7a3a26, mat4(IX, 7.3, IZ)); rb.add(cylB(0.12, 0.3, 1.1, 8), "gold", 0xe0b048, mat4(IX, 8.4, IZ));
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; rb.add(new THREE.PlaneGeometry(1, 1.6), "glow", 0xffb060, mat4(IX + Math.sin(a) * 2.12, 2.6, IZ + Math.cos(a) * 2.12, a), false, 2.2); }
  cityLights(k, Array.from({ length: 28 }, (_, i) => [IX + Math.cos(i * 0.224) * 3.4, 1.6, IZ + Math.sin(i * 0.224) * 3.4] as V3), { size: 0.35, intensity: 6, palette: [0xffb050], reflect: true });
  m.pool([IX + 6, 4, IZ + 4], 12, 0xffb060, 1.0);

  /* ---------- the ghats: retaining wall, steps down to the water at the landing ---------- */
  for (let z = -200; z < 200; z += 4) {
    const x0 = shoreX(z) + 0.35, x1 = shoreX(z + 4) + 0.35, len = Math.hypot(x1 - x0, 4), ry = Math.atan2(x1 - x0, 4);
    if (z > -34 && z < -6) { for (let s = 0; s < 6; s++) rb.add(box(0.5, 0.42, len + 0.05), "flagstone", 0xa8a49c, mat4((x0 + x1) / 2 - s * 0.45 - 0.25, 1.05 - s * 0.42, z + 2, ry), false); }
    else rb.add(box(0.6, 3.6, len + 0.05), "stone", 0x8a8680, mat4((x0 + x1) / 2, -0.6, z + 2, ry));
  }

  /* ---------- doongas: a fan of boats at the landing, more moored out on the lake ---------- */
  const PAL: [number, number, number][] = [[0xd8281e, 0xf2c230, 0x1f58c8], [0x1f5ad8, 0xf4ecd8, 0xd8301e], [0x1f9a4a, 0xf2d038, 0xd02a26], [0xf2b81c, 0x1f7ad0, 0xd02a20], [0x16a0b0, 0xf4f0e6, 0x2246b0], [0xd8301e, 0x2a6ad8, 0xf2d038], [0x2a8a3a, 0xd8301e, 0xf2c230]];
  const boats: { x: number; z: number; ry: number; big: boolean }[] = [];
  /* a floating jetty runs out from the ghat; boats tied side by side along it, bows toward the open water (south) */
  const JZ = -29.4, jx0 = shoreX(JZ) - 0.3, jx1 = jx0 - 25;
  rb.add(box(jx0 - jx1, 0.14, 1.5), "wood", 0x5a4632, mat4((jx0 + jx1) / 2, 0.22, JZ), false);
  for (let x = jx0 - 1; x > jx1; x -= 3.2) for (const dz of [-0.7, 0.7]) rb.add(cyl(0.09, 0.09, 1.6, 6), "wood", 0x4a3a2a, mat4(x, -0.9, JZ + dz), false);
  for (let i = 0; i < 14; i++) { const x = jx0 - 1.3 - i * 1.68, z = JZ + 4.6 + (i % 3) * 0.12; boats.push({ x, z, ry: (i - 6.5) * 0.012 + (i % 2 ? 0.02 : -0.02), big: true }); }
  for (let i = 0; i < 8; i++) { const x = jx0 - 2.5 - i * 2.4, z = JZ - 4.6; boats.push({ x, z, ry: Math.PI + 0.04 * Math.sin(i * 2.3), big: true }); }
  for (let i = 0; i < 14; i++) { const x = -40 - R() * 130, z = -150 + R() * 260; if (Math.hypot(x - IX, z - IZ) < 18) continue; boats.push({ x, z, ry: R() * 6.28, big: false }); }
  boats.forEach((bt, i) => { const p = PAL[i % PAL.length]; doonga(rb, bt.x, -0.24, bt.z, bt.ry, p[0], p[2], p[1], bt.big ? 7.4 : 6.2, bt.big ? 1.4 : 1.15, i >= 14); });
  for (let i = 0; i < 14; i++) { const x0 = jx0 - 1.3 - i * 1.68, a = new THREE.Vector3(x0, 0.35, JZ + 1.0), c = new THREE.Vector3(x0 + 0.1, 0.32, JZ + 0.4); rb.add(cyl(0.012, 0.012, a.distanceTo(c), 3).lookAt(c.clone().sub(a)), "matte", 0xc8b890, mat4((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2), false); }
  for (const x of [jx0 - 5, jx0 - 15]) m.pool([x, 3.5, JZ + 4], 11, 0xffc888, 0.9);
  /* a fisherman's lantern out on the water */
  for (const [x, z] of [[-60, -40], [-95, 30], [-130, -10]] as const) { doonga(rb, x, -0.22, z, hash(x, z) * 6, 0x3a5a7a, 0x2a3a4a, 0x8a6a40); rb.add(sphere(0.12, 8, 6), "glow", 0xffb060, mat4(x, 1.1, z), false, 8); m.pool([x, 1.4, z], 6, 0xffb060, 0.8); }
  k.box(jx1 - 1, -1, JZ - 8.6, jx0, 0.6, JZ + 8.6);

  /* ---------- promenade: lamps, benches, big lakeside trees ---------- */
  const trees: TreeAt[] = [];
  for (const z of [...Array.from({ length: 25 }, (_, i) => -190 + i * 16).filter((z2) => Math.abs(z2 + 12) > 6), -4]) {
    const x = shoreX(z) + 5.6, y = H(x, z);
    b.add(cylB(0.07, 0.1, 4, 8), "metal", 0x2a2c30, mat4(x, y, z)); b.add(sphere(0.22, 10, 8), "glow", 0xffd090, mat4(x, y + 4.15, z), false, 5);
    rb.add(sphere(0.3, 6, 4), "glow", 0xffd090, mat4(x, y + 4.15, z), false, 3);
    m.pool([x, y + 3.8, z], 10, 0xffc888, Math.abs(z - 10) < 40 ? 0.9 : 0.6); k.box(x - 0.25, y, z - 0.25, x + 0.25, y + 4.3, z + 0.25);
    if (Math.abs(z + 12) > 14) { b.add(boxB(1.8, 0.45, 0.5), "wood", 0x5a4430, mat4(x + 1.2, y, z + 6, Math.PI / 2)); k.box(x + 0.9, y, z + 5, x + 1.5, y + 0.6, z + 7); }
  }
  for (let z = -180; z <= 180; z += 22 + R() * 14) { const x = shoreX(z) + 9 + R() * 6; if (Math.abs(z - STAND[2]) < 16 && Math.abs(x - STAND[0]) < 12) continue; trees.push({ sp: R() < 0.5 ? "pipal" : "mango", x, y: H(x, z) - 0.1, z, s: 0.8 + R() * 0.3 }); }

  /* ---------- the lakeside strip: hotels, cafés, signboards, string lights ---------- */
  const hotelCol = [0xf4f0e6, 0xf2d8b8, 0xe8c8b0, 0xd8e4ec, 0xf0e2a8, 0xe6d0d8, 0xc8dcc4];
  for (let z = -230; z < 240; z += 13 + R() * 6) {
    for (const side of [-1, 1]) {
      const x = side < 0 ? 22 - R() * 2 : 41 + R() * 4, fl = 2 + Math.floor(R() * 3), w = 9 + R() * 4, d = 8 + R() * 3;
      if (side < 0 && Math.abs(z - STAND[2]) < 26) continue;
      const yaw = side < 0 ? -Math.PI / 2 : -Math.PI / 2;
      rccBlock(k, b, mat4(x, H(x, z), z, yaw), { simple: true, w, d, floors: fl, fh: 3.1, wall: hotelCol[Math.floor(R() * hotelCol.length)], band: 0xf6f4ee, bay: 3.4, lit: 0.55, litCell: 1, litLevel: 2.2, seed: Math.floor(z * 7 + side), win: { perBay: 1, w: 1.4, h: 1.4, sill: 0.9 }, rebar: false, parapet: 1.0 });
      k.foot(x, z, d + 0.4, w + 0.4, 0, H(x, z), fl * 3.1 + 1.5);
      if (R() < 0.35) { const sl: V3[] = []; const top = H(x, z) + fl * 3.1 + 1.6; for (let i = 0; i < 18; i++) sl.push([x + (side < 0 ? -d / 2 : -d / 2) + 0.2, top - Math.sin((i / 17) * Math.PI) * 0.35, z - w / 2 + (w * i) / 17]); cityLights(k, sl, { size: 0.3, intensity: 6, palette: [0xffe0a0, 0xffb060, 0xff7a5a, 0x9ad0ff], reflect: true }); }
    }
  }
  signBoard(k, "pkr-hotel", 4.2, 1.0, "#0e2a4a", [{ t: "LAKE VIEW HOTEL", size: 70, color: "#ffd27a", y: 0.5 }], mat4(17.8, 7.2, -30, -Math.PI / 2), { lit: 0.6 });
  signBoard(k, "pkr-cafe", 3.2, 0.9, "#4a1a12", [{ t: "LAKESIDE CAFÉ", size: 64, color: "#fff0d0", y: 0.5 }], mat4(17.8, 4.0, 50, -Math.PI / 2), { lit: 0.6 });
  signBoard(k, "pkr-boating", 3.6, 1.0, "#f2e8d0", [{ t: "फेवा ताल · डुङ्गा", size: 60, color: "#a01818", y: 0.36, font: "'Kohinoor Devanagari', 'Noto Sans Devanagari', sans-serif" }, { t: "BOATING · PHEWA LAKE", size: 42, color: "#1a3a6a", y: 0.76 }], mat4(shoreX(24) + 4.5, 2.2, 24, -Math.PI / 2 + 0.1), { lit: 0.35 });
  b.add(boxB(0.12, 2.2, 0.12), "wood", 0x5a4430, mat4(shoreX(24) + 4.6, H(shoreX(24) + 4.6, 22.4), 22.4)); b.add(boxB(0.12, 2.2, 0.12), "wood", 0x5a4430, mat4(shoreX(24) + 4.6, H(shoreX(24) + 4.6, 25.6), 25.6));
  k.box(shoreX(24) + 4.3, 0, 22.2, shoreX(24) + 4.9, 3, 25.8);
  /* café terrace near the landing lawn: tables under string lights */
  const CFx = 19, CFz = 26;
  for (const [dx, dz] of [[0, 0], [2.6, 0.4], [-2.2, 1.8], [1.2, 3.2]] as const) { b.add(cylB(0.45, 0.45, 0.05, 12).translate(0, 0.74, 0), "wood", 0x6a4a30, mat4(CFx + dx, H(CFx, CFz), CFz + dz), false); b.add(cylB(0.05, 0.05, 0.74, 6), "metal", 0x2a2c30, mat4(CFx + dx, H(CFx, CFz), CFz + dz), false); k.box(CFx + dx - 0.6, 0, CFz + dz - 0.6, CFx + dx + 0.6, 1, CFz + dz + 0.6); }
  const strP: V3[] = []; for (const [a, c] of [[[CFx - 4, 3.6, CFz - 2], [CFx + 4, 3.6, CFz - 2]], [[CFx - 4, 3.6, CFz + 5], [CFx + 4, 3.6, CFz + 5]], [[CFx - 4, 3.6, CFz - 2], [CFx - 4, 3.6, CFz + 5]]] as [V3, V3][]) catenary(new THREE.Vector3(...a), new THREE.Vector3(...c), 0.4, 16).forEach((p) => strP.push([p.x, p.y + H(CFx, CFz), p.z]));
  cityLights(k, strP, { size: 0.22, intensity: 8, palette: [0xffe0a0, 0xffc070] });
  for (const [x, z] of [[CFx - 4, CFz - 2], [CFx + 4, CFz - 2], [CFx - 4, CFz + 5], [CFx + 4, CFz + 5]] as const) { b.add(cylB(0.05, 0.05, 3.7, 6), "metal", 0x2a2c30, mat4(x, H(x, z), z), false); k.box(x - 0.15, 0, z - 0.15, x + 0.15, 3.8, z + 0.15); }
  k.light("point", [CFx, H(CFx, CFz) + 3.2, CFz + 1.5], 0xffc480, 14, 16);
  k.pose("guest", 61, [CFx + 0.9, H(CFx, CFz), CFz - 0.4], -1.3, "sit"); k.pose("guest", 62, [CFx - 0.9, H(CFx, CFz), CFz + 0.3], 1.4, "sit"); k.pose("local", 63, [CFx + 2.6, H(CFx, CFz), CFz + 1.6], 3.0, "talk");
  /* the landing lawn's prayer-flag line between two trees */
  prayerFlags(k, new THREE.Vector3(shoreX(-24) + 13, 5.5, -24), new THREE.Vector3(shoreX(-44) + 14, 5.0, -44), { sag: 0.9, seed: 4 });

  /* ---------- town lights beyond the strip, the far city to the east ---------- */
  const town: V3[] = []; for (let i = 0; i < 1400; i++) { const x = 55 + Math.pow(R(), 0.8) * 900, z = -500 + R() * 1200; if (Math.hypot(x, z) > 1900) continue; town.push([x, H(x, z) + 1 + R() * 10, z]); }
  cityLights(k, town, { size: 1.4, intensity: 2.6, reflect: true });

  /* ---------- trees on the far shores (merge into dark forest at night) ---------- */
  for (let i = 0; i < 160; i++) { const z = -230 + R() * 470, x = shoreX(z) + 60 + R() * 140; trees.push({ sp: (["pipal", "mango", "sissoo", "palm"] as Species[])[i % 4], x, y: H(x, z) - 0.1, z, s: 0.8 + R() * 0.4 }); }
  const forest = new Trees(m, trees.filter((t) => !k.colliders.some((c) => t.x > c.min.x - 1.5 && t.x < c.max.x + 1.5 && t.z > c.min.z - 1.5 && t.z < c.max.z + 1.5)), { near: 110, centre: [10, 0] });
  k.group.add(forest.group);
  trees.filter((t) => Math.hypot(t.x - 10, t.z) < 60).forEach((t) => k.box(t.x - 0.7, t.y, t.z - 0.7, t.x + 0.7, t.y + 3, t.z + 0.7));

  /* ---------- lawn grass ---------- */
  const blocked = k.blocker(0.4, 0.3);
  const grass = new Grass(m, [
    { density: (x, z) => { const d = x - shoreX(z); if (d < 6.4 || d > 19 || blocked(x, z) || polyDist(x, z, ROAD) < 5) return 0; return 20; }, height: (x, z) => 0.1 + 0.08 * fbm(x * 0.3, z * 0.3, 2, 6), base: 0x587a2e, tip: 0xb0c062, dry: (x, z) => smooth(0.55, 0.78, fbm(x * 0.06, z * 0.06, 3, 4)), dryTip: 0xc0aa6a, width: 0.034, bend: 0.35 },
  ], { area: [-60, -150, 90, 150], ground: H, a: 2.7, levels: 5, maskRes: 512 });
  k.group.add(grass.group); k.onDispose(() => grass.dispose());

  /* ---------- people on the promenade ---------- */
  const promAt = (z: number): V3 => { const x = shoreX(z) + 2.6; return [x, H(x, z), z]; };
  k.walker("local", 64, [-90, -70, -50, -30].map(promAt), { speed: 1.1, pause: 4 });
  k.walker("guest", 65, [40, 60, 90, 120].map(promAt), { speed: 0.9, pause: 6 });
  k.walker("guest", 66, [-120, -100, -80].map(promAt), { speed: 1.0, pause: 5 });
  k.pose("boatman", 67, [shoreX(-30) + 1.4, H(shoreX(-30) + 1.4, -30), -30], -1.6, "idle", [shoreX(-30) - 3, 0.5, -30]);

  /* ---------- paragliders: the hero's wing follows him down and folds on landing; two more circle with LEDs ---------- */
  const heroWing = makeGlider(k, [0xd8302a, 0xf2c41c, 0xd8302a, 0xf4f2ec, 0x2a5ad0]);
  k.group.add(heroWing.root); heroWing.root.visible = false;
  const TD = new THREE.Vector3(9.5, H(9.5, -28), -28), tdHeading = -Math.PI / 2;
  let prev = new THREE.Vector3(...STAND), heading = tdHeading, landed = 0, wasAir = false;
  const tdPos = TD.clone(), tdYaw = { v: tdHeading };
  const other = [makeGlider(k, [0x2a9a5a, 0xf0d040], { lights: true }), makeGlider(k, [0xf28a1c, 0x2a5ad0, 0xf4f2ec], { lights: true })];
  other.forEach((gl, i) => { gl.set(0); gl.root.scale.setScalar(1); k.group.add(gl.root); const pilot = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.7, 2, 6), m.get("matte")); pilot.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pilot.geometry.attributes.position.count * 3).fill(0.15), 3)); pilot.position.y = 0.6; gl.root.add(pilot); void i; });
  k.on((t, dt, f) => {
    other.forEach((gl, i) => { const a = t * (0.05 + i * 0.012) + i * 2.1, r = 140 + i * 60; gl.root.position.set(-160 + Math.cos(a) * r, 150 + i * 70 + Math.sin(t * 0.3 + i) * 6, -120 + Math.sin(a) * r * 0.7); gl.root.rotation.set(0, -a + Math.PI, 0.18); });
    const hp = new THREE.Vector3(...f.heroPos), air = hp.y - H(hp.x, hp.z) > 0.35;
    const mv = hp.clone().sub(prev); mv.y = 0; if (mv.lengthSq() > 1e-5) heading = Math.atan2(mv.x, mv.z); prev.copy(hp);
    if (air) { heroWing.root.visible = true; landed = 0; wasAir = true; heroWing.root.position.copy(hp); heroWing.root.rotation.set(0, heading, Math.sin(t * 0.8) * 0.04); heroWing.set(0); }
    else if (wasAir) {
      /* touchdown: the wing stays where he landed and collapses behind him while he unclips and walks on */
      if (landed === 0) { tdPos.set(hp.x, H(hp.x, hp.z) - 0.02, hp.z); tdYaw.v = heading; }
      landed = Math.min(1, landed + dt / 2.4); heroWing.set(landed); heroWing.root.position.copy(tdPos);
      /* the canopy swings round as it falls and settles across the lawn */
      const e = landed * landed * (3 - 2 * landed); heroWing.root.rotation.set(0, tdYaw.v + (((tdHeading - tdYaw.v + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * e, 0);
    } else { heroWing.root.visible = true; heroWing.set(1); heroWing.root.position.set(TD.x, TD.y - 0.02, TD.z); heroWing.root.rotation.set(0, tdHeading, 0); }
  });
  k.onDispose(() => { heroWing.dispose(); other.forEach((g2) => g2.dispose()); });
  reflect(other[0].root); reflect(other[1].root);

  /* ---------- stand, spawn (in the air, over the lake), paths ---------- */
  const g = (x: number, z: number): V3 => [x, H(x, z), z];
  /* stand shot from a boat just off the ghat, long lens north: the hero, the boat rows, the lake and Machhapuchhre with its reflection */
  const SHOT_CAM: V3 = [-4, 4.4, 6], peak = dem ? dem.at(83.9496, 28.4951) : new THREE.Vector3(-60, 420, -2050);
  const pa2 = Math.atan2(peak.x - SHOT_CAM[0], -(peak.z - SHOT_CAM[2])) + THREE.MathUtils.degToRad(-2.5), pe = Math.atan2(peak.y - SHOT_CAM[1], Math.hypot(peak.x - SHOT_CAM[0], peak.z - SHOT_CAM[2])) * 0.18;
  const shotLook: V3 = [SHOT_CAM[0] + Math.sin(pa2) * 100, SHOT_CAM[1] + Math.tan(pe) * 100, SHOT_CAM[2] - Math.cos(pa2) * 100];
  const glide: V3[] = [[-70, 50, -140], [-42, 36, -108], [-20, 23, -78], [-4, 12, -55], [4.4, 6, -41], [7.8, 2.6, -33], [TD.x, TD.y, TD.z], g(6, -22.5), STAND];
  return k.finish({
    env: { fog: { color: 0x0e1828, near: 160, far: 4600 }, moon: 2.2, skyTint: 0x1a2848 },
    arrival: { cam: [26, 40, 34], look: [-70, 22, -400], fov: 50 },
    spawn: { pos: glide[0], yaw: Math.atan2(glide[1][0] - glide[0][0], glide[1][2] - glide[0][2]) },
    stands: { visit: { pos: STAND, yaw: -0.25, act: "wave", outfit: "paraglider", shot: { cam: SHOT_CAM, look: shotLook, fov: 34 }, bubbleSide: "right" } },
    paths: { "spawn>visit": glide, "visit>exit": [STAND, g(shoreX(-4) + 3.4, -4), ...[10, 40, 80, 130, 180].map((z) => g(shoreX(z) + 3.4, z))] },
  });
}

export default { build };
