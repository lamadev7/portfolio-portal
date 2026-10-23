import * as THREE from "three";
import type { V3 } from "../../contracts";
import { canvasTex, hash } from "./tex";
import { cyl, mat4 } from "./geo";
import { reflect } from "./mirror";
import type { SceneKit } from "./scene";

/* night practicals that cost no shading lights: distant town lights as points, fires with flicker */

const dotTex = () => canvasTex("dot", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,255,255,0.9)"); gr.addColorStop(0.4, "rgba(255,255,255,0.25)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

/** many small lights (windows, street lamps of a far town, butter lamps, string lights); calls with the same size and
    reflection flag merge into one Points draw at finish. Colours: warm sodium / white LED / tube-light mixes */
export function cityLights(k: SceneKit, pts: V3[], o: { size?: number; palette?: number[]; intensity?: number; reflect?: boolean } = {}) {
  const pal = o.palette ?? [0xffb35a, 0xffc878, 0xfff0d8, 0xd8e8ff, 0xffa040], C = new THREE.Color(), size = o.size ?? 2.2, key = `cl:${size}:${!!o.reflect}`;
  let acc = k.bag.get(key) as { pos: number[]; col: number[] } | undefined;
  if (!acc) {
    acc = { pos: [], col: [] }; k.bag.set(key, acc); const A = acc;
    k.beforeFinish(() => {
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(A.pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(A.col, 3));
      const m = k.mats.own(new THREE.PointsMaterial({ size, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
      const p = new THREE.Points(g, m); p.frustumCulled = false; k.group.add(p); if (o.reflect) reflect(p);
    });
  }
  const base = acc.pos.length / 3;
  pts.forEach((p, i) => { acc!.pos.push(p[0], p[1], p[2]); C.set(pal[Math.floor(hash(base + i, 7) * pal.length)]).multiplyScalar((o.intensity ?? 3) * (0.5 + hash(base + i, 9))); acc!.col.push(C.r, C.g, C.b); });
}

/** wood fire: crossed logs, stones, licking flames (additive cards), embers; flickering light + pool */
export function fire(k: SceneKit, at: V3, o: { light?: boolean; scale?: number } = {}) {
  const s = o.scale ?? 1, b = k.b, [x, y, z] = at;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; b.add(new THREE.DodecahedronGeometry(0.16 * s, 0), "stone", 0x6a6460, mat4(x + Math.cos(a) * 0.55 * s, y + 0.06, z + Math.sin(a) * 0.55 * s, a), false); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI + 0.3; b.add(cyl(0.06 * s, 0.07 * s, 0.9 * s, 6), "bark", 0x4a3424, mat4(x, y + 0.15 * s, z, a, Math.PI / 2 - 0.35, 0), false); }
  b.add(new THREE.CircleGeometry(0.45 * s, 12).rotateX(-Math.PI / 2), "glow", 0xff6a1a, mat4(x, y + 0.03, z), false, 2.2);
  const flameTex = canvasTex("flame", 64, 128, (g) => { const gr = g.createRadialGradient(32, 100, 2, 32, 80, 60); gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.3, "rgba(255,170,60,0.9)"); gr.addColorStop(0.7, "rgba(220,70,10,0.4)"); gr.addColorStop(1, "rgba(120,20,0,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(58, 60, 60, 110, 32, 124); g.bezierCurveTo(4, 110, 6, 60, 32, 4); g.fill(); });
  const fm = k.mats.own(new THREE.MeshBasicMaterial({ map: flameTex, color: new THREE.Color(2.4, 1.6, 1.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const flames: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.55 * s, 1.0 * s).translate(0, 0.5 * s, 0), fm); f.position.set(x, y + 0.08, z); f.rotation.y = (i / 3) * Math.PI; k.group.add(f); flames.push(f); }
  const L = o.light !== false ? k.light("point", [x, y + 0.9 * s, z], 0xff9a48, 9 * s, 14 * s) : null;
  k.mats.pool([x, y + 0.6, z], 6.5 * s, 0xff8a3a, 1.4);
  k.on((t) => {
    const fl = 0.75 + 0.25 * Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1.2) + 0.1 * Math.sin(t * 23.0);
    flames.forEach((f, i) => { f.scale.set(1 + 0.1 * Math.sin(t * 9 + i), fl * (0.85 + 0.2 * Math.sin(t * 11 + i * 2)), 1); });
    if (L) L.intensity = 9 * s * fl;
  });
}
