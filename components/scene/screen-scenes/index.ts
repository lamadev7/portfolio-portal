/**
 * Director — orchestrates the 6 monitor screen scenes into a cycle:
 *   react → dashboard → express → api-health → agents → orchestrator-live
 * Each pair is "code → result". Total cycle ≈ 42s.
 */
import { W, H, type SceneParams } from "./helpers";
import { drawReactCode } from "./react-code";
import { drawDashboard } from "./dashboard";
import { drawExpressCode } from "./express-code";
import { drawApiHealth } from "./api-health";
import { drawAgentsCode } from "./agents-code";
import { drawOrchestratorLive } from "./orchestrator-live";

interface SceneEntry {
  name: string;
  draw: (ctx: CanvasRenderingContext2D, t: number, p: SceneParams) => void;
  duration: number;
}

const SCENES: SceneEntry[] = [
  { name: "react",        draw: drawReactCode,        duration: 6.0 },
  { name: "dashboard",    draw: drawDashboard,        duration: 8.0 },
  { name: "express",      draw: drawExpressCode,      duration: 6.0 },
  { name: "api-health",   draw: drawApiHealth,        duration: 8.0 },
  { name: "agents-code",  draw: drawAgentsCode,       duration: 6.0 },
  { name: "orchestrator", draw: drawOrchestratorLive, duration: 8.0 },
];

const FADE_DUR = 0.55;
const TOTAL = SCENES.reduce((a, s) => a + s.duration, 0);

function sceneAt(t: number): { idx: number; intra: number; dur: number } {
  const tt = t % TOTAL;
  let acc = 0;
  for (let i = 0; i < SCENES.length; i++) {
    if (tt < acc + SCENES[i].duration) {
      return { idx: i, intra: tt - acc, dur: SCENES[i].duration };
    }
    acc += SCENES[i].duration;
  }
  return { idx: 0, intra: 0, dur: SCENES[0].duration };
}

/**
 * Public entry point — draws the appropriate scene onto the monitor canvas.
 * Called every frame from Scene.tsx.
 */
export function drawScreen(ctx: CanvasRenderingContext2D, t: number, accentHex: string) {
  const p: SceneParams = { accentHex };
  const { idx, intra, dur } = sceneAt(t);

  SCENES[idx].draw(ctx, t, p);

  // fade out near end of scene
  if (intra > dur - FADE_DUR) {
    const f = (intra - (dur - FADE_DUR)) / FADE_DUR;
    ctx.fillStyle = `rgba(7,9,7,${f * 0.85})`;
    ctx.fillRect(0, 0, W, H);
    const ly = H * f;
    ctx.fillStyle = "#" + accentHex;
    ctx.globalAlpha = 1 - f;
    ctx.fillRect(0, ly - 1, W, 2);
    ctx.globalAlpha = 1;
  }
  // fade in at start of scene
  if (intra < FADE_DUR) {
    const f = 1 - intra / FADE_DUR;
    ctx.fillStyle = `rgba(7,9,7,${f * 0.85})`;
    ctx.fillRect(0, 0, W, H);
  }

  // scene label corner
  ctx.fillStyle = "#5a605a";
  ctx.font = "10px JetBrains Mono, monospace";
  const label = "SCENE " + String(idx + 1).padStart(2, "0") + " / 06 · " + SCENES[idx].name.toUpperCase();
  ctx.fillText(label, W - ctx.measureText(label).width - 12, H - 36);
}

export { W, H };
