import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, rbox, sphere, glowSprite } from '../kit';
import { canvasTex, h2 } from '../textures';
import { scooter, pot, officeChair, building } from '../props';
import type { SceneModule, SceneCtx } from '../types';

/* code on a dark editor, token-coloured */
export function codeTex(key: string, lines: [string, string][][], title = '') {
  return canvasTex(key, 1024, 600, (g, w, h) => {
    g.fillStyle = '#0d1424'; g.fillRect(0, 0, w, h); g.fillStyle = '#16213a'; g.fillRect(0, 0, w, 44); g.fillStyle = '#111a2e'; g.fillRect(0, 44, 170, h - 44);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 22, 22, 7, 0, 6.283); g.fill(); });
    g.fillStyle = '#8a97ad'; g.font = '500 20px "JetBrains Mono", Menlo, monospace'; g.fillText(title, 110, 29);
    ['app', 'components', 'lib', 'public', 'styles'].forEach((f, i) => { g.fillStyle = i === 1 ? '#dbe2eb' : '#6b7a90'; g.fillText((i === 1 ? '▾ ' : '▸ ') + f, 16, 84 + i * 30); });
    g.font = '500 24px "JetBrains Mono", Menlo, monospace';
    lines.forEach((ln, q) => { let x = 196; g.fillStyle = '#3d4a63'; g.fillText(String(q + 1).padStart(2, ' '), 180 - 6, 86 + q * 34); ln.forEach(([t, c]) => { g.fillStyle = c; g.fillText(t, x + 30, 86 + q * 34); x += g.measureText(t).width; }); });
    g.fillStyle = '#98b9fb'; g.fillRect(226 + 330, 86 + 4 * 34 - 22, 3, 28);
  });
}
const K1 = '#c792ea', K2 = '#98b9fb', K3 = '#f4b961', K4 = '#dbe2eb', K5 = '#93d694', KC = '#6b7a90';

/* JAN 2022 · Princelab, remote: his room on the ground floor of a brick Kathmandu house, glass doors slid open to the yard. Desk along the
   side wall with Next.js on the monitor, a lamp, a window over the city, shelves, a bed; outside, his scooter and the water tanks on the roof. */
