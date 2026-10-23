import * as THREE from "three";
import { box, boxB, cyl, mat4, type Batch } from "./geo";
import { rng } from "./tex";
import type { SceneKit } from "./scene";

/* building parts in a local frame (origin = footprint centre on the ground, +z = front): RCC frame blocks with bays,
   windows (dark glass or lit interiors), doors, railings, stairs, rebar stubs, water tanks */

/** a window quad: lit (atlas cell 0..3) or dark glass; frame + sill in `frame` colour */
export function windowAt(b: Batch, x: number, y: number, z: number, w: number, h: number, ry: number, o: { frame?: number; lit?: number; cell?: number; tint?: number; panes?: number; bars?: boolean; simple?: boolean } = {}) {
  const fr = o.frame ?? 0xf2f0ea, ft = 0.065, fd = 0.09;
  b.push(mat4(x, y, z, ry));
  if (o.simple) {
    const g0 = new THREE.PlaneGeometry(w, h), u0 = g0.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u0.count; i++) u0.setX(i, ((o.cell ?? 0) + 0.06 + u0.getX(i) * 0.88) * 0.25);
    if (o.lit) b.add(g0, "winLit", o.tint ?? 0xffffff, mat4(0, 0, 0.03), false, o.lit); else b.add(new THREE.PlaneGeometry(w, h), "glass", o.tint ?? 0x1c2430, mat4(0, 0, 0.03), false);
    b.add(new THREE.PlaneGeometry(w + 0.16, h + 0.16), "paint", fr, mat4(0, 0, 0.015), false); b.add(box(w + 0.2, 0.07, 0.14), "paint", fr, mat4(0, -h / 2 - 0.05, 0.07), false);
    b.pop(); return;
  }
  const g = new THREE.PlaneGeometry(w, h), cell = o.cell ?? 0, uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (cell + 0.06 + uv.getX(i) * 0.88) * 0.25);
  if (o.lit) b.add(g, "winLit", o.tint ?? 0xffffff, mat4(0, 0, 0.012), false, o.lit);
  else b.add(new THREE.PlaneGeometry(w, h), "glass", o.tint ?? 0x1c2430, mat4(0, 0, 0.012), false);
  b.add(box(w + ft * 2, ft, fd), "paint", fr, mat4(0, h / 2 + ft / 2, fd / 2), false);
  b.add(box(w + ft * 2 + 0.12, 0.07, fd + 0.08), "paint", fr, mat4(0, -h / 2 - 0.035, (fd + 0.08) / 2), false);
  b.add(box(ft, h, fd), "paint", fr, mat4(-w / 2 - ft / 2, 0, fd / 2), false); b.add(box(ft, h, fd), "paint", fr, mat4(w / 2 + ft / 2, 0, fd / 2), false);
  const np = o.panes ?? 3; for (let i = 1; i < np; i++) b.add(box(0.04, h, 0.04), "paint", fr, mat4(-w / 2 + (w * i) / np, 0, 0.03), false);
  b.add(box(w, 0.04, 0.04), "paint", fr, mat4(0, h * 0.2, 0.03), false);
  if (o.bars) for (let i = 1; i < 7; i++) b.add(box(0.016, h, 0.016), "metal", 0x2a2c30, mat4(-w / 2 + (w * i) / 7, 0, 0.07), false);
  b.pop();
}

export function door(b: Batch, x: number, y: number, z: number, w: number, h: number, ry: number, color = 0x6a4a2e, frame = 0xf2f0ea, open = 0) {
  b.push(mat4(x, y, z, ry));
  b.add(box(w + 0.16, 0.08, 0.1), "paint", frame, mat4(0, h + 0.04, 0)); b.add(box(0.08, h, 0.1), "paint", frame, mat4(-w / 2 - 0.04, h / 2, 0)); b.add(box(0.08, h, 0.1), "paint", frame, mat4(w / 2 + 0.04, h / 2, 0));
  if (open > 0) { b.add(box(w, h, 0.02), "matte", 0x0b0b0d, mat4(0, h / 2, -0.06), false); b.add(box(w / 2, h, 0.04), "wood", color, mat4(-w / 2 - Math.sin(open) * w / 4 + w / 4 * Math.cos(open) - w / 4, h / 2, Math.sin(open) * w / 4, open)); }
  else { b.add(box(w / 2 - 0.01, h, 0.05), "wood", color, mat4(-w / 4, h / 2, -0.02)); b.add(box(w / 2 - 0.01, h, 0.05), "wood", color, mat4(w / 4, h / 2, -0.02)); }
  b.pop();
}

