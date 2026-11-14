import * as THREE from "three";
import * as narr from "../journey/narration";
import { STORY, TRAVEL, type StoryBeat, type StoryChapter } from "../journey/story";
import { NIGHT, STOPS, type Outfit, type Character, type CharacterFactory, type CharState, type FrameCtx, type LocationScene, type Shot, type Stand, type Stop, type V3 } from "./contracts";
import { CANCELLED, Renderer } from "./render";
import { CameraRig, type Subject } from "./camera";
import { WALK_PACE, Walker, validatePath } from "./nav";
import { placeholderCharacters } from "./placeholder-characters";
import { START, characterFactory, createAerial, sceneModule, stubScene, type AerialMod } from "./index";

/* Walks STOPS in order: aerial leg → crossfade onto the scene's arrival shot → the hero walks in, turns at his stand and the
   chapter plays → he walks out, the camera cranes up → crossfade back to the aerial. Flyby stops orbit with a caption. Every
   async step carries a run token; prev/next/deep links bump it, which unwinds the old run at its next await. */

export type Phase = "intro" | "aerial" | "load" | "xfade" | "arrive" | "walk" | "talk" | "orbit" | "leave" | "end";

export interface Caption { mode: "say" | "travel"; kicker: string; title: string; text: string; li: number; n: number; ach?: string; cta?: boolean }
export interface Ui {
  ready: boolean; started: boolean; i: number; phase: Phase; paused: boolean; hold: boolean; ended: boolean; loading: boolean; muted: boolean;
  date: string; cap: Caption | null; stubs: { aerial: boolean; chars: boolean };
}
export interface Els { gl: HTMLCanvasElement; aerial: HTMLElement; bubble: () => HTMLElement | null; typed: () => HTMLElement | null; bar: () => HTMLElement | null }

const ABORT = { abort: true };
/* a network hiccup must never leave the tour waiting forever on an asset */
const within = <T,>(p: Promise<T>, ms: number, what: string) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(what + " timed out")), ms))]);
const N = STOPS.length;
const CH = new Map<string, StoryChapter>([...STORY, ...TRAVEL].map((c) => [c.id, c]));
const META: Record<string, { date: string; ach?: string }> = {
  sarlahi: { date: "EARLY YEARS" }, uniglobe: { date: "2019 – 2020" }, herald: { date: "FEB 2021" }, princelab: { date: "JAN 2022", ach: "First role in tech" },
  portpro: { date: "JUN 2022 → NOW", ach: "~40% faster new screens" }, "aaa-2023": { date: "2023", ach: "AAA Scholarship · 2023" },
  graduation: { date: "OCT 2023", ach: "First Class Honours" }, "aaa-2024": { date: "2024", ach: "AAA Scholarship · 2024" },
  supervisor: { date: "AUG 2025 → APR 2026", ach: "~12 teams supervised" }, agents: { date: "NOW" }, next: { date: "NEXT" },
};
const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);
const dateOf = (s: Stop) => (s.chapters[0] && META[s.chapters[0]] ? META[s.chapters[0]].date : "");

function beatState(b: StoryBeat | undefined, act: CharState): CharState {
  const seated = act === "sit" || act === "type";
  switch (b) {
    case "type": return "type";
    case "sit": return "sit";
    case "toss": return "toss";
    case "point": return seated ? act : "point";
    case "gaze": return seated ? act : "look";
    default: return act === "idle" || act === "walk" ? "talk" : act;
  }
}

class Perf {
  b: Record<string, number[]> = {};
  scenes: Record<string, { calls: number; tris: number; tier: number }> = {};
  scene(id: string, calls: number, tris: number, tier: number) { const o = this.scenes[id] || (this.scenes[id] = { calls: 0, tris: 0, tier: 0 }); o.calls = Math.max(o.calls, calls); o.tris = Math.max(o.tris, tris); o.tier = Math.max(o.tier, tier); }
  add(k: string, ms: number) { (this.b[k] || (this.b[k] = [])).push(ms); }
  stats() {
    const o: Record<string, { frames: number; fps: number; p95: number; max: number; over33: number; over50: number }> = {};
    for (const k in this.b) {
      const a = this.b[k].slice().sort((x, y) => x - y), s = a.reduce((x, y) => x + y, 0);
      o[k] = { frames: a.length, fps: Math.round((1000 * a.length) / Math.max(1, s) * 10) / 10, p95: Math.round(a[Math.floor(a.length * 0.95)] * 10) / 10, max: Math.round(a[a.length - 1] * 10) / 10, over33: a.filter((x) => x > 33.4).length, over50: a.filter((x) => x > 50).length };
    }
    return o;
  }
  reset() { this.b = {}; }
}

