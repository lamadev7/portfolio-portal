import * as THREE from "three";
import type { Mats } from "./mat";
import { canvasTex, rng } from "./tex";

/* tall grass as crossed alpha cards (kans / elephant grass with white plumes, reeds, wild grass): dense from any
   distance for a few triangles each; tips sway in the wind. Instanced per region so frustum culling works. */

export type TussockKind = "kans" | "reed" | "wild";

function cardTex(kind: TussockKind) {
  return canvasTex("tussock-" + kind, 512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); const R = rng(kind.length * 17 + 3);
    const n = kind === "wild" ? 160 : 120;
    for (let i = 0; i < n; i++) {
      const x0 = w * (0.3 + R() * 0.4), lean = (R() - 0.5) * w * 0.7, top = h * (kind === "wild" ? 0.25 + R() * 0.5 : 0.05 + R() * 0.35), bw = kind === "reed" ? 3 : 2 + R() * 2.5;
      const hue = kind === "kans" ? 62 + R() * 22 : kind === "reed" ? 70 + R() * 20 : 75 + R() * 25, lt = 22 + R() * 22;
      g.strokeStyle = `hsl(${hue},${30 + R() * 25}%,${lt}%)`; g.lineWidth = bw; g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0 + lean * 0.3, (h + top) / 2, x0 + lean, top); g.stroke();
      if (kind !== "wild" && R() < (kind === "kans" ? 0.45 : 0.3)) {
        /* feathery plume */
        const px = x0 + lean, py = top;
        for (let j = 0; j < 26; j++) { const a = -Math.PI / 2 + (R() - 0.5) * 1.3 + lean / w, L = 10 + R() * (kind === "kans" ? 46 : 24); g.strokeStyle = kind === "kans" ? `rgba(236,232,220,${0.35 + R() * 0.4})` : `rgba(150,120,80,${0.5 + R() * 0.4})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(px, py + 18); g.lineTo(px + Math.cos(a) * L * 0.5, py + 18 + Math.sin(a) * L); g.stroke(); }
      }
    }
  });
}

export interface TussockAt { x: number; y: number; z: number; h: number; w?: number; yaw?: number; tint?: number }

export class Tussocks {
  readonly group = new THREE.Group();
  private geo: THREE.BufferGeometry;
  constructor(mats: Mats, kind: TussockKind, list: TussockAt[], o: { cell?: number; shadow?: boolean } = {}) {
    /* three crossed vertical cards, base at y = 0, height 1, width 1 */
    const parts: number[] = [], uvs: number[] = [], nor: number[] = [], idx: number[] = [];
    for (let c = 0; c < 3; c++) {
      const a = (c / 3) * Math.PI, cx = Math.cos(a) * 0.5, cz = Math.sin(a) * 0.5, b = parts.length / 3;
      parts.push(-cx, 0, -cz, cx, 0, cz, -cx * 1.2, 1, -cz * 1.2, cx * 1.2, 1, cz * 1.2); uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
      for (let v = 0; v < 4; v++) nor.push(0, 1, 0);
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(parts, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array((parts.length / 3) * 3).fill(1), 3));
    this.geo = g;
    const m = mats.own(new THREE.MeshStandardMaterial({ map: cardTex(kind), alphaTest: 0.42, side: THREE.DoubleSide, vertexColors: true, roughness: 0.85 }));
    mats.enhance(m, [(sh) => {
      sh.uniforms.uTime = mats.time;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace("#include <begin_vertex>", `#include <begin_vertex>
{ vec3 base = vec3(0.0);
#ifdef USE_INSTANCING
  base = instanceMatrix[3].xyz;
#endif
  float t = position.y; float gust = sin(uTime * 0.5 + base.x * 0.04 + base.z * 0.03) * 0.5 + 0.5;
  float w = (sin(uTime * 1.6 + base.x * 0.35 + base.z * 0.27) * 0.6 + sin(uTime * 2.9 + base.x * 0.9) * 0.25) * (0.35 + 0.65 * gust);
  transformed.x += w * t * t * 0.16; transformed.z += w * t * t * 0.09; }`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\nnormal = normalize(vNormal);");
    }], "tussock-" + kind);
    const cell = o.cell ?? 40, cells = new Map<string, TussockAt[]>();
    for (const t of list) { const key = Math.floor(t.x / cell) + "," + Math.floor(t.z / cell); (cells.get(key) || cells.set(key, []).get(key)!).push(t); }
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), C = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
    cells.forEach((ts) => {
      const im = new THREE.InstancedMesh(g, m, ts.length);
      ts.forEach((t, i) => { const w = t.w ?? t.h * 0.6; M.compose(p.set(t.x, t.y, t.z), q.setFromAxisAngle(Y, t.yaw ?? (i * 2.399) % 6.283), s.set(w, t.h, w)); im.setMatrixAt(i, M); im.setColorAt(i, C.set(t.tint ?? 0xffffff)); });
      im.castShadow = !!o.shadow; im.receiveShadow = true; im.computeBoundingSphere(); this.group.add(im);
    });
  }
  dispose() { this.geo.dispose(); }
}
