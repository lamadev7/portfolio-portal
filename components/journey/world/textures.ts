import * as THREE from 'three';

/* procedural canvas textures, built once and shared by every scene and figure */

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
const cache = new Map<string, THREE.Texture>();

export const h2 = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
export function rng(seed: number) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function finish(c: HTMLCanvasElement, color: boolean, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/* a grey height canvas → tangent-space normal map (Sobel), tiling */
function normalFrom(hc: HTMLCanvasElement, strength: number) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d')!.getImageData(0, 0, w, h).data;
  const out = canvas(w, h), og = out.getContext('2d')!, id = og.createImageData(w, h), d = id.data;
  const H = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1)) * strength;
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  og.putImageData(id, 0, 0);
  return finish(out, false);
}

const wrapDraw = (w: number, h: number, x: number, y: number, r: number, fn: (X: number, Y: number) => void) => {
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const X = x + a * w, Y = y + b * h; if (X + r < 0 || X - r > w || Y + r < 0 || Y - r > h) continue; fn(X, Y); }
};
export function blot(g: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, rgb: string, a0: number, a1: number, r0: number, r1: number) {
  for (let i = 0; i < n; i++) {
    const x = h2(i, seed) * w, y = h2(i, seed + 1) * h, r = r0 + h2(i, seed + 2) * (r1 - r0), a = a0 + h2(i, seed + 3) * (a1 - a0);
    wrapDraw(w, h, x, y, r, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2); });
  }
}
export function grain(g: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, a: number, sz = 2) {
  for (let i = 0; i < n; i++) { const v = h2(i, seed + 4) > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${(a * h2(i, seed + 3)).toFixed(3)})`; g.fillRect(h2(i, seed) * w, h2(i, seed + 1) * h, 1 + h2(i, seed + 2) * sz, 1 + h2(i, seed + 5) * sz); }
}

interface Pair { map: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture }
const pairs = new Map<string, Pair>();

/* each surface draws its albedo and, from the same strokes, a height field for the normal map */
function pair(key: string, size: number, albedo: Draw, height: Draw | null, strength = 2): Pair {
  const hit = pairs.get(key); if (hit) return hit;
  const a = canvas(size, size); albedo(a.getContext('2d')!, size, size);
  const p: Pair = { map: finish(a, true) };
  if (height) { const hc = canvas(size, size); const g = hc.getContext('2d')!; g.fillStyle = '#808080'; g.fillRect(0, 0, size, size); height(g, size, size); p.normalMap = normalFrom(hc, strength); }
  pairs.set(key, p); return p;
}

export const SURF = {
  plaster: () => pair('plaster', 512, (g, w, h) => {
    g.fillStyle = '#e9e5dc'; g.fillRect(0, 0, w, h);
    blot(g, w, h, 60, 11, '120,108,90', 0.03, 0.08, 30, 120); blot(g, w, h, 30, 17, '255,255,250', 0.04, 0.1, 30, 90); grain(g, w, h, 16000, 23, 0.05);
    for (let i = 0; i < 22; i++) { const x = h2(i, 31) * w, y = h2(i, 32) * h * 0.6, l = 40 + h2(i, 33) * 200, gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(90,80,64,0.09)'); gr.addColorStop(1, 'rgba(90,80,64,0)'); g.fillStyle = gr; g.fillRect(x, y, 3 + h2(i, 34) * 9, l); }
  }, (g, w, h) => { blot(g, w, h, 140, 41, '255,255,255', 0.05, 0.16, 4, 20); blot(g, w, h, 140, 43, '0,0,0', 0.05, 0.16, 4, 20); grain(g, w, h, 20000, 47, 0.25); }, 1.2),
  brick: () => pair('brick', 512, (g, w, h) => {
    g.fillStyle = '#9d8f7c'; g.fillRect(0, 0, w, h); const rows = 16, cols = 4, bh = h / rows, bw = w / cols;
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) { const x = c * bw + (r % 2) * bw / 2, k = r * 13 + c + 7, l = 0.78 + h2(k, 51) * 0.32, hue = h2(k, 55); g.fillStyle = `rgb(${Math.round((150 + 18 * hue) * l)},${Math.round((70 + 10 * hue) * l)},${Math.round(50 * l)})`; g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6); g.fillStyle = `rgba(0,0,0,${(0.1 * h2(k, 52)).toFixed(3)})`; g.fillRect(x + 3, r * bh + bh * 0.6, bw - 6, bh * 0.4 - 3); }
    grain(g, w, h, 12000, 61, 0.14); blot(g, w, h, 16, 71, '60,40,30', 0.04, 0.12, 30, 100);
  }, (g, w, h) => { g.fillStyle = '#c8c8c8'; const rows = 16, cols = 4, bh = h / rows, bw = w / cols; g.fillStyle = '#404040'; g.fillRect(0, 0, w, h); g.fillStyle = '#c0c0c0'; for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) g.fillRect(c * bw + (r % 2) * bw / 2 + 3, r * bh + 3, bw - 6, bh - 6); grain(g, w, h, 8000, 63, 0.3); }, 3),
  concrete: () => pair('concrete', 512, (g, w, h) => {
    g.fillStyle = '#c9c7c1'; g.fillRect(0, 0, w, h); blot(g, w, h, 40, 121, '90,90,86', 0.03, 0.09, 30, 140); blot(g, w, h, 20, 125, '255,255,255', 0.04, 0.08, 20, 80); grain(g, w, h, 20000, 123, 0.08);
  }, (g, w, h) => { grain(g, w, h, 26000, 127, 0.4); blot(g, w, h, 60, 129, '0,0,0', 0.04, 0.12, 2, 8); }, 1.5),
  tin: () => pair('tin', 256, (g, w, h) => {
    for (let x = 0; x < w; x++) { const v = 0.5 + 0.5 * Math.sin(x / w * Math.PI * 2 * 8), c = Math.round(170 + 60 * v); g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 40; i++) { const x0 = h2(i, 81) * w, y0 = h2(i, 82) * h, l = 30 + h2(i, 83) * 140, gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, `rgba(110,56,24,${(0.2 + h2(i, 84) * 0.3).toFixed(2)})`); gr.addColorStop(1, 'rgba(110,56,24,0)'); g.fillStyle = gr; g.fillRect(x0, y0, 3 + h2(i, 85) * 10, l); }
    grain(g, w, h, 4000, 87, 0.12);
  }, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 0.5 + 0.5 * Math.sin(x / w * Math.PI * 2 * 8), c = Math.round(255 * v); g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect(x, 0, 1, h); } }, 5),
  asphalt: () => pair('asphalt', 512, (g, w, h) => {
    g.fillStyle = '#56585c'; g.fillRect(0, 0, w, h); grain(g, w, h, 40000, 91, 0.22); blot(g, w, h, 30, 93, '28,28,30', 0.08, 0.2, 30, 140); blot(g, w, h, 12, 97, '150,150,150', 0.04, 0.09, 20, 70);
  }, (g, w, h) => { grain(g, w, h, 40000, 95, 0.6, 1); }, 2),
  dirt: () => pair('dirt', 512, (g, w, h) => {
    g.fillStyle = '#a88c68'; g.fillRect(0, 0, w, h); blot(g, w, h, 50, 101, '110,84,56', 0.08, 0.2, 30, 140); blot(g, w, h, 30, 103, '205,188,152', 0.06, 0.16, 20, 90); grain(g, w, h, 30000, 107, 0.18);
    for (let i = 0; i < 600; i++) { const c = 100 + Math.round(h2(i, 109) * 100); g.fillStyle = `rgba(${c},${c - 12},${c - 30},0.85)`; g.beginPath(); g.ellipse(h2(i, 111) * w, h2(i, 112) * h, 1 + h2(i, 113) * 3, 1 + h2(i, 114) * 2, h2(i, 115) * 3, 0, 6.283); g.fill(); }
    for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(80,110,40,${(0.25 + h2(i, 117) * 0.35).toFixed(2)})`; g.lineWidth = 1; const x = h2(i, 118) * w, y = h2(i, 119) * h; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + k * 2, y); g.lineTo(x + k * 2 + (h2(i * 6 + k, 120) - 0.5) * 6, y - 5 - h2(i * 6 + k, 121) * 8); g.stroke(); } }
  }, (g, w, h) => { blot(g, w, h, 400, 131, '255,255,255', 0.2, 0.5, 1, 4); blot(g, w, h, 80, 133, '0,0,0', 0.05, 0.15, 10, 40); grain(g, w, h, 20000, 135, 0.4); }, 2),
  grass: () => pair('grass', 512, (g, w, h) => {
    g.fillStyle = '#6f8f3c'; g.fillRect(0, 0, w, h); blot(g, w, h, 60, 141, '90,120,40', 0.1, 0.25, 30, 120); blot(g, w, h, 40, 143, '150,150,70', 0.06, 0.18, 20, 90); blot(g, w, h, 30, 145, '50,70,30', 0.06, 0.16, 20, 80);
    for (let i = 0; i < 9000; i++) { const x = h2(i, 147) * w, y = h2(i, 148) * h, l = 3 + h2(i, 149) * 7; g.strokeStyle = `hsla(${78 + h2(i, 150) * 30},${35 + h2(i, 151) * 25}%,${28 + h2(i, 152) * 26}%,0.7)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (h2(i, 153) - 0.5) * 3, y - l); g.stroke(); }
  }, (g, w, h) => { grain(g, w, h, 30000, 155, 0.5, 1); }, 1.5),
  paver: () => pair('paver', 512, (g, w, h) => {
    g.fillStyle = '#8a8580'; g.fillRect(0, 0, w, h); const n = 8, s = w / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const l = 0.85 + h2(r * 31 + c, 161) * 0.25, red = h2(r * 7 + c, 163) > 0.7; g.fillStyle = red ? `rgb(${Math.round(150 * l)},${Math.round(96 * l)},${Math.round(80 * l)})` : `rgb(${Math.round(176 * l)},${Math.round(170 * l)},${Math.round(160 * l)})`; g.fillRect(c * s + 2, r * s + 2, s - 4, s - 4); }
    grain(g, w, h, 16000, 165, 0.1); blot(g, w, h, 20, 167, '50,45,40', 0.05, 0.14, 20, 80);
  }, (g, w, h) => { g.fillStyle = '#202020'; g.fillRect(0, 0, w, h); const n = 8, s = w / n; g.fillStyle = '#c0c0c0'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g.fillRect(c * s + 3, r * s + 3, s - 6, s - 6); }, 2.5),
  wood: () => pair('wood', 512, (g, w, h) => {
    const n = 6, ph = h / n;
    for (let r = 0; r < n; r++) { const l = 0.85 + h2(r, 131) * 0.25; g.fillStyle = `rgb(${Math.round(156 * l)},${Math.round(108 * l)},${Math.round(70 * l)})`; g.fillRect(0, r * ph, w, ph);
      for (let k = 0; k < 30; k++) { g.strokeStyle = `rgba(70,44,22,${(0.07 + h2(r * 40 + k, 133) * 0.14).toFixed(2)})`; g.lineWidth = 1 + h2(r * 40 + k, 134); const y = r * ph + h2(r * 40 + k, 135) * ph; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y); g.stroke(); }
      g.fillStyle = 'rgba(30,18,8,0.45)'; g.fillRect(0, r * ph, w, 2); }
  }, (g, w, h) => { const n = 6, ph = h / n; g.fillStyle = '#000'; for (let r = 0; r < n; r++) g.fillRect(0, r * ph, w, 3); }, 3),
  fabric: () => pair('fabric', 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${(0.03 + h2(y, 171) * 0.04).toFixed(3)})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(0,0,0,${(0.02 + h2(x, 173) * 0.03).toFixed(3)})`; g.fillRect(x, 0, 1, h); }
    blot(g, w, h, 30, 175, '0,0,0', 0.02, 0.06, 20, 70);
  }, (g, w, h) => {
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const v = ((x + y) / 2) % 2 ? 170 : 90; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 2); }
    for (let i = 0; i < 9; i++) { const y = h2(i, 177) * h, a = 0.25 + h2(i, 178) * 0.3; const gr = g.createLinearGradient(0, y - 14, 0, y + 14); gr.addColorStop(0, 'rgba(128,128,128,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(0, y - 14, w, 28); }
  }, 1.6),
  denim: () => pair('denim', 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const x = h2(i, 181) * w, y = h2(i, 182) * h; g.fillStyle = `rgba(${h2(i, 183) > 0.5 ? '255,255,255' : '0,0,30'},${(0.06 + h2(i, 184) * 0.08).toFixed(3)})`; g.fillRect(x, y, 1, 3); }
    blot(g, w, h, 24, 185, '255,255,255', 0.05, 0.12, 20, 60);
  }, (g, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 2) { const v = ((x / 2 + y) % 4) < 2 ? 160 : 100; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 1); } }, 1.2),
  knit: () => pair('knit', 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(0,0,0,${(0.04 + h2(x * 3 + y, 191) * 0.05).toFixed(3)})`; g.fillRect(x, y, 2, 3); } },
    (g, w, h) => { for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { g.fillStyle = '#d0d0d0'; g.beginPath(); g.ellipse(x + 2, y + 2, 1.6, 2.2, 0, 0, 6.283); g.fill(); } }, 2),
  leather: () => pair('leather', 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); blot(g, w, h, 60, 201, '0,0,0', 0.03, 0.08, 8, 30); grain(g, w, h, 6000, 203, 0.08); }, (g, w, h) => { blot(g, w, h, 600, 205, '0,0,0', 0.1, 0.3, 2, 6); }, 1),
  carpet: () => pair('carpet', 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); grain(g, w, h, 20000, 211, 0.12, 1); blot(g, w, h, 20, 213, '0,0,0', 0.03, 0.07, 20, 60); }, (g, w, h) => { grain(g, w, h, 30000, 215, 0.6, 1); }, 1.5),
  rock: () => pair('rock', 512, (g, w, h) => {
    g.fillStyle = '#8b8a86'; g.fillRect(0, 0, w, h); blot(g, w, h, 70, 221, '60,58,55', 0.08, 0.22, 20, 120); blot(g, w, h, 50, 223, '190,186,178', 0.06, 0.16, 20, 90); blot(g, w, h, 20, 224, '120,110,80', 0.05, 0.12, 30, 90); grain(g, w, h, 30000, 225, 0.16);
  }, (g, w, h) => { blot(g, w, h, 160, 227, '255,255,255', 0.1, 0.3, 6, 40); blot(g, w, h, 160, 229, '0,0,0', 0.1, 0.3, 6, 40); grain(g, w, h, 20000, 231, 0.5); }, 3),
  snow: () => pair('snow', 256, (g, w, h) => { g.fillStyle = '#f2f5f9'; g.fillRect(0, 0, w, h); blot(g, w, h, 30, 241, '170,190,215', 0.06, 0.16, 20, 80); grain(g, w, h, 8000, 243, 0.05); }, (g, w, h) => { blot(g, w, h, 120, 245, '255,255,255', 0.1, 0.3, 6, 30); blot(g, w, h, 120, 247, '0,0,0', 0.1, 0.3, 6, 30); }, 2),
  container: () => pair('container', 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(x, 0, 5, h); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 7, 0, 3, h); }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(110,60,30,${(0.08 + h2(i, 251) * 0.2).toFixed(2)})`; g.fillRect(h2(i, 252) * w, h2(i, 253) * h, 2 + h2(i, 254) * 6, 6 + h2(i, 255) * 40); }
  }, (g, w, h) => { for (let x = 0; x < w; x++) { const v = (x % 16) < 8 ? 210 : 60; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h); } }, 4),
  hair: () => pair('hair', 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const x = h2(i, 261) * w, l = 20 + h2(i, 262) * 60, y = h2(i, 263) * h; g.strokeStyle = `rgba(${h2(i, 264) > 0.5 ? '0,0,0' : '255,255,255'},${(0.08 + h2(i, 265) * 0.16).toFixed(3)})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y + l / 2, x + (h2(i, 266) - 0.5) * 8, y + l); g.stroke(); }
  }, (g, w, h) => { for (let i = 0; i < 1600; i++) { const x = h2(i, 271) * w, y = h2(i, 272) * h; g.strokeStyle = h2(i, 273) > 0.5 ? '#fff' : '#000'; g.globalAlpha = 0.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 40); g.stroke(); } g.globalAlpha = 1; }, 1.5),
};

/* small UI-style canvases: signs, screens, banners; keyed so the same board is never painted twice */
export function canvasTex(key: string, w: number, h: number, draw: Draw, repeat = false) {
  const hit = cache.get(key); if (hit) return hit;
  const c = canvas(w, h); draw(c.getContext('2d')!, w, h);
  const t = finish(c, true, repeat); cache.set(key, t); return t;
}

export interface SignLine { t: string; s: number; c: string; y: number; w?: string; f?: string; sp?: string; fit?: number }
const DEV = "'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Devanagari Sangam MN', sans-serif";
export const DEVA = DEV;
/* painted signboard: each line shrinks until it fits; redrawn when the Devanagari webfont lands */
export function signTex(key: string, w: number, h: number, bg: string, lines: SignLine[], border?: string, paint?: Draw) {
  const hit = cache.get(key); if (hit) return hit;
  const c = canvas(w, h), t = finish(c, true, false);
  const draw = () => {
    const g = c.getContext('2d')!; g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (paint) paint(g, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = h * 0.04; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const l of lines) {
      let sz = l.s; const f = () => { g.font = `${l.w || '700'} ${sz}px ${l.f || 'Inter, system-ui, sans-serif'}`; }; f();
      while (sz > 10 && g.measureText(l.t).width > w * (l.fit || 0.88)) { sz -= 2; f(); }
      g.fillStyle = l.c; g.fillText(l.t, w / 2, l.y * h);
    }
    blot(g, w, h, 8, key.length * 7, '60,50,40', 0.03, 0.07, 20, 90);
    t.needsUpdate = true;
  };
  draw();
  if (typeof document !== 'undefined' && document.fonts && lines.some((l) => l.f === DEV)) document.fonts.load('500 40px "Noto Sans Devanagari"', 'विद्यालय').then(draw).catch(() => { });
  cache.set(key, t); return t;
}

export function glowTex() {
  return canvasTex('glow', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
}
/* soft contact shadow: a radial falloff used under people, furniture and vehicles */
export function blobTex() {
  return canvasTex('blob', 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
}
/* alpha-tested leaf clusters for tree canopies */
export function leafTex(kind: 'mango' | 'broad' | 'fine') {
  return canvasTex('leaf-' + kind, 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); const n = kind === 'fine' ? 900 : 420, L = kind === 'mango' ? 26 : kind === 'broad' ? 18 : 9, Wd = kind === 'mango' ? 6 : kind === 'broad' ? 8 : 3;
    for (let i = 0; i < n; i++) {
      const a = h2(i, 281) * 6.283, r = Math.sqrt(h2(i, 282)) * 112, x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r * 0.9;
      const hue = kind === 'mango' ? 105 + h2(i, 283) * 25 : 85 + h2(i, 283) * 35, lt = 16 + h2(i, 284) * 22 + (1 - r / 112) * -6 + (y < 100 ? 8 : 0);
      g.fillStyle = `hsl(${hue},${38 + h2(i, 285) * 25}%,${lt}%)`; g.save(); g.translate(x, y); g.rotate(h2(i, 286) * 6.283); g.beginPath(); g.ellipse(0, 0, L * (0.6 + h2(i, 287) * 0.5) / 2, Wd / 2, 0, 0, 6.283); g.fill();
      g.strokeStyle = `hsla(${hue},30%,${lt + 12}%,0.5)`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-L / 3, 0); g.lineTo(L / 3, 0); g.stroke(); g.restore();
    }
  });
}

/* a sky-and-ground gradient baked into a PMREM so glass, paint and car bodies pick up soft reflections */
let envTex: THREE.Texture | null = null;
export function skyEnv(renderer: THREE.WebGLRenderer) {
  if (envTex) return envTex;
  const sc = new THREE.Scene(), m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ vec3 d = normalize(vP); float y = d.y; vec3 top = vec3(0.22,0.42,0.78), hz = vec3(0.86,0.88,0.9), gr = vec3(0.30,0.29,0.26); vec3 c = y > 0.0 ? mix(hz, top, pow(y, 0.5)) : mix(hz, gr, pow(-y, 0.35)); float s = max(dot(d, normalize(vec3(0.5,0.45,-0.7))), 0.0); c += vec3(1.0,0.92,0.78) * (pow(s, 60.0) * 4.0 + pow(s, 6.0) * 0.25); gl_FragColor = vec4(c, 1.0); }',
  });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), m));
  const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(sc, 0, 1, 300).texture; pm.dispose(); m.dispose();
  return envTex;
}

export function disposeTextures() { cache.forEach((t) => t.dispose()); cache.clear(); pairs.forEach((p) => { p.map.dispose(); p.normalMap?.dispose(); }); pairs.clear(); }
