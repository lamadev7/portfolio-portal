import * as THREE from "three";
import type { SceneKit } from "./scene";

/* A ram-air paraglider: arched canopy of inflated cells (top skin bulges between ribs, flatter bottom skin, open
   cell mouths along the leading edge), A/B/C line cascades to two risers at the harness. `set(0)` = flying,
   `set(1)` = collapsed in a crescent on the ground behind the pilot, skins deflated into folds, lines lying in a fan.
   Local frame: pilot's harness at the origin, flying toward +z. */

export interface Glider { root: THREE.Group; set(t: number): void; dispose(): void }

export function makeGlider(k: SceneKit, colors: number[], o: { span?: number; lights?: boolean; seed?: number } = {}): Glider {
  const span = o.span ?? 10.5, chord = 2.7, cells = 22, nu = cells * 2, nv = 9, root = new THREE.Group(), sd = o.seed ?? 1;
  const fly: number[] = [], land: number[] = [], col: number[] = [], idx: number[] = [], C = new THREE.Color();
  const H = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7 + sd * 17.3) * 43758.5453; return n - Math.floor(n); };
  const R = span / 2.05, lineLen = 7.2;
  /* surface 0 = top skin, 1 = bottom skin */
  for (let s = 0; s < 2; s++) for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu - 0.5, v = j / nv, a = u * 2.05, cellF = (i % 2) / 1, c = chord * (1 - 0.5 * Math.pow(Math.abs(u) * 2, 2.4));
    const thick = c * 0.13 * Math.sin(Math.PI * Math.pow(v, 0.7)) * (1 - 0.35 * Math.abs(u) * 2);
    const bulge = s === 0 ? thick * (0.55 + 0.45 * cellF) : -thick * 0.25 * (0.6 + 0.4 * cellF);
    const r = R - bulge;
    fly.push(Math.sin(a) * r, lineLen + (Math.cos(a) - 1) * R + bulge * Math.cos(a) * 0.4 + (s === 0 ? 0 : 0), 0.35 + (0.42 - v) * c);
    /* collapsed: crescent on the ground behind the pilot, leading edge toward him, skins folded and heaped */
    const ca = u * 2.3, cr = 5.2 + v * c * 0.9, fold = Math.abs(Math.sin(i * 0.5 * Math.PI + j * 0.9)) * 0.12 + H(i, j) * 0.07;
    const heap = 0.28 * Math.exp(-Math.pow(u * 3.2, 2)) * Math.sin(Math.PI * v) + 0.12 * Math.exp(-Math.pow((u - 0.28) * 6, 2));
    land.push(Math.sin(ca) * cr * 0.92 + (H(j, i) - 0.5) * 0.12, 0.04 + (s === 0 ? fold + heap : 0.01 + heap * 0.6), -Math.cos(ca) * cr + 2.8 + (H(i + 7, j) - 0.5) * 0.12);
    const band = Math.floor((u + 0.5) * cells * 0.999);
    C.set(colors[(band + Math.floor(band / 3)) % colors.length]);
    if (s === 1) C.multiplyScalar(0.7); else if (j === 0) C.multiplyScalar(0.55);
    if (s === 0 && cellF) C.multiplyScalar(1.06);
    col.push(C.r, C.g, C.b);
  }
  const per = (nu + 1) * (nv + 1);
  for (let s = 0; s < 2; s++) for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = s * per + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    s === 0 ? idx.push(a, b, c, b, d, c) : idx.push(a, c, b, b, c, d);
  }
  /* the open cell mouths: dark band joining top and bottom skins along the leading edge */
  for (let i = 0; i < nu; i++) { const t0 = i, b0 = per + i; idx.push(t0, b0, t0 + 1, t0 + 1, b0, b0 + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(fly.slice(), 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(per * 2 * 2), 2)); g.setIndex(idx); g.computeVertexNormals();
  const clothMat = k.mats.get("cloth"); const wing = new THREE.Mesh(g, clothMat); wing.castShadow = true; wing.receiveShadow = true; wing.frustumCulled = false; root.add(wing);

  /* line cascades: A/B/C rows on every second rib, gathered to two risers */
  const att: number[] = [];
  for (let i = 0; i <= nu; i += 2) for (const j of [1, 4, 7]) att.push(per + j * (nu + 1) + i);
  const lp = new Float32Array(att.length * 6), lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  const lines = new THREE.LineSegments(lg, k.mats.own(new THREE.LineBasicMaterial({ color: 0x5a5a62, transparent: true, opacity: 0.28 }))); lines.frustumCulled = false; root.add(lines);
  const tips: THREE.Mesh[] = [];
  if (o.lights) for (const [sx, c] of [[-1, new THREE.Color(4, 0.5, 0.4)], [1, new THREE.Color(0.4, 4, 0.6)]] as const) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), k.mats.own(new THREE.MeshBasicMaterial({ color: c }))); m.position.set(sx * (R * Math.sin(1.025) - 0.1), lineLen + (Math.cos(1.025) - 1) * R, 0.35); root.add(m); tips.push(m); }
  const P = g.attributes.position as THREE.BufferAttribute;
  let last = -1;
  const api: Glider = {
    root,
    set(t) {
      if (Math.abs(t - last) < 1e-4) return; last = t;
      const e = t * t * (3 - 2 * t), sag = Math.sin(e * Math.PI) * 1.6;
      for (let q = 0; q < P.count; q++) {
        /* the canopy sinks and drifts back before it settles */
        const f = Math.min(1, e * (1.15 - 0.3 * ((q % (nu + 1)) / nu - 0.5) ** 2 * 4));
        P.setXYZ(q, fly[q * 3] + (land[q * 3] - fly[q * 3]) * f, fly[q * 3 + 1] + (land[q * 3 + 1] - fly[q * 3 + 1]) * f + sag * (1 - f) * 0.2, fly[q * 3 + 2] + (land[q * 3 + 2] - fly[q * 3 + 2]) * f - sag * 0.6);
      }
      P.needsUpdate = true; g.computeVertexNormals();
      att.forEach((vi, n) => {
        const side = P.getX(vi) < 0 ? -1 : 1, rx = side * 0.22 * (1 - e) + side * 0.15 * e, ry = 1.25 * (1 - e) + 0.08 * e;
        lp[n * 6] = rx; lp[n * 6 + 1] = ry; lp[n * 6 + 2] = -0.1 * e;
        /* on the ground the lines lie flat between harness and leading edge */
        lp[n * 6 + 3] = P.getX(vi); lp[n * 6 + 4] = e > 0.9 ? 0.05 : P.getY(vi); lp[n * 6 + 5] = P.getZ(vi);
      });
      (lg.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      tips.forEach((m) => (m.visible = e < 0.2));
    },
    dispose() { g.dispose(); lg.dispose(); },
  };
  api.set(0);
  return api;
}