interface Loc { stop: Stop; scene: LocationScene; npcs: Character[] }
interface Pre { id: string; ctl: { cancelled?: boolean }; p: Promise<Loc> }

export class Director {
  ui: Ui = { ready: false, started: false, i: 0, phase: "intro", paused: false, hold: false, ended: false, loading: false, muted: false, date: "", cap: null, stubs: { aerial: true, chars: true } };
  perf = new Perf();
  loads: Record<string, Record<string, number>> = {};
  long: { ms: number; phase: string; act: string; stop: string; task?: boolean }[] = [];
  private lt: PerformanceObserver | null = null;
  private act = "";
  r!: Renderer;
  rig = new CameraRig();
  private aerial!: AerialMod["aerial"];
  private toShot: AerialMod["toShot"];
  private chars!: CharacterFactory;
  private hero: Character | null = null;
  private walker: Walker | null = null;
  private loc: Loc | null = null;
  private pre: Pre | null = null;
  private at: Stop = START;
  private stand: Stand | null = null;
  private tk = 0;
  private ctl: AbortController | null = null;
  private timers: { at: number; res: () => void }[] = [];
  private waits: { pred: () => boolean; res: () => void }[] = [];
  private clock = 0; private last = 0; private raf = 0; private glOn = false; private visible = true; private disposed = false;
  private fade = { a: 0, from: 0, to: 0, t: 0, d: 0.9, res: null as null | (() => void) };
  private fctx: FrameCtx = { heroPos: [0, 0, 0], speaking: false, talkLevel: 0 };
  private line = { text: "", dur: 1 };
  private audio: AudioContext | null = null;
  private bub = { x: -1, y: -1, w: 0, h: 0, key: "" };
  private warned = new Set<string>();
  private subj: Subject = { pos: new THREE.Vector3(), yaw: 0, speed: 0, height: 1.74 };
  private hid = false;
  private onVis = () => {
    if (document.hidden) { if (this.ui.started && !this.ui.paused) { this.hid = true; this.pause(); } }
    else if (this.hid) { this.hid = false; this.last = performance.now(); this.set({ paused: false }); }
  };
  private kick = () => { if (this.audio && this.audio.state === "suspended" && !this.ui.muted) this.audio.resume().catch(() => {}); };

  constructor(private els: Els, private emit: (u: Ui) => void) {}

  private set(p: Partial<Ui>) { this.ui = { ...this.ui, ...p }; this.emit(this.ui); }

