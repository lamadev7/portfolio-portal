import * as THREE from "three";
import type { Character, V3 } from "./contracts";

/* Path following for the hero: authored polylines are split at sharp corners (turn in place there), each run is smoothed with a
   centripetal Catmull-Rom and resampled by arc length, and a speed profile limits acceleration, braking and cornering so he
   eases into every stop. The smoothed line is pulled back into a narrow corridor around the authored one, and any sample that
   would touch a collider falls back onto the authored line, so smoothing can never cut through a wall. */

const BODY = 0.26, CORRIDOR = 0.3, VWALK = 1.35, VFAST = 2.3, ACC = 1.1, DEC = 1.3, ALAT = 0.9, TURN_MAX = 2.6, TURN_ACC = 9;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

interface Run { p: THREE.Vector3[]; s: number[]; vlim: number[]; len: number; vmax: number }
type Job = { kind: "walk"; run: Run; s: number } | { kind: "turn"; yaw: number };

function closestOnPolyline(pts: THREE.Vector3[], p: THREE.Vector3, out: THREE.Vector3) {
  let best = Infinity; const seg = new THREE.Line3(), q = new THREE.Vector3();
  for (let i = 0; i < pts.length - 1; i++) { seg.set(pts[i], pts[i + 1]); seg.closestPointToPoint(p, true, q); const d = q.distanceToSquared(p); if (d < best) { best = d; out.copy(q); } }
  return Math.sqrt(best);
}
function inside(boxes: THREE.Box3[], p: THREE.Vector3) {
  for (const b of boxes) if (p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z && p.y + 1 > b.min.y && p.y + 0.2 < b.max.y) return true;
  return false;
}

/* count raw path samples that come within body radius of a collider (for the dev validator) */
export function validatePath(pts: V3[], colliders: THREE.Box3[]) {
  const boxes = colliders.map((b) => b.clone().expandByScalar(BODY)); let bad = 0; const p = new THREE.Vector3();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]), n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.2));
    for (let k = 0; k <= n; k++) { p.lerpVectors(a, b, k / n); if (inside(boxes, p)) bad++; }
  }
  return bad;
}

function buildRun(raw: THREE.Vector3[], boxes: THREE.Box3[], vmax: number): Run {
  const curve = raw.length > 2 ? new THREE.CatmullRomCurve3(raw, false, "centripetal", 0.5) : new THREE.LineCurve3(raw[0], raw[1]);
  const L = curve.getLength(), n = Math.max(2, Math.ceil(L / 0.08));
  const p = curve.getSpacedPoints(n), q = new THREE.Vector3();
  for (const x of p) {
    const d = closestOnPolyline(raw, x, q);
    if (d > CORRIDOR) x.lerp(q, 1 - CORRIDOR / d);
    if (inside(boxes, x)) { closestOnPolyline(raw, x, q); x.copy(q); }
  }
  const s = [0]; for (let i = 1; i < p.length; i++) s.push(s[i - 1] + p[i].distanceTo(p[i - 1]));
  const len = s[s.length - 1], vlim = p.map(() => vmax);
  for (let i = 1; i < p.length - 1; i++) {
    const a = Math.atan2(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z), b = Math.atan2(p[i + 1].x - p[i].x, p[i + 1].z - p[i].z);
    const ds = Math.max(1e-3, (s[i + 1] - s[i - 1]) / 2), k = Math.abs(wrap(b - a)) / ds;
    vlim[i] = Math.min(vmax, Math.sqrt(ALAT / Math.max(k, 1e-3)));
  }
  vlim[p.length - 1] = 0;
  for (let i = p.length - 2; i >= 0; i--) vlim[i] = Math.min(vlim[i], Math.sqrt(vlim[i + 1] * vlim[i + 1] + 2 * DEC * (s[i + 1] - s[i])));
  return { p, s, vlim, len, vmax };
}

export const WALK_PACE = VWALK;

export class Walker {
  pos = new THREE.Vector3();
  yaw = 0;
  speed = 0;
  colliders: THREE.Box3[] = [];
  obstacles: () => THREE.Vector3[] = () => [];
  private boxes: THREE.Box3[] = [];
  private jobs: Job[] = [];
  private done: (() => void) | null = null;
  private w = 0; private lat = 0; private wait = 0; private last = new THREE.Vector3();

  constructor(public ch: Character) {}

