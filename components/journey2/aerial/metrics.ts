import type { Map as MLMap } from "maplibre-gl";

/* Dev-only flight meter: rAF frame log plus a 20 Hz imagery coverage sampler (same "blank" definition as .preview/E/lib.js). */

interface TileLike { hasData(): boolean }
interface IdLike { key: string; overscaledZ: number; canonical: { z: number; x: number; y: number }; scaledTo(z: number): IdLike; children(max: number): IdLike[] }
interface Manager {
  used?: boolean;
  usedForTerrain?: boolean;
  getSource(): { minzoom: number; maxzoom: number; calculateTileZoom?: unknown };
  _inViewTiles: { getTileById(k: string): TileLike | undefined; getAllTiles(): TileLike[] };
}

export interface Coverage { n: number; ok: number; blur: number; blank: number }

export function coverage(map: MLMap): Coverage | null {
  const style = (map as unknown as { style?: { tileManagers?: Record<string, Manager> } }).style;
  const tms = style?.tileManagers;
  const tm = tms?.imagery;
  if (!tms || !tm || (!tm.used && !tm.usedForTerrain)) return null;
  const src = tm.getSource();
  let ideal: IdLike[];
  try {
    ideal = map.coveringTiles({ tileSize: 256, minzoom: src.minzoom, maxzoom: src.maxzoom, roundZoom: true, terrain: map.terrain ?? undefined, calculateTileZoom: src.calculateTileZoom } as Parameters<MLMap["coveringTiles"]>[0]) as unknown as IdLike[];
  } catch {
    return null;
  }
  const vt = tm._inViewTiles;
  let ok = 0, blur = 0, blank = 0;
  const under = ["base-np", "base-reg"].filter((k) => tms[k]?._inViewTiles.getAllTiles().some((t) => t.hasData()));
  const inside = (id: IdLike, k: string) => {
    const c = (map.getSource(k) as unknown as { coordinates: number[][] }).coordinates, z = id.canonical.z, n = 2 ** z;
    const lon = (x: number) => (x / n) * 360 - 180, lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
    return lon(id.canonical.x) >= c[0][0] - 1e-9 && lon(id.canonical.x + 1) <= c[1][0] + 1e-9 && lat(id.canonical.y) <= c[0][1] + 1e-9 && lat(id.canonical.y + 1) >= c[2][1] - 1e-9;
  };
  for (const id of ideal) {
    const t = vt.getTileById(id.key);
    if (t && t.hasData()) { ok++; continue; }
    let found = false;
    for (let z = id.overscaledZ - 1; z >= 0 && !found; z--) { const p = vt.getTileById(id.scaledTo(z).key); if (p && p.hasData()) found = true; }
    if (!found && id.overscaledZ < 22) found = id.children(src.maxzoom).every((c) => vt.getTileById(c.key)?.hasData());
    for (const k of ["backdrop"]) {
      const bd = tms[k];
      if (!bd || found) continue;
      for (let z = id.overscaledZ; z >= 0 && !found; z--) { const p = bd._inViewTiles.getTileById(id.scaledTo(z).key); if (p && p.hasData()) found = true; }
    }
    if (!found) found = under.some((k) => inside(id, k));
    if (found) blur++;
    else blank++;
  }
  return { n: ideal.length, ok, blur, blank };
}

export class Meter {
  frames: number[] = [];
  samples: Array<{ t: number; c: Coverage | null }> = [];
  private raf = 0;
  private iv = 0;
  constructor(private map: MLMap) {}
  start() {
    this.frames = [];
    this.samples = [];
    const loop = (t: number) => {
      this.frames.push(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.iv = window.setInterval(() => this.samples.push({ t: performance.now(), c: coverage(this.map) }), 50);
  }
  stop() {
    cancelAnimationFrame(this.raf);
    window.clearInterval(this.iv);
    const d: number[] = [];
    for (let i = 1; i < this.frames.length; i++) d.push(this.frames[i] - this.frames[i - 1]);
    const span = (this.frames[this.frames.length - 1] - this.frames[0]) / 1000 || 1;
    const s = [...d].sort((a, b) => a - b);
    return {
      fps: +(d.length / span).toFixed(1),
      p95: +(s[Math.floor(s.length * 0.95)] ?? 0).toFixed(1),
      worst: +(s[s.length - 1] ?? 0).toFixed(1),
      long: d.filter((x) => x > 33.4).length,
      frames: d.length,
      blank: this.samples.filter((x) => x.c && x.c.blank > 0).length,
      sharp: +(this.samples.reduce((a, x) => a + (x.c ? x.c.ok / Math.max(1, x.c.n) : 0), 0) / Math.max(1, this.samples.length)).toFixed(2),
      samples: this.samples.length,
    };
  }
}