/** railing along +x from (x0) to (x1) at height y, local frame */
export function railing(b: Batch, x0: number, x1: number, y: number, z: number, h = 0.95, color = 0xe8e6e0, kind: "steel" | "concrete" | "wood" = "steel") {
  const L = x1 - x0;
  if (kind === "concrete") { b.add(boxB(L, h, 0.12), "plaster", color, mat4((x0 + x1) / 2, y, z)); b.add(box(L + 0.06, 0.07, 0.2), "plaster", color, mat4((x0 + x1) / 2, y + h, z)); return; }
  const mat = kind === "wood" ? "wood" : "metal", r = kind === "wood" ? 0.05 : 0.022;
  b.add(box(L, r * 2, r * 2), mat, color, mat4((x0 + x1) / 2, y + h, z), false); b.add(box(L, r * 1.4, r * 1.4), mat, color, mat4((x0 + x1) / 2, y + h * 0.45, z), false);
  const n = Math.max(2, Math.round(L / (kind === "wood" ? 0.9 : 0.14)));
  for (let i = 0; i <= n; i++) b.add(box(r * (i % 6 === 0 ? 2 : 1), h, r * (i % 6 === 0 ? 2 : 1)), mat, color, mat4(x0 + (L * i) / n, y + h / 2, z), false);
}

/** straight stair flight rising along +z from (x,y,z): n steps of rise/run */
export function stairs(b: Batch, x: number, y: number, z: number, w: number, n: number, rise: number, run: number, key = "concrete", color = 0xc8c4bc, ry = 0) {
  b.push(mat4(x, y, z, ry));
  for (let i = 0; i < n; i++) b.add(box(w, rise * (i + 1), run), key, color, mat4(0, (rise * (i + 1)) / 2, run * i + run / 2));
  b.pop();
}

export function rebar(b: Batch, x: number, y: number, z: number, n = 4) {
  for (let i = 0; i < n; i++) b.add(cyl(0.012, 0.012, 0.7 + (i % 3) * 0.15, 4), "metal", 0x4a3426, mat4(x + ((i % 2) - 0.5) * 0.22, y + 0.35, z + (Math.floor(i / 2) - 0.5) * 0.22, 0, (i - 1.5) * 0.06, (i % 2 - 0.5) * 0.1), false);
}

export function waterTank(b: Batch, x: number, y: number, z: number, color = 0x2c2c2e) {
  b.add(boxB(1.6, 0.5, 1.6), "concrete", 0xb8b4ac, mat4(x, y, z));
  b.add(cyl(0.6, 0.62, 1.3, 14), color === 0x2c2c2e ? "matte" : "paint", color, mat4(x, y + 0.5 + 0.65, z));
  b.add(cyl(0.18, 0.18, 0.08, 10), "matte", color, mat4(x, y + 1.84, z));
}

export interface RccSpec {
  w: number; d: number; floors: number; fh?: number; plinth?: number; bay?: number;
  wall: number; band?: number; frame?: number;
  win?: { perBay: number; w: number; h: number; sill: number };
  /** fraction of lit windows, and the atlas cell they use */
  lit?: number; litCell?: number; litTint?: number; litLevel?: number;
  back?: "corridor" | "windows"; sides?: boolean; parapet?: number; rebar?: boolean; seed?: number;
  /** bays (0-based) on the front that are an open stair core instead of rooms */
  stairBay?: number;
  doors?: number[];
  simple?: boolean;
}

