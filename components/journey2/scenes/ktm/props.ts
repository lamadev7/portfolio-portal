import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../../contracts";
import { Builder, Pools, mat4, std, glow, prep } from "./lib";
import { Atlas, TexBank, P, facadeTextures, rng, radialTex, fitText, SANS, speckle, blotches } from "./tex";
import { Mats, type Patch } from "../kit/mat";
import { rbox } from "../kit/geo";

/* Shared Kathmandu palette + street furniture. Every scene registers the same material keys; empty batches cost nothing. */

export interface Kit {
  b: Builder; bank: TexBank; atlas: Atlas; pools: Pools; mats: Mats; pool(p: V3, r: number, color: number, k?: number): void;
  /** baked interior bounce: every ktm surface inside the box gets a soft ambient fill (brighter toward the ceiling) */
  room(min: V3, max: V3, color: number, k?: number): void;
  enhance<T extends THREE.Material>(m: T, key: string): T;
}

const ROOMS = 8;
function roomPatch(u: { min: { value: THREE.Vector3[] }; max: { value: THREE.Vector3[] }; col: { value: THREE.Color[] }; n: { value: number } }): Patch {
  return (sh) => {
    sh.uniforms.uRoomMin = u.min; sh.uniforms.uRoomMax = u.max; sh.uniforms.uRoomCol = u.col; sh.uniforms.uRoomN = u.n;
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nuniform vec3 uRoomMin[${ROOMS}]; uniform vec3 uRoomMax[${ROOMS}]; uniform vec3 uRoomCol[${ROOMS}]; uniform int uRoomN;`)
      .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
{ for (int i = 0; i < ${ROOMS}; i++) { if (i >= uRoomN) break;
    vec3 a = step(uRoomMin[i], vPW) * step(vPW, uRoomMax[i]);
    float h = clamp((vPW.y - uRoomMin[i].y) / max(uRoomMax[i].y - uRoomMin[i].y, 0.01), 0.0, 1.0);
    reflectedLight.indirectDiffuse += a.x * a.y * a.z * uRoomCol[i] * (0.7 + 0.6 * h) * material.diffuseColor; } }`);
  };
}

