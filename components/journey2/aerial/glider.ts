import type * as T from "three";
import type { Character } from "../contracts";

type Three = typeof import("three");

const SPAN = 10.4;
const CHORD = 2.7;
const LINE_H = 6.9;
const ARC = 58 * (Math.PI / 180);

/**
 * Placeholder paraglider in metres: canopy, lines and a pod-harness pilot whose hips sit at the origin, nose toward -z.
 * A rigged character from the CharacterFactory replaces the stand-in pilot through `setPilot`.
 */
export class Glider {
  readonly root: T.Group;
  private wing: T.Group;
  private harness: T.Group;
  private stand: T.Group;
  private body: T.Group;
  private mats: T.Material[] = [];
  private geos: T.BufferGeometry[] = [];
  private pilot: Character | null = null;
  private pilotMats: Array<T.Material & { opacity: number }> = [];
  private pilotA = 1;
  private lines: T.LineSegments;
  private beacons: T.Mesh[] = [];
  private t = 0;

  constructor(private THREE: Three) {
    this.root = new THREE.Group();
    this.wing = new THREE.Group();
    this.harness = new THREE.Group();
    this.stand = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.wing, this.harness);
    this.harness.add(this.stand);
    this.stand.add(this.body);
    this.buildWing();
    this.lines = this.buildLines();
    this.root.add(this.lines);
    this.buildPilot();
    this.root.traverse((o) => (o.frustumCulled = false));
  }

  private mat<M extends T.Material>(m: M): M {
    this.mats.push(m);
    return m;
  }

  private geo<G extends T.BufferGeometry>(g: G): G {
    this.geos.push(g);
    return g;
  }

  /** Point on the canopy: s in [-1, 1] across the span, c in [0, 1] from leading to trailing edge, side +1 top / -1 bottom. */
  private surf(s: number, c: number, side: number, out: number[]) {
    const ch = CHORD * Math.sqrt(Math.max(0.04, 1 - 0.8 * s * s));
    const th = s * ARC;
    const R = SPAN / 2 / ARC;
    const zle = -ch * 0.32 + 0.35 * s * s;
    const thick = ch * 0.15 * (side > 0 ? 1 : 0.28) * (2.6 * Math.sqrt(Math.max(c, 0)) * (1 - c));
    const camber = ch * 0.05 * Math.sin(Math.PI * c);
    const rr = R + (side > 0 ? thick : -thick) + camber;
    out.push(Math.sin(th) * rr, LINE_H - R + Math.cos(th) * rr - 0.25 * c, zle + c * ch);
  }

  private buildWing() {
    const THREE = this.THREE;
    const NS = 64, NC = 14;
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    const cTop = new THREE.Color(), tmp: number[] = [];
    const scheme = (s: number, cell: number, top: boolean) => {
      const a = Math.abs(s);
      const base = a < 0.12 ? "#f2c531" : a < 0.62 ? "#e8501c" : a < 0.8 ? "#e6e9ef" : "#1d3a78";
      cTop.set(base);
      const rib = Math.abs(((cell % 1) + 1) % 1 - 0.5) > 0.44 ? 0.78 : 1;
      cTop.multiplyScalar(rib * (top ? 1 : 0.55));
      return cTop;
    };
    for (const side of [1, -1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= NS; i++) {
        const s = (i / NS) * 2 - 1;
        for (let j = 0; j <= NC; j++) {
          const c = (j / NC) ** 1.6;
          tmp.length = 0;
          this.surf(s, c, side, tmp);
          pos.push(...tmp);
          const k = scheme(s, ((s + 1) / 2) * 38, side > 0);
          const le = j === 0 ? 1.12 : 1;
          col.push(k.r * le, k.g * le, k.b * le);
        }
      }
      for (let i = 0; i < NS; i++)
        for (let j = 0; j < NC; j++) {
          const a = base + i * (NC + 1) + j, b = a + NC + 1;
          if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
          else idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
    }
    const g = this.geo(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = this.mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide, emissive: new THREE.Color("#0c0603"), transparent: true }));
    this.wing.add(new THREE.Mesh(g, m));
    const tip = this.geo(new THREE.SphereGeometry(0.09, 8, 6));
    for (const [s, c] of [[-1, "#ff3b30"], [1, "#3dff86"]] as const) {
      const p: number[] = [];
      this.surf(s * 0.99, 0.5, -1, p);
      const b = new THREE.Mesh(tip, this.mat(new THREE.MeshBasicMaterial({ color: c, transparent: true })));
      b.position.set(p[0], p[1], p[2]);
      this.wing.add(b);
      this.beacons.push(b);
    }
  }

  private buildLines(): T.LineSegments {
    const THREE = this.THREE;
    const pts: number[] = [];
    const p: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const s = (i / 12) * 2 - 1;
      const riser = [Math.sign(s || 1) * 0.24, 1.15, -0.05];
      for (const c of [0.12, 0.42, 0.75]) {
        p.length = 0;
        this.surf(s, c, -1, p);
        const mid = [p[0] * 0.55 + riser[0] * 0.45, p[1] * 0.45 + riser[1] * 0.55 + 0.9, p[2] * 0.5 + riser[2] * 0.5];
        pts.push(p[0], p[1], p[2], mid[0], mid[1], mid[2], mid[0], mid[1], mid[2], riser[0], riser[1], riser[2]);
      }
      if (Math.abs(s) > 0.5) {
        p.length = 0;
        this.surf(s, 1, -1, p);
        pts.push(p[0], p[1], p[2], Math.sign(s) * 0.34, 1.55, 0.05);
      }
    }
    const g = this.geo(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, this.mat(new THREE.LineBasicMaterial({ color: "#2a2e3c", transparent: true, opacity: 0.75 })));
  }

  private buildPilot() {
    const THREE = this.THREE;
    const m = (c: string, r = 0.75) => this.mat(new THREE.MeshStandardMaterial({ color: c, roughness: r, transparent: true }));
    const jacket = m("#b9452f", 0.62), pod = m("#262b36", 0.5), skin = m("#a8724c", 0.6), helmet = m("#eef2f7", 0.35), visor = m("#141820", 0.2), pack = m("#3a4150", 0.7);
    let into: T.Group = this.stand;
    const add = (g: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      const o = new THREE.Mesh(this.geo(g), mat);
      o.position.set(x, y, z);
      o.rotation.set(rx, ry, rz);
      into.add(o);
      return o;
    };
    add(new THREE.CapsuleGeometry(0.21, 1.05, 6, 14), pod, 0, -0.02, -0.5, Math.PI / 2 - 0.18);
    add(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), pack, 0, 0.3, 0.32, -0.3);
    into = this.body;
    add(new THREE.CapsuleGeometry(0.19, 0.42, 6, 14), jacket, 0, 0.42, 0.08, -0.32);
    add(new THREE.SphereGeometry(0.105, 16, 12), skin, 0, 0.86, -0.05);
    const hel = add(new THREE.SphereGeometry(0.128, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), helmet, 0, 0.88, -0.03, -0.3);
    hel.scale.set(1, 1.05, 1.12);
    add(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.2), visor, 0, 0.86, -0.06, -0.25);
    for (const s of [-1, 1]) {
      add(new THREE.CapsuleGeometry(0.055, 0.32, 4, 8), jacket, s * 0.27, 0.78, -0.02, 0.15, 0, s * 0.35);
      add(new THREE.CapsuleGeometry(0.048, 0.3, 4, 8), jacket, s * 0.33, 1.15, 0.0, 0.0, 0, -s * 0.1);
      add(new THREE.SphereGeometry(0.05, 8, 6), skin, s * 0.34, 1.36, 0.02);
    }
    const led = add(new THREE.SphereGeometry(0.025, 6, 4), this.mat(new THREE.MeshBasicMaterial({ color: "#ff4d3a", transparent: true })), 0, 1.0, 0.1);
    this.beacons.push(led);
  }

  /** Swap the stand-in pilot for a rigged character (seated "paraglide" pose), scaled to sit in the harness. */
  setPilot(c: Character) {
    this.pilot?.dispose();
    if (this.pilot) this.harness.remove(this.pilot.root);
    this.pilot = c;
    this.stand.visible = false;
    c.setOutfit("paraglider");
    c.play("paraglide", 0);
    c.root.rotation.set(-0.3, Math.PI, 0);
    c.root.position.set(0, -0.48, 0.12);
    this.pilotMats = [];
    c.root.traverse((o) => {
      o.frustumCulled = false;
      const m = (o as T.Mesh).material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((x) => this.pilotMats.push(x as T.Material & { opacity: number }));
    });
    this.pilotA = 1;
    this.harness.add(c.root);
  }

  /**
   * Pose for this frame. `bank` (deg, + = right wing down) swings the pilot outward under the wing like a pendulum;
   * `inflate` 0..1 raises the canopy from behind for a launch; `alpha` fades everything.
   */
  update(dt: number, bank: number, pitch: number, inflate: number, alpha: number) {
    this.t += dt;
    const RAD = Math.PI / 180;
    this.root.rotation.set(pitch * RAD, 0, -bank * RAD, "YXZ");
    const k = Math.max(0, Math.min(1, inflate));
    this.wing.rotation.x = (1 - k) * 1.25;
    this.wing.scale.setScalar(0.4 + 0.6 * k);
    this.wing.position.set(0, -(1 - k) * 3.5, (1 - k) * 2.5);
    this.lines.visible = k > 0.35;
    this.harness.rotation.set(Math.sin(this.t * 1.3) * 0.03 - pitch * RAD * 0.4, 0, bank * RAD * 0.35, "YXZ");
    const blink = (Math.sin(this.t * 6.2) > 0.86 ? 1 : 0.18) * alpha;
    for (const m of this.mats) {
      const mm = m as T.Material & { opacity: number };
      mm.opacity = (m.type === "LineBasicMaterial" ? 0.75 : 1) * alpha;
    }
    for (const b of this.beacons) ((b.material as T.MeshBasicMaterial).opacity = blink);
    this.root.visible = alpha > 0.004;
    if (this.pilot && Math.abs(alpha - this.pilotA) > 0.002) {
      this.pilotA = alpha;
      for (const m of this.pilotMats) {
        m.transparent = alpha < 0.999;
        m.opacity = alpha;
      }
    }
    this.pilot?.update(dt);
  }

  dispose() {
    this.pilot?.dispose();
    this.mats.forEach((m) => m.dispose());
    this.geos.forEach((g) => g.dispose());
  }
}
