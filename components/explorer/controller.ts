import type { Map as MLMap, StyleSpecification, GeoJSONSource, GeoJSONSourceSpecification } from "maplibre-gl";
import { HOME_LL, KIND_LABEL, NEPAL_ISO, type Place } from "@/lib/data/places";
import { greatCircle, sampleFlight, easeInOut, type CamFrame } from "./geo";
import { kindSvg } from "./icons";

type ML = typeof import("maplibre-gl");
type Data = GeoJSONSourceSpecification["data"];
export type Pad = { top: number; right: number; bottom: number; left: number };

export interface Cam {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  elevation: number;
  padding: Pad;
}

const IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const GOLD = "#f4b961";
const EMPTY: Data = { type: "FeatureCollection", features: [] };
const EXAG = 1.5;
const FOV = 32;
const TERRAIN_ON = 5;
const TERRAIN_OFF = 4.6;
const NO_PAD: Pad = { top: 0, right: 0, bottom: 0, left: 0 };

/** Terai (Sarlahi) → Chure → Mahabharat → Kathmandu valley → facing the high Himalaya. Fixed centre elevations (e) keep the camera path smooth over ridges */
export const FLIGHT: CamFrame[] = [
  { c: [85.5, 27.1], z: 12.5, p: 81, b: 4, e: 196 },
  { c: [85.4823, 27.2896], z: 12.172, p: 81, b: 3, e: 600 },
  { c: [85.4567, 27.5212], z: 11.794, p: 81, b: 5, e: 1100 },
  { c: [85.4265, 27.7671], z: 11.387, p: 81.5, b: 8, e: 1500 },
  { c: [85.35, 27.73], z: 12, p: 80, b: 12, e: 1950 },
];
export const FLIGHT_STAGES = ["Terai plains · Sarlahi", "Chure hills", "Mahabharat range", "Kathmandu valley", "The high Himalaya"];
const FLIGHT_MS = 14000;
const NEPAL_VIEW = { center: [84.55, 27.95] as [number, number], zoom: 7.05, pitch: 50, bearing: 0, elevation: 1500 };
const WORLD_VIEW = { center: [86, 20] as [number, number], zoom: 2, pitch: 0, bearing: 0, elevation: 0 };
const ROTATE_DEG_S = 2.2;

