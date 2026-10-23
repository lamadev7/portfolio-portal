import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, sphere } from '../kit';
import { signTex, h2 } from '../textures';
import { rock, prayerFlags } from '../props';
import type { SceneModule, SceneCtx } from '../types';

/* NEXT · a viewpoint high on the trail: a rocky knoll with old snow in the hollows, a mani-stone cairn, a prayer-flag mast with strings
   running down to the rocks, a wooden signpost. He stands on the top rock in trekking gear and looks toward Everest. */
export const everest: SceneModule = {
  id: 'everest', title: 'Everest view',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'everest'), b = P.b;
    P.ground(-14, -26, 14, -5, 'snow', 0xe9edf2);
    /* the knoll: a heap of boulders with a flat-topped stone to stand on */
    const kx = 0.5, kz = -11.5;
    for (let i = 0; i < 26; i++) { const a = h2(i, 1) * 6.283, r = 1.2 + h2(i, 2) * 4.2, s = 0.5 + h2(i, 3) * 1.1 * (1 - r / 7); rock(b, kx + Math.cos(a) * r, -0.15, kz + Math.sin(a) * r * 0.8, s, 100 + i, 0xb3aea4); }
    rock(b, kx, -0.2, kz, 1.25, 7, 0xaaa59b); b.add(box(1.4, 0.2, 1.2), 'rock', 0xa8a399, M(kx, 0.62, kz, 0.3));
    P.floorBox(kx - 0.75, kz - 0.65, kx + 0.75, kz + 0.65, 0.72); P.floorBox(kx - 0.75, kz + 0.65, kx + 0.75, kz + 2.4, 0.72, '-z');
    for (let i = 0; i < 40; i++) { const x = (h2(i, 11) - 0.5) * 26, z = -6 - h2(i, 12) * 19; if (Math.hypot(x - kx, z - kz) < 2.5) continue; rock(b, x, -0.1, z, 0.15 + h2(i, 13) * 0.45, 200 + i, 0xb8b3a9); }
    for (let i = 0; i < 14; i++) { const g = sphere(1, 12, 6); g.scale(1.2 + h2(i, 21) * 2.4, 0.08, 0.8 + h2(i, 22) * 1.6); b.add(g, 'snow', 0xf4f6fa, M((h2(i, 23) - 0.5) * 24, 0.03, -7 - h2(i, 24) * 18, h2(i, 25) * 3), false); }
    /* cairn of mani stones */
    const cx = -3.2, cz = -10.2; for (let i = 0; i < 9; i++) { const s = 0.55 - i * 0.05, g = sphere(1, 10, 6); g.scale(s, 0.13, s * 0.85); b.add(g, 'rock', i % 3 ? 0x8c8880 : 0x7a7670, M(cx + (h2(i, 31) - 0.5) * 0.08, 0.1 + i * 0.2, cz, h2(i, 32) * 3)); }
    /* prayer-flag mast with three strings */
    const mast = V3(-1.8, 0, -17.5); b.add(cyl(0.05, 0.07, 5.2, 8), 'wood', 0x6b4a30, M(mast.x, 2.6, mast.z)); b.add(sphere(0.12, 8, 6), 'paint', 0xd9a93a, M(mast.x, 5.25, mast.z));
    for (const [tx, tz, sag] of [[6.5, -14.0, 0.6], [4.0, -22.5, 0.5], [-8.5, -14.5, 0.6]] as const) { const pf = prayerFlags(V3(mast.x, 5.0, mast.z), V3(tx, 0.6, tz), sag); P.add(pf); P.ups.push((t) => { (pf.userData.U as { uTime: { value: number } }).uTime.value = t; }); b.add(box(0.3, 0.6, 0.3), 'rock', 0x8a8780, M(tx, 0.3, tz)); }
    /* signpost */
    b.add(cyl(0.06, 0.07, 2.2, 8), 'wood', 0x5a3a24, M(4.2, 1.1, -12.6));
    P.sign(signTex('evSign', 768, 220, '#6b4a30', [{ t: 'EVEREST VIEW', s: 78, c: '#f6efe2', y: 0.38, w: '800' }, { t: '8,848.86 m', s: 54, c: '#f4d58d', y: 0.76, w: '700' }], '#3a2416'), 1.4, 0.4, 4.2, 1.95, -12.52, -0.4, 0x3a2416, 0.05); P.frameBox(4.2, 1.6, -12.5, 1.6, 1.4);
    const stand = V3(kx, 0.72, kz);
    return P.finish({
      stand: stand.toArray() as [number, number, number], yaw: Math.PI - 0.5, act: 'gaze', outfit: 'trek', bubbleSide: 'right',
      path: [[0.5, -1], [0.5, -6], [kx, kz + 2.2]], camera: [3.0, 1.95, -5.0], lookAt: [-1.6, 5.8, -40], cameraPortrait: [2.4, 1.9, -6.0],
      focus: [-80, 260, -1400], plot: { x: 0, z: -15, rx: 15, rz: 11 },
    });
  },
};
