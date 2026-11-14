import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { canvasTex, hash } from "./tex";
import { catenary, tube } from "./geo";
import type { SceneKit } from "./scene";

/* cloth that moves: prayer-flag strings (lung ta) and pole flags, flutter computed per vertex from how far it is
   from its attached edge, layered travelling waves and gusts */

const COLORS = [0x2a5fd0, 0xf2f2ee, 0xd8322a, 0x2f9a4a, 0xf2c41c];

const printTex = () => canvasTex("flagPrint", 128, 128, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.ellipse(64, 56, 22, 16, 0, 0, 6.283); g.fill();
  g.font = "9px serif"; for (let r = 0; r < 9; r++) g.fillText("ༀ་མ་ཎི་པ་དྨེ་ཧཱུྃ ཨོཾ་", 4 + (r % 2) * 6, 10 + r * 13);
  g.fillStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
});

export function nepalFlagTex() {
  return canvasTex("flagNepal", 256, 320, (g) => {
    g.clearRect(0, 0, 256, 320);
    const P = (pts: [number, number][]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    const shape: [number, number][] = [[0, 0], [240, 140], [96, 140], [240, 316], [0, 316]];
    g.fillStyle = "#1f3f9a"; P(shape); g.fill();
    g.save(); g.translate(14, 18); g.scale(0.86, 0.9); g.fillStyle = "#d1202f"; P(shape); g.fill(); g.restore();
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(62, 92, 26, 0, Math.PI); g.arc(62, 86, 20, Math.PI, 0, true); g.fill();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; g.beginPath(); g.moveTo(62 + Math.cos(a) * 16, 104 - Math.sin(a) * 6); g.lineTo(62 + Math.cos(a + 0.2) * 24, 104 + Math.sin(a + 0.2) * 2); g.lineTo(62 + Math.cos(a + 0.4) * 16, 104 - Math.sin(a + 0.4) * 6); g.fill(); }
    g.beginPath(); g.arc(62, 236, 22, 0, 6.283); g.fill();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(62 + Math.cos(a) * 20, 236 + Math.sin(a) * 20); g.lineTo(62 + Math.cos(a + 0.26) * 34, 236 + Math.sin(a + 0.26) * 34); g.lineTo(62 + Math.cos(a + 0.52) * 20, 236 + Math.sin(a + 0.52) * 20); g.fill(); }
  });
}