export function palette(renderer: THREE.WebGLRenderer, o: { facadeSeed?: number; lit?: number } = {}): Kit {
  const bank = new TexBank(renderer), b = new Builder(), atlas = new Atlas(bank);
  const t = (draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, s = 512) => bank.canvas(s, s, draw);
  const plaster = t(P.plaster), brickN = bank.normal(512, 512, P.brickH, 3);
  b.mat("paint", std({ map: plaster, roughness: 0.92 }));
  b.mat("clean", std({ map: t((g, w, h) => { g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, w, h); blotches(g, w, h, 20, 5, "rgba(120,120,110,0.05)", w * 0.25); speckle(g, w, h, 4000, 9, ["rgba(0,0,0,0.035)"], 1.2); }, 256), roughness: 0.8 }));
  b.mat("concrete", std({ map: t(P.concrete), roughness: 0.95 }));
  b.mat("asphalt", std({ map: t(P.asphalt), roughness: 0.9 }), false, true);
  b.mat("pavers", std({ map: t(P.pavers), roughness: 0.85 }), false, true);
  b.mat("brick", std({ map: t(P.brick), normalMap: brickN, roughness: 0.9 }));
  b.mat("herring", std({ map: t(P.herringbone), roughness: 0.9 }), false, true);
  b.mat("grass", std({ map: t(P.grass), roughness: 1 }), false, true);
  b.mat("stone", std({ map: t(P.stoneDark), roughness: 0.8 }));
  b.mat("tile", std({ map: t(P.tile), roughness: 0.35 }), false, true);
  b.mat("wood", std({ map: t(P.wood), roughness: 0.75 }));
  b.mat("roof", std({ map: t(P.roofTiles), roughness: 0.85 }));
  b.mat("tin", std({ map: t(P.metalRoof), roughness: 0.55, metalness: 0.4 }));
  b.mat("metal", std({ roughness: 0.35, metalness: 0.75 }));
  b.mat("gold", std({ color: 0xd9a441, roughness: 0.4, metalness: 0.3, emissive: 0x6a440e, emissiveIntensity: 1 }));
  b.mat("dark", std({ roughness: 0.6 }));
  b.mat("fabric", std({ roughness: 1 }));
  b.mat("foliage", std({ map: t((g, w, h) => { g.fillStyle = "#6c7a5c"; g.fillRect(0, 0, w, h); speckle(g, w, h, 30000, 7, ["#3c4a30", "#8a9a70", "#55643f", "#2e3a24"], 3); blotches(g, w, h, 30, 3, "rgba(20,26,12,0.4)", 50); }, 256), roughness: 0.95 }), true, true);
  b.mat("glass", std({ roughness: 0.06, metalness: 0.6, envMapIntensity: 1.2 }));
  b.mat("glow", glow(3), false, false);
  b.mat("glowSoft", glow(1.25), false, false);
  const f = facadeTextures(bank, { bays: 8, floors: 8, seed: o.facadeSeed ?? 5, lit: o.lit ?? 0.42 });
  b.mat("facade", std({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.9 }));
  const shop = shopTextures(bank);
  b.mat("shop", std({ map: shop.map, emissiveMap: shop.emissive, emissive: 0xffffff, emissiveIntensity: 1.8, roughness: 0.7 }));
  b.mat("sign", new THREE.MeshBasicMaterial({ map: atlas.tex, color: new THREE.Color(1.9, 1.9, 1.9) }), false, false);
  b.mat("signDim", std({ map: atlas.tex, roughness: 0.6, emissiveMap: atlas.tex, emissive: 0xffffff, emissiveIntensity: 0.35 }), true, true);
  b.mat("atlas", std({ map: atlas.tex, roughness: 0.7 }));
  b.mat("net", std({ map: bank.canvas(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#ddd"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); }, true, true), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 }), false, false);
  b.mat("glassT", std({ roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.42, depthWrite: false }), false, false);
  const mats = new Mats();
  const ru = { min: { value: Array.from({ length: ROOMS }, () => new THREE.Vector3(1e9, 1e9, 1e9)) }, max: { value: Array.from({ length: ROOMS }, () => new THREE.Vector3(-1e9, -1e9, -1e9)) }, col: { value: Array.from({ length: ROOMS }, () => new THREE.Color(0)) }, n: { value: 0 } };
  const patch = roomPatch(ru);
  const enhance = <T extends THREE.Material>(m: T, key: string) => mats.enhance(m, [patch], "ktm-r-" + key);
  for (const [key, m] of b.mats) if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) enhance(m, key);
  const pools = new Pools(radialTex(bank));
  const room = (mn: V3, mx: V3, c: number, kk = 1) => { const i = ru.n.value; if (i >= ROOMS) return; ru.min.value[i].set(...mn); ru.max.value[i].set(...mx); ru.col.value[i].set(c).multiplyScalar(kk); ru.n.value++; };
  return { b, bank, atlas, pools, mats, pool: (p, r, c, kk = 1) => mats.pool(p, r, c, kk), room, enhance };
}

function shopTextures(bank: TexBank) {
  const W = 1024, H = 128, n = 8, r = rng(211), lit: boolean[] = [];
  for (let i = 0; i < n; i++) lit.push(r() < 0.6);
  const map = bank.canvas(W, H, (g) => {
    for (let i = 0; i < n; i++) {
      const x = i * W / n, w = W / n;
      g.fillStyle = "#3c3a36"; g.fillRect(x, 0, w, H);
      if (lit[i]) {
        g.fillStyle = "#7a6650"; g.fillRect(x + 6, 18, w - 12, H - 18);
        for (let s = 0; s < 4; s++) { g.fillStyle = ["#a33", "#2a6", "#36a", "#cc4", "#a6a"][(r() * 5) | 0]; for (let k = 0; k < 10; k++) g.fillRect(x + 10 + k * (w - 20) / 10, 30 + s * 22, (w - 20) / 12, 14); }
      } else {
        g.fillStyle = "#6e6e6c"; g.fillRect(x + 6, 18, w - 12, H - 18);
        for (let y = 20; y < H; y += 5) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + 6, y, w - 12, 1.5); }
      }
      g.fillStyle = "#222"; g.fillRect(x, 0, w, 16);
    }
  });
  const emissive = bank.canvas(W, H, (g) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) if (lit[i]) {
      const x = i * W / n, w = W / n, gr = g.createLinearGradient(0, 18, 0, H);
      gr.addColorStop(0, "#fff2d0"); gr.addColorStop(1, "#7a5a30"); g.fillStyle = gr; g.fillRect(x + 6, 18, w - 12, H - 18);
    }
  });
  return { map, emissive };
}

