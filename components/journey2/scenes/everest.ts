import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { SceneKit } from "./kit/scene";
import { Ground, fbm, polyDist, smooth } from "./kit/ground";
import { Grass } from "./kit/grass";
import { Trees, type TreeAt, type Species } from "./kit/trees";
import { boxB, cylB, mat4, rockGeo, sphere } from "./kit/geo";
import { lodge } from "./kit/houses";
import { stoneWall, stoneSteps, cairn, chorten } from "./kit/stone";
import { suspensionBridge } from "./kit/bridge";
import { mountains } from "./kit/mountains";
import { demBackdrop } from "./kit/dem";
import { prayerFlags } from "./kit/flags";
import { cityLights } from "./kit/lights";
import { signBoard } from "./kit/sign";
import { rng } from "./kit/tex";

/* Namche Bazaar, Khumbu, at night under snow light: stone lodges with white walls and green/blue tin roofs stepping
   up a terraced bowl, dry-stone walls and stone steps, a whitewashed chorten, a Hillary-style suspension bridge
   draped in prayer flags across the gorge, porters and trekkers. Above the village a small prayer-flag cairn on a
   knoll, where the hero in mountaineer gear faces Everest over the Nuptse–Lhotse wall, Ama Dablam to the east,
   Thamserku close by. North is -z. */

const GORGE = { e: -92, w: -182 };
const TRAIL: [number, number][] = [[-88, 2], [-72, 6], [-58, 14], [-40, 16], [-22, 8], [-6, -4], [10, -18], [24, -32], [34, -44], [41, -51]];
const STAND_XZ: [number, number] = [41.5, -52];

