import type { LL } from "../contracts";
import { hash, mercLocal, tileXY } from "./geo";
import type { Dem } from "./tiles";
import { onLake } from "./world";

/** Pixel grid of public/aerial/lights-np.webp: z8 tiles x 183-191, y 105-109 of NASA Black Marble 2016. */
const IMG = { z: 8, x0: 183, y0: 105, w: 2304, h: 1280 };

export interface LightField {
  anchor: LL;
  pos: Float32Array;
  col: Float32Array;
  size: Float32Array;
}

let pixels: Promise<Uint8ClampedArray | null> | null = null;

function radiance(): Promise<Uint8ClampedArray | null> {
  pixels ??= fetch("/aerial/lights-np.webp")
    .then((r) => r.blob())
    .then((b) => createImageBitmap(b))
    .then((bm) => {
      const c = document.createElement("canvas");
      c.width = IMG.w;
      c.height = IMG.h;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (!g) return null;
      g.drawImage(bm, 0, 0);
      bm.close();
      return g.getImageData(0, 0, IMG.w, IMG.h).data;
    })
    .catch(() => null);
  return pixels;
}

const WARM: Array<[number, number, number]> = [
  [1, 0.62, 0.3],
  [1, 0.72, 0.42],
  [1, 0.55, 0.22],
];
const LED: [number, number, number] = [0.86, 0.9, 1];

/**
 * Individual lights scattered where people live: each 600 m Black Marble pixel spawns lights in proportion to its
 * radiance (dense LED/sodium cores in Kathmandu and Pokhara, a few lamps per Terai village), each set on the terrain.
 */
export async function lightField(anchor: LL, box: [number, number, number, number], dem: Dem, budget = 200000): Promise<LightField | null> {
  const data = await radiance();
  if (!data) return null;
  const [w, s, e, n] = box;
  const [ax, ay] = tileXY([w, n], IMG.z), [bx, by] = tileXY([e, s], IMG.z);
  const px0 = Math.max(0, Math.floor((ax - IMG.x0) * 256)), px1 = Math.min(IMG.w - 1, Math.ceil((bx - IMG.x0) * 256));
  const py0 = Math.max(0, Math.floor((ay - IMG.y0) * 256)), py1 = Math.min(IMG.h - 1, Math.ceil((by - IMG.y0) * 256));
  if (px1 <= px0 || py1 <= py0) return null;
  const cells: Array<[number, number, number]> = [];
  let total = 0;
  for (let j = py0; j <= py1; j++)
    for (let i = px0; i <= px1; i++) {
      const a = data[(j * IMG.w + i) * 4 + 3] / 255;
      if (a < 0.04) continue;
      const k = Math.pow(a, 1.25) * 110 + (hash(i * 13.1 + j * 7.7) < a * 3 ? 1 : 0);
      cells.push([i, j, a]);
      total += k;
    }
  if (!cells.length) return null;
  const scale = Math.min(1, budget / Math.max(1, total));
  const toLL = (fx: number, fy: number): LL => {
    const N = 2 ** IMG.z, X = IMG.x0 + fx / 256, Y = IMG.y0 + fy / 256;
    return [(X / N) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * Y) / N))) * 180) / Math.PI];
  };
  const keys = new Map<string, LL>();
  for (const [i, j] of cells)
    for (const [di, dj] of [[0, 0], [1, 1]]) {
      const ll = toLL(i + di, j + dj), [tx, ty] = tileXY(ll, 11);
      keys.set(`${Math.floor(tx)}/${Math.floor(ty)}`, ll);
    }
  await Promise.race([dem.ensure([...keys.values()], 11), new Promise((r) => setTimeout(r, 4000))]);
  const wet = await onLake();
  const pos: number[] = [], col: number[] = [], size: number[] = [];
  let slice = performance.now();
  for (const [i, j, a] of cells) {
    if (performance.now() - slice > 4) {
      await new Promise((r) => setTimeout(r, 0));
      slice = performance.now();
    }
    const want = (Math.pow(a, 1.25) * 110 + (hash(i * 13.1 + j * 7.7) < a * 3 ? 1 : 0)) * scale;
    const m = Math.floor(want) + (hash(i * 3.3 + j * 9.1) < want % 1 ? 1 : 0);
    for (let k = 0; k < m; k++) {
      const sd = i * 92821 + j * 68917 + k * 31;
      const ll = toLL(i + hash(sd) - 0.5 + 0.5, j + hash(sd + 1.7) - 0.5 + 0.5);
      const g = dem.ground(ll, 11);
      if (g == null || wet(ll)) continue;
      const [x, z] = mercLocal(anchor, ll);
      pos.push(x, g + 6, z);
      const r = hash(sd + 3.9);
      const c = a > 0.55 && r < 0.38 ? LED : WARM[Math.floor(hash(sd + 5.1) * 3)];
      const b = 0.55 + 0.45 * a * hash(sd + 7.3) + (r > 0.985 ? 0.8 : 0);
      col.push(c[0] * b, c[1] * b, c[2] * b);
      size.push((r > 0.985 ? 9 : 2.6) + hash(sd + 9.7) * 2.6 * a);
    }
  }
  return { anchor, pos: new Float32Array(pos), col: new Float32Array(col), size: new Float32Array(size) };
}