const SHOPS = ["MOMO CENTER", "PHARMACY", "BOOK HOUSE", "TEA & SNACKS", "MOBILE CARE", "MART", "CYBER CAFE", "BAKERY", "किराना पसल", "मिठाई पसल", "STATIONERY", "COLD STORE", "TAILORS", "HARDWARE"];
const SIGN_BG = ["#b3261e", "#1d4e9e", "#0f7a4a", "#d4a017", "#7b2d8e", "#e05a1c", "#126d7a"];

export function shopSign(k: Kit, seed: number) {
  const r = rng(seed), name = SHOPS[(r() * SHOPS.length) | 0], bg = SIGN_BG[(r() * SIGN_BG.length) | 0];
  return k.atlas.put(256, 48, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; fitText(g, name, w / 2, h / 2 + 1, w - 16, SANS, 30); g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6); });
}

/* ---------- city fabric ---------- */

const PAINT = [0xe8e2d4, 0xd9cfb8, 0xe6c9a8, 0xc9d4dc, 0xe3d3c4, 0xd8b9a8, 0xb9c7b0, 0xefe6cf, 0xd1c2a2, 0xbfa58a];

export interface Lot { x0: number; z0: number; x1: number; z1: number; floors: number; color: number; shops?: "n" | "s" | "e" | "w" | null; tanks?: boolean }

/* a generic Kathmandu concrete building: facade walls with windows, flat roof with parapet, water tanks, ground-floor shops */
export function cityBuilding(k: Kit, L: Lot, seed: number, collide = true) {
  const { b } = k, r = rng(seed), h = L.floors * 3, w = L.x1 - L.x0, d = L.z1 - L.z0, cx = (L.x0 + L.x1) / 2, cz = (L.z0 + L.z1) / 2;
  const tile: [number, number] = [24, 24];
  b.quad("facade", cx, h / 2, L.z1, w, h, 0, { uv: tile, color: L.color });
  b.quad("facade", cx, h / 2, L.z0, w, h, Math.PI, { uv: tile, color: L.color });
  b.quad("facade", L.x1, h / 2, cz, d, h, Math.PI / 2, { uv: tile, color: L.color });
  b.quad("facade", L.x0, h / 2, cz, d, h, -Math.PI / 2, { uv: tile, color: L.color });
  b.aabb("concrete", L.x0, h - 0.05, L.z0, L.x1, h + 0.05, L.z1, { uv: 4, color: 0x8a8580 });
  b.aabb("paint", L.x0 - 0.05, h, L.z0 - 0.05, L.x1 + 0.05, h + 0.9, L.z0 + 0.15, { uv: 4, color: L.color });
  b.aabb("paint", L.x0 - 0.05, h, L.z1 - 0.15, L.x1 + 0.05, h + 0.9, L.z1 + 0.05, { uv: 4, color: L.color });
  b.aabb("paint", L.x0 - 0.05, h, L.z0, L.x0 + 0.15, h + 0.9, L.z1, { uv: 4, color: L.color });
  b.aabb("paint", L.x1 - 0.15, h, L.z0, L.x1 + 0.05, h + 0.9, L.z1, { uv: 4, color: L.color });
  for (let f = 1; f < L.floors; f++) if (r() < 0.5) b.aabb("paint", L.x0 - 0.12, f * 3 - 0.1, L.z1, L.x1 + 0.12, f * 3 + 0.08, L.z1 + 0.25, { uv: 4, color: L.color });
  if (L.tanks !== false) {
    const n = 1 + ((r() * 3) | 0);
    for (let i = 0; i < n; i++) { const tx = L.x0 + 1.2 + r() * Math.max(0.1, w - 2.4), tz = L.z0 + 1.2 + r() * Math.max(0.1, d - 2.4); b.cyl("dark", tx, h + 0.05, tz, 0.55, 0.62, 1.3, 10, { color: 0x1a1a1c }); b.cyl("dark", tx, h + 1.35, tz, 0.2, 0.5, 0.15, 10, { color: 0x1a1a1c }); }
    if (r() < 0.6) b.box("paint", L.x0 + 1.6, h, L.z0 + 1.6, 2.6, 2.6, 2.6, 0, { color: L.color, uv: 4 });
  }
  if (L.shops) {
    const sd = L.shops, len = sd === "n" || sd === "s" ? w : d;
    const ry = sd === "s" ? 0 : sd === "n" ? Math.PI : sd === "e" ? Math.PI / 2 : -Math.PI / 2;
    const px = sd === "e" ? L.x1 + 0.04 : sd === "w" ? L.x0 - 0.04 : cx, pz = sd === "s" ? L.z1 + 0.04 : sd === "n" ? L.z0 - 0.04 : cz;
    b.quad("shop", px, 1.5, pz, len - 0.4, 3, ry, { uv: [16, 3], color: 0xffffff });
    const ns = Math.max(1, Math.floor(len / 5));
    for (let i = 0; i < ns; i++) {
      if (r() < 0.25) continue;
      const off = -len / 2 + (i + 0.5) * len / ns, sx = px + Math.cos(ry) * off, sz = pz - Math.sin(ry) * off;
      const nx = Math.sin(ry), nz = Math.cos(ry);
      b.quad("sign", sx + nx * 0.12, 3.35, sz + nz * 0.12, Math.min(4, len / ns - 0.4), 0.75, ry, { uv: shopSign(k, seed * 31 + i) });
      b.box("dark", sx + nx * 0.07, 2.95, sz + nz * 0.07, Math.min(4.1, len / ns - 0.3), 0.8, 0.08, ry, { color: 0x222222 });
    }
  }
  if (collide) b.collide(L.x0, 0, L.z0, L.x1, h + 1, L.z1);
}

