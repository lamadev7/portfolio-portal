import * as THREE from "three";

/* curved East-Asian roofs: concave slopes that flatten toward the eaves, corners that sweep up.
   One generator covers a full hip roof (inner rectangle collapsed to a ridge) and a pent/skirt roof (inner rectangle
   = the wall line), so a double-eave hall is two calls. */

export interface CurvedRoofOpts {
  /** half extents of the eave line */
  A: number; B: number;
  /** half extents of the top edge (ridge: b = 0) */
  a: number; b: number;
  rise: number; lift?: number; curve?: number; segU?: number; segT?: number; thick?: number;
}

export function curvedRoof(o: CurvedRoofOpts) {
  const su = o.segU ?? 14, st = o.segT ?? 7, lift = o.lift ?? 0.6, cur = o.curve ?? 1.7, th = o.thick ?? 0.18;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const face = (E0: THREE.Vector3, E1: THREE.Vector3, T0: THREE.Vector3, T1: THREE.Vector3, len: number, under: boolean) => {
    const base = pos.length / 3;
    for (let j = 0; j <= st; j++) for (let i = 0; i <= su; i++) {
      const u = i / su, t = j / st, e = E0.clone().lerp(E1, u), tp = T0.clone().lerp(T1, u), p = e.clone().lerp(tp, t);
      p.y = o.rise * Math.pow(t, cur) + lift * Math.pow(Math.abs(u - 0.5) * 2, 4) * Math.pow(1 - t, 2) - (under ? th : 0);
      pos.push(p.x, p.y, p.z); uv.push(u * len, t * Math.hypot(o.rise, Math.max(o.A - o.a, o.B - o.b)));
    }
    for (let j = 0; j < st; j++) for (let i = 0; i < su; i++) { const a = base + j * (su + 1) + i, b = a + 1, c = a + su + 1, d = c + 1; under ? idx.push(a, c, b, b, c, d) : idx.push(a, b, c, b, d, c); }
  };
  const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
  for (const under of [false, true]) {
    face(V(-o.A, o.B), V(o.A, o.B), V(-o.a, o.b), V(o.a, o.b), 2 * o.A, under);
    face(V(o.A, -o.B), V(-o.A, -o.B), V(o.a, -o.b), V(-o.a, -o.b), 2 * o.A, under);
    face(V(o.A, o.B), V(o.A, -o.B), V(o.a, o.b), V(o.a, -o.b), 2 * o.B, under);
    face(V(-o.A, -o.B), V(-o.A, o.B), V(-o.a, -o.b), V(-o.a, o.b), 2 * o.B, under);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** points along the four hip lines (for ridge rolls) */
export function hipLines(o: CurvedRoofOpts, n = 8) {
  const lines: THREE.Vector3[][] = [], lift = o.lift ?? 0.6, cur = o.curve ?? 1.7;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= n; j++) { const t = j / n; pts.push(new THREE.Vector3(sx * (o.A + (o.a - o.A) * t), o.rise * Math.pow(t, cur) + lift * Math.pow(1 - t, 2) + 0.06, sz * (o.B + (o.b - o.B) * t))); }
    lines.push(pts);
  }
  return lines;
}
