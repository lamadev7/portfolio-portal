import * as THREE from "three";
import { NIGHT, type CharState, type Character, type FrameCtx, type LocationScene, type NpcKind, type SceneCtx, type SceneEnv, type SceneId, type Shot, type Stand, type V3 } from "../../contracts";
import { Batch } from "./geo";
import { Mats } from "./mat";
import { glowTex } from "./tex";

/* the scaffolding every location scene shares: materials, the static batch, colliders, budgeted shading lights,
   NPCs on authored poses and loops, per-frame hooks and disposal */

let envCache: { r: THREE.WebGLRenderer; t: THREE.Texture } | null = null;
/** dim night environment for metal/glass: navy sky, faint warm horizon (town glow), dark ground */
export function nightEnv(r: THREE.WebGLRenderer) {
  if (envCache && envCache.r === r) return envCache.t;
  const sc = new THREE.Scene(), m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying vec3 vP; void main(){ vec3 d = normalize(vP); vec3 c = d.y > 0.0 ? mix(vec3(0.05,0.07,0.12), vec3(0.012,0.018,0.04), pow(d.y, 0.5)) : mix(vec3(0.05,0.045,0.04), vec3(0.01), pow(-d.y, 0.4)); c += vec3(0.25,0.16,0.08) * exp(-abs(d.y) * 14.0) * 0.4; gl_FragColor = vec4(c, 1.0); }",
  });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
  const pm = new THREE.PMREMGenerator(r), t = pm.fromScene(sc, 0, 0.1, 50).texture; pm.dispose(); m.dispose();
  envCache = { r, t }; return t;
}

type Route = { pts: THREE.Vector3[]; speed: number; closed: boolean; i: number; dir: 1 | -1; pause: number; wait: number };
interface Npc { c: Character; route?: Route; yaw: number; act: CharState; look?: V3 }

export class SceneKit {
  readonly group = new THREE.Group();
  readonly mats = new Mats();
  readonly b = new Batch();
  /** static batch whose meshes also show in planar water reflections */
  readonly rb = new Batch();
  readonly colliders: THREE.Box3[] = [];
  readonly npcPaths: Record<string, V3[]> = {};
  private hooks: ((t: number, dt: number, f: FrameCtx) => void)[] = [];
  private finishers: (() => void)[] = [];
  /** shared per-scene scratch (e.g. merged prayer-flag geometry) */
  readonly bag = new Map<string, unknown>();
  private disposers: (() => void)[] = [];
  private npcs: Npc[] = [];
  private pending: Promise<void>[] = [];
  private nLights = 0;

  constructor(readonly ctx: SceneCtx, readonly id: SceneId) {
    this.mats.env = nightEnv(ctx.renderer);
    this.group.name = "scene:" + id;
  }
  get high() { return this.ctx.quality === "high"; }

