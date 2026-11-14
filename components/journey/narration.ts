/* Narration player: one clip per story line from public/voice, played through WebAudio.
   Clips are fetched per chapter on demand (the next chapter is prefetched unless the reader saves data). While a line is
   audible the attached duck param is lowered so scene sound sits under the voice. Muted or without audio, a line still
   runs on the wall clock for its measured duration, so captions keep the same pacing. */

type Clip = { src: string; text: string; duration: number };
type Manifest = { voice: string; rate: number; breath: number; total: number; chapters: { id: string; lines: Clip[] }[] };
type Cur = { tk: number; key: string; clip: Clip | null; dur: number; wall0: number; at: number; src: AudioBufferSourceNode | null; g: GainNode | null; silent: boolean; done: (ok: boolean) => void; timer: ReturnType<typeof setTimeout> | null };
export type LineHandle = { duration: number; ended: Promise<boolean> };

var manifestP: Promise<Manifest | null> | null = null, manifest: Manifest | null = null;
var raw = new Map<string, Promise<ArrayBuffer | null>>(), dec = new Map<string, Promise<AudioBuffer | null>>();
var ctx: AudioContext | null = null, bus: GainNode | null = null, an: AnalyserNode | null = null, tbuf: Float32Array | null = null;
var outN: AudioNode | null = null, duckP: AudioParam | null = null, depth = 0.4, undT: ReturnType<typeof setTimeout> | null = null;
var muted = false, own = false, cur: Cur | null = null, token = 0, lev = 0, raf = 0;
var cbs = new Set<(v: number) => void>();

function loadManifest() {
  if (!manifestP) manifestP = fetch('/voice/manifest.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (m) { manifest = m; return m; }).catch(function () { return null; });
  return manifestP;
}
function chapter(id: string) { return manifest ? manifest.chapters.find(function (c) { return c.id === id; }) : undefined; }
function saveData() { var c = typeof navigator !== 'undefined' && (navigator as any).connection; return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))); }
function fetchRaw(src: string) {
  var p = raw.get(src);
  if (!p) { p = fetch(src).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).catch(function () { return null; }); raw.set(src, p); }
  return p;
}
function decode(src: string) {
  var c = ctx; if (!c) return Promise.resolve(null);
  var p = dec.get(src);
  if (!p) { p = fetchRaw(src).then(function (b) { return b ? c!.decodeAudioData(b.slice(0)) : null; }).catch(function () { return null; }); dec.set(src, p); }
  return p;
}
function graph() {
  if (!ctx || bus) return;
  bus = ctx.createGain(); bus.gain.value = muted ? 0 : 0.95;
  an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0; tbuf = new Float32Array(an.fftSize);
  bus.connect(an); an.connect(outN || ctx.destination);
}
function duck(on: boolean) {
  if (undT) { clearTimeout(undT); undT = null; }
  if (!duckP || !ctx) return;
  duckP.cancelScheduledValues(ctx.currentTime); duckP.setTargetAtTime(on ? depth : 1, ctx.currentTime, on ? 0.08 : 0.4);
}
function ensure() {
  if (ctx || typeof window === 'undefined') return;
  var AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return;
  ctx = new AC(); own = true; graph();
}
function audible() { return !!(ctx && ctx.state === 'running' && !muted); }

/* use the engine's AudioContext: the voice plays into `out` (default: the speakers), and `duck` is the gain of the scene
   sound that should sit under it */
export function attach(c: AudioContext, opts?: { out?: AudioNode; duck?: AudioParam; depth?: number }) {
  var o = (opts && opts.out) || null;
  if (ctx !== c || outN !== o) { halt(false); if (bus) { try { bus.disconnect(); an && an.disconnect(); } catch (e) { } } if (own && ctx && ctx !== c) { ctx.close(); own = false; } bus = null; an = null; if (ctx !== c) dec.clear(); ctx = c; outN = o; }
  duckP = (opts && opts.duck) || null; if (opts && opts.depth != null) depth = opts.depth;
  graph();
}

export function preload(chapterId: string): Promise<void> {
  return loadManifest().then(function () {
    var C = chapter(chapterId); if (!C) return;
    var all = C.lines.map(function (l) { return ctx ? decode(l.src) : fetchRaw(l.src); });
    var M = manifest!, k = M.chapters.indexOf(C), N = M.chapters[k + 1];
    if (N && !saveData()) Promise.all(all).then(function () { N.lines.forEach(function (l) { fetchRaw(l.src); }); });
    return Promise.all(all).then(function () { });
  });
}

export function duration(chapterId: string, lineIdx: number): number | undefined {
  var C = chapter(chapterId), l = C && C.lines[lineIdx]; return l ? l.duration : undefined;
}

function finish(tk: number, ok: boolean) {
  if (!cur || cur.tk !== tk) return;
  var c = cur; cur = null; if (c.timer) clearTimeout(c.timer);
  c.done(ok);
  undT = setTimeout(function () { undT = null; duck(false); }, 450);
}
function startAudio(c: Cur, buf: AudioBuffer, offset: number) {
  if (!ctx || !bus) return;
  var src = ctx.createBufferSource(), g = ctx.createGain(), at = ctx.currentTime + 0.012;
  src.buffer = buf; src.connect(g); g.connect(bus); src.start(at, Math.max(0, offset));
  c.src = src; c.g = g; c.at = at - offset; c.dur = buf.duration; c.wall0 = performance.now() + 12 - offset * 1000;
  src.onended = function () { if (cur === c) finish(c.tk, true); };
  if (c.timer) clearTimeout(c.timer);
  /* if the audio clock stalls, the line still ends on time and its source is dropped so it cannot play late */
  c.timer = setTimeout(function () { if (cur === c) { silence(c); finish(c.tk, true); } }, (buf.duration - offset) * 1000 + 250);
  duck(true); loop();
}
function silence(c: Cur) {
  if (c.src && ctx && c.g) { var t = ctx.currentTime; c.g.gain.setTargetAtTime(0, t, 0.015); try { c.src.stop(t + 0.08); } catch (e) { } c.src.onended = null; }
  c.src = null; c.g = null;
}

