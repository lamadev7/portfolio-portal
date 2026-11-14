import * as THREE from "three";
import type { Character, CharState, Outfit, V3 } from "../contracts";
import type { Base } from "./assets";

/* One skeleton per character, shared AnimationClips per base. Base layer = library clip (crossfaded by weight); locomotion = walk/jog/sprint
   driven by a distance-locked phase so stride matches ground speed; on top: arm IK targets per act, finger presets, look-at, talk nods + jaw. */

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export interface RigOpts {
  scale: number;
  seed: number;
  idle?: string;
  walk?: string;
  hero?: boolean;
}

type Side = "l" | "r";
interface ArmTarget { pos: THREE.Vector3; palm?: THREE.Vector3; fingers?: THREE.Vector3; pole: THREE.Vector3; w: number }
type FingerPose = "relax" | "point" | "fist" | "flat" | "hold" | "grip";

interface Layer { action: THREE.AnimationAction; w: number; target: number; rate: number }

export class Rig implements Character {
  root = new THREE.Group();
  rig = new THREE.Group();
  height: number;
  bones: THREE.Bone[];
  skeleton: THREE.Skeleton;
  mixer: THREE.AnimationMixer;
  base: Base;
  state: CharState = "idle";
  outfit: Outfit = "office";
  /** set by the factory: called when the outfit changes */
  onOutfit: ((o: Outfit) => void) | null = null;
  onDispose: (() => void) | null = null;
  onFrame: (() => void) | null = null;
  jaw: { mesh: THREE.Mesh; i: number } | null = null;
  blink: { mesh: THREE.Mesh; i: number } | null = null;
  private blinkIn = 1.5;
  private blinkT = -1;
  private relaxW = 0;
  private ph0 = 0;
  props: Record<string, THREE.Object3D> = {};
  private k: number;
  private layers = new Map<string, Layer>();
  private speed = 0;
  private speedT = 0;
  private phase = 0;
  private t = 0;
  private talkT = 0;
  private talkAmp = 0;
  private talkHold = 0;
  private look: THREE.Vector3 | null = null;
  private yaw = 0;
  private pitch = 0;
  private stateT = 0;
  private fade = 0.35;
  private ik: Record<Side, { w: number; target: number }> = { l: { w: 0, target: 0 }, r: { w: 0, target: 0 } };
  private finger: Record<Side, { pose: FingerPose; w: number }> = { l: { pose: "relax", w: 0 }, r: { pose: "relax", w: 0 } };
  private rnd: () => number;
  private seated = false;
  private idleClip: string;
  private walkClip: string;
  private lod = 0;
  private skip = 0;
  private acc = 0;
  private capFly: { t: number; obj: THREE.Object3D; home: THREE.Matrix4; parent: THREE.Object3D } | null = null;
  private B: Record<string, THREE.Bone> = {};
  private clips: Map<string, THREE.AnimationClip>;
  private handBind: Record<Side, { q: THREE.Quaternion; f: THREE.Vector3; n: THREE.Vector3 }>;
  private fingerAxes: Map<THREE.Bone, { axis: THREE.Vector3; rest: THREE.Quaternion }> = new Map();

