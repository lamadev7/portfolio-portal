import * as THREE from "three";
import type { LocationScene, SceneCtx, V3 } from "../contracts";
import { mat4 } from "./ktm/lib";
import { palette, tree, distantLights, cityLights, ridges, type Kit } from "./ktm/props";
import { assemble, lin, railing, wallWindows } from "./ktm/arch";
import { People, crowd } from "./ktm/people";
import { newariArt, pagoda, chaityaGeo, Flags, type Art } from "./ktm/newari";
import { rng } from "./ktm/tex";

/* Swayambhunath on its hilltop: the white dome with the gold harmika and Buddha eyes, thirteen gold rings and chhatra,
   five gold shrines, the two white shikharas and the vajra at the head of the east stairway, gold-roofed pagodas,
   dark stone chaityas, prayer flags from the spire, and the city spread below. Origin = stupa. */

const WHITE = 0xf4f1ea;

function hill(k: Kit) {
  const { b } = k;
  b.add("pavers", new THREE.CircleGeometry(44, 48), mat4(0, 0, 0, 0, 1, 1, 1, -Math.PI / 2), { uv: 3, color: 0xa09a90 });
  const prof: [number, number][] = [[44, 0], [46, -0.6], [56, -6], [80, -20], [120, -38], [170, -56], [240, -68], [330, -72], [700, -73]];
  b.lathe("grass", prof.map(([r, y]) => [r, y] as [number, number]).reverse().map(([r, y]) => [r, y]), 0, 0, 0, 64, { uv: 8, color: 0x7a8a6a });
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    b.box("stone", Math.cos(a) * 44.4, -0.4, Math.sin(a) * 44.4, 4.4, 1.3, 0.5, -a + Math.PI / 2, { color: 0x6a645a });
  }
  const r = rng(5);
  for (let i = 0; i < 110; i++) {
    const a = r() * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.12) continue;
    const d = 50 + r() * 90, y = d < 56 ? -0.6 - (d - 46) * 0.54 : d < 80 ? -6 - (d - 56) * 0.58 : -20 - (d - 80) * 0.45;
    tree(k, Math.cos(a) * d, Math.sin(a) * d, 1.3 + r() * 0.9, 700 + i, y - 0.4, 1);
  }
  /* east stairway with lamps */
  for (let i = 0; i < 150; i++) { const x = 46 + i * 0.5, y = x < 56 ? -0.6 - (x - 46) * 0.54 : -6 - (x - 56) * 0.58; if (y < -26) break; b.box("stone", x, y - 0.6, 0, 0.5, 0.6, 3.2, 0, { color: 0x7a746a }); }
  for (let x = 48; x < 92; x += 6) { const y = x < 56 ? -0.6 - (x - 46) * 0.54 : -6 - (x - 56) * 0.58; for (const s of [-1, 1]) { b.cyl("metal", x, y, s * 2.1, 0.04, 0.05, 2.2, 6, { color: 0x333333 }); b.add("glow", new THREE.SphereGeometry(0.14, 8, 6), mat4(x, y + 2.3, s * 2.1), { color: lin(1.8, 1.3, 0.7) }); k.pools.add(x, y, s * 2.1, 2.5, 0xffc880, 0.35); } }
}

