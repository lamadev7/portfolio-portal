import * as THREE from "three";

/* procedural canvas textures: albedo + matching normal map, built once per page and shared by every scene */

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

export const hash = (a: number, b: number) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
export function rng(seed: number) { let s = Math.floor(Math.abs(seed) * 9973 + 1) % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function canvas(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function finish(c: HTMLCanvasElement, srgb: boolean, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** grey height canvas → tangent-space normal map (Sobel), tiling */
function normalFrom(hc: HTMLCanvasElement, strength: number) {
  const w = hc.width, h = hc.height, src = hc.getContext("2d")!.getImageData(0, 0, w, h).data;
  const out = canvas(w, h), og = out.getContext("2d")!, id = og.createImageData(w, h), d = id.data;
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

const wrap = (w: number, h: number, x: number, y: number, r: number, fn: (X: number, Y: number) => void) => {
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const X = x + a * w, Y = y + b * h; if (X + r < 0 || X - r > w || Y + r < 0 || Y - r > h) continue; fn(X, Y); }
};
export function blot(g: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, rgb: string, a0: number, a1: number, r0: number, r1: number) {
  for (let i = 0; i < n; i++) {
    const x = hash(i, seed) * w, y = hash(i, seed + 1) * h, r = r0 + hash(i, seed + 2) * (r1 - r0), a = a0 + hash(i, seed + 3) * (a1 - a0);
    wrap(w, h, x, y, r, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); gr.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2); });
  }
}
export function grain(g: CanvasRenderingContext2D, w: number, h: number, n: number, seed: number, a: number, sz = 2) {
  for (let i = 0; i < n; i++) { const v = hash(i, seed + 4) > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${(a * hash(i, seed + 3)).toFixed(3)})`; g.fillRect(hash(i, seed) * w, hash(i, seed + 1) * h, 1 + hash(i, seed + 2) * sz, 1 + hash(i, seed + 5) * sz); }
}
/** irregular polygon (a stone face) */
function stonePath(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number, n = 9) {
  g.beginPath();
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, j = 0.78 + hash(seed, k) * 0.3; const x = cx + Math.cos(a) * rx * j, y = cy + Math.sin(a) * ry * j; k ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath();
}

export interface Surface { map: THREE.Texture; normalMap?: THREE.Texture; /** metres covered by one texture repeat */ size: number }
const surfaces = new Map<string, Surface>();

function surface(key: string, px: number, size: number, albedo: Draw, height: Draw | null, strength = 2): Surface {
  const hit = surfaces.get(key); if (hit) return hit;
  const a = canvas(px, px); albedo(a.getContext("2d")!, px, px);
  const s: Surface = { map: finish(a, true), size };
  if (height) {
    const hc = canvas(px, px), g = hc.getContext("2d")!; g.fillStyle = "#808080"; g.fillRect(0, 0, px, px); height(g, px, px);
    /* normals at half resolution: a quarter of the Sobel work and upload, detail is carried by the albedo */
    const half = canvas(px / 2, px / 2), hg = half.getContext("2d")!; hg.drawImage(hc, 0, 0, px / 2, px / 2); s.normalMap = normalFrom(half, strength * 0.5);
  }
  surfaces.set(key, s); return s;
}

/* rubble / dry-stone courses: shared by the albedo and height passes so normals match the painted stones */
function stoneCourses(g: CanvasRenderingContext2D, w: number, h: number, seed: number, mode: "albedo" | "height", rows = 9, mortar = "#6e675c") {
  if (mode === "albedo") { g.fillStyle = mortar; g.fillRect(0, 0, w, h); } else { g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, w, h); }
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = -hash(r, seed) * 40;
    while (x < w + 20) {
      const sw = rh * (1.1 + hash(r * 97 + x, seed + 1) * 1.6), k = r * 131 + Math.floor(x);
      const cx = x + sw / 2, cy = r * rh + rh / 2 + (hash(k, seed + 2) - 0.5) * rh * 0.15;
      for (const ox of [-w, 0, w]) {
        stonePath(g, cx + ox, cy, sw / 2 - 2, rh / 2 - 2, k);
        if (mode === "albedo") {
          const l = 0.72 + hash(k, seed + 3) * 0.4, warm = hash(k, seed + 4);
          g.fillStyle = `rgb(${Math.round((128 + 26 * warm) * l)},${Math.round((122 + 14 * warm) * l)},${Math.round((112 - 4 * warm) * l)})`; g.fill();
          const gr = g.createLinearGradient(0, cy - rh / 2, 0, cy + rh / 2); gr.addColorStop(0, "rgba(255,255,255,0.10)"); gr.addColorStop(1, "rgba(0,0,0,0.22)"); g.fillStyle = gr; g.fill();
        } else { const gr = g.createRadialGradient(cx + ox, cy - rh * 0.1, 1, cx + ox, cy, sw / 2); gr.addColorStop(0, "#f0f0f0"); gr.addColorStop(0.7, "#b0b0b0"); gr.addColorStop(1, "#505050"); g.fillStyle = gr; g.fill(); }
      }
      x += sw;
    }
  }
}

export const SURF = {
  plaster: () => surface("plaster", 512, 3, (g, w, h) => {
    g.fillStyle = "#ece8df"; g.fillRect(0, 0, w, h);
    blot(g, w, h, 60, 11, "120,108,90", 0.03, 0.07, 30, 120); blot(g, w, h, 30, 17, "255,255,250", 0.04, 0.09, 30, 90); grain(g, w, h, 16000, 23, 0.05);
    for (let i = 0; i < 26; i++) { const x = hash(i, 31) * w, y = hash(i, 32) * h * 0.7, l = 40 + hash(i, 33) * 220, gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, "rgba(80,70,56,0.10)"); gr.addColorStop(1, "rgba(80,70,56,0)"); g.fillStyle = gr; g.fillRect(x, y, 2 + hash(i, 34) * 8, l); }
  }, (g, w, h) => { blot(g, w, h, 160, 41, "255,255,255", 0.05, 0.15, 4, 22); blot(g, w, h, 160, 43, "0,0,0", 0.05, 0.15, 4, 22); grain(g, w, h, 20000, 47, 0.25); }, 1.3),
  mud: () => surface("mud", 512, 3, (g, w, h) => {
    g.fillStyle = "#e6dccb"; g.fillRect(0, 0, w, h);
    blot(g, w, h, 90, 51, "140,110,80", 0.05, 0.12, 20, 110); blot(g, w, h, 40, 53, "255,250,240", 0.05, 0.12, 20, 80); grain(g, w, h, 22000, 57, 0.08);
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(120,96,70,${(0.05 + hash(i, 58) * 0.07).toFixed(3)})`; g.lineWidth = 2 + hash(i, 59) * 5; const x = hash(i, 60) * w, y = hash(i, 61) * h, r = 10 + hash(i, 62) * 30; g.beginPath(); g.arc(x, y, r, hash(i, 63) * 6, hash(i, 63) * 6 + 1.4); g.stroke(); }
  }, (g, w, h) => { blot(g, w, h, 220, 64, "255,255,255", 0.06, 0.2, 6, 30); blot(g, w, h, 220, 65, "0,0,0", 0.06, 0.2, 6, 30); grain(g, w, h, 18000, 66, 0.3); }, 1.6),
  brick: () => surface("brick", 512, 1.2, (g, w, h) => {
    g.fillStyle = "#8d8072"; g.fillRect(0, 0, w, h); const rows = 16, cols = 4, bh = h / rows, bw = w / cols;
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) { const x = c * bw + (r % 2) * bw / 2, k = r * 13 + c + 7, l = 0.72 + hash(k, 71) * 0.36, hue = hash(k, 75); g.fillStyle = `rgb(${Math.round((152 + 20 * hue) * l)},${Math.round((66 + 14 * hue) * l)},${Math.round((46 + 6 * hue) * l)})`; g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6); g.fillStyle = `rgba(0,0,0,${(0.12 * hash(k, 72)).toFixed(3)})`; g.fillRect(x + 3, r * bh + bh * 0.6, bw - 6, bh * 0.4 - 3); }
    grain(g, w, h, 14000, 81, 0.14); blot(g, w, h, 18, 83, "50,36,28", 0.05, 0.14, 30, 110);
  }, (g, w, h) => { const rows = 16, cols = 4, bh = h / rows, bw = w / cols; g.fillStyle = "#383838"; g.fillRect(0, 0, w, h); g.fillStyle = "#c4c4c4"; for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) g.fillRect(c * bw + (r % 2) * bw / 2 + 3, r * bh + 3, bw - 6, bh - 6); grain(g, w, h, 9000, 85, 0.35); }, 3),
  /** white-washed brick (Maya Devi temple): pale courses with soft mortar lines */
  wbrick: () => surface("wbrick", 512, 1.2, (g, w, h) => {
    g.fillStyle = "#d9d6cf"; g.fillRect(0, 0, w, h); const rows = 16, cols = 4, bh = h / rows, bw = w / cols;
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) { const x = c * bw + (r % 2) * bw / 2, l = 0.94 + hash(r * 13 + c, 401) * 0.08; g.fillStyle = `rgb(${Math.round(246 * l)},${Math.round(245 * l)},${Math.round(240 * l)})`; g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6); }
    grain(g, w, h, 12000, 403, 0.06); blot(g, w, h, 20, 405, "120,110,96", 0.03, 0.08, 30, 110);
  }, (g, w, h) => { const rows = 16, cols = 4, bh = h / rows, bw = w / cols; g.fillStyle = "#505050"; g.fillRect(0, 0, w, h); g.fillStyle = "#c4c4c4"; for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) g.fillRect(c * bw + (r % 2) * bw / 2 + 3, r * bh + 3, bw - 6, bh - 6); grain(g, w, h, 9000, 407, 0.3); }, 2),
  /** thin ancient bricks (Lumbini ruins): long, low, eroded */
  oldBrick: () => surface("oldBrick", 512, 1.6, (g, w, h) => {
    g.fillStyle = "#6f5a4a"; g.fillRect(0, 0, w, h); const rows = 22, bh = h / rows;
    for (let r = 0; r < rows; r++) { let x = -hash(r, 91) * 60; while (x < w) { const bw = 70 + hash(r * 31 + x, 92) * 50, k = r * 77 + Math.floor(x), l = 0.68 + hash(k, 93) * 0.4; g.fillStyle = `rgb(${Math.round(150 * l)},${Math.round(86 * l)},${Math.round(62 * l)})`; g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); x += bw; } }
    grain(g, w, h, 20000, 94, 0.18); blot(g, w, h, 40, 95, "40,50,30", 0.05, 0.16, 20, 90); blot(g, w, h, 30, 96, "200,190,170", 0.04, 0.1, 20, 80);
  }, (g, w, h) => { const rows = 22, bh = h / rows; g.fillStyle = "#303030"; g.fillRect(0, 0, w, h); for (let r = 0; r < rows; r++) { let x = -hash(r, 91) * 60; while (x < w) { const bw = 70 + hash(r * 31 + x, 92) * 50; g.fillStyle = `rgb(${180 + Math.round(hash(x, r) * 60)},180,180)`; g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6); x += bw; } } grain(g, w, h, 16000, 97, 0.5); }, 3),
  stone: () => surface("stone", 512, 2.2, (g, w, h) => { stoneCourses(g, w, h, 101, "albedo"); grain(g, w, h, 20000, 102, 0.12); blot(g, w, h, 30, 103, "60,70,40", 0.04, 0.12, 20, 80); },
    (g, w, h) => { stoneCourses(g, w, h, 101, "height"); grain(g, w, h, 16000, 104, 0.3); }, 4),
  flagstone: () => surface("flagstone", 512, 3, (g, w, h) => {
    g.fillStyle = "#4d4a45"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) { const cx = hash(i, 111) * w, cy = hash(i, 112) * h, r = 40 + hash(i, 113) * 46; wrap(w, h, cx, cy, r, (X, Y) => { stonePath(g, X, Y, r, r * (0.7 + hash(i, 114) * 0.3), i, 7); const l = 0.7 + hash(i, 115) * 0.35; g.fillStyle = `rgb(${Math.round(132 * l)},${Math.round(128 * l)},${Math.round(120 * l)})`; g.fill(); }); }
    grain(g, w, h, 24000, 116, 0.14); blot(g, w, h, 20, 117, "40,40,36", 0.05, 0.14, 20, 90);
  }, (g, w, h) => { g.fillStyle = "#202020"; g.fillRect(0, 0, w, h); for (let i = 0; i < 46; i++) { const cx = hash(i, 111) * w, cy = hash(i, 112) * h, r = 40 + hash(i, 113) * 46; wrap(w, h, cx, cy, r, (X, Y) => { stonePath(g, X, Y, r, r * (0.7 + hash(i, 114) * 0.3), i, 7); g.fillStyle = "#c8c8c8"; g.fill(); }); } grain(g, w, h, 20000, 118, 0.4); }, 3),
  tin: () => surface("tin", 256, 1.2, (g, w, h) => {
    for (let x = 0; x < w; x++) { const v = 0.5 + 0.5 * Math.sin(x / w * Math.PI * 2 * 8), c = Math.round(180 + 60 * v); g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 46; i++) { const x0 = hash(i, 121) * w, y0 = hash(i, 122) * h, l = 30 + hash(i, 123) * 140, gr = g.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, `rgba(120,60,24,${(0.15 + hash(i, 124) * 0.3).toFixed(2)})`); gr.addColorStop(1, "rgba(120,60,24,0)"); g.fillStyle = gr; g.fillRect(x0, y0, 3 + hash(i, 125) * 10, l); }
    grain(g, w, h, 4000, 126, 0.12);
  }, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 0.5 + 0.5 * Math.sin(x / w * Math.PI * 2 * 8), c = Math.round(255 * v); g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect(x, 0, 1, h); } }, 5),
  /** clay roof tiles in courses, tinted per mesh (terracotta, glazed orange) */
  tile: () => surface("tile", 512, 1.6, (g, w, h) => {
    const rows = 10, cols = 8, rh = h / rows, cw = w / cols; g.fillStyle = "#5a5450"; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) { const x = c * cw + (r % 2) * cw / 2, k = r * 41 + c, l = 0.8 + hash(k, 131) * 0.28; const gr = g.createLinearGradient(x, 0, x + cw, 0); gr.addColorStop(0, `rgb(${Math.round(150 * l)},${Math.round(150 * l)},${Math.round(150 * l)})`); gr.addColorStop(0.5, `rgb(${Math.round(240 * l)},${Math.round(240 * l)},${Math.round(240 * l)})`); gr.addColorStop(1, `rgb(${Math.round(130 * l)},${Math.round(130 * l)},${Math.round(130 * l)})`); g.fillStyle = gr; g.beginPath(); g.moveTo(x + 2, r * rh); g.lineTo(x + cw - 2, r * rh); g.lineTo(x + cw - 4, r * rh + rh - 3); g.quadraticCurveTo(x + cw / 2, r * rh + rh + 4, x + 4, r * rh + rh - 3); g.fill(); }
    grain(g, w, h, 12000, 133, 0.1); blot(g, w, h, 30, 134, "30,30,20", 0.05, 0.15, 20, 90);
  }, (g, w, h) => { const rows = 10, cols = 8, rh = h / rows, cw = w / cols; g.fillStyle = "#202020"; g.fillRect(0, 0, w, h); for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) { const x = c * cw + (r % 2) * cw / 2, gr = g.createLinearGradient(x, 0, x + cw, 0); gr.addColorStop(0, "#606060"); gr.addColorStop(0.5, "#f0f0f0"); gr.addColorStop(1, "#606060"); g.fillStyle = gr; g.fillRect(x + 2, r * rh, cw - 4, rh - 2); const g2 = g.createLinearGradient(0, r * rh, 0, r * rh + rh); g2.addColorStop(0, "rgba(0,0,0,0.5)"); g2.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = g2; g.fillRect(x, r * rh, cw, rh); } }, 4),
  thatch: () => surface("thatch", 512, 1.4, (g, w, h) => {
    g.fillStyle = "#6c5636"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const x = hash(i, 141) * w, y = hash(i, 142) * h, l = 20 + hash(i, 143) * 50, c = 0.6 + hash(i, 144) * 0.6; g.strokeStyle = `rgba(${Math.round(190 * c)},${Math.round(156 * c)},${Math.round(98 * c)},0.55)`; g.lineWidth = 1 + hash(i, 145) * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i, 146) - 0.5) * 8, y + l); g.stroke(); }
    blot(g, w, h, 30, 147, "40,30,16", 0.08, 0.2, 20, 80);
  }, (g, w, h) => { for (let i = 0; i < 7000; i++) { const x = hash(i, 141) * w, y = hash(i, 142) * h, l = 20 + hash(i, 143) * 50; g.strokeStyle = hash(i, 148) > 0.5 ? "#e0e0e0" : "#303030"; g.globalAlpha = 0.4; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i, 146) - 0.5) * 8, y + l); g.stroke(); } g.globalAlpha = 1; }, 3),
  wood: () => surface("wood", 512, 1.6, (g, w, h) => {
    const n = 6, ph = h / n;
    for (let r = 0; r < n; r++) { const l = 0.82 + hash(r, 151) * 0.26; g.fillStyle = `rgb(${Math.round(150 * l)},${Math.round(104 * l)},${Math.round(68 * l)})`; g.fillRect(0, r * ph, w, ph);
      for (let k = 0; k < 34; k++) { g.strokeStyle = `rgba(60,38,20,${(0.07 + hash(r * 40 + k, 153) * 0.15).toFixed(2)})`; g.lineWidth = 1 + hash(r * 40 + k, 154); const y = r * ph + hash(r * 40 + k, 155) * ph; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y); g.stroke(); }
      g.fillStyle = "rgba(25,15,6,0.5)"; g.fillRect(0, r * ph, w, 2); }
    grain(g, w, h, 6000, 156, 0.08);
  }, (g, w, h) => { const n = 6, ph = h / n; g.fillStyle = "#000"; for (let r = 0; r < n; r++) g.fillRect(0, r * ph, w, 3); grain(g, w, h, 8000, 157, 0.25); }, 3),
  bark: () => surface("bark", 256, 1, (g, w, h) => {
    g.fillStyle = "#4a3c30"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = hash(i, 161) * w, wd = 3 + hash(i, 162) * 9, c = 0.6 + hash(i, 163) * 0.7; g.fillStyle = `rgba(${Math.round(110 * c)},${Math.round(96 * c)},${Math.round(80 * c)},0.6)`; g.fillRect(x, 0, wd, h); }
    grain(g, w, h, 8000, 164, 0.2);
  }, (g, w, h) => { for (let i = 0; i < 260; i++) { const x = hash(i, 161) * w, wd = 3 + hash(i, 162) * 9; g.fillStyle = hash(i, 165) > 0.4 ? "#d0d0d0" : "#404040"; g.globalAlpha = 0.6; g.fillRect(x, 0, wd, h); } g.globalAlpha = 1; for (let i = 0; i < 90; i++) { g.fillStyle = "#202020"; g.fillRect(hash(i, 166) * w, hash(i, 167) * h, 6 + hash(i, 168) * 20, 2); } }, 4),
  dirt: () => surface("dirt", 512, 4, (g, w, h) => {
    g.fillStyle = "#8a7356"; g.fillRect(0, 0, w, h); blot(g, w, h, 60, 171, "96,74,50", 0.08, 0.2, 30, 140); blot(g, w, h, 30, 173, "190,170,134", 0.06, 0.15, 20, 90); grain(g, w, h, 30000, 177, 0.18);
    for (let i = 0; i < 700; i++) { const c = 90 + Math.round(hash(i, 179) * 100); g.fillStyle = `rgba(${c},${c - 10},${c - 26},0.85)`; g.beginPath(); g.ellipse(hash(i, 181) * w, hash(i, 182) * h, 1 + hash(i, 183) * 3, 1 + hash(i, 184) * 2, hash(i, 185) * 3, 0, 6.283); g.fill(); }
  }, (g, w, h) => { blot(g, w, h, 500, 187, "255,255,255", 0.2, 0.5, 1, 4); blot(g, w, h, 90, 188, "0,0,0", 0.05, 0.15, 10, 40); grain(g, w, h, 20000, 189, 0.4); }, 2),
  concrete: () => surface("concrete", 512, 4, (g, w, h) => {
    g.fillStyle = "#c4c1ba"; g.fillRect(0, 0, w, h); blot(g, w, h, 40, 191, "90,88,84", 0.03, 0.09, 30, 140); blot(g, w, h, 20, 193, "255,255,255", 0.04, 0.08, 20, 80); grain(g, w, h, 20000, 195, 0.08);
  }, (g, w, h) => { grain(g, w, h, 26000, 197, 0.4); blot(g, w, h, 60, 199, "0,0,0", 0.04, 0.12, 2, 8); }, 1.5),
  rock: () => surface("rock", 512, 6, (g, w, h) => {
    g.fillStyle = "#77736c"; g.fillRect(0, 0, w, h); blot(g, w, h, 80, 201, "50,48,45", 0.08, 0.22, 20, 120); blot(g, w, h, 60, 203, "176,170,160", 0.06, 0.16, 20, 90); blot(g, w, h, 20, 204, "110,100,70", 0.05, 0.12, 30, 90); grain(g, w, h, 30000, 205, 0.16);
    for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(30,28,26,0.35)"; g.lineWidth = 1 + hash(i, 206) * 2; let x = hash(i, 207) * w, y = hash(i, 208) * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash(i * 7 + k, 209) - 0.5) * 50; y += hash(i * 7 + k, 210) * 30; g.lineTo(x, y); } g.stroke(); }
  }, (g, w, h) => { blot(g, w, h, 200, 211, "255,255,255", 0.1, 0.3, 6, 40); blot(g, w, h, 200, 213, "0,0,0", 0.1, 0.3, 6, 40); grain(g, w, h, 20000, 215, 0.5); }, 3),
  snow: () => surface("snow", 256, 4, (g, w, h) => { g.fillStyle = "#eef2f7"; g.fillRect(0, 0, w, h); blot(g, w, h, 40, 221, "170,188,214", 0.06, 0.16, 20, 80); grain(g, w, h, 8000, 223, 0.05); },
    (g, w, h) => { blot(g, w, h, 140, 225, "255,255,255", 0.1, 0.3, 6, 30); blot(g, w, h, 140, 227, "0,0,0", 0.1, 0.3, 6, 30); }, 1.6),
  /** river sand with pebbles and silt ripples */
  sand: () => surface("sand", 512, 4, (g, w, h) => {
    g.fillStyle = "#b8ae98"; g.fillRect(0, 0, w, h); blot(g, w, h, 50, 301, "140,130,110", 0.06, 0.16, 30, 120); blot(g, w, h, 30, 303, "220,214,200", 0.05, 0.12, 20, 90); grain(g, w, h, 40000, 305, 0.12);
    for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(120,110,90,0.12)"; g.lineWidth = 2; const y = hash(i, 306) * h; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 4); g.stroke(); }
    for (let i = 0; i < 260; i++) { const c = 90 + Math.round(hash(i, 307) * 90); g.fillStyle = `rgb(${c},${c - 4},${c - 10})`; g.beginPath(); g.ellipse(hash(i, 308) * w, hash(i, 309) * h, 2 + hash(i, 310) * 5, 2 + hash(i, 311) * 3, hash(i, 312) * 3, 0, 6.283); g.fill(); }
  }, (g, w, h) => { blot(g, w, h, 260, 313, "255,255,255", 0.2, 0.5, 2, 5); grain(g, w, h, 30000, 315, 0.35); }, 1.8),
  /** meadow soil seen between grass blades */
  turf: () => surface("turf", 512, 3, (g, w, h) => {
    g.fillStyle = "#58652e"; g.fillRect(0, 0, w, h); blot(g, w, h, 70, 231, "86,96,40", 0.1, 0.25, 30, 120); blot(g, w, h, 50, 233, "120,110,62", 0.06, 0.16, 20, 90); blot(g, w, h, 40, 235, "40,52,24", 0.08, 0.18, 20, 80);
    for (let i = 0; i < 12000; i++) { const x = hash(i, 237) * w, y = hash(i, 238) * h, l = 3 + hash(i, 239) * 8; g.strokeStyle = `hsla(${70 + hash(i, 240) * 32},${30 + hash(i, 241) * 25}%,${22 + hash(i, 242) * 24}%,0.75)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i, 243) - 0.5) * 4, y - l); g.stroke(); }
  }, (g, w, h) => { grain(g, w, h, 30000, 245, 0.5, 1); }, 1.4),
  /** flooded / young-paddy soil: wet mud with planted rows */
  paddy: () => surface("paddy", 512, 4, (g, w, h) => {
    g.fillStyle = "#4a5a2a"; g.fillRect(0, 0, w, h); blot(g, w, h, 40, 251, "60,56,40", 0.1, 0.25, 30, 120);
    for (let r = 0; r < 24; r++) for (let c = 0; c < 24; c++) { const x = (c + 0.5) * w / 24 + (hash(r, c) - 0.5) * 4, y = (r + 0.5) * h / 24 + (hash(c, r) - 0.5) * 4; for (let k = 0; k < 7; k++) { g.strokeStyle = `hsla(${78 + hash(r * 24 + c, k) * 20},50%,${30 + hash(k, r * 24 + c) * 18}%,0.9)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (k - 3) * 1.6, y - 8 - hash(k, c) * 5); g.stroke(); } }
  }, (g, w, h) => { for (let r = 0; r < 24; r++) for (let c = 0; c < 24; c++) blot(g, w, h, 0, 0, "", 0, 0, 0, 0); grain(g, w, h, 20000, 255, 0.4); }, 1.2),
};
export type SurfKey = keyof typeof SURF;

