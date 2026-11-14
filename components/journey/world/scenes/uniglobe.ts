import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, sphere } from '../kit';
import { signTex, canvasTex, h2 } from '../textures';
import { tree, scooter, bus, pole, wires, hoop, goal, building, pot } from '../props';
import { CROWD } from '../crowd';
import type { SceneModule, SceneCtx } from '../types';

/* 2019 · Uniglobe SS / College, Kamaladi: a five-storey plastered block with brick piers and maroon bands, the name on the parapet, a
   gated compound off a busy street, the futsal and basketball court with a game on, the yellow college bus, scooters by the wall,
   neighbouring buildings and the cable-strung poles of central Kathmandu. */
export const uniglobe: SceneModule = {
  id: 'uniglobe', title: 'Uniglobe SS / College · Kamaladi',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'uniglobe'), b = P.b, bl = P.bl, cream = 0xe6dcc8, maroon = 0x7d2a22;
    P.ground(-22, -38, 22, -6, 'paver', 0xbfb7aa); P.ground(-1.2, -6, 4.2, -1.5, 'concrete', 0xb5b0a6, 0.025);
    /* compound wall with railings and a gate whose arch carries the name */
    const wall = (x0: number, x1: number) => { const l = x1 - x0, c = (x0 + x1) / 2; b.add(box(l, 1.1, 0.25), 'plaster', cream, M(c, 0.55, -6)); b.add(box(l + 0.04, 0.12, 0.32), 'paint', maroon, M(c, 1.16, -6)); for (let x = x0 + 0.1; x < x1; x += 0.16) b.add(box(0.025, 0.9, 0.025), 'steel', 0x2a2b2e, M(x, 1.65, -6), false); b.add(box(l, 0.05, 0.05), 'steel', 0x2a2b2e, M(c, 2.1, -6), false); for (let x = x0; x <= x1; x += 2.8) b.add(box(0.4, 2.3, 0.4), 'plaster', cream, M(x, 1.15, -6)); };
    wall(-22, -1.4); wall(4.4, 22);
    for (const gx of [-1.4, 4.4]) { b.add(box(0.7, 4.0, 0.7), 'brick', 0xffffff, M(gx, 2.0, -6)); b.add(box(0.85, 0.2, 0.85), 'paint', maroon, M(gx, 4.1, -6)); }
    b.add(box(6.6, 0.9, 0.5), 'paint', maroon, M(1.5, 4.55, -6));
    P.sign(signTex('ugGate', 1024, 140, '#7d2a22', [{ t: 'UNIGLOBE SS / COLLEGE', s: 78, c: '#ffffff', y: 0.42, w: '800' }, { t: 'KAMALADI · KATHMANDU', s: 34, c: '#f4d58d', y: 0.82, w: '600' }]), 6.2, 0.85, 1.5, 4.55, -5.74, 0, maroon, 0.02); P.frameBox(1.5, 4.55, -5.74, 6.6, 1.1);
    /* main block */
    const bw = 26, bd = 10, bz = -31, floors = 5, fh = 3.2, H = floors * fh;
    b.add(box(bw, H, bd), 'plaster', cream, M(-1, H / 2, bz));
    for (let f = 0; f < floors; f++) { const y = f * fh; b.add(box(bw + 0.1, 0.34, bd + 0.1), 'paint', maroon, M(-1, y + fh - 0.17, bz), false);
      for (let i = 0; i < 8; i++) { const wx = -1 - bw / 2 + 1.6 + i * 3.25; if (f === 0 && (i === 3 || i === 4)) continue; b.add(box(2.3, 1.7, 0.06), 'glass', 0x2c3a48, M(wx, y + 1.55, bz + bd / 2 + 0.02), false); b.add(box(2.45, 0.12, 0.2), 'concrete', 0xd6cfc2, M(wx, y + 0.66, bz + bd / 2 + 0.08), false); b.add(box(0.05, 1.7, 0.08), 'steel', 0xc9ccd2, M(wx, y + 1.55, bz + bd / 2 + 0.05), false); } }
    for (let i = 0; i < 9; i++) b.add(box(0.6, H, 0.45), 'brick', 0xffffff, M(-1 - bw / 2 + 0.3 + i * 3.18, H / 2, bz + bd / 2 + 0.2));
    b.add(box(5.6, 3.0, 0.08), 'glass', 0x2c3a48, M(-1, 1.5, bz + bd / 2 + 0.03), false); b.add(box(7.0, 0.3, 2.6), 'concrete', 0xd6cfc2, M(-1, 3.0, bz + bd / 2 + 1.3)); for (const s of [-1, 1]) b.add(cyl(0.12, 0.12, 2.9, 10), 'metal', 0xc9ccd2, M(-1 + s * 3.2, 1.45, bz + bd / 2 + 2.4));
    b.add(box(7.4, 0.25, 1.6), 'concrete', 0xc9c2b5, M(-1, 0.125, bz + bd / 2 + 1.1));
    b.add(box(bw + 0.2, 1.0, bd + 0.2), 'plaster', cream, M(-1, H + 0.5, bz)); b.add(box(bw + 0.3, 0.14, bd + 0.3), 'paint', maroon, M(-1, H + 1.05, bz), false);
    P.sign(signTex('ugTop', 1024, 150, '#13306b', [{ t: 'UNIGLOBE SS / COLLEGE', s: 84, c: '#ffffff', y: 0.42, w: '800' }, { t: '+2 · MANAGEMENT · SCIENCE · LAW', s: 34, c: '#f4b961', y: 0.82, w: '600' }]), 15, 2.2, -1, H + 2.6, bz + bd / 2 - 0.2, 0, 0x13306b, 0.15, 1.6);
    b.add(cyl(0.6, 0.6, 1.3, 16), 'plastic', 0x1a1b1e, M(8, H + 1.65, bz - 2)); b.add(cyl(0.6, 0.6, 1.3, 16), 'plastic', 0x1a1b1e, M(9.4, H + 1.65, bz - 2));
    /* the court: futsal turf with basketball hoops, chain-link fence on posts */
    const cx = -11, cz = -15.5, cw = 16, cd = 10;
    const courtT = canvasTex('ugCourt', 1024, 640, (g, w, h) => { g.fillStyle = '#2f7a4c'; g.fillRect(0, 0, w, h); for (let q = 0; q < 14; q++) { g.fillStyle = q % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'; g.fillRect(q * w / 14, 0, w / 14, h); } for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${(0.04 * h2(i, 3)).toFixed(3)})`; g.fillRect(h2(i, 1) * w, h2(i, 2) * h, 2, 2); }
      g.strokeStyle = '#f2f0e8'; g.lineWidth = 6; g.strokeRect(20, 20, w - 40, h - 40); g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h - 20); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 70, 0, 6.283); g.stroke(); for (const x of [20, w - 20]) { g.beginPath(); g.arc(x, h / 2, 170, x < w / 2 ? -Math.PI / 2 : Math.PI / 2, x < w / 2 ? Math.PI / 2 : Math.PI * 1.5); g.stroke(); }
      g.strokeStyle = '#f2b705'; g.lineWidth = 5; g.strokeRect(20, h / 2 - 76, 160, 152); g.strokeRect(w - 180, h / 2 - 76, 160, 152); });
    const court = new THREE.Mesh(new THREE.PlaneGeometry(cw, cd), new THREE.MeshStandardMaterial({ map: courtT, roughness: 0.85 })); court.rotation.x = -Math.PI / 2; court.position.set(cx, 0.04, cz); court.receiveShadow = true; P.add(court);
    const fenceT = canvasTex('chain', 128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(70,74,80,0.95)'; g.lineWidth = 2.2; for (let q = -w; q <= w * 2; q += 16) { g.beginPath(); g.moveTo(q, 0); g.lineTo(q + 64, h); g.stroke(); g.beginPath(); g.moveTo(q, 0); g.lineTo(q - 64, h); g.stroke(); } }, true);
    const fm = new THREE.MeshStandardMaterial({ map: fenceT, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 });
    const fence = (ax: number, az: number, bx: number, bz2: number) => { const l = Math.hypot(bx - ax, bz2 - az), t = fenceT.clone(); t.repeat.set(l / 1.0, 3.6 / 1.0); t.needsUpdate = true; const m = fm.clone(); m.map = t; const me = new THREE.Mesh(new THREE.PlaneGeometry(l, 3.6), m); me.position.set((ax + bx) / 2, 1.85, (az + bz2) / 2); me.rotation.y = Math.atan2(bx - ax, bz2 - az) - Math.PI / 2; P.add(me); for (let s = 0; s <= l; s += 2.7) b.add(cyl(0.04, 0.04, 3.7, 6), 'steel', 0x3a3d42, M(ax + (bx - ax) * s / l, 1.85, az + (bz2 - az) * s / l), false); };
    fence(cx - cw / 2 - 0.5, cz - cd / 2 - 0.5, cx + cw / 2 + 0.5, cz - cd / 2 - 0.5); fence(cx - cw / 2 - 0.5, cz - cd / 2 - 0.5, cx - cw / 2 - 0.5, cz + cd / 2 + 0.5);
    hoop(b, cx - cw / 2 + 0.2, 0.04, cz, Math.PI / 2); hoop(b, cx + cw / 2 - 0.2, 0.04, cz, -Math.PI / 2); goal(b, cx - cw / 2 + 0.1, 0.04, cz + 2.6, Math.PI / 2);
    /* players: one dribbling (the ball bounces under gravity), one defending, one waiting for a pass, two on the bench */
    const sport = { ...CROWD.sport };
    P.crowd({ height: 1.74, outfit: sport, pose: 'dribble' }, [{ x: cx - 2.4, z: cz + 0.6, yaw: -Math.PI / 2 + 0.2, top: '#c8302a' }], { sway: 0.2 });
    P.crowd({ height: 1.72, outfit: sport, pose: 'walk' }, [{ x: cx - 4.4, z: cz + 0.2, yaw: Math.PI / 2 - 0.2, top: '#2f6fd4' }, { x: cx + 1.5, z: cz - 2.5, yaw: -2.2, top: '#c8302a' }], { sway: 0.4 });
    P.crowd({ height: 1.7, outfit: sport, pose: 'shoot' }, [{ x: cx - 5.3, z: cz - 2.8, yaw: Math.PI / 2 + 0.4, top: '#2f6fd4' }], { sway: 0.1 });
    b.add(box(3.2, 0.06, 0.45), 'wood', 0x8a6a48, M(cx + 2, 0.45, cz + cd / 2 + 0.9)); for (const s of [-1, 1]) b.add(box(0.06, 0.45, 0.4), 'steel', 0x3a3d42, M(cx + 2 + s * 1.4, 0.22, cz + cd / 2 + 0.9), false);
    P.crowd({ height: 1.72, outfit: CROWD.casualPack, pose: 'sit' }, [{ x: cx + 1.3, z: cz + cd / 2 + 0.85, yaw: Math.PI, top: '#3a4250' }, { x: cx + 2.6, z: cz + cd / 2 + 0.85, yaw: Math.PI + 0.2, top: '#7a3a2a' }], { look: 1 });
    const ball = new THREE.Mesh(sphere(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: 0xc8581e, roughness: 0.65 })); ball.castShadow = true; P.add(ball);
    const dy = -Math.PI / 2 + 0.2, bs = { y: 0.9, vy: 0, x: cx - 2.4 + Math.sin(dy) * 0.38 - Math.cos(dy) * 0.24, z: cz + 0.6 + Math.cos(dy) * 0.38 + Math.sin(dy) * 0.24 }; ball.position.set(bs.x, bs.y, bs.z);
    P.ups.push((_t, dt) => { const s = Math.min(dt, 0.033); bs.vy -= 9.81 * s; bs.y += bs.vy * s; if (bs.y < 0.16) { bs.y = 0.16; bs.vy = -bs.vy * 0.82; } if (bs.y > 0.92 && bs.vy > 0) { bs.vy = -3.2; } ball.position.set(bs.x, bs.y, bs.z); ball.rotation.x += bs.vy * s * 2; });
    /* the yellow college bus and the scooters by the wall */
    const side = canvasTex('ugBus', 1024, 128, (g, w, h) => { g.fillStyle = '#f2b705'; g.fillRect(0, 0, w, h); g.fillStyle = '#13306b'; g.font = '800 64px Inter, sans-serif'; g.textBaseline = 'middle'; g.fillText('UNIGLOBE COLLEGE', 40, h / 2); g.font = '600 30px Inter, sans-serif'; g.fillText('KAMALADI · KATHMANDU', 680, h / 2 + 4); });
    const extra = new THREE.Group(); P.add(extra); bus(b, bl, 11.5, 0, -19.5, Math.PI / 2 + 0.05, 0xf2b705, side, extra);
    for (let i = 0; i < 6; i++) scooter(b, bl, 6.5 + i * 1.05, 0, -8.0, Math.PI / 2 + 0.25, [0xc8302a, 0x1d1f24, 0xe9e6df, 0x2f6fd4, 0x5a5f66, 0xb3261e][i]);
    for (let i = 0; i < 4; i++) scooter(b, bl, -4 - i * 1.05, 0, -26.5, -Math.PI / 2 + 0.2, [0x1d1f24, 0xe9e6df, 0x8a1d1d, 0x2f6fd4][i]);
    pot(b, -4.2, 0.25, bz + bd / 2 + 1.6, 1.2, 0xf29a1a); pot(b, 2.2, 0.25, bz + bd / 2 + 1.6, 1.2, 0xf29a1a);
    tree(b, bl, 17.5, 0, -30, 1.0, 'broad', 21); tree(b, bl, -19.5, 0, -30, 0.95, 'broad', 23);
    /* students outside the entrance, with backpacks and phones */
    P.crowd({ height: 1.72, outfit: CROWD.casualPack, pose: 'talk' }, [{ x: -3.6, z: -22.5, yaw: 0.9, top: '#2b3445' }, { x: 3.8, z: -21.2, yaw: -2.4, top: '#5c6470' }], { look: 0.8 });
    P.crowd({ height: 1.7, outfit: CROWD.casualPack, pose: 'phone' }, [{ x: -2.6, z: -23.4, yaw: -2.6, top: '#7a3a2a' }, { x: 5.0, z: -22.0, yaw: -1.2, top: '#2f4a3a' }], { look: 0.3 });
    P.crowd({ female: true, height: 1.58, hairStyle: 'long', outfit: { ...CROWD.casualPack, top: 'tee' }, pose: 'clasp' }, [{ x: 4.5, z: -20.6, yaw: 2.6, top: '#c94f6d' }, { x: -0.8, z: -18.5, yaw: 0.4, top: '#e8e2d6' }], { look: 1 });
    /* the street: neighbours on both sides, poles and their wires along the pavement */
    building(b, bl, -29, 0, -15, 0, { w: 12, d: 14, floors: 6, col: 0xd9cdb7, band: 0x8a7d6a, shop: 0x3a5a7a, balcony: true, tanks: true });
    building(b, bl, 28.5, 0, -14, 0, { w: 11, d: 13, floors: 5, col: 0xc9b9a3, band: 0x6b5a48, shop: 0x6a3a2a, balcony: true, tanks: true });
    building(b, bl, 29, 0, -33, 0, { w: 12, d: 10, floors: 7, col: 0xe2d8c8, band: 0x7a7a7a, tanks: true });
    const poles = [-20, -7, 7, 20]; poles.forEach((x) => pole(b, x, 0, -4.2, 8.5)); for (let i = 0; i < poles.length - 1; i++) wires(b, V3(poles[i], 8.0, -4.2), V3(poles[i + 1], 8.0, -4.2), 5);
    const stand = V3(-0.4, 0, -11.2);
    return P.finish({
      stand: stand.toArray() as [number, number, number], yaw: 0.4, act: 'point', outfit: 'college', bubbleSide: 'right',
      path: [[1.5, -1], [1.5, -6.4], [0.4, -9.5]], camera: [3.1, 1.8, -2.2], lookAt: [-5.5, 4.0, -22], cameraPortrait: [2.2, 1.75, -4.2],
      focus: [-1, H + 2.6, bz + bd / 2], plot: { x: 0, z: -22, rx: 23, rz: 17 },
    });
  },
};
