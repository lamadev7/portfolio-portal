import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, rbox } from '../kit';
import { canvasTex, h2 } from '../textures';
import { plasticChair, pot, garland, tree } from '../props';
import { CROWD } from '../crowd';
import type { SceneModule, SceneCtx } from '../types';

/* mortarboards in flight: ballistic arcs under gravity with air drag and tumble; on the lawn they bounce, slide and settle flat */
export class CapToss {
  im: THREE.InstancedMesh; caps: { p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; w: THREE.Vector3; live: boolean; rest: boolean; t0: number }[] = [];
  private d = new THREE.Object3D();
  constructor(max: number, public floor = 0) {
    const g = new THREE.BoxGeometry(0.25, 0.012, 0.25), sk = new THREE.CylinderGeometry(0.085, 0.082, 0.07, 14, 1, true); sk.translate(0, -0.04, 0);
    const merged = new THREE.BufferGeometry(); const a = g.toNonIndexed(), c = sk.toNonIndexed(); const pos = new Float32Array(a.attributes.position.count * 3 + c.attributes.position.count * 3), nor = new Float32Array(pos.length);
    pos.set(a.attributes.position.array as Float32Array); pos.set(c.attributes.position.array as Float32Array, a.attributes.position.count * 3); nor.set(a.attributes.normal.array as Float32Array); nor.set(c.attributes.normal.array as Float32Array, a.attributes.normal.count * 3);
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    this.im = new THREE.InstancedMesh(merged, new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.7, side: THREE.DoubleSide }), max); this.im.count = 0; this.im.castShadow = true; this.im.frustumCulled = false;
  }
  launch(p: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3, t: number) { if (this.caps.length >= this.im.instanceMatrix.count) return; this.caps.push({ p: p.clone(), v: v.clone(), q: new THREE.Quaternion(), w: w.clone(), live: true, rest: false, t0: t }); this.im.count = this.caps.length; }
  clear() { this.caps = []; this.im.count = 0; }
  step(dt: number, t: number) {
    const s = Math.min(dt, 1 / 30), up = new THREE.Vector3(0, 1, 0);
    this.caps.forEach((c, i) => {
      if (t < c.t0) { this.d.position.set(0, -50, 0); this.d.updateMatrix(); this.im.setMatrixAt(i, this.d.matrix); return; }
      if (!c.rest) {
        c.v.y -= 9.81 * s; c.v.multiplyScalar(1 - 0.35 * s); c.p.addScaledVector(c.v, s);
        const dq = new THREE.Quaternion().setFromEuler(new THREE.Euler(c.w.x * s, c.w.y * s, c.w.z * s)); c.q.premultiply(dq); c.w.multiplyScalar(1 - 0.4 * s);
        if (c.p.y < this.floor + 0.012 && c.v.y < 0) {
          c.p.y = this.floor + 0.012; c.v.y = -c.v.y * 0.28; c.v.x *= 0.55; c.v.z *= 0.55; c.w.multiplyScalar(0.35);
          if (Math.abs(c.v.y) < 0.35) { c.v.set(c.v.x * 0.5, 0, c.v.z * 0.5); const yaw = new THREE.Euler().setFromQuaternion(c.q, 'YXZ').y; c.q.slerp(new THREE.Quaternion().setFromAxisAngle(up, yaw), 0.6); if (c.v.lengthSq() < 0.01) c.rest = true; }
        }
      }
      this.d.position.copy(c.p); this.d.quaternion.copy(c.q); this.d.updateMatrix(); this.im.setMatrixAt(i, this.d.matrix);
    });
    this.im.instanceMatrix.needsUpdate = true;
  }
}

/* OCT 2023 · graduation, First Class Honours: an open-air stage with the ceremony backdrop and podium, the class standing on the lawn in
   black gowns with red-and-gold stoles, families on chairs at the sides. On the second line the caps go up together. */
