import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, rbox } from '../kit';
import { canvasTex, signTex } from '../textures';
import { officeChair, woodChair, table, pot, tree } from '../props';
import { CROWD } from '../crowd';
import { codeTex } from './princelab';
import type { SceneModule, SceneCtx } from '../types';

/* AUG 2025 → APR 2026 · final-year project supervision: a ground-floor lab at Herald with its glass front open to the courtyard. Rows of
   desks with monitors and students at work, a team presenting their architecture on the projector, a whiteboard of the agent loop, and
   him at the review table with notes, turned toward the team. */
export const fyp: SceneModule = {
  id: 'fyp', title: 'Final Year Project Supervisor',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'fyp'), b = P.b, bl = P.bl, lime = 0x8cc63f, fy = 0.25;
    P.ground(-15, -32, 15, -6, 'paver', 0xc2c0bb); P.strip(0, -1, 0, -9, 2.2, 'paver', 0xc9c6bf);
    const W = 16, D = 9.5, cz = -18.5, front = cz + D / 2, H = 3.4;
    b.add(box(W + 0.6, fy, D + 0.6), 'concrete', 0xbdbab3, M(0, fy / 2, cz));
    b.add(box(0.3, H, D), 'plasterIn', 0xf2f3ef, M(-W / 2, fy + H / 2, cz)); b.add(box(0.3, H, D), 'plasterIn', 0xf2f3ef, M(W / 2, fy + H / 2, cz)); b.add(box(W, H, 0.3), 'plasterIn', 0xf2f3ef, M(0, fy + H / 2, cz - D / 2));
    b.add(box(W + 0.6, 0.35, D + 0.6), 'concrete', 0xe4e2dc, M(0, fy + H + 0.17, cz)); b.add(box(W + 0.6, 4.2, D + 0.6), 'concrete', 0xd9d7d1, M(0, fy + H + 0.35 + 2.1, cz)); b.add(box(W + 0.4, 2.6, 0.05), 'glass', 0x3a5560, M(0, fy + H + 2.4, front + 0.32), false);
    for (const x of [-W / 2 - 0.1, -2.6, 2.6, W / 2 + 0.1]) b.add(box(0.4, H + 4.6, 0.7), 'paint', lime, M(x, (H + 4.6) / 2, front + 0.3));
    b.add(box(W - 0.3, 0.04, D - 0.3), 'concreteIn', 0xd9d6cf, M(0, fy + 0.02, cz), false); b.add(box(W - 0.3, 0.02, D - 0.3), 'plasterIn', 0xf6f6f3, M(0, fy + H - 0.01, cz), false);
    for (const x of [-4.2, 3.2]) b.add(box(0.6, H, 0.4), 'paint', lime, M(x, fy + H / 2, cz - D / 2 + 0.35));
    P.sign(signTex('fypSign', 1024, 128, '#ffffff', [{ t: 'HERALD COLLEGE KATHMANDU · FYP LAB', s: 58, c: '#3f8a2f', y: 0.55, w: '800' }]), 8, 1.0, 0, fy + H + 1.3, front + 0.68, 0, 0xf2f2f0, 0.06); P.frameBox(0, fy + H + 1.3, front + 0.68, 8.4, 1.3);
    const gm = new THREE.MeshStandardMaterial({ color: 0xa8c0cc, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.3, depthWrite: false });
    for (const x of [-W / 2 + 1.2, W / 2 - 1.2]) { const g = new THREE.Mesh(box(2.2, H - 0.2, 0.03), gm); g.position.set(x, fy + (H - 0.2) / 2, front - 0.05); P.add(g); }
    b.add(box(W, 0.12, 0.15), 'metal', 0x6d7278, M(0, fy + H - 0.1, front - 0.05), false);
    P.floorBox(-W / 2, cz - D / 2, W / 2, front + 0.4, fy);
    /* projector screen and whiteboard on the back wall */
    const slide = canvasTex('fypSlide', 1280, 720, (g, w, h) => { g.fillStyle = '#0f1a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#8cc63f'; g.fillRect(0, 0, 18, h); g.fillStyle = '#ffffff'; g.font = '800 64px Inter, sans-serif'; g.textBaseline = 'middle'; g.fillText('Blockchain Voting · Architecture', 60, 90); g.fillStyle = '#98b9fb'; g.font = '600 34px Inter, sans-serif'; g.fillText('Final year project · supervisor review', 60, 160);
      [['Voter app', 80], ['API + auth', 470], ['Smart contract', 860]].forEach(([t, x]) => { g.strokeStyle = '#dbe2eb'; g.lineWidth = 5; g.strokeRect(+x, 300, 330, 150); g.fillStyle = '#dbe2eb'; g.font = '600 40px Inter, sans-serif'; g.fillText(String(t), +x + 30, 375); }); g.fillStyle = '#f4b961'; g.fillRect(410, 372, 60, 8); g.fillRect(800, 372, 60, 8); g.fillStyle = '#6b7a90'; g.font = '500 30px Inter, sans-serif'; g.fillText('tamper-proof tallies · verified voters · audit log', 60, 600); });
    b.add(box(3.4, 2.0, 0.06), 'paint', 0x1d1f24, M(-6.0, fy + 1.9, cz - D / 2 + 0.2)); P.screen(slide, 3.3, 1.86, -6.0, fy + 1.9, cz - D / 2 + 0.24, 0, 1.0);
    const wb = canvasTex('fypWB', 1024, 560, (g, w, h) => { g.fillStyle = '#f7f8f4'; g.fillRect(0, 0, w, h); g.lineWidth = 6; g.lineCap = 'round'; g.font = '700 46px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const bx = (x: number, y: number, t: string, c: string) => { g.strokeStyle = c; g.strokeRect(x - 110, y - 50, 220, 100); g.fillStyle = c; g.fillText(t, x, y); }; bx(180, 130, 'plan', '#2a5bd7'); bx(512, 130, 'tools', '#2a5bd7'); bx(844, 130, 'check', '#2a5bd7'); g.strokeStyle = '#d23b2f'; g.beginPath(); g.moveTo(290, 130); g.lineTo(400, 130); g.moveTo(622, 130); g.lineTo(732, 130); g.moveTo(844, 185); g.quadraticCurveTo(512, 400, 180, 185); g.stroke(); g.fillStyle = '#1d1d1d'; g.font = '600 40px Inter, sans-serif'; g.fillText('agent loop · data model · tests', w / 2, 460); });
    b.add(box(3.0, 1.6, 0.05), 'metal', 0xb9c0c8, M(0.2, fy + 1.75, cz - D / 2 + 0.18)); const wbm = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 1.48), new THREE.MeshStandardMaterial({ map: wb, roughness: 0.4, emissive: 0xffffff, emissiveMap: wb, emissiveIntensity: 0.18 })); wbm.position.set(0.2, fy + 1.75, cz - D / 2 + 0.21); P.add(wbm);
    /* student desks with monitors along the right; students at work */
    const mon = codeTex('fypCode', [[['// fyp/api/routes.ts', '#6b7a90']], [['router', '#dbe2eb'], ['.post', '#98b9fb'], ["('/vote', ", '#dbe2eb'], ['auth', '#f4b961'], [', ', '#dbe2eb'], ['cast', '#98b9fb'], [')', '#dbe2eb']], [['const ', '#c792ea'], ['tx ', '#dbe2eb'], ['= await ', '#c792ea'], ['contract', '#dbe2eb'], ['.vote', '#98b9fb'], ['(id)', '#dbe2eb']]], 'routes.ts');
    const studs: { x: number; z: number; yaw: number; top: string }[] = [];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) { const x = 4.1 + i * 1.5, z = cz - 2.2 + r * 2.3; b.add(box(1.3, 0.04, 0.7), 'woodIn', 0xd8c2a0, M(x, fy + 0.74, z)); b.add(box(1.2, 0.7, 0.04), 'paintIn', 0x2e3440, M(x, fy + 0.37, z - 0.33), false); b.add(rbox(0.56, 0.34, 0.03, 0.01), 'plastic', 0x15161a, M(x, fy + 1.06, z - 0.22)); P.screen(mon, 0.52, 0.3, x, fy + 1.06, z - 0.2, 0, 0.9); officeChair(b, bl, x, fy, z + 0.55, Math.PI, 0x2a2d33); if (!(r === 1 && i === 0)) studs.push({ x, z: z + 0.6, yaw: Math.PI, top: ['#2b3445', '#e8e2d6', '#c94f6d', '#3c7a6a', '#7a3a2a', '#5c6470'][r * 3 + i] }); }
    P.crowd({ height: 1.72, outfit: CROWD.casual, pose: 'type' }, studs.map((s) => ({ ...s, y: fy })), { type: 1, sway: 0, look: 0.3 }, 0);
    /* the presenting team at the screen, and the review table */
    P.crowd({ height: 1.72, outfit: CROWD.casualPack, pose: 'present' }, [{ x: -4.0, z: cz - 2.4, y: fy, yaw: 1.5, top: '#2b3445' }], { look: 0 }, 0);
    P.crowd({ height: 1.6, female: true, hairStyle: 'long', outfit: CROWD.casual, pose: 'laptop' }, [{ x: -5.2, z: cz - 1.8, y: fy, yaw: 1.0, top: '#c94f6d' }], { look: 0.4 }, 0);
    P.crowd({ height: 1.7, outfit: CROWD.casual, pose: 'clasp' }, [{ x: -6.3, z: cz - 2.2, y: fy, yaw: 1.1, top: '#3c7a6a' }], { look: 0.6 }, 0);
    const sy = -1.85, seat = V3(2.0, fy, cz + 1.0), tfx = Math.sin(sy), tfz = Math.cos(sy);
    table(b, bl, seat.x + tfx * 0.78, fy, seat.z + tfz * 0.78, 2.2, 0.9, sy, { top: 0xc79a5e }); b.add(rbox(0.31, 0.012, 0.22, 0.004), 'metal', 0xb0b6be, M(seat.x + tfx * 0.6 - tfz * 0.5, fy + 0.77, seat.z + tfz * 0.6 + tfx * 0.5, sy + 0.3), false); b.add(box(0.21, 0.004, 0.29), 'paint', 0xf6f3ea, M(seat.x + tfx * 0.62 + tfz * 0.3, fy + 0.765, seat.z + tfz * 0.62 - tfx * 0.3, sy - 0.2), false);
    woodChair(b, bl, seat.x, fy, seat.z, sy, 0x6b4a30);
    pot(b, -7.2, fy, front - 0.8, 1.2); pot(b, 7.2, fy, front - 0.8, 1.2, 0xf29a1a); tree(b, bl, -12.5, 0, -12, 0.9, 'fine', 71); tree(b, bl, 12.5, 0, -11, 0.95, 'fine', 73);
    return P.finish({
      stand: seat.toArray() as [number, number, number], yaw: sy, seat: 0.47, act: 'sit', outfit: 'smart', bubbleSide: 'right',
      path: [[0, -1], [0, -8.5], [0.4, front + 1.0]], camera: [-1.0, 1.75, -8.6], lookAt: [0.6, 1.45, -20.5], cameraPortrait: [-0.4, 1.7, -10.8],
      focus: [-5.2, fy + 1.6, cz - 2.2], plot: { x: 0, z: -19, rx: 15, rz: 13 },
    });
  },
};
export { cyl };
