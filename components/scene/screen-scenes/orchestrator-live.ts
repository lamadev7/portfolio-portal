/**
 * SCENE 6 — TRIAGE AGENT WORKFLOW
 * A pipeline visualization of how Triage Agent actually works:
 *   ticket → orchestrator → qa(reproduce) → dev(fix) → qa(verify) → review → pr+comment.
 *
 * Each stage progresses through pending → incoming → working → settling → done,
 * with animated packets flowing along the connectors and a live dispatch log
 * below narrating the actual operations.
 */
import { W, H, clear, bgGrid, titlebar, scanlines, type SceneParams } from "./helpers";

interface Stage {
  id: string;
  label: string;
  sub: string;
  role: string;
  tag: string;
}

const STAGES: Stage[] = [
  { id: "ticket", label: "ticket",       sub: "[JIRA] SKLR-1284", role: "input",  tag: "" },
  { id: "orch",   label: "orchestrator", sub: "auto-route",       role: "router", tag: "claude · MCP" },
  { id: "qa1",    label: "qa",           sub: "reproduce bug",    role: "agent",  tag: "no write/push" },
  { id: "dev",    label: "dev",          sub: "fix · branch",     role: "agent",  tag: "write + push" },
  { id: "qa2",    label: "qa",           sub: "verify fix",       role: "agent",  tag: "qa on live app" },
  { id: "review", label: "review",       sub: "read pr",          role: "agent",  tag: "no write" },
  { id: "pr",     label: "pr · comment", sub: "→ ticket",         role: "output", tag: "" },
];

const LOGS = [
  "[00] orchestrator received ticket SKLR-1284 · jira REST",
  "[01] orchestrator.classify() → bug · routes=[qa, dev, qa, review]",
  "[02] qa.reproduce() · zoekt indexed search · 4 repos",
  "[03]   ↳ login via mcp__triage-domain-login · 198ms",
  "[04]   ↳ playwright nav /loads/7841 · error confirmed",
  "[05] ✓ qa.handoff(dev) · evidence: stack_trace, repro_steps",
  "[06] dev.fetch_context() · 4 files · cross-repo refs",
  "[07]   ↳ edits: src/api/loads.ts · src/lib/validate.ts",
  "[08]   ↳ build: green · tests: 12 passing · branch fix/sklr-1284",
  "[09] ✓ dev.handoff(qa) · pr_url, files_changed, build=green",
  "[10] qa.verify() · target dev server on :3047",
  "[11]   ↳ playwright replay scenario · passes",
  "[12] ✓ qa.handoff(review) · verified=true",
  "[13] review.read_pr() · diff +24 -11 · clean",
  "[14] ✓ review.approve() · pr ready for merge",
  "[15] orchestrator.comment_back() · jira PR linked",
  "[16] ✓ session complete · 1m 47s · 89 turns · cache 92%",
];

type StageState = "pending" | "incoming" | "working" | "settling" | "done";

