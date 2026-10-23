import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, rbox } from '../kit';
import { signTex, canvasTex } from '../textures';
import { containers, chassisTruck, rtg, lightMast, pot, tree } from '../props';
import { CROWD } from '../crowd';
import type { SceneModule, SceneCtx } from '../types';

/* the dispatch board on the office wall */
function boardTex() {
  return canvasTex('drayBoard', 1280, 720, (g, w, h) => {
    g.fillStyle = '#0d1424'; g.fillRect(0, 0, w, h); g.fillStyle = '#16213a'; g.fillRect(0, 0, w, 70);
    g.fillStyle = '#ffffff'; g.font = '800 36px Inter, sans-serif'; g.textBaseline = 'middle'; g.fillText('drayOS', 28, 36); g.fillStyle = '#98b9fb'; g.font = '600 24px Inter, sans-serif'; g.fillText('DISPATCHER BOARD', 180, 37);
    g.fillStyle = '#6b7a90'; g.font = '600 20px "JetBrains Mono", Menlo, monospace'; ['LOAD', 'CONTAINER', 'MOVE', 'DRIVER', 'STATUS'].forEach((t, q) => g.fillText(t, [28, 170, 420, 700, 960][q], 104));
    const rows = [['L-2041', 'MSCU 482113 4', 'Port → Yard', 'R. Ortiz', 'DISPATCHED', '#2f6fd4'], ['L-2042', 'TGHU 917045 2', 'Rail → DC 4', 'A. Khan', 'AT PORT', '#e2862b'], ['L-2043', 'CMAU 330918 7', 'Yard → DC 2', 'J. Lee', 'EN ROUTE', '#3c9a4a'], ['L-2044', 'OOLU 604772 1', 'Port → Rail', 'M. Diaz', 'DELIVERED', '#7d8792'], ['L-2045', 'MAEU 225610 9', 'DC 1 → Port', 'S. Patel', 'DISPATCHED', '#2f6fd4'], ['L-2046', 'HLXU 871204 3', 'Rail → Yard', 'T. Nguyen', 'EN ROUTE', '#3c9a4a'], ['L-2047', 'CSNU 118342 6', 'Port → DC 3', 'K. Brown', 'PICKED UP', '#9b59b6']];
    rows.forEach((r, q) => { const y = 150 + q * 74; g.fillStyle = q % 2 ? '#111b30' : '#0f182b'; g.fillRect(14, y - 30, w - 28, 62); g.fillStyle = '#dbe2eb'; g.font = '600 24px "JetBrains Mono", Menlo, monospace'; g.fillText(r[0], 28, y); g.fillText(r[1], 170, y); g.font = '500 24px Inter, sans-serif'; g.fillText(r[2], 420, y); g.fillText(r[3], 700, y); g.fillStyle = r[5]; g.fillRect(960, y - 18, 200, 36); g.fillStyle = '#fff'; g.font = '700 18px Inter, sans-serif'; g.fillText(r[4], 974, y + 1); });
  });
}

/* JUN 2022 → NOW · PortPro, Lalitpur: a glass-fronted office with its name on the parapet and the drayOS dispatch board on the lobby wall,
   people at their desks; beside it a drayage yard on light concrete: a rubber-tyred gantry over container stacks, chassis trucks in the
   lane, light masts, crew in hi-vis. The gantry's spreader hoists a box while he talks. */
