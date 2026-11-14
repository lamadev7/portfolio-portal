import * as THREE from "three";
import type { Kit } from "./props";
import type { UVRect } from "./tex";
import { mat4, prep } from "./lib";
import { lin } from "./arch";
import { mergeAll } from "./props";
import { rng } from "./tex";

/* Newari architecture: stepped brick plinths, multi-tier pagodas with carved struts and red/gold eave trims, brick houses
   with latticed windows, stone chaityas, prayer flags, and the painted art they carry. */

export interface Art { lit: UVRect; dark: UVRect; door: UVRect; eyes: UVRect }

export function newariArt(k: Kit): Art {
  const lattice = (lit: boolean) => k.atlas.put(128, 160, (g, w, h) => {
    g.fillStyle = "#24140c"; g.fillRect(0, 0, w, h);
    g.fillStyle = lit ? "#ffb35c" : "#120a06"; g.fillRect(18, 22, w - 36, h - 44);
    g.strokeStyle = "#2a170c"; g.lineWidth = 5;
    for (let i = -10; i < 20; i++) { g.beginPath(); g.moveTo(18 + i * 12, 22); g.lineTo(18 + i * 12 + 120, 140); g.stroke(); g.beginPath(); g.moveTo(w - 18 - i * 12, 22); g.lineTo(w - 18 - i * 12 - 120, 140); g.stroke(); }
    g.strokeStyle = "#3a2214"; g.lineWidth = 8; g.strokeRect(14, 18, w - 28, h - 36);
    g.fillStyle = "#3a2214"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(14 + i * 20, 10, 7, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#c79a3a"; g.fillRect(14, h - 16, w - 28, 4);
  });
  const door = k.atlas.put(128, 200, (g, w, h) => {
    g.fillStyle = "#1e110a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#5a2a14"; g.fillRect(16, 50, w - 32, h - 50);
    g.strokeStyle = "#2a160b"; g.lineWidth = 3; for (let y = 60; y < h; y += 18) { g.strokeRect(22, y, w / 2 - 26, 14); g.strokeRect(w / 2 + 4, y, w / 2 - 26, 14); }
    g.fillStyle = "#c99a35"; g.beginPath(); g.moveTo(8, 50); g.quadraticCurveTo(w / 2, -10, w - 8, 50); g.lineTo(w - 8, 56); g.quadraticCurveTo(w / 2, 4, 8, 56); g.fill();
    g.beginPath(); g.arc(w / 2, 30, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#8a1a14"; g.fillRect(w / 2 - 2, 50, 4, h - 50);
  });
  const eyes = k.atlas.put(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#d9a23a"); gr.addColorStop(1, "#b07a22"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,50,10,0.5)"; g.lineWidth = 2; for (let y = 8; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (const s of [-1, 1]) {
      const cx = w / 2 + s * 62, cy = 130;
      g.fillStyle = "#1c2f6a"; g.beginPath(); g.ellipse(cx, cy - 34, 50, 12, 0, Math.PI, Math.PI * 2); g.fill();
      g.fillStyle = "#f4efe2"; g.beginPath(); g.moveTo(cx - 46, cy); g.quadraticCurveTo(cx, cy - 26, cx + 46, cy); g.quadraticCurveTo(cx, cy + 16, cx - 46, cy); g.fill();
      g.fillStyle = "#13204a"; g.beginPath(); g.arc(cx + s * -4, cy - 3, 11, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#13204a"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 46, cy); g.quadraticCurveTo(cx, cy - 26, cx + 46, cy); g.stroke();
      g.strokeStyle = "#c0202a"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx - 46, cy + 1); g.quadraticCurveTo(cx, cy + 16, cx + 46, cy + 1); g.stroke();
    }
    g.strokeStyle = "#1c2f6a"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(w / 2 - 6, 150); g.quadraticCurveTo(w / 2 + 16, 170, w / 2 - 2, 196); g.quadraticCurveTo(w / 2 - 14, 210, w / 2 + 8, 222); g.stroke();
    g.fillStyle = "#1c2f6a"; g.beginPath(); g.arc(w / 2, 92, 6, 0, Math.PI * 2); g.fill();
  });
  return { lit: lattice(true), dark: lattice(false), door, eyes };
}