  constructor(base: Base, o: RigOpts) {
    this.base = base;
    let s = o.seed * 9301 + 49297;
    this.rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    this.bones = base.names.map((n, i) => { const b = new THREE.Bone(); b.name = n; b.position.copy(base.restPos[i]); b.quaternion.copy(base.restQuat[i]); return b; });
    base.parent.forEach((p, i) => (p >= 0 ? this.bones[p].add(this.bones[i]) : this.rig.add(this.bones[i])));
    for (const b of this.bones) this.B[b.name] = b;
    this.skeleton = new THREE.Skeleton(this.bones, base.inverses.map((m) => m.clone()));
    this.clips = base.clips;
    this.k = o.scale;
    this.rig.scale.setScalar(o.scale);
    this.root.add(this.rig);
    this.height = o.scale * base.L.top;
    this.mixer = new THREE.AnimationMixer(this.rig);
    this.idleClip = o.idle ?? "Idle_Loop";
    this.walkClip = o.walk ?? "Walk_Loop";
    this.handBind = { l: this.handFrame("l"), r: this.handFrame("r") };
    for (const side of ["l", "r"] as Side[]) for (const f of ["index", "middle", "ring", "pinky", "thumb"]) for (const j of [1, 2, 3]) {
      const b = this.B[`${f}_0${j}_${side}`];
      if (!b) continue;
      const hb = this.handBind[side];
      const wq = new THREE.Quaternion().setFromRotationMatrix(base.bindWorld[base.index[b.name]]);
      const curlAx = new THREE.Vector3().crossVectors(hb.f, hb.n).normalize();
      const axisW = f === "thumb" ? hb.f.clone().multiplyScalar(side === "l" ? 0.75 : -0.75).addScaledVector(curlAx, 0.45).normalize() : curlAx;
      this.fingerAxes.set(b, { axis: axisW.applyQuaternion(wq.clone().invert()).normalize(), rest: b.quaternion.clone() });
    }
    this.ph0 = this.rnd() * 20;
    this.blinkIn = 0.5 + this.rnd() * 3;
    this.setBase(this.idleClip, 0);
    this.mixer.update(this.rnd() * 3);
    this.root.userData.character = this;
  }

  private handFrame(side: Side) {
    const b = this.base, wm = b.bindWorld;
    const hand = new THREE.Vector3().setFromMatrixPosition(wm[b.index[`hand_${side}`]]);
    const mid = new THREE.Vector3().setFromMatrixPosition(wm[b.index[`middle_01_${side}`]]);
    const f = mid.sub(hand).normalize();
    const n = new THREE.Vector3(0, -1, 0);
    n.sub(f.clone().multiplyScalar(n.dot(f))).normalize();
    return { q: new THREE.Quaternion().setFromRotationMatrix(wm[b.index[`hand_${side}`]]), f, n };
  }

  /* ---------------- contract ---------------- */

  setOutfit(o: Outfit) {
    if (o === this.outfit) return;
    this.outfit = o;
    this.onOutfit?.(o);
  }

  play(s: CharState, fadeSec = 0.35) {
    if (s === this.state) return;
    const prev = this.state;
    this.state = s;
    this.fade = Math.max(0.05, fadeSec);
    this.stateT = 0;
    const sitting = s === "sit" || s === "type";
    if (sitting && !this.seated && fadeSec > 0.1 && prev !== "paraglide") { this.seated = true; this.setBase("Sitting_Enter", 0.25, true); return; }
    this.seated = sitting;
    if (s === "walk" && this.speedT < 0.1) this.speedT = this.base.cycle.walk / 1.333 * this.k * 1.25;
    if (s === "run" && this.speedT < 2) this.speedT = 3.2;
    if (s === "idle" || s === "look") { if (this.speedT > 0 && (prev === "walk" || prev === "run")) this.speedT = 0; }
    this.setBase(this.clipFor(s), this.fade);
    if (s === "toss") this.launchCap();
  }

  setLocomotion(speed: number) { this.speedT = Math.max(0, speed); }

  lookAt(p: V3 | null) { this.look = p ? (this.look ?? new THREE.Vector3()).set(p[0], p[1], p[2]) : null; }

  talk(level: number) { this.talkT = Math.max(0, Math.min(1, level)); if (level > 0.04) this.talkHold = 0.9; }