/* subdivide a block rectangle into lots along its long axis; `front` sides get shops */
export function cityBlock(k: Kit, x0: number, z0: number, x1: number, z1: number, seed: number, o: { floors?: [number, number]; front?: ("n" | "s" | "e" | "w")[]; gap?: number; collide?: boolean } = {}) {
  const r = rng(seed), along = (x1 - x0) >= (z1 - z0), fl = o.floors ?? [3, 6];
  const len = along ? x1 - x0 : z1 - z0; let p = 0;
  const depth = along ? z1 - z0 : x1 - x0, split = depth > 22;
  while (p < len - 4) {
    const lw = Math.min(len - p, 7 + r() * 7);
    const rows: [number, number][] = split ? [[0, depth / 2 - 0.3], [depth / 2 + 0.3, depth]] : [[0, depth]];
    rows.forEach(([a, c], ri) => {
      const L: Lot = along
        ? { x0: x0 + p + 0.15, x1: x0 + p + lw - 0.15, z0: z0 + a, z1: z0 + c, floors: fl[0] + ((r() * (fl[1] - fl[0] + 1)) | 0), color: PAINT[(r() * PAINT.length) | 0] }
        : { z0: z0 + p + 0.15, z1: z0 + p + lw - 0.15, x0: x0 + a, x1: x0 + c, floors: fl[0] + ((r() * (fl[1] - fl[0] + 1)) | 0), color: PAINT[(r() * PAINT.length) | 0] };
      const fr = o.front ?? [];
      const side = along ? (ri === 0 && fr.includes("n") ? "n" : (ri === rows.length - 1 && fr.includes("s")) ? "s" : null) : (ri === 0 && fr.includes("w") ? "w" : (ri === rows.length - 1 && fr.includes("e")) ? "e" : null);
      L.shops = side as Lot["shops"];
      cityBuilding(k, L, seed * 97 + Math.round(p * 13) + ri, o.collide ?? true);
    });
    p += lw + (o.gap ?? 0);
  }
}

/* ---------- street furniture ---------- */

export function streetLamp(k: Kit, x: number, z: number, ry: number, o: { h?: number; color?: number; pool?: number } = {}) {
  const h = o.h ?? 7, c = o.color ?? 0xfff1d6, dx = Math.sin(ry), dz = Math.cos(ry);
  k.b.cyl("metal", x, 0, z, 0.06, 0.09, h, 8, { color: 0x6c7076 });
  k.b.tube("metal", [[x, h - 0.1, z], [x + dx * 1.2, h + 0.15, z + dz * 1.2]], 0.04, 6, { color: 0x6c7076 });
  k.b.box("dark", x + dx * 1.35, h + 0.05, z + dz * 1.35, 0.32, 0.12, 0.6, ry, { color: 0x30333a });
  k.b.box("glow", x + dx * 1.35, h - 0.0, z + dz * 1.35, 0.26, 0.04, 0.5, ry, { color: c });
  k.pools.add(x + dx * 1.35, 0, z + dz * 1.35, o.pool ?? 5, c, 0.16);
}

