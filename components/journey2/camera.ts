import * as THREE from "three";
import type { Shot, Stand, V3 } from "./contracts";

/* Cinematic camera rig. Every mode produces a desired eye/target/fov; the eye is then kept out of the scene's colliders by a ray
   from the subject, so blends and the follow-cam never end up inside a wall. */

type Mode = "hold" | "blend" | "follow" | "orbit" | "crane";
export interface Subject { pos: THREE.Vector3; yaw: number; speed: number; height: number }

const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/* critically damped spring, implicit and stable for any dt */
function spring(x: THREE.Vector3, v: THREE.Vector3, to: THREE.Vector3, w: number, dt: number) {
  const f = 1 + 2 * dt * w, oo = w * w, hoo = dt * oo, hhoo = dt * hoo, inv = 1 / (f + hhoo);
  for (const k of ["x", "y", "z"] as const) {
    const nx = (f * x[k] + dt * v[k] + hhoo * to[k]) * inv, nv = (v[k] + hoo * (to[k] - x[k])) * inv;
    x[k] = nx; v[k] = nv;
  }
}

export class CameraRig {
  eye = new THREE.Vector3(0, 30, 60);
  at = new THREE.Vector3();
  fov = 50;
  mode: Mode = "hold";
  handheld = 0;
  colliders: THREE.Box3[] = [];
  sign: Stand["sign"] | null = null;
  /* user look-around, in radians; springs back when released */
  yawOff = 0; pitchOff = 0; dragging = false;
  aspect = 1.6;

  private ev = new THREE.Vector3(); private av = new THREE.Vector3();
  private b0 = { eye: new THREE.Vector3(), at: new THREE.Vector3(), fov: 50 }; private b1 = { eye: new THREE.Vector3(), at: new THREE.Vector3(), fov: 50 };
  private bt = 0; private bd = 1; private lift = 0;
  private cyaw = 0; private snap = false; private ramp = 0; private free = false; private wide = 0;
  /* m/s push toward the subject while holding a shot, so a held wide is never static */
  drift = 0; private t = 0; private hh = 0; private fovFix = 0;
  private oc = new THREE.Vector3(); private orad = 30; private oh = 15; private oa = 0; private ow = 0.11;
  private cs = { eye: new THREE.Vector3(), at: new THREE.Vector3(), up: 0, back: 0, t: 0 };
  private ray = new THREE.Ray(); private tmp = new THREE.Vector3(); private tmp2 = new THREE.Vector3(); private pv = new THREE.Vector3();
  private boxes: THREE.Box3[] = [];

  setColliders(c: THREE.Box3[]) { this.colliders = c; this.boxes = c.map((b) => b.clone().expandByScalar(0.25)); }

  cut(s: Shot) { this.eye.copy(v3(s.cam)); this.at.copy(v3(s.look)); this.fov = s.fov ?? 50; this.mode = "hold"; this.ev.set(0, 0, 0); this.av.set(0, 0, 0); }

  /* move from wherever the camera is to a shot; `arc` lifts the middle of the move so it doesn't skim the ground */
  blend(s: Shot, dur: number, arc = 0, free = false) {
    this.free = free; this.drift = 0;
    this.b0.eye.copy(this.eye); this.b0.at.copy(this.at); this.b0.fov = this.fov;
    this.b1.eye.copy(v3(s.cam)); this.b1.at.copy(v3(s.look)); this.b1.fov = s.fov ?? 50;
    this.bt = 0; this.bd = Math.max(0.01, dur); this.lift = arc; this.mode = "blend"; this.fovFix = 0;
  }

  /* `swing` (radians) cuts straight to a pose that far round from behind him, a little wide, so the camera is already moving
     when the shot starts; without it the camera glides in from wherever it is, its spring stiffening over ~2.5 s */
  follow(sub: Subject, swing?: number) {
    this.mode = "follow"; this.free = false; this.drift = 0; this.ev.set(0, 0, 0); this.av.set(0, 0, 0);
    this.cyaw = sub.yaw + (swing || 0); this.snap = swing != null; this.ramp = swing != null ? 9 : 0; this.wide = swing != null ? 1.6 : 0;
  }

