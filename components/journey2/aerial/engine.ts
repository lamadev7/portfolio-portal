import type { Map as MLMap } from "maplibre-gl";
import type { Aerial, AerialPose, CharacterFactory, LL, Shot, Stop } from "../contracts";
import { STOPS } from "../contracts";
import type { AerialFx, CamPose, V3 } from "./fx";
import { CIRCUMFERENCE, RAD, bearingTo, clamp, dirXZ, distM, fromXZ, headingXZ, lerp, noise1, shortest, smooth, smoother, toXZ, wrap360 } from "./geo";
import { GRADE, OFM_TILEJSON, buildStyle, osmLayers } from "./style";
import { DEM_MAX, Dem, IMAGERY, IMG_MAX, TERRARIUM, Warmer, buildUnderlays, fetchT, tileUrl } from "./tiles";
import { lightField } from "./lights";
import { cloudsFor, waterNear } from "./world";

type ML = typeof import("maplibre-gl");

/** Vertical field of view at the hand-off pose; scenes should frame their arrival shot with the same value. */
export const AERIAL_FOV = 45;
const FOV_CRUISE = 52;
const FOV_OVERVIEW = 34;
/** Hand-off: camera this far behind and above the stop's ground, looking at it. */
export const HANDOFF = { dist: 280, height: 180 };
/** Flyby stops: lower and closer, and the drift after the hand-off keeps orbiting at this rate (clockwise from above). */
export const FLYBY = { radiusM: 250, heightM: 140, degPerSec: 7 };
export const OVERVIEW_LL: LL = [84.12, 28.39];
/** Stops whose hand-off frames something specific: Phewa toward Machhapuchhre, Namche toward Everest. */
const APPROACH: Record<string, number> = { pokhara: 4, everest: 40 };
/** Hero in camera space (x right, y up, -z ahead): low-centre third, near enough to read the canopy. */
const CHASE = { ahead: 25, below: 4.5 };

export function handoffBearing(stop: Stop): number {
  if (APPROACH[stop.id] != null) return APPROACH[stop.id];
  const i = STOPS.findIndex((s) => s.id === stop.id);
  const prev = i > 0 ? STOPS[i - 1].ll : OVERVIEW_LL;
  return distM(prev, stop.ll) > 50 ? bearingTo(prev, stop.ll) : 0;
}

/** Where `fly()` resolves above a stop: `altM` is metres above the stop's ground (scene y), `ll` the camera position. */
export function handoffPose(stop: Stop): AerialPose {
  const fb = !!stop.flyby;
  const R = fb ? FLYBY.radiusM : HANDOFF.dist, h = fb ? FLYBY.heightM : HANDOFF.height;
  const b = handoffBearing(stop), [dx, dz] = dirXZ(b);
  return { ll: fromXZ(stop.ll, -dx * R, -dz * R), altM: h, bearing: b, pitch: 90 - Math.atan2(h, R) / RAD };
}

/** An aerial pose as a scene camera (metres, x east, y up, z south, origin = the stop's ground). */
export function poseToShot(stop: Stop, pose: AerialPose): Shot {
  const [x, z] = toXZ(stop.ll, pose.ll);
  const dep = Math.max(1, 90 - pose.pitch) * RAD, run = pose.altM / Math.tan(dep);
  const [dx, dz] = dirXZ(pose.bearing);
  return { cam: [x, pose.altM, z], look: [x + dx * run, 0, z + dz * run], fov: AERIAL_FOV };
}

/** Chase pitch by height above ground: low = look ahead at the horizon, high = look down at the land. */
function chasePitch(agl: number): number {
  const l = Math.log10(Math.max(agl, 50));
  const K: Array<[number, number]> = [[2.3, 75], [3, 72], [3.6, 68], [4.2, 63], [4.8, 52], [5.5, 36], [6, 32]];
  if (l <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (l <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (l - K[i - 1][0]) / (K[i][0] - K[i - 1][0]));
  return K[K.length - 1][1];
}

function legSeconds(d: number, high: boolean): number {
  let T = d < 8000 ? 3 + 3 * Math.pow(d / 8000, 0.75) : 6 + 8 * clamp(Math.log(d / 8000) / Math.log(50), 0, 1);
  if (high) T = clamp(T + 1.5, 10, 13);
  return T;
}

const hermite = (p0: number, m0: number, p1: number, m1: number, u: number) => {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
};

/** Forward and up unit vectors (x east, y up, z south) of a camera with this bearing and pitch. */
function basis(b: number, p: number): { f: V3; u: V3 } {
  const sb = Math.sin(b * RAD), cb = Math.cos(b * RAD), sp = Math.sin(p * RAD), cp = Math.cos(p * RAD);
  return { f: [sb * sp, -cp, -cb * sp], u: [sb * cp, sp, -cb * cp] };
}

function chaseOffset(b: number, p: number): V3 {
  const { f, u } = basis(b, p);
  return [f[0] * CHASE.ahead - u[0] * CHASE.below, f[1] * CHASE.ahead - u[1] * CHASE.below, f[2] * CHASE.ahead - u[2] * CHASE.below];
}

function destination(ll: LL, b: number, d: number): LL {
  const dr = d / 6371008.8, f1 = ll[1] * RAD, l1 = ll[0] * RAD, br = b * RAD;
  const f2 = Math.asin(Math.sin(f1) * Math.cos(dr) + Math.cos(f1) * Math.sin(dr) * Math.cos(br));
  const l2 = l1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(f1), Math.cos(dr) - Math.sin(f1) * Math.sin(f2));
  return [l2 / RAD, f2 / RAD];
}

class Aborted extends Error {
  name = "AbortError";
}

interface Op {
  aborted: boolean;
  reject?: (e: Error) => void;
}