/* carved window: wooden surround + lattice; lit ones glow through the screen */
export function newariWindow(k: Kit, art: Art, x: number, y: number, z: number, ry: number, w: number, h: number, lit: boolean) {
  const nx = Math.sin(ry), nz = Math.cos(ry);
  k.b.box("wood", x, y - h / 2 - 0.12, z, w + 0.36, h + 0.3, 0.12, ry, { color: 0x3a2214 });
  k.b.box("wood", x + nx * 0.08, y - h / 2 - 0.2, z + nz * 0.08, w + 0.5, 0.1, 0.2, ry, { color: 0x2a160c });
  k.b.box("wood", x + nx * 0.08, y + h / 2 + 0.12, z + nz * 0.08, w + 0.6, 0.12, 0.22, ry, { color: 0x2a160c });
  k.b.quad(lit ? "sign" : "atlas", x + nx * 0.07, y, z + nz * 0.07, w, h, ry, { uv: lit ? art.lit : art.dark, color: lit ? lin(0.5) : 0xffffff });
}

export interface PagodaOpts {
  steps: number; stepH: number; base: number; stepIn: number; body: number; tiers: number; tierH: number; roof0: number; roofStep: number; rise?: number;
  roofKey?: "roof" | "gold"; seed: number; bodyKey?: string; bodyColor?: number; stairs?: boolean; guardians?: boolean; lit?: number; ry?: number;
}

export function pagoda(k: Kit, art: Art, cx: number, cz: number, o: PagodaOpts) {
  const { b } = k, r = rng(o.seed), brickC = 0x9a6c5a;
  for (let i = 0; i < o.steps; i++) {
    const w = o.base - i * o.stepIn * 2, y = i * o.stepH;
    b.box("brick", cx, y, cz, w, o.stepH, w, 0, { uv: 2.6, color: brickC });
    b.box("stone", cx, y + o.stepH - 0.06, cz, w + 0.08, 0.08, w + 0.08, 0, { color: 0x8a8478 });
  }
  const top = o.steps * o.stepH;
  if (o.stairs !== false && o.steps > 0) {
    const sw = Math.max(2.2, o.body * 0.42);
    for (let i = 0; i < o.steps; i++) for (let s = 0; s < 3; s++) {
      const z = cz + o.base / 2 - i * o.stepIn - (s + 0.5) * o.stepIn / 3, y = i * o.stepH + (s + 1) * o.stepH / 3;
      b.aabb("stone", cx - sw / 2, 0, z - o.stepIn / 6, cx + sw / 2, y, z + o.stepIn / 6, { color: 0x7a746a, uv: 1.2 });
    }
    if (o.guardians) for (let i = 0; i < Math.min(5, o.steps); i++) for (const s of [-1, 1]) {
      const z = cz + o.base / 2 - i * o.stepIn - 0.4, y = (i + 1) * o.stepH, sc = 1.1 - i * 0.12;
      b.box("stone", cx + s * (sw / 2 + 0.45), y, z, 0.7 * sc, 0.25, 0.9 * sc, 0, { color: 0x6a645a });
      b.cyl("stone", cx + s * (sw / 2 + 0.45), y + 0.25, z - 0.05, 0.22 * sc, 0.28 * sc, 1.1 * sc, 8, { color: 0x5a5650 });
      b.add("stone", new THREE.SphereGeometry(0.2 * sc, 8, 6), mat4(cx + s * (sw / 2 + 0.45), y + 0.25 + 1.25 * sc, z - 0.05), { color: 0x5a5650 });
    }
  }
  let y = top, bw = o.body;
  for (let t = 0; t < o.tiers; t++) {
    const h = o.tierH * (t === 0 ? 1.25 : 0.8), rw = o.roof0 - t * o.roofStep;
    b.box(o.bodyKey ?? "brick", cx, y, cz, bw, h, bw, 0, { uv: 2.6, color: o.bodyColor ?? brickC });
    b.box("wood", cx, y + h - 0.35, cz, bw + 0.25, 0.35, bw + 0.25, 0, { color: 0x3a2214 });
    for (let f = 0; f < 4; f++) {
      const ry = f * Math.PI / 2, nx = Math.sin(ry), nz = Math.cos(ry), x = cx + nx * (bw / 2 + 0.01), z = cz + nz * (bw / 2 + 0.01);
      if (t === 0) { for (const off of bw > 5 ? [-1.3, 0, 1.3] : [0]) { const ox = Math.cos(ry) * off, oz = -Math.sin(ry) * off; b.quad("atlas", x + ox + nx * 0.04, y + 1.25, z + oz + nz * 0.04, 1.0, 2.4, ry, { uv: art.door }); b.box("wood", x + ox, y, z + oz, 1.3, 2.6, 0.14, ry, { color: 0x3a2214 }); } }
      else newariWindow(k, art, x, y + h * 0.5, z, ry, Math.min(1.6, bw * 0.3), Math.min(1.1, h * 0.45), r() < (o.lit ?? 0.3));
      const n = Math.max(3, Math.round(bw / 0.75)), ov = (rw - bw) / 2;
      for (let i = 0; i < n; i++) {
        const off = -bw / 2 + (i + 0.5) * bw / n, ox = Math.cos(ry) * off, oz = -Math.sin(ry) * off;
        const len = Math.hypot(ov * 0.85, 1.6), ang = Math.atan2(ov * 0.85, 1.6);
        b.add("wood", new THREE.BoxGeometry(0.16, len, 0.12), mat4(x + ox + nx * ov * 0.42, y + h - 0.85, z + oz + nz * ov * 0.42, ry, 1, 1, 1, ang), { color: 0x4a2a16 });
      }
    }
    const rise = (o.rise ?? 0.3) * rw;
    b.hipRoof(o.roofKey ?? "roof", cx, y + h + 0.1, cz, rw, rw, rise, { uv: 2, color: o.roofKey === "gold" ? 0xffffff : 0xe8a888, thick: 0.25 });
    const hr = rw / 2;
    for (let f = 0; f < 4; f++) {
      const ry = f * Math.PI / 2, nx = Math.sin(ry), nz = Math.cos(ry);
      b.box("fabric", cx + nx * (hr - 0.02), y + h + 0.1 - 0.62, cz + nz * (hr - 0.02), rw - 0.1, 0.36, 0.03, ry, { color: 0x4a1610 });
      b.box("wood", cx + nx * (hr + 0.01), y + h - 0.2, cz + nz * (hr + 0.01), rw, 0.08, 0.05, ry, { color: 0x2a160c });
    }
    y += h + 0.1 + rise * 0.55; bw = bw * (t === 0 ? 0.78 : 0.82);
  }
  const apex = y + (o.rise ?? 0.3) * (o.roof0 - (o.tiers - 1) * o.roofStep) * 0.45;
  b.lathe("gold", [[0, 0], [0.45, 0], [0.5, 0.3], [0.3, 0.6], [0.42, 0.9], [0.18, 1.4], [0.26, 1.6], [0.06, 2.4], [0, 2.5]], cx, apex - 0.4, cz, 12);
  b.collide(cx - o.base / 2, 0, cz - o.base / 2, cx + o.base / 2, apex, cz + o.base / 2);
  return { top, apex };
}

