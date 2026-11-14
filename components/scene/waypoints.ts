/**
 * Camera waypoints — one per section, smoothly lerped by scroll progress.
 */
export interface Waypoint {
  pos: [number, number, number];
  look: [number, number, number];
}

export const WAYPOINTS: Waypoint[] = [
  // 0 — HERO: establishing shot
  { pos: [3.2, 2.2, 4.6],  look: [0, 1.2, -0.3] },
  // 1 — EXPERIENCE: side angle, left-side logos visible
  { pos: [-5.0, 2.6, 3.2], look: [-1, 2.4, -1] },
  // 2 — WORK: floating above, looking forward
  { pos: [0.0, 3.8, 4.5],  look: [0, 3.2, -2] },
  // 3 — AGENTS: lower right
  { pos: [4.2, 2.2, 2.4],  look: [2, 2.5, -1] },
  // 4 — EDU/HONORS: pulled back wide
  { pos: [3.6, 3.2, 5.6],  look: [0.5, 2.4, -2] },
  // 5 — STACK: dolly past the logo constellation
  { pos: [-1.5, 3.4, 4.2], look: [0.5, 3.0, -1] },
  // 6 — CONTACT: close-up, monitor prominent
  { pos: [0.8, 1.3, 2.5],  look: [0, 1.6, -0.3] },
];

interface Interp {
  pos: [number, number, number];
  look: [number, number, number];
}

/** Smooth interpolation between waypoints using smoothstep ease. */
export function interp(waypoints: Waypoint[], t: number): Interp {
  const total = waypoints.length - 1;
  const x = Math.max(0, Math.min(1, t)) * total;
  const i = Math.floor(x);
  const f = x - i;
  const a = waypoints[i];
  const b = waypoints[Math.min(i + 1, total)];
  const e = f * f * (3 - 2 * f);
  return {
    pos: [
      a.pos[0] + (b.pos[0] - a.pos[0]) * e,
      a.pos[1] + (b.pos[1] - a.pos[1]) * e,
      a.pos[2] + (b.pos[2] - a.pos[2]) * e,
    ],
    look: [
      a.look[0] + (b.look[0] - a.look[0]) * e,
      a.look[1] + (b.look[1] - a.look[1]) * e,
      a.look[2] + (b.look[2] - a.look[2]) * e,
    ],
  };
}
