import type { CustomLayerInterface, CustomRenderMethodInput, Map as MLMap } from "maplibre-gl";
import type * as T from "three";

type Three = typeof import("three");
type LL = [number, number];
type V2 = [number, number];

const R_EARTH = 6378137;
const RAD = Math.PI / 180;
/** Figure units are metres of a 1.75 m hiker; the whole figure is scaled up by `S` so it reads at map scale. */
const HEIGHT = 1.75;
const THIGH = 0.45;
const SHIN = 0.45;
const ANKLE = 0.085;
const HIP_H = 0.93;
const STRIDE = 1.44;
const STANCE = 0.62;
const UPPER_ARM = 0.29;
const FOREARM = 0.27;
const WALK = 1.25;

export interface Light {
  /** Sun azimuth (deg, clockwise from north) and altitude (deg). */
  az: number;
  alt: number;
  sun: string;
  sunI: number;
  sky: string;
  ground: string;
  hemiI: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Arc-length parametrised polyline in figure units (x east, z south). */
class Path {
  private pts: V2[];
  private cum: number[];
  readonly length: number;
  constructor(pts: V2[], readonly closed: boolean) {
    this.pts = closed ? [...pts, pts[0]] : pts;
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) {
      const [ax, az] = this.pts[i - 1], [bx, bz] = this.pts[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(bx - ax, bz - az));
    }
    this.length = this.cum[this.cum.length - 1];
  }
  at(d: number): V2 {
    const L = this.length;
    if (this.closed) d = ((d % L) + L) % L;
    else if (d <= 0 || d >= L) {
      const [a, b] = d <= 0 ? [this.pts[0], this.pts[1]] : [this.pts[this.pts.length - 2], this.pts[this.pts.length - 1]];
      const k = d <= 0 ? d : d - L, n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, o = d <= 0 ? a : b;
      return [o[0] + ((b[0] - a[0]) / n) * k, o[1] + ((b[1] - a[1]) / n) * k];
    }
    let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.cum[m] <= d) lo = m;
      else hi = m;
    }
    const seg = this.cum[hi] - this.cum[lo] || 1, t = (d - this.cum[lo]) / seg;
    const a = this.pts[lo], b = this.pts[hi];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  /** Compass heading (radians, clockwise from north) of the path at d, smoothed over a short window. */
  heading(d: number): number {
    const a = this.at(d - 0.35), b = this.at(d + 0.35);
    return Math.atan2(b[0] - a[0], -(b[1] - a[1]));
  }
}

/** A gently wobbling loop around the anchor, so the hiker circles the place rather than an exact ellipse. */
function loopPath(rx: number, rz: number, seed: number, face?: number): Path {
  const pts: V2[] = [];
  for (let i = 0; i < 160; i++) {
    const t = (i / 160) * Math.PI * 2;
    const w = 1 + 0.09 * Math.sin(3 * t + seed) + 0.05 * Math.sin(5 * t + seed * 2.3);
    pts.push([Math.sin(t) * rx * w, -Math.cos(t) * rz * w]);
  }
  const p = new Path(pts, true);
  if (face == null) return p;
  /* turn the loop so that a quarter of the way round the hiker faces `face`, and slide it toward the camera so he
     walks the near slope of the place instead of disappearing behind its ridge */
  const h = p.heading(p.length * 0.25);
  const d = Math.atan2(Math.sin(face * RAD - h), Math.cos(face * RAD - h));
  const c = Math.cos(d), s = Math.sin(d);
  const ox = -Math.sin(face * RAD) * rz * 0.9, oz = Math.cos(face * RAD) * rz * 0.9;
  return new Path(pts.map(([x, z]) => [x * c - z * s + ox, x * s + z * c + oz] as V2), true);
}

interface Rig {
  root: T.Group;
  body: T.Group;
  spine: T.Group;
  head: T.Group;
  thigh: T.Mesh[];
  shin: T.Mesh[];
  boot: T.Group[];
  upper: T.Mesh[];
  fore: T.Mesh[];
  hand: T.Mesh[];
  pole: T.Mesh[];
  shadow: T.Mesh;
  mats: T.MeshStandardMaterial[];
  shadowMat: T.MeshBasicMaterial;
}

