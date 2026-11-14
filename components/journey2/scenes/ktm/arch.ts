import * as THREE from "three";
import type { LocationScene, SceneEnv, SceneId, Shot, Stand, V3, FrameCtx } from "../../contracts";
import type { Kit } from "./props";
import { rng } from "./tex";
import { validatePaths } from "./lib";
import type { People } from "./people";

/* architectural helpers shared by the Kathmandu buildings + the LocationScene assembler */

export const lin = (r: number, g = r, b = r) => new THREE.Color(r, g, b);

/* windows along a wall face. (cx,cz) is the wall surface centre, ry the outward normal yaw (normal = sin ry, cos ry). */
export function wallWindows(k: Kit, o: {
  cx: number; cz: number; ry: number; len: number; y0: number; floors: number; floorH: number; bay: number; ww: number; wh: number;
  frame?: number; lit?: number; seed?: number; skip?: (f: number, i: number) => boolean; litColor?: THREE.Color; sill?: boolean; mullion?: boolean; depth?: number;
}) {
  const r = rng(o.seed ?? 1), n = Math.max(1, Math.floor(o.len / o.bay)), ux = Math.cos(o.ry), uz = -Math.sin(o.ry), nx = Math.sin(o.ry), nz = Math.cos(o.ry);
  const warm = [lin(1.0, 0.6, 0.28), lin(0.95, 0.7, 0.42), lin(0.7, 0.78, 0.9), lin(1.0, 0.55, 0.22)];
  for (let f = 0; f < o.floors; f++) for (let i = 0; i < n; i++) {
    if (o.skip?.(f, i)) continue;
    const off = -o.len / 2 + (i + 0.5) * (o.len / n), x = o.cx + ux * off, z = o.cz + uz * off, y = o.y0 + f * o.floorH + o.wh / 2;
    k.b.box("paint", x + nx * 0.02, y - o.wh / 2 - 0.06, z + nz * 0.02, o.ww + 0.14, o.wh + 0.12, 0.08, o.ry, { color: o.frame ?? 0x3a2a1e });
    const lit = r() < (o.lit ?? 0.3);
    const lc = o.litColor ?? warm[(r() * warm.length) | 0];
    if (lit) k.b.quad("glowSoft", x + nx * 0.065, y, z + nz * 0.065, o.ww, o.wh, o.ry, { color: lc.clone().multiplyScalar(0.28 + r() * 0.4) });
    else k.b.quad("glass", x + nx * 0.065, y, z + nz * 0.065, o.ww, o.wh, o.ry, { color: 0x3a4652 });
    if (o.mullion !== false) k.b.box("paint", x + nx * 0.07, y - o.wh / 2, z + nz * 0.07, 0.05, o.wh, 0.03, o.ry, { color: o.frame ?? 0x3a2a1e });
    if (o.sill !== false) k.b.box("paint", x + nx * 0.1, y - o.wh / 2 - 0.1, z + nz * 0.1, o.ww + 0.24, 0.06, 0.2, o.ry, { color: 0xdedad2 });
  }
}

/* straight railing: posts + top/mid rails (+ optional balusters) */
export function railing(k: Kit, key: string, a: V3, b: V3, h: number, o: { post?: number; color?: number; bal?: number; r?: number; postW?: number } = {}) {
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(1, Math.round(len / (o.post ?? 1.8))), c = o.color ?? 0xf2f2ee, pw = o.postW ?? 0.1;
  const ry = Math.atan2(b[0] - a[0], b[2] - a[2]);
  for (let i = 0; i <= n; i++) { const t = i / n; k.b.box(key, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, pw, h + 0.05, pw, ry, { color: c }); }
  for (const yy of [h, h * 0.5]) k.b.tube(key, [[a[0], a[1] + yy, a[2]], [b[0], b[1] + yy, b[2]]], o.r ?? 0.035, 5, { color: c });
  if (o.bal) { const m = Math.round(len / o.bal); for (let i = 1; i < m; i++) { const t = i / m; k.b.box(key, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 0.04, h * 0.5, 0.04, ry, { color: c }); } }
}

export function columns(k: Kit, key: string, pts: [number, number][], y0: number, h: number, r: number, color: number, square = false) {
  for (const [x, z] of pts) { if (square) k.b.box(key, x, y0, z, r * 2, h, r * 2, 0, { color }); else k.b.cyl(key, x, y0, z, r, r, h, 14, { color }); }
}

/* stepped plinth: n steps, each `rise` high, inset by `tread` */
export function plinth(k: Kit, key: string, cx: number, cz: number, w: number, d: number, n: number, rise: number, tread: number, color: number, y0 = 0) {
  for (let i = 0; i < n; i++) k.b.box(key, cx, y0 + i * rise, cz, w - i * tread * 2, rise, d - i * tread * 2, 0, { color, uv: 2 });
}

