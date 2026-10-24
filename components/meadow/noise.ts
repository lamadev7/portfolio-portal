// Seeded randomness + value noise. Deterministic for a given seed so stills are repeatable.

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// period > 0 makes the lattice wrap (tileable noise)
export function vnoise(x: number, y: number, seed = 0, period = 0): number {
  const fx0 = Math.floor(x), fy0 = Math.floor(y);
  const fx = x - fx0, fy = y - fy0;
  let ix = fx0, iy = fy0, ix1 = fx0 + 1, iy1 = fy0 + 1;
  if (period) {
    ix = ((ix % period) + period) % period; iy = ((iy % period) + period) % period;
    ix1 = (ix + 1) % period; iy1 = (iy + 1) % period;
  }
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix1, iy, seed), c = hash(ix, iy1, seed), d = hash(ix1, iy1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x: number, y: number, oct = 4, seed = 0): number {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise(x * f, y * f, seed + i * 17);
    n += amp; amp *= 0.5; f *= 2.03;
  }
  return s / n;
}

// Tileable fbm baked into a single-channel byte array (size x size), contrast-stretched to 0..255.
export function tileableFbm(size: number, basePeriod: number, oct: number, seed: number): Uint8Array {
  const out = new Float32Array(size * size);
  let lo = Infinity, hi = -Infinity;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0, amp = 0.5, n = 0, p = basePeriod;
      for (let o = 0; o < oct; o++) {
        s += amp * vnoise((x / size) * p, (y / size) * p, seed + o * 31, p);
        n += amp; amp *= 0.5; p *= 2;
      }
      const v = s / n;
      out[y * size + x] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  const bytes = new Uint8Array(size * size * 4);
  for (let i = 0; i < out.length; i++) {
    const v = Math.round(((out[i] - lo) / (hi - lo)) * 255);
    bytes[i * 4] = v; bytes[i * 4 + 1] = v; bytes[i * 4 + 2] = v; bytes[i * 4 + 3] = 255;
  }
  return bytes;
}

export const smooth = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