export const portpro: SceneModule = {
  id: 'portpro', title: 'PortPro · Lalitpur',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'portpro'), b = P.b, bl = P.bl, navy = 0x172338, frame = 0x2e3440;
    P.ground(-22, -40, -1, -6, 'paver', 0xc9c6bf); P.ground(-1, -40, 24, -6, 'concrete', 0xf0ede6); P.ground(-4, -6, 0, -1.5, 'concrete', 0xc4c1b9, 0.025); P.ground(15, -8.2, 21, -1.5, 'concrete', 0xc4c1b9, 0.025);
    for (let x = 1; x < 24; x += 6) b.add(box(0.12, 0.012, 22), 'paint', 0xe8e2c8, M(x + 3, 0.035, -27), false);
    /* the office */
    const ox = -11, oz = -25, ow = 17, od = 13, fl = 3, fh = 3.7, H = fl * fh, fz = oz + od / 2;
    b.add(box(ow, H, od), 'concrete', 0xe3e5e7, M(ox, H / 2, oz));
    for (let f = 1; f < fl; f++) { const y = f * fh; b.add(box(ow - 0.6, fh - 0.5, 0.05), 'glassTint', 0x3a5262, M(ox, y + (fh - 0.5) / 2 + 0.25, fz + 0.03), false); for (let i = 0; i <= 10; i++) b.add(box(0.08, fh - 0.5, 0.14), 'metal', frame, M(ox - (ow - 0.6) / 2 + i * (ow - 0.6) / 10, y + (fh - 0.5) / 2 + 0.25, fz + 0.08), false); b.add(box(ow + 0.2, 0.5, 0.4), 'concrete', 0xeceef0, M(ox, y, fz + 0.15)); }
    const lobbyGlass = new THREE.Mesh(box(ow - 0.6, fh - 0.3, 0.04), new THREE.MeshStandardMaterial({ color: 0xa9c0cc, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.2, depthWrite: false })); lobbyGlass.position.set(ox, (fh - 0.3) / 2, fz + 0.05); P.add(lobbyGlass);
    for (let i = 0; i <= 8; i++) b.add(box(0.08, fh - 0.3, 0.12), 'metal', frame, M(ox - (ow - 0.6) / 2 + i * (ow - 0.6) / 8, (fh - 0.3) / 2, fz + 0.08), false);
    b.add(box(ow - 0.4, fh, 0.1), 'concreteIn', 0xeceae6, M(ox, fh / 2, fz - 5.5)); b.add(box(ow - 0.4, 0.04, 5.6), 'woodIn', 0xb58f68, M(ox, 0.02, fz - 2.8), false); b.add(box(ow - 0.4, 0.05, 5.6), 'concreteIn', 0xf2f1ee, M(ox, fh - 0.3, fz - 2.8), false);
    b.add(box(5.4, 3.1, 0.12), 'paint', 0x0b0f17, M(ox + 1.5, 1.85, fz - 5.4)); P.screen(boardTex(), 5.1, 2.87, ox + 1.5, 1.85, fz - 5.33, 0, 1.0);
    P.sign(signTex('ppWall', 512, 128, '#172338', [{ t: 'PortPro', s: 86, c: '#ffffff', y: 0.55, w: '800' }]), 1.8, 0.45, ox - 4.2, 2.3, fz - 5.4, 0, navy, 0.04);
    const desks: { x: number; z: number; yaw: number; top: string }[] = [];
    for (let i = 0; i < 4; i++) { const dx = ox - 6 + i * 2.2, dz = fz - 2.6; b.add(box(1.4, 0.04, 0.7), 'woodIn', 0xe2dcd2, M(dx, 0.74, dz)); b.add(box(0.05, 0.72, 0.6), 'steel', frame, M(dx - 0.65, 0.36, dz), false); b.add(box(0.05, 0.72, 0.6), 'steel', frame, M(dx + 0.65, 0.36, dz), false); b.add(rbox(0.56, 0.34, 0.03, 0.01), 'plastic', 0x15161a, M(dx, 1.05, dz - 0.25)); desks.push({ x: dx, z: dz + 0.6, yaw: Math.PI, top: ['#2b3445', '#e8e2d6', '#5c6470', '#7a3a2a'][i] }); }
    P.crowd({ height: 1.72, outfit: CROWD.formal, pose: 'type' }, desks.map((d) => ({ ...d })), { type: 1, sway: 0, look: 0.3 }, 0);
    P.crowd({ height: 1.6, female: true, hairStyle: 'long', outfit: CROWD.formal, pose: 'point' }, [{ x: ox + 3.8, z: fz - 3.8, yaw: -0.6, top: '#3a5a7a' }], { look: 0 }, 0);
    b.add(box(ow + 0.5, 1.2, od + 0.5), 'concrete', 0xeceef0, M(ox, H + 0.6, oz));
    P.sign(signTex('ppTop', 1024, 200, '#172338', [{ t: 'PortPro', s: 128, c: '#ffffff', y: 0.48, w: '800' }, { t: 'drayOS · LALITPUR', s: 36, c: '#98b9fb', y: 0.86, w: '600' }]), 7.2, 1.45, ox, H + 2.0, fz - 0.3, 0, navy, 0.16, 1.0);
    b.add(box(4.6, 0.25, 2.4), 'concrete', 0xeceef0, M(ox - 4.5, 3.4, fz + 1.2)); for (const s of [-1, 1]) b.add(cyl(0.08, 0.08, 3.4, 8), 'metal', 0x9aa0a8, M(ox - 4.5 + s * 2.1, 1.7, fz + 2.3));
    b.add(box(3.6, 1.2, 0.6), 'concrete', 0x3a4250, M(-8.2, 0.6, -13.4, 0.35)); b.add(box(3.7, 0.1, 0.7), 'paint', 0x98b9fb, M(-8.2, 1.25, -13.4, 0.35));
    P.sign(signTex('ppMono', 1024, 256, '#172338', [{ t: 'PortPro', s: 120, c: '#ffffff', y: 0.42, w: '800' }, { t: 'drayOS · LALITPUR', s: 44, c: '#98b9fb', y: 0.8, w: '600' }]), 3.3, 0.82, -8.2 + Math.sin(0.35) * 0.31, 0.62, -13.4 + Math.cos(0.35) * 0.31, 0.35, 0x172338, 0.02); P.frameBox(-8.2, 0.65, -13.1, 3.8, 1.4);
    for (const x of [ox - 7.6, ox - 1.5, ox + 4.5]) pot(b, x, 0, fz + 1.4, 1.4); tree(b, bl, -20, 0, -10, 0.85, 'broad', 41);
    /* the yard: perimeter fence, the gantry over a block of boxes, trucks in the lane */
    const fenceT = canvasTex('chain', 128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(70,74,80,0.95)'; g.lineWidth = 2.2; for (let q = -w; q <= w * 2; q += 16) { g.beginPath(); g.moveTo(q, 0); g.lineTo(q + 64, h); g.stroke(); g.beginPath(); g.moveTo(q, 0); g.lineTo(q - 64, h); g.stroke(); } }, true);
    const fence = (ax: number, az: number, cx: number, cz: number) => { const l = Math.hypot(cx - ax, cz - az), t = fenceT.clone(); t.repeat.set(l / 1.0, 2.4); t.needsUpdate = true; const me = new THREE.Mesh(new THREE.PlaneGeometry(l, 2.4), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 })); me.position.set((ax + cx) / 2, 1.2, (az + cz) / 2); me.rotation.y = Math.atan2(cx - ax, cz - az) - Math.PI / 2; P.add(me); for (let s = 0; s <= l + 0.01; s += 3) b.add(cyl(0.04, 0.04, 2.6, 6), 'steel', 0x5a5f66, M(ax + (cx - ax) * s / l, 1.3, az + (cz - az) * s / l), false); };
    fence(0.5, -8, 14.5, -8); fence(21.5, -8, 24, -8); fence(0.5, -8, 0.5, -39);
    b.add(rbox(2.0, 2.5, 2.0, 0.05), 'paint', 0xf0eee8, M(22.5, 1.25, -10.2)); b.add(box(1.6, 0.9, 0.05), 'glass', 0x3a4a56, M(22.5, 1.6, -9.18), false); b.add(box(6.5, 0.12, 0.12), 'paint', 0xd8322a, M(18, 1.0, -8.2, 0, 0, 0.0)); b.add(box(0.3, 1.1, 0.3), 'paint', 0xf2b705, M(14.9, 0.55, -8.2));
    const cols = ['#2f6fb3', '#c43b2f', '#e2862b', '#2f8a4a', '#7d8792', '#1f9bd7', '#8a2f4a', '#d9c23a', '#4a5568'], list: { x: number; y: number; z: number; yaw: number; col: string }[] = [];
    const cx0 = 4.0, gap = 2.75, stacks = [[3, 2], [2, 3], [3, 1], [1, 2], [2, 2]];
    stacks.forEach((st, i) => st.forEach((n, r) => { for (let k = 0; k < n; k++) list.push({ x: cx0 + i * gap, y: k * 2.59, z: -19 - r * 12.8, yaw: 0, col: cols[(i * 3 + r * 5 + k * 7) % cols.length] }); }));
    const tz = -25.4, tx = cx0 + 5 * gap + 0.6;
    list.push({ x: tx, y: 1.32, z: tz - 0.6, yaw: 0, col: '#1f6fd1' });
    P.add(containers(list));
    chassisTruck(b, bl, tx, 0, tz, 0, 0xc63a2b);
    chassisTruck(b, bl, 17.8, 0, -13.4, Math.PI / 2 - 0.1, 0xe9e6df);
    P.add(containers([{ x: 17.8 - 0.6 * Math.cos(-0.1), y: 1.32, z: -13.4 - 0.06, yaw: Math.PI / 2 - 0.1, col: '#2f8a4a' }]));
    const span = 5 * gap + 3.2, rcx = cx0 + (5 * gap) / 2 - 0.7 + 1.0; rtg(b, bl, rcx + 0.4, 0, -25.4, span + 1.4, 11, 17.5, 0xe2a316);
    lightMast(b, bl, 2.0, 0, -36, 18); lightMast(b, bl, 23, 0, -34, 18);
    /* the hoist: spreader and a box going up and down on cables */
    const hoist = new THREE.Group(); P.add(hoist); hoist.userData.anim = true;
    const spreader = new THREE.Mesh(box(2.6, 0.35, 12.2), new THREE.MeshStandardMaterial({ color: 0xe2a316, roughness: 0.5 })); spreader.castShadow = true; hoist.add(spreader);
    const cables = new THREE.Mesh(cyl(0.03, 0.03, 1, 4), new THREE.MeshStandardMaterial({ color: 0x222222 })); hoist.add(cables);
    const hx = cx0 + 4 * gap, hz0 = -25.4; hoist.position.set(hx, 0, hz0);
    const box1 = containers([{ x: 0, y: 0, z: 0, yaw: 0, col: '#c43b2f' }]); hoist.add(box1);
    P.ups.push((t) => { const k = 0.5 - 0.5 * Math.cos(t * 0.35), y = 8.5 + k * 4.5; spreader.position.y = y + 2.6 + 0.18; box1.position.y = y - 1.3 + 1.3; cables.position.y = (y + 2.8 + 17.2) / 2; cables.scale.y = 17.2 - y - 2.8; });
    /* crew */
    P.crowd({ height: 1.74, outfit: CROWD.hivis, pose: 'talk' }, [{ x: 12.2, z: -12.2, yaw: -2.4, top: '#2a2f3a' }], { look: 0.8 });
    P.crowd({ height: 1.7, outfit: CROWD.hivis, pose: 'point' }, [{ x: 19.5, z: -19.0, yaw: -1.4, top: '#3a3f48' }], { look: 0.2 });
    P.crowd({ height: 1.72, outfit: CROWD.hivis, pose: 'clasp' }, [{ x: 11.4, z: -13.0, yaw: 0.9, top: '#2a2f3a' }], { look: 0.8 });
    const stand = V3(-4.2, 0, -10.6); P.props.laptop = new THREE.Group();
    return P.finish({
      stand: stand.toArray() as [number, number, number], yaw: -0.45, act: 'talk', outfit: 'office', bubbleSide: 'left',
      path: [[-2, -1], [-2, -6.5]], camera: [9.0, 9.5, 12.0], lookAt: [0.0, 4.6, -19], cameraPortrait: [4.0, 8.5, 8.0], ctx: [[6.0, 5.4, -14.0], [12.0, 0.2, -12.0], [-2.5, 9.0, -18.5], [12.0, 7.8, -19.0], [hx, 12.5, hz0]],
      focus: [hx, 12, hz0], plot: { x: 1, z: -23, rx: 24, rz: 17 },
    });
  },
};
