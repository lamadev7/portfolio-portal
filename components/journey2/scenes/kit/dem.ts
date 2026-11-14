import * as THREE from "three";
import type { SceneKit } from "./scene";
import { REFLECT } from "./mirror";
import { fbm, smooth } from "./ground";

/* Real mountains behind a scene, built at runtime from AWS Terrarium elevation tiles (nothing written to disk).
   A polar grid around the scene's real lat/lng: bearings (north = −z, clockwise), distances spaced per band. Every
   vertex keeps its true bearing and elevation angle as seen from the origin, but distance is log-compressed past
   `near` so the whole range fits inside the camera's far plane. Heights are max-pooled over each cell's footprint so
   summits and ridgelines are never lost between samples. Snow by altitude and slope, haze by true distance. */

const URLS = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"];
const RAD = Math.PI / 180, M_PER_DEG = 111320, EARTH = 6371000;

interface Tile { h: Float32Array }
const cache = new Map<string, Promise<Tile | null>>();

function loadTile(z: number, x: number, y: number): Promise<Tile | null> {
  const key = `${z}/${x}/${y}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      for (const u of URLS) {
        try {
          const res = await fetch(u.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)), { mode: "cors" });
          if (!res.ok) continue;
          const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
          const c = document.createElement("canvas"); c.width = c.height = 256;
          const g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(bmp, 0, 0); bmp.close();
          const d = g.getImageData(0, 0, 256, 256).data, h = new Float32Array(65536);
          for (let i = 0; i < 65536; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
          return { h };
        } catch { /* try the other mirror */ }
      }
      return null;
    })();
    cache.set(key, p);
  }
  return p;
}

const tileX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
const tileY = (lat: number, z: number) => { const r = lat * RAD; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z; };

class Heights {
  private layers: { z: number; tiles: Map<string, Tile> }[] = [];
  add(z: number, x: number, y: number, t: Tile) {
    let l = this.layers.find((q) => q.z === z);
    if (!l) { l = { z, tiles: new Map() }; this.layers.push(l); this.layers.sort((a, b) => b.z - a.z); }
    l.tiles.set(`${x}/${y}`, t);
  }
  /** elevation in metres, finest loaded zoom first; NaN outside every loaded tile */
  at(lng: number, lat: number) {
    for (const l of this.layers) {
      const fx = tileX(lng, l.z) * 256, fy = tileY(lat, l.z) * 256, tx = Math.floor(fx / 256), ty = Math.floor(fy / 256), t = l.tiles.get(`${tx}/${ty}`);
      if (!t) continue;
      const px = Math.min(255, Math.max(0, fx - tx * 256 - 0.5)), py = Math.min(255, Math.max(0, fy - ty * 256 - 0.5));
      const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(255, x0 + 1), y1 = Math.min(255, y0 + 1), ax = px - x0, ay = py - y0, h = t.h;
      return (h[y0 * 256 + x0] * (1 - ax) + h[y0 * 256 + x1] * ax) * (1 - ay) + (h[y1 * 256 + x0] * (1 - ax) + h[y1 * 256 + x1] * ax) * ay;
    }
    return NaN;
  }
}

export interface DemOpts {
  /** scene origin [lng, lat] */
  ll: [number, number];
  /** elevation of scene y = 0: metres, or a [lng, lat] to sample (e.g. a lake surface); default: the origin */
  base?: number | [number, number];
  /** radial bands: [[d0, 0], [d1, rows], [d2, rows] …] in true metres */
  bands: [number, number][];
  /** bearing sectors (degrees, contiguous, together 360°) with their column step */
  sectors: { az0: number; az1: number; step: number }[];
  /** tile sets to fetch: zoom, centre [lng, lat] (default origin), radius km */
  tiles: { z: number; at?: [number, number]; r: number }[];
  near?: number; reach?: number; drop?: number;
  /** elevations within this many metres of `base` are lake/valley floor: sink them under the scene's water */
  flat?: number;
  /** depth of the curtain hanging from the inner edge (true metres) */
  skirt?: number;
  snow?: number; tree?: number; haze?: { color: number; dist: number; max: number };
  colors?: { rock?: number; snow?: number; forest?: number; scrub?: number };
  reflect?: boolean; timeout?: number;
}

export interface Dem {
  group: THREE.Group;
  /** compressed scene position on the terrain at a true bearing/distance, lifted `lift` true metres */
  project(az: number, d: number, lift?: number): THREE.Vector3;
  /** same for a real [lng, lat] */
  at(lng: number, lat: number, lift?: number): THREE.Vector3;
  elevation(lng: number, lat: number): number;
}

export async function demBackdrop(k: SceneKit, o: DemOpts): Promise<Dem | null> {
  const [lng0, lat0] = o.ll, cosL = Math.cos(lat0 * RAD), dMax = o.bands[o.bands.length - 1][0];
  const heights = new Heights(), jobs: Promise<void>[] = [];
  for (const t of o.tiles) {
    const [cx, cy] = t.at ?? o.ll, dl = (t.r * 1000) / M_PER_DEG, dg = dl / Math.cos(cy * RAD);
    const x0 = Math.floor(tileX(cx - dg, t.z)), x1 = Math.floor(tileX(cx + dg, t.z)), y0 = Math.floor(tileY(cy + dl, t.z)), y1 = Math.floor(tileY(cy - dl, t.z));
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) jobs.push(loadTile(t.z, x, y).then((tile) => { if (tile) heights.add(t.z, x, y, tile); }));
  }
  const ok = await Promise.race([Promise.all(jobs).then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), o.timeout ?? 12000))]);
  if (!ok) return null;
  const elevation = (lng: number, lat: number) => heights.at(lng, lat);
  const base = typeof o.base === "number" ? o.base : elevation(...(o.base ?? o.ll));
  if (!Number.isFinite(base)) return null;

  /* log compression past `near`, solved so dMax lands on `reach` */
  const D0 = o.near ?? 900, reach = o.reach ?? 2250;
  let lo = 1, hi = 1e6; for (let i = 0; i < 60; i++) { const A = (lo + hi) / 2; if (D0 + A * Math.log(1 + (dMax - D0) / A) > reach) hi = A; else lo = A; }
  const A = lo, squash = (d: number) => (d <= D0 ? d : D0 + A * Math.log(1 + (d - D0) / A));
  const toLL = (az: number, d: number): [number, number] => [lng0 + (d * Math.sin(az * RAD)) / (M_PER_DEG * cosL), lat0 + (d * Math.cos(az * RAD)) / M_PER_DEG];
  const rel = (e: number, d: number) => e - base - ((d * d) / (2 * EARTH)) * 0.87;
  const place = (az: number, d: number, y: number, out = new THREE.Vector3()) => { const s = squash(d) / d; return out.set(Math.sin(az * RAD) * d * s, y * s - (o.drop ?? 3), -Math.cos(az * RAD) * d * s); };

  /* radial rows */
  const ds: number[] = [o.bands[0][0]];
  for (let b = 1; b < o.bands.length; b++) { const [d1, n] = o.bands[b], d0 = o.bands[b - 1][0]; for (let i = 1; i <= n; i++) ds.push(d0 * Math.pow(d1 / d0, i / n)); }
  /* inner skirt: a curtain dropping from the first row so no sky shows through the gap to the scene's own ground */
  ds.unshift(ds[0] * 0.985);
  const nd = ds.length, skirt = o.skirt ?? 500;
  const rock = new THREE.Color(o.colors?.rock ?? 0x464852), snowC = new THREE.Color(o.colors?.snow ?? 0xe2e8f4), forest = new THREE.Color(o.colors?.forest ?? 0x26341f), scrub = new THREE.Color(o.colors?.scrub ?? 0x3c372e);
  const haze = new THREE.Color(o.haze?.color ?? 0x1a2848), hazeD = o.haze?.dist ?? 60000, hazeMax = o.haze?.max ?? 0.55, snowLine = o.snow ?? 4900, treeLine = o.tree ?? 3900;
  const group = new THREE.Group(), C = new THREE.Color(), P = new THREE.Vector3();
  const mat = k.mats.own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, fog: false }));

  for (const sec of o.sectors) {
    const na = Math.max(1, Math.round((sec.az1 - sec.az0) / sec.step)), step = (sec.az1 - sec.az0) / na, cols = na + 1;
    const truePos = new Float32Array(cols * nd * 3), pos = new Float32Array(cols * nd * 3), col = new Float32Array(cols * nd * 3), elev = new Float32Array(cols * nd);
    for (let i = 0; i < cols; i++) {
      const az = sec.az0 + i * step, edge = i === 0 || i === na;
      for (let j = 0; j < nd; j++) {
        const d = ds[j], dr = (ds[Math.min(nd - 1, j + 1)] - ds[Math.max(0, j - 1)]) / 2;
        let e = -Infinity;
        for (const ua of edge ? [0] : [-0.35, 0, 0.35]) for (const ur of [-0.35, -0.17, 0, 0.17, 0.35]) {
          const h = elevation(...toLL(az + ua * step, Math.max(1, d + ur * dr)));
          if (Number.isFinite(h)) e = Math.max(e, h);
        }
        if (!Number.isFinite(e)) e = base - 50;
        const q = i * nd + j, y = rel(e, d) - (o.flat && Math.abs(e - base) < o.flat ? 12 : 0) - (j === 0 ? skirt : 0); elev[q] = e;
        truePos[q * 3] = Math.sin(az * RAD) * d; truePos[q * 3 + 1] = y; truePos[q * 3 + 2] = -Math.cos(az * RAD) * d;
        place(az, d, y, P); pos[q * 3] = P.x; pos[q * 3 + 1] = P.y; pos[q * 3 + 2] = P.z;
      }
    }
    const idx: number[] = [];
    for (let i = 0; i < na; i++) for (let j = 0; j < nd - 1; j++) { const a = i * nd + j, b = a + nd, c = a + 1, d = b + 1; idx.push(a, b, c, c, b, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(truePos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    for (let q = 0; q < cols * nd; q++) {
      const e = elev[q], up = nrm.getY(q), j = q % nd, i = (q - j) / nd, n = fbm(i * 0.21, j * 0.37, 3, 5), d = ds[j];
      const steep = 1 - smooth(0.42, 0.78, up), snowAlt = smooth(snowLine - 350, snowLine + 250, e + (n - 0.5) * 700);
      const snow = snowAlt * (1 - steep * 0.8) + snowAlt * steep * 0.35 * smooth(0.45, 0.7, fbm(i * 0.9, j * 0.6, 2, 9));
      C.copy(forest).lerp(scrub, smooth(treeLine - 900, treeLine + 200, e)).lerp(rock, smooth(treeLine, treeLine + 700, e) * 0.8 + steep * 0.4);
      C.lerp(snowC, Math.min(1, snow)).lerp(haze, hazeMax * (1 - Math.exp(-d / hazeD)));
      col[q * 3] = C.r; col[q * 3 + 1] = C.g; col[q * 3 + 2] = C.b;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = false; mesh.matrixAutoUpdate = false; mesh.renderOrder = -2;
    group.add(mesh);
    if (o.reflect) {
      /* the water sees a coarser copy (every 3rd bearing, every 2nd row): the mirror pass costs a fraction of the main one */
      const ci: number[] = [], rj: number[] = [];
      for (let i = 0; i < cols; i += 3) ci.push(i); if (ci[ci.length - 1] !== na) ci.push(na);
      for (let j = 0; j < nd; j += 2) rj.push(j); if (rj[rj.length - 1] !== nd - 1) rj.push(nd - 1);
      const lp = new Float32Array(ci.length * rj.length * 3), lc = new Float32Array(ci.length * rj.length * 3), ln = new Float32Array(ci.length * rj.length * 3), li: number[] = [];
      ci.forEach((i, a) => rj.forEach((j, b) => { const q = i * nd + j, w = a * rj.length + b; for (let c = 0; c < 3; c++) { lp[w * 3 + c] = pos[q * 3 + c]; lc[w * 3 + c] = col[q * 3 + c]; ln[w * 3 + c] = nrm.array[q * 3 + c] as number; } }));
      for (let a = 0; a < ci.length - 1; a++) for (let b = 0; b < rj.length - 1; b++) { const p0 = a * rj.length + b, p1 = p0 + rj.length; li.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(lp, 3)); lg.setAttribute("color", new THREE.BufferAttribute(lc, 3)); lg.setAttribute("normal", new THREE.BufferAttribute(ln, 3)); lg.setIndex(li);
      const lm = new THREE.Mesh(lg, mat); lm.frustumCulled = false; lm.matrixAutoUpdate = false; lm.layers.set(REFLECT); group.add(lm);
    }
  }
  k.group.add(group);
  const surf = (az: number, d: number, lift = 0) => { const e = elevation(...toLL(az, d)); return place(az, d, rel(Number.isFinite(e) ? e : base, d) + lift); };
  return {
    group,
    project: surf,
    at: (lng, lat, lift = 0) => { const n = (lat - lat0) * M_PER_DEG, e = (lng - lng0) * M_PER_DEG * cosL; return surf(Math.atan2(e, n) / RAD, Math.hypot(e, n), lift); },
    elevation,
  };
}
