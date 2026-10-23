import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { SceneKit } from "./kit/scene";
import { Ground, fbm, polyDist, smooth } from "./kit/ground";
import { Grass } from "./kit/grass";
import { Tussocks, type TussockAt } from "./kit/tussock";
import { Trees, type TreeAt, type Species } from "./kit/trees";
import { box, boxB, cyl, hipRoof, mat4 } from "./kit/geo";
import { mirrorWater, reflect } from "./kit/mirror";
import { mountains } from "./kit/mountains";
import { cityLights, fire } from "./kit/lights";
import { makeAnimal } from "./kit/animals";
import { rng, hash, canvasTex } from "./kit/tex";
import { demBackdrop } from "./kit/dem";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* Chitwan National Park at the Narayani: a sand beach and riverbank grass below a sal forest edge, tall kans/elephant
   grass with moonlit plumes, a timber machan, dugout canoes, a campfire; a one-horned rhino grazing on the bank and an
   elephant walking the beach. Across the river, Bharatpur's lights and the Narayani bridge; Mahabharat hills and the
   faint Himalaya beyond. North is -z. */

const zR = (x: number) => -92 + 14 * Math.sin(x / 150 + 0.4) + 5 * Math.sin(x / 41);
const HALF = 75;
const TRACK: [number, number][] = [[60, 48], [36, 34], [20, 22], [8, 12], [3, 6], [1.5, 4.5]];
const WEST: [number, number][] = [[1.5, 4.5], [-6, 6], [-24, 8.5], [-50, 9.5], [-90, 9]];