export const graduation: SceneModule = {
  id: 'graduation', title: 'Graduation · Herald College',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'graduation'), b = P.b, bl = P.bl;
    P.ground(-17, -37, 17, -6, 'grass', 0xb8c890); P.strip(0, -1, 0, -9, 2.2, 'paver', 0xc9c6bf); P.ground(-11, -35, 11, -27, 'concrete', 0xc8c4bb, 0.035);
    /* stage and backdrop */
    const sh = 1.1, sz = -31, sd = 6, sw = 18, sf = sz + sd / 2;
    b.add(box(sw, sh, sd), 'wood', 0x6b4a30, M(0, sh / 2, sz)); b.add(box(sw - 0.3, 0.02, sd - 0.3), 'carpet', 0x14234a, M(0, sh + 0.01, sz), false);
    b.add(box(sw + 0.04, sh - 0.05, 0.05), 'fabric', 0xf2f2f0, M(0, sh / 2, sf + 0.03)); for (let i = 0; i < 36; i++) b.add(box(0.04, sh - 0.08, 0.04), 'fabric', 0xf2f2f0, M(-sw / 2 + 0.25 + i * 0.5, sh / 2, sf + 0.07), false);
    for (let i = 0; i < 3; i++) b.add(box(2.2, sh * (i + 1) / 3, 0.4), 'wood', 0x6b4a30, M(0, sh * (i + 1) / 6, sf + 1.0 - i * 0.4));
    P.add(garland([V3(-sw / 2, sh - 0.05, sf + 0.1), V3(-4.5, sh - 0.05, sf + 0.1), V3(-1.2, sh - 0.05, sf + 0.1)], 0.25)); P.add(garland([V3(1.2, sh - 0.05, sf + 0.1), V3(4.5, sh - 0.05, sf + 0.1), V3(sw / 2, sh - 0.05, sf + 0.1)], 0.25));
    const gradT = canvasTex('gradBan', 2048, 640, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0e1c3d'); gr.addColorStop(1, '#13306b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(h2(i, 1) * w, h2(i, 2) * h, 40 + h2(i, 3) * 160, 0, 6.283); g.fill(); }
      g.strokeStyle = '#d9b44a'; g.lineWidth = 12; g.strokeRect(30, 30, w - 60, h - 60); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#d9b44a'; g.font = '600 60px Inter, sans-serif'; g.fillText('HERALD COLLEGE KATHMANDU', w / 2, 140);
      g.fillStyle = '#ffffff'; g.font = '800 190px Inter, sans-serif'; g.fillText('GRADUATION', w / 2, 320); g.fillStyle = '#f4b961'; g.font = '700 84px Inter, sans-serif'; g.fillText('CEREMONY · CLASS OF 2023', w / 2, 480);
    });
    const bw = 14, bh = 4.4, bz = sz - sd / 2 + 0.3; for (const s of [-1, 1]) { b.add(box(0.9, bh + sh + 2.2, 0.6), 'paint', 0xf2f2f0, M(s * (bw / 2 + 0.6), (bh + sh + 2.2) / 2, bz)); b.add(box(0.7, 3.2, 0.05), 'fabric', 0xa3192c, M(s * (bw / 2 + 0.6), sh + 3.0, bz + 0.33), false); }
    b.add(box(bw + 2.1, 0.7, 0.6), 'paint', 0xf2f2f0, M(0, bh + sh + 1.9, bz)); P.sign(gradT, bw, bh, 0, sh + 0.45 + bh / 2, bz + 0.32, 0, 0x0e1c3d, 0.06); P.frameBox(0, sh + 0.45 + bh / 2, bz + 0.32, bw + 0.4, bh + 0.3);
    b.add(rbox(0.9, 1.15, 0.65, 0.04), 'wood', 0x4a3020, M(5.5, sh + 0.58, sz + 1.0)); b.add(cyl(0.012, 0.012, 0.42, 6), 'metal', 0x2a2b2e, M(5.4, sh + 1.35, sz + 0.95, 0, 0.5));
    for (const x of [-7.8, -4.5, 4.0, 7.8]) pot(b, x, sh, sz + 2.4, 1.0, x < 0 ? 0xf29a1a : 0xf2c230);
    for (let i = 0; i < 6; i++) plasticChair(b, bl, -6 + i * 1.6 - (i > 2 ? -1.5 : 0), sh, sz - 1.4, 0, 0xf2f2f0);
    P.crowd({ height: 1.72, outfit: CROWD.formalTie, pose: 'sitclap' }, [-6, -4.4, -2.8, 1.7, 3.3, 4.9].map((x, i) => ({ x, z: sz - 1.45, y: sh, yaw: 0, top: i % 2 ? '#e8eef5' : '#2a2f3a' })), { clap: 0, look: 0.6 }, 0);
    /* the class on the lawn: three rows, caps on; after the toss the same people with arms up */
    const grads: { x: number; z: number; yaw: number; s: number }[] = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { const x = -5.6 + c * 1.4 + (r % 2) * 0.7, z = -15.4 - r * 1.25; if (r === 0 && Math.abs(x) < 1.0) continue; grads.push({ x, z, yaw: (h2(c, r) - 0.5) * 0.3, s: 0.94 + h2(r, c) * 0.1 }); }
    const male = grads.filter((_, i) => h2(i, 7) > 0.4), female = grads.filter((_, i) => h2(i, 7) <= 0.4);
    const gm = { ...CROWD.gown }, gf = { ...CROWD.gown };
    const on = [P.crowd({ height: 1.72, outfit: gm, pose: 'clasp' }, male, { look: 0.5 }, 0.7), P.crowd({ height: 1.6, female: true, hairStyle: 'long', outfit: gf, pose: 'clasp' }, female, { look: 0.5 }, 0.7)];
    const off = [P.crowd({ height: 1.72, outfit: { ...gm, mortar: false }, pose: 'cheer' }, male, { look: 0.2, sway: 0.4 }, 0), P.crowd({ height: 1.6, female: true, hairStyle: 'long', outfit: { ...gf, mortar: false }, pose: 'cheer' }, female, { look: 0.2, sway: 0.4 }, 0)];
    off.forEach((c) => { c.mesh.visible = false; });
    /* families at the sides */
    for (const s of [-1, 1]) { const list: { x: number; z: number; yaw: number; top: string }[] = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const x = s * (10 + r * 1.3), z = -12 - c * 1.1; plasticChair(b, bl, x, 0, z, -s * Math.PI / 2 + 0.3 * s, 0xb3261e); list.push({ x, z, yaw: -s * Math.PI / 2 + 0.3 * s, top: ['#c94f6d', '#2b3445', '#e8e2d6', '#3c7a6a'][(r + c) % 4] }); } P.crowd({ height: 1.65, outfit: CROWD.kurta, pose: 'sitclap' }, list, { clap: 0.6, look: 0.8, sway: 0 }, 0); }
    tree(b, bl, -15, 0, -24, 1.2, 'broad', 61); tree(b, bl, 15.5, 0, -27, 1.1, 'broad', 63); tree(b, bl, 15.5, 0, -8.5, 0.9, 'fine', 65);
    /* the toss */
    const toss = new CapToss(grads.length + 4, 0); P.add(toss.im); P.props.caps = toss.im; let tossAt = -1, now = 0;
    const fire = () => { if (tossAt >= 0 && now - tossAt < 6) return; tossAt = now; toss.clear(); grads.forEach((g, i) => toss.launch(V3(g.x + Math.sin(g.yaw) * 0.05, 1.78 * g.s + 0.25, g.z), V3((h2(i, 1) - 0.5) * 1.8, 6.0 + h2(i, 2) * 2.6, (h2(i, 3) - 0.35) * 1.4), V3((h2(i, 4) - 0.5) * 16, (h2(i, 5) - 0.5) * 20, (h2(i, 6) - 0.5) * 12), now + 1.2 + h2(i, 8) * 0.3)); };
    P.events.beat = (b) => { if (b === 'toss') fire(); };
    P.events.line = (i) => { if (i === 0) { tossAt = -1; toss.clear(); on.forEach((c) => { c.mesh.visible = true; }); off.forEach((c) => { c.mesh.visible = false; }); } };
    P.api.launchCap = (p: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3) => toss.launch(p, v, w, now);
    P.ups.push((t, dt) => { now = t; if (tossAt >= 0 && t - tossAt > 1.15 && on[0].mesh.visible) { on.forEach((c) => { c.mesh.visible = false; }); off.forEach((c) => { c.mesh.visible = true; }); } if (toss.caps.length) toss.step(dt, t); if (tossAt >= 0 && t - tossAt > 2.4) off.forEach((c) => { c.uni.uSway.value = 0.3; }); });
    const stand = V3(0, 0, -14.2);
    return P.finish({
      stand: stand.toArray() as [number, number, number], yaw: 0.05, act: 'toss', outfit: 'gown', bubbleSide: 'right',
      path: [[0, -1], [0, -9], [0.2, -12.6]], camera: [2.2, 1.85, -5.6], lookAt: [-0.6, 2.9, -22], cameraPortrait: [1.4, 1.8, -7.6],
      focus: [0, 9, -14], plot: { x: 0, z: -21, rx: 18, rz: 16 },
    });
  },
};