interface Hero {
  rel: V3;
  heading: number;
  bank: number;
  pitch: number;
  alpha: number;
  inflate: number;
}

export interface AerialOptions {
  /** rigged pilot for the glider; the built-in stand-in flies until it is given */
  characters?: CharacterFactory;
}

export interface AerialExt extends Aerial {
  /** circle a stop low (flyby landmarks); resolves after `durationSec` and keeps orbiting until the next call */
  orbit(stop: Stop, o?: { durationSec?: number; radiusM?: number; heightM?: number; signal?: AbortSignal }): Promise<void>;
  /** live camera pose, for syncing a crossfade */
  pose(): AerialPose & { fov: number };
  /** the MapLibre map (dev tools) */
  readonly map?: MLMap;
}

export class AerialEngine implements AerialExt {
  private ml?: ML;
  map?: MLMap;
  private host?: HTMLDivElement;
  private fx?: AerialFx;
  private dem = new Dem();
  private warmer = new Warmer(10);
  private raf = 0;
  private last = 0;
  private clock = 0;
  private active = true;
  private dead = false;
  private cam: CamPose = { ll: OVERVIEW_LL, alt: 8e5, bearing: 0, pitch: 32, roll: 0, fov: FOV_OVERVIEW };
  private hero: Hero = { rel: [0, -4, -25], heading: 0, bank: 0, pitch: 0, alpha: 0, inflate: 1 };
  private vel: V3 = [0, 0, 0];
  private prevLL: LL | null = null;
  private prevAlt = 0;
  private speedK = 0;
  private turb = 0;
  private lift = 0;
  private centerElev = 0;
  private fovSet = 0;
  private anim: ((dt: number) => void) | null = null;
  private op: Op | null = null;
  private target: { stop: Stop; ground: number } | null = null;
  private pending: Stop[] = [];
  private glintFor = "";
  private legSeq = 0;

  constructor(private opts: AerialOptions = {}) {}