  orbit(s: Shot, speed = 0.11) {
    this.oc.copy(v3(s.look)); const e = v3(s.cam);
    this.orad = Math.hypot(e.x - this.oc.x, e.z - this.oc.z); this.oh = e.y - this.oc.y; this.oa = Math.atan2(e.z - this.oc.z, e.x - this.oc.x); this.ow = speed;
    this.mode = "orbit"; this.fov = s.fov ?? this.fov;
  }

  crane() { this.cs.eye.copy(this.eye); this.cs.at.copy(this.at); this.cs.t = 0; this.mode = "crane"; this.handheld = 0; }

  get blending() { return this.mode === "blend" && this.bt < this.bd; }

  update(dt: number, sub: Subject | null) {
    this.t += dt;
    this.hh += (this.handheld - this.hh) * Math.min(1, dt * 1.5);
    let pivot: THREE.Vector3 | null = null;
    if (this.mode === "blend") {
      this.bt += dt; const k = ease(this.bt / this.bd);
      this.eye.lerpVectors(this.b0.eye, this.b1.eye, k); this.eye.y += Math.sin(Math.PI * k) * this.lift;
      this.at.lerpVectors(this.b0.at, this.b1.at, k); this.fov = this.b0.fov + (this.b1.fov - this.b0.fov) * k;
      pivot = this.at;
      if (this.bt >= this.bd) this.mode = "hold";
    } else if (this.mode === "hold") {
      pivot = this.at;
      if (this.drift) { const d = this.tmp.subVectors(this.at, this.eye), L = d.length(); if (L > 10) this.eye.addScaledVector(d, (this.drift * dt) / L); }
    } else if (this.mode === "follow" && sub) {
      const dy = wrap(sub.yaw - this.cyaw); this.cyaw += dy * Math.min(1, dt * (1.6 + Math.min(2, Math.abs(dy))));
      const fw = this.tmp.set(Math.sin(this.cyaw), 0, Math.cos(this.cyaw)), rt = this.tmp2.set(Math.cos(this.cyaw), 0, -Math.sin(this.cyaw));
      this.wide *= Math.exp(-dt * 1.2);
      const dist = 4.2 + sub.speed * 0.5 + this.wide, hgt = sub.height * 1.15 + 0.3 + this.wide * 0.4;
      const want = sub.pos.clone().addScaledVector(fw, -dist).addScaledVector(rt, -0.55 * Math.min(1, this.aspect)); want.y += hgt;
      const look = sub.pos.clone().addScaledVector(fw, 2.4 + sub.speed); look.y += sub.height * 0.78;
      pivot = this.pv.copy(sub.pos); pivot.y += sub.height * 0.85;
      this.clampFrom(pivot, want);
      /* blocked close behind him (a hedge, a wall): boom up over it rather than sit on his shoulder */
      if (want.distanceTo(pivot) < 2.4) {
        const up = sub.pos.clone().addScaledVector(fw.set(Math.sin(this.cyaw), 0, Math.cos(this.cyaw)), -dist * 0.75); up.y += hgt + 2;
        this.clampFrom(pivot, up);
        if (up.distanceTo(pivot) > want.distanceTo(pivot) + 0.3) want.copy(up);
      }
      this.ramp += dt; const k = Math.min(1, 0.25 + this.ramp / 2.5);
      if (this.snap) { this.eye.copy(want); this.at.copy(look); this.snap = false; }
      else { spring(this.eye, this.ev, want, 2.4 * k, dt); spring(this.at, this.av, look, 4 * k, dt); }
      this.fov += (52 - this.fov) * Math.min(1, dt * 2);
    } else if (this.mode === "orbit") {
      this.oa += this.ow * dt;
      this.eye.set(this.oc.x + Math.cos(this.oa) * this.orad, this.oc.y + this.oh + Math.sin(this.t * 0.4) * 0.6, this.oc.z + Math.sin(this.oa) * this.orad);
      this.at.copy(this.oc);
    } else if (this.mode === "crane") {
      const c = this.cs; c.t += dt;
      const up = 1.2 * c.t * c.t + 0.6 * c.t, back = 0.9 * c.t;
      const dir = this.tmp.subVectors(c.eye, c.at).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
      this.eye.copy(c.eye).addScaledVector(dir, back); this.eye.y += up;
      this.at.copy(c.at); this.at.y += up * 0.35;
    }
    if (pivot && this.mode !== "follow" && !this.free) { const e = this.eye.clone(); this.clampFrom(pivot, e); this.eye.copy(e); }
    if (pivot && this.mode === "follow") this.clampFrom(pivot, this.eye);
  }

