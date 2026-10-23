import * as THREE from 'three';
import { buildRig, setHand, OUTFITS, type Rig, type BodySpec, type BoneName, type HandPose } from './character';
import type { Act, OutfitName } from './types';

/* ==== the hero's body in motion. Feet are tracked in the world: a planted foot never moves, a swinging foot flies to where the body
   will be when it lands, so stride always matches ground speed. Legs are solved with two-bone IK; the pelvis rides as high as the planted
   legs allow; arms counter-swing to the legs; speed, acceleration and turning lean the body. Upper-body acts layer on top once he settles. ==== */

const V = () => new THREE.Vector3();
const Q = () => new THREE.Quaternion();
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const wrap = (a: number) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
const damp = (cur: number, to: number, k: number, dt: number) => cur + (to - cur) * (1 - Math.exp(-k * dt));

interface Foot { g: THREE.Vector3; yaw: number; swing: { from: THREE.Vector3; fromYaw: number; fromPitch: number } | null; pitch: number; side: number; to: THREE.Vector3; toYaw: number; u: number }
type J = [number, number, number];
interface UpperPose { spine: J; chest: J; neck: J; head: J; armL: J; armR: J; foreL: J; foreR: J; handL: J; handR: J; hL: HandPose; hR: HandPose; crouch: number }
const ZJ = (): J => [0, 0, 0];
const zeroPose = (): UpperPose => ({ spine: ZJ(), chest: ZJ(), neck: ZJ(), head: ZJ(), armL: ZJ(), armR: ZJ(), foreL: ZJ(), foreR: ZJ(), handL: ZJ(), handR: ZJ(), hL: 'relax', hR: 'relax', crouch: 0 });
const lerpJ = (a: J, b: J, t: number): J => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export interface HeroOpts { ground?: (x: number, z: number) => number; spec?: Partial<BodySpec> }
export interface ReleaseInfo { pos: THREE.Vector3; vel: THREE.Vector3; spin: THREE.Vector3 }

export class Hero {
  group = new THREE.Group();
  rig!: Rig; rigs = new Map<OutfitName, Rig>(); outfit: OutfitName = 'school';
  spec: Partial<BodySpec>;
  ground: (x: number, z: number) => number;
  pos = V(); yaw = 0; speed = 0; accel = 0; yawRate = 0; vmax = 6.5;
  path: THREE.Vector3[] = []; faceYaw: number | null = null; arrived = true; reached = true; private arriveCbs: (() => void)[] = [];
  feet: Foot[] = []; phase = 0; stepping = false; private pelvisY = 0; private pelvisV = 0; private shift = 0;
  act: Act | null = null; actT = 0; uw = 0; focus: THREE.Vector3 | null = null; look: THREE.Vector3 | null = null; camera: THREE.Vector3 | null = null;
  talkLevel = 0; speaking = false; private lvl = 0; private lvlPrev = 0; private beat = 0;
  seat: { p: THREE.Vector3; yaw: number; h: number } | null = null; sitK = 0; private sitWant = false;
  onRelease: ((r: ReleaseInfo) => void) | null = null; tossT = -1; private released = false; private handPrev = V(); private handVel = V();
  prop: THREE.Object3D | null = null; propMode: 'cert' | 'laptop' | null = null; laptopOn = false;
  private blinkT = 2; private blink = 0; private t = 0; private spring = { pack: 0, packV: 0, tx: 0, tvx: 0, tz: 0, tvz: 0, lastV: V() };
  private tmp = { a: V(), b: V(), c: V(), d: V(), e: V(), q: Q(), q2: Q(), q3: Q(), m: new THREE.Matrix4(), inv: new THREE.Matrix4() };

  constructor(o: HeroOpts = {}) {
    this.ground = o.ground || (() => 0);
    this.spec = { height: 1.74, skin: '#96664a', hair: '#120d0a', hairStyle: 'side', seed: 3, ...(o.spec || {}) };
    this.wear('school');
  }
  private rigFor(name: OutfitName) {
    let r = this.rigs.get(name);
    if (!r) { const teen = name === 'school'; r = buildRig({ ...this.spec, height: teen ? 1.62 : this.spec.height, teen, outfit: OUTFITS[name] } as BodySpec); this.rigs.set(name, r); }
    return r;
  }
  /** every outfit built and attached while loading (so the engine's warm-up draws them once), then detached again */
  prewarm(on: boolean) { for (const n of Object.keys(OUTFITS) as OutfitName[]) { const r = this.rigFor(n); if (on) this.group.add(r.group); else if (r !== this.rig) this.group.remove(r.group); } }
  wear(name: OutfitName) {
    const r = this.rigFor(name);
    if (this.rig && this.rig !== r) this.group.remove(this.rig.group);
    this.rig = r; this.outfit = name; if (r.group.parent !== this.group) this.group.add(r.group);
    if (!this.feet.length) this.place(this.pos, this.yaw);
    this.pelvisY = 0; return this;
  }
  get H() { return this.rig.d.k * 1.74; }

