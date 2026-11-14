import * as THREE from 'three';
import { Plot, V3 } from '../plot';
import { box, cyl, mat4 as M, rbox, sphere, glowSprite, tube } from '../kit';
import { canvasTex } from '../textures';
import { officeChair, pot, tree, shrub } from '../props';
import { codeTex } from './princelab';
import type { SceneModule, SceneCtx } from '../types';

function label(t: string, col: string) {
  const tex = canvasTex('agl-' + t, 512, 128, (g, w, h) => { g.fillStyle = 'rgba(8,14,24,.82)'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 28); g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke(); g.fillStyle = '#ffffff'; g.font = '700 50px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, w / 2, h / 2 + 2); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(1.3, 0.325, 1); return s;
}

/* NOW · his workstation on a timber deck at the valley rim, a glass studio behind, and over the deck the orchestrator agent: a central node
   wired to dispatcher, billing and CSR sub-agents, tasks flowing out along the links and checked results flowing back. */
export const orchestrator: SceneModule = {
  id: 'orchestrator', title: 'Orchestrator agent',
  build: (_t, ctx: SceneCtx) => {
    const P = new Plot(ctx, 'orchestrator'), b = P.b, bl = P.bl, dy = 0.45;
    P.ground(-14, -28, 14, -6, 'grass', 0x93a46c); P.strip(0, -1, 0, -7.5, 1.6, 'paver', 0xb9b5ad);
    /* deck, steps, glass railing */
    const dz0 = -18.5, dz1 = -7.8, dx0 = -7, dx1 = 7;
    b.add(box(dx1 - dx0, dy, dz1 - dz0), 'wood', 0x9a6a44, M(0, dy / 2, (dz0 + dz1) / 2)); for (let x = dx0; x <= dx1; x += 1.75) b.add(box(0.15, 0.6, 0.15), 'wood', 0x5a3a24, M(x, -0.1, dz1 - 0.1), false);
    for (let i = 0; i < 2; i++) b.add(box(1.6, dy * (i + 1) / 2, 0.35), 'wood', 0x8a5a38, M(0, dy * (i + 1) / 4, dz1 + 0.5 - i * 0.35));
    P.floorBox(dx0, dz0, dx1, dz1, dy); P.floorBox(-0.8, dz1, 0.8, dz1 + 0.7, dy, '-z');
    const rg = new THREE.MeshStandardMaterial({ color: 0xbcd0d8, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.4, depthWrite: false });
    for (const [x0, x1] of [[dx0, -0.9], [0.9, dx1]]) { const g = new THREE.Mesh(box(x1 - x0, 1.0, 0.03), rg); g.position.set((x0 + x1) / 2, dy + 0.55, dz1 - 0.1); P.add(g); b.add(box(x1 - x0, 0.05, 0.08), 'metal', 0xb0b6be, M((x0 + x1) / 2, dy + 1.06, dz1 - 0.1), false); }
    /* the studio: timber frame, glass, a flat roof with a deep overhang; desk with two screens inside */
    const sx = -1.5, sz = -16.0, sw = 8, sd = 4.4, sh = 3.0;
    b.add(box(sw, 0.2, sd), 'woodIn', 0xb08460, M(sx, dy + 0.1, sz)); b.add(box(sw + 1.2, 0.3, sd + 1.6), 'wood', 0x3a2a1e, M(sx, dy + sh + 0.15, sz + 0.5)); b.add(box(sw, sh, 0.2), 'woodIn', 0xa47a56, M(sx, dy + sh / 2, sz - sd / 2));
    for (const x of [-sw / 2, -sw / 6, sw / 6, sw / 2]) b.add(box(0.15, sh, 0.15), 'wood', 0x3a2a1e, M(sx + x, dy + sh / 2, sz + sd / 2));
    b.add(box(0.2, sh, sd), 'woodIn', 0xa47a56, M(sx - sw / 2, dy + sh / 2, sz)); const sg = new THREE.Mesh(box(sw, sh - 0.1, 0.03), rg); sg.position.set(sx, dy + sh / 2, sz + sd / 2); P.add(sg);
    const dx = sx + 1.2, dzz = sz - 1.2; b.add(box(2.6, 0.05, 0.8), 'woodIn', 0xd9c3a3, M(dx, dy + 0.76, dzz)); for (const s of [-1, 1]) b.add(box(0.05, 0.74, 0.7), 'steel', 0x2a2b2e, M(dx + s * 1.2, dy + 0.37, dzz), false);
    const K1 = '#c792ea', K2 = '#98b9fb', K4 = '#dbe2eb', K5 = '#93d694';
    const code = codeTex('orchCode', [[['// agents/orchestrator.ts', '#6b7a90']], [['const ', K1], ['agents ', K4], ['= [', K4], ['dispatcher', K5], [', ', K4], ['billing', K5], [', ', K4], ['csr', K5], [']', K4]], [['for ', K1], ['(const ', K1], ['task ', K4], ['of ', K1], ['queue', K4], [') {', K4]], [['  const ', K1], ['agent ', K4], ['= ', K4], ['route', K2], ['(task)', K4]], [['  const ', K1], ['out ', K4], ['= await ', K1], ['agent.run', K2], ['(task)', K4]], [['  await ', K1], ['review', K2], ['(out, task)', K4]], [['}', K4]]], 'orchestrator.ts');
    const stat = codeTex('orchStat', [[['$ agents status', '#6b7a90']], [['dispatcher   ', K5], ['● running', K5]], [['billing      ', K5], ['● running', K5]], [['csr          ', K5], ['● idle', '#f4b961']], [['orchestrator ', K2], ['3 / 3 healthy', K4]]], 'terminal');
    for (const [o, t] of [[-0.55, code], [0.55, stat]] as const) { b.add(rbox(1.0, 0.6, 0.04, 0.01), 'plastic', 0x15161a, M(dx + o, dy + 1.2, dzz - 0.2, -o * 0.3)); P.screen(t, 0.94, 0.54, dx + o + Math.sin(-o * 0.3) * 0.025, dy + 1.2, dzz - 0.18 + Math.cos(-o * 0.3) * 0.0, -o * 0.3, 1.0); b.add(box(0.05, 0.36, 0.05), 'steel', 0x2a2b2e, M(dx + o, dy + 0.95, dzz - 0.25), false); }
    officeChair(b, bl, dx, dy, dzz + 0.65, Math.PI, 0x2a2d33); pot(b, sx - 3.2, dy + 0.2, sz + 1.4, 1.2); pot(b, dx1 - 0.8, dy, dz1 - 0.9, 1.1, 0xf29a1a);
    /* his laptop on a standing table by the rail */
    b.add(box(0.9, 0.04, 0.6), 'wood', 0x5a3a24, M(-3.6, dy + 1.02, -10.4)); b.add(cyl(0.04, 0.04, 1.0, 8), 'metal', 0x2a2b2e, M(-3.6, dy + 0.5, -10.4)); b.add(rbox(0.33, 0.015, 0.23, 0.004), 'metal', 0xb0b6be, M(-3.6, dy + 1.05, -10.4, 0.3), false);
    const lapScr = P.screen(codeTex('orchLap', [[['> route(task)', '#93d694']], [['→ billing', '#98b9fb']]], 'agent'), 0.31, 0.2, -3.6 - 0.02, dy + 1.17, -10.5, 0.3, 1.0); lapScr.rotation.x = -0.25;
    tree(b, bl, -11, 0, -12, 1.0, 'fine', 81); tree(b, bl, 11, 0, -20, 1.1, 'broad', 83); shrub(b, 9, 0, -9, 1.1); shrub(b, -9.5, 0, -22, 1.2);
    /* the agent graph */
    const hub = V3(2.6, dy + 3.0, -13.6), nodes = [{ n: 'ORCHESTRATOR', c: 0x98b9fb, r: 0.42, p: V3(0, 0, 0), cs: '#98b9fb' }, { n: 'DISPATCHER', c: 0xf4b961, r: 0.26, p: V3(-2.3, -0.9, 0.6), cs: '#f4b961' }, { n: 'BILLING', c: 0x93d694, r: 0.26, p: V3(2.4, -0.7, 0.2), cs: '#93d694' }, { n: 'CSR', c: 0xe8eef7, r: 0.26, p: V3(0.4, 1.35, -0.6), cs: '#e8eef7' }];
    P.frameBox(hub.x, hub.y + 0.2, hub.z, 6.4, 3.6);
    const G = new THREE.Group(); G.position.copy(hub); G.userData.anim = true; P.add(G);
    const meshes = nodes.map((nd) => { const m = new THREE.Mesh(sphere(nd.r, 24, 16), new THREE.MeshStandardMaterial({ color: nd.c, emissive: nd.c, emissiveIntensity: 1.3, roughness: 0.3 })); m.position.copy(nd.p); G.add(m); const gl = glowSprite(nd.c, nd.r * 7, 0.55); m.add(gl); const ring = new THREE.Mesh(new THREE.TorusGeometry(nd.r * 1.6, 0.012, 6, 48), new THREE.MeshBasicMaterial({ color: nd.c, transparent: true, opacity: 0.6 })); ring.rotation.x = Math.PI / 2; m.add(ring); const l = label(nd.n, nd.cs); l.position.set(0, nd.r + 0.32, 0); m.add(l); return m; });
    const linkM = new THREE.MeshBasicMaterial({ color: 0x98b9fb, transparent: true, opacity: 0.55 }), links: THREE.Mesh[] = [];
    for (let i = 1; i < 4; i++) { const l = new THREE.Mesh(cyl(0.018, 0.018, 1, 6), linkM); G.add(l); links.push(l); }
    const lapLink = new THREE.Mesh(cyl(0.01, 0.01, 1, 5), new THREE.MeshBasicMaterial({ color: 0xdbe2eb, transparent: true, opacity: 0.35 })); G.add(lapLink);
    const pk = [0, 1, 2, 3, 4, 5].map((i) => { const m = new THREE.Mesh(sphere(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfff1cf : 0xffffff })); G.add(m); return m; });
    const lap = V3(-3.6, dy + 1.12, -10.4).sub(hub), up = V3(0, 1, 0), tmp = V3(0, 0, 0);
    const place = (l: THREE.Mesh, a: THREE.Vector3, c: THREE.Vector3) => { tmp.subVectors(c, a); l.position.copy(a).addScaledVector(tmp, 0.5); l.scale.set(1, tmp.length(), 1); l.quaternion.setFromUnitVectors(up, tmp.normalize()); };
    P.ups.push((t, _dt, active) => {
      meshes.forEach((m, i) => { m.position.copy(nodes[i].p); m.position.y += 0.12 * Math.sin(t * 1.1 + i * 1.7); m.rotation.y = t * (0.3 + i * 0.1); m.scale.setScalar(1 + 0.05 * Math.sin(t * 2.6 + i) + (i === 0 && active ? 0.06 : 0)); });
      for (let i = 0; i < 3; i++) place(links[i], meshes[0].position, meshes[i + 1].position);
      place(lapLink, lap, meshes[0].position);
      pk.forEach((m, q) => { const k = q % 3, out = q < 3, f = (t * 0.42 + q / 6) % 1, e = out ? f : 1 - f; m.position.lerpVectors(meshes[0].position, meshes[k + 1].position, e); m.scale.setScalar(out ? 1 : 0.7); });
      G.rotation.y = 0.15 * Math.sin(t * 0.2);
    });
    const stand = V3(-1.6, dy, -11.4);
    return P.finish({
      stand: stand.toArray() as [number, number, number], yaw: 0.25, act: 'present', outfit: 'smart', bubbleSide: 'left',
      path: [[0, -1], [0, -6.9], [-0.4, -8.6]], camera: [-0.9, 2.1, -3.6], lookAt: [1.4, 2.6, -14.5], cameraPortrait: [-0.6, 2.0, -5.6],
      focus: [hub.x, hub.y, hub.z], plot: { x: 0, z: -15, rx: 13, rz: 10 },
    });
  },
};
