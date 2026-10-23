import type { LL } from "../contracts";
import { EXAG, tileLat, tileLng, tileXY } from "./geo";

/** Two hostnames per tile service: both are HTTP/1.1, so each host is capped at six parallel connections. */
const esri = (h: string) => `https://${h}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
export const IMAGERY = [esri("server"), esri("services")];
export const TERRARIUM = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"];
export const IMG_MAX = 18;
/** Terrarium in Nepal is SRTM 30 m, which z12 already resolves. */
export const DEM_MAX = 12;

/** Same host pick as MapLibre's CanonicalTileID.url, so warmed tiles hit the HTTP cache. */
/** fetch that gives up after `ms` (and when `outer` aborts), so a stalled connection never pins a slot or a mount. */
export function fetchT(url: string, ms: number, init: RequestInit = {}, outer?: AbortSignal): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  const stop = () => ctl.abort();
  outer?.addEventListener("abort", stop);
  return fetch(url, { ...init, signal: ctl.signal }).finally(() => {
    clearTimeout(t);
    outer?.removeEventListener("abort", stop);
  });
}

export const tileUrl = (tpl: string[], z: number, x: number, y: number) =>
  tpl[(x + y) % tpl.length].replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));

/**
 * HTTP-cache warmer: a priority queue drained `n` requests at a time. Lower `prio` runs first; re-adding a queued URL
 * with a better priority promotes it. Anything already fetched is remembered so the same tile is never asked twice.
 */
export class Warmer {
  readonly done = new Set<string>();
  private queued = new Map<string, number>();
  private running = 0;
  private ctl = new AbortController();
  private seq = 0;
  constructor(private n = 10) {}

  add(urls: Iterable<string>, prio: number) {
    for (const u of urls) {
      if (this.done.has(u)) continue;
      const p = this.queued.get(u);
      if (p == null || prio < p) this.queued.set(u, prio + (this.seq++ % 1000) * 1e-6);
    }
    this.pump();
  }

  /** Drop queued work at or above a priority (in-flight requests finish). */
  drop(fromPrio: number) {
    for (const [u, p] of this.queued) if (p >= fromPrio) this.queued.delete(u);
  }

  ratio(urls: string[]): number {
    if (!urls.length) return 1;
    let k = 0;
    for (const u of urls) if (this.done.has(u)) k++;
    return k / urls.length;
  }

  private pump() {
    while (this.running < this.n && this.queued.size) {
      let best = "", bp = Infinity;
      for (const [u, p] of this.queued) if (p < bp) { bp = p; best = u; }
      this.queued.delete(best);
      this.running++;
      fetchT(best, 15000, { priority: bp < 1 ? "high" : "low" } as RequestInit, this.ctl.signal)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((b) => void (b && this.done.add(best)))
        .catch(() => undefined)
        .finally(() => {
          this.running--;
          this.pump();
        });
    }
  }

  dispose() {
    this.queued.clear();
    this.ctl.abort();
  }
}

/** Terrarium elevation sampler (real metres) that reads tiles independently of what the map has loaded. */
export class Dem {
  private tiles = new Map<string, Float32Array | Promise<Float32Array | null> | null>();

  private key(z: number, x: number, y: number) {
    return `${z}/${x}/${y}`;
  }

  load(z: number, x: number, y: number): Promise<Float32Array | null> {
    const k = this.key(z, x, y);
    const hit = this.tiles.get(k);
    if (hit instanceof Float32Array || hit === null) return Promise.resolve(hit);
    if (hit) return hit;
    const p = fetchT(tileUrl(TERRARIUM, z, x, y), 15000)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => createImageBitmap(b))
      .then((img) => {
        const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement("canvas"), { width: 256, height: 256 });
        const g = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null;
        if (!g) return null;
        g.drawImage(img, 0, 0);
        img.close();
        const d = g.getImageData(0, 0, 256, 256).data;
        const out = new Float32Array(65536);
        for (let i = 0; i < 65536; i++) out[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
        return out;
      })
      .catch(() => null)
      .then((v) => {
        this.tiles.set(k, v);
        return v;
      });
    this.tiles.set(k, p);
    return p;
  }

  /** Bilinear elevation in real metres, or null when the tile is not decoded yet. */
  sample(ll: LL, z: number): number | null {
    const [fx, fy] = tileXY(ll, z);
    const tx = Math.floor(fx), ty = Math.floor(fy);
    const t = this.tiles.get(this.key(z, tx, ty));
    if (!(t instanceof Float32Array)) return null;
    const px = Math.min(254.999, Math.max(0, (fx - tx) * 256 - 0.5)), py = Math.min(254.999, Math.max(0, (fy - ty) * 256 - 0.5));
    const i = Math.floor(px), j = Math.floor(py), u = px - i, v = py - j;
    const a = t[j * 256 + i], b = t[j * 256 + i + 1], c = t[(j + 1) * 256 + i], d = t[(j + 1) * 256 + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  /** Rendered (exaggerated) ground height, falling back through coarser zooms. */
  ground(ll: LL, z = DEM_MAX): number | null {
    for (let k = z; k >= 6; k--) {
      const e = this.sample(ll, k);
      if (e != null) return Math.max(0, e) * EXAG;
    }
    return null;
  }

  ensure(points: LL[], z: number): Promise<void> {
    const need = new Set<string>();
    const jobs: Array<Promise<unknown>> = [];
    for (const p of points) {
      const [fx, fy] = tileXY(p, z);
      const k = this.key(z, Math.floor(fx), Math.floor(fy));
      if (need.has(k)) continue;
      need.add(k);
      jobs.push(this.load(z, Math.floor(fx), Math.floor(fy)));
    }
    return Promise.all(jobs).then(() => undefined);
  }
}

export interface Underlay {
  id: string;
  canvas: HTMLCanvasElement;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

/**
 * Low-res imagery that stays resident on the GPU under the tiled layers (Nepal at z7, the subcontinent at z5).
 * MapLibre only falls back to parent tiles it already holds, so ground revealed by a fast move would otherwise show a hole.
 */
export async function buildUnderlays(): Promise<Underlay[]> {
  const parts = [
    { id: "base-reg", z: 5, x0: 22, y0: 12, cols: 4, rows: 3 },
    { id: "base-np", z: 7, x0: 92, y0: 51, cols: 4, rows: 5 },
  ];
  const out: Underlay[] = [];
  for (const s of parts) {
    const canvas = document.createElement("canvas");
    canvas.width = s.cols * 256;
    canvas.height = s.rows * 256;
    const g = canvas.getContext("2d");
    if (!g) continue;
    const jobs: Array<() => Promise<void>> = [];
    for (let j = 0; j < s.rows; j++)
      for (let i = 0; i < s.cols; i++)
        jobs.push(() =>
          fetchT(tileUrl(IMAGERY, s.z, s.x0 + i, s.y0 + j), 12000)
            .then((r) => (r.ok ? r.blob() : Promise.reject()))
            .then((b) => createImageBitmap(b))
            .then((bm) => {
              g.drawImage(bm, i * 256, j * 256);
              bm.close();
            })
            .catch(() => undefined),
        );
    await Promise.all(Array.from({ length: 6 }, async () => { for (let f = jobs.shift(); f; f = jobs.shift()) await f(); }));
    const w = tileLng(s.x0, s.z), e = tileLng(s.x0 + s.cols, s.z), top = tileLat(s.y0, s.z), bot = tileLat(s.y0 + s.rows, s.z);
    out.push({ id: s.id, canvas, coordinates: [[w, top], [e, top], [e, bot], [w, bot]] });
  }
  return out;
}