  /* put him somewhere instantly: feet side by side, standing, no gait (only ever done out of frame) */
  place(p: THREE.Vector3, yaw: number) {
    this.pos.copy(p); this.yaw = yaw; this.speed = 0; this.accel = 0; this.path = []; this.arrived = true; this.sitK = 0; this.seat = null; this.sitWant = false;
    const d = this.rig.d, s = Math.sin(yaw), c = Math.cos(yaw);
    this.feet = [1, -1].map((side) => { const g = new THREE.Vector3(p.x + c * side * (d.hw + 0.005), 0, p.z - s * side * (d.hw + 0.005)); g.y = this.ground(g.x, g.z); return { g, yaw, swing: null, pitch: 0, side, to: g.clone(), toYaw: yaw, u: 0 }; });
    this.pelvisY = 0; this.stepping = false; this.phase = 0;
  }
  /** walk a path of ground points; the promise resolves once he has stopped and turned to faceYaw */
  go(points: THREE.Vector3[], faceYaw: number | null = null, vmax = 6.5): Promise<void> {
    this.path = points.map((p) => p.clone()); this.faceYaw = faceYaw; this.vmax = vmax; this.arrived = false; if (this.seat) this.stand();
    return new Promise((res) => this.arriveCbs.push(res));
  }
  sitAt(p: THREE.Vector3, yaw: number, h: number, approach?: THREE.Vector3[]) {
    const front = new THREE.Vector3(p.x + Math.sin(yaw) * 0.4, p.y, p.z + Math.cos(yaw) * 0.4);
    const pr = this.go([...(approach || []), front], yaw, 6.2); this.seat = { p: p.clone(), yaw, h }; this.sitWant = true; return pr;
  }
  stand() { this.sitWant = false; }
  setAct(a: Act | null, focus?: THREE.Vector3 | null) { if (a !== this.act) { this.act = a; this.actT = 0; } if (focus !== undefined) this.focus = focus; }
  toss() { this.tossT = 0; this.released = false; }
  private xfer: { o: THREE.Object3D; from: THREE.Matrix4; t: number } | null = null;
  hold(obj: THREE.Object3D | null, mode: 'cert' | 'laptop' | null, tween = false) {
    if (this.prop && this.prop.parent && this.prop !== obj) this.prop.parent.remove(this.prop);
    this.prop = obj; this.propMode = mode;
    if (obj) { const hb = this.rig.bones.handR; obj.updateWorldMatrix(true, false); const from = obj.matrixWorld.clone(); hb.add(obj); if (tween) this.xfer = { o: obj, from, t: 0 }; if (mode === 'cert') { obj.position.set(0.09 * this.rig.d.k, -0.1, 0.06); obj.rotation.set(0, -Math.PI / 2 + 0.25, 0.1); } else { obj.position.set(-0.02, -0.12, 0.02); obj.rotation.set(0, 0, 0); } }
  }

  private home(side: number, out: THREE.Vector3, yaw = this.yaw) { const d = this.rig.d, w = d.hw + 0.005 - 0.03 * this.runK; out.set(this.pos.x + Math.cos(yaw) * side * w, 0, this.pos.z - Math.sin(yaw) * side * w); return out; }
  private runK = 0;

