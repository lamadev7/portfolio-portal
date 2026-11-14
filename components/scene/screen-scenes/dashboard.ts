/**
 * SCENE 2 — UI DASHBOARD with embedded US fleet map + 5 moving trucks.
 * Renders as the visual "result" of the React code in scene 1.
 */
import { W, H, clear, scanlines, type SceneParams } from "./helpers";

/* ---- US map data (positions normalised 0..1 inside the map panel) ---- */
interface City { name: string; x: number; y: number; }
interface Truck {
  id: string;
  path: string[];
  speed: number;
  mph: number;
  status: "OK" | "WARN";
  loaded: boolean;
}

const CITIES: City[] = [
  { name: "LAX", x: 0.10, y: 0.66 },
  { name: "PHX", x: 0.20, y: 0.71 },
  { name: "DEN", x: 0.31, y: 0.50 },
  { name: "DAL", x: 0.44, y: 0.81 },
  { name: "CHI", x: 0.56, y: 0.30 },
  { name: "MEM", x: 0.54, y: 0.66 },
  { name: "ATL", x: 0.68, y: 0.75 },
  { name: "NYC", x: 0.82, y: 0.26 },
  { name: "MIA", x: 0.74, y: 0.96 },
  { name: "SEA", x: 0.10, y: 0.14 },
];
const C = Object.fromEntries(CITIES.map((c) => [c.name, c]));

const TRUCKS: Truck[] = [
  { id: "TRK-4427", path: ["LAX","PHX","DAL","ATL","MIA"], speed: 0.040, mph: 62, status: "OK",   loaded: true  },
  { id: "TRK-2901", path: ["SEA","DEN","CHI","NYC"],        speed: 0.034, mph: 58, status: "OK",   loaded: true  },
  { id: "TRK-7841", path: ["CHI","MEM","ATL"],              speed: 0.052, mph: 71, status: "OK",   loaded: false },
  { id: "TRK-1827", path: ["NYC","ATL","MIA"],              speed: 0.038, mph: 64, status: "WARN", loaded: true  },
  { id: "TRK-5512", path: ["DAL","MEM","CHI"],              speed: 0.046, mph: 67, status: "OK",   loaded: true  },
];

interface Pt { x: number; y: number; }

const pj = (c: City, mx: number, my: number, mw: number, mh: number): Pt =>
  ({ x: mx + c.x * mw, y: my + c.y * mh });

const pjPath = (path: string[], mx: number, my: number, mw: number, mh: number): Pt[] =>
  path.map((id) => pj(C[id], mx, my, mw, mh));

function totalLen(pts: Pt[]) {
  let L = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    L += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  return L;
}

function pointOn(pts: Pt[], frac: number): Pt & { angle: number } {
  const L = totalLen(pts);
  const d = frac * L;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + seg >= d) {
      const f = (d - acc) / seg;
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
    acc += seg;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

function drawUS(ctx: CanvasRenderingContext2D, mx: number, my: number, mw: number, mh: number) {
  const P = (nx: number, ny: number) => [mx + nx * mw, my + ny * mh] as const;
  ctx.beginPath();
  const pts = [
    P(0.02, 0.10), P(0.30, 0.04), P(0.65, 0.02), P(0.92, 0.10),
    P(0.96, 0.30), P(0.99, 0.50), P(0.94, 0.62), P(0.88, 0.74),
    P(0.82, 0.82), P(0.78, 0.96), P(0.72, 1.00), P(0.66, 0.96),
    P(0.50, 0.92), P(0.30, 0.94), P(0.18, 0.92), P(0.08, 0.86),
    P(0.04, 0.74), P(0.02, 0.50), P(0.00, 0.30), P(0.02, 0.10),
  ];
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2 + Math.sin(i * 2.3) * mw * 0.025;
    const cy = (y0 + y1) / 2 + Math.cos(i * 1.7) * mh * 0.025;
    ctx.quadraticCurveTo(cx, cy, x1, y1);
  }
  ctx.closePath();
}

