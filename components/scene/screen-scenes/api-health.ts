/**
 * SCENE 4 — API HEALTH: live HTTP request log + service probes.
 * The visual "result" of the Express+Mongo code in scene 3.
 */
import { W, H, clear, bgGrid, titlebar, scanlines, type SceneParams } from "./helpers";

interface Endpoint {
  m: "GET" | "POST" | "PUT" | "DELETE";
  p: string;
  base: number;
  status: number;
}

const ENDPOINTS: Endpoint[] = [
  { m: "GET",  p: "/api/loads",                base: 24,  status: 200 },
  { m: "GET",  p: "/api/workers",              base: 18,  status: 200 },
  { m: "POST", p: "/api/loads/7841/assign",    base: 41,  status: 200 },
  { m: "GET",  p: "/api/agents/runs",          base: 31,  status: 200 },
  { m: "GET",  p: "/api/loads/84122",          base: 19,  status: 200 },
  { m: "PUT",  p: "/api/loads/7841",           base: 36,  status: 200 },
  { m: "GET",  p: "/api/health",               base: 4,   status: 200 },
  { m: "POST", p: "/api/orchestrator/run",     base: 142, status: 200 },
];

interface Probe {
  svc: string;
  det: string;
  ms: (t: number) => number;
}

const HEALTH: Probe[] = [
  { svc: "mongo",     det: "primary · rs0",     ms: (t) => 6  + Math.floor(Math.sin(t * 0.8) * 2)         },
  { svc: "redis",     det: "cluster · 3 nodes", ms: (t) => 1  + Math.floor(Math.abs(Math.sin(t * 1.2)))   },
  { svc: "rabbitmq",  det: "amq · ops",         ms: (t) => 9  + Math.floor(Math.sin(t * 0.6) * 3)         },
  { svc: "s3",        det: "us-east-1",         ms: (t) => 28 + Math.floor(Math.sin(t * 0.5) * 6)         },
  { svc: "mapbox",    det: "tiles · v3",        ms: (t) => 41 + Math.floor(Math.sin(t * 0.4) * 8)         },
  { svc: "anthropic", det: "claude-4.6",        ms: (t) => 320 + Math.floor(Math.sin(t * 0.3) * 40)       },
  { svc: "agent-gw",  det: "orchestrator",      ms: (t) => 11 + Math.floor(Math.sin(t * 1.1) * 2)         },
  { svc: "ws-bridge", det: "socket.io",         ms: (t) => 7  + Math.floor(Math.sin(t * 1.3) * 2)         },
];

export function drawApiHealth(ctx: CanvasRenderingContext2D, t: number, p: SceneParams) {
  clear(ctx);
  bgGrid(ctx);
  titlebar(ctx, p.accentHex, "ops/api — production · us-east-1 · live");

  // Left column — request log
  const lx = 24, ly = 56, lw = 600, lh = H - 90;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(lx, ly, lw, lh);
  ctx.fillStyle = "#5a605a";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillText(
    "HTTP REQUESTS · last 60s · " + (820 + Math.floor(Math.sin(t * 0.4) * 30)) + " req/s",
    lx + 12, ly + 18,
  );

  ctx.font = "12px JetBrains Mono, monospace";
  const ry = ly + 38;
  const stride = 18;
  const rows = 25;
  const scroll = (t * stride * 1.6) % stride;
  for (let i = 0; i < rows; i++) {
    const y = ry + i * stride - scroll;
    if (y < ly + 32 || y > ly + lh - 6) continue;
    const seed = Math.floor(t * 1.6 + i);
    const ep = ENDPOINTS[(seed * 7) % ENDPOINTS.length];
    const ms = Math.max(2, ep.base + Math.floor(Math.sin(seed * 1.3) * 8));
    const mColor = ep.m === "GET"  ? "#" + p.accentHex
                : ep.m === "POST" ? "#ffd166"
                : ep.m === "PUT"  ? "#9be8ff"
                :                   "#ff7a45";
    ctx.fillStyle = "#5a605a";
    ctx.fillText("[" + String(seed).padStart(4, "0") + "]", lx + 12, y);
    ctx.fillStyle = mColor;
    ctx.fillText(ep.m.padEnd(5, " "), lx + 70, y);
    ctx.fillStyle = "#e9efe6";
    ctx.fillText(ep.p, lx + 120, y);
    ctx.fillStyle = "#" + p.accentHex;
    ctx.fillText(String(ep.status), lx + 410, y);
    const barW = Math.min(80, ms);
    ctx.fillStyle = ms < 30 ? "#" + p.accentHex : ms < 100 ? "#ffd166" : "#ff7a45";
    ctx.fillRect(lx + 450, y - 9, barW, 10);
    ctx.fillStyle = "#8a948a";
    ctx.fillText(ms + "ms", lx + 540, y);
  }

  // Right column — health checks
  const hx = 644, hy = 56, hw = W - hx - 24, hh = H - 90;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.strokeRect(hx, hy, hw, hh);
  ctx.fillStyle = "#5a605a";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillText("HEALTH · system probes · 1Hz", hx + 12, hy + 18);

  ctx.font = "12px JetBrains Mono, monospace";
  HEALTH.forEach((h, i) => {
    const y = hy + 44 + i * 32;
    const pulse = Math.sin(t * 3 + i) * 0.5 + 0.5;
    ctx.fillStyle = "#" + p.accentHex;
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    ctx.beginPath(); ctx.arc(hx + 14, y - 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e9efe6";
    ctx.fillText(h.svc, hx + 26, y);
    ctx.fillStyle = "#5a605a";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(h.det, hx + 26, y + 12);
    ctx.font = "12px JetBrains Mono, monospace";
    const ms = h.ms(t);
    ctx.fillStyle = ms < 50 ? "#" + p.accentHex : ms < 200 ? "#ffd166" : "#ff7a45";
    ctx.fillText(ms + "ms", hx + hw - 60, y);
    ctx.fillStyle = "#5a605a";
    ctx.fillText("OK", hx + hw - 28, y);
  });

  // bottom statusbar
  ctx.fillStyle = "#" + p.accentHex;
  ctx.fillRect(0, H - 24, W, 24);
  ctx.fillStyle = "#070907";
  ctx.font = "12px JetBrains Mono, monospace";
  ctx.fillText("● production · p50 18ms · p95 64ms · p99 142ms · 0 errors", 12, H - 8);

  scanlines(ctx);
}
