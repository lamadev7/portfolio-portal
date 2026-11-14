import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, rbox, plane, profileZY } from '../kit';
import { signTex, DEVA, canvasTex, h2 } from '../textures';
import { tree, shrub, bicycle, pot, nepalFlag, certificate } from '../props';
import { CROWD } from '../crowd';
import type { SceneModule, SceneCtx } from '../types';

export const SCHOOL_SIGN = 'SCHOOL · SARLAHI';

/* EARLY YEARS · a Terai government school at morning assembly: a single-storey plastered block with a pillared verandah under a red tin
   roof, an L-wing with a flat roof, the flag over a dirt assembly ground, pupils in class lines, teachers, a boundary wall and gate,
   bicycles, a hand pump and mango trees. Paddy runs right up to the wall. */
export const school: SceneModule = {
  id: 'school', title: 'School · Sarlahi',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'school'), b = P.b, bl = P.bl;
    const cream = 0xe8dfc8, blue = 0x3a6aa8, green = 0x2f6b4f, tinRed = 0x9a3a28, X0 = -17, X1 = 17, Z0 = -36, Z1 = -6;
    P.ground(X0, Z0, X1, Z1, 'dirt', 0xc9b48e);
    P.ground(-3.4, Z1, 1.4, -1.2, 'dirt', 0xb7a27c, 0.02);
    /* boundary wall: plastered brick, blue coping and plinth, a gate between two pillars with an arch board */
    const wall = (ax: number, az: number, cx: number, cz: number) => { const l = Math.hypot(cx - ax, cz - az), yaw = Math.atan2(cx - ax, cz - az) + Math.PI / 2, mx = (ax + cx) / 2, mz = (az + cz) / 2;
      b.add(box(l, 1.55, 0.24), 'plaster', cream, M(mx, 0.78, mz, yaw)); b.add(box(l + 0.06, 0.1, 0.32), 'paint', blue, M(mx, 1.6, mz, yaw)); b.add(box(l + 0.02, 0.32, 0.28), 'paint', blue, M(mx, 0.16, mz, yaw), false);
      for (let s = 0; s < l; s += 3) { const px = ax + (cx - ax) * s / l, pz = az + (cz - az) * s / l; b.add(box(0.36, 1.75, 0.36), 'plaster', cream, M(px, 0.87, pz, yaw)); } };
    wall(X0, Z1, -3.6, Z1); wall(1.6, Z1, X1, Z1); wall(X0, Z1, X0, Z0); wall(X1, Z1, X1, Z0); wall(X0, Z0, X1, Z0);
    for (const gx of [-3.55, 1.55]) { b.add(box(0.6, 2.6, 0.6), 'plaster', cream, M(gx, 1.3, Z1)); b.add(box(0.75, 0.16, 0.75), 'paint', blue, M(gx, 2.66, Z1)); b.add(box(0.5, 0.2, 0.5), 'paint', blue, M(gx, 2.84, Z1)); }
    b.add(box(5.7, 0.14, 0.14), 'steel', 0x2d5f9a, M(-1, 3.2, Z1)); for (const gx of [-3.55, 1.55]) b.add(box(0.1, 0.5, 0.1), 'steel', 0x2d5f9a, M(gx, 2.98, Z1));
    const gateT = signTex('schoolGate', 1024, 200, '#f6f3ea', [{ t: SCHOOL_SIGN, s: 86, c: '#1d3f8f', y: 0.36, w: '800' }, { t: 'विद्यालय · सर्लाही', s: 62, c: '#b3261e', y: 0.76, f: DEVA, w: '500' }], '#1d3f8f');
    P.sign(gateT, 4.6, 0.9, -1, 3.75, Z1, 0, 0x1d3f8f, 0.08); P.frameBox(-1, 3.75, Z1, 4.8, 1.1);
    for (const [gx, dir] of [[-3.25, 1], [1.25, -1]] as const) { b.push(M(gx, 0, Z1 - 0.1, dir * 1.25)); b.add(box(1.9, 0.05, 0.05), 'steel', 0x2d5f9a, M(dir * 0.95, 1.7, 0)); b.add(box(1.9, 0.05, 0.05), 'steel', 0x2d5f9a, M(dir * 0.95, 0.15, 0)); for (let i = 0; i < 9; i++) b.add(box(0.03, 1.55, 0.03), 'steel', 0x2d5f9a, M(dir * (0.1 + i * 0.22), 0.92, 0), false); b.pop(); }
    /* main block: plinth, walls, classroom doors and grilled windows, verandah pillars, red tin roof */
    const bx0 = -14, bx1 = 10, bz = -30, bd = 6, plinth = 0.45, H = 3.3;
    b.add(box(bx1 - bx0 + 0.4, plinth, bd + 3.2), 'concrete', 0xb9b2a4, M((bx0 + bx1) / 2, plinth / 2, bz + 1.6));
    b.add(box(bx1 - bx0, H, bd), 'plaster', cream, M((bx0 + bx1) / 2, plinth + H / 2, bz));
    b.add(box(bx1 - bx0 + 0.04, 0.9, bd + 0.04), 'paint', blue, M((bx0 + bx1) / 2, plinth + 0.45, bz), false);
    for (let i = 0; i < 6; i++) {
      const cx = bx0 + 2 + i * 4, fz = bz + bd / 2 + 0.01;
      b.add(box(1.1, 2.15, 0.08), 'wood', green, M(cx - 0.9, plinth + 1.08, fz)); b.add(box(1.3, 0.12, 0.12), 'paint', blue, M(cx - 0.9, plinth + 2.22, fz));
      b.add(box(1.5, 1.25, 0.05), 'glass', 0x2a3540, M(cx + 0.95, plinth + 1.65, fz), false); for (let k = 0; k < 6; k++) b.add(box(0.025, 1.25, 0.04), 'steel', 0x2a2b2e, M(cx + 0.33 + k * 0.25, plinth + 1.65, fz + 0.03), false);
      b.add(box(1.7, 0.1, 0.18), 'paint', blue, M(cx + 0.95, plinth + 1.0, fz + 0.06), false);
    }
    const vz = bz + bd / 2 + 1.5;
    for (let i = 0; i <= 8; i++) { const px = bx0 + 0.2 + i * (bx1 - bx0 - 0.4) / 8; b.add(box(0.32, H - 0.15, 0.32), 'plaster', 0xf2ede2, M(px, plinth + (H - 0.15) / 2, vz + 1.3)); b.add(box(0.4, 0.5, 0.4), 'paint', blue, M(px, plinth + 0.25, vz + 1.3), false); }
    b.add(box(bx1 - bx0 + 0.3, 0.25, 0.25), 'paint', blue, M((bx0 + bx1) / 2, plinth + H - 0.1, vz + 1.3));
    const roofW = bx1 - bx0 + 1.2, slope = 0.17;
    b.add(box(roofW, 0.05, bd + 3.8), 'tin', tinRed, M((bx0 + bx1) / 2, plinth + H + 0.55, bz + 1.4, 0, slope));
    
    for (const ex of [bx0 + 0.1, bx1 - 0.1]) b.add(profileZY([[bz - 3, 0], [bz + 3, 0], [bz + 3, 0.27], [bz - 3, 1.3]], 0.22), 'plaster', cream, M(ex, plinth + H, 0));
    b.add(box(3.4, 0.3, 0.45), 'concrete', 0xb0a998, M(-2, 0.15, bz + 6.42)); b.add(box(3.4, 0.15, 0.45), 'concrete', 0xb0a998, M(-2, 0.075, bz + 6.87));
    const mainT = signTex('schoolMain', 1024, 220, '#fbfaf5', [{ t: SCHOOL_SIGN, s: 92, c: '#1d3f8f', y: 0.38, w: '800' }, { t: 'विद्यालय · सर्लाही', s: 64, c: '#b3261e', y: 0.76, f: DEVA, w: '500' }], '#1d3f8f');
    P.sign(mainT, 6.4, 1.35, -2, plinth + H + 0.62, vz + 1.62, 0, 0x1d3f8f, 0.08, 0.9);
    /* L-wing: two classrooms and the office under a flat roof with a parapet */
    const wx = 13.4, wz0 = -27, wz1 = -11;
    b.add(box(5.4, plinth, wz1 - wz0), 'concrete', 0xb9b2a4, M(wx, plinth / 2, (wz0 + wz1) / 2));
    b.add(box(4.6, 3.2, wz1 - wz0), 'plaster', 0xeee3cb, M(wx + 0.3, plinth + 1.6, (wz0 + wz1) / 2)); b.add(box(4.7, 0.7, wz1 - wz0 + 0.1), 'paint', blue, M(wx + 0.3, plinth + 0.35, (wz0 + wz1) / 2), false);
    b.add(box(4.9, 0.6, wz1 - wz0 + 0.3), 'plaster', 0xeee3cb, M(wx + 0.3, plinth + 3.5, (wz0 + wz1) / 2)); b.add(box(4.95, 0.12, wz1 - wz0 + 0.35), 'paint', blue, M(wx + 0.3, plinth + 3.86, (wz0 + wz1) / 2), false);
    for (let i = 0; i < 4; i++) { const zz = wz0 + 2 + i * 4, fx = wx - 2.01; b.add(box(0.08, 2.1, 1.0), 'wood', green, M(fx, plinth + 1.05, zz - 0.8)); b.add(box(0.05, 1.2, 1.4), 'glass', 0x2a3540, M(fx, plinth + 1.65, zz + 0.9), false); for (let k = 0; k < 5; k++) b.add(box(0.04, 1.2, 0.025), 'steel', 0x2a2b2e, M(fx - 0.03, plinth + 1.65, zz + 0.35 + k * 0.27), false); }
    /* flag platform and pole */
    const fx = -2, fz = -20.5; b.add(box(2.2, 0.25, 2.2), 'concrete', 0xc4bdae, M(fx, 0.125, fz)); b.add(box(1.5, 0.25, 1.5), 'concrete', 0xc4bdae, M(fx, 0.375, fz)); b.add(box(0.8, 0.25, 0.8), 'concrete', 0xc4bdae, M(fx, 0.625, fz));
    b.add(cyl(0.045, 0.065, 7.2, 10), 'metal', 0xd8d6cf, M(fx, 4.35, fz)); b.add(cyl(0.08, 0.08, 0.12, 10), 'metal', 0xd8b23c, M(fx, 7.98, fz));
    const flag = nepalFlag(1.35); flag.position.set(fx + 0.05, 6.45, fz); flag.rotation.y = -0.4; P.add(flag); P.ups.push((t) => { (flag.userData.U as { uTime: { value: number } }).uTime.value = t; });
    /* hand pump on its slab, bicycles by the wall, mango trees for shade, a bell on the verandah, marigolds */
    const hp = [9.5, -9.5]; b.add(box(1.2, 0.12, 1.2), 'concrete', 0xa9a294, M(hp[0], 0.06, hp[1])); b.add(cyl(0.08, 0.1, 1.0, 10), 'paint', 0x2f6b4f, M(hp[0], 0.6, hp[1])); b.add(box(0.08, 0.08, 0.75), 'paint', 0x2f6b4f, M(hp[0], 1.1, hp[1] - 0.3, 0, 0.25)); b.add(cyl(0.035, 0.035, 0.35, 8), 'paint', 0x2f6b4f, M(hp[0], 0.95, hp[1] + 0.18, 0, Math.PI / 2 - 0.2));
    for (let i = 0; i < 6; i++) bicycle(b, bl, -15.8, 0, -9.5 - i * 0.75, Math.PI / 2 + 0.1, [0x1d1f24, 0x2f6fd4, 0xb3261e, 0x1d1f24, 0x3a7a3a, 0x1d1f24][i], 0.12);
    tree(b, bl, -11.5, 0, -14, 1.15, 'mango', 3); tree(b, bl, 20.5, 0, -4, 1.3, 'mango', 7); tree(b, bl, -21, 0, -20, 1.2, 'mango', 11); tree(b, bl, 21, 0, -28, 1.0, 'broad', 13);
    shrub(b, -15.5, 0, -33, 1.2); shrub(b, 15.6, 0, -33.5, 1.1); for (let i = 0; i < 7; i++) pot(b, -9 + i * 2.2, plinth, vz + 2.6, 0.9, i % 2 ? 0xf29a1a : 0xf2c230);
    b.add(cyl(0.15, 0.2, 0.3, 12), 'metal', 0x6d5a3a, M(7.8, plinth + H - 0.6, vz + 1.0)); b.add(box(0.04, 0.4, 0.04), 'steel', 0x2a2b2e, M(7.8, plinth + H - 0.3, vz + 1.0));
    /* a blackboard notice on the verandah wall */
    const nb = canvasTex('schoolNotice', 512, 320, (g, w, h) => { g.fillStyle = '#23352b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6a44'; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = 'rgba(240,240,232,.85)'; g.font = `500 40px ${DEVA}`; g.textAlign = 'center'; g.fillText('सूचना', w / 2, 80); g.font = '500 30px Inter, sans-serif'; ['Class 10 · SEE prep 7 AM', 'Science fair · Friday', 'Clean campus, green campus'].forEach((l, i) => g.fillText(l, w / 2, 140 + i * 52)); });
    P.sign(nb, 1.8, 1.1, 5.2, plinth + 1.7, bz + bd / 2 + 0.06, 0, 0x5a4026, 0.05);
    /* morning assembly: class lines facing the flag (shortest in front), the headmaster on the platform, two teachers to the side */
    const boys: { x: number; z: number; yaw: number; s: number }[] = [], girls: typeof boys = [];
    for (let c = 0; c < 6; c++) for (let r = 0; r < 6; r++) { const x = -8.6 + c * 2.0 + (h2(c, r) - 0.5) * 0.1, z = -11.2 - r * 0.95, s = 0.86 + c * 0.035 + (h2(r, c) - 0.5) * 0.05; (c % 2 ? girls : boys).push({ x, z, yaw: Math.PI + (h2(c * 7, r) - 0.5) * 0.12, s }); }
    P.crowd({ teen: true, height: 1.5, outfit: CROWD.schoolBoy, pose: 'attn' }, boys, { sway: 0.6, look: 0.4 }, 0.6);
    P.crowd({ teen: true, female: true, height: 1.45, hairStyle: 'braid', outfit: CROWD.schoolGirl, pose: 'attn' }, girls, { sway: 0.6, look: 0.4 }, 0.6);
    P.crowd({ height: 1.7, outfit: CROWD.formal, pose: 'talk' }, [{ x: fx + 0.2, z: fz + 0.5, y: 0.75, yaw: 0.1, top: '#e8e4da', low: '#3a3f48' }]);
    P.crowd({ female: true, height: 1.56, hairStyle: 'bun', outfit: CROWD.sari, pose: 'clasp' }, [{ x: -10.8, z: -16.5, yaw: Math.PI / 2 + 0.3, top: '#7a1f3d' }], { look: 0.8 });
    P.crowd({ height: 1.68, outfit: CROWD.sweater, pose: 'clasp' }, [{ x: 4.6, z: -17.5, yaw: -Math.PI / 2 - 0.2, top: '#6b5a48', low: '#3a3f48' }], { look: 0.8 });
    const stand = V3(-0.9, 0, -9.4); P.props.cert = certificate('SCHOOL LEAVING CERTIFICATE', 'Sarlahi');
    return P.finish({
      stand: stand.toArray() as [number, number, number], yaw: 0.3, act: 'cert', outfit: 'school', bubbleSide: 'right',
      path: [[-1, -1], [-1, -6.5]], camera: [1.4, 1.72, -2.2], lookAt: [-2.4, 2.1, -16], cameraPortrait: [0.6, 1.7, -3.6],
      focus: [-2, 6.4, fz], plot: { x: 0, z: -21, rx: 19, rz: 16 },
    });
  },
};
export { plane, rbox };