function buildRig(THREE: Three, RoundedBox: typeof import("three/examples/jsm/geometries/RoundedBoxGeometry.js").RoundedBoxGeometry): Rig {
  const mats: T.MeshStandardMaterial[] = [];
  const mat = (c: string, rough = 0.78, metal = 0) => {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, transparent: true });
    mats.push(m);
    return m;
  };
  const jacket = mat("#b9452f", 0.66), jacketDark = mat("#8f3322", 0.7), trousers = mat("#2c3440", 0.85), skin = mat("#a8724c", 0.6);
  const boots = mat("#4a3324", 0.9), sole = mat("#1d1a18", 0.95), pack = mat("#34503d", 0.8), packDark = mat("#26392c", 0.85);
  const mat_ = mat("#d98a2a", 0.7), hairMat = mat("#1d1612", 0.9), hat = mat("#e9b04f", 0.75), hatBand = mat("#c58a2c", 0.8), poleMat = mat("#a7b0ba", 0.35, 0.6), grip = mat("#1f2328", 0.9);
  const mesh = (g: T.BufferGeometry, m: T.Material) => {
    const o = new THREE.Mesh(g, m);
    o.frustumCulled = false;
    return o;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const pelvis = mesh(new THREE.SphereGeometry(0.135, 20, 14), trousers);
  pelvis.scale.set(1.18, 0.75, 0.86);
  body.add(pelvis);
  const spine = new THREE.Group();
  spine.position.y = 0.04;
  body.add(spine);
  const torso = mesh(new THREE.CapsuleGeometry(0.15, 0.26, 8, 18), jacket);
  torso.position.y = 0.27;
  torso.scale.set(1.17, 1, 0.76);
  spine.add(torso);
  const hem = mesh(new THREE.CylinderGeometry(0.168, 0.162, 0.05, 20), jacketDark);
  hem.position.y = 0.07;
  hem.scale.set(1.04, 1, 0.8);
  spine.add(hem);
  const collar = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.06, 16), jacketDark);
  collar.position.y = 0.485;
  spine.add(collar);
  const head = new THREE.Group();
  head.position.y = 0.6;
  spine.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.1, 20, 16), skin);
  skull.scale.set(0.92, 1.1, 1);
  head.add(skull);
  const nose = mesh(new THREE.SphereGeometry(0.022, 8, 6), skin);
  nose.position.set(0, -0.005, 0.096);
  head.add(nose);
  const hair = mesh(new THREE.SphereGeometry(0.103, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hair.rotation.x = -0.38;
  hair.position.set(0, 0.008, -0.008);
  hair.scale.set(0.95, 1.08, 1.02);
  head.add(hair);
  const beanie = mesh(new THREE.SphereGeometry(0.105, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), hat);
  beanie.position.y = 0.03;
  beanie.rotation.x = -0.12;
  beanie.scale.set(0.97, 1.08, 1.03);
  head.add(beanie);
  const band = mesh(new THREE.TorusGeometry(0.094, 0.016, 8, 22), hatBand);
  band.rotation.x = Math.PI / 2 - 0.12;
  band.position.y = 0.058;
  band.scale.set(0.99, 1.05, 1);
  head.add(band);
  const pom = mesh(new THREE.SphereGeometry(0.028, 10, 8), hatBand);
  pom.position.set(0, 0.142, -0.012);
  head.add(pom);
  const neck = mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.1, 12), skin);
  neck.position.y = 0.52;
  spine.add(neck);
  const bag = new THREE.Group();
  bag.position.set(0, 0.29, -0.2);
  spine.add(bag);
  const sack = mesh(new RoundedBox(0.33, 0.46, 0.2, 3, 0.06), pack);
  bag.add(sack);
  const lid = mesh(new RoundedBox(0.31, 0.08, 0.22, 2, 0.035), packDark);
  lid.position.set(0, 0.24, 0.005);
  bag.add(lid);
  const pocket = mesh(new RoundedBox(0.22, 0.17, 0.06, 2, 0.025), packDark);
  pocket.position.set(0, -0.08, -0.115);
  bag.add(pocket);
  const roll = mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.38, 16), mat_);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, -0.27, 0.01);
  bag.add(roll);
  [-1, 1].forEach((s) => {
    const strap = mesh(new THREE.BoxGeometry(0.045, 0.34, 0.03), packDark);
    strap.position.set(s * 0.095, 0.29, 0.115);
    strap.rotation.x = -0.12;
    spine.add(strap);
  });
  const limb = (r: number, len: number, m: T.Material) => mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 1.2), 6, 14), m);
  const thigh = [limb(0.077, THIGH, trousers), limb(0.077, THIGH, trousers)];
  const shin = [limb(0.059, SHIN, trousers), limb(0.059, SHIN, trousers)];
  const upper = [limb(0.05, UPPER_ARM, jacket), limb(0.05, UPPER_ARM, jacket)];
  const fore = [limb(0.043, FOREARM, jacket), limb(0.043, FOREARM, jacket)];
  const hand = [mesh(new THREE.SphereGeometry(0.042, 12, 10), skin), mesh(new THREE.SphereGeometry(0.042, 12, 10), skin)];
  const boot = [0, 1].map(() => {
    const g = new THREE.Group();
    const upperB = mesh(new RoundedBox(0.11, 0.1, 0.25, 2, 0.04), boots);
    upperB.position.set(0, -0.035, 0.045);
    const s = mesh(new RoundedBox(0.115, 0.03, 0.27, 2, 0.012), sole);
    s.position.set(0, -0.078, 0.05);
    g.add(upperB, s);
    return g;
  });
  const pole = [0, 1].map(() => {
    const p = mesh(new THREE.CylinderGeometry(0.009, 0.007, 1, 6), poleMat);
    const h = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 8), grip);
    h.position.y = 0.43;
    p.add(h);
    return p;
  });
  root.add(...thigh, ...shin, ...upper, ...fore, ...hand, ...boot, ...pole);
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(0,0,0,0.85)");
  grd.addColorStop(0.55, "rgba(0,0,0,0.38)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.45 });
  const shadow = mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.renderOrder = -1;
  root.add(shadow);
  return { root, body, spine, head, thigh, shin, boot, upper, fore, hand, pole, shadow, mats, shadowMat };
}