  async mount(el: HTMLElement): Promise<void> {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;inset:0;background:#03050c";
    el.appendChild(host);
    this.host = host;
    const mod = await import("maplibre-gl");
    await import("maplibre-gl/dist/maplibre-gl.css");
    if (this.dead) return;
    const ml = ((mod as unknown as { default?: ML }).default ?? mod) as ML;
    this.ml = ml;
    ml.setMaxParallelImageRequests(24);
    ml.config.MAX_PARALLEL_IMAGE_REQUESTS_PER_FRAME = 20;
    const r = host.getBoundingClientRect();
    this.cam = this.overview(r.width || 1440, r.height || 900);
    const under = buildUnderlays();
    const map = new ml.Map({
      container: host,
      style: buildStyle(),
      center: OVERVIEW_LL,
      zoom: 5,
      centerClampedToGround: false,
      maxPitch: 85,
      minZoom: 1,
      maxZoom: 19.5,
      interactive: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      fadeDuration: 0,
      attributionControl: false,
      canvasContextAttributes: { antialias: false, powerPreference: "high-performance" },
      maxTileCacheZoomLevels: 6,
      refreshExpiredTiles: false,
      cancelPendingTileRequestsWhileZooming: false,
    });
    this.map = map;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __aerial?: unknown }).__aerial = this;
    await new Promise<void>((res) => (map.isStyleLoaded() ? res() : map.once("style.load", () => res())));
    if (this.dead) return;
    this.centerElev = 200;
    this.applyCamera();
    const { createFx } = await import("./fx");
    const fx = await createFx(map);
    if (this.dead) return;
    this.fx = fx;
    map.addLayer(fx);
    map.on("resize", () => fx.resize());
    const addUnder = under.then((list) => {
      for (const u of list) {
        if (this.dead || !this.map) return;
        map.addSource(u.id, { type: "canvas", canvas: u.canvas, animate: false, coordinates: u.coordinates });
        map.addLayer({ id: u.id, type: "raster", source: u.id, paint: { "raster-fade-duration": 0, ...GRADE } }, "backdrop");
      }
    });
    await Promise.race([addUnder, new Promise((r) => setTimeout(r, 15000))]);
    if (this.dead) return;
    void this.addOsm();
    const chars = this.opts.characters ?? (await import("../character").then((m) => m.characters).catch(() => null));
    if (chars && !this.dead)
      void chars
        .hero("paraglider")
        .then((c) => !this.dead && this.fx?.glider.setPilot(c))
        .catch(() => undefined);
    await new Promise<void>((res) => {
      const t = window.setTimeout(res, 12000);
      map.once("idle", () => {
        window.clearTimeout(t);
        res();
      });
    });
    this.start();
    this.pending.splice(0).forEach((s) => this.prefetch(s));
  }

  private async addOsm() {
    const map = this.map;
    if (!map) return;
    try {
      const tj = (await fetchT(OFM_TILEJSON, 10000).then((r) => r.json())) as { tiles: string[] };
      if (this.dead || !this.map) return;
      map.addSource("ofm", { type: "vector", tiles: tj.tiles, maxzoom: 13, attribution: "© OpenMapTiles © OpenStreetMap contributors" });
      for (const l of osmLayers()) map.addLayer(l, l.id === "water" ? "lights" : "aerial-fx");
    } catch {
      /* the Black Marble glow still lights the towns */
    }
  }

  pose(): AerialPose & { fov: number } {
    const g = this.target?.ground ?? this.dem.ground(this.cam.ll) ?? 0;
    return { ll: this.cam.ll, altM: this.cam.alt - g, bearing: this.cam.bearing, pitch: this.cam.pitch, fov: this.cam.fov };
  }

  /** Whole of Nepal at night from high above India, north up. */
  private overview(w: number, h: number): CamPose {
    const vf = FOV_OVERVIEW * RAD, hf = 2 * Math.atan(Math.tan(vf / 2) * (w / h));
    const pitch = 30;
    const D = Math.max(980e3 / (2 * Math.tan(hf / 2)), 560e3 / (2 * Math.tan(vf / 2)));
    return { ll: destination(OVERVIEW_LL, 180, D * Math.sin(pitch * RAD)), alt: D * Math.cos(pitch * RAD), bearing: 0, pitch, roll: 0, fov: FOV_OVERVIEW };
  }

  setActive(on: boolean) {
    this.active = on;
    if (this.fx) this.fx.paused = !on;
    if (this.host) this.host.style.visibility = on ? "" : "hidden";
    if (on) {
      this.map?.resize();
      this.start();
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private start() {
    if (this.raf || !this.active || this.dead || !this.map) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = clamp((now - this.last) / 1000, 0, 0.05);
    this.last = now;
    this.clock += dt;
    this.anim?.(dt);
    this.measure(dt);
    this.applyCamera(dt);
    const fx = this.fx;
    if (fx) {
      fx.time = this.clock;
      fx.dt = dt;
      fx.hero = this.hero;
      fx.speed = this.speedK;
    }
    this.map?.triggerRepaint();
  };

  /** Velocity of the camera from its last two positions, so the next move can start at the speed this one left off. */
  private measure(dt: number) {
    if (this.prevLL && dt > 0) {
      const [x, z] = toXZ(this.prevLL, this.cam.ll);
      const k = 1 - Math.exp(-dt / 0.08);
      this.vel = [lerp(this.vel[0], x / dt, k), lerp(this.vel[1], (this.cam.alt - this.prevAlt) / dt, k), lerp(this.vel[2], z / dt, k)];
    }
    this.prevLL = this.cam.ll;
    this.prevAlt = this.cam.alt;
  }

  private groundNear(ll: LL): number | null {
    const g = this.dem.ground(ll);
    const t = (this.map as unknown as { terrain?: { getElevationForLngLat: (ll: unknown, tr: unknown) => number } } | undefined)?.terrain;
    let m: number | null = null;
    if (t && this.ml && this.map) {
      try {
        m = t.getElevationForLngLat(new this.ml.LngLat(ll[0], ll[1]), this.map.transform);
      } catch {
        m = null;
      }
    }
    if (g == null) return m;
    return m == null ? g : Math.max(g, m);
  }

  private applyCamera(dt = 0) {
    const map = this.map;
    if (!map) return;
    const c = this.cam;
    const under = this.groundNear(c.ll);
    if (under != null && c.alt + this.lift < under + 45) this.lift = under + 45 - c.alt;
    else this.lift *= Math.exp(-dt / 1.5);
    const a = (0.035 + 0.32 * this.turb) * (this.anim ? 1 : 0.4);
    const t = this.clock;
    const pose: CamPose = {
      ll: c.ll,
      alt: c.alt + this.lift,
      bearing: c.bearing + noise1(t * 2.3, 1) * a + noise1(t * 7.1, 4) * a * 0.25,
      pitch: clamp(c.pitch + noise1(t * 2.9, 2) * a * 0.8 + noise1(t * 8.3, 5) * a * 0.2, 0, 85),
      roll: c.roll + noise1(t * 1.9, 3) * a * 1.3,
      fov: c.fov,
    };
    const p = pose.pitch * RAD, cosP = Math.max(Math.cos(p), 0.07);
    const probe = destination(pose.ll, pose.bearing, Math.min((pose.alt - this.centerElev) / cosP, 4e6) * Math.sin(p));
    const g = this.groundNear(probe);
    if (g != null) this.centerElev += (Math.min(g, pose.alt - 30) - this.centerElev) * (dt ? 1 - Math.exp(-dt / 0.35) : 1);
    const agl = Math.max(30, pose.alt - this.centerElev);
    const dist = Math.min(agl / cosP, 4e6);
    const center = destination(pose.ll, pose.bearing, dist * Math.sin(p));
    const H = map.transform.height || 900;
    const dMerc = dist / (CIRCUMFERENCE * Math.cos(center[1] * RAD));
    const zoom = Math.log2(H / 2 / Math.tan((pose.fov * RAD) / 2) / (dMerc * 512));
    if (Math.abs(pose.fov - this.fovSet) > 0.03) {
      map.setVerticalFieldOfView(pose.fov);
      this.fovSet = pose.fov;
    }
    map.jumpTo({ center, zoom, pitch: pose.pitch, bearing: pose.bearing, roll: pose.roll, elevation: pose.alt - dist * Math.cos(p) });
    if (this.fx) this.fx.cam = pose;
  }

  private newOp(signal?: AbortSignal): Op {
    if (this.op) {
      this.op.aborted = true;
      this.op.reject?.(new Aborted("superseded"));
    }
    const op: Op = { aborted: false };
    this.op = op;
    signal?.addEventListener("abort", () => {
      if (op.aborted) return;
      op.aborted = true;
      op.reject?.(new Aborted("aborted"));
      if (this.op === op) this.settle();
    });
    return op;
  }

  /** Stop scripted motion where it is and coast to rest. */
  private settle() {
    const v = this.vel;
    let t = 0;
    this.anim = (dt) => {
      t += dt;
      const k = Math.exp(-t / 0.8);
      const ll = fromXZ(this.cam.ll, v[0] * k * dt, v[2] * k * dt);
      this.cam = { ...this.cam, ll, alt: this.cam.alt + v[1] * k * dt, roll: this.cam.roll * (1 - dt * 2) };
      this.hero.alpha = Math.max(0, this.hero.alpha - dt * 1.5);
      this.speedK *= 1 - dt * 2;
      if (t > 4) this.anim = null;
    };
  }

  private async ensureGround(stop: Stop): Promise<number> {
    await Promise.race([this.dem.ensure([stop.ll], DEM_MAX), new Promise((r) => setTimeout(r, 1500))]);
    return this.dem.ground(stop.ll) ?? this.groundNear(stop.ll) ?? 0;
  }

  /* ------------------------------------------------------------------ prefetch */

  private coverUrls(c: CamPose): string[] {
    const map = this.map, ml = this.ml;
    if (!map || !ml) return [];
    type Tr = {
      clone: () => Tr; setMaxPitch: (p: number) => void; setCenter: (c: unknown) => void; setZoom: (z: number) => void; setPitch: (p: number) => void;
      setBearing: (b: number) => void; setElevation: (e: number) => void; setFov: (f: number) => void; setRoll?: (r: number) => void;
    };
    const p = c.pitch * RAD, cosP = Math.max(Math.cos(p), 0.07);
    const g = this.dem.ground(c.ll) ?? 0;
    const dist = Math.min(Math.max(30, c.alt - g) / cosP, 4e6);
    const center = destination(c.ll, c.bearing, dist * Math.sin(p));
    const H = map.transform.height || 900;
    const zoom = Math.log2(H / 2 / Math.tan((c.fov * RAD) / 2) / ((dist / (CIRCUMFERENCE * Math.cos(center[1] * RAD))) * 512));
    let tr: Tr;
    try {
      tr = (map.transform as unknown as Tr).clone();
      tr.setMaxPitch(85);
      tr.setFov(c.fov);
      tr.setZoom(zoom);
      tr.setCenter(new ml.LngLat(center[0], center[1]));
      tr.setElevation(c.alt - dist * Math.cos(p));
      tr.setPitch(c.pitch);
      tr.setBearing(c.bearing);
    } catch {
      return [];
    }
    const cover = (id: string, tileSize: number, maxzoom: number, roundZoom: boolean) => {
      const src = map.getSource(id) as unknown as { calculateTileZoom?: unknown } | undefined;
      const o = { tileSize, maxzoom, roundZoom, terrain: map.terrain ?? undefined, calculateTileZoom: src?.calculateTileZoom };
      try {
        return map.coveringTiles.call({ transform: tr } as unknown as MLMap, o as Parameters<MLMap["coveringTiles"]>[0]).map((t) => t.canonical);
      } catch {
        return [];
      }
    };
    const urls = new Set<string>();
    for (const t of cover("imagery", 256, IMG_MAX, true)) {
      urls.add(tileUrl(IMAGERY, t.z, t.x, t.y));
      if (t.z >= 2) urls.add(tileUrl(IMAGERY, t.z - 2, t.x >> 2, t.y >> 2));
    }
    for (const t of cover("dem", 512, DEM_MAX, false)) {
      urls.add(tileUrl(TERRARIUM, t.z, t.x, t.y));
      if (t.z > 0) urls.add(tileUrl(TERRARIUM, t.z - 1, t.x >> 1, t.y >> 1));
    }
    return [...urls];
  }

  prefetch(to: Stop) {
    if (!this.map) {
      this.pending.push(to);
      return;
    }
    void this.ensureGround(to).then((g) => {
      if (this.dead) return;
      const hp = handoffPose(to);
      this.warmer.add(this.coverUrls({ ll: hp.ll, alt: g + hp.altM, bearing: hp.bearing, pitch: hp.pitch, roll: 0, fov: AERIAL_FOV }), 2);
      const from = this.cam, d = distM(from.ll, to.ll);
      const T = legSeconds(d, false), hC = clamp((0.69 * d) / T, 280, 40000);
      const pts: LL[] = [];
      for (let i = 1; i <= 8; i++) pts.push([lerp(from.ll[0], to.ll[0], i / 9), lerp(from.ll[1], to.ll[1], i / 9)]);
      void this.dem.ensure(pts, d > 60000 ? 9 : 10);
      let i = 0;
      const b = bearingTo(from.ll, to.ll);
      const next = () => {
        if (this.dead || i >= pts.length) return;
        const ll = pts[i++];
        const gg = this.dem.ground(ll, 10) ?? g;
        this.warmer.add(this.coverUrls({ ll, alt: gg + hC, bearing: b, pitch: chasePitch(hC), roll: 0, fov: FOV_CRUISE }), 3 + i * 0.01);
        window.setTimeout(next, 40);
      };
      next();
    });
  }

  /* ------------------------------------------------------------------ flight */

  async fly(from: Stop, to: Stop, o: { onProgress?(t: number): void; signal?: AbortSignal } = {}): Promise<AerialPose> {
    const op = this.newOp(o.signal);
    if (!this.map) throw new Aborted("not mounted");
    if (from.id === "nepal" && this.cam.alt < 2e5) {
      const r = this.host!.getBoundingClientRect();
      this.cam = this.overview(r.width, r.height);
      this.hero.alpha = 0;
      this.vel = [0, 0, 0];
    }
    const hand0 = handoffPose(to), dd = distM(this.cam.ll, to.ll);
    const rough: LL[] = [];
    for (let i = 0; i <= 24; i++) rough.push([lerp(this.cam.ll[0], to.ll[0], i / 24), lerp(this.cam.ll[1], to.ll[1], i / 24)]);
    await Promise.race([Promise.all([this.dem.ensure(rough, dd > 60000 ? 9 : dd > 12000 ? 10 : 11), this.dem.ensure([to.ll, hand0.ll, this.cam.ll], DEM_MAX)]), new Promise((r) => setTimeout(r, 900))]);
    if (op.aborted) throw new Aborted("aborted");
    const start: CamPose = { ...this.cam, alt: this.cam.alt + this.lift };
    this.lift = 0;
    const startHero = this.hero.alpha;
    const v0 = Math.hypot(this.vel[0], this.vel[2]);
    const fb = !!to.flyby;
    const hand = handoffPose(to);
    const origin = start.ll;
    const [kx, kz] = toXZ(origin, hand.ll);
    const [lx, lz] = toXZ(origin, to.ll);
    const d = Math.hypot(kx, kz);
    const startAgl0 = start.alt - (this.dem.ground(start.ll) ?? 0);
    const high = startAgl0 > 1.5e5;
    const T = legSeconds(d, high);
    const h0 = start.bearing, h1 = wrap360(fb ? hand.bearing - 90 : hand.bearing);
    const chord = headingXZ(kx, kz);
    const fit = (h: number) => 0.12 + 0.88 * Math.pow((1 + Math.cos(shortest(chord, h) * RAD)) / 2, 1.5);
    const m0 = Math.max(250, d * (high ? 0.4 : 0.9) * fit(h0)), m1 = Math.max(250, d * (high ? 0.4 : 0.9) * fit(h1));
    const [t0x, t0z] = dirXZ(h0), [t1x, t1z] = dirXZ(h1);
    const W = d > 40000 ? Math.min(0.025 * d, 5000) : 0;
    const N = 200;
    const px = new Float64Array(N + 1), pz = new Float64Array(N + 1), cum = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      let x = hermite(0, t0x * m0, kx, t1x * m1, u), z = hermite(0, t0z * m0, kz, t1z * m1, u);
      if (W) {
        const w = W * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * u);
        x += (-kz / d) * w;
        z += (kx / d) * w;
      }
      px[i] = x;
      pz[i] = z;
      if (i) cum[i] = cum[i - 1] + Math.hypot(x - px[i - 1], z - pz[i - 1]);
    }
    const L = Math.max(cum[N], 1);
    const lls: LL[] = [];
    for (let i = 0; i <= N; i += 4) lls.push(fromXZ(origin, px[i], pz[i]));
    const zf = d > 60000 ? 9 : d > 12000 ? 10 : 11;
    void this.dem.ensure(lls, zf);
    const gArr = new Float64Array(N + 1);
    let lastG = this.dem.ground(start.ll) ?? 0;
    for (let i = 0; i <= N; i++) {
      const g = this.dem.ground(fromXZ(origin, px[i], pz[i]), zf);
      gArr[i] = lastG = g ?? lastG;
    }
    const gL = this.dem.ground(to.ll) ?? gArr[N];
    gArr[N] = Math.max(gArr[N], this.dem.ground(hand.ll) ?? gArr[N]);
    const win = (i: number) => lerp(150, Math.min(2500, 120 + L * 0.08), smooth(Math.min(cum[i], L - cum[i]) / 4000));
    const env = new Float64Array(N + 1), floor = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const w = win(i);
      let mx = -Infinity;
      for (let j = 0; j <= N; j++) if (Math.abs(cum[j] - cum[i]) <= w) mx = Math.max(mx, gArr[j]);
      env[i] = mx;
    }
    for (let i = 0; i <= N; i++) {
      const w = win(i) / 2;
      let s = 0, k = 0;
      for (let j = 0; j <= N; j++) if (Math.abs(cum[j] - cum[i]) <= w) (s += env[j]), k++;
      floor[i] = Math.max(s / k, gArr[i] + 40);
    }
    const yK = Math.max(gL + hand.altM, floor[N] + 60);
    const hS = Math.max(30, start.alt - floor[0]);
    const hE = Math.max(40, yK - floor[N]);
    const hC = Math.max(clamp((0.69 * L) / T, 280, 40000), Math.min(hS, hE) * 1.05);
    const a = high ? 0.42 : d < 10000 ? 0.34 : 0.28, b = high ? 0.62 : d < 10000 ? 0.56 : 0.64;
    const lS = Math.log(hS), lC = Math.log(hC), lE = Math.log(hE);
    const hAt = (t: number) =>
      Math.exp(t < a ? lerp(lS, lC, smoother(t / a)) : t < b ? lC + 0.05 * Math.sin(((t - a) / (b - a)) * Math.PI) : lerp(lC, lE, smoother((t - b) / (1 - b))));
    const ta = high ? 0.05 : 0.16, tb = 0.6;
    let e0 = 0, eE = 1;
    const M = 600;
    const F = new Float64Array(M + 1);
    const eAt = (t: number) => lerp(e0, 1, smoother(t / ta)) * lerp(1, eE, smoother((t - tb) / (1 - tb)));
    const integrate = () => {
      for (let i = 1; i <= M; i++) {
        const t = (i - 0.5) / M;
        F[i] = F[i - 1] + hAt(t) * eAt(t) / M;
      }
    };
    const vEnd = fb ? FLYBY.radiusM * FLYBY.degPerSec * RAD : 16;
    for (let k = 0; k < 3; k++) {
      integrate();
      e0 = clamp((v0 * F[M] * T) / (L * hS), 0, 1);
      eE = clamp((vEnd * F[M] * T) / (L * hE), 0.01, 1);
    }
    integrate();
    const F1 = F[M];
    const uAt = (t: number) => {
      const x = clamp(t, 0, 1) * M, i = Math.min(Math.floor(x), M - 1);
      return (F[i] + (F[i + 1] - F[i]) * (x - i)) / F1;
    };
    const idxAt = (s: number) => {
      let lo = 0, hi = N;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= s) lo = mid;
        else hi = mid;
      }
      return { i: lo, f: (s - cum[lo]) / (cum[hi] - cum[lo] || 1) };
    };
    const at = (s: number): { x: number; z: number; floor: number } => {
      const q = clamp(s, 0, L), { i, f } = idxAt(q), j = Math.min(i + 1, N);
      return { x: lerp(px[i], px[j], f), z: lerp(pz[i], pz[j], f), floor: lerp(floor[i], floor[j], f) };
    };
    const headingAt = (s: number) => {
      const c = clamp(s, 6, Math.max(6, L - 6)), p = at(c - 6), q = at(c + 6);
      return Math.hypot(q.x - p.x, q.z - p.z) > 1e-3 ? headingXZ(q.x - p.x, q.z - p.z) : h0;
    };
    const camAt = (t: number) => {
      const s = uAt(t) * L, p = at(s), h = hAt(t);
      return { s, x: p.x, z: p.z, y: p.floor + h, h, v: (L * h * eAt(t)) / (F1 * T) };
    };
    const look = { x: lx, y: gL, z: lz };
    const after = (lim: number, lo: number, hi: number) => {
      let t = b;
      while (t < 1 && hAt(t) > lim) t += 0.004;
      return clamp(t, lo, hi);
    };
    const tD = after(Math.max(3.5 * hE, 800), 0.66, 0.9);
    const eStart = Math.min(after(Math.max(9 * hE, 2600), 0.56, 0.84), tD - 0.04);
    const sBlend = high ? 0.3 : clamp(1.3 / T, 0.1, 0.24);
    const orient = (t: number, c: ReturnType<typeof camAt>, bank: number) => {
      const lag = clamp(c.v * 0.45, 4, 6000);
      let br = headingAt(c.s - lag), pt = chasePitch(c.h), rl = bank * 0.28;
      const ws = smoother(t / sBlend);
      br = start.bearing + shortest(start.bearing, br) * ws;
      pt = lerp(start.pitch, pt, ws);
      rl = lerp(start.roll, rl, ws);
      const we = smoother((t - eStart) / (1 - eStart));
      if (we > 0) {
        const bx = look.x - c.x, bz = look.z - c.z;
        const bl = headingXZ(bx, bz), pl = 90 - Math.atan2(c.y - look.y, Math.hypot(bx, bz)) / RAD;
        br = br + shortest(br, bl) * we;
        pt = lerp(pt, pl, we);
        rl = lerp(rl, 0, we);
      }
      const fov = lerp(lerp(start.fov, FOV_CRUISE, ws), AERIAL_FOV, smoother((t - 0.5) / 0.5));
      return { bearing: wrap360(br), pitch: clamp(pt, 0, 85), roll: rl, fov };
    };
    const chaseHero = (t: number) => {
      const c = camAt(t), hd = headingAt(c.s), o = chaseOffset(hd, orient(t, c, 0).pitch);
      return [c.x + o[0], c.y + o[1], c.z + o[2]] as V3;
    };
    const HD = chaseHero(tD), HD2 = chaseHero(tD + 0.002);
    const durD = (1 - tD) * T;
    const VD = [(HD2[0] - HD[0]) / (0.002 * T), (HD2[1] - HD[1]) / (0.002 * T), (HD2[2] - HD[2]) / (0.002 * T)];
    const [hbx, hbz] = dirXZ(hand.bearing);
    const LND: V3 = fb ? [lx + hbx * 120, gL + 70, lz + hbz * 120] : [lx, gL + 2, lz];
    const VE: V3 = fb ? [hbx * 22, -1, hbz * 22] : [hbx * 11, -3.5, hbz * 11];
    const glide = (t: number): V3 => {
      const u = clamp((t - tD) / (1 - tD), 0, 1);
      return [0, 1, 2].map((k) => hermite(HD[k], VD[k] * durD, LND[k], VE[k] * durD, u)) as V3;
    };

    const clouds = cloudsFor(fromXZ(origin, kx / 2, kz / 2), Array.from({ length: 49 }, (_, i) => {
      const c = camAt(i / 48);
      return { ll: fromXZ(origin, c.x, c.z), alt: c.y };
    }), this.dem);
    this.fx?.setClouds(clouds);
    const low: LL[] = [to.ll];
    for (let i = 0; i <= 48; i++) {
      const c = camAt(i / 48);
      if (c.h < 7000) low.push(fromXZ(origin, c.x, c.z));
    }
    const box: [number, number, number, number] = [Math.min(...low.map((p) => p[0])) - 0.22, Math.min(...low.map((p) => p[1])) - 0.2, Math.max(...low.map((p) => p[0])) + 0.22, Math.max(...low.map((p) => p[1])) + 0.2];
    const legId = (this.legSeq = this.legSeq + 1);
    void lightField(to.ll, box, this.dem).then((f) => {
      if (f && this.legSeq === legId) this.fx?.setLights(f);
    });
    if (this.glintFor !== to.id) {
      this.glintFor = to.id;
      void import("three")
        .then((THREE) => waterNear(to.ll, 60000, this.dem, (ring) => THREE.ShapeUtils.triangulateShape(ring.map(([x, y]) => new THREE.Vector2(x, y)), [])))
        .then((g) => {
          if (this.glintFor === to.id) this.fx?.setGlint(g);
        });
    }

    const destUrls = this.coverUrls({ ll: hand.ll, alt: yK, bearing: hand.bearing, pitch: hand.pitch, roll: 0, fov: AERIAL_FOV });
    this.warmer.drop(1);
    this.warmer.add(destUrls, 0);
    this.target = { stop: to, ground: gL };

    return new Promise<AerialPose>((resolve, reject) => {
      op.reject = reject;
      let vt = 0, held = 0, nextWarm = 0, prevHd = headingAt(0);
      let bank = this.hero.bank;
      this.anim = (dt) => {
        if (op.aborted) return;
        let rate = 1;
        const tn = vt / T;
        if (tn > b - 0.07 && tn < b + 0.03 && held < 1.6 && this.warmer.ratio(destUrls) < 0.85) {
          rate = 0.25;
          held += dt;
        }
        vt += dt * rate;
        const t = Math.min(vt / T, 1);
        if (vt >= nextWarm) {
          nextWarm = vt + 0.25;
          for (const ahead of [1.1, 2.3]) {
            const ft = Math.min(1, t + ahead / T), fc = camAt(ft), fo = orient(ft, fc, 0);
            this.warmer.add(this.coverUrls({ ll: fromXZ(origin, fc.x, fc.z), alt: fc.y, bearing: fo.bearing, pitch: fo.pitch, roll: 0, fov: fo.fov }), 1 + ahead * 0.1);
          }
        }
        const c = camAt(t);
        const hd = headingAt(c.s + CHASE.ahead);
        const turn = dt > 0 ? shortest(prevHd, hd) / dt : 0;
        prevHd = hd;
        bank += (clamp(turn * 1.3, -34, 34) - bank) * (1 - Math.exp(-dt / 0.4));
        const or = orient(t, c, bank);
        const ll = fromXZ(origin, c.x, c.z);
        this.cam = { ll, alt: c.y, bearing: or.bearing, pitch: or.pitch, roll: or.roll, fov: or.fov + 4 * this.speedK * (1 - smoother((t - 0.5) / 0.4)) };
        const hp = t <= tD ? (() => { const o2 = chaseOffset(headingAt(c.s), or.pitch); return [c.x + o2[0], c.y + o2[1], c.z + o2[2]] as V3; })() : glide(t);
        const fadeIn = startHero > 0.5 ? 1 : smoother((t - 0.02) / 0.14);
        const altFade = 1 - smoother((c.h - 25000) / 40000);
        const fadeOut = 1 - smoother((t - Math.max(tD + 0.05, 0.87)) / 0.12);
        const vy = t > 0.001 ? (c.y - camAt(t - 0.001).y) / (0.001 * T) : 0;
        this.hero = {
          rel: [hp[0] - c.x, hp[1] - c.y, hp[2] - c.z],
          heading: t <= tD ? hd : headingXZ(...(() => { const g2 = glide(Math.min(1, t + 0.01)); return [g2[0] - hp[0], g2[2] - hp[2]] as [number, number]; })()),
          bank: t <= tD ? bank : bank * (1 - smoother((t - tD) / 0.12)),
          pitch: clamp((Math.atan2(vy, Math.max(c.v, 1)) / RAD) * 0.35, -12, 10),
          alpha: fadeIn * altFade * fadeOut,
          inflate: 1,
        };
        this.speedK = clamp(c.v / Math.max(c.h, 60) / 0.3, 0, 1) * (1 - smoother((t - 0.75) / 0.2));
        this.turb = clamp(0.25 * this.speedK + 0.7 * (this.fx?.veil ?? 0) + 0.12 * (noise1(this.clock * 0.4, 9) + 1), 0, 1);
        o.onProgress?.(t);
        if (t >= 1) {
          this.op = null;
          const pose: AerialPose = { ll, altM: c.y - gL, bearing: or.bearing, pitch: or.pitch };
          this.hero.alpha = 0;
          this.drift(to, gL, fb);
          resolve(pose);
        }
      };
    });
  }

  /** After a hand-off the camera keeps moving for the crossfade: a decaying glide toward the stop, or the flyby orbit. */
  private drift(stop: Stop, gL: number, fb: boolean) {
    let t = 0;
    const v = [...this.vel] as V3;
    const w = FLYBY.degPerSec * RAD;
    this.anim = (dt) => {
      t += dt;
      const [x, z] = toXZ(stop.ll, this.cam.ll);
      let nx = x, nz = z, alt = this.cam.alt;
      if (fb) {
        const r = Math.hypot(x, z), ang = Math.atan2(x, -z) + w * dt;
        nx = Math.sin(ang) * r;
        nz = -Math.cos(ang) * r;
      } else {
        const k = Math.exp(-t / 0.9);
        nx += v[0] * k * dt;
        nz += v[2] * k * dt;
        alt += v[1] * k * dt;
      }
      const ll = fromXZ(stop.ll, nx, nz);
      const bl = headingXZ(-nx, -nz), pl = 90 - Math.atan2(alt - gL, Math.hypot(nx, nz)) / RAD;
      this.cam = { ...this.cam, ll, alt, bearing: bl, pitch: clamp(pl, 0, 85), roll: this.cam.roll * (1 - dt * 3) };
      this.speedK *= 1 - dt * 2;
      this.turb *= 1 - dt;
    };
  }

  async liftFrom(stop: Stop): Promise<void> {
    const op = this.newOp();
    if (!this.map) throw new Aborted("not mounted");
    const gL = await this.ensureGround(stop);
    if (op.aborted) throw new Aborted("aborted");
    const hand = handoffPose(stop);
    const [cx, cz] = toXZ(stop.ll, this.cam.ll);
    const [hx, hz] = toXZ(stop.ll, hand.ll);
    if (Math.hypot(cx - hx, cz - hz) > 80 || Math.abs(this.cam.alt - (gL + hand.altM)) > 80) {
      this.cam = { ll: hand.ll, alt: gL + hand.altM, bearing: hand.bearing, pitch: hand.pitch, roll: 0, fov: AERIAL_FOV };
      this.vel = [0, 0, 0];
    }
    const s0: CamPose = { ...this.cam };
    const [x0, z0] = toXZ(stop.ll, s0.ll);
    const b = stop.flyby ? wrap360(hand.bearing) : s0.bearing;
    const [fx, fz] = dirXZ(b);
    const D = 3.6, vEnd = 60;
    const camEnd: V3 = [fx * 210, gL + 430, fz * 210];
    const pEnd = chasePitch(430);
    const off = chaseOffset(b, pEnd);
    const heroEnd: V3 = [camEnd[0] + off[0], camEnd[1] + off[1], camEnd[2] + off[2]];
    const H0: V3 = [0, gL + 1.4, 0];
    const C0: V3 = [x0, s0.alt, z0];
    this.target = { stop, ground: gL };
    return new Promise<void>((resolve, reject) => {
      op.reject = reject;
      let t = 0, prev: V3 = H0;
      this.anim = (dt) => {
        if (op.aborted) return;
        t = Math.min(1, t + dt / D);
        const u = smooth(t) * 0.35 + t * 0.65;
        const cp = [0, 1, 2].map((k) => hermite(C0[k], [fx * 8, 3, fz * 8][k] * D, camEnd[k], [fx * vEnd, 26, fz * vEnd][k] * D, u)) as V3;
        const hu = clamp(t * 1.05, 0, 1);
        const hp = [0, 1, 2].map((k) => hermite(H0[k], [fx * 7, 2, fz * 7][k] * D, heroEnd[k], [fx * vEnd, 26, fz * vEnd][k] * D, hu)) as V3;
        const rel: V3 = [hp[0] - cp[0], hp[1] - cp[1], hp[2] - cp[2]];
        const lb = headingXZ(rel[0], rel[2]), lp = 90 - Math.atan2(-rel[1], Math.hypot(rel[0], rel[2])) / RAD;
        const wc = smoother((t - 0.3) / 0.7);
        const lookP = lerp(clamp(lp - 4, 20, 85), pEnd, wc);
        const lookB = lb + shortest(lb, b) * wc;
        const ws = smoother(t / 0.25);
        this.cam = {
          ll: fromXZ(stop.ll, cp[0], cp[2]),
          alt: cp[1],
          bearing: wrap360(s0.bearing + shortest(s0.bearing, lookB) * ws),
          pitch: lerp(s0.pitch, lookP, ws),
          roll: 0,
          fov: lerp(s0.fov, FOV_CRUISE, smoother(t)),
        };
        const hv = [hp[0] - prev[0], hp[2] - prev[2]];
        prev = hp;
        this.hero = {
          rel,
          heading: Math.hypot(hv[0], hv[1]) > 0.01 ? headingXZ(hv[0], hv[1]) : b,
          bank: 0,
          pitch: lerp(8, 0, smoother(t * 2)),
          alpha: smoother(t / 0.12),
          inflate: smoother((t - 0.02) / 0.32) * 0.75 + 0.25,
        };
        this.speedK = smoother(t) * 0.5;
        this.turb = 0.1;
        if (t >= 1) {
          this.op = null;
          this.anim = null;
          this.vel = [fx * vEnd, 26, fz * vEnd];
          this.prevLL = null;
          this.cruise(b);
          resolve();
        }
      };
    });
  }

  /** Hold the chase heading at constant speed until the next leg takes over. */
  private cruise(b: number) {
    const [fx, fz] = dirXZ(b);
    const v = Math.hypot(this.vel[0], this.vel[2]) || 40;
    this.anim = (dt) => {
      this.cam = { ...this.cam, ll: fromXZ(this.cam.ll, fx * v * dt, fz * v * dt) };
    };
  }

  async orbit(stop: Stop, o: { durationSec?: number; radiusM?: number; heightM?: number; signal?: AbortSignal } = {}): Promise<void> {
    const op = this.newOp(o.signal);
    if (!this.map) throw new Aborted("not mounted");
    const gL = await this.ensureGround(stop);
    if (op.aborted) throw new Aborted("aborted");
    const R = o.radiusM ?? FLYBY.radiusM, h = o.heightM ?? FLYBY.heightM, w = FLYBY.degPerSec;
    const [x0, z0] = toXZ(stop.ll, this.cam.ll);
    const near = Math.hypot(x0, z0) < R * 3;
    let ang = near ? headingXZ(x0, z0) : wrap360(handoffBearing(stop) + 180);
    const s0 = { ...this.cam };
    const dur = o.durationSec ?? 8;
    let t = 0;
    this.target = { stop, ground: gL };
    return new Promise<void>((resolve, reject) => {
      op.reject = reject;
      let done = false;
      this.anim = (dt) => {
        if (op.aborted) return;
        t += dt;
        ang += w * dt;
        const [dx, dz] = dirXZ(ang);
        const ent = near ? smoother(t / 1.6) : 1;
        const cx = dx * R, cz = dz * R, cy = gL + h;
        const ll = ent < 1 ? fromXZ(stop.ll, lerp(x0, cx, ent), lerp(z0, cz, ent)) : fromXZ(stop.ll, cx, cz);
        const alt = lerp(s0.alt, cy, ent);
        const [px, pz] = toXZ(stop.ll, ll);
        const bl = headingXZ(-px, -pz), pl = 90 - Math.atan2(alt - gL, Math.hypot(px, pz)) / RAD;
        this.cam = {
          ll,
          alt,
          bearing: wrap360(s0.bearing + shortest(s0.bearing, bl) * ent),
          pitch: lerp(s0.pitch, pl, ent),
          roll: 0,
          fov: lerp(s0.fov, AERIAL_FOV, ent),
        };
        const ha = ang + 13;
        const [hx, hz] = dirXZ(ha);
        const hp: V3 = [hx * R * 0.78, gL + h - 16, hz * R * 0.78];
        this.hero = {
          rel: [hp[0] - px, hp[1] - alt, hp[2] - pz],
          heading: wrap360(ha + 90),
          bank: 16,
          pitch: 0,
          alpha: Math.min(1, this.hero.alpha + dt / 0.8),
          inflate: 1,
        };
        this.speedK = 0.15;
        this.turb = 0.08;
        if (!done && t >= dur) {
          done = true;
          this.op = null;
          resolve();
        }
      };
    });
  }

  dispose() {
    this.dead = true;
    this.op && (this.op.aborted = true);
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.warmer.dispose();
    this.map?.remove();
    this.map = undefined;
    this.host?.remove();
    const w = window as unknown as { __aerial?: unknown };
    if (w.__aerial === this) delete w.__aerial;
  }
}