/* brick house with carved windows, wooden cornices, tiled gable roof, shopfronts on the street side */
export function newariHouse(k: Kit, art: Art, x0: number, z0: number, x1: number, z1: number, floors: number, front: "n" | "s" | "e" | "w", seed: number, plaster = false) {
  const { b } = k, r = rng(seed), H = floors * 2.7 + 0.4, col = plaster ? [0xe8e0d0, 0xd8c8b0, 0xe0d0c0][seed % 3] : 0xb46c4c;
  b.aabb(plaster ? "paint" : "brick", x0, 0, z0, x1, H, z1, { uv: 2.6, color: col });
  for (let f = 1; f < floors; f++) b.aabb("wood", x0 - 0.12, f * 2.7, z0 - 0.12, x1 + 0.12, f * 2.7 + 0.18, z1 + 0.12, { color: 0x3a2214 });
  const along = front === "n" || front === "s", len = along ? x1 - x0 : z1 - z0, ry = front === "s" ? 0 : front === "n" ? Math.PI : front === "e" ? Math.PI / 2 : -Math.PI / 2;
  const fx = front === "e" ? x1 : front === "w" ? x0 : (x0 + x1) / 2, fz = front === "s" ? z1 : front === "n" ? z0 : (z0 + z1) / 2, ux = Math.cos(ry), uz = -Math.sin(ry);
  const n = Math.max(1, Math.floor(len / 2.2));
  for (let f = 1; f < floors; f++) for (let i = 0; i < n; i++) {
    const off = -len / 2 + (i + 0.5) * len / n; newariWindow(k, art, fx + ux * off, f * 2.7 + 1.35, fz + uz * off, ry, f === floors - 1 && i === Math.floor(n / 2) ? 1.6 : 0.9, 1.0, r() < 0.32);
  }
  b.quad("shop", fx + Math.sin(ry) * 0.03, 1.2, fz + Math.cos(ry) * 0.03, len - 0.6, 2.2, ry, { uv: [16, 3], color: 0xffffff });
  b.gable("roof", (x0 + x1) / 2, H, (z0 + z1) / 2, (along ? x1 - x0 : z1 - z0) + 0.4, (along ? z1 - z0 : x1 - x0) + 1.6, 1.8, { ry: along ? 0 : Math.PI / 2, uv: 2, color: 0xb07050 });
  b.collide(x0, 0, z0, x1, H, z1);
}

