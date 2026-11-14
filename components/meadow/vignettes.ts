// One camera-facing painted sheet (3:2). On a scene change it morphs A -> B: a wave crosses the sheet in the
// turn direction, A's landmarks glide toward B's, the sheet bows a little, and the colour crossfades through
// the middle while the painted mass is held so there is neither a double ghost nor a blank beat.
import * as THREE from "three";
import {
  SCENES_URL, ART_DIR, VIGNETTE_WIDTH, MORPH_MS, MORPH_RETARGET_SPEEDUP, MORPH_WAVE, MORPH_SIGMA, MORPH_BOW,
  NIGHT_DIM, PRELOAD_RADIUS, TEXTURE_CACHE, FIGURE_COVER, COVER_COLS,
} from "./config";

const ASPECT = 1.5;

const vert = /* glsl */ `
uniform float uProg, uDir, uWave, uGroundA, uGroundB;
uniform vec2 uSize, uBow;
varying vec2 vUv;
varying float vRel;
float localProg(float u) { float s = uDir > 0.0 ? u : 1.0 - u; return clamp((uProg - uWave * s) / (1.0 - uWave), 0.0, 1.0); }
void main() {
  float e = smoothstep(0.0, 1.0, localProg(uv.x));
  float g = mix(uGroundA, uGroundB, e);
  float rel = uv.y - g;
  vec3 p = vec3((uv.x - 0.5) * uSize.x, rel * uSize.y, 0.0);
  // gentle bow, pinned at the contact line, peaking mid-transition
  float amp = sin(3.14159265 * e);
  float up = smoothstep(0.0, 1.0 - g, max(rel, 0.0));
  p.x += uDir * uBow.x * amp * up;
  p.z += uBow.y * amp * sin(3.14159265 * uv.x) * (0.3 + 0.7 * up);
  vUv = uv; vRel = rel;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const frag = /* glsl */ `