export interface TrekOptions {
  /** Target on-screen height in CSS px at the reference zoom. */
  px: number;
  /** Reduced motion: hold a still pose and draw only when the map redraws. */
  still?: boolean;
}

/**
 * Procedural hiker standing on the MapLibre terrain, drawn by three.js inside a custom layer that shares the map's GL
 * context and depth buffer. Feet are planted by a distance-driven gait (no foot sliding at any speed), the legs and arms
 * are solved with two-bone IK onto sampled terrain, and the trekking poles plant with the opposite foot.
 */
export class Trekker implements CustomLayerInterface {
  readonly id = "trekker";
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;
  private renderer?: T.WebGLRenderer;
  private scene: T.Scene;
  private camera: T.Camera;
  private rig?: Rig;
  private hemi: T.HemisphereLight;
  private sun: T.DirectionalLight;
  private rim: T.DirectionalLight;
  private anchor: LL = [0, 0];
  private alt0 = 0;
  private S = 1;
  private zRef = 12;
  private path: Path = loopPath(2.4, 1.6, 0);
  private d = 0;
  private v = 0;
  private walking = false;
  private stopAt: number | null = null;
  private faceBearing: number | null = null;
  private faceNow = 0;
  private schedule = true;
  private nextSwitch = 0;
  private t = 0;
  private last = 0;
  private shown = 0;
  private want = 0;
  private sunDir: [number, number, number] = [0.4, 0.8, 0.4];
  private shadowLen = 1;
  private v3: T.Vector3;
  private m4a: T.Matrix4;
  private m4b: T.Matrix4;
  private up: T.Vector3;
  private seed = 1;
  private paused = false;

