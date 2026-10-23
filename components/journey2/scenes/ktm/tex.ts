import * as THREE from "three";

/* Procedural canvas textures for the Kathmandu scenes. Each scene owns a TexBank and disposes it on leave. */

export function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function cv(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

export class TexBank {
  private list: THREE.Texture[] = [];
  constructor(private renderer?: THREE.WebGLRenderer) {}

  make(c: HTMLCanvasElement, srgb = true, repeat = true) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, this.renderer?.capabilities.getMaxAnisotropy() ?? 4);
    this.list.push(t);
    return t;
  }

  canvas(w: number, h: number, draw: Draw, srgb = true, repeat = true) {
    const c = cv(w, h); draw(c.getContext("2d")!, w, h); return this.make(c, srgb, repeat);
  }

  /* grey height canvas → tangent-space normal map */
  normal(w: number, h: number, draw: Draw, strength = 2) {
    const c = cv(w, h), g = c.getContext("2d")!; draw(g, w, h);
    const src = g.getImageData(0, 0, w, h).data, o = cv(w, h), og = o.getContext("2d")!, id = og.createImageData(w, h), d = id.data;
    const H = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    og.putImageData(id, 0, 0);
    return this.make(o, false);
  }

  dispose() { for (const t of this.list) t.dispose(); this.list.length = 0; }
}

/* ---------- painters ---------- */

export function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, cols: string[], size = 1.5) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { g.fillStyle = cols[(r() * cols.length) | 0]; const s = size * (0.5 + r()); g.fillRect(r() * w, r() * h, s, s); }
}

export function blotches(g: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, col: string, rMax: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = rMax * (0.3 + r() * 0.7);
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2);
    }
  }
}

export function streaks(g: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, col: string) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h * 0.5, len = h * (0.1 + r() * 0.4), ww = 2 + r() * 8;
    const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x, y, ww, len);
  }
}