/* concrete power pole with crossarm + transformer option; returns wire anchor points */
export function pole(k: Kit, x: number, z: number, ry: number, transformer = false): V3[] {
  const h = 9.5, dx = Math.cos(ry), dz = -Math.sin(ry);
  k.b.box("concrete", x, 0, z, 0.26, h, 0.26, ry, { uv: 2, color: 0xb0aca4 });
  k.b.box("metal", x, h - 0.6, z, 1.8, 0.1, 0.1, ry, { color: 0x555555 });
  k.b.box("metal", x, h - 1.4, z, 1.4, 0.1, 0.1, ry, { color: 0x555555 });
  if (transformer) { k.b.cyl("metal", x + dz * 0.5, 5.6, z - dx * 0.5, 0.35, 0.35, 1.1, 10, { color: 0x5a6266 }); k.b.box("dark", x + dz * 0.25, 5.4, z - dx * 0.25, 0.6, 0.1, 0.6, ry, { color: 0x333333 }); }
  for (let i = 0; i < 4; i++) k.b.cyl("dark", x + dx * (-0.8 + i * 0.53), h - 0.5, z + dz * (-0.8 + i * 0.53), 0.04, 0.05, 0.12, 6, { color: 0xdddddd });
  const a: V3[] = [];
  for (let i = 0; i < 4; i++) a.push([x + dx * (-0.8 + i * 0.53), h - 0.4, z + dz * (-0.8 + i * 0.53)]);
  for (let i = 0; i < 3; i++) a.push([x + dx * (-0.6 + i * 0.6), h - 1.3, z + dz * (-0.6 + i * 0.6)]);
  for (let i = 0; i < 4; i++) a.push([x + dx * 0.13 * (i % 2 ? 1 : -1), 6.2 - i * 0.35, z + dz * 0.13 * (i % 2 ? 1 : -1)]);
  return a;
}

export function poleLine(k: Kit, pts: [number, number][], ry: number, seed: number) {
  const r = rng(seed); let prev: V3[] | null = null;
  pts.forEach(([x, z], i) => {
    const a = pole(k, x, z, ry, i % 3 === 1);
    if (prev) a.forEach((p, j) => { if (r() < 0.9) k.b.wire("dark", prev![j], p, 0.35 + r() * 0.5, j > 6 ? 0.016 : 0.009, { color: 0x111111 }); });
    if (prev && r() < 0.5) k.b.wire("dark", prev[8], a[9], 0.9, 0.025, { color: 0x111111 });
    prev = a;
  });
}

export function tree(k: Kit, x: number, z: number, s: number, seed: number, y = 0, detail = 2) {
  const r = rng(seed), h = (3.2 + r() * 2.5) * s;
  k.b.cyl("wood", x, y, z, 0.12 * s, 0.22 * s, h, 7, { color: 0x6a5a48 });
  const blobs = 4 + ((r() * 4) | 0);
  for (let i = 0; i < blobs; i++) {
    const a = r() * Math.PI * 2, d = (i === 0 ? 0 : 0.6 + r() * 1.2) * s, rr = (1.1 + r() * 0.9) * s;
    const g = new THREE.IcosahedronGeometry(rr, detail), p = g.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < p.count; j++) { const vx = p.getX(j), vy = p.getY(j), vz = p.getZ(j), n = 1 + 0.18 * Math.sin(vx * 3.1 + seed) * Math.cos(vz * 2.7 + i) + 0.1 * Math.sin(vy * 5.3); p.setXYZ(j, vx * n, vy * n * 0.85, vz * n); }
    g.computeVertexNormals();
    const c = new THREE.Color().setHSL(0.24 + r() * 0.06, 0.35, 0.16 + r() * 0.08);
    k.b.add("foliage", g, mat4(x + Math.cos(a) * d, y + h + (r() - 0.2) * 1.2 * s, z + Math.sin(a) * d), { color: c, uv: 1.5 }); g.dispose();
  }
}

