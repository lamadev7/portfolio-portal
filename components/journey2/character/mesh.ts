import * as THREE from "three";

/* Geometry kernels for clothing: weld the body, clip it by a scalar field (exact hems), offset + smooth into a skinned shell with folded-back rims.
   All in bind space; shells reuse the body's joints so cloth follows the skin without simulation. */

export interface WMesh {
  n: number;
  P: Float32Array;
  N: Float32Array;
  J: Uint16Array;
  W: Float32Array;
  T: Uint32Array;
  /** original vertex -> welded vertex */
  map: Int32Array;
  /** field value per vertex (clip output) */
  F?: Float32Array;
}

export function weld(g: THREE.BufferGeometry): WMesh {
  const P0 = g.getAttribute("position"), N0 = g.getAttribute("normal"), J0 = g.getAttribute("skinIndex"), W0 = g.getAttribute("skinWeight");
  const n0 = P0.count, map = new Int32Array(n0), key = new Map<string, number>();
  const P: number[] = [], N: number[] = [], J: number[] = [], W: number[] = [];
  for (let i = 0; i < n0; i++) {
    const x = P0.getX(i), y = P0.getY(i), z = P0.getZ(i);
    const k = `${Math.round(x * 2e4)},${Math.round(y * 2e4)},${Math.round(z * 2e4)}`;
    let w = key.get(k);
    if (w === undefined) {
      w = P.length / 3; key.set(k, w);
      P.push(x, y, z); N.push(0, 0, 0);
      for (let j = 0; j < 4; j++) { J.push((J0 as THREE.BufferAttribute).getComponent(i, j)); W.push((W0 as THREE.BufferAttribute).getComponent(i, j)); }
    }
    N[w * 3] += N0.getX(i); N[w * 3 + 1] += N0.getY(i); N[w * 3 + 2] += N0.getZ(i);
    map[i] = w;
  }
  const n = P.length / 3, Nf = new Float32Array(N);
  for (let i = 0; i < n; i++) { const l = Math.hypot(Nf[i * 3], Nf[i * 3 + 1], Nf[i * 3 + 2]) || 1; Nf[i * 3] /= l; Nf[i * 3 + 1] /= l; Nf[i * 3 + 2] /= l; }
  const idx = g.index!;
  const T = new Uint32Array(idx.count);
  for (let i = 0; i < idx.count; i++) T[i] = map[idx.getX(i)];
  return { n, P: new Float32Array(P), N: Nf, J: new Uint16Array(J), W: new Float32Array(W), T, map };
}

function mixSkin(J: Uint16Array, W: Float32Array, a: number, b: number, t: number, outJ: number[], outW: number[]) {
  const acc = new Map<number, number>();
  for (let j = 0; j < 4; j++) {
    const wa = W[a * 4 + j] * (1 - t), wb = W[b * 4 + j] * t;
    if (wa > 0) acc.set(J[a * 4 + j], (acc.get(J[a * 4 + j]) ?? 0) + wa);
    if (wb > 0) acc.set(J[b * 4 + j], (acc.get(J[b * 4 + j]) ?? 0) + wb);
  }
  const top = [...acc.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
  const s = top.reduce((q, e) => q + e[1], 0) || 1;
  for (let j = 0; j < 4; j++) { outJ.push(top[j]?.[0] ?? 0); outW.push((top[j]?.[1] ?? 0) / s); }
}

/** keep the part of the welded mesh where f >= 0; triangles crossing the iso-line are cut exactly, cut vertices shared so loops stay watertight */
export function clip(m: WMesh, f: Float32Array): WMesh {
  const P: number[] = [], N: number[] = [], J: number[] = [], W: number[] = [], F: number[] = [], T: number[] = [];
  const vmap = new Int32Array(m.n).fill(-1), emap = new Map<number, number>();
  const keepV = (i: number) => {
    if (vmap[i] >= 0) return vmap[i];
    vmap[i] = P.length / 3;
    P.push(m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]); N.push(m.N[i * 3], m.N[i * 3 + 1], m.N[i * 3 + 2]);
    for (let j = 0; j < 4; j++) { J.push(m.J[i * 4 + j]); W.push(m.W[i * 4 + j]); }
    F.push(f[i]);
    return vmap[i];
  };
  const cutV = (a: number, b: number) => {
    const k = a < b ? a * m.n + b : b * m.n + a;
    let v = emap.get(k);
    if (v !== undefined) return v;
    const t = f[a] / (f[a] - f[b]);
    v = P.length / 3; emap.set(k, v);
    const nx = m.N[a * 3] * (1 - t) + m.N[b * 3] * t, ny = m.N[a * 3 + 1] * (1 - t) + m.N[b * 3 + 1] * t, nz = m.N[a * 3 + 2] * (1 - t) + m.N[b * 3 + 2] * t, l = Math.hypot(nx, ny, nz) || 1;
    P.push(m.P[a * 3] + (m.P[b * 3] - m.P[a * 3]) * t, m.P[a * 3 + 1] + (m.P[b * 3 + 1] - m.P[a * 3 + 1]) * t, m.P[a * 3 + 2] + (m.P[b * 3 + 2] - m.P[a * 3 + 2]) * t);
    N.push(nx / l, ny / l, nz / l);
    mixSkin(m.J, m.W, a, b, t, J, W);
    F.push(0);
    return v;
  };
  for (let t = 0; t < m.T.length; t += 3) {
    const tri = [m.T[t], m.T[t + 1], m.T[t + 2]];
    const ins = tri.map((i) => f[i] >= 0);
    const c = ins.filter(Boolean).length;
    if (c === 0) continue;
    if (c === 3) { T.push(keepV(tri[0]), keepV(tri[1]), keepV(tri[2])); continue; }
    const poly: number[] = [];
    for (let e = 0; e < 3; e++) {
      const a = tri[e], b = tri[(e + 1) % 3];
      if (ins[e]) poly.push(keepV(a));
      if (ins[e] !== ins[(e + 1) % 3]) poly.push(cutV(a, b));
    }
    for (let k = 1; k + 1 < poly.length; k++) T.push(poly[0], poly[k], poly[k + 1]);
  }
  return { n: P.length / 3, P: new Float32Array(P), N: new Float32Array(N), J: new Uint16Array(J), W: new Float32Array(W), T: new Uint32Array(T), map: vmap, F: new Float32Array(F) };
}

