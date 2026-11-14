import * as THREE from "three";
import { fbm } from "./ground";
import type { SceneKit } from "./scene";
import { reflect } from "./mirror";

/* distant mountains as scaled backdrop massifs (the camera's far plane is ~2.4 km, so real peaks are placed at
   1.4–2.2 km with heights scaled to their true angular size). Ridged peaks, snow on gentle high slopes, dark rock
   on steep faces; an optional continuous foothill band all round. */

export interface Peak {
  /** compass azimuth (deg, 0 = north = -z, 90 = east = +x) and distance (m) from the scene origin */
  az: number; dist: number;
  /** summit height above base (m) and base radius (m) */
  h: number; r: number;
  /** ridge count and sharpness (higher = steeper, more pyramid-like) */
  ridges?: number; sharp?: number; seed?: number;
  /** elongation along the view-perpendicular axis (wall-like massifs such as Nuptse–Lhotse) */
  stretch?: number; res?: number; snow?: number;
}

export interface RangeOpts {
  base?: number; rock?: number; snow?: number;
  /** fraction of summit height where snow starts */
  snowline?: number; reflect?: boolean;
  band?: { dist: number; depth: number; h: (az: number) => number; color?: number };
  /** a snowy connecting massif between az0..az1 (degrees), so peaks read as one range */
  ridge?: { az0: number; az1: number; dist: number; depth: number; h: (az: number) => number; seed?: number };
}

const toXZ = (az: number, d: number) => [Math.sin(THREE.MathUtils.degToRad(az)) * d, -Math.cos(THREE.MathUtils.degToRad(az)) * d] as const;