  update(dt: number) {
    dt = Math.min(dt, 0.1);
    this.t += dt;
    this.stateT += dt;
    this.speed = damp(this.speed, this.speedT, 5, dt);
    this.talkAmp = damp(this.talkAmp, this.talkT, 14, dt);
    this.talkHold = Math.max(0, this.talkHold - dt);
    if (this.lodObj) this.lod = this.lodObj.getCurrentLevel();
    if (this.lod > 0) {
      this.acc += dt;
      if (++this.skip % (this.lod === 1 ? 2 : 4) !== 0) return;
      dt = this.acc; this.acc = 0;
    }
    this.baseLogic();
    for (const [name, l] of this.layers) {
      if (name.startsWith("loco:")) continue;
      l.w = l.target > l.w ? Math.min(l.target, l.w + dt * l.rate) : Math.max(l.target, l.w - dt * l.rate);
      if (l.w <= 0 && l.target <= 0) { l.action.stop(); this.layers.delete(name); }
    }
    this.locomotion(dt);
    let sum = 0;
    for (const [n, l] of this.layers) sum += n.startsWith("loco:") ? l.w : l.w * (1 - this.locoW);
    for (const [n, l] of this.layers) {
      const w = n.startsWith("loco:") ? l.w : l.w * (1 - this.locoW);
      l.action.setEffectiveWeight(sum > 1e-4 ? w / sum : 0);
      if (n.startsWith("loco:") && l.w <= 0.001) { l.action.stop(); this.layers.delete(n); }
    }
    this.mixer.update(dt);
    this.onFrame?.();
    if (this.lod >= 2) return;
    this.rig.updateMatrixWorld(true);
    this.headLayer(dt);
    this.legLayer(dt);
    this.relaxLayer(dt);
    this.armLayer(dt);
    this.fingerLayer(dt);
    this.capLayer(dt);
    if (this.jaw) {
      const inf = (this.jaw.mesh as THREE.Mesh).morphTargetInfluences;
      if (inf) inf[this.jaw.i] = this.talkAmp * (0.55 + 0.45 * Math.abs(Math.sin(this.t * 11.0))) * 0.9;
    }
    if (this.blink) {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) { this.blinkT = 0; this.blinkIn = this.rnd() < 0.15 ? 0.32 : 2.2 + this.rnd() * 4; }
      let b = 0;
      if (this.blinkT >= 0) { this.blinkT += dt; const u = this.blinkT / 0.17; b = u < 0.4 ? u / 0.4 : Math.max(0, 1 - (u - 0.4) / 0.6); if (u >= 1) this.blinkT = -1; }
      const inf = (this.blink.mesh as THREE.Mesh).morphTargetInfluences;
      if (inf) inf[this.blink.i] = b;
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.rig);
    this.onDispose?.();
    this.root.removeFromParent();
  }

  lodObj: THREE.LOD | null = null;

  /** switch to another shaped body of the same rig (hero outfits: adult / child): joint offsets and bind matrices */
  useBody(b: Base, scale: number) {
    if (b !== this.base) {
      this.base = b;
      b.restPos.forEach((p, i) => { if (b.names[i] !== "pelvis") this.bones[i].position.copy(p); });
      b.inverses.forEach((m, i) => this.skeleton.boneInverses[i].copy(m));
      this.handBind = { l: this.handFrame("l"), r: this.handFrame("r") };
    }
    this.k = scale;
    this.rig.scale.setScalar(scale);
    this.height = scale * b.L.top;
  }

  /* ---------------- base layer ---------------- */

  private clipFor(s: CharState): string {
    switch (s) {
      case "talk": return "Idle_Talking_Loop";
      case "present": return "Idle_Talking_Loop";
      case "sit": case "type": return "Sitting_Idle_Loop";
      case "paraglide": return "Sitting_Idle_Loop";
      case "clap": case "cert": case "wave": case "point": case "toss": case "look": return "Idle_Loop";
      default: return this.idleClip;
    }
  }

  private setBase(name: string, fade: number, once = false) {
    const clip = this.clips.get(name);
    if (!clip) return;
    for (const [n, l] of this.layers) if (n !== name && !n.startsWith("loco:")) { l.target = 0; l.rate = 1 / Math.max(0.05, fade); }
    let l = this.layers.get(name);
    if (!l) {
      const a = this.mixer.clipAction(clip);
      a.reset();
      a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = once;
      if (!once) a.time = this.rnd() * clip.duration;
      a.play();
      l = { action: a, w: fade <= 0.05 ? 1 : 0, target: 1, rate: 1 / Math.max(0.05, fade) };
      a.setEffectiveWeight(l.w);
      this.layers.set(name, l);
    }
    l.target = 1;
    l.rate = 1 / Math.max(0.05, fade);
  }

  private current = "";

  private baseLogic() {
    const s = this.state;
    if (this.seated && s !== "paraglide") {
      const enter = this.layers.get("Sitting_Enter");
      if (enter && enter.target > 0 && enter.action.time >= enter.action.getClip().duration - 0.3) this.setBase(this.talkHold > 0 ? "Sitting_Talking_Loop" : "Sitting_Idle_Loop", 0.3);
      else if (!enter || enter.target === 0) {
        const want = this.talkHold > 0 && s === "sit" ? "Sitting_Talking_Loop" : "Sitting_Idle_Loop";
        if (want !== this.current) { this.current = want; this.setBase(want, 0.5); }
      }
      return;
    }
    if (s === "idle" || s === "talk" || s === "look" || s === "present") {
      const talking = this.talkHold > 0 || s === "talk" || s === "present";
      const want = talking ? "Idle_Talking_Loop" : this.clipFor(s);
      if (want !== this.current) { this.current = want; this.setBase(want, 0.6); }
    }
  }

  private loco(name: string) {
    let l = this.layers.get("loco:" + name);
    if (!l) {
      const clip = this.clips.get(name);
      if (!clip) return null;
      const a = this.mixer.clipAction(clip);
      a.reset(); a.play(); a.timeScale = 0; a.setEffectiveWeight(0);
      l = { action: a, w: 0, target: 0, rate: 3 };
      this.layers.set("loco:" + name, l);
    }
    return l;
  }

  private locomotion(dt: number) {
    const v = this.speed / this.k;
    const ok = !(this.seated || this.state === "paraglide");
    const c = this.base.cycle;
    const carry = this.walkClip === "Walk_Carry_Loop";
    const wc = carry ? c.carry : c.walk, wd = carry ? 2.0 : 1.333;
    const walkW = ok ? ss(0.05, 0.45, v) * (1 - ss(2.0, 2.8, v)) : 0;
    const jogW = ok ? ss(2.0, 2.8, v) * (1 - ss(5.6, 6.6, v)) : 0;
    const sprW = ok ? ss(5.6, 6.6, v) : 0;
    const cyc = walkW * wc + jogW * c.jog + sprW * c.sprint || wc;
    this.phase = (this.phase + (Math.max(v, 0.35) * dt) / cyc) % 1;
    const any = walkW + jogW + sprW;
    for (const [n, w, d] of [[this.walkClip, walkW, wd], ["Jog_Fwd_Loop", jogW, 0.933], ["Sprint_Loop", sprW, 0.667]] as [string, number, number][]) {
      if (w <= 0.001 && !this.layers.has("loco:" + n)) continue;
      const l = this.loco(n);
      if (!l) continue;
      l.target = w; l.w = w;
      l.action.time = this.phase * d;
    }
    this.locoW = Math.min(1, any);
  }
  private locoW = 0;

  /* ---------------- procedural layers ---------------- */

  private rotateWorld(b: THREE.Bone, dq: THREE.Quaternion) {
    b.getWorldQuaternion(_q2);
    _q2.premultiply(dq);
    (b.parent as THREE.Object3D).getWorldQuaternion(_q3);
    b.quaternion.copy(_q3.invert().multiply(_q2));
    b.updateMatrixWorld(true);
  }

  private headLayer(dt: number) {
    const head = this.B.Head, neck = this.B.neck_01;
    let yt = 0, pt = 0;
    const st = this.state;
    if (this.look) {
      head.getWorldPosition(_v);
      _v2.copy(this.look).sub(_v);
      this.root.getWorldQuaternion(_q).invert();
      _v2.applyQuaternion(_q);
      yt = Math.atan2(_v2.x, _v2.z);
      pt = Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z));
      if (Math.abs(yt) > 2.4) yt = 0;
    } else if (st === "look") {
      yt = Math.sin(this.t * 0.35) * 0.7; pt = 0.12 + Math.sin(this.t * 0.23) * 0.1;
    }
    if (!this.look && st !== "look") {
      const q = this.t + this.ph0;
      pt = 0.07 + 0.025 * Math.sin(q * 0.53) + 0.012 * Math.sin(q * 1.37);
      yt = 0.05 * Math.sin(q * 0.31) + 0.02 * Math.sin(q * 0.97 + 1.1);
    }
    const lim = this.seated ? 1.0 : 1.2;
    yt = Math.max(-lim, Math.min(lim, yt));
    pt = Math.max(-0.5, Math.min(0.55, pt));
    const lw = this.locoW;
    yt *= 1 - lw * 0.5;
    this.yaw = damp(this.yaw, yt, 5, dt);
    this.pitch = damp(this.pitch, pt, 5, dt);
    const a = this.talkAmp;
    const nod = a * (0.07 * Math.sin(this.t * 6.3) + 0.035 * Math.sin(this.t * 2.1 + 1.3));
    const sway = a * 0.05 * Math.sin(this.t * 1.7);
    const y = this.yaw + sway, p = this.pitch + nod;
    if (Math.abs(y) + Math.abs(p) < 1e-4) return;
    this.root.getWorldQuaternion(_q);
    for (const [b, f] of [[neck, 0.4], [head, 0.6]] as [THREE.Bone, number][]) {
      _q2.setFromAxisAngle(Y, y * f).multiply(_q3.setFromAxisAngle(X, -p * f));
      const dq = _q.clone().multiply(_q2).multiply(_q.clone().invert());
      this.rotateWorld(b, dq);
    }
  }

  private targets(): Partial<Record<Side, ArmTarget>> {
    const L = this.base.L, k = this.k, t = this.stateT, T: Partial<Record<Side, ArmTarget>> = {};
    const st = this.state;
    const sh = L.armY * k, chest = L.chestY * k;
    const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    if (st === "wave") {
      const sw = Math.sin(this.t * 9.0);
      T.r = { pos: P(-0.33 + sw * 0.05, sh + 0.32, 0.14), palm: P(0, 0, 1), fingers: P(sw * 0.25, 1, 0.1).normalize(), pole: P(-1, -0.6, -0.2), w: 1 };
      this.finger.r.pose = "flat";
    } else if (st === "point") {
      let dir = P(-0.6, 0.15, 1).normalize();
      if (this.look) { this.root.worldToLocal(_v.copy(this.look)); dir = _v.sub(P(-0.18 * k, sh, 0)).normalize(); if (dir.z < 0.2) dir.z = 0.2; dir.normalize(); }
      T.r = { pos: P(-0.18 * k, sh, 0.02).addScaledVector(dir, 0.62 * k), palm: P(0, -1, 0), fingers: dir.clone(), pole: P(-0.4, -1, -0.3), w: 1 };
      this.finger.r.pose = "point";
    } else if (st === "clap") {
      const c = Math.pow(Math.max(0, Math.sin(this.t * 2 * Math.PI * 1.9)), 3);
      const gap = 0.03 + 0.09 * (1 - c);
      T.l = { pos: P(gap, chest - 0.02, 0.3 * k), palm: P(-1, 0, 0.15).normalize(), fingers: P(0.15, 0.55, 1).normalize(), pole: P(1, -0.6, -0.5), w: 1 };
      T.r = { pos: P(-gap, chest - 0.02, 0.3 * k), palm: P(1, 0, 0.15).normalize(), fingers: P(-0.15, 0.55, 1).normalize(), pole: P(-1, -0.6, -0.5), w: 1 };
      this.finger.l.pose = this.finger.r.pose = "flat";
    } else if (st === "cert") {
      const y = (L.chestY - 0.07) * k, z = 0.3 * k;
      T.l = { pos: P(0.17 * k, y, z), palm: P(-1, 0, -0.2).normalize(), fingers: P(0, 0.3, 1).normalize(), pole: P(1, -1, -0.3), w: 1 };
      T.r = { pos: P(-0.17 * k, y, z), palm: P(1, 0, -0.2).normalize(), fingers: P(0, 0.3, 1).normalize(), pole: P(-1, -1, -0.3), w: 1 };
      this.finger.l.pose = this.finger.r.pose = "hold";
    } else if (st === "type") {
      const s0 = this.shoulder("l"), n = (s: number) => 0.012 * Math.sin(this.t * 17 + s) * Math.max(0, Math.sin(this.t * 3.1 + s));
      const y = s0.y - 0.25 * k, z = s0.z + 0.42 * k;
      T.l = { pos: P(0.12 * k, y + n(0), z), palm: P(0, -1, 0.1).normalize(), fingers: P(-0.1, -0.15, 1).normalize(), pole: P(1, -0.8, -0.3), w: 1 };
      T.r = { pos: P(-0.12 * k, y + n(2), z), palm: P(0, -1, 0.1).normalize(), fingers: P(0.1, -0.15, 1).normalize(), pole: P(-1, -0.8, -0.3), w: 1 };
      this.finger.l.pose = this.finger.r.pose = "relax";
    } else if (st === "present") {
      const d = Math.sin(this.t * 0.9) * 0.04;
      T.r = { pos: P(-0.5 * k, chest + 0.06 + d, 0.26 * k), palm: P(-0.2, 0.6, 0.8).normalize(), fingers: P(-1, 0.1, 0.4).normalize(), pole: P(-0.4, -1, -0.4), w: 1 };
      this.finger.r.pose = "flat";
    } else if (st === "toss") {
      const up = ss(0.0, 0.35, t);
      const yUp = (L.top + 0.28) * k;
      T.l = { pos: P(0.16, chest + (yUp - chest) * up, 0.12), palm: P(0, 0, 1), fingers: P(0, 1, 0), pole: P(1, -0.5, -0.2), w: 1 };
      T.r = { pos: P(-0.16, chest + (yUp - chest) * up, 0.12), palm: P(0, 0, 1), fingers: P(0, 1, 0), pole: P(-1, -0.5, -0.2), w: 1 };
      this.finger.l.pose = this.finger.r.pose = "flat";
    } else if (st === "paraglide") {
      const s = Math.sin(this.t * 0.8) * 0.03, s0 = this.shoulder("l");
      T.l = { pos: P(0.3 * k, s0.y + 0.08 + s, s0.z + 0.1), palm: P(-0.3, 0, 1).normalize(), fingers: P(0.1, 1, 0.1).normalize(), pole: P(1, -0.6, -0.5), w: 1 };
      T.r = { pos: P(-0.3 * k, s0.y + 0.08 - s, s0.z + 0.1), palm: P(0.3, 0, 1).normalize(), fingers: P(-0.1, 1, 0.1).normalize(), pole: P(-1, -0.6, -0.5), w: 1 };
      this.finger.l.pose = this.finger.r.pose = "grip";
    }
    if (!T.l && this.outfit === "college" && !this.seated && st !== "paraglide" && this.props.laptop?.visible !== false) {
      T.l = { pos: P(0.25 * k, (L.hipY - 0.02) * k, 0.02 + 0.04 * this.locoW * Math.sin(this.phase * Math.PI * 4)), palm: P(-1, 0, 0), fingers: P(0, -0.15, 1).normalize(), pole: P(0.3, -1, -0.6), w: 1 };
      this.finger.l.pose = "grip";
    }
    return T;
  }

  private shoulder(side: Side) { return this.root.worldToLocal(this.B[`upperarm_${side}`].getWorldPosition(new THREE.Vector3())); }

  private legW = 0;
  /** paraglide: knees lifted and shins extended into the harness pod */
  private legLayer(dt: number) {
    this.legW = damp(this.legW, this.state === "paraglide" ? 1 : 0, 3, dt);
    if (this.legW < 0.01) return;
    const rq = this.root.getWorldQuaternion(new THREE.Quaternion());
    for (const s of ["l", "r"] as Side[]) {
      for (const [bn, a] of [[`thigh_${s}`, -0.3], [`calf_${s}`, -0.75]] as [string, number][]) {
        const ax = X.clone().applyQuaternion(rq);
        this.rotateWorld(this.B[bn], _q.setFromAxisAngle(ax, a * this.legW));
      }
    }
  }

  /** natural arm hang over the library idle/walk (which hold the arms out): upper arms in to ~10 deg, a soft elbow, and a walk swing
      driven by the same-side thigh so it always matches the stride */
  private relaxLayer(dt: number) {
    const st = this.state, base = this.current || this.idleClip;
    const calm = (st === "idle" || st === "look" || st === "walk" || st === "run") && !this.seated && this.outfit !== "mountaineer";
    const clipOk = (this.locoW > 0.5 ? this.walkClip === "Walk_Loop" : base === "Idle_Loop") && this.walkClip === "Walk_Loop";
    const v = this.speed / this.k;
    this.relaxW = damp(this.relaxW, calm && clipOk ? 1 - ss(2.0, 2.8, v) : 0, 4, dt);
    if (this.relaxW < 0.01) return;
    const rq = this.root.getWorldQuaternion(_q3).clone(), rqi = rq.clone().invert();
    const loc = (b: THREE.Bone, out: THREE.Vector3) => b.getWorldPosition(out);
    for (const side of ["l", "r"] as Side[]) {
      const sg = side === "l" ? 1 : -1, ua = this.B[`upperarm_${side}`], la = this.B[`lowerarm_${side}`], hd = this.B[`hand_${side}`];
      const S = loc(ua, new THREE.Vector3()), E = loc(la, new THREE.Vector3());
      const d = E.clone().sub(S).applyQuaternion(rqi).normalize();
      const th = loc(this.B[`calf_${side}`], new THREE.Vector3()).sub(loc(this.B[`thigh_${side}`], new THREE.Vector3())).applyQuaternion(rqi);
      const thA = Math.atan2(th.z, -th.y);
      const sag0 = Math.atan2(d.z, -d.y), lw = this.locoW;
      const sag = sag0 * (1 - 0.75 * lw) + lw * 0.75 * (-0.6 * thA + 0.04) + (1 - lw) * 0.03;
      const ab = 0.17 + 0.03 * lw;
      const dn = new THREE.Vector3(sg * Math.sin(ab), -Math.cos(ab) * Math.cos(sag), Math.cos(ab) * Math.sin(sag)).normalize();
      this.rotateWorld(ua, new THREE.Quaternion().slerp(_q.setFromUnitVectors(d, dn), this.relaxW).premultiply(rq).multiply(rqi));
      la.getWorldPosition(E);
      const W = hd.getWorldPosition(new THREE.Vector3());
      const f = W.sub(E).applyQuaternion(rqi).normalize();
      const flex = 0.2 + lw * (0.15 + 0.45 * Math.max(0, Math.sin(sag)));
      const fwd = new THREE.Vector3(sg * 0.18, 0, 1).normalize();
      const ax = new THREE.Vector3().crossVectors(dn, fwd).normalize();
      const fn = dn.clone().applyAxisAngle(ax, flex);
      this.rotateWorld(la, new THREE.Quaternion().slerp(_q.setFromUnitVectors(f, fn), this.relaxW).premultiply(rq).multiply(rqi));
    }
  }

  private armLayer(dt: number) {
    const T = this.targets();
    for (const side of ["l", "r"] as Side[]) {
      const tg = T[side];
      const s = this.ik[side];
      s.target = tg ? tg.w : 0;
      s.w = damp(s.w, s.target, 1 / Math.max(0.08, this.fade) * 2.2, dt);
      this.finger[side].w = s.w;
      if (s.w < 0.002 || !tg) continue;
      this.solveArm(side, tg, s.w);
    }
  }

  private solveArm(side: Side, tg: ArmTarget, w: number) {
    const ua = this.B[`upperarm_${side}`], la = this.B[`lowerarm_${side}`], hd = this.B[`hand_${side}`];
    const q0 = ua.quaternion.clone(), q1 = la.quaternion.clone(), q2 = hd.quaternion.clone();
    const S = ua.getWorldPosition(new THREE.Vector3()), E0 = la.getWorldPosition(new THREE.Vector3()), W0 = hd.getWorldPosition(new THREE.Vector3());
    const a = S.distanceTo(E0), b = E0.distanceTo(W0);
    const Tw = this.root.localToWorld(tg.pos.clone());
    const d = _v.copy(Tw).sub(S);
    const c = Math.min(Math.max(d.length(), Math.abs(a - b) + 1e-3), a + b - 1e-3);
    d.normalize();
    const rq = this.root.getWorldQuaternion(new THREE.Quaternion());
    const pole = tg.pole.clone().applyQuaternion(rq).normalize();
    const n = _v2.crossVectors(d, pole).normalize();
    const bend = _v3.crossVectors(n, d).normalize();
    const cosA = (a * a + c * c - b * b) / (2 * a * c), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const E = S.clone().addScaledVector(d, cosA * a).addScaledVector(bend, sinA * a);
    const W = S.clone().addScaledVector(d, c);
    this.aim(ua, E0, E);
    la.getWorldPosition(E0); hd.getWorldPosition(W0);
    this.aim(la, W0, W);
    if (tg.palm && tg.fingers) {
      const hb = this.handBind[side];
      const f = tg.fingers.clone().applyQuaternion(rq).normalize();
      const nn = tg.palm.clone().applyQuaternion(rq);
      nn.sub(_v4.copy(f).multiplyScalar(nn.dot(f))).normalize();
      const mb = new THREE.Matrix4().makeBasis(hb.f, hb.n, _v4.crossVectors(hb.f, hb.n));
      const mt = new THREE.Matrix4().makeBasis(f, nn, new THREE.Vector3().crossVectors(f, nn));
      const R = new THREE.Quaternion().setFromRotationMatrix(mt.multiply(mb.transpose()));
      const want = R.multiply(hb.q);
      (hd.parent as THREE.Object3D).getWorldQuaternion(_q3);
      const local = _q3.invert().multiply(want);
      hd.quaternion.slerp(local, 0.9);
    }
    if (w < 0.999) { ua.quaternion.copy(q0.slerp(ua.quaternion, w)); la.quaternion.copy(q1.slerp(la.quaternion, w)); hd.quaternion.copy(q2.slerp(hd.quaternion, w)); }
    ua.updateMatrixWorld(true);
  }

  private aim(b: THREE.Bone, from: THREE.Vector3, to: THREE.Vector3) {
    const p = b.getWorldPosition(new THREE.Vector3());
    const f = from.clone().sub(p).normalize(), t = to.clone().sub(p).normalize();
    this.rotateWorld(b, _q.setFromUnitVectors(f, t));
  }

  private fingerLayer(_dt: number) {
    const rest: FingerPose = this.outfit === "mountaineer" ? "grip" : "relax";
    for (const side of ["l", "r"] as Side[]) {
      const F = this.finger[side];
      const curl = (pose: FingerPose, f: string, j: number): number => {
        switch (pose) {
          case "point": return f === "index" ? 0.05 : f === "thumb" ? 0.5 : 1.35;
          case "fist": return f === "thumb" ? 0.7 : 1.45;
          case "flat": return f === "thumb" ? 0.1 : 0.08 + j * 0.03;
          case "hold": return f === "thumb" ? 0.35 : 0.35 + j * 0.15;
          case "grip": return f === "thumb" ? 0.6 : 1.1;
          default: {
            if (f === "thumb") return j === 1 ? 0.12 : 0.22;
            const k = f === "index" ? 0.75 : f === "middle" ? 0.95 : f === "ring" ? 1.1 : 1.25;
            return k * (j === 1 ? 0.3 : j === 2 ? 0.48 : 0.3);
          }
        }
      };
      for (const [b, ax] of this.fingerAxes) {
        if (!b.name.endsWith("_" + side)) continue;
        const m = /^(\w+?)_0(\d)/.exec(b.name)!;
        const a0 = curl(rest, m[1], +m[2]), ang = F.w > 0.01 ? a0 + (curl(F.pose, m[1], +m[2]) - a0) * F.w : a0;
        b.quaternion.copy(ax.rest).multiply(_q2.setFromAxisAngle(ax.axis, ang));
      }
    }
  }

  private launchCap() {
    const cap = this.props.cap;
    if (!cap || this.capFly) return;
    this.capFly = { t: 0, obj: cap, home: cap.matrix.clone(), parent: cap.parent as THREE.Object3D };
  }

  private capLayer(dt: number) {
    const f = this.capFly;
    if (!f) return;
    f.t += dt;
    const tt = f.t - 0.32;
    if (tt < 0) return;
    if (f.obj.parent !== this.root) { const wm = f.obj.matrixWorld.clone(); this.root.attach(f.obj); f.obj.userData.p0 = f.obj.position.clone(); f.obj.userData.w = wm; }
    const p0 = f.obj.userData.p0 as THREE.Vector3, g = 9.8, v0 = 7.2;
    const y = p0.y + v0 * tt - 0.5 * g * tt * tt;
    f.obj.position.set(p0.x + tt * 0.25, Math.max(0.03, y), p0.z + tt * 0.35);
    f.obj.rotation.set(tt * 5.0, tt * 7.0, tt * 1.2);
    if (y <= 0.03) { f.obj.rotation.set(0, tt * 7.0, 0); }
    if (this.state !== "toss" && f.t > 0.4) {
      f.parent.add(f.obj); f.obj.matrix.copy(f.home); f.obj.matrix.decompose(f.obj.position, f.obj.quaternion, f.obj.scale);
      this.capFly = null;
    }
  }
}
