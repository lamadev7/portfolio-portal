import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { SceneKit } from "./kit/scene";
import { Ground, fbm, polyDist, smooth } from "./kit/ground";
import { Grass } from "./kit/grass";
import { Trees, type TreeAt, type Species } from "./kit/trees";
import { box, boxB, cyl, cylB, hipRoof, mat4, tube, wedge } from "./kit/geo";
import { rccBlock, railing, waterTank, windowAt, door } from "./kit/build";
import { stiltHouse, mudHouse, cowshed, haystack, bambooFence } from "./kit/houses";
import { signBoard } from "./kit/sign";
import { stillWater } from "./kit/water";
import { poleFlag, nepalFlagTex } from "./kit/flags";
import { DEVA_FONT, hash, rng } from "./kit/tex";

/* Kalpavriksha Primary School, Sarlahi (Terai). North is -z. Two orange RCC blocks with white column/slab bands face a
   big grass field; a tiled-roof gazebo on a maroon plinth stands in the field. Paddy patchwork, tree lines and village
   houses run out to the horizon all round. */

const ROAD_S: [number, number][] = [[-420, 52], [-150, 49], [-40, 48], [60, 48], [160, 46], [420, 51]];
const ROAD_E: [number, number][] = [[64, -420], [63, -120], [62, -40], [62, 48], [64, 140], [66, 420]];
const TRACK: [number, number][] = [[52, -6], [30, -5], [8, -4.5], [-3, -6.5], [-6, 10], [-9, 30], [-10, 48]];
const SCHOOL = { x0: -46, x1: 52, z0: -48, z1: 44 };

/* paddy blocks: a rotated grid each, outside the compound */
const BLOCKS = [
  { cx: -150, cz: -10, a: 0.05, du: 19, dv: 13, inside: (x: number, z: number) => x < -60 && z > -140 && z < 46 },
  { cx: 150, cz: -40, a: -0.07, du: 16, dv: 21, inside: (x: number, z: number) => x > 72 && z < 44 },
  { cx: 0, cz: 130, a: 0.11, du: 23, dv: 15, inside: (x: number, z: number) => z > 56 },
  { cx: 0, cz: -160, a: -0.03, du: 20, dv: 14, inside: (x: number, z: number) => z < -100 && x > -60 && x < 72 },
];
type Plot = "rice" | "flood" | "fallow" | "mustard" | "none";
function plotAt(x: number, z: number): { kind: Plot; bund: number } {
  for (let bi = 0; bi < BLOCKS.length; bi++) {
    const B = BLOCKS[bi]; if (!B.inside(x, z)) continue;
    const c = Math.cos(B.a), s = Math.sin(B.a), u = (x - B.cx) * c - (z - B.cz) * s, v = (x - B.cx) * s + (z - B.cz) * c;
    const iu = Math.floor(u / B.du), iv = Math.floor(v / B.dv), fu = u - iu * B.du, fv = v - iv * B.dv;
    const bund = Math.min(fu, B.du - fu, fv, B.dv - fv), r = hash(iu + bi * 101, iv * 7 + 3);
    return { kind: r < 0.62 ? "rice" : r < 0.78 ? "flood" : r < 0.9 ? "fallow" : "mustard", bund };
  }
  return { kind: "none", bund: 99 };
}
const VILLAGES: [number, number, number][] = [[-92, -30, 0.3], [-84, 24, -0.2], [96, 18, 0.5], [92, -78, -0.4], [26, -112, 0.1], [-40, 82, 2.9], [130, 90, 0.8], [-140, -95, 0.2]];
const nearVillage = (x: number, z: number) => VILLAGES.reduce((d, v) => Math.min(d, Math.hypot(x - v[0], z - v[1])), 999);