uniform sampler2D uMapA, uMapB;
uniform vec4 uRectA, uRectB;
uniform vec2 uLmA[5], uLmB[5];
uniform float uProg, uDir, uWave, uGroundA, uGroundB, uTravel, uSigma, uNight, uNightDim;
uniform vec2 uSize;
uniform vec3 uTint;
varying vec2 vUv;
varying float vRel;
float localProg(float u) { float s = uDir > 0.0 ? u : 1.0 - u; return clamp((uProg - uWave * s) / (1.0 - uWave), 0.0, 1.0); }
vec4 sampleScene(sampler2D map, vec4 rect, vec2 f) {
  vec2 t = (f - rect.xy) / rect.zw;
  float inside = step(0.0, t.x) * step(t.x, 1.0) * step(0.0, t.y) * step(t.y, 1.0);
  return texture2D(map, clamp(t, 0.0, 1.0)) * inside;   // texels are premultiplied
}
void main() {
  float e = smoothstep(0.0, 1.0, localProg(vUv.x));
  vec2 asp = vec2(uSize.x / uSize.y, 1.0);
  vec2 offA = vec2(0.0), offB = vec2(0.0);
  float wsum = 0.0;
  for (int k = 0; k < 5; k++) {
    vec2 D = uLmB[k] - uLmA[k];
    D *= min(1.0, uTravel / max(length(D * asp), 1e-5));          // travel cap
    vec2 dd = (vUv - (uLmA[k] + D * e)) * asp;
    float w = exp(-dot(dd, dd) / (2.0 * uSigma * uSigma));
    offA -= w * e * D;
    offB += w * (1.0 - e) * D;
    wsum += w;
  }
  float pin = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x) * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
  float n = pin / max(1.0, wsum);
  vec4 a = sampleScene(uMapA, uRectA, vec2(vUv.x, uGroundA + vRel) + offA * n);
  vec4 b = sampleScene(uMapB, uRectB, vec2(vUv.x, uGroundB + vRel) + offB * n);
  float k = smoothstep(0.24, 0.76, e);
  vec4 m = mix(a, b, k);
  float alpha = mix(m.a, max(a.a, b.a), sin(3.14159265 * k));   // hold the painted mass through the middle
  vec3 rgb = m.rgb * (alpha / max(m.a, 1e-4));
  rgb *= uTint * (1.0 - uNightDim * uNight);
  gl_FragColor = vec4(rgb, alpha);
}
`;

type Vec2 = [number, number];
interface Scene { name: string; url: string; alt: string; ground: number; lmImage: Vec2[] | null; travel: number }
interface Profile { top: Float32Array; cols: number }
interface Decoded { tex: THREE.Texture; w: number; h: number; prof: Profile; close: () => void }
interface Layout {
  rect: [number, number, number, number]; ground: number; lm: Vec2[]; cover: Float32Array;
  foot: { cx: number; half: number }; tex: THREE.Texture; sc: Scene;
}
export interface Footprint { offset: number; half: number; coverA: Float32Array; coverB: Float32Array; mix: number }

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const mod = (n: number, m: number) => ((n % m) + m) % m;

// ---------- scene list ----------
function fromJson(raw: unknown, i: number): Scene | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.src !== "string") return null;
  const lms = Array.isArray(s.landmarks) && s.landmarks.length >= 5 ? (s.landmarks.slice(0, 5) as unknown[]) : null;
  const lmImage = lms && lms.every((p) => Array.isArray(p) && p.length >= 2) ? lms.map((p) => [num((p as unknown[])[0], 0.5), num((p as unknown[])[1], 0.5)] as Vec2) : null;
  return {
    name: typeof s.name === "string" ? s.name : `scene-${i + 1}`, url: ART_DIR + s.src, alt: typeof s.alt === "string" ? s.alt : "",
    ground: num(s.ground, 0.35), lmImage, travel: num(s.morphTravel, 0.07),
  };
}

async function loadSceneList(signal: AbortSignal): Promise<Scene[]> {
  const r = await fetch(SCENES_URL, { signal });
  if (!r.ok) throw new Error(`${SCENES_URL}: ${r.status}`);
  const list: unknown = await r.json();
  if (!Array.isArray(list)) throw new Error("scenes.json is not an array");
  const scenes = list.map(fromJson).filter((s): s is Scene => !!s);
  if (!scenes.length) throw new Error("scenes.json has no scenes");
  return scenes;
}

// Frame layout once the image aspect is known: rect (frame uv the image occupies), ground and landmarks in
// frame uv, plus the grass cover profile read from the painting's own silhouette.
function layout(sc: Scene, aspect: number, prof: Profile): Omit<Layout, "tex" | "sc"> {
  let rect: [number, number, number, number], ground: number;
  if (Math.abs(aspect - ASPECT) < 0.03) {
    rect = [0, 0, 1, 1];
    ground = sc.ground;
  } else { // not 3:2: contain, bottom-aligned, centred
    const w = Math.min(1, aspect / ASPECT), h = Math.min(1, ASPECT / aspect);
    rect = [0.5 - w / 2, 0, w, h];
    ground = sc.ground * h;
  }
  const toFrame = ([u, v]: Vec2): Vec2 => [rect[0] + u * rect[2], rect[1] + v * rect[3]];
  const lm: Vec2[] = sc.lmImage ? sc.lmImage.map(toFrame)
    : [[0.33, ground + 0.3], [0.33, ground + 0.18], [0.33, ground + 0.06], [0.7, ground + 0.16], [0.7, ground + 0.07]];
  // front grass may hide only a small share of each column's painted height (the contact line, feet)
  const H = VIGNETTE_WIDTH / ASPECT, cover = new Float32Array(COVER_COLS).fill(99);
  let lo = 1, hi = 0;
  for (let k = 0; k < COVER_COLS; k++) {
    const iu = ((k + 0.5) / COVER_COLS - rect[0]) / rect[2];
    if (iu < 0 || iu > 1) continue;
    const top = prof.top[Math.min(prof.cols - 1, Math.floor(iu * prof.cols))];
    if (top < 0) continue;
    const tall = (rect[1] + top * rect[3] - ground) * H; // painted height above the contact line, world units
    if (tall < 0.05) continue;
    cover[k] = Math.min(FIGURE_COVER, Math.max(0.08, tall * 0.16));
    lo = Math.min(lo, (k + 0.5) / COVER_COLS); hi = Math.max(hi, (k + 0.5) / COVER_COLS);
  }
  const at = (a: Float32Array, k: number) => a[Math.max(0, Math.min(COVER_COLS - 1, k))];
  const dil = cover.map((c, k) => Math.min(c, at(cover, k - 1), at(cover, k + 1)));
  for (let k = 0; k < COVER_COLS; k++) cover[k] = Math.min(dil[k], 0.25 * at(dil, k - 1) + 0.5 * dil[k] + 0.25 * at(dil, k + 1));
  if (lo > hi) { lo = 0.3; hi = 0.7; }
  return { rect, ground, lm, cover, foot: { cx: (lo + hi) / 2, half: (hi - lo) / 2 + 0.04 } };
}

// Coarse alpha silhouette: for each image column, the highest painted v (image uv, bottom-up), or -1.
function alphaProfile(src: CanvasImageSource, flipped: boolean): Profile {
  const CW = 96, CH = 64;
  const top = new Float32Array(CW).fill(-1);
  const cv: OffscreenCanvas | HTMLCanvasElement = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(CW, CH) : Object.assign(document.createElement("canvas"), { width: CW, height: CH });
  const cx = cv.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!cx) { top.fill(0.9); return { top, cols: CW }; }
  cx.drawImage(src, 0, 0, CW, CH);
  const px = cx.getImageData(0, 0, CW, CH).data;
  for (let r = 0; r < CH; r++) {
    const v = flipped ? (r + 0.5) / CH : 1 - (r + 0.5) / CH;
    for (let c = 0; c < CW; c++) if (px[(r * CW + c) * 4 + 3] > 64 && v > top[c]) top[c] = v;
  }
  return { top, cols: CW };
}

// ---------- textures ----------
async function decode(url: string, signal: AbortSignal): Promise<Decoded> {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const blob = await r.blob();
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: "flipY", premultiplyAlpha: "premultiply", colorSpaceConversion: "none" });
    const tex = new THREE.Texture(bmp as unknown as HTMLImageElement);
    tex.flipY = false; tex.premultiplyAlpha = false;
    return { tex, w: bmp.width, h: bmp.height, prof: alphaProfile(bmp, true), close: () => bmp.close() };
  } catch (_) {
    const src = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    const tex = new THREE.Texture(img);
    tex.flipY = true; tex.premultiplyAlpha = true;
    return { tex, w: img.naturalWidth, h: img.naturalHeight, prof: alphaProfile(img, false), close: () => URL.revokeObjectURL(src) };
  }
}

export type Vignette = Awaited<ReturnType<typeof createVignette>>;

// Resolves to null when the scene list cannot be loaded (the meadow then shows the grass alone).
export async function createVignette(renderer: THREE.WebGLRenderer, opts: { tint: THREE.IUniform<THREE.Color>; night: THREE.IUniform<number>; signal: AbortSignal }) {
  const { signal } = opts;
  let scenes: Scene[];
  try { scenes = await loadSceneList(signal); } catch (_) { return null; }
  if (signal.aborted) return null;
  const count = scenes.length;
  const sceneAt = (i: number) => scenes[mod(i, count)];
  interface CacheEntry { promise: Promise<Decoded>; entry: Decoded | null; used: number }
  const cache = new Map<string, CacheEntry>();
  let clock = 0;

  const load = (url: string): Promise<Decoded> => {
    let c = cache.get(url);
    if (!c) {
      const entry: CacheEntry = { entry: null, used: ++clock, promise: Promise.resolve(null as unknown as Decoded) };
      entry.promise = decode(url, signal).then((d) => {
        if (signal.aborted) { d.close(); throw new Error("disposed"); }
        d.tex.colorSpace = THREE.NoColorSpace;
        d.tex.anisotropy = 4;
        d.tex.minFilter = THREE.LinearMipmapLinearFilter;
        d.tex.needsUpdate = true;
        renderer.initTexture(d.tex);
        entry.entry = d;
        return d;
      });
      entry.promise.catch(() => { if (cache.get(url) === entry) cache.delete(url); });
      cache.set(url, entry);
      c = entry;
    }
    c.used = ++clock;
    return c.promise;
  };
  const laid = new Map<number, Layout>(); // scene index -> layout
  const ensure = async (i: number): Promise<Layout> => {
    const sc = sceneAt(i);
    const d = await load(sc.url);
    const key = mod(i, count);
    let L = laid.get(key);
    if (!L) { L = { ...layout(sc, d.w / d.h, d.prof), tex: d.tex, sc }; laid.set(key, L); }
    return L;
  };
  const ready = (i: number) => laid.has(mod(i, count)) && !!cache.get(sceneAt(i).url)?.entry;
  const evict = (keep: number[]) => {
    if (cache.size <= TEXTURE_CACHE) return;
    const keepUrls = new Set(keep.map((i) => sceneAt(i).url));
    const order = [...cache.entries()].filter(([u, c]) => !keepUrls.has(u) && c.entry).sort((x, y) => x[1].used - y[1].used);
    while (cache.size > TEXTURE_CACHE && order.length) {
      const [u, c] = order.shift()!;
      c.entry!.tex.dispose(); c.entry!.close();
      cache.delete(u);
      for (const [k, v] of laid) if (v.sc.url === u) laid.delete(k);
    }
  };

  const blank = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  blank.needsUpdate = true;
  const W = VIGNETTE_WIDTH, H = W / ASPECT;
  const U = {
    uMapA: { value: blank as THREE.Texture }, uMapB: { value: blank as THREE.Texture },
    uRectA: { value: new THREE.Vector4(0, 0, 1, 1) }, uRectB: { value: new THREE.Vector4(0, 0, 1, 1) },
    uLmA: { value: Array.from({ length: 5 }, () => new THREE.Vector2()) }, uLmB: { value: Array.from({ length: 5 }, () => new THREE.Vector2()) },
    uGroundA: { value: 0.3 }, uGroundB: { value: 0.3 },
    uProg: { value: 1 }, uDir: { value: 1 }, uWave: { value: MORPH_WAVE }, uTravel: { value: 0.07 }, uSigma: { value: MORPH_SIGMA },
    uSize: { value: new THREE.Vector2(W, H) }, uBow: { value: new THREE.Vector2(MORPH_BOW.side, MORPH_BOW.toward) },
    uTint: opts.tint, uNight: opts.night, uNightDim: { value: NIGHT_DIM },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: vert, fragmentShader: frag,
    transparent: true, depthWrite: false, premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 60, 40), mat);
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  mesh.visible = false;   // until the first scene is bound

  const st = { a: null as Layout | null, b: null as Layout | null, ia: 0, ib: 0, p: 1, dir: 1, fast: false, queued: null as { i: number; dir: number } | null };
  const bind = (side: "A" | "B", L: Layout) => {
    const map = side === "A" ? U.uMapA : U.uMapB, rect = side === "A" ? U.uRectA : U.uRectB;
    const g = side === "A" ? U.uGroundA : U.uGroundB, lm = side === "A" ? U.uLmA : U.uLmB;
    map.value = L.tex;
    rect.value.fromArray(L.rect);
    g.value = L.ground;
    L.lm.forEach((p, k) => lm.value[k].set(p[0], p[1]));
  };
  const begin = (to: number, dir: number) => {
    const next = laid.get(to);
    if (!next || !st.b) return;
    st.a = st.b; st.ia = st.ib;
    st.b = next; st.ib = to;
    st.p = 0; st.dir = dir;
    bind("A", st.a); bind("B", st.b);
    U.uDir.value = dir;
    U.uTravel.value = (st.a.sc.travel + st.b.sc.travel) / 2;
  };
  const settle = () => { if (!st.b) return; st.a = st.b; st.ia = st.ib; st.p = 1; bind("A", st.b); };
  const snap = (i: number) => {
    const L = laid.get(i);
    if (!L) return;
    st.b = L; st.ib = i;
    settle();
    bind("B", L);
    st.queued = null; st.fast = false;
    mesh.visible = true;
  };
  const noCover = new Float32Array(COVER_COLS).fill(99);

  return {
    mesh, count, sceneAt, ensure, ready, size: { W, H },
    get state() { return { a: st.ia, b: st.ib, p: st.p, fast: st.fast, queued: st.queued && st.queued.i }; },
    preload(i: number) {
      const keep = [st.ia, st.ib];
      for (let k = 0; k <= 2 * PRELOAD_RADIUS; k++) {
        const j = i + (k % 2 ? (k + 1) / 2 : -k / 2); // i, i+1, i-1, i+2, i-2 ...
        keep.push(j);
        ensure(j).catch(() => {});
      }
      evict(keep);
    },
    show(i: number) { snap(mod(i, count)); },
    // freeze a transition for stills: from scene f to scene t at progress p
    freeze(f: number, t: number, dir: number, p: number) {
      snap(mod(f, count));
      begin(mod(t, count), dir);
      st.p = p; U.uProg.value = p;
    },
    request(i: number, dir: number) {
      i = mod(i, count);
      if (!st.b) { st.queued = { i, dir }; return; }
      if (st.p < 1) { st.queued = { i, dir }; st.fast = true; return; }
      st.queued = i === st.ib ? null : { i, dir };
    },
    // returns true while something is changing
    update(dtMs: number, reduced: boolean) {
      if (st.p < 1) {
        st.p = reduced ? 1 : Math.min(1, st.p + dtMs / (MORPH_MS / (st.fast ? MORPH_RETARGET_SPEEDUP : 1)));
        if (st.p >= 1) settle();
      }
      if (st.p >= 1 && st.queued) {
        const q = st.queued;
        if (st.b && q.i === st.ib) { st.queued = null; st.fast = false; }
        else if (ready(q.i)) {
          st.queued = null;
          if (reduced || !st.b) snap(q.i);
          else begin(q.i, q.dir);
        } else ensure(q.i).catch(() => {});
      }
      if (st.p >= 1 && !st.queued) st.fast = false;
      U.uProg.value = st.p;
      return st.p < 1 || !!st.queued;
    },
    // grass footprint blended across the transition: lateral centre/half-width (world), per-column cover of A and B
    footprint(): Footprint {
      const e = st.p * st.p * (3 - 2 * st.p);
      if (!st.a || !st.b) return { offset: 0, half: W * 0.25, coverA: noCover, coverB: noCover, mix: 0 };
      const fa = st.a.foot, fb = st.b.foot;
      const mix = (x: number, y: number) => x + (y - x) * e;
      return { offset: (mix(fa.cx, fb.cx) - 0.5) * W, half: mix(fa.half, fb.half) * W, coverA: st.a.cover, coverB: st.b.cover, mix: e };
    },
    dispose() {
      for (const c of cache.values()) if (c.entry) { c.entry.tex.dispose(); c.entry.close(); }
      cache.clear(); laid.clear();
      blank.dispose(); mat.dispose(); mesh.geometry.dispose();
    },
  };
}
