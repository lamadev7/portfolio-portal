import type * as THREE from "three";
import type { LocationScene, V3 } from "../../contracts";

export interface PathIssue { path: string; seg: number; box: number; msg: string }

/** 2D segment vs AABB (xz), boxes grown by the walker radius; a box only blocks if it spans body height above the path */
function segHitsBox(a: V3, b: V3, bx: THREE.Box3, r: number) {
  const minX = bx.min.x - r, maxX = bx.max.x + r, minZ = bx.min.z - r, maxZ = bx.max.z + r;
  const y = Math.min(a[1], b[1]), yTop = Math.max(a[1], b[1]) + 1.7;
  if (bx.max.y < y + 0.25 || bx.min.y > yTop) return false;
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dz = b[2] - a[2];
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  return clip(-dx, a[0] - minX) && clip(dx, maxX - a[0]) && clip(-dz, a[2] - minZ) && clip(dz, maxZ - a[2]) && t0 <= t1;
}

export function validatePaths(paths: Record<string, V3[]>, colliders: THREE.Box3[], radius = 0.3): PathIssue[] {
  const out: PathIssue[] = [];
  for (const [k, pts] of Object.entries(paths)) {
    if (pts.length < 2) { out.push({ path: k, seg: -1, box: -1, msg: "fewer than 2 points" }); continue; }
    for (let i = 0; i < pts.length - 1; i++)
      colliders.forEach((bx, j) => { if (segHitsBox(pts[i], pts[i + 1], bx, radius)) out.push({ path: k, seg: i, box: j, msg: `segment ${i} crosses collider ${j}` }); });
  }
  return out;
}

const REQUIRED: Partial<Record<string, string[]>> = {
  sarlahi: ["spawn>sarlahi", "sarlahi>exit"], chitwan: ["spawn>visit", "visit>exit"], lumbini: ["spawn>visit", "visit>exit"],
  pokhara: ["spawn>visit", "visit>exit"], everest: ["spawn>next"],
  uniglobe: ["spawn>uniglobe", "uniglobe>exit"], home: ["spawn>princelab", "princelab>exit"], graduation: ["spawn>graduation", "graduation>exit"],
  herald: ["spawn>herald", "herald>exit", "spawn>aaa-2023", "aaa-2023>exit", "spawn>aaa-2024", "aaa-2024>supervisor", "supervisor>exit"],
  office: ["spawn>portpro", "portpro>exit", "spawn>agents", "agents>exit"],
};

/** contract checks: required path keys, paths start at spawn / end at stands, no path or NPC route through a collider */
export function validateScene(s: LocationScene): string[] {
  const msgs: string[] = [];
  for (const k of REQUIRED[s.id] || []) if (!s.paths[k]) msgs.push(`missing path ${k}`);
  const near = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[2] - b[2]) < 0.6;
  for (const [k, pts] of Object.entries(s.paths)) {
    const [from, to] = k.split(">");
    if (from === "spawn" && !near(pts[0], s.spawn.pos)) msgs.push(`${k} does not start at spawn`);
    if (s.stands[to] && !near(pts[pts.length - 1], s.stands[to].pos)) msgs.push(`${k} does not end at stand ${to}`);
    if (s.stands[from] && !near(pts[0], s.stands[from].pos)) msgs.push(`${k} does not start at stand ${from}`);
  }
  validatePaths(s.paths, s.colliders).forEach((i) => msgs.push(`${i.path}: ${i.msg}`));
  const npc = (s.group.userData.npcPaths || {}) as Record<string, V3[]>;
  validatePaths(npc, s.colliders, 0.25).forEach((i) => msgs.push(`npc ${i.path}: ${i.msg}`));
  for (const [k, st] of Object.entries(s.stands)) s.colliders.forEach((bx, j) => {
    if (st.pos[0] > bx.min.x - 0.25 && st.pos[0] < bx.max.x + 0.25 && st.pos[2] > bx.min.z - 0.25 && st.pos[2] < bx.max.z + 0.25 && bx.max.y > st.pos[1] + 0.25 && bx.min.y < st.pos[1] + 1.7) msgs.push(`stand ${k} inside collider ${j}`);
  });
  return msgs;
}