function height(x: number, z: number) {
  const r = Math.max(Math.abs(x - 3) - 49, Math.abs(z + 2) - 46, 0);
  let h = (fbm(x * 0.012, z * 0.012, 3, 5) - 0.5) * 1.2 * smooth(0, 60, r);
  const p = plotAt(x, z); if (p.kind !== "none") h -= 0.12 * smooth(0.2, 1.4, p.bund);
  const dr = Math.min(polyDist(x, z, ROAD_S), polyDist(x, z, ROAD_E));
  h = h * smooth(3, 9, dr) + 0.22 * (1 - smooth(2.6, 4.2, dr));
  return h;
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = new SceneKit(ctx, "sarlahi"), b = k.b, m = k.mats, R = rng(11);
  const H = height;

  /* ---------- ground ---------- */
  const ground = new Ground({
    inner: 96, cell: 2, outer: 900, outerCell: 20, height: H, layers: ["turf", "dirt", "paddy", "concrete"],
    splat(x, z) {
      const dr = Math.min(polyDist(x, z, ROAD_S), polyDist(x, z, ROAD_E)), dt = polyDist(x, z, TRACK);
      const p = plotAt(x, z), inSchool = x > SCHOOL.x0 && x < SCHOOL.x1 && z > SCHOOL.z0 && z < SCHOOL.z1;
      const apron = x > -44 && x < 32 && z > -30 && z < -23.5 ? 1 : 0;
      let dirt = Math.max(1 - smooth(2.5, 4.5, dr), (1 - smooth(0.6, 1.8, dt)) * 0.9, nearVillage(x, z) < 14 ? 0.8 : 0);
      if (p.kind === "fallow") dirt = Math.max(dirt, 0.7);
      const pad = p.kind === "rice" || p.kind === "flood" ? 1 : 0;
      dirt += (fbm(x * 0.15, z * 0.15, 2, 9) > 0.62 && inSchool ? 0.5 : 0);
      return [Math.max(0.05, 1 - dirt - pad - apron), dirt, pad * (1 - dirt), apron];
    },
    tint(x, z) { const n = fbm(x * 0.05, z * 0.05, 3, 2); const c = new THREE.Color(1.05 + n * 0.35, 1.05 + n * 0.32, 0.98 + n * 0.25); return c; },
  }, m);
  k.group.add(ground.group);

  /* ---------- paddy: bunds, flooded plots ---------- */
  const flood: THREE.BufferGeometry[] = [];
  for (const B of BLOCKS) {
    const c = Math.cos(B.a), s = Math.sin(B.a), span = 420;
    for (let iu = -Math.ceil(span / B.du); iu <= Math.ceil(span / B.du); iu++) for (let iv = -Math.ceil(span / B.dv); iv <= Math.ceil(span / B.dv); iv++) {
      const u = iu * B.du + B.du / 2, v = iv * B.dv + B.dv / 2, x = B.cx + u * c + v * s, z = B.cz - u * s + v * c;
      if (Math.hypot(x, z) > 380 || !B.inside(x, z) || plotAt(x, z).kind === "none") continue;
      const near = Math.hypot(x, z) < 220;
      if (near) {
        /* bund along the plot's -u and -v edges */
        const e1 = [B.cx + (u - B.du / 2) * c + v * s, B.cz - (u - B.du / 2) * s + v * c], e2 = [B.cx + u * c + (v - B.dv / 2) * s, B.cz - u * s + (v - B.dv / 2) * c];
        b.add(box(0.55, 0.2, B.dv), "turf", 0xa8a070, mat4(e1[0], H(e1[0], e1[1]) + 0.04, e1[1], -B.a), false);
        b.add(box(B.du, 0.2, 0.55), "turf", 0xa8a070, mat4(e2[0], H(e2[0], e2[1]) + 0.04, e2[1], -B.a), false);
      }
      if (plotAt(x, z).kind === "flood") { const g = new THREE.PlaneGeometry(B.du - 0.7, B.dv - 0.7); g.rotateX(-Math.PI / 2); g.rotateY(-B.a); g.translate(x, H(x, z) + 0.06, z); flood.push(g); }
    }
  }
  if (flood.length) {
    const { mergeGeometries } = await import("three/examples/jsm/utils/BufferGeometryUtils.js");
    const wm = new THREE.Mesh(mergeGeometries(flood)!, stillWater(m, 0x0c1414, { rough: 0.06, scale: 5 })); wm.receiveShadow = true; k.group.add(wm); flood.forEach((g) => g.dispose());
  }

  /* ---------- school block A (west, facade faces south) and B (east, set back, turned a little) ---------- */
  const ORANGE = 0xf08a3c, WHITE = 0xf6f4ee;
  rccBlock(k, b, mat4(-23, 0, -32), { w: 38, d: 10, floors: 2, wall: ORANGE, band: WHITE, bay: 4.2, back: "corridor", lit: 0.28, litCell: 0, litLevel: 2.2, seed: 3, stairBay: 2, doors: [1, 5, 7] });
  k.box(-42.2, 0, -37.2, -3.8, 8.5, -26.8);
  const yawB = -0.1;
  rccBlock(k, b, mat4(15.5, 0, -37, yawB), { w: 34, d: 10, floors: 2, wall: ORANGE, band: WHITE, bay: 4.25, back: "corridor", lit: 0.22, litCell: 0, litLevel: 2.2, seed: 7, doors: [0, 4] });
  k.foot(15.5, -37, 34.4, 10.4, yawB, 0, 8.5);
  /* stair tower / link between the blocks behind the gazebo */
  b.add(boxB(5, 8.6, 8), "plaster", ORANGE, mat4(-1.4, 0, -36)); b.add(boxB(5.3, 0.3, 8.3), "plaster", WHITE, mat4(-1.4, 3.6, -36)); b.add(boxB(5.3, 0.4, 8.3), "plaster", WHITE, mat4(-1.4, 8.6, -36));
  for (const sx of [-1, 1]) b.add(boxB(0.45, 8.6, 0.45), "plaster", WHITE, mat4(-1.4 + sx * 2.5, 0, -32.1));
  windowAt(b, -1.4, 5.6, -31.98, 1.2, 1.4, 0, { frame: WHITE, lit: 2.0, cell: 0 }); door(b, -1.4, 0.45, -31.95, 1.6, 2.3, 0, 0x2d4a6a, WHITE, 0.9);
  k.box(-4.0, 0, -40.1, 1.2, 8.8, -31.8);
  /* front apron (concrete walk) and corridor lights at the back */
  b.add(box(76, 0.08, 4.8), "concrete", 0xb4b0a8, mat4(-6, 0.03, -24.6), false);
  for (let i = 0; i < 9; i++) { const x = -40 + i * 4.6; b.add(box(0.5, 0.06, 0.12), "glow", 0xe8f0ff, mat4(x, 3.5, -38.3), false, 3); b.add(box(0.5, 0.06, 0.12), "glow", 0xe8f0ff, mat4(x, 6.8, -38.3), false, 3); }
  m.pool([-30, 2.6, -39.5], 9, 0xdde6ff, 0.9); m.pool([-14, 2.6, -39.5], 9, 0xdde6ff, 0.9); m.pool([-24, 5.9, -39.5], 9, 0xdde6ff, 0.6);
  /* facade wash from the lit classrooms and the apron lamps */
  m.pool([-31, 2.2, -24.5], 9, 0xe9efff, 0.55); m.pool([-12, 2.2, -24.5], 8, 0xe9efff, 0.5); m.pool([10, 2.2, -29], 9, 0xe9efff, 0.45);

  /* school signboard on block A's front parapet: Nepali above, English below */
  signBoard(k, "kalpavriksha-main", 15, 1.7, "#f6f2e8", [
    { t: "कल्पवृक्ष प्राथमिक विद्यालय", size: 120, color: "#a3161a", y: 0.33, font: DEVA_FONT, weight: "700" },
    { t: "KALPAVRIKSHA PRIMARY SCHOOL", size: 96, color: "#13306a", y: 0.76, weight: "800" },
  ], mat4(-22, 8.05, -26.75), { lit: 0.42, px: 2048, border: "#a3161a" });
  b.add(box(0.1, 0.1, 0.9), "metal", 0x303236, mat4(-28, 9.2, -26.4), false); b.add(box(0.1, 0.1, 0.9), "metal", 0x303236, mat4(-16, 9.2, -26.4), false);
  b.add(box(0.4, 0.14, 0.2), "glow", 0xfff4dc, mat4(-28, 9.15, -25.95), false, 4); b.add(box(0.4, 0.14, 0.2), "glow", 0xfff4dc, mat4(-16, 9.15, -25.95), false, 4);
  m.pool([-22, 9.4, -25.4], 9, 0xfff1d8, 0.9);

  /* ---------- gazebo: maroon plinth with white trim, front stair with sloped cheek walls, 4 columns, tiled hip roof ---------- */
  const GX = -3, GZ = -14, PL = 1.1, PW = 7;
  b.add(boxB(PW, PL - 0.15, PW), "plaster", 0x7c2a22, mat4(GX, 0, GZ)); b.add(boxB(PW + 0.16, 0.15, PW + 0.16), "plaster", WHITE, mat4(GX, PL - 0.15, GZ));
  for (let i = 0; i < 6; i++) b.add(box(2.4, 0.18, 0.32), "concrete", 0xd8d4cc, mat4(GX, PL - 0.18 * (i + 0.5), GZ + PW / 2 + 0.16 + i * 0.32));
  for (const sx of [-1, 1]) b.add(wedge(2.3, PL + 0.35, 0.3, 0.3), "plaster", WHITE, mat4(GX + sx * 1.35, 0, GZ + PW / 2));
  for (const sx of [-1, 1]) b.add(boxB(0.3, 0.6, 0.3), "plaster", WHITE, mat4(GX + sx * 1.35, PL, GZ + PW / 2 - 0.15));
  const CH = 2.7;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = GX + sx * 2.7, cz = GZ + sz * 2.7;
    b.add(boxB(0.62, 0.5, 0.62), "plaster", WHITE, mat4(cx, PL, cz)); b.add(boxB(0.42, CH - 0.8, 0.42), "plaster", 0xe0663a, mat4(cx, PL + 0.5, cz)); b.add(boxB(0.6, 0.3, 0.6), "plaster", WHITE, mat4(cx, PL + CH - 0.3, cz));
  }
  /* ring beam and arched brackets */
  for (const [w, d, x, z] of [[6.2, 0.4, 0, 2.7], [6.2, 0.4, 0, -2.7], [0.4, 6.2, 2.7, 0], [0.4, 6.2, -2.7, 0]] as const) b.add(box(w, 0.42, d), "plaster", WHITE, mat4(GX + x, PL + CH + 0.2, GZ + z));
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2, s = new THREE.Shape(); s.moveTo(-2.5, 0); s.lineTo(2.5, 0); s.lineTo(2.5, -0.9); s.quadraticCurveTo(2.3, -0.25, 1.4, -0.22); s.quadraticCurveTo(0, -0.18, -1.4, -0.22); s.quadraticCurveTo(-2.3, -0.25, -2.5, -0.9); s.lineTo(-2.5, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false }); g.translate(0, 0, -0.11);
    b.add(g, "plaster", WHITE, mat4(GX + Math.sin(a) * 2.7, PL + CH, GZ + Math.cos(a) * 2.7, a));
  }
  b.add(hipRoof(6.2, 6.2, 2.0, 1.0), "tile", 0x8a6048, mat4(GX, PL + CH + 0.42, GZ));
  b.add(box(6.6, 0.12, 0.12).rotateY(Math.PI / 4), "tile", 0x6a4434, mat4(GX, PL + CH + 1.42, GZ, 0, 0, 0.3), false);
  b.add(cylB(0.08, 0.14, 0.7, 8), "metal", 0xb08a40, mat4(GX, PL + CH + 2.35, GZ), false);
  b.add(boxB(4.6, 0.42, 0.45), "concrete", 0xc0bcb4, mat4(GX, PL, GZ - 3.0), false);
  b.add(boxB(0.45, 0.42, 4.6), "concrete", 0xc0bcb4, mat4(GX - 3.0, PL, GZ), false); b.add(boxB(0.45, 0.42, 4.6), "concrete", 0xc0bcb4, mat4(GX + 3.0, PL, GZ), false);
  /* hanging bulb under the roof */
  b.add(cyl(0.006, 0.006, 0.8, 4), "matte", 0x202020, mat4(GX, PL + CH - 0.2, GZ), false); b.add(new THREE.SphereGeometry(0.07, 10, 8), "glow", 0xffd9a0, mat4(GX, PL + CH - 0.62, GZ), false, 9);
  k.light("point", [GX, PL + CH - 0.75, GZ], 0xffc98a, 14, 16);
  m.pool([GX, PL + CH - 0.8, GZ], 7.5, 0xffc98a, 1.3);
  k.box(GX - PW / 2 - 0.1, 0, GZ - PW / 2 - 0.1, GX + PW / 2 + 0.1, PL + 4.6, GZ + PW / 2 + 0.1);
  k.box(GX - 1.6, 0, GZ + PW / 2, GX + 1.6, PL, GZ + PW / 2 + 2.1);

  /* flagpole with Nepal's flag on a small brick base in front of block A */
  b.add(boxB(1.4, 0.5, 1.4), "brick", 0xffffff, mat4(-26, 0, -20)); b.add(boxB(0.9, 0.3, 0.9), "plaster", WHITE, mat4(-26, 0.5, -20));
  poleFlag(k, new THREE.Vector3(-26, 0.8, -20), 7.5, nepalFlagTex(), 1.2, 1.5, -0.4);
  k.box(-26.8, 0, -20.8, -25.2, 8, -19.2);

  /* young saplings with brick tree-guards along the apron (from the photo) */
  for (const x of [-34, -20, 8, 20]) { b.add(cylB(0.5, 0.5, 0.9, 10), "brick", 0xffffff, mat4(x, 0, -21.5)); k.box(x - 0.6, 0, -22.1, x + 0.6, 1, -20.9); }

  /* ---------- neighbouring building (east): plastered lower floors, exposed brick top floor, banner, water tank ---------- */
  b.push(mat4(39, 0, -25, -0.25));
  b.add(boxB(11, 6.4, 9), "plaster", 0xd8d0b8, mat4(0, 0, 0)); b.add(boxB(11, 3.2, 9), "brick", 0xffffff, mat4(0, 6.4, 0));
  for (const y of [3.2, 6.4, 9.6]) b.add(box(11.3, 0.25, 9.3), "concrete", 0xc8c4bc, mat4(0, y, 0));
  for (let f = 0; f < 3; f++) for (let i = 0; i < 3; i++) windowAt(b, -3.6 + i * 3.6, f * 3.2 + 1.7, 4.51, 1.3, 1.25, 0, { frame: 0x6a4a2e, lit: f === 1 && i !== 1 ? 2.6 : f === 0 && i === 2 ? 2.2 : 0, cell: 1, bars: f === 0 });
  for (let i = 0; i < 2; i++) windowAt(b, 5.51, 4.8, -2 + i * 4, 1.2, 1.2, Math.PI / 2, { frame: 0x6a4a2e, cell: 1, lit: i ? 2.0 : 0 });
  door(b, -3.6, 0, 4.52, 1.4, 2.3, 0, 0x404850);
  waterTank(b, 3, 9.85, -2);
  b.pop();
  signBoard(k, "neighbour-banner", 4.2, 1.1, "#1e5aa8", [{ t: "बाल विकास केन्द्र", size: 70, color: "#ffffff", y: 0.38, font: DEVA_FONT }, { t: "CHILD DEVELOPMENT CENTRE", size: 40, color: "#ffe066", y: 0.76 }], new THREE.Matrix4().multiplyMatrices(mat4(39, 0, -25, -0.25), mat4(0, 3.85, 4.56)), { lit: 0.3 });
  k.foot(39, -25, 11.4, 9.4, -0.25, 0, 10);
  m.pool([36, 2.4, -19], 7, 0xffd8a0, 0.7);

  /* ---------- gate arch on the east side (the hero enters here) ---------- */
  for (const sz of [-1, 1]) { b.add(boxB(0.7, 2.9, 0.7), "brick", 0xffffff, mat4(52, 0, -6 + sz * 2.6)); b.add(boxB(0.85, 0.2, 0.85), "plaster", WHITE, mat4(52, 2.9, -6 + sz * 2.6)); k.box(51.6, 0, -6 + sz * 2.6 - 0.4, 52.4, 4, -6 + sz * 2.6 + 0.4); }
  for (const sz of [-1, 1]) for (let i = 0; i < 2; i++) { const z0 = -6 + sz * (3.0 + i * 10), z1 = -6 + sz * (13 + i * 10); b.add(boxB(0.3, 1.2, Math.abs(z1 - z0)), "brick", 0xffffff, mat4(52, 0, (z0 + z1) / 2)); b.add(box(0.36, 0.08, Math.abs(z1 - z0)), "plaster", WHITE, mat4(52, 1.24, (z0 + z1) / 2)); k.box(51.8, 0, Math.min(z0, z1), 52.2, 1.3, Math.max(z0, z1)); }
  b.add(box(0.3, 0.3, 5.9), "metal", 0x2a4a7a, mat4(52, 3.2, -6), false);
  signBoard(k, "kalpavriksha-gate", 5.2, 1.0, "#1d4f9c", [
    { t: "कल्पवृक्ष प्राथमिक विद्यालय", size: 66, color: "#ffffff", y: 0.34, font: DEVA_FONT },
    { t: "KALPAVRIKSHA PRIMARY SCHOOL · SARLAHI", size: 44, color: "#ffe066", y: 0.76 },
  ], mat4(52.2, 3.85, -6, Math.PI / 2), { lit: 0.35 });
  b.add(box(0.18, 0.1, 0.4), "glow", 0xfff2d8, mat4(52.5, 4.55, -6), false, 5);
  k.light("point", [54, 4.3, -6], 0xffd2a0, 10, 14);

  /* ---------- electricity poles + street lamps along the roads ---------- */
  const poles: THREE.Vector3[] = [];
  for (let i = -9; i <= 9; i++) { const x = i * 34, z = 44.5 + Math.sin(i) * 0.6; poles.push(new THREE.Vector3(x, H(x, z), z)); }
  for (let i = -8; i <= 8; i++) { const z = i * 34 - 6, x = 67.5; poles.push(new THREE.Vector3(x, H(x, z), z)); }
  poles.forEach((p, i) => {
    b.add(cylB(0.09, 0.13, 8, 6), "concrete", 0xb0aca4, mat4(p.x, p.y, p.z, 0, 0, (hash(i, 3) - 0.5) * 0.04));
    b.add(box(1.4, 0.08, 0.08), "metal", 0x3a3c40, mat4(p.x, p.y + 7.6, p.z), false);
    if (i % 2 === 0 && Math.hypot(p.x, p.z) < 160) {
      b.add(box(1.2, 0.05, 0.05), "metal", 0x3a3c40, mat4(p.x + 0.5, p.y + 6.2, p.z, 0, 0, 0.1), false);
      b.add(box(0.36, 0.08, 0.18), "glow", 0xffcf8a, mat4(p.x + 1.1, p.y + 6.15, p.z), false, 6);
      m.pool([p.x + 1.1, p.y + 5.6, p.z], 11, 0xffb870, 0.9);
    }
  });
  const wires: THREE.BufferGeometry[] = [];
  for (let i = 0; i < poles.length - 1; i++) { const a = poles[i], c = poles[i + 1]; if (a.distanceTo(c) > 40) continue; for (const dx of [-0.6, 0.6]) wires.push(tube([a.clone().add(new THREE.Vector3(dx, 7.62, 0)), a.clone().lerp(c, 0.5).add(new THREE.Vector3(dx, 7.0, 0)), c.clone().add(new THREE.Vector3(dx, 7.62, 0))], 0.012, 10, 3)); }
  wires.forEach((g) => b.add(g, "matte", 0x1c1c1c, undefined, false));

  /* ---------- village clusters ---------- */
  const trees: TreeAt[] = [];
  const addTree = (sp: Species, x: number, z: number, s = 1) => trees.push({ sp, x, y: H(x, z) - 0.1, z, s });
  VILLAGES.forEach(([vx, vz, yaw], i) => {
    const near = Math.hypot(vx, vz) < 110;
    stiltHouse(k, b, vx, H(vx, vz), vz, yaw, { seed: i * 3 + 1, lit: near ? 2.6 : 2.2, pool: near });
    const mx = vx + Math.cos(yaw) * 11, mz = vz - Math.sin(yaw) * 11; mudHouse(k, b, mx, H(mx, mz), mz, yaw + 0.2, { seed: i * 5 + 2, lit: R() < 0.7 ? 3 : 0, pool: near, tinVerandah: i % 2 === 0 });
    const cx = vx - Math.cos(yaw) * 9 + Math.sin(yaw) * 4, cz = vz + Math.sin(yaw) * 9 + Math.cos(yaw) * 4; cowshed(k, b, cx, H(cx, cz), cz, yaw, i);
    const hx = vx - Math.sin(yaw) * 9, hz = vz - Math.cos(yaw) * 9; haystack(k, b, hx, H(hx, hz), hz, 0.9 + R() * 0.3);
    if (i % 2) { const ox = vx + Math.sin(yaw) * 10 + 6, oz = vz + Math.cos(yaw) * 10; mudHouse(k, b, ox, H(ox, oz), oz, yaw - 0.3, { seed: i * 7 + 5, lit: 2.4, tile: true }); }
    for (let t = 0; t < 7; t++) { const a = R() * 6.283, r = 14 + R() * 10, x = vx + Math.cos(a) * r, z = vz + Math.sin(a) * r; if (polyDist(x, z, ROAD_S) < 6 || polyDist(x, z, ROAD_E) < 6) continue; addTree((["mango", "banana", "bamboo", "palm", "banana", "sissoo", "mango"] as Species[])[t], x, z, 0.8 + R() * 0.4); }
    bambooFence(b, vx - 8, vz + 9, vx + 8, vz + 9.5, H);
  });

  /* ---------- trees: grove behind the school, field edges, road lines, hedgerows ---------- */
  for (let i = 0; i < 46; i++) { const x = -70 + R() * 140, z = -52 - R() * 42; addTree((["sal", "sal", "mango", "bamboo", "sissoo"] as Species[])[i % 5], x, z, 0.8 + R() * 0.45); }
  for (const [x, z, sp] of [[-44, 22, "mango"], [-46, 6, "sissoo"], [46, 30, "mango"], [44, 12, "sissoo"], [-40, 36, "pipal"], [30, 40, "sal"], [-20, 40, "sal"], [48, -34, "bamboo"], [-48, -20, "bamboo"]] as [number, number, Species][]) addTree(sp, x, z, 0.9 + R() * 0.2);
  for (let x = -400; x < 400; x += 9 + R() * 12) { const z = 56 + R() * 3; if (Math.abs(x + 10) > 6 && R() < 0.8) addTree(R() < 0.6 ? "sal" : "sissoo", x, z, 0.7 + R() * 0.5); }
  for (let z = -400; z < 400; z += 10 + R() * 14) { const x = 72 + R() * 3; if (R() < 0.7) addTree(R() < 0.5 ? "sal" : "mango", x, z, 0.7 + R() * 0.5); }
  /* tree lines along some plot boundaries out to the horizon */
  for (let i = 0; i < 170; i++) {
    const a = R() * 6.283, r = 130 + R() * 520, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const lineX = Math.round(x / 70) * 70, lineZ = Math.round(z / 55) * 55, useX = R() < 0.5;
    for (let j = 0; j < 4; j++) addTree(R() < 0.5 ? "sal" : R() < 0.5 ? "mango" : "sissoo", useX ? lineX + R() * 2 : x + j * 7, useX ? z + j * 7 : lineZ + R() * 2, 0.7 + R() * 0.6);
  }
  for (let i = 0; i < 40; i++) { const a = R() * 6.283, r = 60 + R() * 70, x = Math.cos(a) * r, z = Math.sin(a) * r; if (plotAt(x, z).kind !== "none" || nearVillage(x, z) < 12 || polyDist(x, z, ROAD_S) < 6 || polyDist(x, z, ROAD_E) < 6) continue; addTree("shrub", x, z, 1 + R()); }
  const trunkCols = trees.filter((t) => Math.hypot(t.x, t.z) < 90 && t.sp !== "shrub" && t.sp !== "banana");
  trunkCols.forEach((t) => k.box(t.x - 0.5, t.y, t.z - 0.5, t.x + 0.5, t.y + 3, t.z + 0.5));
  const forest = new Trees(m, trees.filter((t) => polyDist(t.x, t.z, TRACK) > 3 && polyDist(t.x, t.z, ROAD_S) > 4.5 && polyDist(t.x, t.z, ROAD_E) > 4.5), { near: 62, centre: [0, -10] });
  k.group.add(forest.group);

  /* ---------- far horizon: Churia hills to the north, a faint tree-line band all round ---------- */
  const hills = new THREE.BufferGeometry(), hp: number[] = [], hi: number[] = [], N = 160;
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, north = Math.max(0, -Math.cos(a)), r = 1500 + north * 600, top = 18 + north * (110 + 70 * fbm(i * 0.21, 1, 3, 4)) + 10 * fbm(i * 0.5, 2, 2, 7); hp.push(Math.sin(a) * r, -5, Math.cos(a) * r, Math.sin(a) * r, top, Math.cos(a) * r); if (i < N) { const q = i * 2; hi.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } }
  hills.setAttribute("position", new THREE.Float32BufferAttribute(hp, 3)); hills.setIndex(hi); hills.computeVertexNormals();
  b.add(hills, "matte", 0x1c2420, undefined, false);

  /* ---------- grass: school lawn (with dry patches), verges & bunds, rice ---------- */
  const lawnIn = (x: number, z: number) => x > SCHOOL.x0 + 2 && x < SCHOOL.x1 - 2 && z > -23 && z < SCHOOL.z1 - 2;
  const blocked = k.blocker(1.0, 0.25);
  const grass = new Grass(m, [
    { density: (x, z) => (lawnIn(x, z) && polyDist(x, z, TRACK) > 0.9 && !blocked(x, z) ? 22 : 0), height: (x, z) => 0.1 + 0.1 * fbm(x * 0.3, z * 0.3, 2, 6), base: 0x587a2e, tip: 0xb8c468, dry: (x, z) => smooth(0.45, 0.68, fbm(x * 0.08, z * 0.08, 3, 4)), dryTip: 0xd0b46a, width: 0.034, bend: 0.35 },
    { density: (x, z) => { if (lawnIn(x, z) || blocked(x, z) || (x > SCHOOL.x0 && x < SCHOOL.x1 && z > -46 && z < -20)) return 0; const p = plotAt(x, z); if (p.kind !== "none") return p.bund < 0.5 ? 16 : 0; const dr = Math.min(polyDist(x, z, ROAD_S), polyDist(x, z, ROAD_E)); return dr < 3.6 ? 0 : nearVillage(x, z) < 12 ? 2 : 9; }, height: (x, z) => 0.35 + 0.4 * fbm(x * 0.2, z * 0.2, 2, 3), base: 0x34501c, tip: 0x8fa04a, width: 0.032, bend: 0.6, heads: 0.25, dry: (x, z) => smooth(0.55, 0.75, fbm(x * 0.05, z * 0.05, 2, 8)), dryTip: 0xa89a62 },
    { density: (x, z) => { const p = plotAt(x, z); return (p.kind === "rice" || p.kind === "flood") && p.bund > 0.5 ? (p.kind === "rice" ? 22 : 9) : 0; }, height: (x, z) => (plotAt(x, z).kind === "flood" ? 0.32 : 0.62), base: 0x2f5a1e, tip: 0x7fb048, width: 0.024, bend: 0.55, clump: { spacing: 0.3, radius: 0.07 } },
    { density: (x, z) => (plotAt(x, z).kind === "mustard" && plotAt(x, z).bund > 0.5 ? 14 : 0), height: () => 0.75, base: 0x3f5a22, tip: 0xd8c040, width: 0.03, bend: 0.25, heads: 0.7 },
  ], { area: [-150, -150, 150, 150], ground: H, a: 3.2, levels: 5, maskRes: 512 });
  k.group.add(grass.group);
  k.onDispose(() => grass.dispose());

  /* ---------- people: the completion moment at the gazebo, and life around it ---------- */
  const top = PL;
  k.pose("teacher", 1, [GX + 0.3, top, GZ + 2.6], 0.05, "clap");
  [[-5.2, 2.4, 0.15, "clap"], [-4.4, 2.9, 0.1, "clap"], [-1.6, 2.9, -0.1, "wave"], [-0.8, 2.3, -0.2, "clap"], [-3.6, 1.2, 0, "idle"], [-2.0, 1.4, 0.2, "clap"]].forEach(([dx, dz, yaw, act], i) => k.pose("schoolkid", i + 1, [GX + (dx as number) + 3, top, GZ + (dz as number)], yaw as number, act as "clap"));
  k.pose("schoolkid", 9, [GX - 2.2, 0, GZ + 5.2], 0.3, "look", [GX, 1.2, GZ + 8.3]);
  k.pose("schoolkid", 10, [GX + 2.4, 0, GZ + 5.0], -0.4, "clap");
  k.walker("schoolkid", 11, [[22, 0, -1], [40, 0, -2.2]].map(([x, , z]) => [x, H(x, z), z] as V3), { speed: 1.0, pause: 3 });
  k.walker("local", 12, [[-120, 0, 47], [-60, 0, 47.4], [20, 0, 47.8]].map(([x, , z]) => [x, H(x, z), z] as V3), { speed: 1.1, pause: 4 });
  k.walker("local", 13, [[64.5, 0, 10], [64.5, 0, 40], [63.5, 0, 46]].map(([x, , z]) => [x, H(x, z), z] as V3), { speed: 1.2, pause: 5 });
  k.walker("teacher", 14, [[-30, 0, -24.6], [-6, 0, -24.4]].map(([x, , z]) => [x, 0.07, z] as V3), { speed: 0.9, pause: 6 });

  /* key light for the hero's stand: a lamp post at the field edge with a cool LED head */
  b.add(cylB(0.06, 0.09, 6.5, 8), "metal", 0x5a5c60, mat4(4.5, 0, -2)); b.add(box(1.2, 0.08, 0.08), "metal", 0x5a5c60, mat4(3.95, 6.45, -2), false);
  b.add(box(0.5, 0.06, 0.22), "glow", 0xeef3ff, mat4(3.5, 6.4, -2), false, 7);
  k.box(4.3, 0, -2.2, 4.7, 6.6, -1.8);
  k.light("spot", [3.5, 6.35, -2], 0xe8eeff, 80, 32, [-7, 0.6, -7.5], 0.7);
  m.pool([3.5, 6, -2], 14, 0xdfe7ff, 0.55);
  k.light("point", [-12, 3.2, -22.6], 0xe6eeff, 10, 18);

  /* fireflies over the field */
  const ff = new THREE.BufferGeometry(), fp: number[] = []; for (let i = 0; i < 160; i++) fp.push(-45 + R() * 90, 0.3 + R() * 1.8, -20 + R() * 60);
  ff.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
  const ffm = m.own(new THREE.PointsMaterial({ color: 0xd8ff8a, size: 0.09, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  const flies = new THREE.Points(ff, ffm); k.group.add(flies);
  const fp0 = fp.slice();
  k.on((t) => { const p = ff.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setXYZ(i, fp0[i * 3] + Math.sin(t * 0.3 + i) * 1.2, fp0[i * 3 + 1] + Math.sin(t * 0.7 + i * 1.7) * 0.3, fp0[i * 3 + 2] + Math.cos(t * 0.25 + i * 0.6) * 1.2); p.needsUpdate = true; ffm.opacity = 0.6 + 0.3 * Math.sin(t * 3.1); });

  /* ---------- stand, spawn, paths ---------- */
  const g = (x: number, z: number): V3 => [x, H(x, z), z];
  const stand: V3 = [-7.6, H(-7.6, -7.4), -7.4];
  const spawn: V3 = g(66, -42);
  return k.finish({
    env: { fog: { color: 0x0f1a2a, near: 70, far: 900 }, moon: 2.5, skyTint: 0x1a2a48 },
    arrival: { cam: [34, 34, 58], look: [-6, 0, -14], fov: 50 },
    spawn: { pos: spawn, yaw: Math.PI },
    stands: {
      sarlahi: { pos: stand, yaw: 0.55, act: "talk", outfit: "kid-school", shot: { cam: [-3.2, 1.45, -1.2], look: [-9.8, 2.7, -13], fov: 50 }, bubbleSide: "left", sign: { center: [-22, 8.05, -26.75], halfW: 7.5, halfH: 0.85 } },
    },
    paths: {
      "spawn>sarlahi": [spawn, g(64.6, -20), g(63.5, -7), g(56, -6), g(52, -6), g(40, -5.4), g(24, -4.8), g(8, -4.5), stand],
      "sarlahi>exit": [stand, g(-5, 6), g(-8, 26), g(-10, 46), g(-30, 47.2), g(-90, 47.6), g(-150, 48.4)],
    },
  });
}

export default { build };
