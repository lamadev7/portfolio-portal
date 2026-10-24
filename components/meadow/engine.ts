// The meadow turntable: static painted field, orthographic camera orbiting at a grazing angle, one painted
// vignette per detent. startMeadow() wires it to the component's DOM and returns a full teardown.
import * as THREE from "three";
import {
  PALETTES, THEME_MS, DETENTS, DETENT_STEP_DEG, CAMERA_ELEVATION_DEG, CAMERA_DISTANCE, VIEW_TARGET_Y,
  TURN_RATE, DRAG_PX_PER_STEP, SHIFT_STEPS, VIGNETTE_OFFSET, VIGNETTE_SINK, EXIT_DRIFT, EXIT_FADE, LIVE_DELAY_MS,
  MORPH_MS, SEED, BLADE_BUDGET, GRASS_HEIGHT, WIND, MAX_DPR, FIT_PAD_X, FIT_PAD_BOTTOM, COVER_COLS, type Variant, type Palette,
} from "./config";
import { bakeGround, plantIsland, islandMask, groundHeight, EXTENT, GROUND_RES, ZONE_RES } from "./island";
import { createGrass, createContactShadow, makeNoiseTexture, makeGroundTexture, type Uniforms } from "./grass";
import { tileableFbm } from "./noise";
import { createVignette, type Vignette } from "./vignettes";

export interface MeadowElements {
  wrap: HTMLElement;   // the tall section; scroll through it turns the meadow
  pin: HTMLElement;    // the sticky 100svh block inside it
  root: HTMLElement;   // gets data-ready / data-still / data-turned
  stage: HTMLElement;  // the fixed-aspect, focusable box (observed for size and visibility)
  drift: HTMLElement;  // wrapper inside the stage; the canvas is created in here, exit drift/fade apply to it
  ring: SVGCircleElement; // the hint's progress ring
  ringLength: number;
  live: HTMLElement;
}

declare global {
  interface Window { __ready?: boolean; __meadow?: Record<string, unknown> }
}

type PaletteKey = Exclude<keyof Palette, "night">;
const PKEYS: PaletteKey[] = ["cool", "shade", "dark", "mid", "light", "hi", "dry", "tip", "red", "redLight", "redDark", "bloom", "violet", "haze", "vigTint"];
const isVariant = (v: unknown): v is Variant => v === "day" || v === "dusk" || v === "night";
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const mod = (n: number, m: number) => ((n % m) + m) % m;
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const STEP = (DETENT_STEP_DEG * Math.PI) / 180;
const PHI = (CAMERA_ELEVATION_DEG * Math.PI) / 180;

// The planted field's extent along the camera's right axis (lo, hi) and toward the camera (front), sampled per
// degree of azimuth from the convex hull of every blade root, loose shore flakes included. The frustum hugs it
// every frame, so the grass touches both sides of the stage at every angle and the front edge sits just above
// the stage's bottom edge.
type Fit = { lo: number; hi: number; front: number };
function buildFit(root: Float32Array, count: number): (az: number) => Fit {
  const N = GROUND_RES, S = 360;
  const cell = new Uint8Array(N * N);
  for (let k = 0; k < count; k++) {
    const i = Math.floor(((root[k * 4] / EXTENT) * 0.5 + 0.5) * N), j = Math.floor(((root[k * 4 + 1] / EXTENT) * 0.5 + 0.5) * N);
    if (i >= 0 && i < N && j >= 0 && j < N) cell[i * N + j] = 1;
  }
  // monotone-chain hull over occupied cell centres, already sorted by x then z by the scan order
  const pts: number[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (cell[i * N + j]) pts.push(((i + 0.5) / N * 2 - 1) * EXTENT, ((j + 0.5) / N * 2 - 1) * EXTENT);
  const cross = (o: number, a: number, b: number) => (pts[a] - pts[o]) * (pts[b + 1] - pts[o + 1]) - (pts[a + 1] - pts[o + 1]) * (pts[b] - pts[o]);
  const lower: number[] = [], upper: number[] = [];
  for (let p = 0; p < pts.length; p += 2) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let p = pts.length - 2; p >= 0; p -= 2) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const lo = new Float32Array(S + 1), hi = new Float32Array(S + 1), front = new Float32Array(S + 1);
  for (let s = 0; s <= S; s++) {
    const a = (s / S) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    let l = Infinity, h = -Infinity, f = -Infinity;
    for (const p of hull) {
      const x = pts[p], z = pts[p + 1];
      const r = x * ca - z * sa, t = x * sa + z * ca;
      if (r < l) l = r;
      if (r > h) h = r;
      if (t > f) f = t;
    }
    lo[s] = hull.length ? l : -10; hi[s] = hull.length ? h : 10; front[s] = hull.length ? f : 10;
  }
  return (az: number) => {
    const u = mod(az / (Math.PI * 2), 1) * S, i = Math.min(S - 1, Math.floor(u)), k = u - i;
    return { lo: lo[i] + (lo[i + 1] - lo[i]) * k, hi: hi[i] + (hi[i + 1] - hi[i]) * k, front: front[i] + (front[i + 1] - front[i]) * k };
  };
}
// index -> azimuth. Increasing the index swings the near side of the island to the right, so a rightward drag
// carries the grass under the pointer with it.
const azFor = (i: number) => -i * STEP;