/** reinforced-concrete frame block, painted infill between white columns and slab bands, windows all round */
export function rccBlock(k: SceneKit, b: Batch, at: THREE.Matrix4, s: RccSpec) {
  const fh = s.fh ?? 3.3, pl = s.plinth ?? 0.45, H = pl + s.floors * fh, bay = s.bay ?? 4.2, nb = Math.max(1, Math.round(s.w / bay)), bw = s.w / nb;
  const band = s.band ?? 0xf3f1ec, R = rng(s.seed ?? 1), win = s.win ?? { perBay: 2, w: 1.35, h: 1.25, sill: 0.95 };
  const corridor = s.back === "corridor", cd = corridor ? 2.2 : 0, D = s.d, core = D - cd;
  b.push(at);
  /* plinth + body (the room block sits at the front; an open corridor runs along the back) */
  b.add(boxB(s.w + 0.3, pl, D + 0.3), "concrete", 0x9a958c, mat4(0, 0, 0));
  b.add(boxB(s.w, H - pl, core), "plaster", s.wall, mat4(0, pl, D / 2 - core / 2));
  /* slab bands, columns, parapet */
  for (let f = 1; f <= s.floors; f++) b.add(box(s.w + 0.24, 0.32, D + 0.24), "plaster", band, mat4(0, pl + f * fh - 0.16, 0));
  b.add(boxB(s.w + 0.24, s.parapet ?? 0.9, 0.16), "plaster", band, mat4(0, H, D / 2 + 0.04)); b.add(boxB(s.w + 0.24, s.parapet ?? 0.9, 0.16), "plaster", band, mat4(0, H, -D / 2 - 0.04));
  b.add(boxB(0.16, s.parapet ?? 0.9, D + 0.24), "plaster", band, mat4(-s.w / 2 - 0.04, H, 0)); b.add(boxB(0.16, s.parapet ?? 0.9, D + 0.24), "plaster", band, mat4(s.w / 2 + 0.04, H, 0));
  b.add(box(s.w, 0.12, D), "concrete", 0x8d8a84, mat4(0, H + 0.02, 0));
  for (let i = 0; i <= nb; i++) {
    const x = -s.w / 2 + i * bw;
    for (const z of corridor ? [D / 2, D / 2 - core, -D / 2] : [D / 2, -D / 2]) { b.add(boxB(0.46, H - pl, 0.46), "plaster", band, mat4(x, pl, z + (z === D / 2 ? -0.15 : z === -D / 2 ? 0.15 : 0))); if (s.rebar !== false) rebar(b, x, H + 0.02, z + (z > 0 ? -0.15 : 0.15)); }
  }
  if (s.sides !== false) for (const sx of [-1, 1]) for (let f = 0; f < s.floors; f++) { const y = pl + f * fh + win.sill + win.h / 2; windowAt(b, sx * (s.w / 2 + 0.005), y, D / 2 - core / 2, win.w, win.h, sx * Math.PI / 2, { frame: s.frame, lit: R() < (s.lit ?? 0) ? s.litLevel ?? 2.4 : 0, cell: s.litCell ?? 0, tint: s.litTint, simple: s.simple }); }
  for (let i = 0; i < nb; i++) {
    const cx = -s.w / 2 + (i + 0.5) * bw;
    for (let f = 0; f < s.floors; f++) {
      const y0 = pl + f * fh;
      if (i === s.stairBay) {
        /* open stair core: deep recess with landing slab and a lit bulb */
        b.add(box(bw - 0.5, fh - 0.5, 0.05), "plaster", 0xdedad2, mat4(cx, y0 + fh / 2, D / 2 - 1.8), false);
        b.add(box(bw - 0.5, 0.18, 1.8), "concrete", 0xb0aca4, mat4(cx, y0 + fh * 0.5, D / 2 - 0.9));
        railing(b, cx - bw / 2 + 0.25, cx + bw / 2 - 0.25, y0 + (f ? 0 : 0.2), D / 2 - 0.1, 1.0, band, "concrete");
        continue;
      }
      const lit = R() < (s.lit ?? 0);
      for (let j = 0; j < win.perBay; j++) {
        const x = cx + (j - (win.perBay - 1) / 2) * (bw / win.perBay);
        if (f === 0 && s.doors?.includes(i) && j === 0) { door(b, x, y0, D / 2 + 0.02, 1.1, 2.15, 0, 0x6d4c33, s.frame); continue; }
        windowAt(b, x, y0 + win.sill + win.h / 2, D / 2 + 0.005, win.w, win.h, 0, { frame: s.frame, lit: lit ? (s.litLevel ?? 2.4) * (0.85 + R() * 0.3) : 0, cell: s.litCell ?? 0, tint: s.litTint, simple: s.simple });
      }
      /* back: corridor wall with doors and windows, or plain windows */
      const zb = D / 2 - core;
      if (corridor) {
        door(b, cx - bw * 0.3, y0, zb - 0.01, 0.95, 2.1, Math.PI, 0x6d4c33, s.frame);
        windowAt(b, cx + bw * 0.15, y0 + win.sill + win.h / 2, zb - 0.005, win.w, win.h, Math.PI, { frame: s.frame, lit: lit ? (s.litLevel ?? 2.4) : 0, cell: s.litCell ?? 0, tint: s.litTint, simple: s.simple });
      } else windowAt(b, cx, y0 + win.sill + win.h / 2, -D / 2 - 0.005, win.w, win.h, Math.PI, { frame: s.frame, lit: R() < (s.lit ?? 0) ? s.litLevel ?? 2.4 : 0, cell: s.litCell ?? 0, tint: s.litTint, simple: s.simple });
    }
  }
  if (corridor) {
    for (let f = 1; f < s.floors; f++) railing(b, -s.w / 2, s.w / 2, pl + f * fh, -D / 2 + 0.12, 0.95, band, "concrete");
    b.add(box(s.w, 0.15, cd), "concrete", 0xb8b4ac, mat4(0, pl + 0.01, -D / 2 + cd / 2));
  }
  b.pop();
  return { height: H, bays: nb, bayW: bw };
}

/** a corrugated-tin sheet roof slab over a footprint, slight fall; colour = paint */
export function tinRoof(b: Batch, w: number, d: number, at: THREE.Matrix4, color: number, fall = 0.12) {
  b.push(at); b.add(box(w, 0.04, Math.hypot(d, fall * d)), "tin", color, mat4(0, 0, 0, 0, Math.atan(fall))); b.pop();
}
