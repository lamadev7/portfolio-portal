import type { Map as MLMap, StyleSpecification, GeoJSONSource, GeoJSONSourceSpecification, ExpressionSpecification } from "maplibre-gl";
import { HOME_LL, KIND_LABEL, NEPAL_ISO, type Place } from "@/lib/data/places";
import { greatCircle, sampleFlight, easeInOut, type CamFrame } from "./geo";
import { kindSvg } from "./icons";
import { gradeFor, type Grade } from "./atmos";
import type { Trekker } from "./trekker";

type ML = typeof import("maplibre-gl");
type Data = GeoJSONSourceSpecification["data"];
type LL = [number, number];
export type Pad = { top: number; right: number; bottom: number; left: number };

export interface Cam {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  elevation: number;
  padding: Pad;
}

/** Two hostnames per tile service: both are HTTP/1.1, so each host is capped at six parallel connections. */
const esri = (h: string) => `https://${h}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
const IMAGERY = [esri("server"), esri("services")];
const TERRARIUM = ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"];
const IMG_MAX = 18;
/** Terrarium in Nepal is SRTM 30 m, which z12 (~34 m/px) already resolves; deeper levels only add requests. */
const DEM_MAX = 12;
/** Same host pick as MapLibre's CanonicalTileID.url, so warmed tiles hit the HTTP cache. */
const tileUrl = (tpl: string[], z: number, x: number, y: number) =>
  tpl[(x + y) % tpl.length].replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));

const GOLD = "#f4b961";
const EMPTY: Data = { type: "FeatureCollection", features: [] };
const EXAG = 1.5;
const FOV = 32;
const TERRAIN_ON = 5;
const TERRAIN_OFF = 4.6;
const NO_PAD: Pad = { top: 0, right: 0, bottom: 0, left: 0 };
const RAD = Math.PI / 180;

/**
 * Opening flight. It starts low behind the hiker in the Sarlahi Terai, lifts off and follows the trail north over the
 * Chure and Mahabharat ranges and the Kathmandu valley, and lands on him facing the high Himalaya. Fixed centre
 * elevations (e) keep the camera path smooth over ridges.
 */
export const FLIGHT: CamFrame[] = [
  { c: [85.5, 27.1], z: 14.7, p: 73, b: 4, e: 196 },
  { c: [85.4988, 27.128], z: 13.3, p: 77, b: 4, e: 215 },
  { c: [85.4823, 27.2896], z: 12.172, p: 81, b: 3, e: 600 },
  { c: [85.4567, 27.5212], z: 11.794, p: 81, b: 5, e: 1100 },
  { c: [85.462, 27.662], z: 11.6, p: 80, b: 7, e: 2000 },
  { c: [85.5203, 27.7172], z: 12.7, p: 76, b: 4, e: 2897 },
];
const FLIGHT_STAGE = [0, 0, 1, 2, 3, 4];
export const FLIGHT_STAGES = ["Terai plains · Sarlahi", "Chure hills", "Mahabharat range", "Kathmandu valley", "The high Himalaya"];
const FLIGHT_MS = 17000;
const NEPAL_VIEW = { center: [84.55, 27.95] as [number, number], zoom: 7.05, pitch: 50, bearing: 0, elevation: 1500 };
const WORLD_VIEW = { center: [86, 20] as [number, number], zoom: 2, pitch: 0, bearing: 0, elevation: 0 };
const ROTATE_DEG_S = 2.2;
const ORBIT_DEG_S = 1.5;

export interface ExplorerHooks {
  onSelect: (id: string) => void;
  onReady: () => void;
  onFail: () => void;
  onFlight: (flying: boolean) => void;
  onGlobe: () => void;
  onBearing: (deg: number) => void;
  onStage: (i: number) => void;
  onTravel: (info: { name: string; km: number } | null) => void;
  onLogbook: (on: boolean) => void;
}

interface Mk {
  el: HTMLDivElement;
  more: HTMLSpanElement;
  place: Place;
  x: number;
  y: number;
  state: string;
  n: number;
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const demCache = new Map<string, Promise<number | null>>();

/** Ground elevation (m) from the Terrarium tile under a point, read independently of what the map has loaded. */
function demAt([lng, lat]: [number, number]): Promise<number | null> {
  const z = DEM_MAX, n = 2 ** z;
  const fx = ((lng + 180) / 360) * n;
  const fy = ((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const key = `${tx}/${ty}/${Math.floor((fx - tx) * 256)}/${Math.floor((fy - ty) * 256)}`;
  let hit = demCache.get(key);
  if (!hit) {
    hit = fetch(tileUrl(TERRARIUM, z, tx, ty))
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => createImageBitmap(b))
      .then((img) => {
        const c = document.createElement("canvas");
        c.width = c.height = 1;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return null;
        g.drawImage(img, -Math.floor((fx - tx) * 256), -Math.floor((fy - ty) * 256));
        const [r, gr, bl] = g.getImageData(0, 0, 1, 1).data;
        return r * 256 + gr + bl / 256 - 32768;
      })
      .catch(() => null);
    demCache.set(key, hit);
  }
  return hit;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smoother = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10));
const shortest = (a: number, b: number) => ((b - a + 540) % 360) - 180;
const lerpPad = (a: Pad, b: Pad, t: number): Pad => ({
  top: lerp(a.top, b.top, t),
  right: lerp(a.right, b.right, t),
  bottom: lerp(a.bottom, b.bottom, t),
  left: lerp(a.left, b.left, t),
});
const km = (a: LL, b: LL) => {
  const dLat = (b[1] - a[1]) * RAD, dLng = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const bearingTo = (a: LL, b: LL) => {
  const f1 = a[1] * RAD, f2 = b[1] * RAD, dl = (b[0] - a[0]) * RAD;
  return Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) / RAD;
};

/** Line-progress gradient that draws the trail up to `p` with a bright head, the rest transparent. */
function trailGradient(p: number): ExpressionSpecification {
  const q = clamp(p, 0.002, 0.998);
  const tail = Math.max(0.001, q - 0.1);
  return ["interpolate", ["linear"], ["line-progress"], 0, "rgba(244,185,97,0.55)", tail, "rgba(244,185,97,0.95)", q, "rgba(255,240,214,1)", q + 0.001, "rgba(255,240,214,0)", 1, "rgba(255,240,214,0)"];
}

function graticule(): Data {
  const lines: Array<Array<[number, number]>> = [];
  for (let lng = -180; lng < 180; lng += 15) {
    const l: Array<[number, number]> = [];
    for (let lat = -80; lat <= 80; lat += 4) l.push([lng, lat]);
    lines.push(l);
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const l: Array<[number, number]> = [];
    for (let lng = -180; lng <= 180; lng += 4) l.push([lng, lat]);
    lines.push(l);
  }
  return { type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: lines } } as unknown as Data;
}

function buildStyle(): StyleSpecification {
  return {
    version: 8,
    /* globe for the logbook overview, flat mercator from z8.6: inside MapLibre's globe-to-mercator blend a pitched
       camera's centre and the rendered terrain disagree by up to ~250 px, so every terrain view sits outside it */
    projection: { type: ["interpolate", ["linear"], ["zoom"], 7.2, "vertical-perspective", 8.6, "mercator"] },
    transition: { duration: 1800, delay: 0 },
    sky: {
      "sky-color": ["interpolate", ["linear"], ["zoom"], 6.5, "#5f8fc7", 7.5, "#5f8fc700"],
      "horizon-color": ["interpolate", ["linear"], ["zoom"], 6.5, "#b7c8d8", 7.5, "#b7c8d800"],
      "fog-color": "#b7c8d8",
      "sky-horizon-blend": 0.5,
      "horizon-fog-blend": 1,
      "fog-ground-blend": 0.58,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
    },
    sources: {
      far: { type: "raster", tiles: IMAGERY, tileSize: 4096, maxzoom: IMG_MAX - 4 },
      backdrop: { type: "raster", tiles: IMAGERY, tileSize: 1024, maxzoom: IMG_MAX - 2 },
      imagery: { type: "raster", tiles: IMAGERY, tileSize: 256, maxzoom: IMG_MAX },
      dem: { type: "raster-dem", tiles: TERRARIUM, encoding: "terrarium", tileSize: 256, maxzoom: DEM_MAX },
      graticule: { type: "geojson", data: graticule() },
      borders: { type: "geojson", data: EMPTY },
      visited: { type: "geojson", data: EMPTY },
      arcs: { type: "geojson", data: EMPTY, lineMetrics: true },
      trail: { type: "geojson", data: EMPTY, lineMetrics: true },
    },
    layers: [
      { id: "far", type: "raster", source: "far", paint: { "raster-fade-duration": 0, "raster-saturation": -0.08, "raster-contrast": 0.04 } },
      { id: "backdrop", type: "raster", source: "backdrop", paint: { "raster-fade-duration": 0, "raster-saturation": -0.08, "raster-contrast": 0.04 } },
      { id: "imagery", type: "raster", source: "imagery", paint: { "raster-fade-duration": 260, "raster-saturation": -0.08, "raster-contrast": 0.04 } },
      {
        id: "graticule",
        type: "line",
        source: "graticule",
        paint: { "line-color": "#d9e4f2", "line-width": 0.6, "line-opacity": ["interpolate", ["linear"], ["zoom"], 1.5, 0.16, 4, 0.1, 5, 0] },
      },
      {
        id: "visited-fill",
        type: "fill",
        source: "visited",
        paint: { "fill-color": GOLD, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.34, 4, 0.24, 5.5, 0] },
      },
      {
        id: "borders",
        type: "line",
        source: "borders",
        layout: { "line-join": "round" },
        paint: {
          "line-color": "#e8eef5",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 5, 0.9],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.42, 4, 0.34, 5.5, 0],
        },
      },
      {
        id: "visited-line",
        type: "line",
        source: "visited",
        layout: { "line-join": "round" },
        paint: {
          "line-color": "#ffd99a",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1, 5, 1.6],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.95, 4.5, 0.8, 6, 0],
        },
      },
      {
        id: "arcs-glow",
        type: "line",
        source: "arcs",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": GOLD,
          "line-width": 7,
          "line-blur": 5,
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.35, 4, 0.25, 6, 0],
        },
      },
      {
        id: "arcs",
        type: "line",
        source: "arcs",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.4, 5, 2],
          "line-dasharray": [2, 1.6],
          "line-color": "#ffe2b0",
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.95, 4.5, 0.85, 6, 0],
        },
      },
      {
        id: "trail-glow",
        type: "line",
        source: "trail",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": GOLD, "line-width": 9, "line-blur": 7, "line-opacity": 0 },
      },
      {
        id: "trail",
        type: "line",
        source: "trail",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2, 10, 3, 14, 4], "line-gradient": trailGradient(0), "line-opacity": 1 },
      },
    ],
    terrain: { source: "dem", exaggeration: EXAG },
  };
}

interface Anim {
  t0: number;
  ms: number;
  s: number;
  e: number;
  eStart: number;
  to: Cam;
}

interface Trip {
  /** Route the trail and the traveller follow. */
  route: LL[];
  /** Cumulative route length, for an even pace along it. */
  cum: number[];
  done: boolean;
  /** Runs once when the trip ends or is interrupted. */
  finish: (interrupted: boolean) => void;
}

export class ExplorerController {
  private ml?: ML;
  private map?: MLMap;
  private dead = false;
  private active = true;
  private markers = new Map<string, Mk>();
  private visible = new Set<string>();
  private activeId: string | null = null;
  private raf = 0;
  private rotateRaf = 0;
  private orbitRaf = 0;
  private idleTimer = 0;
  private layer?: HTMLDivElement;
  private comet?: HTMLDivElement;
  private sky?: HTMLElement | null;
  private glowEl?: HTMLElement | null;
  private sunEl?: HTMLElement | null;
  private skyO = -1;
  private hzO = NaN;
  private glowO = -1;
  private w = 0;
  private h = 0;
  private ox = 0;
  private oy = 0;
  private globeSeen = false;
  private logbook = false;
  private flying = false;
  private anim: Anim | null = null;
  private trip: Trip | null = null;
  private terrainOn = true;
  private autoTimer = 0;
  private landTimer = 0;
  private offs: Array<() => void> = [];
  private zoomGoal = 0;
  private zoomRaf = 0;
  private warmed = new Set<string>();
  private warmCtl: AbortController | null = null;
  private destCtl: AbortController | null = null;
  private warmTimer = 0;
  private grade?: Grade;
  private warming = false;
  private framePad: Pad = NO_PAD;
  trek?: Trekker;

  constructor(
    private container: HTMLElement,
    private places: Place[],
    private hooks: ExplorerHooks,
    private reduced: boolean,
  ) {
    places.forEach((p) => this.visible.add(p.id));
  }

  async init(): Promise<void> {
    if (!hasWebGL()) return this.hooks.onFail();
    let ml: ML;
    try {
      const mod = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      ml = ((mod as unknown as { default?: ML }).default ?? mod) as ML;
    } catch {
      if (!this.dead) this.hooks.onFail();
      return;
    }
    if (this.dead) return;
    this.ml = ml;
    ml.setMaxParallelImageRequests(24);
    ml.config.MAX_PARALLEL_IMAGE_REQUESTS_PER_FRAME = 20;
    const start = this.reduced ? FLIGHT[FLIGHT.length - 1] : FLIGHT[0];
    let map: MLMap;
    try {
      map = new ml.Map({
        container: this.container,
        style: buildStyle(),
        center: start.c,
        zoom: start.z,
        pitch: start.p,
        bearing: start.b,
        elevation: start.e,
        centerClampedToGround: false,
        maxPitch: 85,
        minZoom: 1.2,
        maxZoom: 17.5,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        fadeDuration: 0,
        attributionControl: false,
        canvasContextAttributes: { antialias: false, powerPreference: "high-performance" },
        maxTileCacheZoomLevels: 6,
        refreshExpiredTiles: false,
        cancelPendingTileRequestsWhileZooming: true,
        dragPan: { linearity: 0.22, deceleration: 2000, maxSpeed: 1800 },
      });
    } catch {
      this.hooks.onFail();
      return;
    }
    this.map = map;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __ex?: unknown }).__ex = this;
    map.setVerticalFieldOfView(FOV);
    this.bindInput();
    const root = this.container.parentElement;
    this.sky = root?.querySelector<HTMLElement>(".ex-sky");
    this.glowEl = root?.querySelector<HTMLElement>(".ex-glow");
    this.sunEl = root?.querySelector<HTMLElement>(".ex-sunglow");
    const size = () => {
      const r = this.container.getBoundingClientRect();
      this.w = r.width;
      this.h = r.height;
      this.ox = r.left;
      this.oy = r.top;
    };
    size();
    map.on("resize", size);
    map.on("rotate", () => this.hooks.onBearing(map.getBearing()));
    map.on("render", () => this.frame());
    map.on("zoom", () => {
      this.capPitch();
      this.syncTerrain();
      const z = map.getZoom();
      if (this.warming) return;
      if (!this.globeSeen && z < 5) {
        this.globeSeen = true;
        this.hooks.onGlobe();
      }
      const lb = this.logbook ? z < 5.1 : z < 4.6;
      if (lb !== this.logbook) this.hooks.onLogbook((this.logbook = lb));
    });
    map.on("movestart", (e) => {
      if (!(e as { originalEvent?: Event }).originalEvent) return;
      if (!map.getCenterClampedToGround() && this.terrainOn) map.setCenterClampedToGround(true);
      window.clearTimeout(this.warmTimer);
      this.warmCtl?.abort();
    });
    let settled = false;
    map.on("moveend", () => {
      settled = true;
      this.scheduleRotate();
    });
    map.on("idle", () => {
      /* the frame after a move re-clamps the camera to the terrain after the tile set was chosen, which leaves edge
         tiles of the final view unrequested (and blurry) until something else moves the map */
      if (settled) (map as unknown as { _update: () => void })._update();
      settled = false;
      window.clearTimeout(this.warmTimer);
      this.warmTimer = window.setTimeout(() => this.prefetchAround(), 350);
    });
    map.once("load", () => {
      if (this.dead) return;
      this.addMarkers();
      this.applyGrade(start.c);
      void this.initTrek();
      void this.buildBase();
      const world = this.loadWorld();
      let started = false;
      const begin = () => {
        if (started || this.dead) return;
        started = true;
        this.hooks.onReady();
        if (this.reduced) {
          this.settle();
          return this.hooks.onFlight(false);
        }
        this.autoTimer = window.setTimeout(() => this.active && !this.dead && this.playFlight(), 1800);
      };
      map.once("idle", () => void this.warmShaders(world).then(begin));
      window.setTimeout(begin, 11000);
    });
  }

  /**
   * MapLibre compiles a shader the first time a layer draws in a given projection/terrain variant, and on Metal each
   * compile blocks a frame for 50-120 ms. While the loading veil is still up, visit the globe-with-terrain and the
   * flat-globe variants once (with the trail drawn) so no compile lands in the middle of a zoom or a flight.
   */
  private async warmShaders(world: Promise<void>) {
    const map = this.map;
    if (!map || this.dead) return;
    const home = this.current();
    const idle = (ms: number) =>
      new Promise<void>((res) => {
        const t = window.setTimeout(res, ms);
        map.once("idle", () => {
          window.clearTimeout(t);
          res();
        });
      });
    this.warming = true;
    try {
      await Promise.race([world, idle(2000)]);
      if (this.dead) return;
      this.setTrail([[83.6, 27.4], [87.2, 28.2]]);
      this.trailAt(1, 1);
      for (const v of [{ center: [85.2, 28] as LL, zoom: 6.4, pitch: 35 }, { center: [86, 22] as LL, zoom: 2.7, pitch: 0 }]) {
        map.jumpTo({ ...v, bearing: 0 });
        await idle(1400);
        if (this.dead) return;
      }
      map.setMaxPitch(85);
      map.jumpTo({ ...home, padding: this.reduced ? home.padding : this.compose(this.framePad) });
      this.setTrail(null);
      this.trailAt(0, 0);
      await idle(2500);
    } finally {
      this.warming = false;
    }
  }

  private async initTrek() {
    const map = this.map, ml = this.ml;
    if (!map || !ml) return;
    const { createTrekker } = await import("./trekker");
    if (this.dead || !this.map) return;
    const t = await createTrekker(map, ml, { px: this.w < 760 ? 48 : 64, still: this.reduced });
    if (this.dead || !this.map) return;
    map.addLayer(t);
    map.on("resize", () => t.resize());
    this.trek = t;
    if (this.grade) t.setLight(this.grade.light);
    const end = FLIGHT[FLIGHT.length - 1];
    if (this.flying || !this.reduced) t.setPlace(FLIGHT[0].c, FLIGHT[0].z, { line: FLIGHT[0].b, walk: this.flying });
    else t.setPlace(end.c, end.z, { face: end.b });
    t.show(true, true);
  }

  private bindInput() {
    const stop = () => this.interrupt();
    const evs = ["pointerdown", "touchstart", "keydown"] as const;
    evs.forEach((ev) => this.container.addEventListener(ev, stop, { passive: true }));
    this.offs.push(() => evs.forEach((ev) => this.container.removeEventListener(ev, stop)));
    this.bindWheel();
  }

  private interrupt() {
    window.clearTimeout(this.autoTimer);
    window.clearTimeout(this.landTimer);
    if (this.raf) {
      this.stopCamera(true);
      this.settle();
    }
    this.stopRotate();
    this.stopOrbit();
    this.scheduleRotate();
  }

  /**
   * Wheel and trackpad zoom glide toward a target zoom instead of stepping per event. Each eased frame step is replayed
   * through MapLibre's own scroll-zoom handler as a trackpad-sized delta, so its globe and terrain anchoring still applies.
   */
  private bindWheel() {
    const map = this.map!, host = map.getCanvasContainer();
    map.scrollZoom.setZoomRate(1);
    let px = 0, py = 0, last = 0, tau = 90, synth = false;
    const emit = (dz: number) => {
      const s = 2 ** Math.abs(dz);
      synth = true;
      host.dispatchEvent(new WheelEvent("wheel", { deltaY: -Math.sign(dz) * Math.log(s / (2 - s)), clientX: px, clientY: py, bubbles: true, cancelable: true }));
      synth = false;
    };
    const step = (now: number) => {
      const dt = Math.min(now - last, 48);
      last = now;
      const g = this.zoomGoal;
      let dz = this.reduced || Math.abs(g) < 0.01 ? g : g * (1 - Math.exp(-dt / tau));
      dz = Math.max(-0.9, Math.min(0.9, dz));
      this.zoomGoal = g - dz;
      if (dz) emit(dz);
      this.zoomRaf = this.zoomGoal ? requestAnimationFrame(step) : 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (synth) return;
      e.preventDefault();
      e.stopPropagation();
      this.interrupt();
      const d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1);
      if (!d) return;
      const coarse = !e.ctrlKey && Math.abs(d) >= 40;
      tau = coarse ? 90 : 55;
      const dz = Math.max(-1.2, Math.min(1.2, -d * (e.ctrlKey ? 0.012 : coarse ? 1 / 300 : 1 / 170)));
      const z = map.getZoom();
      this.zoomGoal = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), z + this.zoomGoal + dz)) - z;
      px = e.clientX;
      py = e.clientY;
      if (!this.zoomRaf) {
        last = performance.now();
        this.zoomRaf = requestAnimationFrame(step);
      }
    };
    this.container.addEventListener("wheel", onWheel, { capture: true, passive: false });
    this.offs.push(() => {
      this.container.removeEventListener("wheel", onWheel, { capture: true });
      cancelAnimationFrame(this.zoomRaf);
    });
  }

  private cover(tr: unknown, id: string, tileSize: number, maxzoom: number, roundZoom: boolean) {
    const map = this.map!;
    const opts = { tileSize, maxzoom, roundZoom, terrain: map.terrain ?? undefined, calculateTileZoom: (map.getSource(id) as unknown as { calculateTileZoom?: unknown })?.calculateTileZoom };
    return (tr ? map.coveringTiles.call({ transform: tr } as unknown as MLMap, opts as Parameters<MLMap["coveringTiles"]>[0]) : map.coveringTiles(opts as Parameters<MLMap["coveringTiles"]>[0])).map((t) => t.canonical);
  }

  /** When the view settles, quietly pull the tiles one zoom level up and down and a ring around the view into the HTTP cache. */
  private prefetchAround() {
    const map = this.map;
    if (!map || this.dead || this.raf || (map.isMoving() && !this.orbitRaf)) return;
    const urls: string[] = [];
    const add = (tpl: string[], z: number, x: number, y: number) => {
      const n = 2 ** z;
      if (z < 0 || y < 0 || y >= n) return;
      const u = tileUrl(tpl, z, ((x % n) + n) % n, y);
      if (!this.warmed.has(u)) urls.push(u);
    };
    const img = this.cover(null, "imagery", 256, IMG_MAX, true);
    if (!img.length) return;
    const zTop = Math.max(...img.map((c) => c.z));
    const seen = new Set(img.map((c) => `${c.z}/${c.x}/${c.y}`));
    img.filter((c) => c.z === zTop && c.z < IMG_MAX).slice(0, 8).forEach((c) => [0, 1, 2, 3].forEach((i) => add(IMAGERY, c.z + 1, c.x * 2 + (i & 1), c.y * 2 + (i >> 1))));
    const ring = (cs: Array<{ z: number; x: number; y: number }>, up: number) => {
      const keys = new Set<string>();
      cs.forEach((c) => {
        const z = c.z - up, x = c.x >> up, y = c.y >> up;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) keys.add(`${z}/${x + dx}/${y + dy}`);
      });
      keys.forEach((k) => {
        const [z, x, y] = k.split("/").map(Number);
        if (!seen.has(k)) add(IMAGERY, z, x, y);
      });
    };
    ring(img, 2);
    ring(img.filter((c) => c.z >= zTop - 1), 1);
    ring(img.filter((c) => c.z >= zTop - 1), 0);
    if (map.getTerrain())
      this.cover(null, "dem", 512, DEM_MAX, false).forEach((c) => {
        add(TERRARIUM, c.z - 1, c.x >> 1, c.y >> 1);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) add(TERRARIUM, c.z, c.x + dx, c.y + dy);
      });
    this.warmCtl?.abort();
    this.warmCtl = this.warm([...new Set(urls)].slice(0, 120), 4);
  }

  /** Every imagery and DEM tile the destination camera will need, fetched ahead so the landing is sharp. */
  private prefetchView(to: Cam): { ratio: () => number } {
    const map = this.map;
    const none = { ratio: () => 1 };
    if (!map) return none;
    let tr: {
      setMaxPitch: (p: number) => void; setCenter: (c: unknown) => void; setZoom: (z: number) => void; setPitch: (p: number) => void;
      setBearing: (b: number) => void; setElevation: (e: number) => void; setPadding: (p: Pad) => void;
    };
    try {
      tr = (map.transform as unknown as { clone: () => typeof tr }).clone();
      tr.setMaxPitch(85);
      tr.setPadding(to.padding);
      tr.setZoom(to.zoom);
      tr.setCenter(new this.ml!.LngLat(to.center[0], to.center[1]));
      tr.setElevation(to.elevation);
      tr.setPitch(to.pitch);
      tr.setBearing(to.bearing);
    } catch {
      return none;
    }
    const urls = new Set<string>();
    const img = this.cover(tr, "imagery", 256, IMG_MAX, true);
    img.forEach((c) => urls.add(tileUrl(IMAGERY, c.z, c.x, c.y)));
    img.forEach((c) => c.z >= 2 && urls.add(tileUrl(IMAGERY, c.z - 2, c.x >> 2, c.y >> 2)));
    this.cover(tr, "dem", 512, DEM_MAX, false).forEach((c) => {
      urls.add(tileUrl(TERRARIUM, c.z, c.x, c.y));
      if (c.z > 0) urls.add(tileUrl(TERRARIUM, c.z - 1, c.x >> 1, c.y >> 1));
    });
    const list = [...urls].filter((u) => !this.warmed.has(u));
    const total = list.length;
    this.destCtl?.abort();
    this.destCtl = this.warm(list, 8, "high");
    return { ratio: () => (total ? list.filter((u) => this.warmed.has(u)).length / total : 1) };
  }

  /** Fetches into the HTTP cache, `n` at a time, abortable as a batch. */
  private warm(urls: string[], n: number, priority: "low" | "high" = "low"): AbortController {
    const ctl = new AbortController();
    let i = 0;
    const next = (): Promise<void> | void => {
      if (ctl.signal.aborted || i >= urls.length) return;
      const u = urls[i++];
      return fetch(u, { signal: ctl.signal, priority } as RequestInit)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then(() => void this.warmed.add(u))
        .catch(() => undefined)
        .then(next);
    };
    for (let k = 0; k < n; k++) void next();
    return ctl;
  }

  /**
   * Low-res imagery that stays resident on the GPU (the Nepal region at z7, the world at z2), under the tiled layers.
   * MapLibre only falls back to parent tiles it already holds in view, so ground revealed by a zoom-out or a fast pan
   * would otherwise show a hole until its tiles arrive.
   */
  private async buildBase() {
    const parts = [
      { id: "base-np", z: 7, x0: 92, y0: 51, cols: 4, rows: 5 },
      { id: "base-world", z: 2, x0: 0, y0: 0, cols: 4, rows: 4 },
    ];
    for (const s of parts) {
      const canvas = document.createElement("canvas");
      canvas.width = s.cols * 256;
      canvas.height = s.rows * 256;
      const g = canvas.getContext("2d");
      if (!g) return;
      const jobs: Array<() => Promise<void>> = [];
      for (let j = 0; j < s.rows; j++)
        for (let i = 0; i < s.cols; i++)
          jobs.push(() =>
            fetch(tileUrl(IMAGERY, s.z, s.x0 + i, s.y0 + j), { priority: "low" } as RequestInit)
              .then((r) => (r.ok ? r.blob() : Promise.reject()))
              .then((b) => createImageBitmap(b))
              .then((bm) => {
                g.drawImage(bm, i * 256, j * 256);
                bm.close();
              })
              .catch(() => undefined),
          );
      await Promise.all(Array.from({ length: 4 }, async () => { for (let f = jobs.shift(); f; f = jobs.shift()) await f(); }));
      const map = this.map;
      if (!map || this.dead) return;
      const n = 2 ** s.z;
      const lng = (x: number) => (x / n) * 360 - 180;
      const lat = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) / RAD;
      const w = lng(s.x0), e = lng(s.x0 + s.cols), top = lat(s.y0), bot = lat(s.y0 + s.rows);
      const gr = this.grade;
      map.addSource(s.id, { type: "canvas", canvas, animate: false, coordinates: [[w, top], [e, top], [e, bot], [w, bot]] });
      map.addLayer(
        {
          id: s.id,
          type: "raster",
          source: s.id,
          paint: { "raster-fade-duration": 0, ...(gr && { "raster-brightness-max": gr.brightness, "raster-saturation": gr.saturation, "raster-contrast": gr.contrast }) },
        },
        map.getLayer("base-np") ? "base-np" : "far",
      );
    }
  }

  /** Sky, fog, imagery grade and the hiker's light for the sun at a place right now. */
  private applyGrade(ll: LL) {
    const map = this.map;
    if (!map) return;
    const g = gradeFor(ll);
    const prev = this.grade;
    this.grade = g;
    if (prev && prev.sky === g.sky && prev.horizon === g.horizon) return;
    /* below the globe zooms MapLibre's sky fades out and the CSS sky behind the canvas (one gradient anchored on the
       true horizon, see frame()) takes over: with top padding MapLibre's own sky starts above the horizon and leaves a band */
    const fade = (c: string): ExpressionSpecification => ["interpolate", ["linear"], ["zoom"], 6.5, c, 7.5, `${c}00`];
    map.setSky({
      "sky-color": fade(g.sky),
      "horizon-color": fade(g.fog),
      "fog-color": g.fog,
      "sky-horizon-blend": 0.5,
      "horizon-fog-blend": 1,
      "fog-ground-blend": 0.58,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
    });
    for (const id of ["imagery", "backdrop", "far", "base-np", "base-world"]) {
      if (!map.getLayer(id)) continue;
      map.setPaintProperty(id, "raster-brightness-max", g.brightness);
      map.setPaintProperty(id, "raster-saturation", g.saturation);
      map.setPaintProperty(id, "raster-contrast", g.contrast);
    }
    const root = this.container.parentElement;
    root?.style.setProperty("--ex-sun", g.glow);
    root?.style.setProperty("--ex-skyc", g.sky);
    root?.style.setProperty("--ex-haze", g.fog);
    this.trek?.setLight(g.light);
  }

  /** Zooming out flattens the camera so the globe is seen face-on; scripted moves lift the cap while they run. */
  private capPitch() {
    const map = this.map;
    if (!map || this.raf) return;
    const z = map.getZoom();
    const cap = z >= 7 ? 85 : z <= 3 ? 0 : Math.round(((z - 3) / 4) * 85 * 2) / 2;
    if (cap !== map.getMaxPitch()) map.setMaxPitch(cap);
  }

  private syncTerrain() {
    const map = this.map;
    if (!map) return;
    const z = map.getZoom();
    if (this.terrainOn && z < TERRAIN_OFF) {
      this.terrainOn = false;
      map.setTerrain(null);
    } else if (!this.terrainOn && z >= TERRAIN_ON) {
      this.terrainOn = true;
      map.setTerrain({ source: "dem", exaggeration: EXAG });
    }
  }

  private async loadWorld() {
    const [{ feature, mesh }, atlas] = await Promise.all([import("topojson-client"), import("world-atlas/countries-110m.json")]);
    if (this.dead || !this.map) return;
    type Topo = Parameters<typeof feature>[0];
    const topo = ((atlas as unknown as { default?: Topo }).default ?? atlas) as Topo;
    const obj = topo.objects.countries as NonNullable<Parameters<typeof mesh>[1]>;
    const all = feature(topo, obj) as unknown as { features: Array<{ id?: string | number }> };
    const isos = new Set(this.places.filter((p) => p.kind !== "dream").map((p) => p.iso));
    const visited = { type: "FeatureCollection", features: all.features.filter((f) => f.id != null && isos.has(String(f.id))) } as unknown as Data;
    const borders = { type: "Feature", properties: {}, geometry: mesh(topo, obj, (a, b) => a !== b) } as unknown as Data;
    const arcs = {
      type: "FeatureCollection",
      features: this.places
        .filter((p) => p.iso !== NEPAL_ISO)
        .map((p) => ({ type: "Feature", properties: { id: p.id }, geometry: { type: "LineString", coordinates: greatCircle(HOME_LL, p.ll) } })),
    } as unknown as Data;
    (this.map.getSource("visited") as GeoJSONSource | undefined)?.setData(visited);
    (this.map.getSource("borders") as GeoJSONSource | undefined)?.setData(borders);
    (this.map.getSource("arcs") as GeoJSONSource | undefined)?.setData(arcs);
  }

  private addMarkers() {
    const layer = document.createElement("div");
    layer.className = "ex-mk-layer";
    this.map!.getCanvasContainer().appendChild(layer);
    this.layer = layer;
    for (const p of this.places) {
      const el = document.createElement("div");
      el.className = "ex-mk is-off";
      el.dataset.kind = p.kind;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ex-mk-btn";
      btn.setAttribute("aria-label", `${p.name}: ${KIND_LABEL[p.kind]}, ${p.region}, ${p.country}`);
      btn.innerHTML = `<span class="ex-mk-disc">${kindSvg(p.kind, 15)}</span><span class="ex-mk-label" aria-hidden="true">${escapeHtml(p.name)}</span>`;
      const more = document.createElement("span");
      more.className = "ex-mk-more";
      more.setAttribute("aria-hidden", "true");
      btn.appendChild(more);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.hooks.onSelect(p.id);
      });
      el.appendChild(btn);
      const stem = document.createElement("span");
      stem.className = "ex-mk-stem";
      stem.setAttribute("aria-hidden", "true");
      el.appendChild(stem);
      layer.appendChild(el);
      this.markers.set(p.id, { el, more, place: p, x: NaN, y: NaN, state: "off", n: 0 });
    }
    const comet = document.createElement("div");
    comet.className = "ex-comet";
    comet.setAttribute("aria-hidden", "true");
    comet.innerHTML = "<i></i>";
    layer.appendChild(comet);
    this.comet = comet;
    this.setActive(this.activeId);
  }

  /** Per rendered frame: place markers, declutter, sky and globe glow. Pure math plus changed-only style writes; never reads layout. */
  private frame() {
    const map = this.map, ml = this.ml;
    if (!map || !ml) return;
    const z = map.getZoom(), pitch = map.getPitch();
    const sky = Math.round(Math.min(Math.max(z - 6.5, 0), 1) * 100) / 100;
    if (sky !== this.skyO && this.sky) this.sky.style.opacity = String((this.skyO = sky));
    if (sky > 0 && this.sky) {
      const pad = map.getPadding(), top = pad.top ?? 0, bottom = pad.bottom ?? 0;
      const hz = Math.max(-400, top + (this.h - top - bottom) / 2 - (this.h * 0.5) / Math.tan((FOV * Math.PI) / 360) / Math.tan(Math.max(pitch, 1) * RAD));
      if (Math.abs(hz - this.hzO) > 0.5) this.sky.style.setProperty("--hz", `${(this.hzO = hz).toFixed(1)}px`);
    }
    const glow = Math.round(Math.min(Math.max((5.2 - z) / 1.4, 0), 1) * 100) / 100;
    if (this.glowEl) {
      if (glow !== this.glowO) this.glowEl.style.opacity = String((this.glowO = glow));
      if (glow > 0) {
        const c = map.getCenter(), d = 88 * RAD, f1 = c.lat * RAD;
        const lat2 = Math.asin(Math.sin(f1) * Math.cos(d));
        const lng2 = c.lng + Math.atan2(Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(lat2)) / RAD;
        const a = map.project(c), b = map.project([lng2, lat2 / RAD]);
        const r = Math.hypot(b.x - a.x, b.y - a.y);
        this.glowEl.style.transform = `translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0) scale(${((r * 2.5) / 1000).toFixed(4)})`;
      }
    }
    if (!this.markers.size) return;
    const tr = map.transform;
    let behind: ((ll: [number, number]) => boolean) | null = null;
    if (pitch > 30) {
      const c = ml.MercatorCoordinate.fromLngLat(map.getCenter());
      const b = map.getBearing() * RAD;
      const fx = Math.sin(b), fy = -Math.cos(b);
      const reach = ((0.5 / Math.tan((FOV * Math.PI) / 360)) * this.h * Math.sin(pitch * RAD)) / (512 * 2 ** z);
      behind = (ll) => {
        const m = ml.MercatorCoordinate.fromLngLat(ll);
        return (m.x - c.x) * fx + (m.y - c.y) * fy < -reach * 0.8;
      };
    }
    const order = [...this.markers.values()];
    if (this.activeId) order.sort((a, b) => (b.place.id === this.activeId ? 1 : 0) - (a.place.id === this.activeId ? 1 : 0));
    const kept: Mk[] = [];
    for (const m of order) {
      m.n = 0;
      let state = "on";
      if (!this.visible.has(m.place.id)) state = "filtered";
      else {
        const ll = new ml.LngLat(m.place.ll[0], m.place.ll[1]);
        if ((z < 6 && tr.isLocationOccluded(ll)) || (behind && behind(m.place.ll))) state = "off";
        else {
          const pt = map.project(ll);
          if (pt.x < -60 || pt.x > this.w + 60 || pt.y < 84 || pt.y > this.h + 60) state = "off";
          else {
            if (!(Math.abs(pt.x - m.x) < 0.05 && Math.abs(pt.y - m.y) < 0.05)) {
              m.x = pt.x;
              m.y = pt.y;
              m.el.style.transform = `translate3d(${pt.x.toFixed(2)}px,${pt.y.toFixed(2)}px,0)`;
            }
            const host = kept.find((k) => Math.abs(k.x - pt.x) < 34 && Math.abs(k.y - pt.y) < 34);
            if (host) {
              host.n++;
              state = "tucked";
            } else kept.push(m);
          }
        }
      }
      if (state !== m.state) {
        m.el.classList.toggle("is-off", state === "off");
        m.el.classList.toggle("is-tucked", state === "tucked");
        m.el.classList.toggle("is-filtered", state === "filtered");
        m.state = state;
      }
    }
    for (const m of order) {
      const t = m.state === "on" && m.n ? `+${m.n}` : "";
      if (m.more.textContent !== t) m.more.textContent = t;
    }
  }

  setVisible(ids: string[]) {
    this.visible = new Set(ids);
    this.map?.triggerRepaint();
  }

  setActive(id: string | null) {
    this.activeId = id;
    for (const m of this.markers.values()) m.el.classList.toggle("is-active", m.place.id === id);
    if (!id) this.stopOrbit();
    this.map?.triggerRepaint();
  }

  private settle() {
    const map = this.map;
    if (!map) return;
    this.capPitch();
    if (this.terrainOn && !map.areTilesLoaded()) {
      map.once("idle", () => !this.dead && !this.raf && !map.getCenterClampedToGround() && this.settle());
      return;
    }
    map.setCenterClampedToGround(true);
    if (this.terrainOn) map.easeTo({ duration: 0, freezeElevation: true });
  }

  private stopCamera(interrupted = false) {
    window.clearTimeout(this.autoTimer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.anim = null;
    const trip = this.trip;
    this.trip = null;
    if (trip && !trip.done) {
      trip.done = true;
      trip.finish(interrupted);
    }
    if (this.flying) {
      this.flying = false;
      this.hooks.onFlight(false);
    }
  }

  private halt() {
    const map = this.map!;
    this.stopCamera(true);
    this.stopRotate();
    this.stopOrbit();
    window.clearTimeout(this.landTimer);
    map.stop();
    map.setMaxPitch(85);
    map.setCenterClampedToGround(false);
  }

  private current(): Cam {
    const map = this.map!;
    const p = map.getPadding();
    return {
      center: map.getCenter().toArray() as [number, number],
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
      elevation: map.getCenterElevation(),
      padding: { top: p.top ?? 0, right: p.right ?? 0, bottom: p.bottom ?? 0, left: p.left ?? 0 },
    };
  }

  /** Arcing camera move with an explicit centre elevation, so the camera never snaps to half-loaded terrain. */
  private animate(to: Cam, done?: () => void) {
    const map = this.map, ml = this.ml;
    if (!map || !ml) return;
    this.halt();
    if (this.reduced) {
      map.jumpTo(to);
      this.settle();
      done?.();
      return;
    }
    const from = this.current();
    let tl = to.center[0];
    while (tl - from.center[0] > 180) tl -= 360;
    while (tl - from.center[0] < -180) tl += 360;
    const a = ml.MercatorCoordinate.fromLngLat(from.center), b = ml.MercatorCoordinate.fromLngLat([tl, to.center[1]]);
    const span = Math.max(this.container.clientWidth, this.container.clientHeight, 1);
    const zMin = Math.min(from.zoom, to.zoom);
    const distPx = Math.hypot(b.x - a.x, b.y - a.y) * 512 * 2 ** zMin;
    const hop = distPx > span * 0.8 ? Math.max(0, Math.min(Math.log2(distPx / (span * 0.8)), zMin - 1.2)) : 0;
    const dz = Math.abs(to.zoom - from.zoom);
    const ms = Math.min(6500, Math.max(1500, 1000 + (hop + dz * 0.45) * 480));
    const zAt = (s: number) => lerp(from.zoom, to.zoom, s) - hop * 4 * s * (1 - s);
    const N = 96, F = [0];
    for (let i = 1; i <= N; i++) F.push(F[i - 1] + 2 ** -zAt((i - 0.5) / N));
    const along = (s: number) => {
      const x = s * N, i = Math.min(Math.floor(x), N - 1);
      return (F[i] + (F[i + 1] - F[i]) * (x - i)) / (F[N] || 1);
    };
    const db = shortest(from.bearing, to.bearing);
    const flat = Math.min(hop / 4, 1) * 0.65;
    const anim: Anim = { t0: performance.now(), ms, s: 0, e: from.elevation, eStart: from.elevation, to };
    this.anim = anim;
    const step = (now: number) => {
      if (!this.map || this.anim !== anim) return;
      const t = Math.min(Math.max((now - anim.t0) / anim.ms, 0), 1);
      const s = easeInOut(t);
      const u = along(s);
      anim.s = s;
      anim.e = lerp(anim.eStart, anim.to.elevation, s);
      const c = new ml.MercatorCoordinate(lerp(a.x, b.x, u), lerp(a.y, b.y, u)).toLngLat();
      this.map.jumpTo({
        center: [c.lng, c.lat],
        zoom: zAt(s),
        pitch: lerp(from.pitch, to.pitch, s) * (1 - flat * 4 * s * (1 - s)),
        bearing: from.bearing + db * s,
        elevation: anim.e,
        padding: lerpPad(from.padding, to.padding, s),
      });
      if (t < 1) this.raf = requestAnimationFrame(step);
      else {
        this.raf = 0;
        this.anim = null;
        this.settle();
        done?.();
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  private setTrail(route: LL[] | null) {
    const src = this.map?.getSource("trail") as GeoJSONSource | undefined;
    src?.setData(route ? ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route } } as unknown as Data) : EMPTY);
  }

  private trailAt(p: number, glow: number) {
    const map = this.map;
    if (!map) return;
    map.setPaintProperty("trail", "line-gradient", trailGradient(p));
    map.setPaintProperty("trail-glow", "line-opacity", clamp(glow, 0, 1) * 0.45);
  }

  /** Point at fraction `p` of the route's length. */
  private routeAt(trip: Trip, p: number): LL {
    const { route, cum } = trip;
    const d = clamp(p, 0, 1) * cum[cum.length - 1];
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const seg = cum[i] - cum[i - 1] || 1, t = (d - cum[i - 1]) / seg;
    return [lerp(route[i - 1][0], route[i][0], t), lerp(route[i - 1][1], route[i][1], t)];
  }

  private newTrip(route: LL[], finish: Trip["finish"]): Trip {
    const cum = [0];
    for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + km(route[i - 1], route[i]));
    return { route, cum, done: false, finish };
  }

  private cometAt(ll: LL | null, o: number) {
    const c = this.comet, map = this.map;
    if (!c || !map) return;
    if (!ll || o <= 0.01) {
      if (c.style.opacity !== "0") c.style.opacity = "0";
      return;
    }
    const pt = map.project(ll);
    c.style.opacity = o.toFixed(2);
    c.style.transform = `translate3d(${pt.x.toFixed(1)}px,${pt.y.toFixed(1)}px,0)`;
  }

  /**
   * Place-to-place travel as one shot: lift off the ground view, arc over the terrain (or the globe) with the trail
   * drawing behind a traveller marker, then descend at a low golden-hour pitch and land on the hiker. The destination's
   * tiles are fetched at take-off; if they are not in by the descent, the cruise slows for up to 1.6 s to let them land.
   */
  private travel(to: Cam, place: Place) {
    const map = this.map, ml = this.ml;
    if (!map || !ml) return;
    this.halt();
    const trek = this.trek;
    if (this.reduced) {
      map.jumpTo(to);
      this.settle();
      this.land(place, to);
      return;
    }
    const from = this.current();
    let tl = to.center[0];
    while (tl - from.center[0] > 180) tl -= 360;
    while (tl - from.center[0] < -180) tl += 360;
    const A: LL = trek?.visible && map.getZoom() > 9 ? trek.location : from.center;
    const B: LL = [tl, to.center[1]];
    const dist = km(A, B);
    const a = ml.MercatorCoordinate.fromLngLat(from.center), b = ml.MercatorCoordinate.fromLngLat(B);
    const span = Math.max(this.w, this.h, 1);
    const zMin = Math.min(from.zoom, to.zoom);
    const distPx = Math.hypot(b.x - a.x, b.y - a.y) * 512 * 2 ** zMin;
    const hop = distPx > span * 0.5 ? clamp(Math.log2(distPx / (span * 0.5)), 0, zMin - 1.6) : 0;
    const lift = Math.min(zMin - 1.6, hop + (dist < 2 ? 0.7 : 1.2));
    const zc = zMin - lift;
    const pc = clamp(70 - Math.max(0, hop - 3) * 13, 0, 70);
    const heading = dist > 1.5 ? bearingTo(A, B) : to.bearing;
    const ms = clamp(3600 + 1300 * Math.log2(1 + dist / 6), 3800, 10500);
    const R1 = 0.3, R2 = 0.62;
    const d1 = shortest(from.bearing, heading), d2 = shortest(heading, to.bearing);
    const zAt = (t: number) =>
      t < R1 ? lerp(from.zoom, zc, smoother(t / R1)) : t < R2 ? zc - 0.15 * Math.sin((Math.PI * (t - R1)) / (R2 - R1)) : lerp(zc, to.zoom, smoother((t - R2) / (1 - R2)));
    const pAt = (t: number) => (t < R1 ? lerp(from.pitch, pc, smoother(t / R1)) : t < R2 ? pc : lerp(pc, to.pitch, smoother(Math.min(1, ((t - R2) / (1 - R2)) * 1.2))));
    const bAt = (t: number) => (t < R1 ? from.bearing + d1 * smoother(t / R1) : t < R2 ? heading : heading + d2 * smoother((t - R2) / (1 - R2)));
    const N = 160, F = [0];
    for (let i = 1; i <= N; i++) {
      const t = (i - 0.5) / N;
      F.push(F[i - 1] + 2 ** -zAt(t) * smoother(Math.min(1, t / 0.1)) * smoother(Math.min(1, (1 - t) / 0.12)));
    }
    const along = (t: number) => {
      const x = clamp(t, 0, 1) * N, i = Math.min(Math.floor(x), N - 1);
      return (F[i] + (F[i + 1] - F[i]) * (x - i)) / (F[N] || 1);
    };
    const route = dist > 0.05 ? greatCircle(A, B, Math.max(16, Math.min(160, Math.round(dist / 2)))) : [A, B];
    this.setTrail(route);
    this.trailAt(0, 0);
    const warm = this.prefetchView(to);
    let moved = false, eTo = to.elevation;
    const eFrom = from.elevation;
    const trip = this.newTrip(route, (interrupted) => {
      this.cometAt(null, 0);
      this.hooks.onTravel(null);
      if (!moved) this.placeTrekker(place, to);
      this.trailAt(1, 0);
      if (interrupted) this.land(place, null, true);
    });
    this.trip = trip;
    this.hooks.onTravel({ name: place.name, km: Math.round(dist) });
    trek?.show(false);
    void demAt(place.ll).then((m) => {
      if (m != null && this.trip === trip) eTo = m * EXAG;
    });
    let vt = 0, last = performance.now(), held = 0;
    const step = (now: number) => {
      if (!this.map || this.trip !== trip) return;
      const dt = Math.min(now - last, 50);
      last = now;
      let rate = 1;
      const tNow = vt / ms;
      if (tNow > R2 - 0.08 && tNow < R2 + 0.02 && held < 1600 && warm.ratio() < 0.85) {
        rate = 0.22;
        held += dt;
      }
      vt += dt * rate;
      const t = Math.min(vt / ms, 1);
      const u = along(t);
      const c = new ml.MercatorCoordinate(lerp(a.x, b.x, u), lerp(a.y, b.y, u)).toLngLat();
      const s = smoother(clamp((t - 0.25) / 0.65, 0, 1));
      const turn = ((bAt(Math.min(1, t + 0.01)) - bAt(Math.max(0, t - 0.01))) / 0.02) * (1000 / ms);
      this.map.jumpTo({
        center: [c.lng, c.lat],
        zoom: zAt(t),
        pitch: pAt(t),
        bearing: bAt(t),
        roll: -clamp(turn * 0.07, -3.5, 3.5),
        elevation: lerp(eFrom, eTo, u),
        padding: lerpPad(from.padding, to.padding, smoother(t)),
      });
      this.sunGlow(t > R2 ? smoother((t - R2) / (1 - R2)) : 0, true);
      const p = along(Math.min(1, t + 0.09));
      this.trailAt(p, Math.sin(Math.PI * Math.min(1, t * 1.1)));
      const co = smoother(clamp((t - 0.05) / 0.08, 0, 1)) * smoother(clamp((0.97 - t) / 0.08, 0, 1));
      this.cometAt(this.routeAt(trip, p), co);
      if (!moved && t > 0.45) {
        moved = true;
        this.placeTrekker(place, to);
      }
      if (s >= 1 && this.grade) this.applyGrade(place.ll);
      if (t < 1) this.raf = requestAnimationFrame(step);
      else {
        this.raf = 0;
        this.trip = null;
        trip.done = true;
        trip.finish(false);
        this.settle();
        this.land(place, to);
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  private placeTrekker(place: Place, to: Cam) {
    const t = this.trek;
    if (!t) return;
    t.setPlace(place.ll, to.zoom, { face: to.bearing });
    t.show(true);
  }

  /**
   * Low-sun glow over the horizon while descending into a place: placed toward the sun's azimuth relative to the camera
   * and strongest when the sun is low and in front of it. `live` drives it per frame; otherwise it eases to a resting level.
   */
  private sunGlow(k: number, live: boolean) {
    const el = this.sunEl, map = this.map, g = this.grade;
    if (!el || !map || !g) return;
    const rel = shortest(map.getBearing(), g.light.az);
    const front = Math.max(0, Math.cos(rel * RAD));
    const low = clamp(1 - (g.alt - 4) / 40, 0.25, 1);
    const o = k * front * low * clamp((map.getPitch() - 50) / 20, 0, 1);
    el.style.setProperty("--sx", `${(50 + clamp(rel / 45, -1.2, 1.2) * 50).toFixed(1)}%`);
    el.style.transition = live ? "none" : "opacity 3.2s ease";
    el.style.opacity = o.toFixed(3);
  }

  /** After landing: grade for the place, then the hiker strolls and the camera drifts in a slow orbit. */
  private land(place: Place, to: Cam | null, interrupted = false) {
    this.applyGrade(place.ll);
    this.sunGlow(0.45, false);
    const t = this.trek;
    if (t && to && t.location !== place.ll) this.placeTrekker(place, to);
    window.clearTimeout(this.landTimer);
    if (interrupted) t?.walk(true);
    if (this.reduced || interrupted) return;
    this.landTimer = window.setTimeout(() => {
      if (this.dead || this.raf || this.activeId !== place.id) return;
      this.trek?.walk(true);
      this.startOrbit();
    }, 2600);
  }

  /** Cinematic framing on wide screens: the subject sits in the lower third, leaving the horizon and sky above it. */
  private compose(p: Pad): Pad {
    return this.w >= 760 ? { ...p, top: p.top + Math.round((this.h - p.top - p.bottom) * 0.24) } : p;
  }

  setFramePad(p: Pad) {
    this.framePad = p;
  }

  flyToPlace(p: Place, padding: Pad) {
    const map = this.map;
    if (!map) return;
    const cam = p.camera ?? { zoom: 12, pitch: 60, bearing: 0 };
    const pitch = clamp(cam.pitch + 8, 60, 78);
    const guess = map.queryTerrainElevation(p.ll) ?? (p.altitude ? p.altitude * EXAG : map.getCenterElevation());
    this.travel({ center: p.ll, zoom: cam.zoom, pitch, bearing: cam.bearing, elevation: guess, padding: this.compose(padding) }, p);
  }

  seeWorld(padding: Pad) {
    this.trek?.show(false);
    this.animate({ ...WORLD_VIEW, padding });
  }

  backToNepal(padding: Pad) {
    this.animate({ ...NEPAL_VIEW, padding });
  }

  zoomBy(d: number) {
    const map = this.map;
    if (!map) return;
    this.interrupt();
    if (!map.getCenterClampedToGround()) this.settle();
    map.easeTo({ zoom: map.getZoom() + d, duration: this.reduced ? 0 : 520, easing: easeOut, freezeElevation: true });
  }

  resetNorth() {
    const map = this.map;
    if (!map) return;
    this.interrupt();
    if (!map.getCenterClampedToGround()) this.settle();
    map.easeTo({ bearing: 0, pitch: map.getZoom() < 5 ? 0 : map.getPitch(), duration: this.reduced ? 0 : 700, easing: easeOut, freezeElevation: true });
  }

  /** The opening flight: from behind the hiker in the Terai, north along the drawn trail, landing on him below the Himalaya. */
  playFlight() {
    const map = this.map, ml = this.ml;
    if (!map || !ml || this.dead) return;
    const f0 = FLIGHT[0], last = FLIGHT[FLIGHT.length - 1];
    const pad = this.compose(this.framePad);
    const toCam = (f: CamFrame): Cam => ({ center: f.c, zoom: f.z, pitch: f.p, bearing: f.b, elevation: f.e, padding: pad });
    if (this.reduced) {
      this.animate(toCam(last));
      this.trek?.setPlace(last.c, last.z, { face: last.b });
      return;
    }
    const cur = this.current();
    const near =
      Math.abs(cur.center[0] - f0.c[0]) + Math.abs(cur.center[1] - f0.c[1]) < 0.002 && Math.abs(cur.zoom - f0.z) < 0.05 && Math.abs(cur.pitch - f0.p) < 0.5 &&
      Math.abs(cur.padding.top - pad.top) + Math.abs(cur.padding.left - pad.left) + Math.abs(cur.padding.bottom - pad.bottom) < 1;
    const run = () => {
      if (!this.map) return;
      this.halt();
      this.flying = true;
      this.hooks.onFlight(true);
      this.applyGrade(f0.c);
      const trek = this.trek;
      trek?.setPlace(f0.c, f0.z, { line: f0.b, walk: true });
      trek?.show(true, true);
      const route: LL[] = [];
      for (let i = 0; i <= 140; i++) route.push(sampleFlight(FLIGHT, i / 140).c as LL);
      this.setTrail(route);
      this.trailAt(0, 0);
      let moved = false;
      const trip = this.newTrip(route, () => {
        this.cometAt(null, 0);
        this.trailAt(1, 0);
        if (!moved) {
          trek?.setPlace(last.c, last.z, { face: last.b });
          trek?.show(true);
        }
      });
      this.trip = trip;
      const t0 = performance.now();
      let stage = -1;
      const step = (now: number) => {
        if (!this.flying || !this.map || this.trip !== trip) return;
        const t = Math.min(Math.max((now - t0) / FLIGHT_MS, 0), 1);
        const s = easeInOut(t);
        const st = FLIGHT_STAGE[Math.min(Math.round(s * (FLIGHT.length - 1)), FLIGHT.length - 1)];
        if (st !== stage) this.hooks.onStage((stage = st));
        const f = sampleFlight(FLIGHT, s);
        this.map.jumpTo({ center: f.c, zoom: f.z, pitch: f.p, bearing: f.b, elevation: f.e, padding: pad });
        const p = Math.min(1, easeInOut(Math.min(1, t + 0.06)));
        this.trailAt(p, Math.sin(Math.PI * Math.min(1, t * 1.05)) * smoother(clamp((t - 0.08) / 0.1, 0, 1)));
        const co = smoother(clamp((t - 0.12) / 0.08, 0, 1)) * smoother(clamp((0.95 - t) / 0.06, 0, 1));
        this.cometAt(this.routeAt(trip, p), co);
        if (!moved && t > 0.5) {
          moved = true;
          trek?.setPlace(last.c, last.z, { face: last.b });
          trek?.show(true);
        }
        if (t < 1) this.raf = requestAnimationFrame(step);
        else {
          this.raf = 0;
          this.trip = null;
          trip.done = true;
          trip.finish(false);
          this.flying = false;
          this.settle();
          this.hooks.onFlight(false);
          this.landTimer = window.setTimeout(() => {
            if (this.dead || this.raf) return;
            this.trek?.walk(true);
            this.startOrbit();
          }, 3200);
        }
      };
      this.raf = requestAnimationFrame(step);
    };
    if (near) run();
    else this.animate(toCam(f0), run);
  }

  stopFlight() {
    if (!this.raf) return;
    this.stopCamera(true);
    this.settle();
  }

  private scheduleRotate() {
    if (this.rotateRaf || this.orbitRaf || this.raf) return;
    window.clearTimeout(this.idleTimer);
    const map = this.map;
    if (this.reduced || !this.active || !map) return;
    const z = map.getZoom();
    if (z < 3) this.idleTimer = window.setTimeout(() => this.startRotate(), 3000);
    else if (z >= 9 && this.activeId) this.idleTimer = window.setTimeout(() => this.startOrbit(), 6000);
  }

  private startRotate() {
    const map = this.map;
    if (!map || this.dead || !this.active || this.reduced || this.raf || map.isMoving() || map.getZoom() >= 3) return;
    let last = performance.now();
    const step = (now: number) => {
      if (!this.map || !this.rotateRaf) return;
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const c = this.map.getCenter();
      this.map.setCenter([c.lng + ROTATE_DEG_S * dt, c.lat]);
      this.rotateRaf = requestAnimationFrame(step);
    };
    this.rotateRaf = requestAnimationFrame(step);
  }

  private stopRotate() {
    window.clearTimeout(this.idleTimer);
    if (this.rotateRaf) cancelAnimationFrame(this.rotateRaf);
    this.rotateRaf = 0;
  }

  /** Slow ambient drift around the place: a bearing orbit that eases in, with a faint breathing of pitch. */
  private startOrbit() {
    const map = this.map;
    if (!map || this.dead || !this.active || this.reduced || this.raf || this.orbitRaf || map.getZoom() < 8) return;
    this.stopRotate();
    if (!map.getCenterClampedToGround()) map.setCenterClampedToGround(true);
    this.prefetchAround();
    const t0 = performance.now(), p0 = map.getPitch();
    let last = t0;
    const step = (now: number) => {
      if (!this.map || !this.orbitRaf) return;
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const k = smoother(Math.min(1, (now - t0) / 2500));
      const breath = Math.sin((now - t0) / 5200) * 1.2 * k;
      this.map.jumpTo({ bearing: this.map.getBearing() + ORBIT_DEG_S * dt * k, pitch: clamp(p0 + breath, 0, 85) });
      this.orbitRaf = requestAnimationFrame(step);
    };
    this.orbitRaf = requestAnimationFrame(step);
  }

  private stopOrbit() {
    if (this.orbitRaf) cancelAnimationFrame(this.orbitRaf);
    this.orbitRaf = 0;
  }

  setActiveView(on: boolean) {
    this.active = on;
    this.trek?.pause(!on);
    if (!on) {
      window.clearTimeout(this.autoTimer);
      window.clearTimeout(this.landTimer);
      if (this.raf) {
        this.stopCamera(true);
        this.settle();
      }
      this.stopRotate();
      this.stopOrbit();
      this.map?.stop();
    } else if (this.map) {
      this.map.resize();
      this.scheduleRotate();
    }
  }

  destroy() {
    this.dead = true;
    window.clearTimeout(this.warmTimer);
    window.clearTimeout(this.landTimer);
    this.warmCtl?.abort();
    this.destCtl?.abort();
    this.stopCamera();
    this.stopRotate();
    this.stopOrbit();
    this.offs.forEach((f) => f());
    this.layer?.remove();
    this.markers.clear();
    this.map?.remove();
    this.map = undefined;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