  constructor(
    private THREE: Three,
    RoundedBox: typeof import("three/examples/jsm/geometries/RoundedBoxGeometry.js").RoundedBoxGeometry,
    private map: MLMap,
    private ml: typeof import("maplibre-gl"),
    private opts: TrekOptions,
  ) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.rig = buildRig(THREE, RoundedBox);
    this.scene.add(this.rig.root);
    this.hemi = new THREE.HemisphereLight("#cfe0ff", "#6b5a40", 0.75);
    this.sun = new THREE.DirectionalLight("#fff2dc", 2.3);
    this.rim = new THREE.DirectionalLight("#9fc4ff", 0.55);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.rim, this.rim.target);
    this.v3 = new THREE.Vector3();
    this.m4a = new THREE.Matrix4();
    this.m4b = new THREE.Matrix4();
    this.up = new THREE.Vector3(0, 1, 0);
  }

  onAdd(map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    const r = new this.THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl as WebGL2RenderingContext, antialias: false });
    r.autoClear = false;
    this.renderer = r;
    this.resize();
    void r.compileAsync(this.scene, this.camera).catch(() => undefined);
  }

  onRemove() {
    this.rig?.mats.forEach((m) => m.dispose());
    this.renderer?.dispose();
    this.renderer = undefined;
  }

  resize() {
    const c = this.map.getCanvas();
    this.renderer?.setSize(c.width, c.height, false);
  }

  /** Place the hiker at a location; `walk` starts the stroll-and-pause loop around it, otherwise he stands facing `face`. */
  setPlace(ll: LL, zRef: number, opts: { walk?: boolean; face?: number; line?: number } = {}) {
    this.anchor = ll;
    this.zRef = zRef;
    this.seed = (Math.abs(ll[0] * 7.13 + ll[1] * 3.71) % 6.28) + 0.5;
    if (opts.line != null) {
      const h = opts.line * RAD;
      this.path = new Path([[0, 0], [Math.sin(h) * 600, -Math.cos(h) * 600]], false);
      this.d = 0;
    } else {
      this.path = loopPath(1.7, 1.15, this.seed, opts.face);
      this.d = this.path.length * 0.25;
    }
    this.faceBearing = opts.face ?? null;
    this.schedule = opts.line == null && !!opts.walk;
    this.walking = !!opts.walk;
    this.v = this.walking ? WALK : 0;
    this.stopAt = null;
    this.nextSwitch = this.t + 7 + (this.seed % 3);
    if (!this.walking) this.d = this.snapStance(this.d);
    this.map.triggerRepaint();
  }

  get location(): LL {
    return this.anchor;
  }

  show(on: boolean, instant = false) {
    this.want = on ? 1 : 0;
    if (instant || this.opts.still) this.shown = this.want;
    this.map.triggerRepaint();
  }

  pause(on: boolean) {
    this.paused = on;
    if (!on) {
      this.last = 0;
      this.map.triggerRepaint();
    }
  }

  get visible() {
    return this.shown > 0.001 || this.want > 0;
  }

  /** Start (on a loop: the stroll-and-pause routine) or stop walking at the next double-support moment. */
  walk(on: boolean) {
    this.schedule = on && this.path.closed;
    if (on) {
      this.nextSwitch = this.t + 9;
      this.walking = true;
      this.stopAt = null;
    } else if (this.walking) this.stopAt = this.nextStance(this.d);
    this.map.triggerRepaint();
  }

  setLight(l: Light) {
    const az = l.az * RAD, alt = Math.max(4, l.alt) * RAD;
    this.sunDir = [Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)];
    this.sun.color.set(l.sun);
    this.sun.intensity = l.sunI;
    this.hemi.color.set(l.sky);
    this.hemi.groundColor.set(l.ground);
    this.hemi.intensity = l.hemiI;
    this.shadowLen = clamp(1 / Math.tan(alt), 0.4, 3.2);
    this.map.triggerRepaint();
  }

  private nextStance(d: number) {
    const f = (((d / STRIDE) % 1) + 1) % 1;
    const targets = [0.06, 0.56, 1.06];
    const tf = targets.find((x) => x > f + 0.02) ?? 1.06;
    return d + (tf - f) * STRIDE;
  }

  private snapStance(d: number) {
    const f = (((d / STRIDE) % 1) + 1) % 1;
    return d - f * STRIDE + (f < 0.5 ? 0.06 : 0.56) * STRIDE;
  }

  private elev(x: number, z: number): number {
    const terrain = (this.map as unknown as { terrain?: { getElevationForLngLatZoom: (ll: unknown, z: number) => number } }).terrain;
    if (!terrain) return 0;
    const lat0 = this.anchor[1] * RAD;
    const lng = this.anchor[0] + ((x * this.S) / (R_EARTH * Math.cos(lat0))) / RAD;
    const lat = this.anchor[1] - (z * this.S) / R_EARTH / RAD;
    try {
      return terrain.getElevationForLngLatZoom(new this.ml.LngLat(lng, lat), 13);
    } catch {
      return 0;
    }
  }

  private ground(x: number, z: number) {
    return (this.elev(x, z) - this.alt0) / this.S;
  }

  private tick(now: number) {
    const dt = this.last && !this.opts.still ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    this.t += dt;
    this.shown += (this.want - this.shown) * (1 - Math.exp(-dt / 0.22));
    if (Math.abs(this.want - this.shown) < 0.002) this.shown = this.want;
    if (this.schedule && this.t > this.nextSwitch) {
      if (this.walking && this.stopAt == null) this.stopAt = this.nextStance(this.d);
      else if (!this.walking) {
        this.walking = true;
        this.nextSwitch = this.t + 8 + ((this.t * 1.7) % 5);
      }
    }
    if (this.walking) {
      if (this.stopAt != null) {
        const left = this.stopAt - this.d;
        this.v = Math.min(this.v, Math.sqrt(Math.max(0, 2 * 1.6 * left)));
        if (left <= 0.002 || this.v < 0.01) {
          this.d = this.stopAt;
          this.v = 0;
          this.walking = false;
          this.stopAt = null;
          if (this.schedule) this.nextSwitch = this.t + 3.6 + ((this.t * 2.3) % 2.5);
        }
      } else this.v = Math.min(WALK, this.v + 1.4 * dt);
      this.d += this.v * dt;
    }
  }

  /** Two-bone IK: places a pair of capsule segments from `a` toward `target`, bending toward `pole`. Returns the end point. */
  private ik(segA: T.Mesh, segB: T.Mesh, a: T.Vector3, target: T.Vector3, l1: number, l2: number, pole: T.Vector3, out: T.Vector3) {
    const THREE = this.THREE;
    const dir = new THREE.Vector3().subVectors(target, a);
    const dist = clamp(dir.length(), 0.05, (l1 + l2) * 0.999);
    dir.normalize();
    const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    const bend = pole.clone().addScaledVector(dir, -pole.dot(dir));
    if (bend.lengthSq() < 1e-6) bend.set(0, 0, 1);
    bend.normalize();
    const joint = a.clone().addScaledVector(dir, along).addScaledVector(bend, h);
    out.copy(a).addScaledVector(dir, dist);
    this.segment(segA, a, joint);
    this.segment(segB, joint, out);
  }

  private segment(m: T.Mesh, a: T.Vector3, b: T.Vector3) {
    m.position.addVectors(a, b).multiplyScalar(0.5);
    this.v3.subVectors(b, a).normalize();
    m.quaternion.setFromUnitVectors(this.up, this.v3);
  }

  private pose() {
    const THREE = this.THREE, rig = this.rig!, path = this.path, d = this.d;
    const phase = (((d / STRIDE) % 1) + 1) % 1;
    const moving = this.walking ? clamp(this.v / WALK, 0, 1) : 0;
    const [bx, bz] = path.at(d);
    const travel = path.heading(d);
    const camB = this.map.getBearing() * RAD;
    let heading = travel;
    if (!this.walking) {
      const target = this.faceBearing != null ? this.faceBearing * RAD : camB;
      let dh = ((target - this.faceNow + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      if (!isFinite(dh)) dh = 0;
      this.faceNow += dh * 0.035;
      heading = travel + clamp(((this.faceNow - travel + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -0.5, 0.5) * 0.6;
    } else this.faceNow = travel;
    const F = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
    const Rt = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
    const feet: T.Vector3[] = [];
    const footPitch: number[] = [];
    const footYaw: number[] = [];
    const plant = (dd: number, side: number) => {
      const [px, pz] = path.at(dd);
      const h = path.heading(dd);
      const x = px + Math.cos(h) * side * 0.095, z = pz + Math.sin(h) * side * 0.095;
      return { x, z, y: this.ground(x, z), h };
    };
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const f = (phase + (i === 0 ? 0 : 0.5)) % 1;
      const dLand = d - f * STRIDE;
      if (f < STANCE) {
        const p = plant(dLand + 0.3 * STRIDE, side);
        feet.push(new THREE.Vector3(p.x, p.y + ANKLE, p.z));
        footPitch.push(f < 0.1 ? (0.1 - f) * 1.2 : f > STANCE - 0.12 ? -(f - (STANCE - 0.12)) * 2.4 : 0);
        footYaw.push(p.h);
      } else {
        const w = smooth((f - STANCE) / (1 - STANCE));
        const a = plant(dLand + 0.3 * STRIDE, side), b = plant(dLand + 1.3 * STRIDE, side);
        const lift = Math.sin(Math.PI * w) * 0.12;
        feet.push(new THREE.Vector3(a.x + (b.x - a.x) * w, a.y + (b.y - a.y) * w + ANKLE + lift, a.z + (b.z - a.z) * w));
        footPitch.push(-0.35 * (1 - w) * Math.sin(Math.PI * w) + 0.25 * w * w);
        footYaw.push(a.h + (((b.h - a.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * w);
      }
    }
    const gy = Math.min(feet[0].y, feet[1].y) - ANKLE;
    const gBody = this.ground(bx, bz);
    const bob = moving * -0.028 * Math.cos(4 * Math.PI * phase);
    const sway = moving * 0.022 * Math.sin(2 * Math.PI * phase);
    const breath = Math.sin(this.t * 1.6) * 0.004;
    const hipY = Math.min(gy, gBody) * 0.5 + Math.max(gy, gBody) * 0.5 - 0.035 * moving + HIP_H + bob + breath;
    const body = rig.body;
    body.position.set(bx + Rt.x * sway, hipY, bz + Rt.z * sway);
    const yaw = Math.PI - heading;
    body.rotation.set(0, yaw + moving * 0.07 * Math.sin(2 * Math.PI * phase), moving * 0.035 * Math.sin(2 * Math.PI * phase), "YXZ");
    const slope = clamp((this.ground(bx + F.x * 0.5, bz + F.z * 0.5) - this.ground(bx - F.x * 0.5, bz - F.z * 0.5)) * 0.9, -0.5, 0.5);
    rig.spine.rotation.set(0.06 + moving * 0.06 + Math.max(0, slope) * 0.35, -moving * 0.12 * Math.sin(2 * Math.PI * phase), 0, "YXZ");
    rig.spine.scale.y = 1 + breath * 2;
    const look = this.walking ? 0 : Math.sin(this.t * 0.37 + this.seed) * 0.45 + Math.sin(this.t * 0.13) * 0.2;
    rig.head.rotation.set(-0.08 + (this.walking ? 0.1 : 0), look, 0, "YXZ");
    body.updateMatrix();
    rig.spine.updateMatrix();
    const spineM = this.m4b.multiplyMatrices(body.matrix, rig.spine.matrix);
    const hip = new THREE.Vector3(), knee = new THREE.Vector3(), endP = new THREE.Vector3();
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      hip.set(-side * 0.095, -0.03, 0).applyMatrix4(body.matrix);
      knee.copy(F).addScaledVector(Rt, side * 0.08);
      this.ik(rig.thigh[i], rig.shin[i], hip, feet[i], THIGH, SHIN, knee, endP);
      const b = rig.boot[i];
      b.position.copy(endP);
      b.rotation.set(-footPitch[i], Math.PI - footYaw[i], 0, "YXZ");
    }
    const shoulder = new THREE.Vector3(), handT = new THREE.Vector3(), elbow = new THREE.Vector3(), tip = new THREE.Vector3();
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      shoulder.set(-side * 0.205, 0.43, 0).applyMatrix4(spineM);
      const opp = feet[1 - i];
      tip.set(opp.x + F.x * 0.16 + Rt.x * side * 0.2, 0, opp.z + F.z * 0.16 + Rt.z * side * 0.2);
      tip.y = this.ground(tip.x, tip.z) + Math.max(0, opp.y - ANKLE - this.ground(opp.x, opp.z)) * 0.7;
      const swing = moving * 0.17 * Math.sin(2 * Math.PI * (phase + (i === 0 ? 0.5 : 0)));
      handT.copy(shoulder).addScaledVector(F, 0.2 + swing).addScaledVector(Rt, side * 0.06);
      handT.y = shoulder.y - 0.37 + Math.max(0, swing) * 0.25;
      elbow.copy(F).multiplyScalar(-0.75).addScaledVector(Rt, side * 0.45).add(new THREE.Vector3(0, -0.5, 0));
      this.ik(rig.upper[i], rig.fore[i], shoulder, handT, UPPER_ARM, FOREARM, elbow, endP);
      rig.hand[i].position.copy(endP);
      const p = rig.pole[i];
      const len = endP.distanceTo(tip) + 0.06;
      this.segment(p, endP.clone().addScaledVector(this.v3.subVectors(endP, tip).normalize(), 0.06), tip);
      p.scale.set(1, len, 1);
      const grip = p.children[0] as T.Mesh;
      grip.position.y = 0.5 - 0.1 / len;
      grip.scale.set(1, 1 / len, 1);
    }
    const sl = Math.hypot(this.sunDir[0], this.sunDir[2]) || 1;
    const sx = -this.sunDir[0] / sl, sz = -this.sunDir[2] / sl;
    const L = this.shadowLen * 0.8;
    const sh = rig.shadow;
    sh.position.set(bx + sx * L * 0.42, gBody + 0.015, bz + sz * L * 0.42);
    sh.rotation.set(-Math.PI / 2, Math.atan2(-sx, -sz), 0, "YXZ");
    sh.scale.set(0.6, 0.55 + L, 1);
  }

  /** MapLibre custom-layer draw: advance the gait, pose the rig on the terrain and render into the shared context. */
  render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput) {
    const r = this.renderer, rig = this.rig;
    if (!r || !rig || this.paused) return;
    const now = performance.now();
    this.tick(now);
    const map = this.map;
    const z = map.getZoom();
    if (this.shown <= 0.001 || z < 8.4 || !map.getTerrain()) {
      if (this.want !== this.shown) map.triggerRepaint();
      return;
    }
    const c = map.getCanvas(), pt = map.project(this.anchor), k = window.devicePixelRatio || 1;
    if (pt.x < -300 || pt.y < -300 || pt.x > c.width / k + 300 || pt.y > c.height / k + 300) return;
    const lat = this.anchor[1] * RAD;
    const mpp = (40075016.686 * Math.cos(lat)) / (512 * 2 ** z);
    const px = this.opts.px * 2 ** ((z - this.zRef) * 0.42) * clamp((z - 8.4) / 1.6, 0, 1);
    this.S = Math.max(1, (px * mpp) / HEIGHT);
    this.alt0 = this.elev(0, 0);
    this.pose();
    const a = this.shown;
    rig.mats.forEach((m) => (m.opacity = a));
    rig.shadowMat.opacity = 0.42 * a;
    rig.root.scale.setScalar(this.S * (0.9 + 0.1 * a));
    rig.root.updateMatrixWorld(true);
    this.sun.position.set(this.sunDir[0] * 10, this.sunDir[1] * 10, this.sunDir[2] * 10);
    this.rim.position.set(-this.sunDir[0] * 10, 4, -this.sunDir[2] * 10);
    const tr = map.transform as unknown as { getMatrixForModel: (ll: LL, alt: number) => ArrayLike<number> };
    this.m4a.fromArray(args.defaultProjectionData.mainMatrix as unknown as number[]);
    this.m4b.fromArray(tr.getMatrixForModel(this.anchor, this.alt0) as number[]);
    this.camera.projectionMatrix.multiplyMatrices(this.m4a, this.m4b);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    r.resetState();
    r.render(this.scene, this.camera);
    if (!this.opts.still) map.triggerRepaint();
  }
}

export async function createTrekker(map: MLMap, ml: typeof import("maplibre-gl"), opts: TrekOptions): Promise<Trekker> {
  const [THREE, { RoundedBoxGeometry }] = await Promise.all([import("three"), import("three/examples/jsm/geometries/RoundedBoxGeometry.js")]);
  return new Trekker(THREE, RoundedBoxGeometry, map, ml, opts);
}