function clothMaterial(k: SceneKit, map: THREE.Texture, alpha: boolean, key: string) {
  const m = k.mats.own(new THREE.MeshStandardMaterial({ map, roughness: 0.92, side: THREE.DoubleSide, vertexColors: true, alphaTest: alpha ? 0.5 : 0 }));
  k.mats.enhance(m, [(sh) => {
    sh.uniforms.uTime = k.mats.time;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 fl; attribute vec3 fn; uniform float uTime;").replace("#include <begin_vertex>", `#include <begin_vertex>
{ float f = fl.x, ph = fl.y, amp = fl.z;
  float gust = 0.55 + 0.45 * sin(uTime * 0.7 + ph * 0.3);
  float w = sin(uTime * 7.0 - f * 6.0 + ph) * 0.6 + sin(uTime * 11.3 - f * 9.0 + ph * 1.7) * 0.25 + sin(uTime * 2.1 + ph) * 0.4;
  transformed += fn * (w * amp * f * gust * 0.12);
  transformed.y += (sin(uTime * 5.3 - f * 5.0 + ph) * 0.03 - 0.02) * amp * f; }`);
  }], key);
  return m;
}

/** one string of prayer flags between a and b (blue-white-red-green-yellow repeating), flags hang below the rope */
export function prayerFlags(k: SceneKit, a: THREE.Vector3, b: THREE.Vector3, o: { sag?: number; size?: number; gap?: number; seed?: number } = {}): void {
  const sag = o.sag ?? a.distanceTo(b) * 0.06, size = o.size ?? 0.32, gap = o.gap ?? 0.06;
  const pts = catenary(a, b, sag, 24), curve = new THREE.CatmullRomCurve3(pts), L = curve.getLength(), n = Math.floor(L / (size + gap));
  const parts: THREE.BufferGeometry[] = [], C = new THREE.Color();
  const dir = b.clone().sub(a).setY(0).normalize(), fn = new THREE.Vector3(-dir.z, 0, dir.x);
  for (let i = 0; i < n; i++) {
    const t0 = (i * (size + gap) + gap / 2) / L, t1 = t0 + size / L, p0 = curve.getPointAt(Math.min(1, t0)), p1 = curve.getPointAt(Math.min(1, t1));
    const g = new THREE.PlaneGeometry(1, 1, 2, 3), pos = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
    const fl = new Float32Array(pos.count * 3), fnA = new Float32Array(pos.count * 3), col = new Float32Array(pos.count * 3), ph = hash(i, o.seed ?? 1) * 6.283;
    C.set(COLORS[i % 5]);
    for (let v = 0; v < pos.count; v++) {
      const u = pos.getX(v) + 0.5, d = 0.5 - pos.getY(v), top = p0.clone().lerp(p1, u);
      pos.setXYZ(v, top.x, top.y - d * size * 1.15, top.z); uv.setXY(v, u, 1 - d);
      fl[v * 3] = d; fl[v * 3 + 1] = ph + u * 0.8; fl[v * 3 + 2] = 1; fnA.set([fn.x, 0, fn.z], v * 3); col.set([C.r, C.g, C.b], v * 3);
    }
    g.setAttribute("fl", new THREE.BufferAttribute(fl, 3)); g.setAttribute("fn", new THREE.BufferAttribute(fnA, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    parts.push(g);
  }
  /* all strings of a scene merge into one cloth mesh (built at finish); ropes go into the static batch */
  let acc = k.bag.get("prayerFlags") as THREE.BufferGeometry[] | undefined;
  if (!acc) {
    acc = []; k.bag.set("prayerFlags", acc);
    const list = acc;
    k.beforeFinish(() => {
      const geo = mergeGeometries(list)!; list.forEach((p) => p.dispose());
      const mesh = new THREE.Mesh(geo, clothMaterial(k, printTex(), false, "prayer")); mesh.castShadow = false; mesh.receiveShadow = true; mesh.frustumCulled = false; k.group.add(mesh);
    });
  }
  acc.push(...parts);
  k.b.add(tube(pts, 0.006, 24, 3), "matte", 0x8a8a8a, undefined, false);
}

/** a flag on a pole; hoist at the pole, fly end free */
export function poleFlag(k: SceneKit, base: THREE.Vector3, poleH: number, tex: THREE.Texture, w: number, h: number, yaw = 0) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, poleH, 8).translate(0, poleH / 2, 0), k.mats.get("metal"));
  pole.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pole.geometry.attributes.position.count * 3).fill(0.8), 3));
  pole.position.copy(base); pole.castShadow = true; k.group.add(pole);
  const g = new THREE.PlaneGeometry(w, h, 10, 6); g.translate(w / 2 + 0.04, poleH - h / 2 - 0.1, 0);
  const pos = g.attributes.position as THREE.BufferAttribute, fl = new Float32Array(pos.count * 3), fnA = new Float32Array(pos.count * 3), col = new Float32Array(pos.count * 3).fill(1);
  for (let v = 0; v < pos.count; v++) { fl[v * 3] = Math.max(0, pos.getX(v) - 0.04) / w; fl[v * 3 + 1] = 0; fl[v * 3 + 2] = 2.2; fnA[v * 3 + 2] = 1; }
  g.setAttribute("fl", new THREE.BufferAttribute(fl, 3)); g.setAttribute("fn", new THREE.BufferAttribute(fnA, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, clothMaterial(k, tex, true, "poleflag")); m.position.copy(base); m.rotation.y = yaw; m.castShadow = true; k.group.add(m);
  return m;
}