export const P = {
  plaster(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = "#e9e7e2"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 26, 3, "rgba(150,140,120,0.10)", w * 0.22);
    blotches(g, w, h, 40, 5, "rgba(255,255,255,0.12)", w * 0.12);
    streaks(g, w, h, 18, 7, "rgba(90,85,75,0.10)");
    speckle(g, w, h, 5000, 9, ["rgba(0,0,0,0.05)", "rgba(255,255,255,0.08)"], 1.4);
  },
  concrete(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = "#9c9a95"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 30, 11, "rgba(60,58,52,0.14)", w * 0.2);
    speckle(g, w, h, 9000, 13, ["rgba(0,0,0,0.12)", "rgba(255,255,255,0.10)"], 1.6);
  },
  asphalt(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = "#3a3b3d"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 24, 17, "rgba(10,10,12,0.25)", w * 0.18);
    blotches(g, w, h, 10, 19, "rgba(120,110,95,0.10)", w * 0.25);
    speckle(g, w, h, 16000, 23, ["rgba(0,0,0,0.25)", "rgba(200,200,200,0.12)"], 1.3);
  },
  pavers(g: CanvasRenderingContext2D, w: number, h: number) {
    const r = rng(29); g.fillStyle = "#4b4a47"; g.fillRect(0, 0, w, h);
    const bw = w / 8, bh = h / 16;
    for (let y = 0; y < 16; y++) for (let x = -1; x < 9; x++) {
      const ox = (y % 2) * bw * 0.5, v = 120 + r() * 30;
      g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(x * bw + ox + 1.5, y * bh + 1.5, bw - 3, bh - 3);
    }
    blotches(g, w, h, 20, 31, "rgba(30,28,24,0.18)", w * 0.15);
    speckle(g, w, h, 6000, 37, ["rgba(0,0,0,0.12)", "rgba(255,255,255,0.08)"], 1.2);
  },
  brick(g: CanvasRenderingContext2D, w: number, h: number) {
    const r = rng(41); g.fillStyle = "#3b2119"; g.fillRect(0, 0, w, h);
    const rows = 32, cols = 8, bh = h / rows, bw = w / cols;
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) {
      const ox = (y % 2) * bw * 0.5, k = r();
      g.fillStyle = `rgb(${128 + k * 34 | 0},${78 + k * 22 | 0},${60 + k * 16 | 0})`;
      g.fillRect(x * bw + ox + 1, y * bh + 1, bw - 2, bh - 2);
    }
    blotches(g, w, h, 18, 43, "rgba(20,10,5,0.22)", w * 0.2);
    speckle(g, w, h, 6000, 47, ["rgba(0,0,0,0.15)", "rgba(255,200,170,0.07)"], 1.3);
  },
  brickH(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#222";
    const rows = 32, cols = 8, bh = h / rows, bw = w / cols;
    for (let y = 0; y < rows; y++) { g.fillRect(0, y * bh, w, 1.6); for (let x = -1; x < cols + 1; x++) g.fillRect(x * bw + (y % 2) * bw * 0.5, y * bh, 1.6, bh); }
  },
  herringbone(g: CanvasRenderingContext2D, w: number, h: number) {
    const r = rng(53); g.fillStyle = "#3a2018"; g.fillRect(0, 0, w, h);
    const s = w / 16;
    for (let y = -2; y < 34; y++) for (let x = -2; x < 18; x++) {
      const k = r(); g.fillStyle = `rgb(${122 + k * 34 | 0},${80 + k * 22 | 0},${62 + k * 16 | 0})`;
      if ((x + y) % 2 === 0) g.fillRect(x * s + 1, y * s * 0.5 + 1, s * 2 - 2, s * 0.5 - 2);
      else g.fillRect(x * s + 1, y * s * 0.5 + 1, s * 0.5 - 2, s * 2 - 2);
    }
    blotches(g, w, h, 20, 59, "rgba(10,6,4,0.25)", w * 0.18);
    speckle(g, w, h, 5000, 61, ["rgba(0,0,0,0.15)", "rgba(255,220,200,0.06)"], 1.3);
  },
  grass(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = "#2c3a1f"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 30, 67, "rgba(70,90,40,0.25)", w * 0.15);
    blotches(g, w, h, 20, 71, "rgba(15,20,8,0.3)", w * 0.12);
    const r = rng(73);
    for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, l = 2 + r() * 5; g.strokeStyle = r() < 0.5 ? "rgba(90,120,50,0.35)" : "rgba(20,30,10,0.35)"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - l); g.stroke(); }
  },
  roofTiles(g: CanvasRenderingContext2D, w: number, h: number) {
    const r = rng(79); g.fillStyle = "#3c1f15"; g.fillRect(0, 0, w, h);
    const rows = 24, cols = 16, th = h / rows, tw = w / cols;
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) {
      const k = r(), ox = (y % 2) * tw * 0.5, gr = g.createLinearGradient(0, y * th, 0, y * th + th);
      gr.addColorStop(0, `rgb(${110 + k * 30 | 0},${52 + k * 14 | 0},${34 + k * 8 | 0})`); gr.addColorStop(1, `rgb(${70 + k * 20 | 0},${32 + k * 8 | 0},${22 | 0})`);
      g.fillStyle = gr; g.beginPath(); g.ellipse(x * tw + ox + tw / 2, y * th + th * 0.55, tw * 0.46, th * 0.6, 0, 0, Math.PI); g.fill();
    }
    blotches(g, w, h, 16, 83, "rgba(20,30,10,0.18)", w * 0.2);
  },
  metalRoof(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = "#808080"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += w / 32) { g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x, 0, 2, h); g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(x + 3, 0, 2, h); }
    blotches(g, w, h, 12, 89, "rgba(60,40,20,0.15)", w * 0.2);
  },
  wood(g: CanvasRenderingContext2D, w: number, h: number) {
    const r = rng(97); g.fillStyle = "#3a2214"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const y = r() * h; g.strokeStyle = `rgba(${r() < 0.5 ? "20,10,5" : "90,55,30"},${0.2 + r() * 0.3})`; g.lineWidth = 0.5 + r() * 2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3); g.stroke(); }
  },
  stoneDark(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = "#3d3b37"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 30, 101, "rgba(10,10,8,0.3)", w * 0.14);
    blotches(g, w, h, 20, 103, "rgba(120,115,100,0.12)", w * 0.12);
    speckle(g, w, h, 12000, 107, ["rgba(0,0,0,0.2)", "rgba(200,190,170,0.1)"], 1.4);
  },
  tile(g: CanvasRenderingContext2D, w: number, h: number) {
    const r = rng(109); g.fillStyle = "#77736c"; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = 196 + r() * 14; g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(x * s + 1.5, y * s + 1.5, s - 3, s - 3); }
    blotches(g, w, h, 14, 113, "rgba(255,255,255,0.1)", w * 0.2);
    speckle(g, w, h, 3000, 127, ["rgba(0,0,0,0.06)"], 1.2);
  },
  carpet(g: CanvasRenderingContext2D, w: number, h: number) {
    g.fillStyle = "#1f3f73"; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const cx = x * s + s / 2, cy = y * s + s / 2;
      g.strokeStyle = "#c9b37a"; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, s * 0.38, s * 0.26, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "#8fb0d8"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, s * 0.28, s * 0.18, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#2e5a9a"; g.beginPath(); g.ellipse(cx, cy, s * 0.16, s * 0.1, 0, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.fillStyle = "#c9b37a"; g.fillRect(cx + Math.cos(a) * s * 0.45 - 2, cy + Math.sin(a) * s * 0.45 - 2, 4, 4); }
    }
    g.strokeStyle = "rgba(201,179,122,0.6)"; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    speckle(g, w, h, 8000, 131, ["rgba(0,0,0,0.12)", "rgba(255,255,255,0.05)"], 1.2);
  },
  drape(g: CanvasRenderingContext2D, w: number, h: number) {
    const gr = g.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 16; i++) gr.addColorStop(i / 16, i % 2 ? "#141418" : "#2a2a30");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  },
};

