import * as THREE from 'three';
import { Hero } from './motion';
import { CHAPTER_SCENES } from './scenes';
import { setEnv, allMaterials } from './kit';
import type { BuiltScene, V3 } from './types';

/* ==== the bridge between the journey engine and the world: builds one scene per chapter on its own plot beside the trail, runs the hero
   between them, and hands the engine a camera framing for each stop. The engine stays the owner of time, scroll, narration and light. ==== */

/* each plot sits beside its stop, nudged along the road where a landmark already owns the ground */
const DX = [0, 10, -8, -6, 0, -26, 34, 0, 0, 0, 0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Engine = any;
interface Plot { k: number; s: BuiltScene; x0: number; y0: number; ox: number }

export class WorldBridge {
  plots: Plot[] = []; hero!: Hero; s: Engine;
  heroPlot = -1; private target = -1; private state: 'road' | 'inbound' | 'at' | 'leaving' = 'road'; private arrivedAt = -1; private assignT = 0;
  camK = 0; private camW = new THREE.Vector3(); private lookW = new THREE.Vector3(); private frustum = new THREE.Frustum(); private pm = new THREE.Matrix4();
  private lastLine = ''; private lastBeat: unknown = null; private t = 0;
  constructor(s: Engine) { this.s = s; }

  /** build every scene (before the terrain, so the plots can flatten it) and return their flattening ellipses */
  build(envTex: THREE.Texture | null) {
    const s = this.s; setEnv(envTex);
    this.plots = CHAPTER_SCENES.map((m, k) => {
      const sc = m.build(THREE, { quality: 'high', variant: k === 7 ? '2024' : '2023' }), x0 = s.pinX(k) * s.SC + DX[k];
      sc.group.userData.x = x0; return { k, s: sc, x0, y0: 0, ox: x0 };
    });
    if (s.PADS) this.plots.forEach((p) => { const P = p.s.anchors.plot; s.PADS.push({ x: p.x0 + P.x, z: P.z, rx: P.rx + 2, rz: P.rz + 2 }); });
    return this.plots.map((p) => { const P = p.s.anchors.plot; return { x: p.x0 + P.x, z: P.z, rx: P.rx * 1.45, rz: P.rz * 1.45, h: s.roadH(p.x0) }; });
  }
  /** clearing circles for the engine's trees and houses */
  clears() { return this.plots.map((p) => { const P = p.s.anchors.plot; return [p.x0 + P.x, P.z, Math.hypot(P.rx, P.rz) + 4]; }); }
  /** after the terrain exists: drop each plot onto its flattened ground and add the hero */
  place(scene: THREE.Scene) {
    const s = this.s; s.SG = s.SG || [];
    for (const p of this.plots) { p.y0 = s.H(p.x0 + p.s.anchors.plot.x, p.s.anchors.plot.z); p.s.group.position.set(p.x0, p.y0, 0); p.s.group.updateMatrixWorld(true); scene.add(p.s.group); }
    this.hero = new Hero({ ground: (x, z) => this.ground(x, z) });
    this.hero.group.traverse((o) => { o.frustumCulled = false; });
    scene.add(this.hero.group);
    const x = s.pinX(0) * s.SC - 30; this.hero.place(new THREE.Vector3(x, 0, 0.6), Math.PI / 2);
    this.lights(scene);
    this.hero.onRelease = (r) => { const p = this.plots[this.heroPlot]; if (p && p.s.api.launchCap) p.s.api.launchCap(r.pos.clone().sub(p.s.group.position), r.vel, r.spin); };
  }
  ground(x: number, z: number) {
    for (const p of this.plots) { const P = p.s.anchors.plot, lx = x - p.x0, lz = z; if (Math.abs(lx - P.x) < P.rx && Math.abs(lz - P.z) < P.rz) return p.y0 + 0.03 + (p.s.floor ? p.s.floor(lx, lz) : 0); }
    const s = this.s; return Math.abs(z) < 2.6 ? s.roadH(x) + 0.06 + (s.deckY ? s.deckY(x) : 0) : s.H(x, z) + 0.04;
  }
  private w(p: Plot, v: V3 | [number, number], y = 0) { return v.length === 3 ? new THREE.Vector3(p.x0 + v[0], p.y0 + v[1], v[2]) : new THREE.Vector3(p.x0 + v[0], y, v[1]); }
  private ac = new THREE.PerspectiveCamera();
  private anchorCam(p: Plot) { const c = this.ac, e = this.s.cam3, A = p.s.anchors; c.fov = e.fov; c.aspect = e.aspect; c.near = 0.3; c.far = 600; c.updateProjectionMatrix(); c.position.copy(this.w(p, (this.s.VW < this.s.VH && A.cameraPortrait) || A.camera)); c.lookAt(this.w(p, A.lookAt)); c.updateMatrixWorld(); return c; }
  private visible(pos: THREE.Vector3, cam?: THREE.PerspectiveCamera) { const c = cam || this.s.cam3; c.updateMatrixWorld(); this.pm.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.pm); return this.frustum.intersectsSphere(new THREE.Sphere(pos.clone().add(new THREE.Vector3(0, 0.9, 0)), 1.3)); }
  /** the engine may start the chapter's narration once he is standing (or seated) at the plot */
  ready(k: number) { return this.s.rm || (this.heroPlot === k && this.state === 'at' && this.hero.arrived) || (this.target === k && this.t - this.assignT > 20); }

  /* send him to plot k: run if he is already in shot, otherwise wait off-frame by the road and run in along the plot's path */
  private assign(k: number) {
    const p = this.plots[k], A = p.s.anchors, H = this.hero, s = this.s; this.target = k; this.assignT = this.t;
    H.stand(); H.setAct(null); H.hold(null, null); H.speaking = false; H.resetCap();
    if (H.outfit !== A.outfit) { if (this.visible(H.pos)) { /* keep his clothes until he is out of shot */ } else H.wear(A.outfit); }
    const entry = this.w(p, A.path[0]), dir = H.pos.x < entry.x ? 1 : -1;
    this.pending = -1; H.group.visible = true;
    if (!(this.visible(H.pos) && H.pos.distanceTo(entry) < 22)) {
      const ac = this.anchorCam(p); let sx = entry.x - dir * 3;
      for (let i = 0; i < 40; i++) { if (!this.visible(new THREE.Vector3(sx, this.ground(sx, 0.6), 0.6), ac)) break; sx -= dir * 2; }
      if (H.outfit !== A.outfit) H.wear(A.outfit);
      H.place(new THREE.Vector3(sx, 0, 0.6), dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      /* still in the wide shot: wait there unseen until the crane move takes that spot out of frame */
      if (this.visible(H.pos)) { this.pending = k; H.group.visible = false; return; }
    }
    this.start(k);
  }
  private pending = -1;
  private start(k: number) {
    const p = this.plots[k], A = p.s.anchors, H = this.hero, entry = this.w(p, A.path[0]);
    if (A.act === 'cert' && p.k === 0 && p.s.props?.cert) H.hold(p.s.props.cert, 'cert');
    const pts = [new THREE.Vector3(entry.x, 0, 0.6), ...A.path.map((q) => this.w(p, q)), this.w(p, A.stand)];
    this.state = 'inbound'; this.heroPlot = k; this.arrivedAt = -1; H.laptopOn = A.outfit === 'office';
    const run = H.pos.distanceTo(entry) > 6 ? 6.2 : 3;
    const go = A.seat != null ? H.sitAt(this.w(p, A.stand), A.yaw, A.seat, pts.slice(0, -1)) : H.go(pts, A.yaw, run);
    if (A.seat == null) H.vmax = run;
    go.then(() => { if (this.heroPlot !== k) return; this.state = 'at'; this.arrivedAt = this.t; H.setAct(A.act, A.focus ? this.w(p, A.focus) : null); if (A.act === 'cert' && p.s.props?.cert && k !== 0) H.hold(p.s.props.cert, 'cert', true); });
  }
  /* leaving a plot: back down the path to the road, then on along the trail the way the reader is going */
  private leave(dir: number) {
    const p = this.plots[this.heroPlot], H = this.hero; if (!p) return;
    const A = p.s.anchors, back = [...A.path].reverse().map((q) => this.w(p, q)), road = new THREE.Vector3(H.pos.x + dir * 3, 0, 0.6);
    H.setAct(null); if (H.propMode === 'cert' && p.k !== 0) { H.hold(null, null); }
    this.state = 'leaving'; this.heroPlot = -1; this.target = -1;
    H.go([...back, road, new THREE.Vector3(road.x + dir * 400, 0, 0.6)], null, 6.2);
  }

  /** per frame: hero, scenes, and the camera framing the engine blends toward at a stop */
  frame(dt: number, T: number, cx: number) {
    const s = this.s, H = this.hero; this.t = T;
    const o = s.sto, onStop = o.k >= 0 ? o.k : -1, tourK = s.tour ? s.tour.k : -1;
    let near = -1; for (const p of this.plots) if (Math.abs(cx - s.pinX(p.k) * s.SC) < 14) near = p.k;
    const want = onStop >= 0 ? onStop : tourK >= 0 && Math.abs(cx - s.pinX(tourK) * s.SC) < 60 ? tourK : near >= 0 && !s.tour ? near : -1;
    if (s.mode > 0.5) { /* explorer mode: leave him be */ }
    else if (want >= 0 && want !== this.target) { if (this.state === 'at' && this.heroPlot >= 0 && this.heroPlot !== want) this.leave(want > this.heroPlot ? 1 : -1); this.assign(want); }
    else if (want < 0 && this.state === 'at' && Math.abs(cx - this.plots[this.heroPlot].x0) > 40) this.leave(cx > this.plots[this.heroPlot].x0 ? 1 : -1);
    if (this.pending >= 0 && this.pending === this.target && !this.visible(H.pos)) { H.group.visible = true; const k = this.pending; this.pending = -1; this.start(k); }
    if (this.state === 'leaving' && !this.visible(H.pos)) { H.path = []; H.speed = 0; this.state = 'road'; }
    if (this.state === 'road' && this.target < 0 && s.mode < 0.5) {
      const dir = (s.tc - s.cam) < -1 ? -1 : 1;
      if (!this.visible(H.pos) && Math.abs(H.pos.x - cx) > 30) H.place(new THREE.Vector3(cx - dir * 46, 0, 0.6), dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      if (!H.path.length || Math.abs(H.path[H.path.length - 1].x - (cx + dir * 14)) > 6) H.go([new THREE.Vector3(cx + dir * 14, 0, 0.6)], null, 6.2);
    }
    /* outfit swap only ever happens out of shot */
    if (this.target >= 0 && H.outfit !== this.plots[this.target].s.anchors.outfit && !this.visible(H.pos)) H.wear(this.plots[this.target].s.anchors.outfit);
    H.speaking = !!s.speaking && onStop === this.heroPlot && this.state === 'at'; H.talkLevel = s.talkLevel || 0; H.camera = s.cam3.position;
    /* narration beats and line changes reach the scene and the hero */
    if (onStop >= 0 && this.heroPlot === onStop) {
      const key = onStop + ':' + o.i; if (key !== this.lastLine) { this.lastLine = key; this.plots[onStop].s.events.line?.(o.i, s.chapters()[onStop].lines.length); }
      const bt = s.beat && s.beat.b; if (s.beat && s.beat !== this.lastBeat) { this.lastBeat = s.beat; if (bt && this.state === 'at') { if (bt === 'toss') H.toss(); this.plots[onStop].s.events.beat?.(bt); } }
    } else if (onStop < 0) this.lastLine = '';
    H.update(dt, T);
    const cp = s.cam3.position;
    for (const p of this.plots) {
      const d = Math.hypot(cp.x - p.x0, cp.z - p.s.anchors.plot.z), vis = s.mode < 0.5 && Math.abs(p.x0 - cx) < 150 && d < 190;
      p.s.group.visible = vis; if (!vis) continue;
      const cg = p.s.group.getObjectByName('crowds'); if (cg) cg.visible = d < 85;
      p.s.update(T, dt, p.k === this.heroPlot && this.state === 'at');
    }
    /* camera: blend from the engine's wide trail shot to the plot's own framing as he comes in, eased both ways */
    const fk = this.target >= 0 ? this.target : -1, inShot = fk >= 0 && Math.abs(cx - s.pinX(fk) * s.SC) < 24 && s.mode < 0.5;
    const goal = inShot ? 1 : 0; this.camK += (goal - this.camK) * (1 - Math.exp(-dt * (goal ? 1.25 : 2.0)));
    if (fk >= 0) { const p = this.plots[fk], F = this.frameFor(p); this.camW.copy(F.pos); this.lookW.copy(F.look); this.lastPlot = fk; }
    s.walker = H.group; H.group.userData.h = H.H / 2.25; s.walkH = H.H / 2; s.focus = [H.pos.x, H.group.position.y + H.H * 0.82, H.pos.z];
    const fp = this.plots[this.lastPlot], SG = fp && fp.s.anchors.sign; s.spot = fp ? (SG ? { see: this.w(fp, SG.c).toArray(), seeW: SG.w / 2 + 0.3, seeH: SG.h / 2 + 0.2 } : { see: fp.s.anchors.focus ? this.w(fp, fp.s.anchors.focus).toArray() : null, seeW: 2 }) : null;
    if (this.fill && this.rim) { const nf = s.nf || 0, on = nf * this.camK * (this.state === 'at' || this.state === 'inbound' ? 1 : 0.4), hp = H.group.position, cp2 = this.camW, dx = cp2.x - hp.x, dz = cp2.z - hp.z, l = Math.hypot(dx, dz) || 1;
      this.fill.position.set(hp.x + dx / l * 2.6 - dz / l * 1.4, hp.y + 2.6, hp.z + dz / l * 2.6 + dx / l * 1.4); this.fill.intensity = 26 * on;
      this.rim.position.set(hp.x - dx / l * 2.2 + dz / l * 0.8, hp.y + 2.9, hp.z - dz / l * 2.2 - dx / l * 0.8); this.rim.intensity = 18 * on; }
  }
  private lastPlot = -1;
  /* establishing-plus-subject shot: from the scene's hinted side, pull back until the sign and the whole of him sit inside the safe area
     (x 6–94 %, y 12–72 %), centred in it, with him no taller than a quarter of the frame */
  private frames = new Map<string, { pos: THREE.Vector3; look: THREE.Vector3 }>();
  private fc = new THREE.PerspectiveCamera();
  frameFor(p: Plot) {
    const s = this.s, A = p.s.anchors, portrait = s.VW < s.VH, key = p.k + ':' + s.cam3.aspect.toFixed(2);
    const hit = this.frames.get(key); if (hit) return hit;
    const hint = this.w(p, (portrait && A.cameraPortrait) || A.camera), feet = this.w(p, A.stand), tall = A.seat != null ? 1.35 : 1.8;
    const pts: THREE.Vector3[] = [new THREE.Vector3(-0.4, 0, 0), new THREE.Vector3(0.4, 0, 0), new THREE.Vector3(-0.4, tall + 0.1, 0), new THREE.Vector3(0.4, tall + 0.1, 0)].map((v) => v.add(feet));
    if (A.sign) { const c = this.w(p, A.sign.c); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pts.push(new THREE.Vector3(c.x + a * A.sign.w / 2, c.y + b * A.sign.h / 2, c.z)); }
    (A.ctx || []).forEach((q) => pts.push(this.w(p, q)));
    const c = this.fc; c.fov = s.cam3.fov; c.aspect = s.cam3.aspect; c.near = 0.3; c.far = 900; c.updateProjectionMatrix();
    const mid = feet.clone().add(new THREE.Vector3(0, 1.0, 0)), dir = new THREE.Vector3(hint.x - mid.x, 0, hint.z - mid.z).normalize(), hy = Math.max(1.9, hint.y - feet.y);
    const cen = new THREE.Vector3(); pts.forEach((q) => cen.add(q)); cen.multiplyScalar(1 / pts.length);
    const v = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(); let best = { pos: hint.clone(), look: cen.clone() };
    for (let d = 7; d <= 70; d += 0.5) {
      const pos = new THREE.Vector3(mid.x + dir.x * d, feet.y + hy + d * 0.02, mid.z + dir.z * d), look = cen.clone(); let ok = false, hh = 0;
      for (let it = 0; it < 6; it++) {
        c.position.copy(pos); c.lookAt(look); c.updateMatrixWorld();
        let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const q of pts) { v.copy(q).project(c); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
        const ex = (x0 + x1) / 2, ey = (y0 + y1) / 2 - 0.26, dl = pos.distanceTo(look); right.setFromMatrixColumn(c.matrixWorld, 0); up.setFromMatrixColumn(c.matrixWorld, 1);
        look.addScaledVector(right, ex * dl * Math.tan(c.fov * Math.PI / 360) * c.aspect).addScaledVector(up, ey * dl * Math.tan(c.fov * Math.PI / 360));
        ok = x1 - x0 <= 1.7 && y1 - y0 <= 1.0; v.copy(feet).project(c); const fy0 = v.y; v.copy(feet).add(new THREE.Vector3(0, tall, 0)).project(c); hh = (v.y - fy0) / 2;
      }
      best = { pos, look }; if (ok && hh <= 0.2) break;
    }
    this.frames.set(key, best); return best;
  }
  /** where the plot's sign lands on screen (percent of the viewport), for checks */
  signCheck(k: number) {
    const p = this.plots[k], A = p && p.s.anchors; if (!A || !A.sign) return null; const c = this.w(p, A.sign.c), v = new THREE.Vector3(); let x0 = 999, x1 = -999, y0 = 999, y1 = -999;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { v.set(c.x + a * A.sign.w / 2, c.y + b * A.sign.h / 2, c.z).project(this.s.cam3); const X = (v.x + 1) * 50, Y = (1 - v.y) * 50; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
    return { x0: +x0.toFixed(1), x1: +x1.toFixed(1), y0: +y0.toFixed(1), y1: +y1.toFixed(1), ok: x0 >= 6 && x1 <= 94 && y0 >= 12 && y1 <= 72 };
  }
  /* night practicals: one warm key and one rim light follow the plot he is at, so faces and clothes read after dark */
  private fill: THREE.PointLight | null = null; private rim: THREE.PointLight | null = null;
  lights(scene: THREE.Scene) { this.fill = new THREE.PointLight(0xffd6a0, 0, 16, 1.6); this.rim = new THREE.PointLight(0xffe2bc, 0, 14, 1.6); scene.add(this.fill, this.rim); }
  /** the stop framing: position and look target, and how much of it to use (eased 0..1) */
  shot() { const k = this.camK, e = k * k * (3 - 2 * k); return { k: e, pos: this.camW, look: this.lookW }; }
  night(nf: number) { allMaterials().forEach((m) => { if (m.userData.inner) m.emissiveIntensity = m.userData.inner * (1 + 1.2 * nf); }); }
}