  /* pull `p` toward `from` so the segment between them crosses no collider */
  clampFrom(from: THREE.Vector3, p: THREE.Vector3) {
    const d = this.tmp2.subVectors(p, from), len = d.length(); if (len < 1e-3) return;
    this.ray.set(from, d.multiplyScalar(1 / len)); let best = len;
    for (const b of this.boxes) {
      if (b.containsPoint(from)) continue;
      const hit = this.ray.intersectBox(b, this.tmp);
      if (hit) { const t = hit.distanceTo(from); if (t < best) best = t; }
    }
    if (best < len) p.copy(from).addScaledVector(this.ray.direction, Math.max(0.35, best - 0.15));
  }

  /* shots are framed for landscape; on a portrait screen keep about three quarters of their horizontal view, within reason */
  private fit(f: number) {
    if (this.aspect >= 1.2) return f;
    const h = 2 * Math.atan(Math.tan((f * Math.PI) / 360) * 1.6) * 0.75, v = (2 * Math.atan(Math.tan(h / 2) / this.aspect) * 180) / Math.PI;
    return Math.min(72, Math.max(f, v));
  }

  apply(cam: THREE.PerspectiveCamera) {
    this.aspect = cam.aspect;
    const e = this.eye.clone(), a = this.at.clone(), k = this.hh, t = this.t, base = this.fit(this.fov);
    if (k > 0.001) {
      e.x += (Math.sin(t * 0.37) * 0.6 + Math.sin(t * 0.91 + 1.3) * 0.4) * 0.045 * k;
      e.y += (Math.sin(t * 0.53 + 0.7) * 0.6 + Math.sin(t * 1.17) * 0.4) * 0.03 * k;
      a.x += Math.sin(t * 0.29 + 2.1) * 0.03 * k; a.y += Math.sin(t * 0.61) * 0.02 * k;
    }
    if (this.yawOff || this.pitchOff) {
      const off = e.clone().sub(a), r = off.length();
      const yaw = Math.atan2(off.x, off.z) + this.yawOff, pit = Math.max(-0.2, Math.min(1.3, Math.asin(Math.max(-1, Math.min(1, off.y / r))) + this.pitchOff));
      e.set(a.x + Math.sin(yaw) * Math.cos(pit) * r, a.y + Math.sin(pit) * r, a.z + Math.cos(yaw) * Math.cos(pit) * r);
      this.clampFrom(a, e);
    }
    if (!this.dragging) { this.yawOff *= 0.9; this.pitchOff *= 0.9; if (Math.abs(this.yawOff) < 1e-4) this.yawOff = 0; if (Math.abs(this.pitchOff) < 1e-4) this.pitchOff = 0; }
    cam.position.copy(e); cam.lookAt(a);
    /* composition: while he talks, widen a little if the stand's sign would leave the frame */
    let want = 0;
    if (this.sign && (this.mode === "hold" || this.mode === "blend") && this.handheld > 0) {
      cam.fov = base + this.fovFix; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const s = this.sign, c = v3(s.center), right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      let m = 0;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const p = c.clone().addScaledVector(right, sx * s.halfW).addScaledVector(up, sy * s.halfH).project(cam); m = Math.max(m, Math.abs(p.x), Math.abs(p.y)); }
      want = m > 0.9 ? Math.min(14, this.fovFix + (m - 0.9) * 40) : Math.max(0, this.fovFix - 0.05);
    }
    this.fovFix += (want - this.fovFix) * 0.06;
    cam.fov = Math.min(84, base + this.fovFix); cam.updateProjectionMatrix();
  }
}