/* ---------- scene assembly ---------- */

export interface Assemble {
  id: SceneId; k: Kit; env: SceneEnv; arrival: Shot; spawn: { pos: V3; yaw: number }; stands: Record<string, Stand>; paths: Record<string, V3[]>;
  people?: People; lights?: THREE.Light[]; tick?: (t: number, dt: number, f: FrameCtx) => void; dispose?: () => void; extraColliders?: THREE.Box3[]; events?: LocationScene["events"];
}

export function assemble(a: Assemble): LocationScene {
  const { k } = a, group = k.b.group; group.name = "scene-" + a.id;
  k.b.build();
  const pools = k.pools.build(group);
  if (a.people) group.add(a.people.group);
  for (const l of a.lights ?? []) group.add(l);
  const colliders = [...k.b.colliders, ...(a.extraColliders ?? [])];
  group.userData.npcPaths = a.people?.loops ?? {};
  if (process.env.NODE_ENV !== "production") {
    const bad = [...validatePaths(a.paths, colliders), ...validatePaths(group.userData.npcPaths, colliders, 0.25).map((m) => "npc " + m)];
    if (bad.length) console.warn(`[ktm ${a.id}]`, bad.slice(0, 12).join("\n"));
  }
  return {
    id: a.id, group, env: a.env, arrival: a.arrival, spawn: a.spawn, stands: a.stands, paths: a.paths, colliders, events: a.events,
    update(t, dt, f) { a.people?.update(dt); a.tick?.(t, dt, f); },
    dispose() {
      a.dispose?.(); a.people?.dispose(); pools?.dispose(); k.b.dispose(); k.bank.dispose(); k.mats.dispose();
      for (const l of a.lights ?? []) { (l as THREE.SpotLight).shadow?.map?.dispose(); l.removeFromParent(); }
      group.removeFromParent();
    },
  };
}

export function spot(color: number, intensity: number, pos: V3, target: V3, angle = 0.6, dist = 30, pen = 0.6) {
  const s = new THREE.SpotLight(color, intensity, dist, angle, pen, 1.6); s.position.set(...pos); s.target.position.set(...target); s.add(s.target);
  s.target.position.sub(s.position); return s;
}
export function point(color: number, intensity: number, pos: V3, dist = 14) { const p = new THREE.PointLight(color, intensity, dist, 1.6); p.position.set(...pos); return p; }

export interface Opening { a: number; b: number; lo: number; hi: number }

/* straight wall along X (axis "x", at z = c) or along Z (axis "z", at x = c) with door/window openings; colliders for solid parts */
export function wall(k: Kit, key: string, axis: "x" | "z", c: number, a0: number, a1: number, y0: number, y1: number, t: number, ops: Opening[] = [], o: { color?: number | THREE.Color; uv?: number; collide?: boolean } = {}) {
  const put = (s0: number, s1: number, h0: number, h1: number, col: boolean) => {
    if (s1 - s0 < 1e-3 || h1 - h0 < 1e-3) return;
    if (axis === "x") k.b.aabb(key, s0, h0, c - t / 2, s1, h1, c + t / 2, { color: o.color as number, uv: o.uv ?? 3 });
    else k.b.aabb(key, c - t / 2, h0, s0, c + t / 2, h1, s1, { color: o.color as number, uv: o.uv ?? 3 });
    if (col && o.collide !== false) { if (axis === "x") k.b.collide(s0, h0, c - t / 2, s1, h1, c + t / 2); else k.b.collide(c - t / 2, h0, s0, c + t / 2, h1, s1); }
  };
  const sorted = [...ops].sort((p, q) => p.a - q.a); let s = a0;
  for (const op of sorted) {
    put(s, op.a, y0, y1, true);
    put(op.a, op.b, y0, op.lo, op.lo > y0 + 0.3); put(op.a, op.b, op.hi, y1, false);
    s = op.b;
  }
  put(s, a1, y0, y1, true);
}

/* glass pane with thin frame in an opening */
export function pane(k: Kit, axis: "x" | "z", c: number, a: number, b: number, lo: number, hi: number, frame = 0x2a2e33, key = "glassT", tint = 0x9fc6d8) {
  const mid = (a + b) / 2, w = b - a, h = hi - lo, ry = axis === "x" ? 0 : Math.PI / 2;
  const x = axis === "x" ? mid : c, z = axis === "x" ? c : mid;
  k.b.quad(key, x, (lo + hi) / 2, z, w, h, ry, { color: tint });
  for (const s of [a, b]) k.b.box("metal", axis === "x" ? s : c, lo, axis === "x" ? c : s, 0.06, h, 0.08, 0, { color: frame });
  k.b.box("metal", x, hi - 0.03, z, axis === "x" ? w : 0.08, 0.06, axis === "x" ? 0.08 : w, 0, { color: frame });
}