  /** AABB collider from min/max corners */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) { const b = new THREE.Box3(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1))); this.colliders.push(b); return b; }
  /** collider for a w×d footprint centred at (x,z), rotated by yaw (conservative AABB) */
  foot(x: number, z: number, w: number, d: number, yaw = 0, y0 = 0, h = 6) {
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)), hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
    return this.box(x - hw, y0, z - hd, x + hw, y0 + h, z + hd);
  }
  /** fast "is (x,z) inside a tall collider" test over the colliders registered so far (grid-indexed) */
  blocker(minHeight = 1.0, pad = 0.2) {
    const cell = 10, grid = new Map<string, THREE.Box3[]>();
    for (const c of this.colliders) {
      if (c.max.y - c.min.y < minHeight) continue;
      for (let gx = Math.floor((c.min.x - pad) / cell); gx <= Math.floor((c.max.x + pad) / cell); gx++) for (let gz = Math.floor((c.min.z - pad) / cell); gz <= Math.floor((c.max.z + pad) / cell); gz++) { const key = gx + "," + gz; (grid.get(key) || grid.set(key, []).get(key)!).push(c); }
    }
    return (x: number, z: number) => { const l = grid.get(Math.floor(x / cell) + "," + Math.floor(z / cell)); if (!l) return false; for (const c of l) if (x > c.min.x - pad && x < c.max.x + pad && z > c.min.z - pad && z < c.max.z + pad) return true; return false; };
  }
  /** runs once just before the scene is assembled (merge accumulated geometry) */
  beforeFinish(fn: () => void) { this.finishers.push(fn); }
  on(fn: (t: number, dt: number, f: FrameCtx) => void) { this.hooks.push(fn); }
  onDispose(fn: () => void) { this.disposers.push(fn); }

  /** a shading light, counted against NIGHT.maxShadingLights (extra ones are refused) */
  light(kind: "point" | "spot", pos: V3, color: THREE.ColorRepresentation, intensity: number, distance: number, target?: V3, angle = 0.9) {
    if (this.nLights >= NIGHT.maxShadingLights) { console.warn(`[${this.id}] shading light budget exceeded`); return null; }
    this.nLights++;
    const L = kind === "point" ? new THREE.PointLight(color, intensity, distance, 2) : new THREE.SpotLight(color, intensity, distance, angle, 0.6, 2);
    L.position.set(...pos); L.castShadow = false;
    if (kind === "spot" && target) { (L as THREE.SpotLight).target.position.set(...target); this.group.add((L as THREE.SpotLight).target); }
    this.group.add(L); return L;
  }
  /** additive halo sprite for a lamp (bloom does the rest) */
  halo(pos: V3, color: THREE.ColorRepresentation, size: number, opacity = 0.35) {
    const s = new THREE.Sprite(this.mats.own(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })));
    s.position.set(...pos); s.scale.set(size, size, 1); this.group.add(s); return s;
  }

  /** NPC standing/sitting/doing an act at a fixed pose */
  pose(kind: NpcKind, seed: number, pos: V3, yaw: number, act: CharState = "idle", look?: V3) {
    this.pending.push(this.ctx.characters.npc(kind, seed).then((c) => {
      c.root.position.set(...pos); c.root.rotation.y = yaw; c.play(act); c.setLocomotion(0); if (look) c.lookAt(look);
      this.group.add(c.root); this.npcs.push({ c, yaw, act, look });
    }));
  }
  /** NPC walking an authored route (closed loop, or there-and-back with pauses) */
  walker(kind: NpcKind, seed: number, pts: V3[], o: { speed?: number; closed?: boolean; pause?: number; start?: number } = {}) {
    const key = `${kind}-${seed}`; this.npcPaths[key] = o.closed ? [...pts, pts[0]] : pts;
    this.pending.push(this.ctx.characters.npc(kind, seed).then((c) => {
      const P = pts.map((p) => new THREE.Vector3(...p)), i0 = Math.min(P.length - 1, o.start ?? 0);
      c.root.position.copy(P[i0]); this.group.add(c.root);
      const r: Route = { pts: P, speed: o.speed ?? 1.2, closed: !!o.closed, i: Math.min(P.length - 1, i0 + 1), dir: 1, pause: o.pause ?? 2.5, wait: 0 };
      const n = P[r.i].clone().sub(c.root.position); const yaw = Math.atan2(n.x, n.z); c.root.rotation.y = yaw;
      c.play("walk"); c.setLocomotion(r.speed); this.npcs.push({ c, route: r, yaw, act: "walk" });
    }));
  }
  private stepNpc(n: Npc, dt: number) {
    const r = n.route; if (!r) return;
    const c = n.c, p = c.root.position;
    if (r.wait > 0) { r.wait -= dt; if (r.wait <= 0) { c.play("walk"); c.setLocomotion(r.speed); } return; }
    const tgt = r.pts[r.i], dx = tgt.x - p.x, dz = tgt.z - p.z, L = Math.hypot(dx, dz), step = r.speed * dt;
    if (L <= step) {
      p.copy(tgt);
      if (r.closed) r.i = (r.i + 1) % r.pts.length;
      else { const nx = r.i + r.dir; if (nx < 0 || nx >= r.pts.length) { r.dir = (-r.dir) as 1 | -1; r.wait = r.pause; c.setLocomotion(0); c.play("idle"); } r.i += r.dir; }
      return;
    }
    p.x += (dx / L) * step; p.z += (dz / L) * step; p.y += (tgt.y - p.y) * Math.min(1, step / Math.max(L, 1e-3));
    const want = Math.atan2(dx, dz); let d = want - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * Math.min(1, dt * 6); c.root.rotation.y = n.yaw;
  }

  /** assemble the LocationScene; static batch is merged here */
  async finish(spec: { env: SceneEnv; arrival: Shot; spawn: { pos: V3; yaw: number }; stands: Record<string, Stand>; paths: Record<string, V3[]>; events?: LocationScene["events"] }): Promise<LocationScene> {
    this.finishers.forEach((f) => f()); this.finishers = [];
    this.b.build(this.group, this.mats);
    const rg = new THREE.Group(); this.rb.build(rg, this.mats); rg.traverse((o) => o.layers.enable(1)); this.group.add(rg);
    await Promise.all(this.pending);
    this.group.userData.npcPaths = this.npcPaths;
    const self = this;
    return {
      id: this.id, group: this.group, colliders: this.colliders, ...spec,
      update(t, dt, f) { self.mats.time.value = t; for (const n of self.npcs) { self.stepNpc(n, dt); n.c.update(dt); } for (const h of self.hooks) h(t, dt, f); },
      dispose() {
        self.npcs.forEach((n) => { n.c.root.removeFromParent(); n.c.dispose(); }); self.npcs = [];
        self.disposers.forEach((d) => d());
        self.group.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
        self.mats.dispose(); self.group.removeFromParent();
      },
    };
  }
}