/* facade with a grid of windows: map (wall + dark glass) and emissiveMap (lit rooms) */
export function facadeTextures(bank: TexBank, o: { bays: number; floors: number; seed: number; lit: number; winW?: number; winH?: number; sill?: number; frame?: string; warm?: string[]; px?: number; mullions?: boolean }) {
  const px = o.px ?? 64, W = o.bays * px, H = o.floors * px, r = rng(o.seed), ww = o.winW ?? 0.55, wh = o.winH ?? 0.5, sill = o.sill ?? 0.28;
  const warm = o.warm ?? ["#ffd8a0", "#ffe6b8", "#ffc985", "#e8f0ff", "#ffefd0"];
  const lit: boolean[] = [], tone: string[] = [], shade: number[] = [];
  for (let i = 0; i < o.bays * o.floors; i++) { lit.push(r() < o.lit); tone.push(warm[(r() * warm.length) | 0]); shade.push(r()); }
  const map = bank.canvas(W, H, (g) => {
    P.plaster(g, W, H);
    for (let f = 0; f < o.floors; f++) for (let b = 0; b < o.bays; b++) {
      const x = b * px + px * (1 - ww) / 2, y = H - (f * px + px * sill + px * wh), w = px * ww, h = px * wh;
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x - 3, y + h, w + 6, 3);
      g.fillStyle = o.frame ?? "#2a2a2c"; g.fillRect(x - 2, y - 2, w + 4, h + 4);
      g.fillStyle = lit[f * o.bays + b] ? "#6a5a48" : "#14181e"; g.fillRect(x, y, w, h);
      if (o.mullions !== false) { g.fillStyle = o.frame ?? "#2a2a2c"; g.fillRect(x + w / 2 - 1, y, 2, h); }
    }
  });
  const emissive = bank.canvas(W, H, (g) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    for (let f = 0; f < o.floors; f++) for (let b = 0; b < o.bays; b++) {
      const i = f * o.bays + b; if (!lit[i]) continue;
      const x = b * px + px * (1 - ww) / 2, y = H - (f * px + px * sill + px * wh), w = px * ww, h = px * wh;
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, tone[i]); gr.addColorStop(1, "#000");
      g.globalAlpha = 0.55 + shade[i] * 0.45; g.fillStyle = gr; g.fillRect(x, y, w, h);
      if (shade[i] < 0.4) { g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(x, y, w * (0.3 + shade[i]), h); }
      g.globalAlpha = 1; g.fillStyle = "#000"; if (o.mullions !== false) g.fillRect(x + w / 2 - 1, y, 2, h);
    }
  });
  return { map, emissive };
}

/* ---------- text / signage atlas ---------- */

export interface UVRect { u0: number; v0: number; u1: number; v1: number }

export class Atlas {
  canvas: HTMLCanvasElement; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture;
  private x = 0; private y = 0; private row = 0;
  constructor(bank: TexBank, public W = 2048, public H = 2048) {
    this.canvas = cv(W, H); this.g = this.canvas.getContext("2d")!;
    this.g.fillStyle = "#000"; this.g.fillRect(0, 0, W, H);
    this.tex = bank.make(this.canvas, true, false) as THREE.CanvasTexture;
  }
  put(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): UVRect {
    if (this.x + w > this.W) { this.x = 0; this.y += this.row + 4; this.row = 0; }
    const x = this.x, y = this.y; this.x += w + 4; this.row = Math.max(this.row, h);
    if (y + h > this.H) throw new Error("atlas full");
    const g = this.g; g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, w, h); g.clip(); draw(g, w, h); g.restore();
    this.tex.needsUpdate = true;
    return { u0: (x + 0.5) / this.W, v0: 1 - (y + h - 0.5) / this.H, u1: (x + w - 0.5) / this.W, v1: 1 - (y + 0.5) / this.H };
  }
}

export function fitText(g: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, font: (px: number) => string, px: number, align: CanvasTextAlign = "center") {
  let p = px; g.font = font(p);
  while (g.measureText(s).width > maxW && p > 6) { p -= 1; g.font = font(p); }
  g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
  return p;
}

export const SANS = (px: number) => `700 ${px}px "Helvetica Neue", Arial, sans-serif`;
export const SANS_R = (px: number) => `500 ${px}px "Helvetica Neue", Arial, sans-serif`;
export const SERIF = (px: number) => `700 ${px}px Georgia, "Times New Roman", serif`;

export function radialTex(bank: TexBank, inner = "rgba(255,255,255,1)") {
  return bank.canvas(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, false, false);
}