export function ready() { return loadManifest().then(function (m) { return !!m; }); }

/* plays one line; resolves once it is running with its duration and a promise for its end. Muted or `silent` lines run on
   the wall clock for the clip's measured duration (`fallback` seconds if there is no clip) */
export function play(chapterId: string, lineIdx: number, fallback?: number, silent?: boolean): Promise<LineHandle> {
  halt(false);
  var tk = ++token;
  return loadManifest().then(function () {
    var C = chapter(chapterId), clip = (C && C.lines[lineIdx]) || null;
    if (C && !muted && !silent) preload(chapterId);
    if (!muted && !silent) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () { }); }
    var want = clip && audible() && !silent ? decode(clip.src) : Promise.resolve(null);
    return want.then(function (buf) {
      var done: (ok: boolean) => void = function () { }, ended = new Promise<boolean>(function (r) { done = r; });
      if (tk !== token) { done(false); return { duration: clip ? clip.duration : fallback || 4, ended: ended }; }
      var dur = buf ? buf.duration : clip ? clip.duration : fallback || 4;
      var c: Cur = { tk: tk, key: chapterId + '-' + lineIdx, clip: clip, dur: dur, wall0: performance.now(), at: 0, src: null, g: null, silent: !!silent, done: done, timer: null };
      cur = c;
      if (buf && audible()) startAudio(c, buf, 0);
      else { c.timer = setTimeout(function () { finish(tk, true); }, dur * 1000); loop(); }
      return { duration: dur, ended: ended };
    });
  });
}

/* the audio clock, while it is audible and actually moving (an output device can stall it); otherwise the wall clock */
function clockOf(c: Cur) {
  var w = (performance.now() - c.wall0) / 1000;
  if (!c.src || !ctx) return { t: w, audio: false };
  var a = ctx.currentTime - c.at; return a > 0.02 || w < 0.4 ? { t: a, audio: true } : { t: w, audio: false };
}
/* seconds into the current line */
export function elapsed(): number {
  return cur ? Math.max(0, Math.min(cur.dur, clockOf(cur).t)) : 0;
}
export function speaking() { return !!cur; }

function halt(unduck: boolean) {
  token++;
  if (cur) { var c = cur; cur = null; if (c.timer) clearTimeout(c.timer); silence(c); c.done(false); }
  if (unduck) duck(false);
}
export function stop() { halt(true); }
/* the voice drops out but the line keeps its clock, so its caption finishes at the same pace */
export function quiet() { if (cur) { cur.silent = true; relink(cur, true); } }

export function setMuted(m: boolean) {
  if (muted === m) return; muted = m;
  if (ctx && bus) bus.gain.setTargetAtTime(m ? 0 : 0.95, ctx.currentTime, 0.04);
  if (cur) relink(cur, m);
}
function relink(c: Cur, m: boolean) {
  if (m) { if (c.src) { var t = elapsed(); silence(c); c.wall0 = performance.now() - t * 1000; c.timer && clearTimeout(c.timer); c.timer = setTimeout(function () { finish(c.tk, true); }, (c.dur - t) * 1000); } duck(false); return; }
  /* unmuted mid-line: pick the clip up where the captions are, if enough of it is left to be worth hearing */
  if (c.silent || !c.clip) return;
  ensure();
  if (audible()) decode(c.clip.src).then(function (buf) { var t = elapsed(); if (buf && cur === c && !c.src && c.dur - t > 0.6) startAudio(c, buf, t); });
}

function measure(): number {
  if (!cur) return 0;
  if (cur.src && an && tbuf && !muted && clockOf(cur).audio) {
    an.getFloatTimeDomainData(tbuf as any); var s = 0; for (var i = 0; i < tbuf.length; i++) s += tbuf[i] * tbuf[i];
    return Math.max(0, Math.min(1, (Math.sqrt(s / tbuf.length) - 0.01) / 0.17));
  }
  /* silent line: a speech-like syllable envelope so gestures still follow the caption */
  var t = elapsed(), br = manifest ? manifest.breath : 0.3; if (t > cur.dur - br) return 0;
  return 0.3 + 0.35 * Math.abs(Math.sin(t * 12.6)) * (0.6 + 0.4 * Math.sin(t * 2.1));
}
/* smoothed 0..1 voice level for jaw, nods and hands */
export function level(): number {
  var v = measure(); lev += (v - lev) * (v > lev ? 0.55 : 0.18); if (lev < 0.002) lev = 0;
  return lev;
}
function loop() {
  if (raf || !cbs.size || typeof requestAnimationFrame === 'undefined') return;
  var step = function () { var v = level(); cbs.forEach(function (cb) { cb(v); }); raf = cur || v > 0 ? requestAnimationFrame(step) : 0; };
  raf = requestAnimationFrame(step);
}
export function onLevel(cb: (v: number) => void): () => void {
  cbs.add(cb); loop();
  return function () { cbs.delete(cb); if (!cbs.size && raf) { cancelAnimationFrame(raf); raf = 0; } };
}
