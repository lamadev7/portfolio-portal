import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, rbox } from '../kit';
import { signTex } from '../textures';
import { tree, shrub, scooter } from '../props';
import { CROWD } from '../crowd';
import type { SceneModule, SceneCtx } from '../types';

/* FEB 2021 · Herald College Kathmandu: a modern glass-and-concrete block with lime-green fins and portal, lime-green pillars in the lobby
   behind the glass, the name on the parapet and on a monument wall by the gate, a paved forecourt with planters and benches, students
   with laptops, scooters lined up at the side. */
export const herald: SceneModule = {
  id: 'herald', title: 'Herald College Kathmandu',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'herald'), b = P.b, bl = P.bl, lime = 0x8cc63f, conc = 0xd9d7d1, dark = 0x2a2d33;
    P.ground(-21, -40, 21, -6, 'paver', 0xc2c0bb); P.ground(-2, -6, 3, -1.5, 'concrete', 0xb9b6ae, 0.025);
    /* front edge: a long planter with a clipped hedge, open at the walkway */
    for (const [x0, x1] of [[-21, -2.2], [10.2, 21]]) { const c = (x0 + x1) / 2, l = x1 - x0; b.add(box(l, 0.55, 1.1), 'concrete', 0xbdbab3, M(c, 0.275, -6.6)); const hg = box(l - 0.2, 0.55, 0.85); b.add(hg, 'grass', 0x4c6a2c, M(c, 0.8, -6.6)); }
    /* the block: concrete slab bands, a glass curtain wall with mullions, lime fins */
    const bw = 28, bd = 12, bz = -33, fl = 5, fh = 3.6, H = fl * fh, fz = bz + bd / 2;
    b.add(box(bw, H, bd), 'concrete', conc, M(-1, H / 2, bz));
    for (let f = 0; f < fl; f++) { const y = f * fh; b.add(box(bw + 0.4, 0.55, 0.6), 'concrete', 0xe4e2dc, M(-1, y + fh - 0.27, fz + 0.2));
      if (f > 0) { b.add(box(bw - 0.4, fh - 0.55, 0.05), 'glassTint', 0x2f4650, M(-1, y + (fh - 0.55) / 2, fz + 0.03), false); for (let i = 0; i <= 18; i++) b.add(box(0.06, fh - 0.55, 0.12), 'metal', 0x9aa0a6, M(-1 - (bw - 0.4) / 2 + i * (bw - 0.4) / 18, y + (fh - 0.55) / 2, fz + 0.08), false); b.add(box(bw - 0.4, 0.05, 0.1), 'metal', 0x9aa0a6, M(-1, y + 1.1, fz + 0.08), false); } }
    for (let i = 0; i < 7; i++) { const x = -13.5 + i * 4.2; if (i === 3) continue; b.add(box(0.35, H + 0.6, 0.9), 'paint', lime, M(x, (H + 0.6) / 2, fz + 0.55)); }
    /* ground floor: see-through glass into a lobby with lime pillars, a reception desk and people */
    const lobbyGlass = new THREE.Mesh(box(bw - 0.4, fh - 0.55, 0.04), new THREE.MeshStandardMaterial({ color: 0x9fb6bf, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false })); lobbyGlass.position.set(-1, (fh - 0.55) / 2, fz + 0.04); P.add(lobbyGlass);
    b.add(box(bw - 0.6, fh - 0.55, 0.1), 'concrete', 0xf0efe9, M(-1, (fh - 0.55) / 2, fz - 5)); b.add(box(bw - 0.6, 0.06, 5.2), 'concrete', 0xe8e6e0, M(-1, 0.03, fz - 2.5), false);
    for (let i = 0; i < 6; i++) b.add(cyl(0.28, 0.28, fh - 0.55, 16), 'paint', lime, M(-12 + i * 4.4, (fh - 0.55) / 2, fz - 2.2));
    b.add(rbox(3.2, 1.05, 0.8, 0.08), 'wood', 0xe6e3dc, M(4.5, 0.53, fz - 3.6));
    P.crowd({ height: 1.65, female: true, hairStyle: 'bun', outfit: CROWD.formal, pose: 'talk' }, [{ x: 4.4, z: fz - 4.3, yaw: 0, top: '#2a3a5a' }], { look: 0.6 }, 0);
    P.crowd({ height: 1.72, outfit: CROWD.casualPack, pose: 'walk' }, [{ x: -6, z: fz - 1.6, yaw: 1.4, top: '#3a4250' }, { x: -9.5, z: fz - 2.8, yaw: -1.6, top: '#7a3a2a' }], { look: 0.4 }, 0);
    /* entrance: a lime portal, glass doors, a canopy, steps */
    b.add(box(7.0, 4.2, 1.0), 'paint', lime, M(-1, 2.1, fz + 1.0)); b.add(box(6.0, 3.6, 1.2), 'concrete', 0x2b3036, M(-1, 1.8, fz + 1.0)); b.add(box(5.8, 3.3, 0.05), 'glassTint', 0x2f4650, M(-1, 1.65, fz + 1.55), false); b.add(box(0.06, 3.3, 0.08), 'metal', 0x9aa0a6, M(-1, 1.65, fz + 1.6), false);
    b.add(box(9.0, 0.35, 4.0), 'concrete', 0xeceae4, M(-1, 4.4, fz + 2.6)); for (const s of [-1, 1]) b.add(cyl(0.1, 0.1, 4.2, 10), 'metal', 0xc9ccd2, M(-1 + s * 4.1, 2.1, fz + 4.3));
    b.add(box(8.0, 0.18, 1.0), 'concrete', 0xcfccc5, M(-1, 0.09, fz + 2.2)); b.add(box(8.0, 0.36, 0.6), 'concrete', 0xcfccc5, M(-1, 0.18, fz + 1.6));
    /* parapet and the name */
    b.add(box(bw + 0.5, 1.2, bd + 0.5), 'concrete', 0xe4e2dc, M(-1, H + 0.6, bz));
    P.sign(signTex('heraldTop', 1024, 120, '#ffffff', [{ t: 'HERALD COLLEGE KATHMANDU', s: 78, c: '#3f8a2f', y: 0.55, w: '800' }]), 17, 2.0, -1, H + 2.3, fz - 0.4, 0, 0xf2f2f0, 0.15, 1.2);
    /* monument wall by the walkway */
    b.add(box(4.6, 1.3, 0.6), 'concrete', 0x5b6068, M(6.2, 0.65, -9.3)); b.add(box(4.7, 0.12, 0.7), 'paint', lime, M(6.2, 1.36, -9.3));
    P.sign(signTex('heraldWall', 1024, 220, '#f7f7f4', [{ t: 'HERALD COLLEGE', s: 96, c: '#2f7a28', y: 0.4, w: '800' }, { t: 'K A T H M A N D U', s: 48, c: '#4a4f57', y: 0.78, w: '700' }]), 4.1, 0.85, 6.2, 0.68, -8.99, 0, 0x5b6068, 0.02); P.frameBox(6.2, 0.7, -9.0, 4.7, 1.4);
    /* forecourt: planters with trees, benches with students on laptops, groups talking */
    [[-12, -15], [-12, -22], [9, -15], [15, -22], [-17.5, -11], [16.5, -10.5]].forEach(([x, z], i) => { b.add(box(2.4, 0.55, 2.4), 'concrete', 0xbdbab3, M(x, 0.275, z)); b.add(box(2.2, 0.06, 2.2), 'dirt', 0x6b5a44, M(x, 0.55, z), false); tree(b, bl, x, 0.55, z, 0.62, 'fine', 31 + i); });
    shrub(b, -4.2, 0, -26.2, 1.0); shrub(b, 2.2, 0, -26.2, 1.0);
    const bench = (x: number, z: number, yaw: number) => { b.push(M(x, 0, z, yaw)); b.add(box(2.0, 0.08, 0.5), 'wood', 0x9a7450, M(0, 0.45, 0)); b.add(box(2.0, 0.08, 0.06), 'wood', 0x9a7450, M(0, 0.8, -0.24)); for (const s of [-1, 1]) b.add(box(0.06, 0.45, 0.45), 'steel', dark, M(s * 0.85, 0.22, 0), false); b.pop(); bl.add(x, 0, z, 2.4, 1.0, yaw); };
    bench(-7.5, -17.5, 0.3); bench(-3.5, -19, 0); bench(10.5, -19.5, -0.3);
    P.crowd({ height: 1.72, outfit: CROWD.casual, pose: 'type' }, [{ x: -7.9, z: -17.6, yaw: 0.3, top: '#2b3445' }, { x: -3.0, z: -19.0, yaw: 0, top: '#e8e2d6' }], { type: 1, sway: 0 }, 0);
    P.crowd({ height: 1.58, female: true, hairStyle: 'long', outfit: { ...CROWD.casual, low: 'jeans' }, pose: 'listen' }, [{ x: -7.0, z: -17.4, yaw: 0.2, top: '#c94f6d' }, { x: 10.9, z: -19.6, yaw: -0.3, top: '#3c7a6a' }], { look: 1 }, 0);
    for (const [x, z, y] of [[-7.9, -17.35, 0.3], [-3.0, -18.75, 0]] as const) b.add(rbox(0.33, 0.015, 0.23, 0.005), 'metal', 0xb0b6be, M(x + Math.sin(y) * 0.28, 0.72, z + Math.cos(y) * 0.28, y), false);
    P.crowd({ height: 1.72, outfit: CROWD.casualPack, pose: 'laptop' }, [{ x: 3.4, z: -22.5, yaw: -2.6, top: '#5c6470' }, { x: -10.5, z: -23.5, yaw: 2.4, top: '#2f4a3a' }], { look: 0.5 });
    P.crowd({ height: 1.7, outfit: CROWD.casualPack, pose: 'talk' }, [{ x: 4.6, z: -23.4, yaw: -0.9, top: '#2b3445' }, { x: -9.4, z: -24.3, yaw: 2.0, top: '#8a5a3a' }], { look: 0.8 });
    P.crowd({ height: 1.6, female: true, hairStyle: 'long', outfit: CROWD.casualPack, pose: 'phone' }, [{ x: 2.6, z: -23.6, yaw: 0.8, top: '#e8e2d6' }], { look: 0.3 });
    for (let i = 0; i < 7; i++) scooter(b, bl, 13 + (i % 4) * 1.05, 0, -13.5 - Math.floor(i / 4) * 2.4, Math.PI / 2 + 0.2, [0xc8302a, 0xe9e6df, 0x2b3140, 0x2f6fd4, 0x8cc63f, 0x1d1f24, 0xb3261e][i]);
    const stand = V3(2.1, 0, -10.4);
    return P.finish({
      stand: stand.toArray() as [number, number, number], yaw: 0.1, act: 'point', outfit: 'college', bubbleSide: 'left',
      path: [[0.5, -1], [0.5, -7.4]], camera: [0.9, 1.8, -2.6], lookAt: [-1.5, 5.2, -26], cameraPortrait: [1.0, 1.75, -4.6],
      focus: [-1, H + 2.3, fz], plot: { x: 0, z: -23, rx: 22, rz: 17 },
    });
  },
};