export function hedge(k: Kit, x0: number, z0: number, x1: number, z1: number, h = 1.4, wall = 0.6) {
  const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  k.b.aabb("paint", x0, 0, z0, x1, wall, z1, { uv: 2, color: 0xcfcac0 });
  const len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0), n = Math.max(1, Math.round(len / 3)), dep = (along ? Math.abs(z1 - z0) : Math.abs(x1 - x0)) + 0.3;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, cx = x0 + (x1 - x0) * t, cz = z0 + (z1 - z0) * t, hh = h * (0.92 + ((i * 37) % 7) / 50);
    const g = rbox(len / n + 0.06, hh, dep, 0.28, 2);
    k.b.add("foliage", g, mat4(cx, wall + hh / 2 - 0.05, cz, along ? 0 : Math.PI / 2), { color: new THREE.Color().setHSL(0.27, 0.42, 0.2 + (i % 3) * 0.015), uv: 0.8 }); g.dispose();
  }
  k.b.collide(Math.min(x0, x1), 0, Math.min(z0, z1), Math.max(x0, x1), wall + h, Math.max(z0, z1));
}

/* ---------- vehicles (geometry only; scenes place them statically or instance them for traffic) ---------- */

export function scooterGeo(color: number) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4, c: number) => { parts.push(prep(g, m, { color: c })); g.dispose(); };
  const wheel = (z: number) => add(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 14), mat4(0, 0.24, z, 0, 1, 1, 1, 0, Math.PI / 2), 0x151515);
  wheel(0.62); wheel(-0.62);
  add(new THREE.BoxGeometry(0.36, 0.34, 0.9), mat4(0, 0.52, -0.2), color);
  add(new THREE.BoxGeometry(0.32, 0.12, 0.62), mat4(0, 0.76, -0.28), 0x1b1b1b);
  add(new THREE.BoxGeometry(0.3, 0.06, 0.5), mat4(0, 0.34, 0.25), 0x2a2a2a);
  add(new THREE.BoxGeometry(0.28, 0.7, 0.14), mat4(0, 0.7, 0.55, 0, 1, 1, 1, -0.3), color);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), mat4(0, 1.08, 0.62, 0, 1, 1, 1, 0, Math.PI / 2), 0x222222);
  const g = mergeAll(parts); return g;
}

export function carGeo(color: number, len = 4.2, wid = 1.75, hgt = 1.45) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4, c: number) => { parts.push(prep(g, m, { color: c })); g.dispose(); };
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) add(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 14), mat4(x * (wid / 2 - 0.12), 0.31, z * (len / 2 - 0.75), 0, 1, 1, 1, 0, Math.PI / 2), 0x121212);
  add(new THREE.BoxGeometry(wid, hgt * 0.45, len), mat4(0, 0.3 + hgt * 0.225, 0), color);
  add(new THREE.BoxGeometry(wid * 0.9, hgt * 0.38, len * 0.52), mat4(0, 0.3 + hgt * 0.45 + hgt * 0.19, -len * 0.06), color);
  add(new THREE.BoxGeometry(wid * 0.92, hgt * 0.3, len * 0.5), mat4(0, 0.3 + hgt * 0.45 + hgt * 0.18, -len * 0.06), 0x10161c);
  return mergeAll(parts);
}

export function mergeAll(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts, false)!; parts.forEach((p) => p.dispose()); return g;
}