function drawTruck(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  accent: string, loaded: boolean, status: "OK" | "WARN",
  t: number, label: string, mph: number,
  mapRight: number, mapTop: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const pulse = (t * 1.4) % 1.4;
  if (pulse < 1) {
    ctx.strokeStyle = `rgba(200,255,44,${(1 - pulse) * 0.55})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + pulse * 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (loaded) {
    ctx.fillStyle = "#0d0f0d";
    ctx.fillRect(-12, -4, 16, 8);
    ctx.strokeStyle = "#" + accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(-12, -4, 16, 8);
    ctx.strokeStyle = "rgba(200,255,44,0.35)";
    for (let i = -9; i <= 1; i += 4) {
      ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i, 4); ctx.stroke();
    }
  }
  const cabStroke = status === "WARN" ? "#ff7a45" : "#" + accent;
  ctx.fillStyle = "#161916";
  ctx.fillRect(4, -3.5, 7, 7);
  ctx.strokeStyle = cabStroke;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(4, -3.5, 7, 7);
  ctx.fillStyle = "rgba(200,255,44,0.18)";
  ctx.beginPath();
  ctx.moveTo(11, -2); ctx.lineTo(17, -4); ctx.lineTo(17, 4); ctx.lineTo(11, 2);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // floating chip with id + speed
  const chipW = 80, chipH = 22;
  let cx = x + 12, cy = y - 28;
  if (cx + chipW > mapRight - 6) cx = x - chipW - 12;
  if (cy < mapTop + 6) cy = y + 14;
  ctx.fillStyle = "rgba(7,9,7,0.88)";
  ctx.fillRect(cx, cy, chipW, chipH);
  ctx.strokeStyle = cabStroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx, cy, chipW, chipH);
  ctx.fillStyle = cabStroke;
  ctx.beginPath();
  ctx.arc(cx + 7, cy + 8, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e9efe6";
  ctx.font = "bold 9px JetBrains Mono, monospace";
  ctx.fillText(label + " · " + mph + "mph", cx + 14, cy + 14);
}

export function drawDashboard(ctx: CanvasRenderingContext2D, t: number, p: SceneParams) {
  clear(ctx, "#0c0e0c");

  // backdrop grid
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  for (let x = 0; x < W; x += 24) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }

  // top nav
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, W, 50);
  ctx.fillStyle = "#" + p.accentHex;
  ctx.fillRect(20, 18, 14, 14);
  ctx.fillStyle = "#e9efe6";
  ctx.font = "16px JetBrains Mono, monospace";
  ctx.fillText("portpro / operations", 44, 32);
  ctx.fillStyle = "#8a948a";
  ctx.font = "12px JetBrains Mono, monospace";
  ["fleet", "tasks", "workers", "agents"].forEach((tab, i) => {
    const x = 280 + i * 90;
    if (i === 0) {
      ctx.fillStyle = "#" + p.accentHex;
      ctx.fillRect(x, 44, 60, 2);
    }
    ctx.fillStyle = i === 0 ? "#e9efe6" : "#8a948a";
    ctx.fillText(tab, x, 32);
  });

  // stat cards
  const cards = [
    { k: "ACTIVE LOADS", v: "1,284", d: "+12 today" },
    { k: "ON-TIME ETA",  v: "97.4%", d: "+0.6% wk" },
    { k: "FLEET LIVE",   v: "5 / 5", d: "● tracking" },
    { k: "AGENT RUNS",   v: "8,927", d: "live" },
  ];
  cards.forEach((c, i) => {
    const x = 24 + i * 244;
    const y = 60;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.strokeRect(x, y, 220, 64);
    ctx.fillStyle = "#5a605a";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(c.k, x + 12, y + 16);
    ctx.fillStyle = "#e9efe6";
    ctx.font = "22px JetBrains Mono, monospace";
    ctx.fillText(c.v, x + 12, y + 42);
    ctx.fillStyle = "#" + p.accentHex;
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(c.d, x + 12, y + 58);
  });

  // map panel
  const mx = 24, my = 140, mw = 660, mh = 410;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(mx, my, mw, mh);
  ctx.fillStyle = "#080a08";
  ctx.fillRect(mx + 1, my + 1, mw - 2, mh - 2);
  ctx.fillStyle = "#5a605a";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillText("FLEET MAP · mapbox-gl · live", mx + 12, my + 18);
  ctx.fillStyle = "#" + p.accentHex;
  ctx.fillText("● 5 vehicles tracked", mx + mw - 140, my + 18);

  const ix = mx + 16, iy = my + 30, iw = mw - 32, ih = mh - 50;
  // continent
  drawUS(ctx, ix, iy, iw, ih);
  ctx.fillStyle = "rgba(20,28,22,0.85)";
  ctx.fill();
  drawUS(ctx, ix, iy, iw, ih);
  ctx.strokeStyle = "rgba(200,255,44,0.55)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // topo lines
  ctx.save();
  drawUS(ctx, ix, iy, iw, ih);
  ctx.clip();
  ctx.strokeStyle = "rgba(200,255,44,0.05)";
  for (let y = iy; y < iy + ih; y += 14) {
    ctx.beginPath();
    for (let x = ix; x <= ix + iw; x += 8) {
      const yy = y + Math.sin(x * 0.025 + y * 0.04) * 2;
      if (x === ix) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // route paths
  TRUCKS.forEach((r) => {
    const pts = pjPath(r.path, ix, iy, iw, ih);
    ctx.strokeStyle = "rgba(200,255,44,0.20)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach((p2, i) => { if (i === 0) ctx.moveTo(p2.x, p2.y); else ctx.lineTo(p2.x, p2.y); });
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // cities
  CITIES.forEach((c) => {
    const pt = pj(c, ix, iy, iw, ih);
    ctx.fillStyle = "#080a08";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#" + p.accentHex;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#8a948a";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.fillText(c.name, pt.x + 7, pt.y - 5);
  });

  // trucks
  const mapRight = ix + iw;
  TRUCKS.forEach((r, i) => {
    const pts = pjPath(r.path, ix, iy, iw, ih);
    const frac = (t * r.speed + i * 0.17) % 1;
    const pos = pointOn(pts, frac);
    drawTruck(ctx, pos.x, pos.y, pos.angle, p.accentHex, r.loaded, r.status, t + i, r.id, r.mph, mapRight, iy);
  });

  // right panel — agent feed
  const rx = 700, ry = 140, rw = W - rx - 24, rh = 410;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.fillStyle = "#5a605a";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillText("AGENT FEED · live", rx + 12, ry + 18);

  const feed = [
    "sub_agent_1 resolved entry #84122",
    "sub_agent_3 assigned worker W-2901",
    "sub_agent_2 ran plan_estimate",
    "orchestrator.plan() · 142ms",
    "sub_agent_1 flagged duplicate",
    "sub_agent_3 re-routed task 7841",
    "sub_agent_2 synthesized eta",
    "orchestrator.respond() · ok",
  ];
  ctx.font = "10.5px JetBrains Mono, monospace";
  feed.forEach((f, i) => {
    const off = (t * 24) % 30;
    const y = ry + 38 + i * 30 - off;
    if (y < ry + 32 || y > ry + rh - 8) return;
    ctx.fillStyle = "#" + p.accentHex;
    ctx.beginPath(); ctx.arc(rx + 12, y - 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e9efe6";
    ctx.fillText(f, rx + 22, y);
  });

  // bottom status bar
  ctx.fillStyle = "#" + p.accentHex;
  ctx.fillRect(0, H - 24, W, 24);
  ctx.fillStyle = "#070907";
  ctx.font = "12px JetBrains Mono, monospace";
  ctx.fillText("● live · ws://portpro.internal — orchestrator healthy", 12, H - 8);

  scanlines(ctx);
}