export function drawOrchestratorLive(ctx: CanvasRenderingContext2D, t: number, p: SceneParams) {
  clear(ctx);
  bgGrid(ctx);
  titlebar(ctx, p.accentHex, "triage-agent.workflow · live · 1 session in-flight");

  const n = STAGES.length;
  const boxW = 110, boxH = 78;
  const gap = 20;
  const totalW = n * boxW + (n - 1) * gap;
  const startX = (W - totalW) / 2;
  const y = 110;

  // Cycle: each stage 2s + 1.5s tail "complete"
  const stageDur = 2.0;
  const cycleS = n * stageDur + 1.5;
  const ct = t % cycleS;
  const activeIdx = Math.min(n - 1, Math.floor(ct / stageDur));
  const stageT = ct - activeIdx * stageDur;
  const cycleComplete = ct > n * stageDur;

  function stageState(i: number): StageState {
    if (cycleComplete) return "done";
    if (i < activeIdx) return "done";
    if (i > activeIdx) return "pending";
    if (stageT < 0.6) return "incoming";
    if (stageT < 1.7) return "working";
    return "settling";
  }

  // ---- CONNECTORS ----
  for (let i = 0; i < n - 1; i++) {
    const x1 = startX + i * (boxW + gap) + boxW;
    const x2 = startX + (i + 1) * (boxW + gap);
    const cy = y + boxH / 2;
    const prevDone = stageState(i) === "done";
    const isLive = stageState(i + 1) === "incoming";

    ctx.strokeStyle = prevDone || isLive ? "#" + p.accentHex : "rgba(255,255,255,0.12)";
    ctx.globalAlpha = isLive ? 1 : prevDone ? 0.55 : 1;
    ctx.lineWidth = 1;
    ctx.setLineDash(isLive ? [4, 3] : prevDone ? [] : [2, 4]);
    ctx.lineDashOffset = isLive ? -(t * 30) : 0;
    ctx.beginPath();
    ctx.moveTo(x1, cy);
    ctx.lineTo(x2 - 6, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    if (prevDone || isLive) {
      ctx.fillStyle = "#" + p.accentHex;
      ctx.beginPath();
      ctx.moveTo(x2, cy);
      ctx.lineTo(x2 - 6, cy - 4);
      ctx.lineTo(x2 - 6, cy + 4);
      ctx.closePath();
      ctx.fill();
    }

    if (isLive) {
      const f = Math.min(1, stageT / 0.6);
      const px = x1 + (x2 - x1) * f;
      ctx.fillStyle = "#" + p.accentHex;
      ctx.beginPath(); ctx.arc(px, cy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(200,255,44,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, cy, 8 + Math.sin(t * 12) * 2, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ---- STAGE BOXES ----
  STAGES.forEach((stage, i) => {
    const x = startX + i * (boxW + gap);
    const state = stageState(i);
    const isActive = state === "working" || state === "incoming" || state === "settling";
    const isDone = state === "done";

    ctx.fillStyle = isActive
      ? "rgba(200,255,44,0.10)"
      : isDone
        ? "rgba(200,255,44,0.04)"
        : "rgba(15,17,15,0.85)";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = isActive
      ? "#" + p.accentHex
      : isDone
        ? "rgba(200,255,44,0.35)"
        : "rgba(255,255,255,0.15)";
    ctx.lineWidth = isActive ? 1.8 : 1;
    ctx.strokeRect(x, y, boxW, boxH);

    if (state === "working") {
      const pp = Math.sin(t * 6) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(200,255,44,${0.25 + pp * 0.35})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 2 - pp * 2, y - 2 - pp * 2, boxW + 4 + pp * 4, boxH + 4 + pp * 4);
    }

    // corner ticks
    ctx.strokeStyle = isActive || isDone ? "#" + p.accentHex : "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5;
    const k = 8;
    ([[0,0,1,1],[boxW,0,-1,1],[0,boxH,1,-1],[boxW,boxH,-1,-1]] as const).forEach(([dx, dy, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx + sx * k, y + dy);
      ctx.lineTo(x + dx, y + dy);
      ctx.lineTo(x + dx, y + dy + sy * k);
      ctx.stroke();
    });

    // status icon top-right
    const ix = x + boxW - 14, iy = y + 14;
    if (isDone) {
      ctx.strokeStyle = "#" + p.accentHex;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ix - 5, iy);
      ctx.lineTo(ix - 2, iy + 4);
      ctx.lineTo(ix + 5, iy - 4);
      ctx.stroke();
    } else if (state === "working") {
      const a = (t * 6) % (Math.PI * 2);
      ctx.strokeStyle = "#" + p.accentHex;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(ix, iy, 5, a, a + Math.PI * 1.4);
      ctx.stroke();
    } else if (isActive) {
      ctx.fillStyle = "#" + p.accentHex;
      ctx.beginPath(); ctx.arc(ix, iy, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ix, iy, 3, 0, Math.PI * 2); ctx.stroke();
    }

    // role tag
    ctx.fillStyle = isActive || isDone ? "rgba(200,255,44,0.7)" : "rgba(255,255,255,0.3)";
    ctx.font = "8.5px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(stage.role.toUpperCase(), x + 8, y + 17);

    // main label
    ctx.fillStyle = isActive ? "#" + p.accentHex : "#e9efe6";
    ctx.font = "bold 14px JetBrains Mono, monospace";
    ctx.fillText(stage.label, x + 8, y + 38);

    // sub label
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText(stage.sub, x + 8, y + 54);

    // bottom tag
    if (stage.tag) {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = "8px JetBrains Mono, monospace";
      ctx.fillText(stage.tag, x + 8, y + 70);
    }
  });

  // ---- PHASE NARRATION ----
  const px = 60, py = y + boxH + 24, pw = W - 120, ph = 52;
  ctx.fillStyle = "rgba(15,17,15,0.7)";
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.strokeRect(px, py, pw, ph);

  const progress = cycleComplete ? 1 : (activeIdx + Math.min(1, stageT / 1.7)) / n;
  ctx.fillStyle = "rgba(200,255,44,0.15)";
  ctx.fillRect(px + 2, py + ph - 4, pw - 4, 2);
  ctx.fillStyle = "#" + p.accentHex;
  ctx.fillRect(px + 2, py + ph - 4, (pw - 4) * progress, 2);

  const cur = STAGES[Math.min(activeIdx, n - 1)];
  const curState = cycleComplete ? "done" : stageState(activeIdx);
  const phaseTxt =
      curState === "incoming"  ? `→ handoff received · ${cur.label} agent activating`
    : curState === "working"   ? `${cur.label}.run() · in-flight · turn ${Math.floor(stageT * 8) + 3}/60 · zoekt=on`
    : curState === "settling"  ? `✓ ${cur.label} ok · emitting handoff with evidence`
                               : "✓ workflow complete · PR opened · comment posted to jira";

  ctx.fillStyle = "#" + p.accentHex;
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillText("CURRENT PHASE", px + 14, py + 16);
  ctx.fillStyle = "#e9efe6";
  ctx.font = "13px JetBrains Mono, monospace";
  ctx.fillText(phaseTxt, px + 14, py + 36);

  ctx.fillStyle = "#5a605a";
  ctx.font = "9px JetBrains Mono, monospace";
  ctx.fillText(`session r7f9k · uptime 1m ${Math.floor(stageT * 30)}s`, px + pw - 200, py + 16);
  ctx.fillStyle = "rgba(200,255,44,0.55)";
  ctx.fillText(`turns ${Math.min(89, Math.floor(progress * 89))}/200 · cache 92%`, px + pw - 200, py + 36);

  // ---- DISPATCH LOG ----
  const lx = 60, ly = py + ph + 18, lw = W - 120, lh = H - ly - 38;
  ctx.fillStyle = "rgba(15,17,15,0.8)";
  ctx.fillRect(lx, ly, lw, lh);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.strokeRect(lx, ly, lw, lh);
  ctx.fillStyle = "#5a605a";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillText("DISPATCH LOG · ticket SKLR-1284 · session r7f9k", lx + 14, ly + 18);

  const ratio = cycleComplete ? 1 : (activeIdx + stageT / stageDur) / n;
  const logsToShow = Math.min(LOGS.length, Math.ceil(ratio * LOGS.length));
  const visible = LOGS.slice(0, logsToShow);
  ctx.font = "11.5px JetBrains Mono, monospace";
  const lineH = 16;
  const maxRows = Math.floor((lh - 30) / lineH);
  const startI = Math.max(0, visible.length - maxRows);
  for (let i = startI; i < visible.length; i++) {
    const m = visible[i];
    const ly2 = ly + 34 + (i - startI) * lineH;
    const isOk = m.includes("✓");
    const isSub = m.includes("↳") || m.includes("→");
    ctx.fillStyle = isOk ? "#" + p.accentHex : isSub ? "rgba(200,255,44,0.65)" : "#e9efe6";
    ctx.fillText(m, lx + 14, ly2);
  }

  // bottom statusbar
  ctx.fillStyle = "#" + p.accentHex;
  ctx.fillRect(0, H - 24, W, 24);
  ctx.fillStyle = "#070907";
  ctx.font = "12px JetBrains Mono, monospace";
  ctx.fillText(
    cycleComplete
      ? "● PR #4421 opened · jira comment posted · session resumable · MCP tools healthy"
      : "● claude agent sdk · 5 specialists · turn budget qa=60 dev=50 plan=30 review=40 orch=12",
    12, H - 8,
  );

  scanlines(ctx);
}