/** water ripple normal map, tiling, built from summed sine octaves */
let waterN: THREE.Texture | null = null;
export function waterNormals() {
  if (waterN) return waterN;
  const n = 256, c = canvas(n, n), g = c.getContext("2d")!; g.fillStyle = "#808080"; g.fillRect(0, 0, n, n);
  const id = g.getImageData(0, 0, n, n), d = id.data, waves: [number, number, number, number][] = [];
  const R = rng(7); for (let i = 0; i < 24; i++) { const a = R() * Math.PI * 2, k = 1 + Math.floor(R() * 9); waves.push([Math.round(Math.cos(a) * k), Math.round(Math.sin(a) * k), 1 / (k + 1), R() * 6.283]); }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let v = 0; for (const [kx, ky, amp, ph] of waves) v += Math.sin(((kx * x + ky * y) / n) * Math.PI * 2 + ph) * amp; const i = (y * n + x) * 4, q = 128 + v * 40; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, q)); d[i + 3] = 255; }
  g.putImageData(id, 0, 0); waterN = normalFrom(c, 2.5); return waterN;
}

/** soft radial falloff (light pools, glows, contact shadows) */
const small = new Map<string, THREE.Texture>();
export function canvasTex(key: string, w: number, h: number, draw: Draw, repeat = false, srgb = true) {
  const hit = small.get(key); if (hit) return hit;
  const c = canvas(w, h); draw(c.getContext("2d")!, w, h);
  const t = finish(c, srgb, repeat); small.set(key, t); return t;
}
export const glowTex = () => canvasTex("glow", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
export const blobTex = () => canvasTex("blob", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,0.9)"); gr.addColorStop(0.5, "rgba(0,0,0,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

export const DEVA_FONT = "'Kohinoor Devanagari', 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Devanagari Sangam MN', sans-serif";
export const LATIN_FONT = "'Helvetica Neue', Inter, Arial, sans-serif";
export interface SignLine { t: string; size: number; color: string; y: number; weight?: string; font?: string; fit?: number }

/** painted board: each line shrinks to fit; repainted once the Devanagari face is ready */
export function signTex(key: string, w: number, h: number, bg: string, lines: SignLine[], o: { border?: string; paint?: Draw; grime?: number } = {}) {
  const hit = small.get(key); if (hit) return hit;
  const c = canvas(w, h), t = finish(c, true, false);
  const draw = () => {
    const g = c.getContext("2d")!; g.fillStyle = bg; g.fillRect(0, 0, w, h);
    o.paint?.(g, w, h);
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = h * 0.04; g.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08); }
    g.textAlign = "center"; g.textBaseline = "middle";
    for (const l of lines) {
      let sz = l.size; const f = () => { g.font = `${l.weight || "700"} ${sz}px ${l.font || LATIN_FONT}`; }; f();
      while (sz > 8 && g.measureText(l.t).width > w * (l.fit || 0.9)) { sz -= 2; f(); }
      g.fillStyle = l.color; g.fillText(l.t, w / 2, l.y * h);
    }
    if (o.grime !== 0) blot(g, w, h, 10, key.length * 7, "50,40,30", 0.03, 0.08 * (o.grime ?? 1), 20, 90);
    t.needsUpdate = true;
  };
  draw();
  if (typeof document !== "undefined" && document.fonts && lines.some((l) => l.font === DEVA_FONT)) document.fonts.load(`600 40px ${DEVA_FONT}`, "विद्यालय").then(draw).catch(() => {});
  small.set(key, t); return t;
}

