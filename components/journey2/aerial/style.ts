import type { StyleSpecification, LayerSpecification, ExpressionSpecification } from "maplibre-gl";
import { NIGHT } from "../contracts";
import { DEM_MAX, IMAGERY, IMG_MAX, TERRARIUM } from "./tiles";

/** Moonlit grade for the Esri imagery: dark, cool, desaturated, with contrast so snow and pale roofs stay luminous. */
export const GRADE = { "raster-brightness-max": 0.4, "raster-brightness-min": 0.006, "raster-saturation": -0.55, "raster-contrast": 0.26 } as const;

/** NASA Black Marble 2016 (VIIRS, public domain), warm lights only, alpha = radiance; z8 tiles x 183-191, y 105-109. */
const LIGHTS_BOUNDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [77.34375, 30.751277776257812],
  [90, 30.751277776257812],
  [90, 24.5271348225978],
  [77.34375, 24.5271348225978],
];

export const OFM_TILEJSON = "https://tiles.openfreemap.org/planet";
export const ATTRIBUTION = "Imagery © Esri, Maxar, Earthstar · Terrain: Mapzen/AWS Terrain Tiles · Night lights: NASA Black Marble · © OpenMapTiles © OpenStreetMap contributors";

export const SKY = {
  "sky-color": "#04081a",
  "horizon-color": "#1d2d52",
  "fog-color": "#111c37",
  "sky-horizon-blend": 0.62,
  "horizon-fog-blend": 0.82,
  "fog-ground-blend": 0.3,
  "atmosphere-blend": 0,
} as const;

const zoomed = (stops: Array<[number, unknown]>): ExpressionSpecification =>
  ["interpolate", ["linear"], ["zoom"], ...stops.flat()] as unknown as ExpressionSpecification;

export function buildStyle(): StyleSpecification {
  const raster = (id: string, fade = 0): LayerSpecification => ({ id, type: "raster", source: id, paint: { "raster-fade-duration": fade, ...GRADE } });
  return {
    version: 8,
    projection: { type: "mercator" },
    sky: { ...SKY },
    sources: {
      backdrop: { type: "raster", tiles: IMAGERY, tileSize: 1024, maxzoom: IMG_MAX - 2 },
      imagery: { type: "raster", tiles: IMAGERY, tileSize: 256, maxzoom: IMG_MAX },
      dem: { type: "raster-dem", tiles: TERRARIUM, encoding: "terrarium", tileSize: 256, maxzoom: DEM_MAX },
      lights: { type: "image", url: "/aerial/lights-np.webp", coordinates: LIGHTS_BOUNDS },
      world: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] } } },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#03050c" } },
      raster("backdrop"),
      raster("imagery", 180),
      {
        id: "moonshade",
        type: "hillshade",
        source: "dem",
        maxzoom: 13.6,
        paint: {
          "hillshade-method": "standard",
          "hillshade-illumination-direction": NIGHT.moon.azimuthDeg,
          "hillshade-illumination-anchor": "map",
          "hillshade-exaggeration": zoomed([[12.6, 0.4], [13.5, 0]]),
          "hillshade-shadow-color": "rgba(0,2,10,0.92)",
          "hillshade-highlight-color": "rgba(110,132,196,0.3)",
          "hillshade-accent-color": "rgba(4,8,22,0.6)",
        },
      },
      {
        id: "snowglow",
        type: "color-relief",
        source: "dem",
        maxzoom: 13.6,
        paint: {
          "color-relief-opacity": zoomed([[12.6, 1], [13.5, 0]]),
          "color-relief-color": ["interpolate", ["linear"], ["elevation"], 5000, "rgba(170,190,240,0)", 5700, "rgba(196,212,255,0.18)", 6800, "rgba(222,232,255,0.34)"],
        },
      },
      { id: "tint", type: "fill", source: "world", paint: { "fill-color": "#08143a", "fill-opacity": zoomed([[5, 0.5], [8, 0.38], [11, 0.34]]), "fill-antialias": false } },
      {
        id: "lights",
        type: "raster",
        source: "lights",
        paint: { "raster-fade-duration": 0, "raster-resampling": "linear", "raster-opacity": zoomed([[6, 1], [8.5, 0.85], [10.5, 0.45], [12.2, 0]]) },
      },
    ],
    terrain: { source: "dem", exaggeration: 1.2 },
  };
}

/** Street and building lights from OpenStreetMap (OpenFreeMap vector tiles), layered over the Black Marble glow. */
export function osmLayers(): LayerSpecification[] {
  const cls = ["get", "class"] as unknown as ExpressionSpecification;
  const major = ["match", cls, ["motorway", "trunk", "primary"], true, false] as unknown as ExpressionSpecification;
    return [
    {
      id: "water",
      type: "fill",
      source: "ofm",
      "source-layer": "water",
      paint: { "fill-color": "#081226", "fill-opacity": 0.62, "fill-antialias": false },
    },
    {
      id: "roads",
      type: "line",
      source: "ofm",
      "source-layer": "transportation",
      minzoom: 9,
      filter: ["match", cls, ["motorway", "trunk", "primary", "secondary", "tertiary", "minor"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["match", cls, ["motorway", "trunk", "primary"], "#ffc77d", ["secondary", "tertiary"], "#ffb062", "#ff9a4c"],
        "line-width": ["interpolate", ["exponential", 1.7], ["zoom"], 9, ["case", major, 0.9, 0.3], 13, ["case", major, 2.4, 0.9], 16, ["case", major, 7, 2.6]],
        "line-blur": zoomed([[9, 0.6], [13, 1.2], [16, 2.5]]),
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0, 10.5, ["case", major, 0.45, 0.1], 13, ["case", major, 0.7, 0.32], 16, ["case", major, 0.8, 0.45]],
      },
    },
  ];
}