  async mount() {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) { this.audio = new AC(); narr.attach(this.audio!); }
    ["pointerdown", "keydown", "touchstart"].forEach((e) => window.addEventListener(e, this.kick, { passive: true }));
    this.r = new Renderer(this.els.gl);
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    const c = await characterFactory();
    const a = await createAerial(c.f);
    if (this.disposed) { a.aerial.dispose(); return; }
    this.aerial = a.aerial; this.toShot = a.toShot; this.chars = c.f;
    await this.aerial.mount(this.els.aerial);
    this.aerial.setActive(true);
    this.aerial.prefetch(STOPS[0]);
    sceneModule(STOPS[0].scene);
    const outfit = STOPS[0].chapters[0] === "sarlahi" ? "kid-school" : "student";
    try { await within(this.chars.preload(), 30000, "character preload"); this.hero = await within(this.chars.hero(outfit), 20000, "hero"); }
    catch (e) { console.warn("journey2: characters unavailable, using stand-ins", e); this.chars = placeholderCharacters; c.stub = true; this.hero = await placeholderCharacters.hero(outfit); }
    if (this.disposed) return;
    this.hero.root.visible = false;
    this.r.stage.add(this.hero.root);
    this.walker = new Walker(this.hero);
    this.subj.height = this.hero.height;
    narr.ready();
    this.set({ ready: true, stubs: { aerial: a.stub, chars: c.stub } });
    const k = this.hashStop();
    /* the first scene builds and warms behind the intro, where a hitch can't be seen */
    this.pre = this.prebuild(STOPS[k >= 0 ? k : 0], k >= 0 ? 4 : 10);
    /* every outfit he wears on the road, behind the intro */
    if (k < 0) this.warmOutfits(["kid-school", "student", "college", "office", "graduate", "mountaineer"], "intro");
    try {
      this.lt = new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (this.ui.started && this.long.length < 400) this.long.push({ ms: Math.round(e.duration), phase: this.ui.phase, act: this.act + (this.r.warmStage ? ":" + this.r.warmStage : ""), stop: STOPS[this.ui.i].id, task: true }); }));
      this.lt.observe({ type: "longtask", buffered: false } as PerformanceObserverInit);
    } catch (e) { this.lt = null; }
    if (k >= 0) this.start(k);
    window.addEventListener("hashchange", this.onHash);
    document.addEventListener("visibilitychange", this.onVis);
  }

  dispose() {
    this.disposed = true; this.tk++; this.abortAll();
    cancelAnimationFrame(this.raf); narr.stop();
    ["pointerdown", "keydown", "touchstart"].forEach((e) => window.removeEventListener(e, this.kick));
    window.removeEventListener("hashchange", this.onHash);
    document.removeEventListener("visibilitychange", this.onVis);
    if (this.loc) { this.discard(this.loc); this.loc = null; }
    this.drop(this.pre); this.pre = null;
    this.lt && this.lt.disconnect();
    this.hero && this.hero.dispose();
    this.aerial && this.aerial.dispose();
    this.r && this.r.dispose();
    this.audio && this.audio.close().catch(() => {});
  }

  resize() {
    if (!this.r) return;
    const c = this.els.gl, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.r.resize(w, h); this.bub.key = "";
  }

  /* ---------- controls ---------- */

  start(i = this.hashStop() >= 0 ? this.hashStop() : 0) { this.kick(); this.set({ started: true }); this.go(i); }
  go(i: number) {
    if (!this.ui.ready) return;
    i = Math.max(0, Math.min(N - 1, i));
    this.tk++; this.abortAll();
    this.set({ started: true, paused: false, hold: false, ended: false });
    this.run(i, this.tk);
  }
  next() { if (this.ui.i < N - 1) this.go(this.ui.i + 1); }
  prev() { this.go(this.ui.ended ? N - 2 : this.ui.i - 1); }
  pause() { if (this.ui.paused) return; narr.stop(); this.set({ paused: true }); }
  play() { if (this.ui.ended) return this.go(0); this.set({ paused: false, hold: false }); }
  toggle() { this.ui.paused || this.ui.hold || this.ui.ended ? this.play() : this.pause(); }
  /* user input (look-around, scrolling) stops the tour moving on, without cutting the current line */
  interrupt() { if (this.ui.started && !this.ui.hold && !this.ui.paused && !this.ui.ended) this.set({ hold: true }); }
  setMuted(m: boolean) { narr.setMuted(m); this.set({ muted: m }); if (!m) this.kick(); }
  setVisible(on: boolean) {
    if (this.visible === on) return;
    this.visible = on;
    if (!on) { narr.stop(); if (this.aerial) this.aerial.setActive(false); }
    else { this.last = performance.now(); if (this.aerial && (!this.loc || this.ui.phase === "xfade" || this.ui.phase === "leave")) this.aerial.setActive(true); }
  }
  look(dx: number, dy: number) { this.rig.yawOff = Math.max(-1.2, Math.min(1.2, this.rig.yawOff - dx * 0.005)); this.rig.pitchOff = Math.max(-0.3, Math.min(0.5, this.rig.pitchOff + dy * 0.004)); }
  dragging(on: boolean) { this.rig.dragging = on; }

  private hashStop() { const m = /stop=([\w-]+)/.exec(location.hash || ""); return m ? STOPS.findIndex((s) => s.id === m[1]) : -1; }
  private onHash = () => { const k = this.hashStop(); if (k >= 0 && k !== this.ui.i) this.go(k); };
  private setHash(id: string) { try { history.replaceState(null, "", "#stop=" + id); } catch (e) { /* ignore */ } }

  /* ---------- run machinery ---------- */

  private abortAll() {
    narr.stop();
    if (this.ctl) { this.ctl.abort(); this.ctl = null; }
    const t = this.timers, w = this.waits; this.timers = []; this.waits = [];
    t.forEach((x) => x.res()); w.forEach((x) => x.res());
    if (this.fade.res) { const f = this.fade.res; this.fade.res = null; f(); }
    if (this.walker && this.walker.busy) this.walker.stop();
  }
  private async step<T>(p: Promise<T>, tk: number): Promise<T> { const v = await p; if (tk !== this.tk) throw ABORT; return v; }
  private sleep(sec: number, tk: number) { return this.step(new Promise<void>((res) => this.timers.push({ at: this.clock + sec, res })), tk); }
  private until(pred: () => boolean, tk: number) { return pred() ? this.step(Promise.resolve(), tk) : this.step(new Promise<void>((res) => this.waits.push({ pred, res })), tk); }
  private fadeTo(a: number, d: number, tk: number) {
    return this.step(new Promise<void>((res) => { const f = this.fade; if (f.res) f.res(); f.from = f.a; f.to = a; f.t = 0; f.d = d; f.res = res; }), tk);
  }

  private async run(target: number, tk: number) {
    try {
      if (this.loc) await this.leave(tk, true);
      for (let i = target; i < N; i++) {
        await this.arrive(this.at, i, tk);
        await this.perform(i, tk);
        if (i === N - 1) { this.set({ phase: "end", ended: true }); return; }
        await this.until(() => !this.ui.hold && !this.ui.paused, tk);
        await this.leave(tk, false);
      }
    } catch (e) {
      if (e !== ABORT && !(e && (e as Error).name === "AbortError")) console.warn("journey2", e);
    }
  }

  private prebuild(stop: Stop, budget = 4): Pre { const ctl = {}, p = this.build(stop, ctl, budget); p.catch(() => {}); return { id: stop.id, ctl, p }; }
  private drop(pre: Pre | null) { if (!pre) return; pre.ctl.cancelled = true; pre.p.then((L) => this.discard(L), () => {}); }

  /* construct a stop's scene and prepare it offscreen; nothing on screen changes until mount() */
  private async build(stop: Stop, ctl: { cancelled?: boolean }, budget: number): Promise<Loc> {
    const npcs: Character[] = [], f = this.chars;
    const ctx = {
      THREE, renderer: this.r.gl, quality: this.r.quality,
      characters: { preload: () => f.preload(), hero: (o: any) => f.hero(o), npc: async (k: any, s: number) => { const c = await f.npc(k, s); npcs.push(c); return c; } } as CharacterFactory,
    };
    const T0 = performance.now(), lt: Record<string, number> = (this.loads[stop.id] = {});
    this.act = "import " + stop.id;
    const mod = await sceneModule(stop.scene);
    if (ctl.cancelled || this.disposed) throw ABORT;
    lt.import = Math.round(performance.now() - T0);
    let scene: LocationScene;
    const T1 = performance.now(); this.act = "build " + stop.id;
    try { scene = await within(mod.build(ctx), 45000, "scene " + stop.scene); }
    catch (e) {
      console.warn("journey2: scene " + stop.scene + " failed to build, using the stand-in", e);
      scene = await stubScene(stop.scene, ctx);
    }
    lt.build = Math.round(performance.now() - T1);
    if (ctl.cancelled || this.disposed) { scene.dispose(); throw ABORT; }
    if (process.env.NODE_ENV !== "production") this.check(stop, scene);
    this.act = "warm " + stop.id;
    try { Object.assign(lt, await this.r.prepare(scene.group, ctl, budget)); }
    catch (e) { scene.dispose(); throw e === CANCELLED ? ABORT : e; }
    finally { this.act = ""; }
    if (ctl.cancelled || this.disposed) { scene.dispose(); throw ABORT; }
    return { stop, scene, npcs };
  }

  /* outfits compiled and first-drawn offscreen while he is out of shot; one at a time, since it borrows his root */
  private heroQ: Promise<void> = Promise.resolve();
  private warmOutfits(fits: Outfit[], tag: string) {
    const h = this.hero; if (!h || !fits.length) return this.heroQ;
    this.heroQ = this.heroQ.then(async () => {
      const T = performance.now(); this.act = "hero " + tag;
      try { for (const o of fits) { h.setOutfit(o); await this.r.prepare(h.root, {}); } }
      catch (e) { console.warn("journey2 hero warm", e); }
      finally { this.act = ""; h.setOutfit(fits[0]); }
      (this.loads[tag] || (this.loads[tag] = {})).hero = Math.round(performance.now() - T);
    });
    return this.heroQ;
  }
  private warmHero(L: Loc) {
    if (L.stop.flyby) return this.heroQ;
    const fits = Array.from(new Set((L.stop.chapters.length ? L.stop.chapters : ["visit"]).map((k) => L.scene.stands[k]).filter(Boolean).map((s) => s.outfit)));
    return this.warmOutfits(fits, L.stop.id);
  }

  /* make a prepared scene the live one */
  private goLive(L: Loc) {
    const sc = L.scene;
    this.r.stage.add(sc.group);
    if (!this.r.normalize(sc.group) && process.env.NODE_ENV !== "production") console.warn("journey2 scene " + sc.id + ": more than " + NIGHT.maxShadingLights + " point or spot lights");
    this.r.setEnv(sc.env); this.r.setEdge(sc.group);
    this.rig.setColliders(sc.colliders);
    if (this.walker && this.hero) {
      this.walker.setColliders(sc.colliders);
      const np = L.npcs.map(() => new THREE.Vector3());
      this.walker.obstacles = () => L.npcs.map((c, j) => c.root.getWorldPosition(np[j]));
      this.walker.place(sc.spawn.pos, sc.spawn.yaw);
      const s0 = this.firstStand(L.stop, sc); if (s0) this.hero.setOutfit(s0.outfit);
    }
    this.loc = L;
  }

  private check(stop: Stop, sc: LocationScene) {
    const keys = stop.flyby ? [] : stop.chapters.length ? stop.chapters : ["visit"];
    const need = stop.flyby ? [] : keys.map((k, j) => (j ? keys[j - 1] : "spawn") + ">" + k).concat(stop.id === "everest" ? [] : [keys[keys.length - 1] + ">exit"]);
    const miss = need.filter((k) => !sc.paths[k]).concat((stop.flyby ? ["flyby"] : keys).filter((k) => !sc.stands[k]).map((k) => "stand " + k));
    const bad = Object.keys(sc.paths).filter((k) => validatePath(sc.paths[k], sc.colliders) > 0);
    const msg = (miss.length ? "missing " + miss.join(", ") : "") + (bad.length ? " paths touching colliders: " + bad.join(", ") : "");
    if (msg && !this.warned.has(stop.id)) { this.warned.add(stop.id); console.warn("journey2 scene " + sc.id + ": " + msg); }
  }

  private firstStand(stop: Stop, sc: LocationScene) { return stop.flyby ? null : sc.stands[stop.chapters[0] || "visit"] || null; }

  private async arrive(from: Stop, i: number, tk: number) {
    const stop = STOPS[i];
    this.set({ i, phase: "aerial", cap: null, date: dateOf(stop), loading: false });
    this.setHash(stop.id);
    this.aerial.setActive(true);
    const pre = this.pre && this.pre.id === stop.id ? this.pre : this.prebuild(stop);
    if (this.pre && this.pre !== pre) this.drop(this.pre);
    this.pre = null;
    const ready = pre.p.then((L) => this.warmHero(L).then(() => L));
    ready.catch(() => {});
    if (from.id !== stop.id) {
      this.ctl = new AbortController();
      /* a leg that cannot finish (tiles failing on a bad network) is cut short rather than left hanging */
      const ctl = this.ctl;
      try { await this.step(within(this.aerial.fly(from, stop, { signal: ctl.signal }), 45000, "aerial leg").catch((e) => { if (tk === this.tk && /timed out/.test(String(e && e.message))) { console.warn("journey2:", e.message); ctl.abort(); return; } throw e; }), tk); }
      catch (e) { this.drop(pre); throw e; }
      this.ctl = null;
    }
    this.at = stop;
    let done = false; ready.then(() => (done = true), () => {});
    await Promise.resolve();
    if (!done) this.set({ phase: "load", loading: true });
    let loc: Loc;
    try { loc = await this.step(ready, tk); } catch (e) { this.drop(pre); throw e; }
    let q = performance.now();
    this.goLive(loc);
    this.slow("goLive", q);
    const sc = loc.scene;
    /* both cameras keep moving through the crossfade: the 3D one starts on the aerial's line of sight, a little further out, and
       swings onto the scene's arrival shot */
    const a = sc.arrival, e = v3(a.cam), l = v3(a.look), d = e.distanceTo(l) * 1.35;
    let dir = e.clone().sub(l).normalize(), fov = (a.fov ?? 50) + 4;
    const ap = this.aerial.pose && this.toShot ? this.toShot(stop, this.aerial.pose()) : null;
    if (ap) { const s0 = v3(ap.cam).sub(v3(ap.look)); if (s0.lengthSq() > 1) { dir = s0.normalize(); fov = ap.fov ?? fov; } }
    this.rig.cut({ cam: l.clone().addScaledVector(dir, d).toArray() as V3, look: a.look, fov });
    this.rig.blend(a, 2.8, 0, true);
    this.glOn = true; this.r.adapt = false;
    this.set({ phase: "xfade", loading: false });
    await this.fadeTo(1, 0.9, tk);
    this.aerial.setActive(false);
    this.r.adapt = true;
    this.set({ phase: "arrive" });
  }

  private async perform(i: number, tk: number) {
    const stop = STOPS[i], sc = this.loc!.scene;
    if (i + 1 < N) this.aerial.prefetch(STOPS[i + 1]);
    if (stop.flyby) return this.flyby(stop, sc, tk);
    const hero = this.hero!, w = this.walker!, keys = stop.chapters.length ? stop.chapters : ["visit"];
    hero.root.visible = true;
    await this.sleep(0.5, tk);
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k], stand = sc.stands[key] || this.fallbackStand(sc);
      hero.setOutfit(stand.outfit); hero.lookAt(null);
      const path = sc.paths[(k ? keys[k - 1] : "spawn") + ">" + key] || [w.pos.toArray() as V3, stand.pos];
      this.stand = stand;
      /* he enters out of shot, so start him already facing along the path */
      if (k === 0 && path.length > 1) { const q = path.find((p) => Math.hypot(p[0] - path[0][0], p[2] - path[0][2]) > 0.5) || path[1]; w.place(path[0], Math.atan2(q[0] - path[0][0], q[2] - path[0][2])); }
      this.set({ phase: "walk", cap: null });
      /* a long entrance plays as an establishing shot at walking pace, the arrival camera still pushing in, then cuts on his
         stride to the follow-cam already swinging in behind him for the last stretch */
      let len = 0; for (let q = 1; q < path.length; q++) len += v3(path[q]).distanceTo(v3(path[q - 1]));
      const long = len > 24, walking = w.walk(path, stand.yaw, long ? WALK_PACE : undefined);
      if (k === 0 && long) {
        this.rig.drift = 0.9;
        const t0 = this.clock;
        await this.until(() => this.clock - t0 > 5 || (this.clock - t0 > 2.4 && w.speed > WALK_PACE * 0.85 && w.remaining > 18), tk);
        if (w.skipTo(16)) this.rig.follow(this.subject(), 0.45); else this.rig.follow(this.subject());
      } else {
        if (k === 0) await this.sleep(1.4, tk);
        this.rig.follow(this.subject());
      }
      await this.until(() => !w.busy || w.pos.distanceTo(v3(stand.pos)) < 2.4, tk);
      this.rig.blend(stand.shot, 2.2, 0.25);
      await this.step(walking, tk);
      hero.play(stand.act, 0.35);
      this.rig.sign = stand.sign || null; this.rig.handheld = 1;
      await this.sleep(0.4, tk);
      this.set({ phase: "talk" });
      if (k === 0) this.prefetch(i);
      await this.speak(key === "visit" ? stop.id : key, stop, stand, tk);
      this.rig.handheld = 0; this.rig.sign = null;
    }
    if (i === N - 1) {
      this.set({ cap: { mode: "say", kicker: "", title: "Much more to go.", text: "Open my résumé, or just say hello.", li: 0, n: 0, cta: true } });
      hero.play("look", 0.6);
      await this.sleep(1.5, tk);
      this.rig.blend(sc.arrival, 7, 2, true);
      return;
    }
    const out = sc.paths[keys[keys.length - 1] + ">exit"];
    this.set({ phase: "leave", cap: null });
    hero.lookAt(null);
    if (out) { w.walk(out); this.rig.follow(this.subject()); await this.sleep(2.4, tk); }
  }

  private async flyby(stop: Stop, sc: LocationScene, tk: number) {
    const st = sc.stands.flyby, shot: Shot = st ? st.shot : sc.arrival;
    if (this.hero) this.hero.root.visible = false;
    this.set({ phase: "orbit" });
    this.rig.blend(shot, 2.8, 3, true);
    await this.sleep(2.8, tk);
    this.rig.orbit(shot);
    this.prefetch(STOPS.indexOf(stop));
    await this.speak(stop.id, stop, null, tk);
    await this.sleep(1, tk);
  }

  private async leave(tk: number, fast: boolean) {
    this.set({ phase: "leave", cap: null });
    this.rig.crane();
    if (!fast) await this.sleep(1.2, tk);
    this.aerial.setActive(true);
    const lift = this.aerial.liftFrom(this.at); lift.catch(() => {});
    this.r.adapt = false;
    try { await this.fadeTo(0, fast ? 0.5 : 0.9, tk); }
    finally {
      this.glOn = false;
      const L = this.loc; this.loc = null;
      if (L) { this.r.stage.remove(L.scene.group); L.scene.dispose(); }
      this.r.normalize(null);
      if (this.walker && this.walker.busy) this.walker.stop();
      if (this.hero) this.hero.root.visible = false;
      this.rig.setColliders([]);
    }
    await this.step(within(lift, 12000, "lift-off").catch(() => {}), tk);
  }

  /* the next stop starts building and warming as soon as this one starts talking */
  private prefetch(i: number) { const n = STOPS[i + 1]; if (n && !this.pre) this.pre = this.prebuild(n); }

  private discard(L: Loc) { this.r.stage.remove(L.scene.group); L.scene.dispose(); }

  private fallbackStand(sc: LocationScene): Stand {
    const p = v3(sc.spawn.pos), f = new THREE.Vector3(Math.sin(sc.spawn.yaw), 0, Math.cos(sc.spawn.yaw)), s = p.clone().addScaledVector(f, 8);
    const cam = s.clone().addScaledVector(f, 4.5).add(new THREE.Vector3(1.2, 1.7, 0));
    return { pos: s.toArray() as V3, yaw: sc.spawn.yaw + Math.PI, act: "talk", outfit: "college", shot: { cam: cam.toArray() as V3, look: [s.x, s.y + 1.4, s.z], fov: 42 } };
  }

  private subject(): Subject {
    const w = this.walker!; this.subj.pos.copy(w.pos); this.subj.yaw = w.yaw; this.subj.speed = w.speed; return this.subj;
  }

  /* one chapter's lines, each paced by its narrated clip; a pause cuts the line and it replays on resume */
  private async speak(id: string, stop: Stop, stand: Stand | null, tk: number) {
    const C = CH.get(id); if (!C) { await this.sleep(2, tk); return; }
    const sc = this.loc!.scene, meta = META[id], hero = this.hero!;
    await Promise.race([narr.preload(id), new Promise((r) => setTimeout(r, 1500))]);
    if (tk !== this.tk) throw ABORT;
    if (stand) hero.lookAt(this.rig.eye.toArray() as V3);
    const n = C.lines.length, no = STORY.findIndex((c) => c.id === id);
    for (let li = 0; li < n; li++) {
      await this.until(() => !this.ui.paused && this.visible, tk);
      const L = C.lines[li];
      this.fctx.chapter = id; this.fctx.line = li; this.fctx.beat = L.beat;
      sc.events && sc.events.line && sc.events.line(li, n);
      if (L.beat && sc.events && sc.events.beat) sc.events.beat(L.beat);
      if (stand) hero.play(beatState(L.beat, stand.act), 0.4);
      this.line = { text: L.text, dur: 4 };
      this.set({
        cap: {
          mode: stand ? "say" : "travel", kicker: no >= 0 ? "Chapter " + String(no + 1).padStart(2, "0") + (meta ? " · " + meta.date : "") : stop.region,
          title: C.title, text: L.text, li, n, ach: meta && meta.ach && li === n - 1 ? meta.ach : undefined,
        },
      });
      const h = await this.step(narr.play(id, li, Math.max(2.6, L.text.length / 15)), tk);
      this.line.dur = h.duration;
      const ok = await this.step(h.ended, tk);
      if (!ok) { li--; continue; }
      await this.sleep(li === n - 1 ? 0.6 : 0.25, tk);
    }
    if (stand) { hero.play(stand.act, 0.5); hero.lookAt(null); }
  }

  /* ---------- frame ---------- */

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const ms = now - this.last; this.last = now;
    if (!this.visible || !this.r) return;
    const dt = Math.min(0.1, ms / 1000), run = !this.ui.paused, ddt = run ? dt : 0;
    if (!document.hidden && this.ui.started) { this.perf.add(this.ui.i + "|" + this.ui.phase, ms); if (ms > 50 && this.long.length < 200) this.long.push({ ms: Math.round(ms), phase: this.ui.phase, act: this.act + (this.r.warmStage ? ":" + this.r.warmStage : ""), stop: STOPS[this.ui.i].id }); }
    if (run) {
      this.clock += dt;
      if (this.timers.length) { const due = this.timers.filter((t) => t.at <= this.clock); if (due.length) { this.timers = this.timers.filter((t) => t.at > this.clock); due.forEach((t) => t.res()); } }
    }
    if (this.waits.length) { const ok = this.waits.filter((w) => w.pred()); if (ok.length) { this.waits = this.waits.filter((w) => ok.indexOf(w) < 0); ok.forEach((w) => w.res()); } }
    const f = this.fade;
    if (f.res || f.t < f.d) {
      f.t = Math.min(f.d, f.t + ddt); const k = f.t / f.d, e = k * k * (3 - 2 * k);
      f.a = f.from + (f.to - f.from) * e;
      this.els.gl.style.opacity = f.a.toFixed(3);
      this.els.aerial.style.transform = "scale(" + (1 + 0.05 * f.a).toFixed(4) + ")";
      if (k >= 1 && f.res) { const r = f.res; f.res = null; r(); }
    }
    const L = this.loc;
    if (L && this.hero && this.walker) {
      const speaking = narr.speaking() && this.ui.phase === "talk", lev = speaking ? narr.level() : 0;
      let q = performance.now();
      if (run) { this.walker.update(dt); this.hero.talk(lev); this.hero.update(dt); }
      this.slow("hero", q);
      const hp = this.walker.pos;
      this.fctx.heroPos = [hp.x, hp.y, hp.z]; this.fctx.speaking = speaking; this.fctx.talkLevel = lev;
      q = performance.now();
      if (run) L.scene.update(this.clock, dt, this.fctx);
      this.slow("scene.update", q);
      this.rig.update(ddt, this.subject());
      this.rig.apply(this.r.camera);
      this.r.setFocus(this.hero.root.visible ? hp : this.rig.at);
      this.r.keyOn(this.hero.root.visible && this.ui.phase !== "leave", hp, this.hero.height);
      if (this.glOn) {
        q = performance.now();
        this.r.render(dt);
        this.slow("render", q);
        if (this.ui.phase !== "xfade" && this.ui.phase !== "leave") { this.r.frameTime(ms); this.perf.scene(L.stop.id, this.r.stats.calls, this.r.stats.tris, this.r.tier); }
      }
    }
    this.place();
  };

  private slow(what: string, q: number) {
    const d = performance.now() - q;
    if (d > 30 && this.long.length < 400) this.long.push({ ms: Math.round(d), phase: this.ui.phase, act: "frame " + what, stop: STOPS[this.ui.i].id, task: true });
  }

  /* caption bubble beside his head, on the stand's side, flipped or lifted if it would cover the sign; docked on phones */
  private place() {
    const el = this.els.bubble(), cap = this.ui.cap; if (!el) return;
    const typed = this.els.typed();
    if (typed && cap) {
      const t = narr.speaking() ? narr.elapsed() : this.line.dur, k = Math.min(1, t / Math.max(0.3, this.line.dur - 0.42));
      const n = Math.round(cap.text.length * k), s = cap.text.slice(0, n);
      if (typed.textContent !== s) typed.textContent = s;
      typed.dataset.typing = k < 1 ? "true" : "false";
    }
    const bar = this.els.bar();
    if (bar) bar.style.transform = "scaleX(" + ((this.ui.i + (this.ui.phase === "aerial" || this.ui.phase === "load" ? 0 : this.ui.phase === "leave" ? 0.95 : 0.5)) / N).toFixed(4) + ")";
    const W = window.innerWidth, H = window.innerHeight, dock = !cap || cap.mode === "travel" || cap.cta || W < 760 || !this.hero || !this.loc || !this.hero.root.visible;
    el.dataset.dock = dock ? "true" : "false";
    if (dock) { el.style.transform = ""; this.bub.x = -1; return; }
    const key = cap!.title + cap!.li + W + "x" + H;
    if (this.bub.key !== key) { this.bub.key = key; this.bub.w = el.offsetWidth; this.bub.h = el.offsetHeight; }
    const cam = this.r.camera, bw = this.bub.w, bh = this.bub.h;
    const seated = !!this.stand && (this.stand.act === "sit" || this.stand.act === "type"), head = this.walker!.pos.clone(); head.y += this.hero!.height * (seated ? 0.74 : 1.02);
    const hp = head.project(cam), sx = (hp.x * 0.5 + 0.5) * W, sy = (-hp.y * 0.5 + 0.5) * H;
    let rect: { l: number; t: number; r: number; b: number } | null = null;
    const sg = this.stand && this.stand.sign;
    if (sg) {
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      rect = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
      for (const ax of [-1, 1]) for (const ay of [-1, 1]) {
        const p = v3(sg.center).addScaledVector(right, ax * sg.halfW).addScaledVector(up, ay * sg.halfH).project(cam), x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
        rect.l = Math.min(rect.l, x - 14); rect.r = Math.max(rect.r, x + 14); rect.t = Math.min(rect.t, y - 14); rect.b = Math.max(rect.b, y + 14);
      }
    }
    const over = (x: number, y: number) => (rect ? Math.max(0, Math.min(x + bw, rect.r) - Math.max(x, rect.l)) * Math.max(0, Math.min(y + bh, rect.b) - Math.max(y, rect.t)) : 0);
    const clampX = (x: number) => Math.max(16, Math.min(W - bw - 16, x)), clampY = (y: number) => Math.max(96, Math.min(H - bh - 150, y));
    const pref = (this.stand && this.stand.bubbleSide) || "right", alt = pref === "right" ? "left" : "right";
    const side = (s: string, dy: number, far: number) => ({ x: clampX(s === "right" ? sx + 48 + far : sx - 48 - far - bw), y: clampY(sy - bh * 0.55 + dy), tail: s === "right" ? "left" : "right" });
    const opts = [side(pref, 0, 0), side(alt, 0, 0), { x: clampX(sx - bw / 2), y: clampY(sy - bh - 70), tail: "on" }, side(pref, bh * 0.9, 0), side(alt, bh * 0.9, 0), side(pref, 0, 160), side(alt, 0, 160)];
    let pick = opts[0], best = Infinity;
    opts.forEach((o, j) => { const a = over(o.x, o.y) + j * 40; if (a < best) { best = a; pick = o; } });
    if (pick.tail === "left" || pick.tail === "right") { const ty = sy - pick.y; if (ty < 10 || ty > bh - 10) pick = { ...pick, tail: "off" }; }
    if (this.bub.x < 0) { this.bub.x = pick.x; this.bub.y = pick.y; }
    this.bub.x += (pick.x - this.bub.x) * 0.2; this.bub.y += (pick.y - this.bub.y) * 0.2;
    el.dataset.tail = pick.tail;
    el.style.setProperty("--ty", Math.max(14, Math.min(bh - 14, sy - this.bub.y)) + "px");
    el.style.setProperty("--tx", Math.max(14, Math.min(bw - 14, sx - this.bub.x)) + "px");
    el.style.transform = "translate3d(" + this.bub.x.toFixed(1) + "px," + this.bub.y.toFixed(1) + "px,0)";
  }
}