export function mountains(k: SceneKit, peaks: Peak[], o: RangeOpts = {}) {
  const group = new THREE.Group(), base = o.base ?? -20, rockC = new THREE.Color(o.rock ?? 0x3a3a40), snowC = new THREE.Color(o.snow ?? 0xe8eef8), C = new THREE.Color();
  const mat = k.mats.get("matte");
  for (const pk of peaks) {
    const [cx, cz] = toXZ(pk.az, pk.dist), n = pk.res ?? 36, R = pk.r, st = pk.stretch ?? 1, ridges = pk.ridges ?? 4, sharp = pk.sharp ?? 1.6, seed = pk.seed ?? pk.az;
    const facing = Math.atan2(-cx, -cz); /* local frame: v axis toward the viewer */
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    const sh = [Math.cos(seed * 1.7) * R * 0.45, Math.sin(seed * 1.7) * R * 0.3];
    const H = (u: number, v: number) => {
      const r = Math.hypot(u / st, v), th = Math.atan2(v, u / st);
      const ridge = 0.74 + 0.26 * Math.abs(Math.sin(th * ridges * 0.5 + seed)) + 0.14 * (fbm(th * 1.7 + seed, r * 0.004, 3, seed) - 0.5);
      const f = Math.max(0, 1 - r / (R * ridge)); let h = pk.h * Math.pow(f, sharp);
      const fs = Math.max(0, 1 - Math.hypot(u - sh[0], v - sh[1]) / (R * 0.55)); h = Math.max(h, pk.h * 0.62 * Math.pow(fs, sharp * 0.9));
      h += pk.h * 0.1 * (1 - Math.abs(2 * fbm(u * 0.012 + seed, v * 0.012, 4, seed) - 1)) * Math.max(f, fs * 0.7);
      h += pk.h * 0.05 * (1 - Math.abs(2 * fbm(u * 0.045 + seed, v * 0.045, 3, seed + 5) - 1)) * Math.max(f, fs * 0.6);
      h -= pk.h * 0.05 * Math.abs(Math.sin(th * (ridges * 2 + 1) + seed * 2)) * f * (1 - f);
      return h;
    };
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const u = (i / n - 0.5) * 2 * R * st, v = (j / n - 0.5) * 2 * R, h = H(u, v);
      const x = cx + u * Math.cos(facing) + v * Math.sin(facing), z = cz - u * Math.sin(facing) + v * Math.cos(facing);
      pos.push(x, base + h, z);
      const e = R * 0.02, sl = Math.hypot(H(u + e, v) - H(u - e, v), H(u, v + e) - H(u, v - e)) / (2 * e);
      const sn = pk.snow ?? o.snowline ?? 0.45, ns = fbm(u * 0.03 + 7, v * 0.03, 3, seed), streak = 1 - Math.abs(2 * fbm(Math.atan2(v, u) * 9 + seed, Math.hypot(u, v) * 0.008, 3, seed + 11) - 1), snowy = h > pk.h * sn * (0.8 + 0.4 * ns) ? (sl < 1.3 ? 1 : sl < 2.4 ? 0.5 + 0.5 * streak : 0.12 + 0.55 * streak * streak) : h > pk.h * sn * 0.6 && sl < 1.2 ? 0.5 : 0;
      C.copy(rockC).lerp(snowC, snowy * (0.85 + 0.15 * fbm(u * 0.05, v * 0.05, 2, 3))); if (h < 2) C.multiplyScalar(0.6); col.push(C.r, C.g, C.b);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(((n + 1) ** 2) * 2), 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false; mesh.updateMatrix(); group.add(mesh);
  }
  if (o.band) {
    const B = o.band, N = 240, rows = 6, pos: number[] = [], col: number[] = [], idx: number[] = []; C.set(B.color ?? 0x1e2420);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= N; i++) {
      const az = (i / N) * 360, d = B.dist + (j / rows) * B.depth, [x, z] = toXZ(az, d), prof = Math.sin((j / rows) * Math.PI), hh = B.h(az) * (0.55 + 0.45 * fbm(i * 0.08, j * 0.5, 3, 7)) * prof;
      pos.push(x, base + hh - 5, z); col.push(C.r, C.g, C.b);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(((N + 1) * (rows + 1)) * 2), 2)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false; group.add(mesh);
  }
  if (o.ridge) {
    const G = o.ridge, N = 180, rows = 16, pos: number[] = [], col: number[] = [], idx: number[] = [], hs: number[] = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= N; i++) {
      const az = G.az0 + ((G.az1 - G.az0) * i) / N, d = G.dist + (j / rows) * G.depth, [x, z] = toXZ(az, d);
      const prof = Math.pow(Math.sin((j / rows) * Math.PI), 0.85), rid = 1 - Math.abs(fbm(i * 0.045, j * 0.18, 3, G.seed ?? 5) * 2 - 1);
      const hh = G.h(az) * prof * (0.6 + 0.4 * rid) + (fbm(i * 0.12, j * 0.4, 2, 9) - 0.5) * G.h(az) * 0.1;
      pos.push(x, base + hh, z); hs.push(hh);
    }
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= N; i++) {
      const q = j * (N + 1) + i, hh = hs[q], hn = hs[Math.min(rows, j + 1) * (N + 1) + i], he = hs[j * (N + 1) + Math.min(N, i + 1)], az = G.az0 + ((G.az1 - G.az0) * i) / N;
      const sl = Math.hypot(hn - hh, he - hh) / ((G.depth / rows + 1e-3) * 0.6), top = G.h(az);
      const snowy = hh > top * (0.3 + 0.12 * fbm(i * 0.05, j * 0.2, 2, 6)) ? (sl < 3 ? 1 : 0.7) : 0.08; void sl;
      C.copy(rockC).lerp(snowC, snowy * (0.85 + 0.15 * fbm(i * 0.2, j * 0.4, 2, 4))); col.push(C.r, C.g, C.b);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b2 = a + 1, c = a + N + 1, d = c + 1; idx.push(a, b2, c, b2, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(((N + 1) * (rows + 1)) * 2), 2)); g.setIndex(idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false; group.add(mesh);
  }
  group.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
  if (o.reflect) reflect(group);
  k.group.add(group); return group;
}
