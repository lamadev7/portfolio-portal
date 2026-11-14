import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { SceneKit } from "./kit/scene";
import { Ground, fbm, polyDist, smooth } from "./kit/ground";
import { Grass } from "./kit/grass";
import { Trees, type TreeAt, type Species } from "./kit/trees";
import { box, boxB, cyl, cylB, lathe, mat4, sphere, tube, type Batch } from "./kit/geo";
import { mirrorWater } from "./kit/mirror";
import { cityLights } from "./kit/lights";
import { prayerFlags, poleFlag } from "./kit/flags";
import { curvedRoof, hipLines } from "./kit/roofs";
import { signBoard } from "./kit/sign";
import { canvasTex, rng } from "./kit/tex";
import { demBackdrop } from "./kit/dem";

/* Lumbini sacred garden: the white-brick Maya Devi Temple with its red-capped parapet posts, central tower, gold
   spire and Buddhist flag; the Puskarini pond with red stepped terraces in front; the Ashoka pillar; excavated brick
   monastery and stupa bases; the Bodhi tree hung with prayer flags; butter lamps. West of the garden, the Chinese
   monastery: orange glazed double roof, red columns, white stone balustrade, the incense urn on the stone path.
   North is -z. */

const TX = 0, TZ = -44, TW = 36, TD = 26, TH = 7.4;
const POND = { x0: -17, x1: 17, z0: -21, z1: -4, water: -0.95 };
const CX = -96, CZ = -36;
const PATH_IN: [number, number][] = [[-46, 64], [-40, 40], [-26, 12], [-14, 3], [-4, 1.0]];
const PATH_OUT: [number, number][] = [[-4, 1.0], [6, 0.8], [24, 1], [36, -6], [44, -24], [70, -40]];

function height(x: number, z: number) {
  if (x > POND.x0 + 0.6 && x < POND.x1 - 0.6 && z > POND.z0 + 0.6 && z < POND.z1 - 0.6) return -1.4;
  const r = Math.max(Math.abs(x + 30) - 120, Math.abs(z + 30) - 110, 0);
  return (fbm(x * 0.01, z * 0.01, 3, 2) - 0.5) * 1.4 * smooth(0, 80, r);
}

/** Buddhist (pañcavarṇa) flag: blue, yellow, red, white, orange stripes + mixed band */
const buddhistFlag = () => canvasTex("flagBuddhist", 300, 180, (g) => {
  const c = ["#2448b0", "#f2c41c", "#d8322a", "#f6f4ee", "#f28a1c"];
  for (let i = 0; i < 5; i++) { g.fillStyle = c[i]; g.fillRect(i * 50, 0, 50, 140); }
  for (let i = 0; i < 5; i++) { g.fillStyle = c[i]; g.fillRect(250, i * 28, 50, 28); }
  for (let i = 0; i < 5; i++) { g.fillStyle = c[i]; g.fillRect(i * 50, 140, 50, 40); }
});