function adjacency(n: number, T: Uint32Array) {
  const sets: Set<number>[] = Array.from({ length: n }, () => new Set());
  const edges = new Map<number, number>();
  for (let t = 0; t < T.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = T[t + e], b = T[t + ((e + 1) % 3)];
    sets[a].add(b); sets[b].add(a);
    const k = a < b ? a * n + b : b * n + a;
    edges.set(k, (edges.get(k) ?? 0) + 1);
  }
  const border = new Uint8Array(n);
  const bset: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (const [k, c] of edges) if (c === 1) { const a = Math.floor(k / n), b = k % n; border[a] = border[b] = 1; bset[a].add(b); bset[b].add(a); }
  return { nb: sets.map((s) => [...s]), border, bnb: bset.map((s) => [...s]) };
}

function smoothPass(P: Float32Array, nb: number[][], border: Uint8Array, bnb: number[][], lam: number, pin?: Uint8Array) {
  const n = P.length / 3, Q = new Float32Array(P);
  for (let i = 0; i < n; i++) {
    if (pin && pin[i]) continue;
    const L = border[i] ? bnb[i] : nb[i];
    if (!L.length) continue;
    let x = 0, y = 0, z = 0;
    for (const j of L) { x += P[j * 3]; y += P[j * 3 + 1]; z += P[j * 3 + 2]; }
    x /= L.length; y /= L.length; z /= L.length;
    Q[i * 3] += (x - P[i * 3]) * lam; Q[i * 3 + 1] += (y - P[i * 3 + 1]) * lam; Q[i * 3 + 2] += (z - P[i * 3 + 2]) * lam;
  }
  P.set(Q);
}

export interface ShellOpt {
  /** offset along the body normal per vertex (metres) */
  t: (i: number, p: THREE.Vector3, f: number) => number;
  smooth?: number;
  wsmooth?: number;
  /** fold the hem back to just under the skin */
  rim?: boolean;
  minT?: number;
}

const _v = new THREE.Vector3();