function height(x: number, z: number) {
  const dg = (x - z) * 0.707;
  let h = 0.42 * Math.max(-110, Math.min(70, dg)) - 0.55 * Math.max(0, dg - 80) - 0.25 * Math.max(0, -dg - 140) + (fbm(x * 0.02, z * 0.02, 4, 3) - 0.5) * 6;
  /* the knoll at the lookout, the Syangboche shoulder beyond */
  h += 4 * Math.exp(-((x - STAND_XZ[0]) ** 2 + (z - STAND_XZ[1]) ** 2) / 260);
  /* the gorge: steep drop west of the village, the far wall climbing toward Kongde */
  const g = smooth(GORGE.e, GORGE.e - 26, x) - smooth(GORGE.w + 20, GORGE.w - 6, x);
  h -= 62 * Math.max(0, g);
  if (x < GORGE.w) h += 0.5 * (GORGE.w - x) + (fbm(x * 0.01, z * 0.01, 3, 8) - 0.5) * 20;
  h -= 0.18 * Math.max(0, z - 110);
  return h;
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = new SceneKit(ctx, "everest"), b = k.b, m = k.mats, R = rng(77), H = height;
  const slope = (x: number, z: number) => Math.hypot(H(x + 1, z) - H(x - 1, z), H(x, z + 1) - H(x, z - 1)) / 2;

  /* ---------- ground: dry turf, trail dirt, rock on steep ground, snow on the flats and shaded slopes ---------- */
  const ground = new Ground({
    inner: 120, cell: 2, outer: 1000, outerCell: 20, height: H, layers: ["dirt", "dirt", "rock", "snow"],
    splat(x, z, h) {
      const sl = slope(x, z), trail = polyDist(x, z, TRAIL) < 1.8 ? 1 : 0, rock = Math.min(1, smooth(0.7, 1.3, sl) + 0.55 * smooth(0.5, 0.68, fbm(x * 0.09, z * 0.09, 3, 7)));
      const snow = (smooth(0.5, 0.64, fbm(x * 0.04, z * 0.04, 3, 5)) * 0.9 + smooth(45, 120, h) * 0.4) * (1 - rock * 0.75) * (1 - trail);
      return [Math.max(0, 1 - trail - rock - snow) * 0.8, trail, rock, snow];
    },
    tint(x, z) { const n = fbm(x * 0.05, z * 0.05, 3, 6); return new THREE.Color(0.74 + n * 0.22, 0.72 + n * 0.2, 0.74 + n * 0.22); },
  }, m);
  k.group.add(ground.group);

  /* ---------- the Khumbu skyline from real elevation data: Kongde, Thamserku, Ama Dablam, Nuptse–Lhotse–Everest ---------- */
  const dem = await demBackdrop(k, {
    /* y = 0 sits at the trail above Namche (Everest View ridge), so the near ridges fall away as they do from there */
    ll: [86.714, 27.8069], base: 3740,
    bands: [[1300, 0], [5000, 6], [12000, 8], [20000, 20], [32000, 28], [50000, 4], [70000, 2]],
    sectors: [{ az0: -60, az1: 20, step: 1.2 }, { az0: 20, az1: 115, step: 0.44 }, { az0: 115, az1: 230, step: 1.5 }, { az0: 230, az1: 300, step: 1.0 }],
    tiles: [{ z: 9, r: 70 }, { z: 11, r: 14 }, { z: 11, at: [86.92, 27.97], r: 7 }, { z: 12, at: [86.8611, 27.8617], r: 3 }, { z: 12, at: [86.925, 27.9881], r: 3 }, { z: 12, at: [86.7883, 27.7867], r: 2.5 }],
    snow: 4900, tree: 4000, haze: { color: 0x1c2a4c, dist: 80000, max: 0.4 }, colors: { forest: 0x2a3424, scrub: 0x45403a, rock: 0x4c4e58 },
  });
  if (!dem) {
    mountains(k, [
      { az: 35, dist: 2250, h: 580, r: 320, ridges: 3, sharp: 1.6, seed: 3, res: 56, stretch: 1.5 },
      { az: 47, dist: 2240, h: 530, r: 300, ridges: 4, sharp: 1.5, seed: 7, stretch: 1.8 },
      { az: 83, dist: 1650, h: 600, r: 230, ridges: 2, sharp: 2.7, seed: 11, stretch: 1.6, res: 64, snow: 0.25 },
      { az: 128, dist: 1350, h: 620, r: 360, ridges: 4, sharp: 1.6, seed: 13, stretch: 1.3, res: 56 },
      { az: 112, dist: 1550, h: 520, r: 320, ridges: 4, sharp: 1.5, seed: 17, stretch: 1.4 },
      { az: -6, dist: 1250, h: 470, r: 360, ridges: 3, sharp: 1.5, seed: 19, stretch: 1.4 },
      { az: 14, dist: 1900, h: 440, r: 260, ridges: 3, sharp: 2.1, seed: 23 },
      { az: 248, dist: 1250, h: 600, r: 420, ridges: 4, sharp: 1.4, seed: 29, stretch: 2.0 },
      { az: 205, dist: 1500, h: 420, r: 380, ridges: 4, sharp: 1.4, seed: 31, stretch: 1.8 },
      { az: 300, dist: 1600, h: 480, r: 380, ridges: 4, sharp: 1.5, seed: 37, stretch: 1.8 },
    ], { base: -70, snowline: 0.28, rock: 0x2e3036, snow: 0xe6ecf6,
      ridge: { az0: 18, az1: 64, dist: 1980, depth: 520, seed: 9, h: (az) => 300 + 70 * Math.sin(az * 0.31) + 40 * Math.sin(az * 0.83 + 1) - 70 * Math.exp(-((az - 35) ** 2) / 18) },
      band: { dist: 1150, depth: 600, h: () => 160, color: 0x1a1c22 } });
  }

  /* ---------- suspension bridge across the gorge (the trail in) ---------- */
  const bE = new THREE.Vector3(GORGE.e - 4, H(GORGE.e - 4, 2) + 0.2, 2), bW = new THREE.Vector3(GORGE.w - 4, H(GORGE.w - 4, -2) + 0.2, -2);
  const deck = suspensionBridge(k, b, bW, bE, { sag: 4.5, width: 1.3, flags: 3 });

  /* ---------- the village: lodges on stone terraces in a bowl, facing south-west down the valley ---------- */
  const lodges: [number, number, number][] = [];
  for (let ring = 0; ring < 4; ring++) for (let i = 0; i < 9 + ring * 2; i++) {
    const a = THREE.MathUtils.degToRad(-30 + (i / (8 + ring * 2)) * 220), r = 30 + ring * 20 + R() * 5;
    const x = -18 + Math.cos(a) * r, z = 18 - Math.sin(a) * r * 0.85;
    if (polyDist(x, z, TRAIL) < 8.5 || Math.hypot(x - STAND_XZ[0], z - STAND_XZ[1]) < 22 || x < GORGE.e + 6) continue;
    if (lodges.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < 13)) continue;
    lodges.push([x, z, -0.785 + (R() - 0.5) * 0.4]);
  }
  let signAt: [number, number, number, number] = [0, -99, 0, 0], signD = Infinity;
  lodges.forEach(([x, z, yaw], i) => {
    const near = Math.hypot(x - STAND_XZ[0], z - STAND_XZ[1]) < 70 || polyDist(x, z, TRAIL) < 20;
    const L = lodge(k, b, x, H, z, yaw, { seed: i * 3 + 1, lit: 0.45, simple: !near, snow: 0.7 });
    const dS = polyDist(x, z, TRAIL); if (dS < signD) { signD = dS; signAt = [x + Math.sin(yaw) * (L.d / 2 + 0.06), L.floorY + 2.95, z + Math.cos(yaw) * (L.d / 2 + 0.06), yaw]; }
    if (i % 3 === 0) m.pool([x + Math.sin(yaw) * 5, L.floorY + 2.4, z + Math.cos(yaw) * 5], 9, 0xffc888, 0.8);
  });
  /* lodges on terraces below the lookout, between the hero and the skyline */
  const sy0 = H(...STAND_XZ);
  for (let i = 0, placed = 0; i < 40 && placed < 7; i++) {
    const brg = THREE.MathUtils.degToRad(40 + R() * 70), d = 22 + R() * 28, x = STAND_XZ[0] + Math.sin(brg) * d, z = STAND_XZ[1] - Math.cos(brg) * d;
    if (H(x, z) > sy0 - 9 || polyDist(x, z, TRAIL) < 9 || k.colliders.some((c) => x > c.min.x - 7 && x < c.max.x + 7 && z > c.min.z - 7 && z < c.max.z + 7)) continue;
    const ly = Math.atan2(STAND_XZ[0] - x, STAND_XZ[1] - z) + (R() - 0.5) * 0.4, L = lodge(k, b, x, H, z, ly, { seed: 200 + i, lit: 0.6, snow: 0.5, roof: [0x3cb066, 0x3a7ee0, 0x46c070][placed % 3] });
    m.pool([x + Math.sin(ly) * 5, L.floorY + 2.6, z + Math.cos(ly) * 5], 9, 0xffc888, 0.8);
    placed++;
  }
  /* the Namche view of the bowl from below: lit windows of more lodges further up the slope */
  const far: V3[] = []; for (let i = 0; i < 160; i++) { const a = R() * Math.PI * 1.2 - 0.6, r = 120 + R() * 140, x = -18 + Math.cos(a) * r, z = 18 - Math.sin(a) * r * 0.85; if (x < GORGE.e + 10) continue; far.push([x, H(x, z) + 1.5 + R() * 4, z]); }
  cityLights(k, far, { size: 0.9, intensity: 3, palette: [0xffc070, 0xffd8a0, 0xfff0d8] });
  signBoard(k, "namche-lodge", 3.6, 0.9, "#1a4a7a", [{ t: "EVEREST VIEW LODGE", size: 58, color: "#ffffff", y: 0.38 }, { t: "& RESTAURANT · NAMCHE", size: 36, color: "#ffd060", y: 0.76 }], mat4(...signAt), { lit: 0.5 });

  /* ---------- stone walls along the trail, stone steps, chorten, mani wall ---------- */
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
    for (const side of [-1, 1]) if ((i + (side > 0 ? 1 : 0)) % 2 === 0) stoneWall(k, b, [[ax + nx * side * 2.6, az + nz * side * 2.6], [bx + nx * side * 2.6, bz + nz * side * 2.6]], H, { h: 1.0, t: 0.6, snow: true, seed: i * 2 + side });
    if (H(bx, bz) - H(ax, az) > 1.2) stoneSteps(b, new THREE.Vector3(ax, H(ax, az), az), new THREE.Vector3(bx, H(bx, bz), bz), 1.8);
  }
  chorten(k, b, 30, H(30, -30) - 0.1, -30, 0.9);
  b.add(boxB(6, 1.1, 1.1), "stone", 0xb0aaa0, mat4(14, H(14, -12) - 0.2, -12, -0.78));
  for (let i = 0; i < 8; i++) b.add(boxB(0.6, 0.45, 0.08), "stone", 0x8a8a90, mat4(14 + Math.cos(0.78) * (-2.6 + i * 0.75), H(14, -12) + 0.9, -12 + Math.sin(0.78) * (-2.6 + i * 0.75) * 1, -0.78, -0.25), false);
  k.foot(14, -12, 6, 1.1, -0.78, H(14, -12), 1.2);

  /* ---------- the lookout knoll: the prayer-flag cairn, a bench, a solar lamp ---------- */
  const sy = H(...STAND_XZ);
  const CX = STAND_XZ[0] + 1.6, CZ = STAND_XZ[1] - 2.8; cairn(k, b, CX, H(CX, CZ) - 0.08, CZ, { scale: 1, seed: 5 });
  for (let i = 0; i < 70; i++) {
    const a = R() * 6.283, r = 2.2 + Math.pow(R(), 0.7) * 14, x = STAND_XZ[0] + Math.cos(a) * r, z = STAND_XZ[1] + Math.sin(a) * r, big = R() < 0.18, sz = big ? 0.35 + R() * 0.5 : 0.08 + R() * 0.16;
    if (Math.hypot(x - STAND_XZ[0], z - STAND_XZ[1]) < 1.6) continue;
    const g = rockGeo(sz, i + 300, 1, 0.55 + R() * 0.2); g.scale(1.2 + R() * 0.4, big ? 0.7 : 0.5, 1 + R() * 0.3);
    b.add(g, "stone", new THREE.Color(0xb4aea4).multiplyScalar(0.8 + R() * 0.4), mat4(x, H(x, z) - sz * 0.25, z, R() * 6), big);
    if (big) k.box(x - sz, H(x, z) - 0.2, z - sz, x + sz, H(x, z) + sz, z + sz);
  }
  const PX = STAND_XZ[0] - 1.2, PZ = STAND_XZ[1] - 4.4, BX = STAND_XZ[0] - 3, BZ = STAND_XZ[1] - 3.5;
  b.add(cylB(0.06, 0.08, 3.4, 6), "wood", 0x7a6048, mat4(PX, H(PX, PZ) - 0.2, PZ));
  b.add(boxB(1.6, 0.45, 0.5), "wood", 0x6a5038, mat4(BX, H(BX, BZ), BZ, 2.5));
  k.foot(BX, BZ, 1.6, 0.5, 2.5, H(BX, BZ) - 0.2, 0.6); k.box(PX - 0.2, H(PX, PZ) - 1, PZ - 0.2, PX + 0.2, H(PX, PZ) + 3.5, PZ + 0.2);
  b.add(sphere(0.12, 8, 6), "glow", 0xfff0d8, mat4(PX, H(PX, PZ) + 3.25, PZ), false, 6);
  k.light("point", [PX + 0.6, H(PX, PZ) + 3.0, PZ + 0.8], 0xffe2bc, 9, 14);
  m.pool([PX + 0.6, H(PX, PZ) + 2.8, PZ + 0.8], 7, 0xffe2bc, 0.7);

  /* ---------- trees: blue pine and fir on the slopes below, juniper and rhododendron scrub ---------- */
  const trees: TreeAt[] = [];
  const add = (sp: Species, x: number, z: number, s = 1) => trees.push({ sp, x, y: H(x, z) - 0.2, z, s });
  for (let i = 0; i < 520; i++) {
    const x = -420 + R() * 760, z = -300 + R() * 640, sl = slope(x, z);
    if (k.colliders.some((c) => x > c.min.x - 2 && x < c.max.x + 2 && z > c.min.z - 2 && z < c.max.z + 2) || polyDist(x, z, TRAIL) < 4 || Math.hypot(x - STAND_XZ[0], z - STAND_XZ[1]) < 16) continue;
    const inBowl = Math.hypot(x + 18, (z - 18) / 0.85) < 110 && x > GORGE.e;
    if (inBowl && R() < 0.85) continue;
    if (sl > 1.6) continue;
    add(H(x, z) < 20 && R() < 0.75 ? (R() < 0.6 ? "pine" : "fir") : R() < 0.5 ? "juniper" : "rhodo", x, z, 0.7 + R() * 0.5);
  }
  const forest = new Trees(m, trees, { near: 70, centre: [10, -10] });
  k.group.add(forest.group);

  /* ---------- dry alpine grass between the snow patches ---------- */
  const blocked = k.blocker(0.5, 0.3);
  const grass = new Grass(m, [
    { density: (x, z) => { if (blocked(x, z) || polyDist(x, z, TRAIL) < 2.2 || slope(x, z) > 1.1) return 0; const sn = smooth(0.45, 0.6, fbm(x * 0.04, z * 0.04, 3, 5)); return 5 * (1 - sn) * smooth(0.4, 0.6, fbm(x * 0.12, z * 0.12, 2, 8)); }, height: (x, z) => 0.1 + 0.1 * fbm(x * 0.2, z * 0.2, 2, 3), base: 0x3e382e, tip: 0x8a7a5c, dry: () => 0.8, dryTip: 0x9a8a6a, width: 0.03, bend: 0.45 },
  ], { area: [-150, -150, 150, 150], ground: H, a: 3.0, levels: 5, maskRes: 512 });
  k.group.add(grass.group); k.onDispose(() => grass.dispose());

  /* ---------- people: porters on the trail, trekkers at the lodges ---------- */
  const tp = (x: number, z: number): V3 => [x, H(x, z), z];
  k.walker("porter", 81, [[-58, 14], [-40, 16], [-22, 8], [-6, -4]].map(([x, z]) => tp(x, z)), { speed: 0.7, pause: 6 });
  k.walker("porter", 82, [[9, -16.6], [23, -30.6], [33, -42.6]].map(([x, z]) => tp(x, z)), { speed: 0.6, pause: 8 });
  k.walker("trekker", 83, [[-30, 12.6], [-14, 2.2], [2, -10.2]].map(([x, z]) => tp(x, z)), { speed: 0.9, pause: 5 });
  k.pose("trekker", 84, tp(STAND_XZ[0] - 3.4, STAND_XZ[1] - 3.1), 2.5, "sit");
  k.pose("local", 85, tp(26.5, -27.5), -0.6, "idle", [30, 2, -30]);

  /* ---------- falling snow, very light ---------- */
  const sn = new THREE.BufferGeometry(), sp: number[] = []; for (let i = 0; i < 900; i++) sp.push(STAND_XZ[0] - 40 + R() * 80, R() * 30, STAND_XZ[1] - 40 + R() * 80);
  sn.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const snm = m.own(new THREE.PointsMaterial({ color: 0xe8eeff, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }));
  const flakes = new THREE.Points(sn, snm); flakes.frustumCulled = false; k.group.add(flakes);
  k.on((t, dt) => { const p = sn.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * (0.5 + (i % 7) * 0.08); if (y < 0) y += 30; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.7 + i) * dt * 0.2); } p.needsUpdate = true; flakes.position.y = sy - 4; });

  const FA = THREE.MathUtils.degToRad(55), facing = Math.atan2(Math.sin(FA), -Math.cos(FA));
  const stand: V3 = [STAND_XZ[0], sy, STAND_XZ[1]];
  const spawn: V3 = [bW.x - 8, H(bW.x - 8, -2), -2];
  const look: V3 = [stand[0] + Math.sin(facing) * 100, sy + 2.6 - Math.tan(THREE.MathUtils.degToRad(2)) * 100, stand[2] + Math.cos(facing) * 100];
  return k.finish({
    env: { fog: { color: 0x101a2c, near: 140, far: 4200 }, moon: 2.4, skyTint: 0x1c2a4c },
    arrival: { cam: [-50, 64, 100], look: [90, 50, -140], fov: 52 },
    spawn: { pos: spawn, yaw: Math.PI / 2 },
    stands: { next: { pos: stand, yaw: facing, act: "look", outfit: "mountaineer", shot: { cam: [stand[0] - Math.sin(facing) * 4.6 - Math.cos(facing) * 1.4, sy + 2.6, stand[2] - Math.cos(facing) * 4.6 + Math.sin(facing) * 1.4], look, fov: 44 }, bubbleSide: "left" } },
    paths: { "spawn>next": [spawn, [bW.x - 1, deck[0][1], bW.z] as V3, ...deck.slice(1, -1) as V3[], [bE.x + 1, deck[deck.length - 1][1], bE.z] as V3, ...TRAIL.map(([x, z]) => tp(x, z)), stand] },
  });
}

export default { build };