/* Moving traffic along straight lanes: instanced bodies + headlight glow + moving light pools */
export class Traffic {
  private items: { lane: number; s: number; v: number; kind: number }[] = [];
  private ims: THREE.InstancedMesh[] = [];
  private heads: THREE.InstancedMesh; private pools: THREE.InstancedMesh; private tails: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  constructor(private parent: THREE.Object3D, private lanes: { a: V3; b: V3 }[], kinds: { geo: THREE.BufferGeometry; mat: THREE.Material; n: number; v: [number, number]; lamp: number }[], seed: number, poolTex: THREE.Texture) {
    const r = rng(seed); let total = 0;
    kinds.forEach((K, ki) => {
      const im = new THREE.InstancedMesh(K.geo, K.mat, K.n); im.castShadow = true; im.frustumCulled = false; parent.add(im); this.ims.push(im);
      for (let i = 0; i < K.n; i++) this.items.push({ lane: (r() * lanes.length) | 0, s: r(), v: K.v[0] + r() * (K.v[1] - K.v[0]), kind: ki });
      total += K.n;
    });
    const hg = new THREE.SphereGeometry(0.09, 8, 6); this.heads = new THREE.InstancedMesh(hg, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 4) }), total);
    const tg = new THREE.BoxGeometry(0.16, 0.06, 0.03); this.tails = new THREE.InstancedMesh(tg, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.15, 0.1) }), total);
    const pg = new THREE.PlaneGeometry(3, 7); pg.rotateX(-Math.PI / 2); pg.translate(0, 0.03, 4);
    this.pools = new THREE.InstancedMesh(pg, new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(0.55, 0.5, 0.42), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), total);
    for (const im of [this.heads, this.tails, this.pools]) { im.frustumCulled = false; parent.add(im); }
    this.kinds = kinds; this.update(0);
  }
  private kinds: { lamp: number; n: number }[];
  update(dt: number) {
    const cnt = this.ims.map(() => 0); let hi = 0;
    const q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), off = new THREE.Vector3();
    for (const it of this.items) {
      const L = this.lanes[it.lane], len = Math.hypot(L.b[0] - L.a[0], L.b[2] - L.a[2]);
      it.s = (it.s + it.v * dt / len) % 1;
      const yaw = Math.atan2(L.b[0] - L.a[0], L.b[2] - L.a[2]);
      p.set(L.a[0] + (L.b[0] - L.a[0]) * it.s, L.a[1], L.a[2] + (L.b[2] - L.a[2]) * it.s);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
      this.m.compose(p, q, one); this.ims[it.kind].setMatrixAt(cnt[it.kind]++, this.m);
      const lamp = this.kinds[it.kind].lamp;
      off.set(0, lamp, it.kind === 0 ? 0.62 : 2.1).applyQuaternion(q).add(p); this.m.compose(off, q, one); this.heads.setMatrixAt(hi, this.m);
      off.set(0, lamp - 0.1, it.kind === 0 ? -0.75 : -2.1).applyQuaternion(q).add(p); this.m.compose(off, q, one); this.tails.setMatrixAt(hi, this.m);
      this.m.compose(p, q, one); this.pools.setMatrixAt(hi, this.m); hi++;
    }
    for (const im of [...this.ims, this.heads, this.tails, this.pools]) im.instanceMatrix.needsUpdate = true;
  }
  dispose() { for (const im of [...this.ims, this.heads, this.tails, this.pools]) { im.geometry.dispose(); (im.material as THREE.Material).dispose(); im.removeFromParent(); } }
}

/* ---------- interior furniture ---------- */

export function deskRow(k: Kit, x: number, z: number, n: number, o: { ry?: number; pitch?: number; w?: number; d?: number; color?: number; legs?: number } = {}) {
  const ry = o.ry ?? 0, w = o.w ?? 1.4, d = o.d ?? 0.75, pitch = o.pitch ?? w;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * pitch, cx = x + Math.cos(ry) * off, cz = z - Math.sin(ry) * off;
    k.b.box("paint", cx, 0.72, cz, w - 0.04, 0.04, d, ry, { color: o.color ?? 0xf2f2ee });
    for (const s of [-1, 1]) k.b.box("metal", cx + Math.cos(ry) * s * (w / 2 - 0.06), 0, cz - Math.sin(ry) * s * (w / 2 - 0.06), 0.05, 0.72, d * 0.8, ry, { color: o.legs ?? 0x2c2c2e });
  }
}

export function chairGeo(seat: number, back: number) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4, c: number) => { parts.push(prep(g, m, { color: c })); g.dispose(); };
  add(new THREE.BoxGeometry(0.48, 0.07, 0.46), mat4(0, 0.47, 0), seat);
  add(new THREE.BoxGeometry(0.46, 0.62, 0.05), mat4(0, 0.86, -0.24, 0, 1, 1, 1, -0.12), back);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), mat4(0, 0.25, 0), 0x333333);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(new THREE.BoxGeometry(0.04, 0.03, 0.3), mat4(Math.sin(a) * 0.15, 0.05, Math.cos(a) * 0.15, a), 0x2a2a2a); add(new THREE.SphereGeometry(0.03, 6, 4), mat4(Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29), 0x111111); }
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.04, 0.22, 0.3), mat4(s * 0.26, 0.6, -0.02), 0x222222);
  return mergeAll(parts);
}