export function startMeadow(els: MeadowElements): () => void {
  const { wrap, pin, root, stage, drift, ring, live } = els;
  const ac = new AbortController();
  const signal = ac.signal;
  const offs: Array<() => void> = [];
  const listen = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window | Document, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
    const h = fn as unknown as EventListener;
    el.addEventListener(type, h, opts);
    offs.push(() => el.removeEventListener(type, h, opts));
  };

  const q = new URLSearchParams(location.search);
  const RENDER = q.get("render") === "1";
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = !RENDER && reduceMQ.matches;
  window.__ready = false;

  const prevCM = THREE.ColorManagement.enabled;
  THREE.ColorManagement.enabled = false; // palettes are authored in sRGB and written straight out

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  drift.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, premultipliedAlpha: true,
    preserveDrawingBuffer: RENDER, powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DISTANCE * 2 + 40);
  const lookAt = new THREE.Vector3(0, VIEW_TARGET_Y, 0);
  const camFwd = new THREE.Vector3(), camRight = new THREE.Vector3();
  const toward2 = new THREE.Vector2(), right2 = new THREE.Vector2(), vigPos2 = new THREE.Vector2();

  // palette state (Color objects are shared by reference with every material)
  const cur = Object.fromEntries(PKEYS.map((k) => [k, new THREE.Color(PALETTES.day[k])])) as Record<PaletteKey, THREE.Color>;
  const night: THREE.IUniform<number> = { value: 0 };
  let palTween: { from: Record<PaletteKey, THREE.Color>; to: Record<PaletteKey, THREE.Color>; n0: number; n1: number; t0: number } | null = null;

  // ground + wind textures, planting
  const t0 = performance.now();
  const ground = bakeGround();
  let aspect = 2.5, pxW = 1;
  const plant = plantIsland(SEED, BLADE_BUDGET, ground);
  const fitAt = buildFit(plant.root, plant.count);
  const groundTex = makeGroundTexture(ground.data, GROUND_RES);
  const zoneTex = makeGroundTexture(ground.zone, ZONE_RES);
  const noiseTex = makeNoiseTexture(tileableFbm(256, 4, 4, 7), 256);
  const buildMs = Math.round(performance.now() - t0);

  const wd = (WIND.dirDeg * Math.PI) / 180;
  const vigU = new THREE.Vector4(0, 2, 9, Math.tan(PHI));
  const coverA = new Float32Array(COVER_COLS).fill(99), coverB = new Float32Array(COVER_COLS).fill(99);
  const U: Uniforms = {
    uHeightScale: { value: GRASS_HEIGHT }, uTime: { value: 0 }, uWindOn: { value: reduced ? 0 : 1 },
    uWindSpeed: { value: WIND.speed }, uWindBase: { value: WIND.base }, uWindGust: { value: WIND.gust }, uFlutter: { value: WIND.flutter },
    uExtent: { value: EXTENT }, uPixelWorld: { value: 0.01 },
    uWindDir: { value: new THREE.Vector2(Math.cos(wd), Math.sin(wd)) },
    uCamFwd: { value: camFwd }, uCamRight: { value: camRight },
    uVigPos: { value: vigPos2 }, uVigRight: { value: right2 }, uVigToward: { value: toward2 },
    uVig: { value: vigU },
    uCoverA: { value: coverA }, uCoverB: { value: coverB }, uCoverMix: { value: 0 },
    uGround: { value: groundTex }, uNoise: { value: noiseTex }, uZone: { value: zoneTex },
  };
  for (const k of PKEYS) U["u" + k[0].toUpperCase() + k.slice(1)] = { value: cur[k] };
  const tint = U.uVigTint as THREE.IUniform<THREE.Color>;

  const grass = createGrass(plant, U);
  scene.add(grass.group);
  const groundAt = (x: number, z: number) => groundHeight(islandMask(x, z));
  const shadow = createContactShadow(U.uShade as THREE.IUniform<THREE.Color>);
  shadow.material.uniforms.uOpacity.value = 0.38;
  shadow.visible = false;
  scene.add(shadow);
  let vig: Vignette = null;

  // ---------- state ----------
  let index = 0, az = 0, azTarget = 0, dirty = true, simTime = 0, booted = false, disposed = false;
  // the scene index is round(progress * DETENTS) + offset: scroll drives progress, drag and keys add the offset
  let progress = 0, offset = 0, exitY = 0, turned = false, liveTimer = 0;
  let drag: { id: number; x0: number; o0: number } | null = null;
  const geo = { range: 1, stageBottom: 1, pinTop: 0 };
  const stats = { frames: 0, dts: [] as number[] };
  let raf = 0, last = 0, onScreen = true, firstFrame = false;

  function placeCamera() {
    const c = Math.cos(PHI);
    camera.position.set(Math.sin(az) * c * CAMERA_DISTANCE, VIEW_TARGET_Y + Math.sin(PHI) * CAMERA_DISTANCE, Math.cos(az) * c * CAMERA_DISTANCE);
    camera.lookAt(lookAt);
    const fit = fitAt(az);
    const left = fit.lo - FIT_PAD_X, width = fit.hi + FIT_PAD_X - left;
    const bottom = -Math.sin(PHI) * fit.front - Math.cos(PHI) * VIEW_TARGET_Y - FIT_PAD_BOTTOM;
    camera.left = left; camera.right = left + width; camera.bottom = bottom; camera.top = bottom + width / aspect;
    camera.updateProjectionMatrix();
    U.uPixelWorld.value = width / pxW;
    camera.updateMatrixWorld();
    camFwd.subVectors(lookAt, camera.position).normalize();
    camRight.set(Math.cos(az), 0, -Math.sin(az));
    toward2.set(Math.sin(az), Math.cos(az));
    right2.set(Math.cos(az), -Math.sin(az));
    // the sheet rides the camera azimuth: a little toward the camera from the centre, on the terrain, facing it
    vigPos2.copy(toward2).multiplyScalar(VIGNETTE_OFFSET);
    if (vig) {
      vig.mesh.position.set(vigPos2.x, groundAt(vigPos2.x, vigPos2.y) - VIGNETTE_SINK, vigPos2.y);
      vig.mesh.rotation.set(0, az, 0);
      vig.mesh.scale.set(1, 1 / Math.cos(PHI), 1); // reads undistorted from the tilted camera
    }
  }

  function announce(now = false) {
    const s = mod(index, DETENTS);
    const alt = vig ? vig.sceneAt(s).alt : "";
    stage.setAttribute("aria-valuenow", String(s + 1));
    if (alt) stage.setAttribute("aria-valuetext", alt); else stage.removeAttribute("aria-valuetext");
    if (RENDER) return;
    // the live label waits for the scene to settle, so a scroll through the turn is not read out 24 times
    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => { if (!disposed) live.textContent = alt; }, now ? 0 : LIVE_DELAY_MS);
  }

  function setIndex(i: number) {
    if (i === index) return;
    const dir = Math.sign(i - index);
    index = i;
    if (vig) { vig.request(mod(index, DETENTS), dir); vig.preload(mod(index, DETENTS)); }
    announce();
    dirty = true;
    kick();
  }
  // progress and offset -> continuous camera target and the nearest scene
  function retarget() {
    const base = progress * DETENTS;
    azTarget = azFor(base + offset);
    if (reduced) az = azTarget;
    setIndex(Math.round(base) + offset);
  }
  const step = (n: number) => { offset += n; retarget(); };
  // nearest equivalent of scene s from the current index (shortest way round)
  const jumpTo = (s: number) => step(mod(s - mod(index, DETENTS) + DETENTS / 2, DETENTS) - DETENTS / 2);

  // scroll: progress through the pinned range, and how far the block has scrolled out after the pin releases
  function measure() {
    const pr = pin.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    geo.range = Math.max(1, wrap.offsetHeight - pin.offsetHeight);
    geo.stageBottom = Math.max(1, sr.bottom - pr.top);
    geo.pinTop = parseFloat(getComputedStyle(pin).top) || 0; // the pin sticks below the sticky header
  }
  function readScroll() {
    if (reduced || RENDER) return;
    const scrolled = geo.pinTop - wrap.getBoundingClientRect().top;
    const p = clamp(scrolled / geo.range, 0, 1);
    exitY = Math.max(0, scrolled - geo.range);
    if (p !== progress) { progress = p; retarget(); }
    ring.style.strokeDashoffset = String(els.ringLength * (1 - progress));
    const done = progress > 0.985;
    if (done !== turned) { turned = done; if (done) root.dataset.turned = "true"; else delete root.dataset.turned; }
    // leaving: the meadow drifts at EXIT_DRIFT of the exit distance and is gone by EXIT_FADE of it
    const fade = clamp(exitY / (EXIT_FADE * geo.stageBottom), 0, 1);
    drift.style.transform = exitY > 0 ? `translate3d(0, ${(exitY * EXIT_DRIFT).toFixed(1)}px, 0)` : "";
    drift.style.opacity = fade > 0 ? String(1 - fade * fade * (3 - 2 * fade)) : "";
  }

  function setVariant(v: Variant, instant = false) {
    const to = Object.fromEntries(PKEYS.map((k) => [k, new THREE.Color(PALETTES[v][k])])) as Record<PaletteKey, THREE.Color>;
    const toNight = PALETTES[v].night;
    if (instant || reduced) {
      for (const k of PKEYS) cur[k].copy(to[k]);
      night.value = toNight; palTween = null; dirty = true; kick(); return;
    }
    palTween = { from: Object.fromEntries(PKEYS.map((k) => [k, cur[k].clone()])) as Record<PaletteKey, THREE.Color>, to, n0: night.value, n1: toNight, t0: performance.now() };
    kick();
  }
  const themeNow = (): Variant => { const t = document.documentElement.dataset.theme; return isVariant(t) ? t : "day"; };

  // ---------- sizing ----------
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    aspect = w / h;
    pxW = w * dpr;
    measure();
    placeCamera();
    dirty = true;
    kick();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  ro.observe(wrap);
  offs.push(() => ro.disconnect());
  resize();

  // ---------- per-frame ----------
  function update(now: number, dt: number) {
    let animating = false;
    if (az !== azTarget) {
      az += (azTarget - az) * (1 - Math.exp(-(dt / 1000) * TURN_RATE));
      if (Math.abs(azTarget - az) < 1e-4) az = azTarget;
      animating = true;
    }
    if (vig && vig.update(dt, reduced)) animating = true;
    if (palTween) {
      const k = Math.min(1, (now - palTween.t0) / THEME_MS), e = ease(k);
      for (const kk of PKEYS) cur[kk].copy(palTween.from[kk]).lerp(palTween.to[kk], e);
      night.value = palTween.n0 + (palTween.n1 - palTween.n0) * e;
      if (k >= 1) palTween = null;
      animating = true;
    }
    placeCamera();
    U.uTime.value = simTime;
    if (vig) {
      const f = vig.footprint();
      vigU.set(f.offset, f.half, vig.size.W, Math.tan(PHI));
      coverA.set(f.coverA); coverB.set(f.coverB); U.uCoverMix.value = f.mix;
      shadow.visible = vig.mesh.visible;
      shadow.position.set(vigPos2.x + right2.x * f.offset, vig.mesh.position.y + VIGNETTE_SINK + 0.12, vigPos2.y + right2.y * f.offset);
      shadow.rotation.set(0, az, 0);
      shadow.scale.set(f.half * 1.15, 1, 1.1);
    }
    return animating || !!drag;
  }

  const draw = () => {
    renderer.render(scene, camera);
    if (!firstFrame) {
      firstFrame = true;
      requestAnimationFrame(() => { if (disposed) return; root.dataset.ready = "true"; window.__ready = true; });
    }
  };
  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    if (!reduced) simTime += dt / 1000;
    readScroll();
    const animating = update(now, dt);
    if (!reduced || animating || dirty) {
      draw();
      dirty = false;
      stats.frames++;
      stats.dts.push(dt);
      if (stats.dts.length > 240) stats.dts.shift();
    } else {
      // nothing moving under reduced motion: park the loop until the next input or theme change
      cancelAnimationFrame(raf); raf = 0;
    }
  }
  function start() { if (!raf && booted && onScreen && !document.hidden && !disposed) { last = 0; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function syncRun() { if (RENDER) return; (onScreen && !document.hidden) ? start() : stop(); }
  function kick() { if (!RENDER) start(); }

  // ---------- input ----------
  // stage drag: every DRAG_PX_PER_STEP of horizontal travel nudges one detent on top of the scroll position
  listen(canvas, "pointerdown", (e: PointerEvent) => {
    if (e.button !== 0 || reduced) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x0: e.clientX, o0: offset };
    stage.dataset.turning = "true";
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    delete stage.dataset.turning;
  };
  listen(canvas, "pointermove", (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const o = drag.o0 + Math.trunc((e.clientX - drag.x0) / DRAG_PX_PER_STEP);
    if (o !== offset) { offset = o; retarget(); }
  });
  listen(canvas, "pointerup", endDrag);
  listen(canvas, "pointercancel", endDrag);
  listen(canvas, "lostpointercapture", endDrag);

  // keys while the stage has focus: arrows step (Shift x6), Home/End jump to the first/last scene
  listen(stage, "keydown", (e: KeyboardEvent) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const n = e.shiftKey ? SHIFT_STEPS : 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") step(-n);
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") step(n);
    else if (e.key === "Home") jumpTo(0);
    else if (e.key === "End") jumpTo(DETENTS - 1);
    else return;
    e.preventDefault();
  });

  // theme: the site's header sets html[data-theme]
  const mo = new MutationObserver(() => setVariant(themeNow()));
  if (!RENDER) mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  offs.push(() => mo.disconnect());

  const onReduce = () => {
    if (RENDER) return;
    reduced = reduceMQ.matches;
    U.uWindOn.value = reduced ? 0 : 1;
    if (reduced) {
      progress = 0; exitY = 0; az = azTarget;
      drift.style.transform = ""; drift.style.opacity = "";
      delete root.dataset.turned;
      retarget();
    } else {
      measure();
    }
    dirty = true;
    kick();
  };
  reduceMQ.addEventListener("change", onReduce);
  offs.push(() => reduceMQ.removeEventListener("change", onReduce));
  const io = new IntersectionObserver((ents) => { onScreen = ents[ents.length - 1].isIntersecting; syncRun(); });
  io.observe(stage);
  offs.push(() => io.disconnect());
  listen(document, "visibilitychange", syncRun);

  // ---------- boot ----------
  window.__meadow = {
    step, jumpTo, stats, buildMs,
    get index() { return index; }, get pos() { return -az / STEP; }, get scene() { return mod(index, DETENTS); },
    get progress() { return progress; }, get offset() { return offset; }, get exit() { return exitY; },
    get morph() { return vig ? vig.state : null; }, get scenes() { return vig ? vig.count : 0; },
    instances: plant.count, heads: plant.heads.length / 3,
    // GPU cost probe: renders n frames back to back and waits for the GPU
    bench(n = 60) {
      const gl = renderer.getContext();
      gl.finish();
      const t = performance.now();
      for (let i = 0; i < n; i++) { U.uTime.value += 1 / 60; renderer.render(scene, camera); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      return (performance.now() - t) / n;
    },
  };

  const boot = async () => {
    vig = await createVignette(renderer, { tint, night, signal });
    if (disposed) { vig?.dispose(); vig = null; return; }
    if (vig) scene.add(vig.mesh);
    if (RENDER) {
      // stills contract: ?render=1&detent=<i>&variant=day|dusk|night&t=<s>[&morph=<0..1>&from=<i>]
      const det = parseInt(q.get("detent") || "0", 10) || 0;
      root.dataset.still = "true";
      const v = q.get("variant");
      const variant = isVariant(v) ? v : "day";
      document.documentElement.dataset.theme = variant;
      setVariant(variant, true);
      simTime = Math.max(0, parseFloat(q.get("t") || "0") || 0);
      index = det;
      const m = clamp(parseFloat(q.get("morph") || "") || 0, 0, 1);
      if (q.has("morph")) {
        const from = q.has("from") ? parseInt(q.get("from") || "0", 10) || 0 : det - 1;
        if (vig) {
          await Promise.all([vig.ensure(mod(from, DETENTS)), vig.ensure(mod(det, DETENTS))]).catch(() => {});
          vig.freeze(mod(from, DETENTS), mod(det, DETENTS), Math.sign(det - from) || 1, m);
        }
        // the camera at the same moment of a live turn (it eases exponentially while the sheet morphs)
        const k = 1 - Math.exp(-TURN_RATE * (m * MORPH_MS) / 1000);
        az = azFor(from + (det - from) * k);
      } else {
        if (vig) { await vig.ensure(mod(det, DETENTS)).catch(() => {}); vig.show(mod(det, DETENTS)); }
        az = azFor(det);
      }
      if (disposed) return;
      azTarget = az;
      announce();
      await document.fonts.ready;
      if (disposed) return;
      resize();
      update(performance.now(), 0);
      draw();
      return;
    }
    measure();
    readScroll();
    az = azTarget;
    const first = mod(index, DETENTS);
    if (vig) {
      await vig.ensure(first).catch(() => {});
      if (disposed) return;
      vig.show(first);
      vig.preload(first);
    }
    announce(true);
    setVariant(themeNow(), true);
    placeCamera();
    booted = true;
    syncRun();
  };
  boot().catch((err: unknown) => { if (!disposed) console.error("meadow:", err); });

  return () => {
    disposed = true;
    ac.abort();
    stop();
    for (const off of offs.splice(0)) off();
    if (vig) { vig.dispose(); vig = null; }
    grass.dispose();
    shadow.geometry.dispose(); shadow.material.dispose();
    groundTex.dispose(); zoneTex.dispose(); noiseTex.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    window.clearTimeout(liveTimer);
    drift.style.transform = ""; drift.style.opacity = "";
    ring.style.strokeDashoffset = "";
    delete root.dataset.turned;
    delete root.dataset.ready;
    delete root.dataset.still;
    delete stage.dataset.turning;
    THREE.ColorManagement.enabled = prevCM;
    if (window.__meadow && window.__meadow.instances === plant.count) delete window.__meadow;
  };
}
