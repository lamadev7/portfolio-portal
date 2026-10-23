import * as THREE from 'three';
import { Batch, Blobs, box, mat4, face, disposeGroup } from './kit';
import { Crowd, type Variant, type Member, type CrowdOpts } from './crowd';
import type { SceneCtx, SceneAnchors, BuiltScene, SceneEvents } from './types';

/* ==== a chapter plot: one group holding the merged statics, instanced crowds, contact shadows and animated bits ==== */
export class Plot {
  group = new THREE.Group(); b = new Batch(); bl = new Blobs(); crowds: Crowd[] = []; ups: ((t: number, dt: number, active: boolean) => void)[] = [];
  props: Record<string, THREE.Object3D> = {}; events: SceneEvents = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: Record<string, (...a: any[]) => void> = {};
  floors: { x0: number; z0: number; x1: number; z1: number; y: number; ramp?: 'x' | 'z' | '-x' | '-z'; y0?: number }[] = [];
  /** a walkable box (stage, plinth) or a ramp standing in for steps */
  floorBox(x0: number, z0: number, x1: number, z1: number, y: number, ramp?: 'x' | 'z' | '-x' | '-z', y0 = 0) { this.floors.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y, ramp, y0 }); }
  floor = (x: number, z: number) => { let h = 0; for (const f of this.floors) { if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue; let y = f.y; if (f.ramp) { const t = f.ramp === 'x' ? (x - f.x0) / (f.x1 - f.x0) : f.ramp === '-x' ? (f.x1 - x) / (f.x1 - f.x0) : f.ramp === 'z' ? (z - f.z0) / (f.z1 - f.z0) : (f.z1 - z) / (f.z1 - f.z0); y = (f.y0 || 0) + (f.y - (f.y0 || 0)) * t; } h = Math.max(h, y); } return h; };
  cg = new THREE.Group(); signBox: { c: [number, number, number]; w: number; h: number } | null = null;
  frameBox(x: number, y: number, z: number, w: number, h: number) { this.signBox = { c: [x, y, z], w, h }; }
  constructor(public ctx: SceneCtx, public name: string) { this.group.name = name; this.cg.name = 'crowds'; this.group.add(this.cg); }
  /** ground slab whose top sits at y; deep enough to hide small terrain mismatch */
  ground(x0: number, z0: number, x1: number, z1: number, mat: string, col: number, y = 0.03, depth = 1.2) { this.b.add(box(x1 - x0, depth, z1 - z0), mat, col, mat4((x0 + x1) / 2, y - depth / 2, (z0 + z1) / 2), false); }
  /** a straight paved strip between two points */
  strip(ax: number, az: number, cx: number, cz: number, w: number, mat: string, col: number, y = 0.045) { const l = Math.hypot(cx - ax, cz - az); this.b.add(box(w, 0.06, l), mat, col, mat4((ax + cx) / 2, y - 0.03, (az + cz) / 2, Math.atan2(cx - ax, cz - az)), false); }
  crowd(v: Variant, list: Member[], o: CrowdOpts = {}, blob = 0.85) { const c = new Crowd(list.length > 10 && !v.lod ? { ...v, lod: 2 } : v, list, { shadow: list.length <= 6, ...o }); this.crowds.push(c); this.cg.add(c.mesh); if (blob) list.forEach((m) => this.bl.add(m.x, m.y || 0, m.z, blob, blob)); return c; }
  /** a board: textured face, a frame and optional posts */
  sign(tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, yaw = 0, frame = 0x1d1f24, d = 0.12, posts = 0) {
    this.b.add(box(w + 0.12, h + 0.12, d), 'paint', frame, mat4(x, y, z, yaw));
    const f = face(tex, w, h, { rough: 0.55 }); f.position.set(x + Math.sin(yaw) * (d / 2 + 0.005), y, z + Math.cos(yaw) * (d / 2 + 0.005)); f.rotation.y = yaw; this.group.add(f);
    if (posts) for (const s of [-1, 1]) this.b.add(box(0.1, posts, 0.1), 'steel', 0x3a3d42, mat4(x + Math.cos(yaw) * s * (w / 2 - 0.3), y - h / 2 - posts / 2 + 0.05, z - Math.sin(yaw) * s * (w / 2 - 0.3) - Math.cos(yaw) * 0.04));
    return f;
  }
  screen(tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, yaw = 0, k = 1.1) { const f = face(tex, w, h, { emissive: k, rough: 0.25 }); f.position.set(x, y, z); f.rotation.y = yaw; this.group.add(f); return f; }
  add(o: THREE.Object3D) { this.group.add(o); return o; }
  finish(anchors: SceneAnchors): BuiltScene {
    if (this.signBox && !anchors.sign) anchors.sign = this.signBox;
    this.b.build(this.group); this.bl.build(this.group);
    const crowds = this.crowds, ups = this.ups, g = this.group;
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && o.matrixAutoUpdate && !o.userData.anim) { o.updateMatrix(); } });
    return {
      group: g, anchors, events: this.events, props: this.props, floor: this.floors.length ? this.floor : undefined, api: this.api,
      update: (t, dt, active) => { for (const c of crowds) c.update(t); for (const u of ups) u(t, dt, active); },
      dispose: () => { crowds.forEach((c) => c.dispose()); disposeGroup(g); },
    };
  }
}
export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