function height(x: number, z: number) {
  const e = z - zR(x) - HALF, ef = -(z - zR(x) + HALF);
  if (e < 0 && ef < 0) return -1.6;
  if (ef >= 0) return Math.min(2.2, -0.3 + ef * 0.06) + (fbm(x * 0.02, z * 0.02, 2, 3) - 0.5) * 0.6 * smooth(10, 40, ef);
  const beach = -0.35 + e * 0.07;
  const land = 0.75 + (fbm(x * 0.03, z * 0.03, 3, 1) - 0.5) * 0.8 + 0.6 * smooth(40, 90, e);
  return e < 12 ? beach : e < 16 ? THREE.MathUtils.lerp(beach, land, smooth(12, 16, e)) : land;
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = new SceneKit(ctx, "chitwan"), b = k.b, m = k.mats, R = rng(21), H = height;
  const bankE = (x: number, z: number) => z - zR(x) - HALF;

  /* ---------- ground ---------- */
  const ground = new Ground({
    inner: 100, cell: 2, outer: 1000, outerCell: 20, height: H, layers: ["turf", "dirt", "sand", "mud"],
    splat(x, z, h) {
      const e = bankE(x, z), sand = e < 13.5 && h < 1.2 ? 1 : 0, dt = Math.min(polyDist(x, z, TRACK), polyDist(x, z, WEST));
      const dirt = (1 - smooth(0.8, 2.0, dt)) * (1 - sand) + (fbm(x * 0.1, z * 0.1, 2, 4) > 0.64 ? 0.4 : 0);
      const mud = e < 2 && e > -2 ? 0.6 : 0;
      return [Math.max(0, 1 - sand - dirt - mud), dirt, sand, mud];
    },
    tint(x, z) { const n = fbm(x * 0.05, z * 0.05, 3, 6), e = bankE(x, z), s2 = e < 13.5 ? 0.62 + 0.2 * smooth(0, 10, e) : 1; return new THREE.Color((1.0 + n * 0.3) * s2, (1.0 + n * 0.3) * s2, (0.95 + n * 0.25) * s2); },
  }, m);
  k.group.add(ground.group);

  /* ---------- the Narayani: planar-reflecting river ---------- */
  const riverGeo = new THREE.PlaneGeometry(2400, 260, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -95);
  mirrorWater(k, riverGeo, -0.12, { color: 0x04090c, res: 0.5, distort: 0.03, scale: 9, flow: [0.02, 0.004], sky: { zenith: 0x03060f, horizon: 0x16223c } });

  /* ---------- far bank: Bharatpur lights, bank-side buildings, the bridge ---------- */
  const lightsPts: V3[] = [];
  for (let i = 0; i < 1500; i++) {
    const x = -1100 + R() * 2200, z = zR(x) - HALF - 12 - Math.pow(R(), 1.6) * 900;
    if (Math.hypot(x, z) > 2150) continue;
    const dense = smooth(-700, -200, x) * (1 - smooth(500, 900, x));
    if (R() > 0.25 + 0.75 * dense) continue;
    lightsPts.push([x, H(x, z) + 1 + R() * (z > zR(x) - 300 ? 9 : 4), z]);
  }
  /* bank-side houses and hotels: facades with warm lit windows (one atlas, one merged draw, mirrored in the river) */
  const facade = (lit: boolean) => canvasTex(lit ? "bankFacadeE" : "bankFacadeA", 256, 256, (g) => {
    g.fillStyle = lit ? "#000" : "#3a342e"; g.fillRect(0, 0, 256, 256);
    for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
      const on = hash(cx * 7 + 3, cy * 5 + 1) < 0.42, warm = hash(cx, cy + 9) < 0.8;
      g.fillStyle = on ? (warm ? (lit ? "#ffb868" : "#e8b070") : lit ? "#b8d0ff" : "#c8d8f0") : lit ? "#000" : "#15171b";
      g.fillRect(cx * 64 + 16, cy * 64 + 18, 30, 28);
      if (!lit) { g.fillStyle = "#4a443c"; g.fillRect(cx * 64 + 12, cy * 64 + 46, 38, 4); }
    }
  }, true);
  const houses: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 160; i++) {
    const x = -600 + R() * 1200, z = zR(x) - HALF - 10 - R() * 140, w = 6 + R() * 10, d = 6 + R() * 8, hh = 4 + Math.floor(R() * 4) * 3;
    const g = new THREE.BoxGeometry(w, hh, d).toNonIndexed(), uv = g.attributes.uv as THREE.BufferAttribute, sh = R() * 4;
    for (let f = 0; f < 6; f++) for (let v = 0; v < 6; v++) {
      const q = f * 6 + v, fw = f < 2 ? d : w;
      if (f === 2 || f === 3) uv.setXY(q, 0.02, 0.02); else uv.setXY(q, uv.getX(q) * (fw / 13.6) + sh, uv.getY(q) * (hh / 12));
    }
    g.translate(0, hh / 2, 0); g.rotateY((R() - 0.5) * 0.4); g.translate(x, H(x, z), z); g.deleteAttribute("normal"); g.computeVertexNormals(); houses.push(g);
  }
  const fac = facade(false), facE = facade(true); [fac, facE].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  const town = new THREE.Mesh(mergeGeometries(houses)!, k.mats.own(new THREE.MeshStandardMaterial({ map: fac, emissiveMap: facE, emissive: 0xffffff, emissiveIntensity: 1.8, roughness: 0.9 })));
  houses.forEach((g) => g.dispose()); town.castShadow = town.receiveShadow = false; k.group.add(town); reflect(town);
  cityLights(k, lightsPts, { size: 1.3, intensity: 2.6, reflect: true });
  /* Narayani bridge far west: deck, piers, lamp row */
  const bx = -380, bz0 = zR(bx) + HALF + 8, bz1 = zR(bx) - HALF - 8, bridge = new THREE.Group();
  const deck = new THREE.Mesh(box(12, 1.2, bz0 - bz1).translate(bx, 9, (bz0 + bz1) / 2), m.get("concrete")); bridge.add(deck);
  for (let i = 0; i <= 6; i++) { const z = bz1 + ((bz0 - bz1) * i) / 6; bridge.add(new THREE.Mesh(boxB(3, 10, 3).translate(bx, -2, z), m.get("concrete"))); }
  bridge.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) mm.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(mm.geometry.attributes.position.count * 3).fill(0.55), 3)); });
  k.group.add(reflect(bridge));
  const bl: V3[] = []; for (let i = 0; i <= 18; i++) { const z = bz1 + ((bz0 - bz1) * i) / 18; bl.push([bx - 5.5, 12.5, z], [bx + 5.5, 12.5, z]); }
  cityLights(k, bl, { size: 3.2, intensity: 5, palette: [0xffb050, 0xffc070], reflect: true });

  /* ---------- the Mahabharat range north across the river, the Churia hills south, from real elevation data ---------- */
  const dem = await demBackdrop(k, {
    ll: [84.49, 27.575], reflect: true,
    bands: [[1300, 0], [6000, 6], [15000, 10], [30000, 14], [60000, 10], [110000, 6]],
    sectors: [{ az0: -90, az1: 90, step: 0.75 }, { az0: 90, az1: 270, step: 1.2 }],
    tiles: [{ z: 7, r: 110 }, { z: 9, r: 40 }, { z: 10, r: 15 }],
    snow: 4800, tree: 3600, haze: { color: 0x2c3858, dist: 22000, max: 0.65 }, colors: { forest: 0x1e2a1c },
  });
  if (!dem) {
    mountains(k, [
      { az: -12, dist: 2050, h: 210, r: 520, ridges: 5, sharp: 1.5, seed: 3, stretch: 1.6 },
      { az: 8, dist: 2100, h: 240, r: 480, ridges: 4, sharp: 1.7, seed: 7, stretch: 1.4 },
      { az: 26, dist: 2080, h: 190, r: 460, ridges: 5, sharp: 1.6, seed: 11, stretch: 1.5 },
    ], { base: 60, snowline: 0.35, rock: 0x2a2c34, snow: 0xc8d4e8, reflect: true,
      band: { dist: 1250, depth: 520, h: (az) => { const a = ((az + 540) % 360) - 180; return Math.abs(a) < 100 ? 120 + 90 * Math.cos(a * Math.PI / 200) : 40; }, color: 0x161c1c } });
  }

  /* ---------- machan (watchtower) ---------- */
  const MX = -17, MZ = -1.5, my = H(MX, MZ), PH = 4.4;
  b.push(mat4(MX, my, MZ, 0.3));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.add(cyl(0.09, 0.12, PH + 2.6, 7).translate(0, (PH + 2.6) / 2, 0), "bark", 0x8a7a64, mat4(sx * 1.35, -0.2, sz * 1.35, 0, -sz * 0.04, sx * 0.04)); }
  for (const [ax, az, ry] of [[0, 1.35, 0], [0, -1.35, 0], [1.35, 0, Math.PI / 2], [-1.35, 0, Math.PI / 2]] as const) {
    b.add(cyl(0.04, 0.04, 3.6, 5), "bark", 0x7a6a54, mat4(ax, PH / 2, az, ry, 0, 0.88), false); b.add(cyl(0.04, 0.04, 3.6, 5), "bark", 0x7a6a54, mat4(ax, PH / 2, az, ry, 0, -0.88), false);
  }
  b.add(boxB(3.1, 0.14, 3.1), "wood", 0x7a5c40, mat4(0, PH, 0));
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; b.add(box(3.0, 0.06, 0.06), "bark", 0x8a7a64, mat4(Math.sin(a) * 1.5, PH + 0.95, Math.cos(a) * 1.5, a), false); b.add(box(3.0, 0.05, 0.05), "bark", 0x8a7a64, mat4(Math.sin(a) * 1.5, PH + 0.5, Math.cos(a) * 1.5, a), false); }
  b.add(hipRoof(2.9, 2.9, 1.3, 0.55), "thatch", 0xb8945c, mat4(0, PH + 2.35, 0));
  for (let i = 0; i < 12; i++) b.add(box(0.7, 0.05, 0.07), "bark", 0x7a6a54, mat4(0, 0.3 + i * 0.37, 1.95, 0, -0.32), false);
  for (const sx of [-1, 1]) b.add(cyl(0.04, 0.04, 4.8, 5), "bark", 0x7a6a54, mat4(sx * 0.35, 2.25, 2.33, 0, -0.32), false);
  b.add(cyl(0.005, 0.005, 0.5, 3), "matte", 0x222222, mat4(0, PH + 2.0, 0), false); b.add(cyl(0.09, 0.09, 0.2, 8), "glow", 0xffc070, mat4(0, PH + 1.65, 0), false, 6);
  b.pop();
  k.light("point", [MX, my + PH + 1.6, MZ], 0xffb868, 7, 12);
  m.pool([MX, my + PH + 1.4, MZ], 6, 0xffb868, 1.2);
  k.foot(MX, MZ, 3.4, 4.6, 0.3, my, PH + 4);

  /* ---------- dugout canoes on the sand, a few paddles ---------- */
  const canoes: [number, number, number][] = [[-27, -8.5, 0.2], [-30, -9.3, -0.1], [-23.5, -9.8, 0.35]];
  for (const [x, z, ry] of canoes) {
    const g = new THREE.LatheGeometry([[0, -3], [0.24, -2.4], [0.38, -1.2], [0.42, 0], [0.38, 1.2], [0.24, 2.4], [0, 3]].map(([r, h2]) => new THREE.Vector2(r, h2)), 14, 0, Math.PI);
    g.rotateX(Math.PI / 2); g.rotateZ(-Math.PI / 2);
    b.add(g, "wood", 0x5a4430, mat4(x, H(x, z) + 0.4, z, ry), true);
    b.add(box(0.06, 0.04, 1.4), "wood", 0x7a5a3a, mat4(x + 0.5, H(x, z) + 0.05, z + 0.6, ry + 0.5), false);
  }
  canoes.forEach(([x, z, ry]) => k.foot(x, z, 1.0, 6.2, ry, H(x, z), 0.9));

  /* ---------- campfire with logs to sit on ---------- */
  const FX = 5.4, FZ = 1.4, fy = H(FX, FZ);
  fire(k, [FX, fy, FZ]);
  for (const [dx, dz, ry] of [[-1.8, 0.4, 1.4], [0.6, -1.9, 0.2], [1.9, 0.8, -1.2]] as const) b.add(cyl(0.2, 0.22, 1.7, 8), "bark", 0x5e4a36, mat4(FX + dx, fy + 0.18, FZ + dz, ry, 0, Math.PI / 2));
  k.box(FX - 0.8, fy, FZ - 0.8, FX + 0.8, fy + 0.6, FZ + 0.8);
  k.pose("local", 31, [FX + 0.6, fy + 0.25, FZ - 2.5], 0.1, "sit", [FX, fy + 0.5, FZ]);
  k.pose("local", 32, [FX + 2.5, fy + 0.25, FZ + 0.9], -1.6, "sit", [FX, fy + 0.5, FZ]);
  k.pose("trekker", 33, [FX - 2.6, fy, FZ + 0.6], 1.5, "talk", [FX, fy + 0.5, FZ]);
  k.pose("local", 34, [MX + 2.2, H(MX + 2.2, MZ + 1.8), MZ + 1.8], -0.6, "look", [-7, 1, -3]);

  /* ---------- forest: sal edge to the south, scattered simal / sissoo in the grassland, far bank trees ---------- */
  const trees: TreeAt[] = [], add = (sp: Species, x: number, z: number, s = 1) => trees.push({ sp, x, y: H(x, z) - 0.15, z, s });
  for (let i = 0; i < 520; i++) { const x = -420 + R() * 840, z = 36 + Math.pow(R(), 0.7) * 300 + 8 * Math.sin(x / 30); if (polyDist(x, z, TRACK) < 4) continue; add(R() < 0.82 ? "sal" : R() < 0.5 ? "sissoo" : "mango", x, z, 0.8 + R() * 0.45); }
  for (let i = 0; i < 26; i++) { const x = -120 + R() * 240, z = 14 + R() * 22; if (polyDist(x, z, TRACK) < 5 || polyDist(x, z, WEST) < 5 || Math.hypot(x - 4, z - 10) < 16) continue; add(R() < 0.5 ? "sissoo" : "pipal", x, z, 0.6 + R() * 0.4); }
  for (let i = 0; i < 260; i++) { const x = -900 + R() * 1800, z = zR(x) - HALF - 14 - R() * 60; if (x > -650 && x < 820 && R() < 0.7) continue; add(R() < 0.6 ? "sal" : "mango", x, z, 0.8 + R() * 0.4); }
  const forest = new Trees(m, trees, { near: 110, centre: [0, 0] });
  k.group.add(forest.group);
  trees.filter((t) => Math.hypot(t.x, t.z) < 80).forEach((t) => k.box(t.x - 0.6, t.y, t.z - 0.6, t.x + 0.6, t.y + 3, t.z + 0.6));

  /* ---------- elephant grass (kans) with moonlit plumes, riverbank reeds ---------- */
  const clear = (x: number, z: number) => Math.hypot(x - 1.5, z - 4.5) < 7 || Math.hypot(x + 10, z - 20) < 17 || Math.hypot(x + 9, z + 2) < 10 || Math.hypot(x - FX, z - FZ) < 6 || Math.hypot(x - MX, z - MZ) < 5 || polyDist(x, z, TRACK) < 2.4 || polyDist(x, z, WEST) < 2.4;
  const kans: TussockAt[] = [], reeds: TussockAt[] = [];
  for (let i = 0; i < 14000; i++) {
    const x = -200 + R() * 400, z = -20 + R() * 80, e = bankE(x, z);
    if (e < 15 || e > 62 || clear(x, z) || k.colliders.some((c) => x > c.min.x - 1 && x < c.max.x + 1 && z > c.min.z - 1 && z < c.max.z + 1)) continue;
    const patch = fbm(x * 0.04, z * 0.04, 3, 12); if (patch < 0.38) continue;
    kans.push({ x, y: H(x, z) - 0.05, z, h: 2.0 + 1.8 * smooth(0.45, 0.8, patch) * (0.7 + R() * 0.6), w: 1.5 + R() * 0.8, tint: new THREE.Color().setHSL(0.16 + R() * 0.04, 0.25, 0.55 + R() * 0.2).getHex() });
  }
  for (let i = 0; i < 1400; i++) { const x = -260 + R() * 520, z = -30 + R() * 30, e = bankE(x, z); if (e < 9 || e > 16 || clear(x, z)) continue; reeds.push({ x, y: H(x, z) - 0.05, z, h: 0.9 + R() * 0.7, w: 0.8 + R() * 0.4 }); }
  const T1 = new Tussocks(m, "kans", kans, { cell: 45 }), T2 = new Tussocks(m, "reed", reeds, { cell: 60 });
  k.group.add(T1.group, T2.group); k.onDispose(() => { T1.dispose(); T2.dispose(); });

  /* short grazed grass on the banks and clearings */
  const blocked = k.blocker(1.0, 0.3);
  const grass = new Grass(m, [
    { density: (x, z) => { const e = bankE(x, z); if (e < 12.5 || blocked(x, z)) return 0; const dt = Math.min(polyDist(x, z, TRACK), polyDist(x, z, WEST)); return dt < 1.2 ? 2 : e < 15 ? 8 : 20; }, height: (x, z) => 0.14 + 0.16 * fbm(x * 0.2, z * 0.2, 2, 3), base: 0x4a6626, tip: 0xa6b25c, dry: (x, z) => smooth(0.5, 0.72, fbm(x * 0.06, z * 0.06, 3, 9)), dryTip: 0xc4ac6a, width: 0.032, bend: 0.4 },
    { density: (x, z) => { const e = bankE(x, z); return e > 9.5 && e < 14 && !blocked(x, z) ? 7 : 0; }, height: () => 0.45, base: 0x3a5420, tip: 0x92a050, width: 0.03, bend: 0.6 },
  ], { area: [-150, -150, 150, 150], ground: H, a: 3.6, levels: 5, maskRes: 512 });
  k.group.add(grass.group); k.onDispose(() => grass.dispose());

  /* ---------- wildlife ---------- */
  const rhino = makeAnimal(k, "rhino", H, [-9, H(-9, -2.5), -2.5], -1.9);
  rhino.route([[-9, 0, -2.5], [-12.5, 0, -4.2], [-14.5, 0, -1.2], [-10.5, 0, 0.2]].map(([x, , z]) => [x, H(x, z), z] as V3), { speed: 0.35, closed: true, pause: 9, graze: 0.8 });
  const eRoute: V3[] = []; for (let x = -24; x <= 44; x += 8) { const z = zR(x) + HALF + 4.2; eRoute.push([x, H(x, z), z]); }
  const elephant = makeAnimal(k, "elephant", H, eRoute[0], Math.PI / 2);
  elephant.route(eRoute, { speed: 0.95, closed: false, pause: 6 });
  reflect(elephant.root);
  k.on((t, dt) => { rhino.update(t, dt); elephant.update(t, dt); });
  k.onDispose(() => { rhino.dispose(); elephant.dispose(); });
  k.walker("boatman", 35, [[-13, 0, -7.6], [-17, 0, -7.9], [-20, 0, -7.4]].map(([x, , z]) => [x, H(x, z), z] as V3), { speed: 0.8, pause: 5 });

  /* fireflies over the grass */
  const ff = new THREE.BufferGeometry(), fp: number[] = []; for (let i = 0; i < 220; i++) fp.push(-60 + R() * 120, 0.8 + R() * 2.2, -4 + R() * 40);
  ff.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
  const ffm = m.own(new THREE.PointsMaterial({ color: new THREE.Color(0.9, 1.6, 0.6), size: 0.08, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  k.group.add(new THREE.Points(ff, ffm)); const fp0 = fp.slice();
  k.on((t) => { const p = ff.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setXYZ(i, fp0[i * 3] + Math.sin(t * 0.3 + i) * 1.4, fp0[i * 3 + 1] + Math.sin(t * 0.7 + i * 1.7) * 0.4, fp0[i * 3 + 2] + Math.cos(t * 0.25 + i * 0.6) * 1.4); p.needsUpdate = true; ffm.opacity = 0.55 + 0.35 * Math.sin(t * 2.7); });

  const g = (x: number, z: number): V3 => [x, H(x, z), z];
  const stand = g(1.5, 4.5), spawn = g(60, 48);
  void hash;
  return k.finish({
    env: { fog: { color: 0x0e1828, near: 120, far: 4200 }, moon: 3.0, skyTint: 0x1a2848 },
    arrival: { cam: [40, 30, 46], look: [-8, 0, -14], fov: 50 },
    spawn: { pos: spawn, yaw: -2.2 },
    stands: { visit: { pos: stand, yaw: 0.62, act: "point", outfit: "student", shot: { cam: [6.2, 1.55, 11.2], look: [-6, 1.6, -5.5], fov: 50 }, bubbleSide: "right" } },
    paths: {
      "spawn>visit": [spawn, ...TRACK.slice(1).map(([x, z]) => g(x, z))],
      "visit>exit": WEST.map(([x, z]) => g(x, z)),
    },
  });
}

export default { build };
