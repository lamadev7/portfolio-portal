/**
 * Shared canvas-2D helpers + token type used by all monitor screen scenes.
 */

export const W = 1024;
export const H = 600;

export interface SceneParams {
  accentHex: string;
}

export interface Token {
  c: "kw" | "ty" | "fn" | "id" | "st" | "cm" | "tg" | "tx";
  t: string;
}

export type Row = Token[];

export function clear(ctx: CanvasRenderingContext2D, bg = "#070907") {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
}

export function bgGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
}

export function titlebar(ctx: CanvasRenderingContext2D, accent: string, title: string) {
  ctx.fillStyle = "rgba(200,255,44,0.08)";
  ctx.fillRect(0, 0, W, 36);
  ctx.fillStyle = "#" + accent;
  ctx.fillRect(10, 10, 14, 14);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "16px JetBrains Mono, monospace";
  ctx.fillText(title, 32, 23);
}

export function scanlines(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}

export function blink(t: number, hz = 1.6) {
  return Math.floor(t * hz) % 2 === 0;
}

export function colorFor(kind: Token["c"], p: SceneParams): string {
  switch (kind) {
    case "kw": return "#" + p.accentHex;
    case "ty": return "#9be8ff";
    case "fn": return "#ffd166";
    case "id": return "#e9efe6";
    case "st": return "#a3e0a3";
    case "cm": return "#5a605a";
    case "tg": return "#ff9bbd";
    default:   return "#8a948a";
  }
}

export function tokensToRows(tokens: (Token | "\n")[]): Row[] {
  const rows: Row[] = [[]];
  tokens.forEach((tok) => {
    if (tok === "\n") rows.push([]);
    else rows[rows.length - 1].push(tok);
  });
  return rows;
}

/**
 * Generic code typewriter renderer — used by react-code, express-code,
 * agents-code scenes. Reveals rows char-by-char over `revealS` seconds.
 */
export interface CodeOpts {
  revealS?: number;
  cycleS?: number;
}

export function drawCodeWith(
  ctx: CanvasRenderingContext2D,
  t: number,
  p: SceneParams,
  title: string,
  statusbar: string,
  ROWS: Row[],
  opts: CodeOpts = {},
) {
  const revealS = opts.revealS ?? 4.5;
  const cycleS = opts.cycleS ?? 6.0;

  clear(ctx);
  bgGrid(ctx);
  titlebar(ctx, p.accentHex, title);

  ctx.fillStyle = "rgba(255,255,255,0.025)";
  ctx.fillRect(0, 36, 56, H - 36);

  const lineH = 22;
  const startY = 62;
  const total = ROWS.length;
  const cy = t % cycleS;
  const cursorRow = Math.min(total - 1, Math.floor((cy / revealS) * total));
  const lastRowFrac = Math.min(1, (cy / revealS) * total - cursorRow);

  ctx.fillStyle = "rgba(200,255,44,0.05)";
  ctx.fillRect(56, startY - 16 + cursorRow * lineH, W - 56, lineH);

  ROWS.forEach((row, ri) => {
    const y = startY + ri * lineH;
    ctx.fillStyle = ri === cursorRow ? "#" + p.accentHex : "#3a423a";
    ctx.font = "12px JetBrains Mono, monospace";
    ctx.fillText(String(ri + 1).padStart(2, " "), 18, y - 4);

    let x = 70;
    ctx.font = "17px JetBrains Mono, monospace";
    const revealFrac = ri < cursorRow ? 1 : ri === cursorRow ? lastRowFrac : 0;
    const rowText = row.map((tk) => tk.t).join("");
    const charsToShow = Math.floor(rowText.length * revealFrac);
    let charsShown = 0;
    for (let i = 0; i < row.length; i++) {
      const tok = row[i];
      const remaining = charsToShow - charsShown;
      if (remaining <= 0 && ri >= cursorRow) break;
      const showText = ri < cursorRow ? tok.t : tok.t.slice(0, remaining);
      charsShown += showText.length;
      ctx.fillStyle = colorFor(tok.c, p);
      ctx.fillText(showText, x, y);
      x += ctx.measureText(showText).width;
      if (ri === cursorRow && remaining < tok.t.length) {
        if (blink(t, 3)) {
          ctx.fillStyle = "#" + p.accentHex;
          ctx.fillRect(x + 1, y - 14, 8, 17);
        }
        break;
      }
    }
  });

  // statusbar
  ctx.fillStyle = "#" + p.accentHex;
  ctx.fillRect(0, H - 24, W, 24);
  ctx.fillStyle = "#070907";
  ctx.font = "12px JetBrains Mono, monospace";
  ctx.fillText(statusbar, 12, H - 8);
  ctx.fillText("Ln " + (cursorRow + 1) + ", Col " + (Math.floor(t * 8) % 40), W - 200, H - 8);

  scanlines(ctx);
}