/** offset a clipped region into a cloth shell; returns an indexed skinned geometry (position = bind space) */
export function shell(r: WMesh, o: ShellOpt): THREE.BufferGeometry {
  const n = r.n, P = new Float32Array(n * 3), T0 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    _v.set(r.P[i * 3], r.P[i * 3 + 1], r.P[i * 3 + 2]);
    const t = o.t(i, _v, r.F ? r.F[i] : 1);
    T0[i] = t;
    for (let k = 0; k < 3; k++) P[i * 3 + k] = r.P[i * 3 + k] + r.N[i * 3 + k] * t;
  }
  const { nb, border, bnb } = adjacency(n, r.T);
  for (let s = 0; s < (o.smooth ?? 6); s++) { smoothPass(P, nb, border, bnb, 0.55); smoothPass(P, nb, border, bnb, -0.58); }
  const minT = o.minT ?? 0.002;
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let k = 0; k < 3; k++) d += (P[i * 3 + k] - r.P[i * 3 + k]) * r.N[i * 3 + k];
    const need = Math.min(minT, T0[i]) - d;
    if (need > 0) for (let k = 0; k < 3; k++) P[i * 3 + k] += r.N[i * 3 + k] * need;
  }
  let J = r.J, W = r.W;
  for (let s = 0; s < (o.wsmooth ?? 2); s++) {
    const J2 = new Uint16Array(J.length), W2 = new Float32Array(W.length);
    for (let i = 0; i < n; i++) {
      const acc = new Map<number, number>();
      const add = (v: number, w: number) => { for (let j = 0; j < 4; j++) if (W[v * 4 + j] > 0) acc.set(J[v * 4 + j], (acc.get(J[v * 4 + j]) ?? 0) + W[v * 4 + j] * w); };
      add(i, 2);
      for (const j of nb[i]) add(j, 1 / Math.max(1, nb[i].length) * 2);
      const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((q, e) => q + e[1], 0) || 1;
      for (let j = 0; j < 4; j++) { J2[i * 4 + j] = top[j]?.[0] ?? 0; W2[i * 4 + j] = (top[j]?.[1] ?? 0) / sum; }
    }
    J = J2; W = W2;
  }
  const pos: number[] = Array.from(P), si: number[] = Array.from(J), sw: number[] = Array.from(W), idx: number[] = Array.from(r.T);
  if (o.rim !== false) {
    for (let t = 0; t < r.T.length; t += 3) for (let e = 0; e < 3; e++) {
      const a = r.T[t + e], b = r.T[t + ((e + 1) % 3)];
      if (!(border[a] && border[b] && bnb[a].includes(b))) continue;
      const base = pos.length / 3;
      const push = (v: number, inner: boolean) => {
        if (inner) pos.push(r.P[v * 3] - r.N[v * 3] * 0.003, r.P[v * 3 + 1] - r.N[v * 3 + 1] * 0.003, r.P[v * 3 + 2] - r.N[v * 3 + 2] * 0.003);
        else pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
        for (let j = 0; j < 4; j++) { si.push(J[v * 4 + j]); sw.push(W[v * 4 + j]); }
      };
      push(a, false); push(b, false); push(b, true); push(a, true);
      idx.push(base, base + 3, base + 2, base, base + 2, base + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** body triangles to keep: drop those fully inside any hiding field (f > margin at all three corners) */
export function maskBody(g: THREE.BufferGeometry, wm: WMesh, fields: Float32Array[], margin = 0.01): THREE.BufferGeometry {
  const idx = g.index!, keep: number[] = [];
  for (let t = 0; t < idx.count; t += 3) {
    const a = wm.map[idx.getX(t)], b = wm.map[idx.getX(t + 1)], c = wm.map[idx.getX(t + 2)];
    let hidden = false;
    for (const f of fields) if (f[a] > margin && f[b] > margin && f[c] > margin) { hidden = true; break; }
    if (!hidden) keep.push(idx.getX(t), idx.getX(t + 1), idx.getX(t + 2));
  }
  const out = g.clone();
  out.setIndex(keep);
  return out;
}

/** a rigid part skinned to one bone (bind space) */
export function rigid(g: THREE.BufferGeometry, bone: number) {
  const n = g.getAttribute("position").count;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = bone; sw[i * 4] = 1; }
  const out = g.index ? g : g;
  out.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4));
  out.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
  for (const k of Object.keys(out.attributes)) if (!["position", "normal", "uv", "skinIndex", "skinWeight"].includes(k)) out.deleteAttribute(k);
  return out;
}

/** merge skinned geometries; each part gets a constant `aPart` (material slot) and keeps uv (zeros when missing) */
export function mergeSkinned(parts: { g: THREE.BufferGeometry; slot: number }[]): THREE.BufferGeometry {
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.g.getAttribute("position").count; ni += p.g.index ? p.g.index.count : p.g.getAttribute("position").count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), slot = new Float32Array(nv);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let ov = 0, oi = 0;
  for (const p of parts) {
    const g = p.g, P = g.getAttribute("position"), N = g.getAttribute("normal"), U = g.getAttribute("uv"), J = g.getAttribute("skinIndex"), W = g.getAttribute("skinWeight"), A = g.getAttribute("aPart"), n = P.count;
    for (let i = 0; i < n; i++) {
      const o = ov + i;
      pos[o * 3] = P.getX(i); pos[o * 3 + 1] = P.getY(i); pos[o * 3 + 2] = P.getZ(i);
      if (N) { nor[o * 3] = N.getX(i); nor[o * 3 + 1] = N.getY(i); nor[o * 3 + 2] = N.getZ(i); }
      if (U) { uv[o * 2] = U.getX(i); uv[o * 2 + 1] = U.getY(i); }
      for (let j = 0; j < 4; j++) { si[o * 4 + j] = (J as THREE.BufferAttribute).getComponent(i, j); sw[o * 4 + j] = (W as THREE.BufferAttribute).getComponent(i, j); }
      slot[o] = p.slot + (A ? A.getX(i) : 0);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[oi++] = g.index.getX(i) + ov;
    else for (let i = 0; i < n; i++) idx[oi++] = i + ov;
    ov += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4));
  out.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
  out.setAttribute("aPart", new THREE.BufferAttribute(slot, 1));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