export const princelab: SceneModule = {
  id: 'princelab', title: 'Princelab · Remote',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'princelab'), b = P.b, bl = P.bl, fy = 0.3;
    P.ground(-13, -26, 13, -6, 'paver', 0xa9a49b); P.ground(-1.6, -6, 1.6, -1.5, 'concrete', 0xb5b0a6, 0.025);
    /* compound wall and gate */
    for (const [x0, x1] of [[-13, -1.4], [1.4, 13]]) { const c = (x0 + x1) / 2; b.add(box(x1 - x0, 1.5, 0.22), 'plaster', 0xe0d6c4, M(c, 0.75, -6)); b.add(box(x1 - x0 + 0.04, 0.08, 0.3), 'paint', 0x5a5f66, M(c, 1.54, -6)); }
    for (const gx of [-1.5, 1.5]) b.add(box(0.45, 2.0, 0.45), 'brick', 0xffffff, M(gx, 1.0, -6));
    for (const s of [-1, 1]) { b.push(M(s * 1.3, 0, -6.05, s * -1.2)); for (let i = 0; i < 6; i++) b.add(box(0.03, 1.4, 0.03), 'steel', 0x2a2b2e, M(-s * (0.08 + i * 0.2), 0.8, 0), false); b.add(box(1.3, 0.05, 0.04), 'steel', 0x2a2b2e, M(-s * 0.6, 1.5, 0), false); b.add(box(1.3, 0.05, 0.04), 'steel', 0x2a2b2e, M(-s * 0.6, 0.1, 0), false); b.pop(); }
    /* the house: exposed brick front, plastered sides, three storeys; the ground-floor room is open to the yard */
    const hx = 0, hz = -18, W = 7.6, D = 9, fh = 3.0, front = hz + D / 2, rd = 4.6, rz0 = front - rd;
    b.add(box(W, fy, D + 0.6), 'concrete', 0xb5b0a6, M(hx, fy / 2, hz + 0.3));
    b.add(box(0.3, fh, rd), 'plasterIn', 0xf0e6d6, M(hx - W / 2 + 0.15, fy + fh / 2, front - rd / 2)); b.add(box(0.3, fh, rd), 'plasterIn', 0xf0e6d6, M(hx + W / 2 - 0.15, fy + fh / 2, front - rd / 2));
    b.add(box(W, fh, D - rd), 'plaster', 0xe6dccb, M(hx, fy + fh / 2, hz - D / 2 + (D - rd) / 2));
    const backZ = rz0 + 0.01; b.add(box(W - 0.6, fh, 0.04), 'plasterIn', 0xf2e9da, M(hx, fy + fh / 2, backZ + 0.02), false);
    b.add(box(W, 0.3, D), 'concrete', 0xd2cdc3, M(hx, fy + fh + 0.15, hz));
    b.add(box(W, fh * 2, D), 'plaster', 0xe6dccb, M(hx, fy + fh + 0.3 + fh, hz)); b.add(box(W + 0.02, fh * 2, 0.3), 'brick', 0xffffff, M(hx, fy + fh + 0.3 + fh, front - 0.14));
    for (let f = 0; f < 2; f++) for (const wx of [-2.0, 2.0]) { const y = fy + fh + 0.3 + f * fh; b.add(box(1.3, 1.4, 0.08), 'wood', 0x5a3a24, M(wx, y + 1.5, front + 0.02)); b.add(box(1.1, 1.2, 0.06), 'glass', h2(f, wx) > 0.5 ? 0x7a6a58 : 0x34444f, M(wx, y + 1.5, front + 0.05), false); b.add(box(1.5, 0.1, 0.25), 'concrete', 0xd2cdc3, M(wx, y + 0.75, front + 0.1), false); }
    b.add(box(W + 0.3, 0.12, 0.6), 'concrete', 0xd2cdc3, M(hx, fy + fh + 0.36, front + 0.15));
    const roofY = fy + fh * 3 + 0.3; for (const [w, d, x, z] of [[W, 0.15, 0, front - 0.07], [W, 0.15, 0, hz - D / 2 + 0.07], [0.15, D, W / 2 - 0.07, hz], [0.15, D, -W / 2 + 0.07, hz]] as const) b.add(box(w, 1.0, d), 'plaster', 0xe6dccb, M(x, roofY + 0.5, z));
    b.add(cyl(0.65, 0.65, 1.4, 18), 'plastic', 0x16171a, M(2.0, roofY + 1.6, hz - 2.4)); b.add(cyl(0.55, 0.55, 1.2, 18), 'plastic', 0x16171a, M(0.6, roofY + 1.5, hz - 2.6)); b.add(box(2.6, 0.9, 0.2), 'steel', 0x5a5f66, M(1.3, roofY + 0.45, hz - 2.5), false);
    b.add(box(2.2, 2.4, 2.2), 'plaster', 0xe6dccb, M(-2.2, roofY + 1.2, hz - 2.4)); b.add(sphere(0.45, 12, 8).scale(1, 1, 0.3), 'plastic', 0xd9d9d6, M(-3.0, roofY + 2.8, hz - 1.2, 0.6, -0.4));
    /* the room */
    b.add(box(W - 0.6, 0.04, rd), 'woodIn', 0xb88a5c, M(hx, fy + 0.02, front - rd / 2), false);
    b.add(box(W - 0.6, 0.02, rd), 'plasterIn', 0xf4ecdf, M(hx, fy + fh - 0.01, front - rd / 2), false);
    const winX = -0.6, winY = fy + 1.65; for (const [w, h, x, y] of [[2.2, 0.1, 0, 0.675], [2.2, 0.1, 0, -0.675], [0.1, 1.45, 1.05, 0], [0.1, 1.45, -1.05, 0]] as const) b.add(box(w, h, 0.1), 'woodIn', 0x5a3a24, M(winX + x, winY + y, backZ + 0.07));
    const city = canvasTex('ktmCity', 1024, 640, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h * 0.6); sky.addColorStop(0, '#7fb0e2'); sky.addColorStop(1, '#dfe9f1'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#9bb0c4'; g.beginPath(); g.moveTo(0, h * 0.42); for (let x = 0; x <= w; x += 32) g.lineTo(x, h * 0.4 - 50 * Math.abs(Math.sin(x * 0.006)) - 30 * Math.sin(x * 0.017)); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      g.fillStyle = '#7f9a76'; g.beginPath(); g.moveTo(0, h * 0.5); for (let x = 0; x <= w; x += 24) g.lineTo(x, h * 0.48 - 26 * Math.sin(x * 0.01 + 1)); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      g.fillStyle = '#f3f1ea'; g.beginPath(); g.arc(760, h * 0.43, 22, Math.PI, 0); g.fill(); g.fillStyle = '#d4a63a'; g.fillRect(754, h * 0.43 - 50, 12, 28);
      for (let r = 0; r < 5; r++) for (let i = 0; i < 26; i++) { const bw = 30 + h2(i, r) * 40, bh = 40 + h2(i, r + 9) * 90 + r * 30, x = i * 42 - 20 + r * 13, y = h * 0.55 + r * 40 - bh + 60; const c = ['#d8cbb5', '#c9b49a', '#e6dccb', '#b98d6e', '#d2c2a8', '#a9b7c1', '#e3c9a8'][Math.floor(h2(i * 3, r) * 7)]; g.fillStyle = c; g.fillRect(x, y, bw, bh + 200); g.fillStyle = 'rgba(40,50,60,.55)'; for (let k = 0; k < bh / 18; k++) for (let q = 0; q < bw / 14 - 1; q++) if (h2(i * 13 + k, q + r) > 0.35) g.fillRect(x + 5 + q * 13, y + 8 + k * 18, 6, 8); g.fillStyle = '#1b1c1f'; if (h2(i, r + 4) > 0.6) g.fillRect(x + bw * 0.6, y - 10, 12, 10); }
    });
    const view = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.25), new THREE.MeshBasicMaterial({ map: city, toneMapped: true })); view.position.set(winX, winY, backZ + 0.05); P.add(view);
    b.add(box(0.05, 1.25, 0.05), 'woodIn', 0x5a3a24, M(winX, winY, backZ + 0.09), false); b.add(box(2.0, 0.05, 0.05), 'woodIn', 0x5a3a24, M(winX, winY, backZ + 0.09), false);
    for (const s of [-1, 1]) b.add(box(0.5, 1.8, 0.08), 'fabricIn', 0xc9b48e, M(winX + s * 1.35, winY - 0.05, backZ + 0.16), false);
    /* desk along the right wall, monitor, keyboard, mug, lamp; his chair */
    const dx = W / 2 - 0.3 - 0.38, dz = front - 2.1;
    b.add(box(0.76, 0.04, 1.8), 'woodIn', 0xcaa57a, M(dx, fy + 0.74, dz)); for (const [a, c] of [[0.33, 0.85], [-0.33, 0.85], [0.33, -0.85], [-0.33, -0.85]]) b.add(box(0.04, 0.72, 0.04), 'steel', 0x2a2b2e, M(dx + a, fy + 0.37, dz + c), false);
    b.add(box(0.06, 0.34, 0.06), 'steel', 0x2a2b2e, M(dx + 0.2, fy + 0.93, dz)); b.add(box(0.22, 0.02, 0.18), 'steel', 0x2a2b2e, M(dx + 0.2, fy + 0.77, dz)); b.add(rbox(0.04, 0.42, 0.68, 0.01), 'plastic', 0x15161a, M(dx + 0.17, fy + 1.15, dz));
    P.screen(codeTex('plCode', [[['// app/page.tsx', KC]], [['export default ', K1], ['function ', K1], ['Home', K2], ['() {', K4]], [['  return (', K4]], [['    <main ', K2], ['className', K3], ['="flex flex-col gap-8"', K5], ['>', K2]], [['      <Hero ', K2], ['title', K3], ['={', K4], ['copy.title', K4], ['} />', K2]], [['      <Features ', K2], ['items', K3], ['={', K4], ['features', K4], ['} />', K2]], [['      <Pricing ', K2], ['plans', K3], ['={', K4], ['plans', K4], ['} />', K2]], [['    </main>', K2]], [['  );', K4]], [['}', K4]]], 'page.tsx — princelab-web'), 0.64, 0.375, dx + 0.145, fy + 1.15, dz, -Math.PI / 2, 1.0);
    b.add(rbox(0.16, 0.02, 0.44, 0.006), 'plastic', 0x2a2b30, M(dx - 0.12, fy + 0.77, dz)); b.add(rbox(0.07, 0.02, 0.11, 0.01), 'plastic', 0x2a2b30, M(dx - 0.12, fy + 0.77, dz - 0.34)); b.add(cyl(0.04, 0.035, 0.1, 12), 'paint', 0xb3261e, M(dx - 0.05, fy + 0.81, dz + 0.55));
    b.add(cyl(0.07, 0.08, 0.02, 12), 'metal', 0x2a2b2e, M(dx + 0.2, fy + 0.77, dz - 0.7)); b.add(cyl(0.008, 0.008, 0.42, 6), 'metal', 0x2a2b2e, M(dx + 0.12, fy + 0.97, dz - 0.7, 0, 0, 0.4)); b.add(cyl(0.05, 0.09, 0.12, 12, true), 'metal', 0x2a2b2e, M(dx - 0.02, fy + 1.16, dz - 0.7, 0, 0, -0.9));
    const bulb = new THREE.Mesh(sphere(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1cf })); bulb.position.set(dx - 0.05, fy + 1.11, dz - 0.7); P.add(bulb); const lg = glowSprite(0xffd9a0, 1.2, 0.5); lg.position.copy(bulb.position); P.add(lg);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: canvasTex('pool', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,150,0.55)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.position.set(dx - 0.1, fy + 0.765, dz - 0.5); P.add(pool);
    officeChair(b, bl, dx - 0.95, fy, dz, Math.PI / 2, 0x2a2d33);
    /* shelves, bed, rug, plant, a poster */
    b.add(box(0.32, 1.9, 1.4), 'woodIn', 0x8a5a34, M(-W / 2 + 0.47, fy + 0.95, front - 1.3)); for (let k = 0; k < 4; k++) for (let i = 0; i < 9; i++) b.add(box(0.22, 0.24 + h2(i, k) * 0.06, 0.05 + h2(i, k + 3) * 0.04), 'paintIn', [0x2f6fd4, 0xb3261e, 0xe2b23c, 0x3c7a4a, 0x2b3140, 0xe9e2d6, 0x7a3fd1][(i + k) % 7], M(-W / 2 + 0.5, fy + 0.3 + k * 0.45, front - 1.9 + i * 0.13), false);
    b.add(box(1.4, 0.45, 2.0), 'woodIn', 0x6b4a30, M(-W / 2 + 1.0, fy + 0.225, rz0 + 1.1)); b.add(rbox(1.35, 0.2, 1.95, 0.06), 'fabricIn', 0xe8e2d6, M(-W / 2 + 1.0, fy + 0.55, rz0 + 1.1)); b.add(rbox(1.36, 0.08, 1.2, 0.04), 'fabricIn', 0x3a5a7a, M(-W / 2 + 1.0, fy + 0.66, rz0 + 1.45)); b.add(rbox(0.6, 0.12, 0.35, 0.05), 'fabricIn', 0xf4f1ea, M(-W / 2 + 1.0, fy + 0.72, rz0 + 0.35));
    b.add(box(2.2, 0.015, 1.6), 'carpetIn', 0x7a3a2a, M(0.8, fy + 0.05, front - 2.1), false); pot(b, -1.9, fy, front - 0.6, 1.1);
    const poster = canvasTex('plPoster', 256, 360, (g, w, h) => { g.fillStyle = '#14294f'; g.fillRect(0, 0, w, h); g.fillStyle = '#98b9fb'; g.font = '700 70px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText('{ }', w / 2, 150); g.fillStyle = '#f4b961'; g.font = '700 34px Inter, sans-serif'; g.fillText('ship it', w / 2, 240); });
    P.sign(poster, 0.6, 0.85, 1.6, fy + 1.75, backZ + 0.06, 0, 0x1d1f24, 0.02);
    /* glass doors slid open to the sides */
    const gm = new THREE.MeshStandardMaterial({ color: 0xa8c0cc, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.3, depthWrite: false }); for (const s of [-1, 1]) { const gl = new THREE.Mesh(box(1.6, 2.6, 0.03), gm); gl.position.set(s * (W / 2 - 1.0), fy + 1.35, front - 0.05); P.add(gl); b.add(box(1.6, 0.06, 0.06), 'metal', 0x6d7278, M(s * (W / 2 - 1.0), fy + 0.08, front - 0.05), false); b.add(box(0.06, 2.6, 0.06), 'metal', 0x6d7278, M(s * (W / 2 - 1.0) - s * 0.78, fy + 1.35, front - 0.05), false); b.add(box(1.7, 0.06, 0.12), 'metal', 0x6d7278, M(s * (W / 2 - 1.0), fy + 2.66, front - 0.05), false); }
    b.add(box(W - 0.6, 0.08, 0.14), 'metal', 0x6d7278, M(0, fy + 2.72, front - 0.03), false);
    b.add(box(2.0, 0.15, 0.5), 'concrete', 0xb5b0a6, M(0, 0.075, front + 0.55), false);
    P.frameBox(0, fy + 1.5, front, 7.2, 3.1);
    P.floorBox(-W / 2, hz - D / 2, W / 2, front + 0.3, fy); P.floorBox(-1, front + 0.3, 1, front + 0.8, fy, '-z');
    /* outside: his scooter, plants, a neighbour's house */
    scooter(b, bl, 4.6, 0, -9.5, 0.4, 0x3a3d44); for (const [x, z] of [[-4.6, -8], [-5.8, -8.4], [5.4, -12.2]]) pot(b, x, 0, z, 1.0, h2(x, z) > 0.5 ? 0xf29a1a : undefined);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 5, 4), new THREE.MeshStandardMaterial({ color: 0x777777 })); line.rotation.z = Math.PI / 2; line.position.set(0, roofY + 1.9, hz + 1); P.add(line);
    for (let i = 0; i < 5; i++) b.add(box(0.5, 0.7, 0.01), 'fabric', [0x2f6fd4, 0xe8e2d6, 0xb3261e, 0x3c7a4a, 0xe2b23c][i], M(-2 + i * 0.9, roofY + 1.55, hz + 1, 0, 0, (h2(i, 1) - 0.5) * 0.1), false);
    building(b, bl, -11, 0, -19, 0, { w: 7, d: 9, floors: 4, col: 0xd9cdb7, band: 0x8a7d6a, tanks: true, balcony: true });
    building(b, bl, 11, 0, -19.5, 0, { w: 7, d: 10, floors: 3, mat: 'brick', col: 0xffffff, tanks: true });
    const seat = V3(dx - 0.95, fy, dz);
    return P.finish({
      stand: seat.toArray() as [number, number, number], yaw: Math.PI / 2, seat: 0.48, act: 'type', outfit: 'home', bubbleSide: 'left',
      path: [[0, -1], [0, -7], [0.4, front + 1.0], [dx - 1.4, dz + 0.9]], camera: [-2.4, 1.8, -9.4], lookAt: [1.3, 1.25, -16.0], cameraPortrait: [-1.2, 1.75, -10.6],
      focus: [dx + 0.15, fy + 1.15, dz], plot: { x: 0, z: -16, rx: 14, rz: 11 },
    });
  },
};