  update(dt: number, t: number) {
    dt = Math.min(dt, 0.05); this.t = t; const d = this.rig.d, T = this.tmp;
    /* ---- 1. travel: speed from distance-to-stop with accel/decel limits, heading with a turn-rate limit ---- */
    let dStop = Infinity, vDes = 0, yawDes = this.yaw;
    while (this.path.length > 1 && Math.hypot(this.path[0].x - this.pos.x, this.path[0].z - this.pos.z) < 0.6) this.path.shift();
    if (this.path.length) {
      const p = this.path[0], dx = p.x - this.pos.x, dz = p.z - this.pos.z, dist = Math.hypot(dx, dz);
      dStop = dist; for (let i = 1; i < this.path.length; i++) dStop += this.path[i].distanceTo(this.path[i - 1]);
      if (dStop < 0.04 && this.speed < 0.15) { this.path = []; dStop = 0; }
      else { yawDes = Math.atan2(dx, dz); vDes = Math.min(this.vmax, Math.sqrt(2 * 2.6 * Math.max(0, dStop - 0.02)), dStop < 7 ? 1.5 + dStop * 0.45 : 99); }
    }
    const turnErr = wrap(yawDes - this.yaw);
    if (this.path.length) vDes *= 1 - 0.75 * sm(0.6, 1.6, Math.abs(turnErr));
    if (!this.path.length && this.faceYaw != null && (!this.seat || this.sitK < 0.01)) yawDes = this.faceYaw;
    const prevSpeed = this.speed, aMax = this.speed < 3 ? 3.2 : 2.2;
    this.speed = clamp(vDes, this.speed - 3.6 * dt, this.speed + aMax * dt); if (this.speed < 0.005) this.speed = 0;
    this.accel = damp(this.accel, (this.speed - prevSpeed) / Math.max(dt, 1e-4), 6, dt);
    const wMax = this.speed > 3 ? 2.2 : 4.2, dy = clamp(wrap(yawDes - this.yaw), -wMax * dt, wMax * dt);
    if (this.sitK < 0.02) { this.yaw = wrap(this.yaw + dy); }
    this.yawRate = damp(this.yawRate, dy / Math.max(dt, 1e-4), 8, dt);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    this.pos.x += fx * this.speed * dt; this.pos.z += fz * this.speed * dt;
    this.reached = !this.path.length && this.speed === 0 && (this.faceYaw == null || Math.abs(wrap(this.faceYaw - this.yaw)) < 0.04) && !this.stepping;
    if (!this.arrived && this.reached && (!this.seat || !this.sitWant || this.sitK > 0.98)) { this.arrived = true; const cbs = this.arriveCbs; this.arriveCbs = []; cbs.forEach((f) => f()); }
    /* ---- 2. gait clock ---- */
    const v = this.speed; this.runK = damp(this.runK, sm(2.1, 3.3, v), 5, dt); const r = this.runK;
    const beta = 0.62 - 0.26 * r, fcW = 0.52 + 0.27 * v, fcR = 1.12 + 0.135 * v, moving = v > 0.02 || this.path.length > 0;
    let fc = moving ? fcW + (fcR - fcW) * r : 1.05, S = moving ? v / fc : 0;
    let need = moving; const hm = T.a;
    if (!need && this.sitK < 0.02) for (const f of this.feet) { this.home(f.side, hm); if (Math.hypot(f.g.x - hm.x, f.g.z - hm.z) > 0.075 || Math.abs(wrap(f.yaw - this.yaw)) > 0.3) need = true; }
    if (this.sitK > 0.02 || (this.seat && this.sitWant && this.reached)) need = false;
    if (need) this.stepping = true;
    else if (this.stepping && this.feet.every((f) => !f.swing)) { const ph = this.phase % 0.5; if (ph < 0.5 - (1 - beta) * 0.5 && ph >= 0 && this.feet.every((f) => !f.swing)) this.stepping = false; }
    if (this.stepping) this.phase += fc * dt;
    const g = sm(0, 0.9, v);
    /* ---- 3. feet ---- */
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i], psi = (this.phase + i * 0.5) % 1, inSwing = this.stepping && psi >= beta;
      if (inSwing && !f.swing) f.swing = { from: f.g.clone(), fromYaw: f.yaw, fromPitch: f.pitch };
      if (f.swing) {
        const u = inSwing ? (psi - beta) / (1 - beta) : 1; f.u = u;
        const rem = (1 - u) * (1 - beta) / Math.max(fc, 0.3), adv = Math.min(v * rem, dStop), lead = moving ? Math.min(beta * S * 0.5, Math.max(0, dStop - adv)) : 0;
        const turnAhead = this.yaw + this.yawRate * rem * 0.5;
        const cx = this.pos.x + Math.sin(turnAhead) * (adv + lead), cz = this.pos.z + Math.cos(turnAhead) * (adv + lead), w = d.hw + 0.005 - 0.03 * r;
        f.to.set(cx + Math.cos(turnAhead) * f.side * w, 0, cz - Math.sin(turnAhead) * f.side * w); f.toYaw = turnAhead + f.side * 0.06;
        const e = u * u * (3 - 2 * u), ez = r > 0.5 ? Math.pow(u, 1.25) : e;
        const nx = f.swing.from.x + (f.to.x - f.swing.from.x) * ez, nz = f.swing.from.z + (f.to.z - f.swing.from.z) * ez;
        const lift = (0.06 + 0.06 * Math.min(1, S) + 0.22 * r) * (moving ? 1 : 0.55);
        f.g.set(nx, this.ground(nx, nz) + lift * Math.sin(Math.PI * Math.pow(u, r > 0.5 ? 0.75 : 1)), nz);
        f.yaw = f.swing.fromYaw + wrap(f.toYaw - f.swing.fromYaw) * e;
        f.pitch = u < 0.5 ? f.swing.fromPitch * (1 - u * 2) + (-0.5 - 0.5 * r) * 0 : (0.22 - 0.2 * r) * sm(0.5, 0.95, u) * (moving ? 1 : 0.3);
        if (!inSwing || u >= 1) { f.g.set(f.to.x, this.ground(f.to.x, f.to.z), f.to.z); f.yaw = f.toYaw; f.swing = null; }
      } else {
        const sp = this.stepping ? psi / beta : 0.5;
        const strike = (0.22 - 0.2 * r) * (1 - sm(0, 0.16, sp)), off = -(0.5 + 0.35 * r) * sm(0.62, 1, sp) * (moving ? 1 : 0.4);
        f.pitch = this.stepping ? strike + off : damp(f.pitch, 0, 10, dt); f.g.y = this.ground(f.g.x, f.g.z);
      }
    }
    /* ---- 4. pelvis ---- */
    const gy = this.ground(this.pos.x, this.pos.z), G = this.group;
    G.position.set(this.pos.x, gy, this.pos.z); G.rotation.set(0, this.yaw, 0); G.updateMatrixWorld();
    T.inv.copy(G.matrixWorld).invert();
    const lf = this.feet.map((f) => T.b.copy(f.g).applyMatrix4(T.inv).clone());
    const fwdL = lf.map((p) => clamp(p.z / Math.max(0.12, S * 0.5 + 0.05), -1.3, 1.3));
    const stanceL = this.feet.map((f) => (f.swing ? 0 : 1));
    this.shift = damp(this.shift, 0.022 * (g * (1 - r) + 0.25) * (stanceL[0] - stanceL[1]) * (this.stepping ? 1 : 0), 10, dt);
    const ph2 = (this.phase - beta / 2) * Math.PI * 4, bob = this.stepping ? g * ((1 - r) * 0.016 * Math.cos(ph2) - r * 0.035 * Math.cos(ph2)) : 0;
    const up = this.upper(dt, t), idleShift = (1 - g) * 0.012 * Math.sin(t * 0.45) * this.uw;
    let hipY = d.hipY - 0.012 - 0.045 * r + bob - up.crouch;
    const L = (d.thigh + d.shin) * 0.995;
    for (let i = 0; i < 2; i++) { if (!stanceL[i] && this.stepping) continue; const hx = this.shift + idleShift + this.feet[i].side * d.hw, ank = this.ankle(this.feet[i], T.c).applyMatrix4(T.inv), hz2 = (ank.x - hx) ** 2 + (ank.z) ** 2; if (hz2 < L * L) hipY = Math.min(hipY, ank.y + Math.sqrt(L * L - hz2)); }
    let pz = 0, pxs = this.shift + idleShift;
    if (this.seat) {
      const want = this.sitWant && this.reached ? 1 : 0; this.sitK = clamp(this.sitK + (want ? 1 : -1) * dt / 1.3, 0, 1);
      const sk = this.sitK * this.sitK * (3 - 2 * this.sitK), sp = T.d.copy(this.seat.p).applyMatrix4(T.inv);
      hipY += (this.ground(this.seat.p.x, this.seat.p.z) + this.seat.h + 0.09 * d.k - gy - hipY) * sk; pz = (sp.z + 0.05) * sk; pxs = pxs * (1 - sk) + sp.x * sk;
      if (!this.sitWant && this.sitK <= 0) this.seat = null;
    }
    this.pelvisV += ((hipY - this.pelvisY) * 420 - this.pelvisV * 38) * dt; this.pelvisY += this.pelvisV * dt; if (this.pelvisY === 0 || Math.abs(this.pelvisY - hipY) > 0.4) { this.pelvisY = hipY; this.pelvisV = 0; }
    const sitLean = this.seat ? Math.sin(Math.PI * this.sitK) * 0.5 : 0;
    const lean = (0.02 + 0.035 * Math.pow(v, 0.8) + 0.06 * clamp(this.accel / 3, -1, 1)) * (1 - this.uw * 0.8) + sitLean;
    const bank = clamp(-Math.atan(v * this.yawRate / 9.81), -0.3, 0.3);
    const B = this.rig.bones, pyaw = -0.5 * (0.08 + 0.1 * r) * g * (fwdL[0] - fwdL[1]) * 0.5, proll = 0.035 * g * (stanceL[0] - stanceL[1]) * (1 - r * 0.5) * (this.stepping ? 1 : 0);
    B.pelvis.position.set(pxs, this.pelvisY + (d.pelvisY - d.hipY), pz);
    B.pelvis.quaternion.setFromEuler(new THREE.Euler(lean * 0.35 + up.spine[0] * 0, pyaw, proll + bank, 'YXZ'));
    B.root.updateMatrixWorld(true);
    /* ---- 5. legs: two-bone IK in the group frame ---- */
    for (let i = 0; i < 2; i++) this.legIK(i === 0 ? 'L' : 'R', this.feet[i]);
    /* ---- 6. spine, head, arms ---- */
    const swingA = (0.22 + 0.5 * r) * g * (1 - this.uw), elW = -(0.18 + 1.25 * r) * Math.max(g, 0.0);
    const loco: UpperPose = zeroPose();
    loco.spine = [lean * 0.35, -pyaw * 0.4, 0]; loco.chest = [lean * 0.3, -pyaw * 0.9, -proll * 0.5]; loco.neck = [-lean * 0.35, 0, 0]; loco.head = [-lean * 0.35, 0, -bank * 0.5];
    loco.armL = [-swingA * fwdL[1] + 0.05 * r, 0, 0.07 + 0.1 * r]; loco.armR = [-swingA * fwdL[0] + 0.05 * r, 0, -0.07 - 0.1 * r];
    loco.foreL = [elW - 0.12 - Math.max(0, -swingA * fwdL[1]) * 0.6, 0.3 * r, 0]; loco.foreR = [elW - 0.12 - Math.max(0, -swingA * fwdL[0]) * 0.6, -0.3 * r, 0];
    loco.hL = loco.hR = r > 0.5 ? 'grip' : 'relax';
    const P = this.blendPose(loco, up, this.uw);
    if (this.outfit === 'office' && this.laptopOn && this.rig.parts.laptop && this.act !== 'cert') { P.armL = [0.06, -0.15, 0.16]; P.foreL = [-1.35, 0.9, 0]; P.hL = 'grip'; }
    const E = (b: BoneName, j: J, order: THREE.EulerOrder = 'YXZ') => B[b].quaternion.setFromEuler(new THREE.Euler(j[0], j[1], j[2], order));
    E('spine', P.spine); E('chest', P.chest); E('neck', P.neck); E('head', P.head);
    E('armL', P.armL, 'ZXY'); E('armR', P.armR, 'ZXY'); E('foreL', P.foreL, 'XYZ'); E('foreR', P.foreR, 'XYZ'); E('handL', P.handL); E('handR', P.handR);
    setHand(this.rig, 'L', P.hL); setHand(this.rig, 'R', P.hR);
    if (this.act === 'point' && this.focus && this.uw > 0.05) this.aimArm('R', this.focus, this.uw * sm(0.2, 0.9, this.actT) * (1 - sm(3.2, 4.0, this.actT)));
    if (this.act === 'present' && this.focus && this.uw > 0.05) this.aimArm('L', this.focus, this.uw * 0.85 * (0.5 + 0.5 * Math.sin(this.actT * 0.7 - 1.2)) * sm(0.3, 1, this.actT));
    this.headLook(dt);
    this.secondary(dt);
    if (this.xfer) this.xferUpdate(dt);
    if (this.tossT >= 0) this.tossUpdate(dt);
    if (this.rig.parts.laptop) this.rig.parts.laptop.visible = this.outfit === 'office' && this.laptopOn && this.act !== 'cert';
  }

  /* ankle position for a foot: pivot on the ball when the heel is up, on the heel when the toes are up */
  private ankle(f: Foot, out: THREE.Vector3) {
    const d = this.rig.d, s = Math.sin(f.yaw), c = Math.cos(f.yaw), p = f.pitch;
    if (p < 0) { const bx = f.g.x + s * d.foot, bz = f.g.z + c * d.foot, ry = d.ankY * Math.cos(p) + d.foot * Math.sin(p), rz = d.ankY * Math.sin(-p) - d.foot * Math.cos(p); out.set(bx + s * rz, f.g.y + ry, bz + c * rz); }
    else { const hb = 0.06 * d.k, hx = f.g.x - s * hb, hz = f.g.z - c * hb, ry = d.ankY * Math.cos(p) + hb * Math.sin(p), rz = hb * Math.cos(p) - d.ankY * Math.sin(p); out.set(hx + s * rz, f.g.y + ry, hz + c * rz); }
    return out;
  }
  private legIK(side: 'L' | 'R', f: Foot) {
    const B = this.rig.bones, d = this.rig.d, T = this.tmp, thigh = B[('thigh' + side) as BoneName], shin = B[('shin' + side) as BoneName], foot = B[('foot' + side) as BoneName], toe = B[('toe' + side) as BoneName];
    const hip = thigh.getWorldPosition(T.a).applyMatrix4(T.inv), ank = this.ankle(f, T.b).applyMatrix4(T.inv);
    const l1 = d.thigh, l2 = d.shin, dv = T.c.subVectors(ank, hip); let L = dv.length(); const maxL = (l1 + l2) * 0.9995;
    if (L > maxL) { dv.multiplyScalar(maxL / L); L = maxL; ank.copy(hip).add(dv); }
    const dn = dv.clone().normalize(), fy = wrap(f.yaw - this.yaw), pole = new THREE.Vector3(Math.sin(fy) * 0.9 + (side === 'L' ? 0.08 : -0.08), 0.05, Math.cos(fy)).normalize();
    const pp = pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))).normalize();
    const ca = clamp((l1 * l1 + L * L - l2 * l2) / (2 * l1 * L), -1, 1), a = Math.acos(ca);
    const knee = hip.clone().add(dn.clone().multiplyScalar(Math.cos(a) * l1)).add(pp.clone().multiplyScalar(Math.sin(a) * l1));
    const basis = (dir: THREE.Vector3, fwd: THREE.Vector3, q: THREE.Quaternion) => { const y = dir.clone().negate().normalize(), z = fwd.clone().sub(y.clone().multiplyScalar(fwd.dot(y))).normalize(), x = new THREE.Vector3().crossVectors(y, z); T.m.makeBasis(x, y, z); return q.setFromRotationMatrix(T.m); };
    const qThighW = basis(knee.clone().sub(hip), pp, Q()), qShinW = basis(ank.clone().sub(knee), pp.clone().add(dn.clone().multiplyScalar(-0.0)), Q());
    const pelvisQ = B.pelvis.quaternion.clone();
    thigh.quaternion.copy(pelvisQ.clone().invert().multiply(qThighW));
    shin.quaternion.copy(qThighW.clone().invert().multiply(qShinW));
    const qFoot = new THREE.Quaternion().setFromEuler(new THREE.Euler(-f.pitch, fy, 0, 'YXZ'));
    foot.quaternion.copy(qShinW.clone().invert().multiply(qFoot));
    toe.quaternion.setFromEuler(new THREE.Euler(Math.min(0, f.pitch), 0, 0));
    thigh.updateMatrixWorld(true);
  }
  /* arm straight at a world point (pointing, presenting), blended over the FK pose */
  private aimArm(side: 'L' | 'R', target: THREE.Vector3, w: number) {
    if (w <= 0.001) return; const B = this.rig.bones, arm = B[('arm' + side) as BoneName], fore = B[('fore' + side) as BoneName], T = this.tmp;
    arm.parent!.updateMatrixWorld(true); const sp = arm.getWorldPosition(T.a), dir = T.b.subVectors(target, sp).normalize();
    const pq = arm.parent!.getWorldQuaternion(T.q2), local = dir.applyQuaternion(pq.clone().invert());
    const want = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), local);
    arm.quaternion.slerp(want, w); fore.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, 0)), w);
    if (w > 0.5) setHand(this.rig, side, side === 'R' && this.act === 'point' ? 'point' : 'open');
  }
  private headLook(dt: number) {
    const tgt = this.look || (this.uw > 0.3 ? (this.lookAtFocus() ? this.focus : this.camera) : null); if (!tgt) return;
    const B = this.rig.bones, T = this.tmp; B.neck.parent!.updateMatrixWorld(true);
    const hp = B.head.getWorldPosition(T.a), dir = T.b.subVectors(tgt, hp); const gq = this.group.getWorldQuaternion(T.q).invert(); dir.applyQuaternion(gq);
    const yaw = clamp(Math.atan2(dir.x, dir.z), -1.2, 1.2), pitch = clamp(-Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -0.6, 0.5), w = this.look ? 1 : this.uw;
    const add = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch * 0.5 * w, yaw * 0.45 * w, 0, 'YXZ'));
    B.neck.quaternion.premultiply(add); B.head.quaternion.premultiply(add);
  }
  private lookAtFocus() { const a = this.act; if (!this.focus) return false; if (a === 'type') return !this.speaking || Math.sin(this.t * 0.5) > 0.3; if (a === 'gaze') return !this.speaking || this.actT < 3; if (a === 'point' || a === 'present') return this.actT < 1.6 || (a === 'present' && Math.sin(this.actT * 0.7 - 1.2) > 0.6); if (a === 'toss') return this.tossT > 0.5 && this.tossT < 3.2; return false; }

  /* ---- the upper body for the current act; uw (0..1) fades it in once he has stopped ---- */
  private upper(dt: number, t: number): UpperPose {
    const settled = !this.path.length && this.speed < 0.05 && (this.faceYaw == null || Math.abs(wrap(this.faceYaw - this.yaw)) < 0.35);
    this.uw = damp(this.uw, settled ? 1 : 0, settled ? 2.6 : 9, dt); this.actT += dt;
    const P = zeroPose(), a = this.act, br = Math.sin(t * 1.65), n = (f: number, ph: number) => Math.sin(t * f + ph) * 0.6 + Math.sin(t * f * 2.31 + ph * 1.7) * 0.4;
    this.lvlPrev = this.lvl; this.lvl = damp(this.lvl, this.speaking ? clamp(this.talkLevel, 0, 1) : 0, this.talkLevel > this.lvl ? 22 : 5, dt);
    if (this.lvl - this.lvlPrev > 0.6 * dt * 22 * 0.25 && this.lvl > 0.25) this.beat = 1; this.beat = damp(this.beat, 0, 7, dt);
    const L = this.lvl, talk = this.speaking ? 1 : 0;
    P.chest = [0.012 * br, 0, 0]; P.spine = [0.006 * br, 0, 0]; P.head = [0.02 * n(0.31, 1), 0.08 * n(0.17, 2), 0.02 * n(0.23, 3)];
    P.armL = [0.03, 0, 0.085]; P.armR = [0.03, 0, -0.085]; P.foreL = [-0.14, 0.1, 0]; P.foreR = [-0.14, -0.1, 0];
    if (talk && a !== 'type' && a !== 'cert' && a !== 'gaze') {
      const A = 0.25 + 0.75 * L;
      P.armR = [-0.28 - 0.32 * A * (0.5 + 0.5 * n(1.3, 0.4)), -0.15, -0.16 - 0.1 * A * n(0.9, 1.1)]; P.foreR = [-0.95 - 0.45 * A * (0.5 + 0.5 * n(1.7, 2)) + 0.3 * this.beat, -0.55 * A, 0]; P.hR = A > 0.45 ? 'open' : 'relax';
      P.armL = [-0.12 - 0.22 * A * (0.5 + 0.5 * n(1.1, 2.6)), 0.1, 0.12 + 0.06 * A * n(0.8, 0.3)]; P.foreL = [-0.55 - 0.45 * A * (0.5 + 0.5 * n(1.4, 3.3)) + 0.2 * this.beat, 0.4 * A, 0]; P.hL = A > 0.6 ? 'open' : 'relax';
      P.head = [0.05 * this.beat + 0.03 * n(0.9, 0.2) * L, 0.1 * n(0.27, 2), 0.04 * n(0.41, 1)]; P.chest[1] = 0.05 * n(0.35, 0.7);
    }
    if (a === 'cert') { P.armL = [-0.55, -0.25, -0.1]; P.armR = [-0.55, 0.25, 0.1]; P.foreL = [-1.55, 0.55, 0]; P.foreR = [-1.55, -0.55, 0]; P.hL = P.hR = 'grip'; P.head[0] += 0.04; }
    if (a === 'type') { P.armL = [-0.42, -0.25, 0.16]; P.armR = [-0.42, 0.25, -0.16]; P.foreL = [-1.08, 0.7, 0]; P.foreR = [-1.08, -0.7, 0]; P.hL = P.hR = 'type'; P.handL = [0.12 + 0.05 * Math.max(0, Math.sin(t * 17)), 0, 0]; P.handR = [0.12 + 0.05 * Math.max(0, Math.sin(t * 19 + 1.7)), 0, 0]; P.spine = [0.08, 0, 0]; P.chest = [0.06 + 0.01 * br, 0, 0];
      if (talk) { const k = sm(0.2, 0.6, 0.5 + 0.5 * Math.sin(t * 0.6)); P.armR = lerpJ(P.armR, [-0.3, -0.1, -0.2], k * L); P.foreR = lerpJ(P.foreR, [-1.3, -0.9, 0], k); if (k > 0.5) P.hR = 'open'; P.chest[1] = -0.12; } }
    if (a === 'sit' && !talk) { P.armL = [-0.3, -0.2, 0.12]; P.armR = [-0.3, 0.2, -0.12]; P.foreL = [-1.0, 0.6, 0]; P.foreR = [-1.0, -0.6, 0]; P.hL = P.hR = 'relax'; }
    if (a === 'gaze') { P.armL = [-0.28, -0.1, 0.05]; P.armR = [-0.28, 0.1, -0.05]; P.foreL = [-1.75, 0.3, 0]; P.foreR = [-1.75, -0.3, 0]; P.hL = P.hR = 'grip'; P.chest[0] -= 0.04; }
    if (a === 'present') { P.armR = [0.04, 0, -0.09]; P.foreR = [-0.2, 0, 0]; }
    if (this.propMode === 'laptop' && a !== 'type' && a !== 'sit') { P.armR = [0.1, -0.1, -0.12]; P.foreR = [-1.25, -1.2, 0]; P.hR = 'grip'; }
    if (this.prop && this.propMode === 'cert' && a !== 'cert' && this.uw < 0.9) { P.armR = [-0.3, 0.2, 0]; P.foreR = [-1.2, -0.4, 0]; P.hR = 'grip'; }
    if (this.tossT >= 0) { const tt = this.tossT, k1 = sm(0, 0.4, tt) * (1 - sm(0.75, 0.9, tt)), k2 = sm(0.95, 1.25, tt) * (1 - sm(1.25, 1.6, tt)), k3 = sm(1.25, 1.42, tt) * (1 - sm(2.2, 3.0, tt));
      P.armR = lerpJ(lerpJ(lerpJ(P.armR, [-2.6, -0.2, -0.3], k1), [-0.6, 0, -0.2], k2), [-3.0, 0, -0.32], k3); P.foreR = lerpJ(lerpJ(lerpJ(P.foreR, [-1.9, 0, 0], k1), [-1.6, 0, 0], k2), [-0.15, 0, 0], k3);
      P.armL = lerpJ(lerpJ(P.armL, [-0.4, 0, 0.2], k2), [-2.9, 0, 0.35], k3); P.foreL = lerpJ(P.foreL, [-0.25, 0, 0], k3); P.crouch = 0.06 * k2 - 0.015 * k3; P.hR = k1 > 0.5 || k2 > 0.3 ? 'grip' : k3 > 0.5 ? 'open' : P.hR; P.hL = k3 > 0.5 ? 'open' : P.hL; P.head[0] -= 0.35 * k3; }
    /* weight shift while standing: a slow sway from foot to foot */
    return P;
  }
  private blendPose(a: UpperPose, b: UpperPose, w: number): UpperPose {
    const o = zeroPose(); (['spine', 'chest', 'neck', 'head', 'armL', 'armR', 'foreL', 'foreR', 'handL', 'handR'] as const).forEach((k) => { o[k] = lerpJ(a[k], b[k], w); });
    o.hL = w > 0.5 ? b.hL : a.hL; o.hR = w > 0.5 ? b.hR : a.hR; o.crouch = b.crouch * w; return o;
  }
  /* blink, mouth, tassel and pack follow-through */
  private secondary(dt: number) {
    const P = this.rig.parts; this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = 1; this.blinkT = 2 + Math.random() * 4; } this.blink = Math.max(0, this.blink - dt * 7);
    const bl = Math.sin(Math.min(1, this.blink) * Math.PI); P.lids.forEach((l) => { l.rotation.x = -0.4 + 0.75 * bl; });
    if (P.mouth) P.mouth.scale.y = 0.0006 + (this.speaking ? 0.008 * this.lvl * (0.55 + 0.45 * Math.sin(this.t * 19)) : 0);
    const sp = this.spring, fwdA = this.accel + (this.stepping ? Math.sin(this.phase * Math.PI * 4) * this.speed * 0.8 : 0);
    sp.packV += (-fwdA * 0.02 - sp.pack * 60 - sp.packV * 7) * dt; sp.pack += sp.packV * dt;
    if (P.pack) P.pack.rotation.x = clamp(sp.pack, -0.25, 0.25);
    if (P.tassel) { const h = P.tassel.userData.hang as THREE.Object3D; sp.tvx += (fwdA * 0.25 - sp.tx * 40 - sp.tvx * 3) * dt; sp.tx += sp.tvx * dt; sp.tvz += (this.yawRate * this.speed * 0.2 - sp.tz * 40 - sp.tvz * 3) * dt; sp.tz += sp.tvz * dt; h.rotation.set(clamp(sp.tx, -0.8, 0.8), 0, clamp(sp.tz, -0.8, 0.8)); }
  }
  /* graduation: lift the cap off, a small dip, then throw it up; release velocity comes from the hand */
  private tossUpdate(dt: number) {
    this.tossT += dt; const P = this.rig.parts, hb = this.rig.bones.handR, T = this.tmp;
    hb.updateMatrixWorld(true); const hp = hb.getWorldPosition(T.a); if (this.tossT > dt * 1.5) this.handVel.lerp(T.b.subVectors(hp, this.handPrev).divideScalar(Math.max(dt, 1e-4)), 0.5); this.handPrev.copy(hp);
    if (P.cap && this.tossT > 0.38 && P.cap.parent === this.rig.bones.head) { hb.attach(P.cap); }
    if (P.cap && !this.released && this.tossT > 1.36) {
      this.released = true; const wp = P.cap.getWorldPosition(V()); P.cap.visible = false;
      const vel = this.handVel.clone(); vel.y = Math.max(vel.y, 5.5); vel.y = Math.min(vel.y, 7.5);
      this.onRelease?.({ pos: wp, vel, spin: new THREE.Vector3(4 + Math.random() * 3, 9 + Math.random() * 4, 2) });
    }
    if (this.tossT > 3.4) this.tossT = -1;
  }
  /* a handed-over prop glides from where it was into his grip */
  private xferUpdate(dt: number) {
    const X = this.xfer!; X.t = Math.min(1, X.t + dt / 0.55); const k = X.t * X.t * (3 - 2 * X.t), o = X.o, T = this.tmp;
    o.parent!.updateWorldMatrix(true, false); const target = new THREE.Matrix4().compose(o.position, o.quaternion, o.scale), tw = new THREE.Matrix4().multiplyMatrices(o.parent!.matrixWorld, target);
    const p0 = V(), q0 = Q(), s0 = V(), p1 = V(), q1 = Q(), s1 = V(); X.from.decompose(p0, q0, s0); tw.decompose(p1, q1, s1); p0.lerp(p1, k); q0.slerp(q1, k);
    const local = new THREE.Matrix4().compose(p0, q0, s1).premultiply(T.m.copy(o.parent!.matrixWorld).invert()); o.userData.base = o.userData.base || { p: o.position.clone(), q: o.quaternion.clone() };
    if (X.t >= 1) { o.position.copy(o.userData.base.p); o.quaternion.copy(o.userData.base.q); o.matrixAutoUpdate = true; this.xfer = null; delete o.userData.base; return; }
    o.matrixAutoUpdate = false; o.matrix.copy(local); o.matrixWorldNeedsUpdate = true;
  }
  resetCap() { const P = this.rig.parts; if (P.cap) { this.rig.bones.head.add(P.cap); const H = P.cap.userData.home as THREE.Vector3 | undefined, R = P.cap.userData.homeRot as THREE.Euler | undefined; if (H) P.cap.position.copy(H); if (R) P.cap.rotation.copy(R); P.cap.visible = true; } }
}
