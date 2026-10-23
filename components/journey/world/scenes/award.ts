import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, rbox } from '../kit';
import { canvasTex, h2 } from '../textures';
import { plasticChair, table, pot, garland, certificate, tree } from '../props';
import { CROWD } from '../crowd';
import type { SceneModule, SceneCtx } from '../types';

/* AAA Scholarship: a shamiyana pavilion (steel poles, striped fabric roof, scalloped valance) over a red-carpet stage with the flex banner on
   a truss, the guest table, a podium, marigold garlands, and rows of plastic chairs with an applauding audience. The presenter waits
   centre stage with the certificate; he climbs the steps and takes it. 2024 is a second year in a blue-and-white pavilion, mirrored. */
function build(ctx: SceneCtx, year: '2023' | '2024') {
  const P = new Plot(ctx, 'award' + year), b = P.b, bl = P.bl, y24 = year === '2024', mir = y24 ? -1 : 1;
  const roofA = y24 ? '#f2f4f7' : '#f6efe0', roofB = y24 ? '#2f5fa8' : '#b3261e', skirt = y24 ? 0x1d3f7a : 0x6e1414, carpet = y24 ? 0x2a4a8a : 0x9e2a1e;
  P.ground(-16, -36, 16, -6, 'grass', 0x9fb07a); P.ground(-13, -33, 13, -9, 'concrete', 0xc9c3b6, 0.035); P.strip(-7 * mir, -1, -7 * mir, -9, 2.2, 'concrete', 0xc4bfb4);
  /* pavilion: poles, a pitched striped roof, valance */
  const X0 = -12.5, X1 = 12.5, Z0 = -32, Z1 = -9.5, Hp = 4.2;
  for (let x = X0; x <= X1 + 0.01; x += 5) for (const z of [Z0, (Z0 + Z1) / 2, Z1]) { b.add(cyl(0.06, 0.06, Hp, 8), 'metal', 0xc0c4ca, M(x, Hp / 2, z)); bl.add(x, 0, z, 0.5, 0.5); }
  const roofT = canvasTex('roof' + year, 512, 512, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? roofA : roofB; g.fillRect(i * w / 16, 0, w / 16, h); } for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${(0.03 * h2(i, 1)).toFixed(3)})`; g.fillRect(h2(i, 2) * w, h2(i, 3) * h, 2, 6); } }, true);
  const roofM = new THREE.MeshStandardMaterial({ map: roofT, side: THREE.DoubleSide, roughness: 0.95 });
  for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(X1 - X0 + 0.6, (Z1 - Z0) / 2 + 0.4, 24, 6), p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + 0.12 * Math.sin(p.getX(i) * 1.26) * Math.cos(p.getY(i) * 0.7)); g.computeVertexNormals(); const m = new THREE.Mesh(g, roofM); m.rotation.x = -Math.PI / 2 + s * 0.2; m.position.set(0, Hp + 1.0 - 1.1 * 0.5 + 0.02, (Z0 + Z1) / 2 + s * ((Z1 - Z0) / 4)); m.castShadow = false; m.receiveShadow = false; P.add(m); }
  b.add(box(X1 - X0 + 0.4, 0.12, 0.12), 'metal', 0xc0c4ca, M(0, Hp + 1.05, (Z0 + Z1) / 2));
  const valT = canvasTex('val' + year, 512, 64, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? roofB : '#e2b23c'; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 32, 34); g.quadraticCurveTo(i * 32 + 16, 64, i * 32, 34); g.fill(); } }, true);
  for (const [w, x, z, ry] of [[X1 - X0, 0, Z1, 0], [X1 - X0, 0, Z0, Math.PI], [Z1 - Z0, X0, (Z0 + Z1) / 2, -Math.PI / 2], [Z1 - Z0, X1, (Z0 + Z1) / 2, Math.PI / 2]] as const) { const t = valT.clone(); t.repeat.set(w / 3, 1); t.needsUpdate = true; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.55), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 })); m.position.set(x, Hp - 0.22, z); m.rotation.y = ry; P.add(m); }
  /* stage, steps, carpet, skirt */
  const sx = 0, sz = -28.6, sw = 13, sd = 5.2, sh = 0.9, sf = sz + sd / 2;
  b.add(box(sw, sh, sd), 'wood', 0x7a5236, M(sx, sh / 2, sz)); b.add(box(sw - 0.4, 0.02, sd - 0.4), 'carpet', carpet, M(sx, sh + 0.01, sz), false);
  b.add(box(sw + 0.04, sh - 0.05, 0.05), 'fabric', skirt, M(sx, sh / 2, sf + 0.03)); for (let i = 0; i < 26; i++) b.add(box(0.04, sh - 0.08, 0.04), 'fabric', skirt, M(sx - sw / 2 + 0.25 + i * 0.5, sh / 2, sf + 0.07), false);
  const stx = -5.2 * mir; for (let i = 0; i < 3; i++) b.add(box(1.6, sh * (i + 1) / 3, 0.38), 'wood', 0x7a5236, M(stx, sh * (i + 1) / 6, sf + 0.95 - i * 0.38));
  P.floorBox(sx - sw / 2, sz - sd / 2, sx + sw / 2, sf, sh); P.floorBox(stx - 0.8, sf, stx + 0.8, sf + 1.15, sh, '-z');
  P.add(garland([V3(-sw / 2, sh - 0.05, sf + 0.1), V3(-sw / 4, sh - 0.05, sf + 0.1), V3(0, sh - 0.05, sf + 0.1), V3(sw / 4, sh - 0.05, sf + 0.1), V3(sw / 2, sh - 0.05, sf + 0.1)], 0.28));
  /* banner on a truss */
  const banT = canvasTex('ban' + year, 1536, 480, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, y24 ? '#0f2c5e' : '#2a0f2e'); gr.addColorStop(1, y24 ? '#1b4f8f' : '#5a1520'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9b44a'; g.lineWidth = 10; g.strokeRect(22, 22, w - 44, h - 44); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#d9b44a'; g.font = '600 46px Inter, sans-serif'; g.fillText('HERALD COLLEGE KATHMANDU', w / 2, 96);
    g.fillStyle = '#ffffff'; g.font = '800 132px Inter, sans-serif'; g.fillText('AAA SCHOLARSHIP', w / 2, 228);
    g.fillStyle = '#f4b961'; g.font = '700 70px Inter, sans-serif'; g.fillText((y24 ? 'AWARD CEREMONY · ' : 'AWARD CEREMONY · ') + year, w / 2, 352);
  });
  const bw = 10.5, bh = 3.3, bz = sz - sd / 2 + 0.25; for (const s of [-1, 1]) b.add(box(0.25, bh + sh + 1.4, 0.25), 'metal', 0x2b2f36, M(s * (bw / 2 + 0.3), (bh + sh + 1.4) / 2, bz)); b.add(box(bw + 0.9, 0.25, 0.25), 'metal', 0x2b2f36, M(0, bh + sh + 1.3, bz));
  P.sign(banT, bw, bh, 0, sh + 0.35 + bh / 2, bz + 0.05, 0, 0x2b2f36, 0.06); P.frameBox(0, sh + 0.35 + bh / 2, bz + 0.05, bw + 0.4, bh + 0.3);
  /* guest table, podium, flowers */
  table(b, bl, 1.6 * mir, sh, sz - 1.2, 4.2, 0.8, 0, { cloth: 0xf4f1e8 }); b.add(box(4.24, 0.12, 0.82), 'fabric', roofB === '#b3261e' ? 0xb3261e : 0x2f5fa8, M(1.6 * mir, sh + 0.7, sz - 0.78), false);
  for (const x of [0.3, 1.6, 2.9]) { plasticChair(b, bl, x * mir, sh, sz - 1.95, 0, 0x6b4a30); }
  pot(b, 1.6 * mir - 1.5, sh + 0.76, sz - 1.2, 0.55, 0xf29a1a); pot(b, 1.6 * mir + 1.5, sh + 0.76, sz - 1.2, 0.55, 0xf2c230);
  P.crowd({ height: 1.72, outfit: CROWD.formalTie, pose: 'sit' }, [{ x: 0.3 * mir, z: sz - 1.95, y: sh, yaw: 0, top: '#e8eef5' }, { x: 2.9 * mir, z: sz - 1.95, y: sh, yaw: 0, top: '#e8eef5' }], { look: 0.6 }, 0);
  P.crowd({ height: 1.6, female: true, hairStyle: 'bun', outfit: CROWD.sari, pose: 'sit' }, [{ x: 1.6 * mir, z: sz - 1.95, y: sh, yaw: 0, top: '#2f6b4f' }], { look: 0.6 }, 0);
  const px = 5.2 * mir; b.add(rbox(0.9, 1.15, 0.65, 0.04), 'wood', 0x5a3a24, M(px, sh + 0.58, sz + 0.6)); b.add(box(0.7, 0.3, 0.02), 'paint', 0xd9b44a, M(px, sh + 0.7, sz + 0.94), false); b.add(cyl(0.012, 0.012, 0.42, 6), 'metal', 0x2a2b2e, M(px - 0.1 * mir, sh + 1.35, sz + 0.55, 0, 0.5));
  pot(b, px + 1.0 * mir, sh, sz + 1.4, 1.0, 0xf29a1a); pot(b, -5.8 * mir, sh, sz + 1.4, 1.0, 0xf2c230);
  /* the presenter with the certificate */
  const prx = -1.6 * mir, prz = sz + 1.0, pyaw = -Math.PI / 2 * mir + 0.35 * mir;
  P.crowd({ height: 1.72, outfit: CROWD.formalTie, pose: 'give' }, [{ x: prx, z: prz, y: sh, yaw: pyaw, top: '#e8eef5', low: '#2a2f3a' }], { look: 0.2, sway: 0.3 }, 0);
  const cert = certificate('AAA SCHOLARSHIP ' + year, 'Herald College Kathmandu'); const fx = Math.sin(pyaw), fz = Math.cos(pyaw);
  cert.position.set(prx + fx * 0.5 - fz * 0.18 * 0, sh + 1.12, prz + fz * 0.5); cert.rotation.set(0, pyaw + Math.PI / 2, 0); P.add(cert); P.props.cert = cert;
  /* the audience: rows of plastic chairs, clapping */
  const rows: { x: number; z: number; yaw: number; top: string }[] = [], rowsF: typeof rows = [], tops = ['#2b3445', '#e8e2d6', '#5c6470', '#7a3a2a', '#2f4a3a', '#3a5a7a', '#8a5a3a'];
  for (let r = 0; r < (y24 ? 4 : 5); r++) for (let c = 0; c < 12; c++) { const x = -9.6 + c * 1.0 + (c >= 6 ? 1.6 : 0) - (y24 ? 0 : 0); if (Math.abs(x - -7 * mir) < 1.2) continue; const z = -21.5 + r * 1.9; plasticChair(b, bl, x, 0, z, Math.PI, y24 ? 0xf2f2f0 : 0xb3261e); if (h2(r, c) < 0.12) continue; (h2(c, r * 3) > 0.42 ? rows : rowsF).push({ x, z: z - 0.05, yaw: Math.PI + (h2(c, r) - 0.5) * 0.1, top: tops[(r * 12 + c) % 7] }); }
  P.crowd({ height: 1.72, outfit: CROWD.casual, pose: 'sitclap' }, rows, { clap: 1, sway: 0, look: 0.2 }, 0);
  P.crowd({ height: 1.58, female: true, hairStyle: 'long', outfit: CROWD.kurta, pose: 'sitclap' }, rowsF, { clap: 1, sway: 0, look: 0.2 }, 0);
  tree(b, bl, 15, 0, -8, 1.0, 'broad', 51); tree(b, bl, -15.5, 0, -34, 1.1, 'broad', 53);
  const stand = V3(prx + Math.sin(pyaw) * 1.05, sh, prz + Math.cos(pyaw) * 1.05), syaw = Math.atan2(4.2 * mir - stand.x, -4 - stand.z);
  return P.finish({
    stand: stand.toArray() as [number, number, number], yaw: syaw, act: 'cert', outfit: 'office', bubbleSide: y24 ? 'right' : 'left',
    path: [[-7 * mir, -1], [-7 * mir, -9.5], [-7 * mir, sf + 2.2], [stx, sf + 1.4], [stx, sf - 0.4]], camera: [4.4 * mir, 2.3, -21.6], lookAt: [-1.8 * mir, 1.9, -28.5], cameraPortrait: [3.2 * mir, 2.2, -22.8],
    focus: [0, sh + 2.2, bz], plot: { x: 0, z: -21, rx: 16, rz: 15 },
  });
}
export const award2023: SceneModule = { id: 'award2023', title: 'AAA Scholarship 2023', build: (_t, ctx) => build(ctx, '2023') };
export const award2024: SceneModule = { id: 'award2024', title: 'AAA Scholarship 2024', build: (_t, ctx) => build(ctx, '2024') };