export interface ExplorerHooks {
  onSelect: (id: string) => void;
  onReady: () => void;
  onFail: () => void;
  onFlight: (flying: boolean) => void;
  onGlobe: () => void;
  onBearing: (deg: number) => void;
  onStage: (i: number) => void;
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
  const z = 12, n = 2 ** z, R = Math.PI / 180;
  const fx = ((lng + 180) / 360) * n;
  const fy = ((1 - Math.log(Math.tan(lat * R) + 1 / Math.cos(lat * R)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const key = `${tx}/${ty}/${Math.floor((fx - tx) * 256)}/${Math.floor((fy - ty) * 256)}`;
  let hit = demCache.get(key);
  if (!hit) {
    hit = fetch(TERRARIUM.replace("{z}", String(z)).replace("{x}", String(tx)).replace("{y}", String(ty)))
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
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const lerpPad = (a: Pad, b: Pad, t: number): Pad => ({
  top: lerp(a.top, b.top, t),
  right: lerp(a.right, b.right, t),
  bottom: lerp(a.bottom, b.bottom, t),
  left: lerp(a.left, b.left, t),
});

function buildStyle(): StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "sky-color": "#5f8fc7",
      "horizon-color": "#d7e3ee",
      "fog-color": "#b7c8d8",
      "sky-horizon-blend": 0.55,
      "horizon-fog-blend": 0.45,
      "fog-ground-blend": 0.92,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
    },
    sources: {
      imagery: { type: "raster", tiles: [IMAGERY], tileSize: 256, maxzoom: 18 },
      dem: { type: "raster-dem", tiles: [TERRARIUM], encoding: "terrarium", tileSize: 256, maxzoom: 15 },
      borders: { type: "geojson", data: EMPTY },
      visited: { type: "geojson", data: EMPTY },
      arcs: { type: "geojson", data: EMPTY, lineMetrics: true },
    },
    layers: [
      { id: "imagery", type: "raster", source: "imagery", paint: { "raster-fade-duration": 180, "raster-saturation": -0.08, "raster-contrast": 0.04 } },
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
          "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, "rgba(244,185,97,0.35)", 0.45, GOLD, 1, "#fff1d6"],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 1, 4.5, 0.85, 6, 0],
        },
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
  private idleTimer = 0;
  private layer?: HTMLDivElement;
  private sky?: HTMLElement | null;
  private glowEl?: HTMLElement | null;
  private skyO = -1;
  private glowO = -1;
  private w = 0;
  private h = 0;
  private globeSeen = false;
  private flying = false;
  private anim: Anim | null = null;
  private terrainOn = true;
  private autoTimer = 0;
  private offs: Array<() => void> = [];

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
        maxTileCacheZoomLevels: 5,
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
    const size = () => {
      this.w = this.container.clientWidth;
      this.h = this.container.clientHeight;
    };
    size();
    map.on("resize", size);
    map.on("rotate", () => this.hooks.onBearing(map.getBearing()));
    map.on("render", () => this.frame());
    map.on("zoom", () => {
      this.capPitch();
      this.syncTerrain();
      if (!this.globeSeen && map.getZoom() < 5) {
        this.globeSeen = true;
        this.hooks.onGlobe();
      }
    });
    map.on("movestart", (e) => {
      if ((e as { originalEvent?: Event }).originalEvent && !map.getCenterClampedToGround() && this.terrainOn) map.setCenterClampedToGround(true);
    });
    map.on("moveend", () => this.scheduleRotate());
    map.once("load", () => {
      if (this.dead) return;
      this.addMarkers();
      void this.loadWorld();
      let started = false;
      const begin = () => {
        if (started || this.dead) return;
        started = true;
        this.hooks.onReady();
        if (this.reduced) {
          this.settle();
          return this.hooks.onFlight(false);
        }
        this.autoTimer = window.setTimeout(() => this.active && !this.dead && this.playFlight(), 2200);
      };
      map.once("idle", begin);
      window.setTimeout(begin, 7000);
    });
  }

  private bindInput() {
    const stop = () => {
      window.clearTimeout(this.autoTimer);
      if (this.raf) {
        this.stopCamera();
        this.settle();
      }
      this.stopRotate();
      this.scheduleRotate();
    };
    const evs = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
    evs.forEach((ev) => this.container.addEventListener(ev, stop, { passive: true }));
    this.offs.push(() => evs.forEach((ev) => this.container.removeEventListener(ev, stop)));
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
    this.setActive(this.activeId);
  }

  /** Per rendered frame: place markers, declutter, sky and globe glow. Pure math plus changed-only style writes; never reads layout. */
  private frame() {
    const map = this.map, ml = this.ml;
    if (!map || !ml) return;
    const z = map.getZoom(), pitch = map.getPitch();
    const sky = Math.round(Math.min(Math.max((z - 6.5) / 3, 0), 1) * 100) / 100;
    if (sky !== this.skyO && this.sky) this.sky.style.opacity = String((this.skyO = sky));
    const glow = Math.round(Math.min(Math.max((5.2 - z) / 1.4, 0), 1) * 100) / 100;
    if (this.glowEl) {
      if (glow !== this.glowO) this.glowEl.style.opacity = String((this.glowO = glow));
      if (glow > 0) {
        const c = map.getCenter(), R = Math.PI / 180, d = 88 * R, f1 = c.lat * R;
        const lat2 = Math.asin(Math.sin(f1) * Math.cos(d));
        const lng2 = c.lng + Math.atan2(Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(lat2)) / R;
        const a = map.project(c), b = map.project([lng2, lat2 / R]);
        const r = Math.hypot(b.x - a.x, b.y - a.y);
        this.glowEl.style.transform = `translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0) scale(${((r * 2.5) / 1000).toFixed(4)})`;
      }
    }
    if (!this.markers.size) return;
    const tr = map.transform;
    let behind: ((ll: [number, number]) => boolean) | null = null;
    if (pitch > 30) {
      const c = ml.MercatorCoordinate.fromLngLat(map.getCenter());
      const b = (map.getBearing() * Math.PI) / 180;
      const fx = Math.sin(b), fy = -Math.cos(b);
      const reach = ((0.5 / Math.tan((FOV * Math.PI) / 360)) * this.h * Math.sin((pitch * Math.PI) / 180)) / (512 * 2 ** z);
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

  private stopCamera() {
    window.clearTimeout(this.autoTimer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.anim = null;
    if (this.flying) {
      this.flying = false;
      this.hooks.onFlight(false);
    }
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
    this.stopCamera();
    this.stopRotate();
    map.stop();
    map.setMaxPitch(85);
    map.setCenterClampedToGround(false);
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
    const db = ((to.bearing - from.bearing + 540) % 360) - 180;
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

  private retarget(anim: Anim, elevation: number) {
    if (this.anim !== anim || anim.s >= 0.98) return;
    anim.eStart = (anim.e - elevation * anim.s) / (1 - anim.s);
    anim.to = { ...anim.to, elevation };
  }

  flyToPlace(p: Place, padding: Pad) {
    const map = this.map;
    if (!map) return;
    const cam = p.camera ?? { zoom: 12, pitch: 60, bearing: 0 };
    const guess = map.queryTerrainElevation(p.ll) ?? (p.altitude ? p.altitude * EXAG : map.getCenterElevation());
    this.animate({ center: p.ll, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing, elevation: guess, padding });
    const anim = this.anim;
    void demAt(p.ll).then((m) => anim && m != null && this.retarget(anim, m * EXAG));
  }

  seeWorld(padding: Pad) {
    this.animate({ ...WORLD_VIEW, padding });
  }

  backToNepal(padding: Pad) {
    this.animate({ ...NEPAL_VIEW, padding });
  }

  zoomBy(d: number) {
    const map = this.map;
    if (!map) return;
    this.stopCamera();
    this.stopRotate();
    if (!map.getCenterClampedToGround()) this.settle();
    map.easeTo({ zoom: map.getZoom() + d, duration: this.reduced ? 0 : 520, easing: easeOut, freezeElevation: true });
  }

  resetNorth() {
    const map = this.map;
    if (!map) return;
    this.stopCamera();
    if (!map.getCenterClampedToGround()) this.settle();
    map.easeTo({ bearing: 0, pitch: map.getZoom() < 5 ? 0 : map.getPitch(), duration: this.reduced ? 0 : 700, easing: easeOut, freezeElevation: true });
  }

  playFlight() {
    const map = this.map;
    if (!map || this.dead) return;
    const f0 = FLIGHT[0], last = FLIGHT[FLIGHT.length - 1];
    const toCam = (f: CamFrame): Cam => ({ center: f.c, zoom: f.z, pitch: f.p, bearing: f.b, elevation: f.e, padding: NO_PAD });
    if (this.reduced) return this.animate(toCam(last));
    const cur = this.current();
    const near = Math.abs(cur.center[0] - f0.c[0]) + Math.abs(cur.center[1] - f0.c[1]) < 0.002 && Math.abs(cur.zoom - f0.z) < 0.02 && Math.abs(cur.pitch - f0.p) < 0.5;
    const run = () => {
      if (!this.map) return;
      this.stopCamera();
      this.stopRotate();
      this.map.setMaxPitch(85);
      this.map.setCenterClampedToGround(false);
      this.flying = true;
      this.hooks.onFlight(true);
      const t0 = performance.now();
      let stage = -1;
      const step = (now: number) => {
        if (!this.flying || !this.map) return;
        const t = Math.min(Math.max((now - t0) / FLIGHT_MS, 0), 1);
        const s = easeInOut(t);
        const st = Math.min(Math.round(s * (FLIGHT.length - 1)), FLIGHT.length - 1);
        if (st !== stage) this.hooks.onStage((stage = st));
        const f = sampleFlight(FLIGHT, s);
        this.map.jumpTo({ center: f.c, zoom: f.z, pitch: f.p, bearing: f.b, elevation: f.e, padding: NO_PAD });
        if (t < 1) this.raf = requestAnimationFrame(step);
        else {
          this.raf = 0;
          this.flying = false;
          this.settle();
          this.hooks.onFlight(false);
        }
      };
      this.raf = requestAnimationFrame(step);
    };
    if (near) run();
    else this.animate(toCam(f0), run);
  }

  stopFlight() {
    if (!this.raf) return;
    this.stopCamera();
    this.settle();
  }

  private scheduleRotate() {
    if (this.rotateRaf || this.raf) return;
    window.clearTimeout(this.idleTimer);
    if (this.reduced || !this.active || !this.map || this.map.getZoom() >= 3) return;
    this.idleTimer = window.setTimeout(() => this.startRotate(), 3000);
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

  setActiveView(on: boolean) {
    this.active = on;
    if (!on) {
      window.clearTimeout(this.autoTimer);
      if (this.raf) {
        this.stopCamera();
        this.settle();
      }
      this.stopRotate();
      this.map?.stop();
    } else if (this.map) {
      this.map.resize();
      this.scheduleRotate();
    }
  }

  destroy() {
    this.dead = true;
    this.stopCamera();
    this.stopRotate();
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