  setColliders(c: THREE.Box3[]) { this.colliders = c; this.boxes = c.map((b) => b.clone().expandByScalar(BODY)); }

  place(p: V3, yaw: number) { this.pos.set(p[0], p[1], p[2]); this.yaw = yaw; this.speed = 0; this.jobs = []; this.lat = 0; this.sync(); }

  get busy() { return this.jobs.length > 0; }

  walk(path: V3[], endYaw?: number, pace?: number): Promise<void> {
    const pts = path.map((a) => new THREE.Vector3(a[0], a[1], a[2]));
    if (pts.length && pts[0].distanceTo(this.pos) > 0.05) pts.unshift(this.pos.clone());
    const clean = pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 0.02);
    this.jobs = [];
    /* long approaches are taken briskly so an entrance never drags: about 12 s of walking at most, up to a jog */
    let total = 0; for (let i = 1; i < clean.length; i++) total += clean[i].distanceTo(clean[i - 1]);
    const vmax = pace || Math.max(VWALK, Math.min(VFAST, total / 12));
    let cur: THREE.Vector3[] = [clean[0]];
    const head = (a: THREE.Vector3, b: THREE.Vector3) => Math.atan2(b.x - a.x, b.z - a.z);
    for (let i = 1; i < clean.length; i++) {
      cur.push(clean[i]);
      const sharp = i < clean.length - 1 && Math.abs(wrap(head(clean[i], clean[i + 1]) - head(clean[i - 1], clean[i]))) > 1.15;
      if (sharp || i === clean.length - 1) {
        if (cur.length >= 2) {
          const run = buildRun(cur, this.boxes, vmax);
          this.jobs.push({ kind: "turn", yaw: head(run.p[0], run.p[Math.min(run.p.length - 1, 6)]) });
          this.jobs.push({ kind: "walk", run, s: 0 });
        }
        cur = [clean[i]];
      }
    }
    if (endYaw != null) this.jobs.push({ kind: "turn", yaw: endYaw });
    return new Promise((res) => { this.done = res; if (!this.jobs.length) this.finish(); });
  }

  /* metres of walking left in the current walk */
  get remaining() { let r = 0; for (const j of this.jobs) if (j.kind === "walk") r += j.run.len - j.s; return r; }

  /* jump cut: drop everything but the last `rem` metres of the walk, keeping his pace */
  skipTo(rem: number) {
    let acc = 0;
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i]; if (j.kind !== "walk") continue;
      const left = j.run.len - j.s;
      if (acc + left >= rem) {
        j.s = j.run.len - (rem - acc); this.jobs = this.jobs.slice(i);
        const v = Math.max(VWALK, Math.min(VFAST, rem / 12));
        for (const x of this.jobs) if (x.kind === "walk") { x.run.vmax = v; x.run.vlim = x.run.vlim.map((y) => Math.min(y, v)); }
        const r = j.run, k = this.index(r, j.s), a = r.p[k], b = r.p[Math.min(r.p.length - 1, k + 1)], ahead = r.p[Math.min(r.p.length - 1, k + 5)];
        this.pos.lerpVectors(a, b, r.s[k + 1] > r.s[k] ? (j.s - r.s[k]) / (r.s[k + 1] - r.s[k]) : 0);
        if (ahead !== a) this.yaw = Math.atan2(ahead.x - a.x, ahead.z - a.z);
        this.speed = Math.max(this.speed, Math.min(r.vmax, r.vlim[k])); this.lat = 0; this.sync();
        return true;
      }
      acc += left;
    }
    return false;
  }

  turnTo(yaw: number): Promise<void> { this.jobs = [{ kind: "turn", yaw }]; return new Promise((res) => { this.done = res; }); }

  stop() { this.jobs = []; this.speed = 0; this.w = 0; this.ch.setLocomotion(0); this.finish(); }

  private finish() { const d = this.done; this.done = null; d && d(); }

  update(dt: number) {
    this.last.copy(this.pos);
    const j = this.jobs[0];
    if (!j) { this.speed = 0; this.ch.setLocomotion(0); this.sync(); return; }
    if (j.kind === "turn") {
      this.speed = Math.max(0, this.speed - DEC * 2 * dt);
      const d = wrap(j.yaw - this.yaw);
      const wmax = Math.min(TURN_MAX, Math.sqrt(2 * TURN_ACC * 0.5 * Math.abs(d)));
      this.w = Math.min(wmax, this.w + TURN_ACC * dt);
      const step = Math.sign(d) * Math.min(Math.abs(d), this.w * dt);
      this.yaw = wrap(this.yaw + step);
      if (Math.abs(d) < 0.01) { this.yaw = j.yaw; this.w = 0; this.jobs.shift(); if (!this.jobs.length) this.finish(); }
      this.ch.setLocomotion(this.speed); this.sync(); return;
    }
    const r = j.run, i = this.index(r, j.s), n1 = Math.min(r.p.length - 1, i + 1), f0 = r.s[n1] > r.s[i] ? (j.s - r.s[i]) / (r.s[n1] - r.s[i]) : 0;
    let target = Math.max(0.15, r.vlim[i] + (r.vlim[n1] - r.vlim[i]) * f0);
    /* local avoidance: sidestep within the corridor, or wait if someone stands in the way */
    const block = this.avoid(r, j.s);
    if (block === "stop") { this.wait += dt; if (this.wait < 2.5) target = 0; } else this.wait = 0;
    this.speed = this.speed < target ? Math.min(target, this.speed + ACC * dt) : Math.max(target, this.speed - DEC * 2.2 * dt);
    j.s = Math.min(r.len, j.s + this.speed * dt);
    if (r.len - j.s < 0.02 && target > 0) j.s = r.len;
    const k = this.index(r, j.s), a = r.p[k], b = r.p[Math.min(r.p.length - 1, k + 1)], f = r.s[k + 1] != null && r.s[k + 1] > r.s[k] ? (j.s - r.s[k]) / (r.s[k + 1] - r.s[k]) : 0;
    this.pos.lerpVectors(a, b, Math.min(1, f));
    const ahead = r.p[Math.min(r.p.length - 1, k + 5)], back = r.p[Math.max(0, k - 1)];
    const tang = Math.atan2(ahead.x - back.x, ahead.z - back.z);
    if (this.lat) { const side = new THREE.Vector3(Math.cos(tang), 0, -Math.sin(tang)), q = this.pos.clone().addScaledVector(side, this.lat); if (!inside(this.boxes, q)) this.pos.copy(q); else this.lat *= 0.8; }
    if (ahead !== a) this.yaw = wrap(this.yaw + wrap(tang - this.yaw) * Math.min(1, dt * 7));
    const moved = Math.hypot(this.pos.x - this.last.x, this.pos.z - this.last.z) / Math.max(dt, 1e-4);
    this.ch.setLocomotion(Math.min(moved, r.vmax * 1.1));
    if (j.s >= r.len - 1e-3) { this.speed = 0; this.jobs.shift(); if (!this.jobs.length) { this.ch.setLocomotion(0); this.finish(); } }
    this.sync();
  }

  private index(r: Run, s: number) { let lo = 0, hi = r.s.length - 1; while (lo < hi - 1) { const m = (lo + hi) >> 1; if (r.s[m] <= s) lo = m; else hi = m; } return lo; }

  private avoid(r: Run, s: number): "clear" | "side" | "stop" {
    const obs = this.obstacles(); let want = 0, stop = false;
    if (obs.length) {
      const i = this.index(r, s), fwdIdx = Math.min(r.p.length - 1, i + 6), fx = r.p[fwdIdx].x - r.p[i].x, fz = r.p[fwdIdx].z - r.p[i].z, fl = Math.hypot(fx, fz) || 1;
      const dx = fx / fl, dz = fz / fl;
      for (const o of obs) {
        const ox = o.x - this.pos.x, oz = o.z - this.pos.z, along = ox * dx + oz * dz, lat = ox * dz - oz * dx;
        if (along < -0.2 || along > 2.6 || Math.abs(lat) > 1.1) continue;
        const need = 0.62 - Math.abs(lat); if (need <= 0) continue;
        want += (lat > 0 ? 1 : -1) * need;
        if (Math.abs(want) > 0.5 && along < 1.0) stop = true;
      }
    }
    want = -Math.max(-0.5, Math.min(0.5, want));
    this.lat += (want - this.lat) * 0.08;
    return stop ? "stop" : want ? "side" : "clear";
  }

  private sync() { const o = this.ch.root; o.position.copy(this.pos); o.rotation.set(0, this.yaw, 0); }
}
