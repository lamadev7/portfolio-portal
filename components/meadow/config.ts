// Everything a later art/brand pass is expected to touch lives here.

// ---------- turntable ----------
// 24 detents x 15 deg = one full turn. The index is unbounded; scene = index mod DETENTS.
export const DETENTS = 24;
export const DETENT_STEP_DEG = 360 / DETENTS;
export const CAMERA_ELEVATION_DEG = 10; // low, grazing view
export const CAMERA_DISTANCE = 60; // orthographic, so this only sets the clip range
export const VIEW_TARGET_Y = 2.35; // look-at height (shifts the island down in frame)
export const TURN_RATE = 9; // az += (target - az) * (1 - exp(-dt * TURN_RATE))
export const DRAG_PX_PER_STEP = 90;
export const SHIFT_STEPS = 6;
export const EXIT_DRIFT = 0.35; // after the pin releases the meadow moves down by this share of the exit distance (the next section slides over it)
export const EXIT_FADE = 1.8;  // ... and fades gently, over this multiple of its way out of the viewport
export const LIVE_DELAY_MS = 700; // the aria-live scene label updates once the scene has settled
export const MAX_DPR = 2;
export const FIT_PAD_X = 0.15;    // world units the frustum extends past the outermost blade roots on each side
export const FIT_PAD_BOTTOM = 0.3; // world units between the front-most blade roots and the bottom of the stage

// ---------- vignette ----------
// One camera-facing 3:2 sheet per scene. Landmarks are uv with origin bottom-left, in the fixed order:
// man head, man chest, man hips/seat, cat head, cat body.
export const SCENES_URL = "/meadow/scenes.json";
export const ART_DIR = "/meadow/scenes/";
export const VIGNETTE_WIDTH = 9.8; // world units across the full 3:2 sheet
export const VIGNETTE_OFFSET = 1.5; // sheet sits this far from the centre toward the camera
export const VIGNETTE_SINK = 0.08; // world units the ground line is pushed below the terrain
export const MORPH_MS = 420;
export const MORPH_RETARGET_SPEEDUP = 2.5;
export const MORPH_WAVE = 0.06; // fraction of the duration the wave takes to cross the sheet
export const MORPH_SIGMA = 0.1; // landmark falloff (fraction of sheet height)
export const MORPH_BOW = { side: 0.22, toward: 0.45 }; // world units at the peak of the transition
export const NIGHT_DIM = 0.64; // vignette brightness x (1 - NIGHT_DIM * night)
export const PRELOAD_RADIUS = 2; // scenes kept warm on each side of the current one
export const TEXTURE_CACHE = 9;

// ---------- grass ----------
export const SEED = 20261024;
export const BLADE_BUDGET = 215000; // approx total instances (blades + chips + stems)
export const GRASS_HEIGHT = 0.62; // global blade height multiplier (edge chips excluded)
export const FIGURE_COVER = 0.34; // max world height front grass may reach over a figure's contact line
export const COVER_COLS = 32; // columns of the per-scene grass cover profile (must match grass.ts)

export type Variant = "day" | "dusk" | "night";
export interface Palette {
  cool: string; shade: string; dark: string; mid: string; light: string; hi: string;
  dry: string; tip: string; red: string; redLight: string; redDark: string;
  bloom: string; violet: string; haze: string; vigTint: string; night: number;
}

// Palettes are sRGB hex; shaders mix them directly, so what you see here is what renders.
export const PALETTES: Record<Variant, Palette> = {
  day: {
    cool: "#33544a", shade: "#2b3f27", dark: "#3b5530", mid: "#648c45", light: "#8daa5f", hi: "#a8bd74",
    dry: "#a3925f", tip: "#c3b585", red: "#d9461d", redLight: "#ee6a34", redDark: "#a63216",
    bloom: "#f8f5ec", violet: "#8c93db", haze: "#f6f4ee", vigTint: "#ffffff", night: 0,
  },
  dusk: {
    cool: "#4a5640", shade: "#3b3524", dark: "#555630", mid: "#787a40", light: "#9f9752", hi: "#c9b265",
    dry: "#c9a466", tip: "#e9c07f", red: "#d84e26", redLight: "#f08a48", redDark: "#8f2f1c",
    bloom: "#fbe9cf", violet: "#b48bb8", haze: "#f4ebdd", vigTint: "#f6e2ca", night: 0,
  },
  night: {
    cool: "#142a30", shade: "#0e171b", dark: "#1a2a2c", mid: "#273d3a", light: "#3c5650", hi: "#56736b",
    dry: "#5f6b66", tip: "#8a9ca2", red: "#86383a", redLight: "#ab5552", redDark: "#552427",
    bloom: "#dfe6ee", violet: "#8f8fcf", haze: "#11151a", vigTint: "#e2e8f2", night: 1,
  },
};
export const THEME_MS = 900;

// Wind (world units / seconds), fixed in world space.
export const WIND = { dirDeg: 12, speed: 2.4, base: 0.03, gust: 0.7, flutter: 0.07 };