/** lit-window interiors, 4 cells across: classroom tube light, warm home room, curtained, shop/office */
export const windowAtlas = () => canvasTex("winAtlas", 512, 128, (g) => {
  const cell = (i: number, fn: (x: number) => void) => { g.save(); g.beginPath(); g.rect(i * 128, 0, 128, 128); g.clip(); fn(i * 128); g.restore(); };
  cell(0, (x) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#f4f8ff"); gr.addColorStop(0.35, "#c9d4e6"); gr.addColorStop(1, "#6b7486"); g.fillStyle = gr; g.fillRect(x, 0, 128, 128); g.fillStyle = "#ffffff"; g.fillRect(x + 20, 8, 88, 6); g.fillStyle = "#2a3a34"; g.fillRect(x + 14, 46, 100, 34); g.fillStyle = "#4a3a2c"; for (let k = 0; k < 3; k++) g.fillRect(x + 8 + k * 42, 100, 30, 10); });
  cell(1, (x) => { const gr = g.createRadialGradient(x + 64, 30, 4, x + 64, 60, 110); gr.addColorStop(0, "#fff1cf"); gr.addColorStop(0.5, "#e7b56f"); gr.addColorStop(1, "#7a4a22"); g.fillStyle = gr; g.fillRect(x, 0, 128, 128); g.fillStyle = "rgba(90,40,20,0.55)"; g.fillRect(x, 0, 26, 128); g.fillRect(x + 102, 0, 26, 128); g.fillStyle = "#3a2a1c"; g.fillRect(x + 40, 84, 50, 44); });
  cell(2, (x) => { const gr = g.createLinearGradient(x, 0, x + 128, 0); gr.addColorStop(0, "#c5642a"); gr.addColorStop(0.5, "#f0a050"); gr.addColorStop(1, "#b65524"); g.fillStyle = gr; g.fillRect(x, 0, 128, 128); g.strokeStyle = "rgba(90,30,10,0.4)"; g.lineWidth = 3; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(x + 8 + k * 14, 0); g.lineTo(x + 6 + k * 14, 128); g.stroke(); } });
  cell(3, (x) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#a9b6c4"); g.fillStyle = gr; g.fillRect(x, 0, 128, 128); g.fillStyle = "#566270"; g.fillRect(x + 10, 70, 108, 58); g.fillStyle = "#e8f0ff"; g.fillRect(x + 30, 6, 68, 5); });
});