function brickBase(b: Batch, x: number, z: number, w: number, d: number, steps: number, stepH = 0.32) {
  for (let i = 0; i < steps; i++) b.add(boxB(w - i * 0.9, stepH, d - i * 0.9), "oldBrick", 0xffffff, mat4(x, i * stepH, z));
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = new SceneKit(ctx, "lumbini"), b = k.b, rb = k.rb, m = k.mats, R = rng(33), H = height;
  const inPond = (x: number, z: number, pad = 0) => x > POND.x0 - pad && x < POND.x1 + pad && z > POND.z0 - pad && z < POND.z1 + pad;

  /* ---------- ground: lawns, brick walkways, the garden ---------- */
  const ground = new Ground({
    inner: 110, cell: 2, outer: 900, outerCell: 20, height: H, layers: ["turf", "dirt", "paddy", "flagstone"],
    splat(x, z) {
      const walk = inPond(x, z, 4.5) && !inPond(x, z, 0) ? 1 : 0, path = Math.min(polyDist(x, z, PATH_IN), polyDist(x, z, PATH_OUT)) < 1.6 ? 1 : 0;
      const temple = Math.abs(x - TX) < TW / 2 + 6 && Math.abs(z - TZ) < TD / 2 + 6 ? 1 : 0, cm = Math.abs(x - CX) < 30 && Math.abs(z - CZ) < 24 ? 1 : 0;
      const fields = Math.hypot(x + 30, z + 30) > 170 ? 1 : 0;
      return [Math.max(0, 1 - walk - path - temple - cm - fields), temple * 0.5, fields, Math.max(walk, path, cm, temple * 0.5)];
    },
    tint(x, z) { const n = fbm(x * 0.05, z * 0.05, 3, 6); return new THREE.Color(1.0 + n * 0.3, 1.0 + n * 0.3, 0.96 + n * 0.25); },
  }, m);
  k.group.add(ground.group);
  /* the Churia and Mahabharat hills on the northern horizon, from real elevation data (absent offline: flat Terai horizon) */
  await demBackdrop(k, {
    ll: [83.2757, 27.4697], near: 1600,
    bands: [[1700, 0], [8000, 6], [20000, 10], [40000, 14], [80000, 10], [130000, 4]],
    sectors: [{ az0: -90, az1: 90, step: 0.8 }, { az0: 90, az1: 270, step: 1.6 }],
    tiles: [{ z: 7, r: 130 }, { z: 9, r: 45 }],
    snow: 4800, tree: 3600, haze: { color: 0x2c3858, dist: 22000, max: 0.65 }, colors: { forest: 0x1e2a1c },
  });

  /* ---------- Puskarini pond: red stepped terraces down to the water ---------- */
  const red = 0xc8553a, redDark = 0x9a3f2c;
  const pw = POND.x1 - POND.x0, pd = POND.z1 - POND.z0, pcx = (POND.x0 + POND.x1) / 2, pcz = (POND.z0 + POND.z1) / 2;
  for (let i = 0; i < 3; i++) {
    const inset = i * 0.7, y = -i * 0.33, w = pw - inset * 2, d = pd - inset * 2;
    for (const [sx, sz, L, ry] of [[0, 1, w, 0], [0, -1, w, 0], [1, 0, d, Math.PI / 2], [-1, 0, d, Math.PI / 2]] as const) {
      const g = box(L + 0.7, 0.33, 0.7); const x = pcx + sx * (w / 2 - 0.35), z = pcz + sz * (d / 2 - 0.35);
      rb.add(g, "plaster", i === 0 ? red : redDark, mat4(x, y - 0.165, z, ry));
    }
  }
  rb.add(box(pw - 4.2, 0.1, pd - 4.2), "plaster", 0x3a2a22, mat4(pcx, -1.3, pcz), false);
  /* low parapet kerb around the pond edge */
  for (const [sx, sz, L, ry] of [[0, 1, pw + 0.4, 0], [0, -1, pw + 0.4, 0], [1, 0, pd + 0.4, Math.PI / 2], [-1, 0, pd + 0.4, Math.PI / 2]] as const) rb.add(boxB(L, 0.22, 0.4), "plaster", 0xd86a48, mat4(pcx + sx * (pw / 2 + 0.2), 0, pcz + sz * (pd / 2 + 0.2), ry));
  mirrorWater(k, new THREE.PlaneGeometry(pw - 1.2, pd - 1.2).rotateX(-Math.PI / 2).translate(pcx, 0, pcz), POND.water, { color: 0x0a0d0c, res: 0.5, distort: 0.012, scale: 4, flow: [0.004, 0.002], sky: { zenith: 0x03060f, horizon: 0x18243e } });
  k.box(POND.x0 - 0.4, -1.4, POND.z0 - 0.4, POND.x1 + 0.4, 0.3, POND.z1 + 0.4);

  /* butter lamps along the south and east terraces (tiny flames, bloom does the glow) */
  const lamps: V3[] = [];
  for (let x = POND.x0 + 1; x < POND.x1 - 0.5; x += 0.55) lamps.push([x, 0.28, POND.z1 + 0.2]);
  for (let z = POND.z0 + 1; z < POND.z1 - 0.5; z += 0.55) lamps.push([POND.x1 + 0.2, 0.28, z]);
  lamps.forEach(([x, y, z]) => { rb.add(cylB(0.045, 0.035, 0.05, 6), "metal", 0xc8a050, mat4(x, y - 0.06, z), false); });
  cityLights(k, lamps.map(([x, y, z]) => [x, y + 0.03, z] as V3), { size: 0.16, intensity: 7, palette: [0xffb050, 0xffc070, 0xffa040], reflect: true });
  m.pool([pcx, 0.6, POND.z1 + 0.5], 9, 0xffb060, 0.9); m.pool([POND.x1 + 0.5, 0.6, pcz], 8, 0xffb060, 0.8); m.pool([pcx - 10, 0.6, POND.z1 + 0.5], 7, 0xffb060, 0.7); m.pool([pcx + 10, 0.6, POND.z1 + 0.5], 7, 0xffb060, 0.7);

  /* ---------- Maya Devi Temple ---------- */
  rb.push(mat4(TX, 0, TZ));
  rb.add(boxB(TW + 1.2, 0.5, TD + 1.2), "oldBrick", 0xffffff, mat4(0, 0, 0));
  rb.add(boxB(TW, TH, TD), "wbrick", 0xffffff, mat4(0, 0.5, 0));
  /* clerestory window band all round */
  const winRow = (len: number, n: number, ry: number, ox: number, oz: number) => {
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + (len * (i + 0.5)) / n; const px = ox + Math.cos(ry) * u, pz = oz - Math.sin(ry) * u;
      rb.push(mat4(px, 0.5 + TH - 1.85, pz, ry));
      rb.add(new THREE.PlaneGeometry(2.1, 0.95), "glow", 0xffc070, mat4(0, 0, 0.03), false, 1.3);
      rb.add(box(2.3, 0.08, 0.12), "paint", 0xf0eeea, mat4(0, 0.5, 0.06), false); rb.add(box(2.3, 0.1, 0.16), "paint", 0xf0eeea, mat4(0, -0.52, 0.08), false);
      for (let j = 0; j <= 3; j++) rb.add(box(0.06, 0.95, 0.08), "paint", 0xf0eeea, mat4(-1.05 + j * 0.7, 0, 0.06), false);
      rb.pop();
    }
  };
  winRow(TW - 4, 10, 0, 0, TD / 2 + 0.01); winRow(TW - 4, 10, Math.PI, 0, -TD / 2 - 0.01); winRow(TD - 4, 7, Math.PI / 2, TW / 2 + 0.01, 0); winRow(TD - 4, 7, -Math.PI / 2, -TW / 2 - 0.01, 0);
  /* parapet: square posts with red caps, white rails between */
  const top = 0.5 + TH;
  const posts = (len: number, n: number, ry: number, ox: number, oz: number) => {
    for (let i = 0; i <= n; i++) {
      const u = -len / 2 + (len * i) / n, px = ox + Math.cos(ry) * u, pz = oz - Math.sin(ry) * u;
      rb.add(boxB(0.75, 0.95, 0.75), "wbrick", 0xffffff, mat4(px, top, pz)); rb.add(boxB(0.9, 0.24, 0.9), "plaster", 0xc8402a, mat4(px, top + 0.95, pz));
      if (i < n) { const u2 = u + len / n / 2, qx = ox + Math.cos(ry) * u2, qz = oz - Math.sin(ry) * u2; for (const hh of [0.45, 0.85]) rb.add(box(len / n - 0.75, 0.05, 0.05), "metal", 0xe8e8e4, mat4(qx, top + hh, qz, ry), false); }
    }
  };
  posts(TW, 11, 0, 0, TD / 2 - 0.3); posts(TW, 11, 0, 0, -TD / 2 + 0.3); posts(TD - 0.6, 8, Math.PI / 2, TW / 2 - 0.3, 0); posts(TD - 0.6, 8, Math.PI / 2, -TW / 2 + 0.3, 0);
  /* central tower, dome, gilded spire */
  rb.add(boxB(10, 3.6, 10), "wbrick", 0xffffff, mat4(0, top, -1)); rb.add(boxB(10.6, 0.3, 10.6), "plaster", 0xf2f0ea, mat4(0, top + 3.6, -1));
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) for (let i = 0; i < 3; i++) { rb.push(mat4(Math.sin(ry) * 5.02, top + 1.9, -1 + Math.cos(ry) * 5.02, ry)); rb.add(new THREE.PlaneGeometry(1.8, 1.0), "glow", 0xffc070, mat4(-2.6 + i * 2.6, 0, 0.02), false, 1.2); rb.pop(); }
  rb.add(sphere(2.6, 20, 10).scale(1, 0.5, 1), "plaster", 0xf4f2ec, mat4(0, top + 3.9, -1));
  rb.add(boxB(1.6, 0.9, 1.6), "gold", 0xd8a640, mat4(0, top + 4.9, -1));
  rb.add(lathe([[0.75, 0], [0.7, 0.2], [0.62, 0.4], [0.62, 0.5], [0.55, 0.7], [0.55, 0.8], [0.47, 1.0], [0.47, 1.1], [0.4, 1.3], [0.4, 1.4], [0.32, 1.6], [0.32, 1.7], [0.24, 1.9], [0.5, 2.05], [0.08, 2.4], [0.15, 2.6], [0.02, 3.0]], 14), "gold", 0xe0b048, mat4(0, top + 5.8, -1));
  rb.add(boxB(0.4, 0.4, 0.4), "glow", 0xffd890, mat4(0, top + 5.6, -1), false, 0.6);
  /* entrance: door, stair + ramp with white balustrade and gilded dharma wheels */
  rb.add(box(1.8, 2.6, 0.12), "matte", 0x1a1410, mat4(5, 0.5 + 1.3, TD / 2 + 0.05), false);
  rb.add(box(2.2, 0.15, 0.2), "plaster", 0xf0eeea, mat4(5, 0.5 + 2.65, TD / 2 + 0.1));
  for (let i = 0; i < 5; i++) rb.add(box(3.2, 0.12 * (i + 1), 0.5), "concrete", 0xd6d2ca, mat4(5, (0.12 * (i + 1)) / 2, TD / 2 + 2.6 - i * 0.5));
  for (const sx of [-1, 1]) { rb.add(box(0.12, 0.9, 3.0), "plaster", 0xf2f0ea, mat4(5 + sx * 1.65, 0.75, TD / 2 + 1.5, 0, 0.2)); for (let j = 0; j < 4; j++) rb.add(new THREE.TorusGeometry(0.22, 0.04, 6, 12), "gold", 0xd0a040, mat4(5 + sx * 1.73, 0.7 + j * 0.08, TD / 2 + 0.6 + j * 0.65, Math.PI / 2), false); }
  rb.pop();
  k.box(TX - TW / 2 - 0.6, 0, TZ - TD / 2 - 0.6, TX + TW / 2 + 0.6, 12, TZ + TD / 2 + 0.6);
  k.box(TX + 3.2, 0, TZ + TD / 2, TX + 6.8, 1.2, TZ + TD / 2 + 3);
  poleFlag(k, new THREE.Vector3(TX - 12, top, TZ + 6), 4.2, buddhistFlag(), 1.5, 0.9, 0.3);
  /* floodlighting from the lawn: pools across the facade and the gilt spire */
  for (const x of [-14, -4, 6, 14]) m.pool([TX + x, 2.5, TZ + TD / 2 + 3.5], 10, 0xfff0d6, 0.45);
  m.pool([TX, top + 5.5, TZ - 1 + 3], 5, 0xffd890, 1.4);
  k.light("spot", [TX - 2, 0.6, TZ + TD / 2 + 14], 0xfff0dc, 140, 46, [TX - 2, 5, TZ + TD / 2], 0.7);

  /* ---------- Ashoka pillar in its railed enclosure ---------- */
  const AX = TX - 26, AZ = TZ + 10;
  b.add(boxB(3.6, 0.35, 3.6), "oldBrick", 0xffffff, mat4(AX, 0, AZ)); b.add(cylB(0.42, 0.48, 6.0, 20), "concrete", 0xb8a890, mat4(AX, 0.35, AZ));
  b.add(cylB(0.46, 0.42, 0.3, 20), "concrete", 0xa89880, mat4(AX, 6.35, AZ));
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; b.add(box(4.6, 0.05, 0.05), "metal", 0x2a2c30, mat4(AX + Math.sin(a) * 2.3, 0.9, AZ + Math.cos(a) * 2.3, a), false); for (let j = 0; j < 9; j++) b.add(box(0.04, 0.95, 0.04), "metal", 0x2a2c30, mat4(AX + Math.sin(a) * 2.3 + Math.cos(a) * (-2.2 + j * 0.55), 0.47, AZ + Math.cos(a) * 2.3 - Math.sin(a) * (-2.2 + j * 0.55)), false); }
  k.box(AX - 2.4, 0, AZ - 2.4, AX + 2.4, 7, AZ + 2.4);
  m.pool([AX + 2, 0.8, AZ + 2.5], 5, 0xffe6c0, 0.8);

  /* ---------- excavated brick foundations and stupa bases ---------- */
  brickBase(b, TX - 13, TZ + TD / 2 + 9.5, 6, 3.6, 2); brickBase(b, TX + 14, TZ + TD / 2 + 9.5, 7, 3.6, 2);
  k.box(TX - 16, 0, TZ + TD / 2 + 7.7, TX - 10, 0.7, TZ + TD / 2 + 11.3); k.box(TX + 10.5, 0, TZ + TD / 2 + 7.7, TX + 17.5, 0.7, TZ + TD / 2 + 11.3);
  for (const [x, z, w, d] of [[28, -46, 12, 9], [30, -62, 9, 7], [-30, -58, 10, 8], [-34, -38, 6, 6]] as const) { brickBase(b, x, z, w, d, 3); k.box(x - w / 2, 0, z - d / 2, x + w / 2, 1, z + d / 2); }
  for (const [x, z] of [[25.5, -34], [37, -34], [-24, -66]] as const) { b.add(cylB(1.5, 1.7, 0.8, 18), "oldBrick", 0xffffff, mat4(x, 0, z)); b.add(cylB(1.1, 1.3, 0.5, 16), "oldBrick", 0xffffff, mat4(x, 0.8, z)); k.box(x - 1.7, 0, z - 1.7, x + 1.7, 1.3, z + 1.7); }

  /* ---------- the Bodhi tree with radiating prayer-flag strings ---------- */
  const BX = 30, BZ = -18;
  b.add(cylB(4.2, 4.4, 0.55, 24), "oldBrick", 0xffffff, mat4(BX, 0, BZ)); k.box(BX - 4.4, 0, BZ - 4.4, BX + 4.4, 3, BZ + 4.4);
  const trees: TreeAt[] = [{ sp: "pipal", x: BX, y: 0.45, z: BZ, s: 1.25 }];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2, L = 13 + (i % 3) * 2, px = BX + Math.cos(a) * L, pz = BZ + Math.sin(a) * L;
    if (inPond(px, pz, 2) || (Math.abs(px - TX) < TW / 2 + 2 && Math.abs(pz - TZ) < TD / 2 + 2)) continue;
    b.add(cylB(0.05, 0.06, 4.2, 6), "wood", 0x6a5038, mat4(px, 0, pz), false);
    prayerFlags(k, new THREE.Vector3(BX + Math.cos(a) * 2.5, 7.5 + (i % 2), BZ + Math.sin(a) * 2.5), new THREE.Vector3(px, 4.2, pz), { sag: 1.2, size: 0.3, seed: i });
  }
  k.light("point", [BX - 3, 2.2, BZ + 5], 0xffb868, 9, 16);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; b.add(cylB(0.05, 0.04, 0.06, 6), "metal", 0xc8a050, mat4(BX + Math.cos(a) * 4.3, 0.55, BZ + Math.sin(a) * 4.3), false); }
  cityLights(k, Array.from({ length: 24 }, (_, i) => [BX + Math.cos((i / 24) * Math.PI * 2) * 4.3, 0.63, BZ + Math.sin((i / 24) * Math.PI * 2) * 4.3] as V3), { size: 0.16, intensity: 7, palette: [0xffb050, 0xffc070] });
  m.pool([BX, 1, BZ], 8, 0xffb060, 1.0);

  /* ---------- Chinese monastery (west), facing east toward the garden ---------- */
  b.push(mat4(CX, 0, CZ, Math.PI / 2));
  /* stone platform with balustrade and stairs */
  b.add(boxB(30, 1.4, 20), "flagstone", 0xc8c4bc, mat4(0, 0, 0));
  for (const [x, z, L, ry] of [[0, 10, 30, 0], [-15, 0, 20, Math.PI / 2], [15, 0, 20, Math.PI / 2]] as const) {
    const n = Math.round(L / 1.6);
    for (let i = 0; i <= n; i++) { const u = -L / 2 + (L * i) / n; if (z === 10 && Math.abs(u) < 3.2) continue; b.add(boxB(0.28, 1.0, 0.28), "concrete", 0xe4e0d8, mat4(x + Math.cos(ry) * u, 1.4, z - Math.sin(ry) * u)); }
    b.add(box(L, 0.14, 0.22), "concrete", 0xe4e0d8, mat4(x, 2.32, z, ry));
  }
  for (let i = 0; i < 7; i++) b.add(box(6, 0.2 * (i + 1), 0.4), "flagstone", 0xd0ccc4, mat4(0, 0.1 * (i + 1), 10 + 2.8 - i * 0.4));
  /* hall body: red columns on a veranda, dark lattice doors, plaque */
  b.add(boxB(22, 6.6, 11), "plaster", 0x8a2a22, mat4(0, 1.4, -1.5));
  for (let i = 0; i <= 6; i++) { const x = -11 + i * (22 / 6); b.add(cylB(0.32, 0.32, 6.4, 12), "paint", 0xb02a22, mat4(x, 1.4, 5.2)); b.add(boxB(0.7, 0.25, 0.7), "concrete", 0xe0dcd4, mat4(x, 1.4, 5.2)); }
  for (let i = 0; i < 6; i++) { const x = -11 + (i + 0.5) * (22 / 6); b.add(box(2.8, 4.4, 0.1), "wood", 0x3a1a14, mat4(x, 1.4 + 2.4, 4.05), false); for (let j = 0; j < 8; j++) b.add(box(2.6, 0.05, 0.12), "wood", 0x5a2a1a, mat4(x, 1.4 + 0.6 + j * 0.55, 4.12), false); }
  b.add(box(22.6, 1.0, 0.3), "paint", 0x234a6a, mat4(0, 7.5, 5.3)); b.add(box(22.6, 0.4, 0.3), "paint", 0x2a7a5a, mat4(0, 8.1, 5.3));
  b.pop();
  /* double-eave orange glazed roof */
  const rUp = { A: 12.4, B: 7.2, a: 8.5, b: 0, rise: 4.0, lift: 0.9, curve: 1.8 }, rLow = { A: 13.6, B: 8.2, a: 9.6, b: 4.9, rise: 1.6, lift: 0.75, curve: 1.4 };
  b.push(mat4(CX - 1.5, 0, CZ, Math.PI / 2));
  b.add(curvedRoof(rLow), "glazed", 0xf0a030, mat4(0, 7.9, 0));
  b.add(boxB(19, 2.0, 9.5), "plaster", 0x8a2a22, mat4(0, 9.3, 0)); b.add(box(19.4, 0.5, 9.9), "paint", 0x234a6a, mat4(0, 11.1, 0));
  b.add(curvedRoof(rUp), "glazed", 0xf2a830, mat4(0, 11.3, 0));
  b.add(box(17.4, 0.5, 0.45), "glazed", 0xe09020, mat4(0, 11.3 + 4.15, 0));
  for (const sx of [-1, 1]) b.add(tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * 0.3, 0.8, 0), new THREE.Vector3(sx * 0.05, 1.3, 0), new THREE.Vector3(-sx * 0.25, 1.1, 0)], 0.18, 8, 6), "glazed", 0xd88a20, mat4(sx * 8.6, 11.3 + 4.3, 0));
  for (const [ro, y] of [[rUp, 11.3], [rLow, 7.9]] as const) for (const ln of hipLines(ro)) b.add(tube(ln, 0.12, 8, 5), "glazed", 0xe09020, mat4(0, y, 0), false);
  b.pop();
  k.box(CX - 10.5, 0, CZ - 15.5, CX + 10.5, 16, CZ + 15.5);
  /* side wings forming the courtyard, lower orange roofs */
  for (const sz of [-1, 1]) {
    const wx = CX + 22, wz = CZ + sz * 20;
    b.push(mat4(wx, 0, wz)); b.add(boxB(26, 4, 7), "plaster", 0x9a3026, mat4(0, 0, 0)); for (let i = 0; i < 6; i++) b.add(cylB(0.22, 0.22, 3.8, 10), "paint", 0xb02a22, mat4(-11 + i * 4.4, 0, -sz * 4.0));
    b.add(curvedRoof({ A: 13.8, B: 5.0, a: 10.5, b: 0, rise: 2.4, lift: 0.5, curve: 1.6 }), "glazed", 0xf0a030, mat4(0, 4, 0)); b.pop();
    k.box(wx - 13.5, 0, wz - 4.6, wx + 13.5, 7, wz + 4.6);
    for (let i = 0; i < 5; i++) { const lx = wx - 10 + i * 5, lz = wz - sz * 4.5; b.add(cyl(0.005, 0.005, 0.4, 3), "matte", 0x222222, mat4(lx, 3.7, lz), false); b.add(sphere(0.28, 10, 8).scale(1, 1.25, 1), "glow", 0xff3018, mat4(lx, 3.25, lz), false, 2.6); }
  }
  /* front lanterns on the main hall, the stone path, the incense urn */
  for (let i = 0; i < 6; i++) { const lz = CZ - 10 + i * 4; b.add(sphere(0.34, 10, 8).scale(1, 1.25, 1), "glow", 0xff2814, mat4(CX + 6.6, 7.0, lz), false, 2.8); }
  m.pool([CX + 7.5, 5, CZ], 12, 0xff4a2a, 1.0); k.light("point", [CX + 8, 4.5, CZ + 2], 0xff6a40, 18, 24);
  b.add(box(30, 0.08, 4.2), "flagstone", 0xd6d2ca, mat4(CX + 26, 0.03, CZ), false);
  const UX = CX + 22;
  b.add(boxB(1.6, 0.35, 1.6), "concrete", 0xc8c4bc, mat4(UX, 0, CZ));
  b.push(mat4(UX, 0.35, CZ));
  b.add(lathe([[0.15, 0], [0.5, 0.05], [0.62, 0.35], [0.6, 0.75], [0.66, 0.85], [0.66, 0.95]], 16), "metal", 0x5a4a30, mat4(0, 0.5, 0));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.add(cyl(0.06, 0.08, 0.6, 6), "metal", 0x5a4a30, mat4(Math.cos(a) * 0.4, 0.3, Math.sin(a) * 0.4)); }
  b.add(cylB(0.32, 0.4, 0.5, 12), "metal", 0x5a4a30, mat4(0, 1.45, 0)); b.add(curvedRoof({ A: 0.62, B: 0.62, a: 0.05, b: 0, rise: 0.45, lift: 0.12, curve: 1.4, segU: 6, segT: 3, thick: 0.03 }), "metal", 0x6a5a38, mat4(0, 1.95, 0));
  b.add(cylB(0.25, 0.32, 0.4, 12), "metal", 0x5a4a30, mat4(0, 2.4, 0)); b.add(curvedRoof({ A: 0.48, B: 0.48, a: 0.04, b: 0, rise: 0.4, lift: 0.1, curve: 1.4, segU: 6, segT: 3, thick: 0.03 }), "metal", 0x6a5a38, mat4(0, 2.8, 0));
  b.add(new THREE.CircleGeometry(0.5, 12).rotateX(-Math.PI / 2), "glow", 0xff7a30, mat4(0, 1.36, 0), false, 1.6);
  b.pop();
  k.box(UX - 0.9, 0, CZ - 0.9, UX + 0.9, 3.3, CZ + 0.9);
  signBoard(k, "zhonghua-plaque", 3.2, 0.9, "#1a2a4a", [{ t: "中华寺", size: 120, color: "#e8c050", y: 0.52, font: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif" }], mat4(CX + 6.85, 7.5, CZ, Math.PI / 2), { lit: 0.25 });
  for (const sz of [-1, 0, 1]) poleFlag(k, new THREE.Vector3(CX + 34, 0, CZ + 9 + sz * 2.2), 9, buddhistFlag(), 1.6, 1.0, Math.PI / 2);
  k.box(CX + 33.6, 0, CZ + 6, CX + 34.4, 9, CZ + 12);

  /* ---------- the canal north and the World Peace Pagoda on the horizon ---------- */
  b.add(box(10, 0.1, 600), "glass", 0x0a1416, mat4(0, -0.6, -390), false);
  for (const sx of [-1, 1]) b.add(box(3, 0.4, 600), "oldBrick", 0xffffff, mat4(sx * 6.5, -0.1, -390), false);
  const cl: V3[] = []; for (let z = -95; z > -680; z -= 14) cl.push([-8.2, 3.2, z], [8.2, 3.2, z]);
  cityLights(k, cl, { size: 0.8, intensity: 4, palette: [0xfff0d0] });
  for (const [x, z] of cl.map((p) => [p[0], p[2]] as const)) if (Math.abs(z) < 300) b.add(cylB(0.06, 0.08, 3.2, 6), "metal", 0x3a3c40, mat4(x, 0, z), false);
  const PG = [180, 0, -1350] as const;
  b.add(cylB(36, 40, 12, 32), "plaster", 0xe8e6e0, mat4(PG[0], -2, PG[2]), false); b.add(sphere(30, 32, 16).scale(1, 0.62, 1), "plaster", 0xf2f0ea, mat4(PG[0], 10, PG[2]), false);
  b.add(cylB(3, 4, 20, 12), "gold", 0xd8a840, mat4(PG[0], 26, PG[2]), false);
  m.pool([PG[0], 20, PG[2] + 45], 70, 0xfff0d0, 0.6);

  /* ---------- trees, garden lamps, the town ring ---------- */
  const add = (sp: Species, x: number, z: number, s = 1) => trees.push({ sp, x, y: H(x, z) - 0.1, z, s });
  const clearOf = (x: number, z: number) => inPond(x, z, 7) || (Math.abs(x - TX) < TW / 2 + 8 && Math.abs(z - TZ) < TD / 2 + 8) || (Math.abs(x - CX - 10) < 34 && Math.abs(z - CZ) < 32) || Math.min(polyDist(x, z, PATH_IN), polyDist(x, z, PATH_OUT)) < 5 || Math.hypot(x - BX, z - BZ) < 12 || Math.abs(x) < 14 && z < -60;
  for (let i = 0; i < 520; i++) { const a = R() * 6.283, r = 40 + Math.pow(R(), 0.8) * 420, x = Math.cos(a) * r - 20, z = Math.sin(a) * r - 30; if (clearOf(x, z)) continue; add((["sal", "mango", "sal", "sissoo", "pipal", "palm"] as Species[])[i % 6], x, z, 0.75 + R() * 0.45); }
  for (let i = 0; i < 30; i++) { const x = -70 + R() * 140, z = -100 + R() * 120; if (clearOf(x, z)) continue; add(R() < 0.5 ? "shrub" : "rhodo", x, z, 0.8 + R() * 0.5); }
  const forest = new Trees(m, trees, { near: 120, centre: [-10, -20] });
  k.group.add(forest.group);
  trees.filter((t) => Math.hypot(t.x + 10, t.z + 20) < 110 && t.sp !== "shrub").forEach((t) => k.box(t.x - 0.6, t.y, t.z - 0.6, t.x + 0.6, t.y + 3, t.z + 0.6));
  for (const [x, z] of [[-34, 23], [-20, 6.5], [-6, 3.5], [8, 3.5], [22, 2.5], [36, -8], [-34, 40]] as const) { b.add(cylB(0.06, 0.09, 3.6, 8), "metal", 0x2c2e32, mat4(x, H(x, z), z)); b.add(sphere(0.2, 10, 8), "glow", 0xffe2b0, mat4(x, H(x, z) + 3.75, z), false, 5); m.pool([x, H(x, z) + 3.4, z], 9, 0xffd8a0, 0.8); k.box(x - 0.2, 0, z - 0.2, x + 0.2, 4, z + 0.2); }
  const town: V3[] = []; for (let i = 0; i < 700; i++) { const a = R() * 6.283, r = 480 + R() * 800, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < 60 && z < -300) continue; town.push([x, 1.5 + R() * 6, z]); }
  cityLights(k, town, { size: 1.6, intensity: 2.4 });

  /* ---------- grass ---------- */
  const blocked = k.blocker(0.5, 0.4);
  const grass = new Grass(m, [
    { density: (x, z) => { if (blocked(x, z) || inPond(x, z, 4.6) || Math.min(polyDist(x, z, PATH_IN), polyDist(x, z, PATH_OUT)) < 1.7 || (Math.abs(x - CX) < 30 && Math.abs(z - CZ) < 24) || (Math.abs(x - TX) < TW / 2 + 6 && Math.abs(z - TZ) < TD / 2 + 6)) return 0; return 26; }, height: (x, z) => 0.1 + 0.08 * fbm(x * 0.3, z * 0.3, 2, 6), base: 0x587a2e, tip: 0xb0c062, dry: (x, z) => smooth(0.55, 0.75, fbm(x * 0.06, z * 0.06, 3, 4)), dryTip: 0xc8b070, width: 0.034, bend: 0.35 },
  ], { area: [-150, -150, 150, 150], ground: H, a: 3.4, levels: 5, maskRes: 512 });
  k.group.add(grass.group); k.onDispose(() => grass.dispose());

  /* ---------- people: monks circumambulating the temple clockwise, pilgrims at the Bodhi tree and the urn ---------- */
  const loop: V3[] = [[TX - 21.5, 0, TZ + TD / 2 + 4.5], [TX - 21.5, 0, TZ - TD / 2 - 4], [TX + 21.5, 0, TZ - TD / 2 - 4], [TX + 21.5, 0, TZ + TD / 2 + 4.5]];
  k.walker("monk", 41, loop, { speed: 0.8, closed: true, start: 0 });
  k.walker("monk", 42, [loop[2], loop[3], loop[0], loop[1]], { speed: 0.75, closed: true });
  k.pose("monk", 43, [BX - 5.4, 0, BZ + 1.5], -1.3, "sit");
  k.pose("local", 44, [BX - 5.2, 0, BZ - 1.8], -1.7, "idle", [BX, 1.2, BZ]);
  k.pose("guest", 45, [UX + 2.2, 0, CZ + 1.2], -1.8, "look", [UX, 1.5, CZ]);
  k.pose("local", 46, [POND.x1 + 2.6, 0, pcz + 3], -1.5, "idle", [pcx, 0, pcz]);

  const g = (x: number, z: number): V3 => [x, H(x, z), z];
  const stand = g(-4, 1.0), spawn = g(-46, 64);
  return k.finish({
    env: { fog: { color: 0x101a2a, near: 90, far: 2400 }, moon: 2.2, skyTint: 0x1a2848 },
    arrival: { cam: [40, 34, 46], look: [-4, 0, -26], fov: 50 },
    spawn: { pos: spawn, yaw: Math.PI * 0.85 },
    stands: { visit: { pos: stand, yaw: 0.54, act: "look", outfit: "student", shot: { cam: [0.5, 1.9, 8.5], look: [-6, 3.4, -30], fov: 50 }, bubbleSide: "right" } },
    paths: { "spawn>visit": PATH_IN.map(([x, z]) => g(x, z)), "visit>exit": PATH_OUT.map(([x, z]) => g(x, z)) },
  });
}

export default { build };