function stupa(k: Kit, art: Art) {
  const { b, bank } = k;
  const domeTex = bank.canvas(1024, 256, (g, w, h) => {
    g.fillStyle = "#f3efe6"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { const x = (i + 0.5) * w / 16; g.strokeStyle = "rgba(224,150,40,0.85)"; g.lineWidth = 7; g.beginPath(); g.arc(x, 40, w / 40, 0, Math.PI); g.stroke(); g.fillStyle = "rgba(230,160,50,0.5)"; g.fillRect(x - 3, 40, 6, 60 + (i % 3) * 30); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,100,70,${0.03 + (i % 5) * 0.01})`; g.fillRect((i * 97) % w, 60 + (i * 53) % (h - 60), 2 + (i % 7), 30 + (i % 13) * 4); }
  });
  b.mat("dome", new THREE.MeshStandardMaterial({ map: domeTex, roughness: 0.85, vertexColors: true }));
  k.enhance(b.mats.get("dome")!, "dome");
  b.cyl("paint", 0, 0, 0, 12.6, 12.8, 0.6, 48, { color: 0xdedad0 }); b.cyl("paint", 0, 0.6, 0, 11.6, 11.8, 0.6, 48, { color: WHITE });
  for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2; b.cyl("gold", Math.cos(a) * 12.25, 0.6, Math.sin(a) * 12.25, 0.16, 0.16, 0.42, 8); }
  const prof: [number, number][] = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, a = t * Math.PI / 2; prof.push([10.6 * Math.cos(a) + (i === 16 ? 0 : 0), 7.6 * Math.sin(a)]); }
  const dg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64);
  b.add("dome", dg, mat4(0, 1.2, 0), { uv: "keep" }); dg.dispose();
  /* harmika with the eyes, torana plates, cloth band */
  b.box("gold", 0, 8.4, 0, 4.6, 0.5, 4.6, 0);
  b.box("gold", 0, 8.9, 0, 4.2, 3.0, 4.2, 0);
  for (let f = 0; f < 4; f++) { const ry = f * Math.PI / 2; b.quad("atlas", Math.sin(ry) * 2.11, 10.35, Math.cos(ry) * 2.11, 4.1, 2.9, ry, { uv: art.eyes }); }
  const band = ["#1f4fd0", "#f0f0ec", "#d42a22", "#22a048", "#f2c41c"];
  for (let f = 0; f < 4; f++) for (let i = 0; i < 12; i++) { const ry = f * Math.PI / 2, off = -2.2 + (i + 0.5) * 4.4 / 12; b.box("fabric", Math.sin(ry) * 2.35 + Math.cos(ry) * off, 11.9, Math.cos(ry) * 2.35 - Math.sin(ry) * off, 0.37, 0.55, 0.08, ry, { color: new THREE.Color(band[i % 5]) }); }
  b.box("fabric", 0, 11.85, 0, 4.75, 0.12, 4.75, 0, { color: 0x22a048 });
  b.box("gold", 0, 12.3, 0, 4.4, 0.4, 4.4, 0);
  for (let f = 0; f < 4; f++) {
    const ry = f * Math.PI / 2, s = new THREE.Shape(); s.moveTo(-1.9, 0); s.lineTo(1.9, 0); s.lineTo(0, 2.6); s.lineTo(-1.9, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: false }); b.add("gold", g, mat4(Math.sin(ry) * 2.0, 12.7, Math.cos(ry) * 2.0, ry, 1, 1, 1, -0.32)); g.dispose();
  }
  /* thirteen rings, chhatra, gajur */
  let y = 12.7;
  for (let i = 0; i < 13; i++) { const rr = 2.2 - i * 0.11, h = 0.46; b.cyl("gold", 0, y, 0, rr - 0.08, rr, h * 0.72, 24); b.cyl("dark", 0, y + h * 0.72, 0, rr - 0.25, rr - 0.25, h * 0.28, 24, { color: 0x3a2a10 }); y += h; }
  b.cyl("gold", 0, y, 0, 0.6, 0.8, 0.4, 16);
  b.lathe("gold", [[0, 0], [1.7, 0], [1.75, 0.15], [1.2, 0.5], [0.5, 0.75], [0.3, 0.8]], 0, y + 0.35, 0, 24);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; b.box("gold", Math.cos(a) * 1.68, y - 0.15, Math.sin(a) * 1.68, 0.1, 0.5, 0.04, -a, {}); }
  b.lathe("gold", [[0, 0], [0.5, 0], [0.55, 0.3], [0.25, 0.7], [0.4, 1.1], [0.15, 1.7], [0.24, 2.0], [0.05, 3.0], [0, 3.1]], 0, y + 1.1, 0, 14);
  const spire = y + 4;
  /* five gold shrines (Pancha Buddha niches) on the dome's base */
  for (const a of [0.15, 1.42, 2.68, 3.95, 5.2]) {
    const x = Math.cos(a) * 10.6, z = Math.sin(a) * 10.6, ry = Math.PI / 2 - a;
    b.box("gold", x, 1.2, z, 2.0, 2.6, 1.6, ry); b.box("dark", x + Math.cos(a) * 0.82, 1.5, z + Math.sin(a) * 0.82, 1.1, 1.6, 0.02, ry, { color: 0x1a120a });
    b.hipRoof("gold", x, 3.8, z, 2.6, 2.2, 0.9, { ry }); b.lathe("gold", [[0, 0], [0.12, 0], [0, 0.6]], x, 4.7, z, 6);
  }
  b.collide(-12.3, 0, -5, 12.3, 20, 5); b.collide(-5, 0, -12.3, 5, 20, 12.3); b.collide(-8.8, 0, -8.8, 8.8, 20, 8.8);
  return spire;
}

function shikhara(k: Kit, x: number, z: number) {
  const { b } = k;
  b.box("paint", x, 0, z, 5.8, 1.0, 5.8, 0, { color: 0xe0dcd2 }); b.box("paint", x, 1.0, z, 4.8, 4.6, 4.8, 0, { color: WHITE });
  for (const f of [0, 1, 2, 3]) { const ry = f * Math.PI / 2; b.quad("dark", x + Math.sin(ry) * 2.41, 2.4, z + Math.cos(ry) * 2.41, 1.1, 2.2, ry, { color: 0x2a1c12 }); }
  const g = new THREE.LatheGeometry([[0, 0], [2.5, 0], [2.5, 1.0], [2.4, 4], [2.15, 8], [1.7, 11.5], [1.1, 14], [0.8, 15.2], [0.75, 15.6], [0, 15.8]].map(([r, h]) => new THREE.Vector2(r, h)), 48);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), f = 1 + 0.07 * Math.pow(Math.abs(Math.cos(a * 6)), 4) - 0.06 * Math.pow(Math.abs(Math.sin(a * 2)), 8); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
  g.computeVertexNormals(); b.add("paint", g, mat4(x, 5.6, z, Math.PI / 4), { color: WHITE }); g.dispose();
  b.cyl("paint", x, 5.6 + 13.4, z, 1.17, 1.25, 0.5, 24, { color: 0xb3302a });
  b.lathe("gold", [[0, 0], [0.9, 0], [0.95, 0.4], [0.5, 0.9], [0.35, 1.5], [0.2, 2.4], [0, 2.6]], x, 5.6 + 15.6, z, 16);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.lathe("paint", [[0, 0], [0.5, 0], [0.45, 1.0], [0.22, 1.9], [0, 2.1]], x + sx * 2.15, 5.6, z + sz * 2.15, 12, { color: WHITE });
  b.collide(x - 2.9, 0, z - 2.9, x + 2.9, 24, z + 2.9);
}

function vajra(k: Kit, x: number, z: number) {
  const { b } = k;
  b.cyl("stone", x, 0, z, 2.4, 2.5, 0.5, 24, { color: 0x6a645a }); b.cyl("gold", x, 0.5, z, 1.9, 2.0, 0.8, 24);
  b.lathe("gold", [[0, 0], [0.5, 0], [0.62, 0.35], [0.3, 0.7], [0.25, 0.75]], x, 1.3, z, 16, { ry: 0 });
  const half = (dir: number) => {
    b.add("gold", new THREE.SphereGeometry(0.35, 12, 8), mat4(x + dir * 0.6, 2.0, z));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const pts: V3[] = [[x + dir * 0.7, 2.0 + Math.cos(a) * 0.25, z + Math.sin(a) * 0.25], [x + dir * 1.2, 2.0 + Math.cos(a) * 0.55, z + Math.sin(a) * 0.55], [x + dir * 1.75, 2.0, z]]; b.tube("gold", pts, 0.07, 6); }
  };
  b.add("gold", new THREE.CylinderGeometry(0.22, 0.22, 1.2, 12), mat4(x, 2.0, z, 0, 1, 1, 1, 0, Math.PI / 2)); half(1); half(-1);
  b.collide(x - 2.5, 0, z - 2.5, x + 2.5, 2.6, z + 2.5);
}

function platform(k: Kit, art: Art) {
  const { b } = k;
  /* gold-roofed pagodas: Harati shrine (two tiers) + a smaller one */
  pagoda(k, art, -18, -18, { steps: 2, stepH: 0.45, base: 8.6, stepIn: 0.6, body: 5.2, tiers: 2, tierH: 3.4, roof0: 9.6, roofStep: 2.6, roofKey: "gold", seed: 3, bodyKey: "paint", bodyColor: 0xa83a2a, stairs: false, lit: 0.6 });
  pagoda(k, art, -10, 21, { steps: 1, stepH: 0.5, base: 6, stepIn: 0.5, body: 3.6, tiers: 1, tierH: 3.2, roof0: 6.4, roofStep: 0, roofKey: "gold", seed: 4, bodyKey: "paint", bodyColor: 0xa83a2a, stairs: false });
  /* monastery + rest houses round the rim */
  const mon = (x0: number, z0: number, x1: number, z1: number, face: number, seed: number, h = 7.2) => {
    b.aabb("paint", x0, 0, z0, x1, h, z1, { color: WHITE, uv: 4, collide: true });
    b.aabb("paint", x0 - 0.1, h - 1.0, z0 - 0.1, x1 + 0.1, h - 0.4, z1 + 0.1, { color: 0x7a1f1c });
    b.aabb("gold", x0 - 0.15, h - 0.4, z0 - 0.15, x1 + 0.15, h - 0.3, z1 + 0.15, {});
    const along = Math.abs(face) === 0 || Math.abs(face) === Math.PI;
    wallWindows(k, { cx: along ? (x0 + x1) / 2 : face > 0 ? x1 : x0, cz: along ? (face === 0 ? z1 : z0) : (z0 + z1) / 2, ry: face, len: (along ? x1 - x0 : z1 - z0) - 1, y0: 1.0, floors: 2, floorH: 3.0, bay: 2.4, ww: 1.1, wh: 1.4, frame: 0x7a1f1c, seed, lit: 0.55 });
    b.aabb("concrete", x0, h, z0, x1, h + 0.2, z1, { color: 0x8a8580 });
  };
  mon(-42, -16, -32, 16, Math.PI / 2, 1, 8.4); mon(-30, -40, -8, -32, 0, 2); mon(6, -42, 26, -33, 0, 3); mon(-30, 32, -6, 40, Math.PI, 4); mon(8, 33, 28, 41, Math.PI, 5);
  b.hipRoof("gold", -37, 8.6, 0, 6, 6, 2.2); b.lathe("gold", [[0, 0], [0.3, 0], [0, 1.4]], -37, 10.8, 0, 8);
  b.cyl("glow", -31.9, 2, 0, 0.01, 0.01, 0.01, 4, { color: lin(0) });
  /* prayer wheels along the monastery wall, butter-lamp house */
  for (let i = 0; i < 16; i++) { const z = -12 + i * 1.6; b.cyl("gold", -31.6, 0.7, z, 0.28, 0.28, 0.9, 12); b.cyl("dark", -31.6, 0, z, 0.06, 0.06, 1.8, 6, { color: 0x222222 }); }
  b.box("paint", 26, 0, 22, 4, 2.6, 3, 0, { color: 0x7a1f1c, collide: true }); b.quad("glowSoft", 26, 1.3, 23.51, 3.4, 1.6, 0, { color: lin(1.2, 0.7, 0.25) });
  k.pool([26, 1.4, 25], 5, 0xffa040, 0.8);
}

export async function build(ctx: SceneCtx): Promise<LocationScene> {
  const k = palette(ctx.renderer, { facadeSeed: 61, lit: 0.42 }), { b } = k;
  const art = newariArt(k);
  hill(k); const spire = stupa(k, art); shikhara(k, 18, -15); shikhara(k, 18, 15); vajra(k, 22, 0); platform(k, art);
  /* stone chaityas scattered round the platform */
  const r = rng(9), cm: THREE.Matrix4[] = [], spotsOK = (x: number, z: number) => { const d = Math.hypot(x, z); return d > 17.5 && d < 41 && !(x > 12 && Math.abs(z) < 5) && !(Math.abs(x - 18) < 5 && Math.abs(Math.abs(z) - 15) < 5) && !(x < -27) && !(Math.abs(x + 18) < 6 && Math.abs(z + 18) < 6) && !(Math.abs(x + 10) < 4.5 && Math.abs(z - 21) < 4.5) && !(z < -31 || z > 31); };
  for (let i = 0; i < 140 && cm.length < 70; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 22, x = Math.cos(a) * d, z = Math.sin(a) * d; if (!spotsOK(x, z)) continue; const s = 0.7 + r() * 0.9; cm.push(mat4(x, 0, z, r() * 6, s, s, s)); b.collide(x - 0.7 * s, 0, z - 0.7 * s, x + 0.7 * s, 2.7 * s, z + 0.7 * s); }
  const cg = chaityaGeo(); b.inst("stone", cg, cm); cg.dispose();
  /* prayer flags from the spire to poles round the rim */
  const flagMat = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0.06 }); b.own(flagMat); k.enhance(flagMat, "flag");
  const lines: [THREE.Vector3, THREE.Vector3, number][] = [], top = new THREE.Vector3(0, spire - 2.4, 0);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.08, d = 30 + (i % 3) * 3, x = Math.cos(a) * d, z = Math.sin(a) * d;
    b.cyl("metal", x, 0, z, 0.05, 0.07, 6.5, 6, { color: 0x4a4a4a }); b.collide(x - 0.1, 0, z - 0.1, x + 0.1, 6.5, z + 0.1);
    lines.push([top, new THREE.Vector3(x, 6.4, z), 1.5 + (i % 4) * 0.4]);
    if (i % 2) lines.push([new THREE.Vector3(x, 6.4, z), new THREE.Vector3(Math.cos(a + Math.PI / 10) * (30 + ((i + 1) % 3) * 3), 6.4, Math.sin(a + Math.PI / 10) * (30 + ((i + 1) % 3) * 3)), 0.6]);
  }
  const flags = new Flags(b.group, lines, 0.42, flagMat);
  /* valley below + far ridges */
  cityLights(k, b.group, { y: -72, rMin: 260, rMax: 2200, n: 16000, seed: 23, size: 5, rise: 0.06 });
  distantLights(k, 0, 0, 340, 520, 90, 71, -73);
  ridges(k, b.group, 2600, -80, 300, 0, Math.PI * 2, 5);
  b.aabb("dark", -4000, -74, -4000, 4000, -73.5, 4000, { color: 0x06080a });

  const fig: { p: V3; yaw: number }[] = [];
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = 18 + r() * 2.5; fig.push({ p: [Math.cos(a) * d, 0, Math.sin(a) * d], yaw: -a }); }
  crowd(b.group, b.mats.get("fabric")!, "casual", fig, 4, 3);
  crowd(b.group, b.mats.get("fabric")!, "monk", fig.slice(0, 8).map((f) => ({ p: [f.p[0] * 1.08, 0, f.p[2] * 1.08] as V3, yaw: f.yaw + 1 })), 6, 2);
  const people = new People(ctx), loop: V3[] = [];
  for (let i = 0; i < 20; i++) { const a = -(i / 20) * Math.PI * 2; loop.push([Math.cos(a) * 15.2, 0, Math.sin(a) * 15.2]); }
  await Promise.all([
    people.walk("monk", 81, loop, 0.9, 0.0, "kora-a"), people.walk("local", 82, loop, 1.0, 0.33, "kora-b"), people.walk("local", 83, loop, 0.95, 0.66, "kora-c"),
    people.stand("monk", 84, [14, 0, 6], -2, "idle"), people.stand("trekker", 85, [-20, 0, 10], 1.2, "look"),
  ]);

  k.pool([0, 4, 15], 14, 0xfff0d8, 0.6); k.pool([15, 4, 0], 14, 0xfff0d8, 0.5); k.pool([0, 4, -15], 14, 0xfff0d8, 0.45); k.pool([-15, 4, 0], 14, 0xfff0d8, 0.45);
  k.pool([18, 3, -15], 8, 0xffe6c0, 0.6); k.pool([18, 3, 15], 8, 0xffe6c0, 0.6); k.pool([-15, 3, -10], 8, 0xffd090, 0.6); k.pool([0, 13, 5], 9, 0xffd890, 0.45);
  const S1 = new THREE.SpotLight(0xfff2de, 1500, 140, 0.22, 0.6, 1.6); S1.position.set(-52, 40, 34); S1.target.position.set(0, 9, 0);
  const S2 = new THREE.SpotLight(0xffe2c0, 1100, 140, 0.24, 0.6, 1.6); S2.position.set(30, 44, -52); S2.target.position.set(0, 10, 0);
  const P1 = new THREE.PointLight(0xffd8a0, 30, 30, 1.6); P1.position.set(16, 8, 0);
  const P2 = new THREE.PointLight(0xffc880, 20, 22, 1.6); P2.position.set(-13, 8, -8);
  b.group.add(S1.target, S2.target);
  return assemble({
    id: "swayambhu", k, people, lights: [S1, S2, P1, P2],
    env: { fog: { color: 0x121a2a, near: 150, far: 1600 }, moon: 1.0, skyTint: 0x1a2440 },
    arrival: { cam: [-104, 62, 72], look: [0, 6, 0], fov: 48 },
    spawn: { pos: [44, 0, 3.5], yaw: -Math.PI / 2 },
    stands: { flyby: { pos: [0, spire + 1, 0], yaw: 0, act: "idle", outfit: "college", shot: { cam: [-46, 22, 34], look: [0, 10, 0], fov: 50 } } },
    paths: {},
    tick: (t) => flags.update(t),
    dispose: () => flags.dispose(),
  });
}