export function chaityaGeo(s = 1) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4) => { parts.push(prep(g, m, { color: 0xffffff })); g.dispose(); };
  add(new THREE.BoxGeometry(1.4 * s, 0.3 * s, 1.4 * s), mat4(0, 0.15 * s, 0)); add(new THREE.BoxGeometry(1.1 * s, 0.3 * s, 1.1 * s), mat4(0, 0.45 * s, 0));
  add(new THREE.BoxGeometry(0.9 * s, 0.5 * s, 0.9 * s), mat4(0, 0.85 * s, 0));
  add(new THREE.LatheGeometry([[0, 0], [0.42, 0], [0.45, 0.2], [0.36, 0.45], [0.18, 0.6], [0, 0.62]].map(([a, c]) => new THREE.Vector2(a * s, c * s)), 10), mat4(0, 1.1 * s, 0));
  add(new THREE.BoxGeometry(0.3 * s, 0.25 * s, 0.3 * s), mat4(0, 1.82 * s, 0));
  add(new THREE.ConeGeometry(0.17 * s, 0.7 * s, 8), mat4(0, 2.3 * s, 0));
  add(new THREE.SphereGeometry(0.07 * s, 6, 4), mat4(0, 2.7 * s, 0));
  return mergeAll(parts);
}

/* strings of prayer flags (instanced, one draw) that sway in the breeze */
export class Flags {
  im: THREE.InstancedMesh; private base: { p: THREE.Vector3; q: THREE.Quaternion; ph: number }[] = []; private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private one = new THREE.Vector3(1, 1, 1); private tq = new THREE.Quaternion();
  constructor(parent: THREE.Object3D, lines: [THREE.Vector3, THREE.Vector3, number][], spacing = 0.45, mat: THREE.Material) {
    const cols = [0x2456d6, 0xf0f0ec, 0xd42a22, 0x22a048, 0xf2c41c];
    const g = new THREE.PlaneGeometry(0.3, 0.4); g.translate(0, -0.2, 0);
    const pts: { p: THREE.Vector3; yaw: number }[] = [];
    for (const [a, c, sag] of lines) {
      const n = Math.floor(a.distanceTo(c) / spacing), yaw = Math.atan2(c.x - a.x, c.z - a.z) + Math.PI / 2;
      for (let i = 1; i < n; i++) { const t = i / n, p = new THREE.Vector3().lerpVectors(a, c, t); p.y -= sag * 4 * t * (1 - t); pts.push({ p, yaw }); }
    }
    this.im = new THREE.InstancedMesh(prep(g), mat, pts.length); g.dispose();
    pts.forEach((s, i) => { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw); this.base.push({ p: s.p, q, ph: i * 0.37 }); this.im.setColorAt(i, new THREE.Color(cols[i % 5])); });
    this.im.castShadow = false; this.im.frustumCulled = false; parent.add(this.im); this.update(0);
  }
  update(t: number) {
    this.base.forEach((s, i) => { this.q.setFromEuler(this.e.set(Math.sin(t * 2.2 + s.ph) * 0.35 + 0.2, 0, Math.sin(t * 3.1 + s.ph * 1.7) * 0.08)); this.m.compose(s.p, this.tq.copy(s.q).multiply(this.q), this.one); this.im.setMatrixAt(i, this.m); });
    this.im.instanceMatrix.needsUpdate = true;
  }
  dispose() { this.im.geometry.dispose(); this.im.removeFromParent(); }
}