export function monitor(k: Kit, x: number, y: number, z: number, ry: number, w: number, h: number, screen: import("./tex").UVRect | null, o: { arm?: boolean } = {}) {
  const dx = Math.sin(ry), dz = Math.cos(ry);
  k.b.box("dark", x, y, z, 0.22, 0.015, 0.18, ry, { color: 0x1c1c1e });
  k.b.box("dark", x - dx * 0.04, y, z - dz * 0.04, 0.05, (o.arm ? 0.12 : 0.1) + h / 2, 0.04, ry, { color: 0x1c1c1e });
  k.b.box("dark", x, y + 0.1, z, w, h, 0.03, ry, { color: 0x111114 });
  if (screen) k.b.quad("sign", x + dx * 0.017, y + 0.1 + h / 2, z + dz * 0.017, w - 0.02, h - 0.02, ry, { uv: screen });
  else k.b.quad("glowSoft", x + dx * 0.017, y + 0.1 + h / 2, z + dz * 0.017, w - 0.02, h - 0.02, ry, { color: 0x203040 });
}

export function plant(k: Kit, x: number, y: number, z: number, s = 1, seed = 1) {
  const r = rng(seed);
  k.b.cyl("paint", x, y, z, 0.2 * s, 0.15 * s, 0.35 * s, 10, { color: 0xeeeeea });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.IcosahedronGeometry(0.18 * s, 1);
    k.b.add("foliage", g, mat4(x + (r() - 0.5) * 0.25 * s, y + 0.45 * s + r() * 0.2 * s, z + (r() - 0.5) * 0.25 * s), { color: new THREE.Color().setHSL(0.28, 0.5, 0.2 + r() * 0.08) }); g.dispose();
  }
}

/* sky glow of the valley + distant ridges, for windows that look out at the city */
export function distantLights(k: Kit, cx: number, cz: number, rMin: number, rMax: number, n: number, seed: number, y0 = 0) {
  const r = rng(seed), g = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = rMin + r() * (rMax - rMin), w = 6 + r() * 12, h = 6 + r() * 20, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    k.b.add("facade", g, mat4(x, y0 + h / 2, z, r() * Math.PI, w, h, w * (0.6 + r() * 0.6)), { uv: [24, 24], color: PAINT[(r() * PAINT.length) | 0] });
  }
  g.dispose();
}

/* the valley at night seen from above: sodium + LED pinpoints as one Points draw */
export function cityLights(k: Kit, parent: THREE.Object3D, o: { y: number; rMin: number; rMax: number; n: number; seed: number; a0?: number; a1?: number; cx?: number; cz?: number; size?: number; rise?: number }) {
  const pos = new Float32Array(o.n * 3), col = new Float32Array(o.n * 3), r = rng(o.seed);
  const tones = [[1.0, 0.72, 0.38], [1.0, 0.85, 0.6], [0.85, 0.92, 1.0], [1.0, 0.6, 0.3]];
  for (let i = 0; i < o.n; i++) {
    const a = (o.a0 ?? 0) + r() * ((o.a1 ?? Math.PI * 2) - (o.a0 ?? 0)), d = o.rMin + Math.pow(r(), 0.7) * (o.rMax - o.rMin);
    pos[i * 3] = (o.cx ?? 0) + Math.sin(a) * d; pos[i * 3 + 1] = o.y + Math.max(0, d - o.rMax * 0.75) * (o.rise ?? 0.1) + r() * 2; pos[i * 3 + 2] = (o.cz ?? 0) - Math.cos(a) * d;
    const t = tones[(r() * tones.length) | 0], k2 = 0.8 + r() * 1.6; col[i * 3] = t[0] * k2; col[i * 3 + 1] = t[1] * k2; col[i * 3 + 2] = t[2] * k2;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const tex = k.bank.canvas(32, 32, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "#fff"); gr.addColorStop(0.3, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, false, false);
  const m = new THREE.PointsMaterial({ size: o.size ?? 4, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; parent.add(p); k.b.own(g); k.b.own(m);
  return p;
}

/* dark mountain silhouette ring on the horizon (part of a cylinder) */
export function ridges(k: Kit, parent: THREE.Object3D, R: number, y: number, h: number, a0: number, len: number, seed: number) {
  const g = new THREE.CylinderGeometry(R, R, h, 96, 1, true, a0, len), p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, h / 2 * (0.35 + 0.35 * Math.sin(a * 7 + seed) + 0.25 * Math.sin(a * 17 + seed * 2) + 0.15 * Math.sin(a * 3.1))); }
  const m = new THREE.MeshBasicMaterial({ color: 0x070a12, side: THREE.BackSide, fog: false });
  const mesh = new THREE.Mesh(g, m); mesh.position.y = y + h / 2; parent.add(mesh); k.b.own(g); k.b.own(m);
  return mesh;
}
