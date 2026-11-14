import { fitText, SANS, SANS_R, type Atlas } from "./tex";

/* sign artwork painted into a scene atlas */

export function uniglobeLogo(g: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4);
  g.fillStyle = "#d8262f"; g.fillRect(-s / 2, -s / 2, s, s);
  g.fillStyle = "#fff"; g.fillRect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72);
  g.fillStyle = "#1f4fa0"; g.fillRect(-s * 0.26, -s * 0.26, s * 0.52, s * 0.52);
  g.rotate(-Math.PI / 4); g.strokeStyle = "#fff"; g.lineWidth = s * 0.05;
  g.beginPath(); g.arc(0, 0, s * 0.2, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(0, 0, s * 0.09, s * 0.2, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(-s * 0.2, 0); g.lineTo(s * 0.2, 0); g.stroke();
  g.restore();
}

export function uniglobeTowerSign(a: Atlas) {
  return a.put(600, 220, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#14936a"); gr.addColorStop(1, "#0c6e4f");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20);
    uniglobeLogo(g, 110, h / 2, 104);
    g.fillStyle = "#ffffff"; fitText(g, "UNIGLOBE", 380, h * 0.4, 380, SANS, 86);
    fitText(g, "S C H O O L", 380, h * 0.74, 300, SANS, 50);
  });
}

export function uniglobeCanopySign(a: Atlas) {
  return a.put(1000, 150, (g, w, h) => {
    g.fillStyle = "#dfe3e0"; g.fillRect(0, 0, w, h);
    uniglobeLogo(g, 300, h / 2, 86);
    g.fillStyle = "#1e2a55"; fitText(g, "UNIGLOBE", 560, h * 0.42, 380, SANS, 84);
    g.fillStyle = "#13865f"; fitText(g, "SS / College", 560, h * 0.82, 260, SANS_R, 30);
  });
}

export function uniglobeBanner(a: Atlas) {
  return a.put(220, 560, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1c4f9c"); gr.addColorStop(1, "#0f2f66"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, 110);
    uniglobeLogo(g, 46, 55, 50);
    g.fillStyle = "#1e2a55"; fitText(g, "UNIGLOBE", 140, 44, 140, SANS, 30); g.fillStyle = "#13865f"; fitText(g, "SCHOOL", 140, 80, 120, SANS, 22);
    g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.arc(w / 2, 300, 80, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff"; fitText(g, "SS / College", w / 2, 470, w - 30, SANS, 30); fitText(g, "Kamaladi", w / 2, 515, w - 30, SANS_R, 24);
  });
}

export function busLivery(a: Atlas) {
  return a.put(700, 120, (g, w, h) => {
    g.fillStyle = "#f3f1ea"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#13865f"; g.fillRect(0, h * 0.62, w, h * 0.2);
    uniglobeLogo(g, 60, h * 0.35, 54);
    g.fillStyle = "#13865f"; fitText(g, "UNIGLOBE SS / COLLEGE", 380, h * 0.33, 560, SANS, 44);
  });
}

export function courtTex(a: Atlas) {
  return a.put(300, 560, (g, w, h) => {
    g.fillStyle = "#2a6b4e"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2c4f86"; g.fillRect(18, 18, w - 36, h - 36);
    g.strokeStyle = "#f2f2f2"; g.lineWidth = 3; g.strokeRect(18, 18, w - 36, h - 36);
    g.beginPath(); g.moveTo(18, h / 2); g.lineTo(w - 18, h / 2); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 40, 0, Math.PI * 2); g.stroke();
    for (const s of [1, -1]) {
      const y = s > 0 ? 18 : h - 18;
      g.strokeRect(w / 2 - 45, s > 0 ? y : y - 105, 90, 105);
      g.beginPath(); g.arc(w / 2, y + s * 105, 45, s > 0 ? 0 : Math.PI, s > 0 ? Math.PI : Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(w / 2, y, 120, s > 0 ? 0.15 : Math.PI + 0.15, s > 0 ? Math.PI - 0.15 : Math.PI * 2 - 0.15); g.stroke();
    }
    g.fillStyle = "rgba(0,0,0,0.1)"; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, (i * 151) % h, 30, 20);
  });
}

export function plainText(a: Atlas, w: number, h: number, bg: string, fg: string, lines: { t: string; y: number; px: number; font?: (p: number) => string; color?: string }[]) {
  return a.put(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); for (const l of lines) { g.fillStyle = l.color ?? fg; fitText(g, l.t, w / 2, h * l.y, w - 20, l.font ?? SANS, l.px); } });
}

export function heraldMark(g: CanvasRenderingContext2D, x: number, y: number, s: number, fg = "#8dc63f", bg = "#ffffff") {
  g.fillStyle = fg; g.fillRect(x, y, s, s);
  g.fillStyle = bg; const u = s / 10;
  g.fillRect(x + 2 * u, y + 2 * u, 1.6 * u, 6 * u); g.fillRect(x + 6.4 * u, y + 2 * u, 1.6 * u, 6 * u); g.fillRect(x + 2 * u, y + 4.3 * u, 6 * u, 1.4 * u);
  g.fillRect(x + 4.2 * u, y + 2 * u, 1.6 * u, 2.3 * u);
}

export function heraldWordmark(a: Atlas, w: number, h: number, o: { bg: string; fg: string; sub?: string; mark?: string }) {
  return a.put(w, h, (g) => {
    g.fillStyle = o.bg; g.fillRect(0, 0, w, h);
    const s = h * 0.62; heraldMark(g, h * 0.2, (h - s) / 2, s, o.mark ?? "#8dc63f", o.bg === "transparent" ? "#fff" : o.bg);
    g.fillStyle = o.fg; g.textAlign = "left"; g.textBaseline = "middle";
    g.font = `800 ${h * 0.34}px "Helvetica Neue", Arial, sans-serif`; g.fillText("HERALD COLLEGE", h * 0.2 + s + h * 0.18, h * 0.38);
    g.font = `500 ${h * 0.2}px "Helvetica Neue", Arial, sans-serif`; g.fillText(o.sub ?? "KATHMANDU", h * 0.2 + s + h * 0.2, h * 0.72);
  });
}

export function ingLogo(a: Atlas) {
  return a.put(360, 140, (g, w, h) => {
    g.fillStyle = "#8fc46a"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#f4f8ef"; g.lineWidth = 6; g.strokeRect(20, 22, 70, 96);
    g.fillStyle = "#f4f8ef"; g.fillRect(36, 38, 10, 64); g.fillRect(58, 38, 10, 64); g.fillRect(36, 66, 32, 8);
    g.font = '700 64px "Helvetica Neue", Arial, sans-serif'; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("ING", 112, 64);
    g.font = '500 30px "Helvetica Neue", Arial, sans-serif'; g.fillText("Group", 236, 74);
  });
}

export function awardBanner(a: Atlas, year: number, accent: string) {
  return a.put(1400, 420, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#0c2a1c"); gr.addColorStop(0.55, "#103a26"); gr.addColorStop(1, "#06140d");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(w * 0.68, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(w * 0.86, h); g.closePath(); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = accent; g.lineWidth = 6; g.beginPath(); g.moveTo(40, h - 40); g.lineTo(w * 0.62, h - 40); g.stroke();
    heraldMark(g, 60, 50, 90, "#8dc63f", "#0c2a1c");
    g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "middle";
    g.font = '800 46px "Helvetica Neue", Arial, sans-serif'; g.fillText("HERALD COLLEGE KATHMANDU", 175, 80);
    g.font = '900 120px "Helvetica Neue", Arial, sans-serif'; g.fillStyle = "#e9f6d8"; g.fillText("AAA SCHOLARSHIP", 60, 220);
    g.font = '800 96px "Helvetica Neue", Arial, sans-serif'; g.fillStyle = accent; g.fillText(String(year), 60, 320);
    g.font = '500 34px "Helvetica Neue", Arial, sans-serif'; g.fillStyle = "#cfe3c4"; g.fillText("Award Ceremony", 330, 325);
  });
}

export function slideTex(a: Atlas) {
  return a.put(640, 360, (g, w, h) => {
    g.fillStyle = "#f5f7fa"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#14324f"; g.fillRect(0, 0, w, 60);
    g.fillStyle = "#fff"; g.font = '700 28px "Helvetica Neue", Arial, sans-serif'; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("Final Year Project · Demo", 24, 31);
    heraldMark(g, w - 52, 12, 36, "#8dc63f", "#14324f");
    g.fillStyle = "#e3e9f1"; g.fillRect(24, 84, 280, 240); g.fillRect(330, 84, 286, 110); g.fillRect(330, 212, 286, 112);
    g.fillStyle = "#2f7de1"; for (let i = 0; i < 8; i++) { const v = [60, 110, 80, 150, 120, 170, 140, 190][i]; g.fillRect(44 + i * 32, 310 - v, 20, v); }
    g.strokeStyle = "#14b88a"; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 10; i++) { const x = 345 + i * 26, y = 170 - Math.sin(i * 0.8) * 30 - i * 4; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = "#14324f"; for (let i = 0; i < 4; i++) g.fillRect(345, 228 + i * 22, 200 - i * 30, 10);
  });
}

export function gradScreen(a: Atlas) {
  return a.put(900, 500, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f7f8f4"); gr.addColorStop(1, "#dfe6dc"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(141,198,63,0.18)"; g.lineWidth = 2; for (let i = -10; i < 30; i++) { g.beginPath(); g.moveTo(i * 40, h); g.lineTo(i * 40 + 300, 0); g.stroke(); }
    heraldMark(g, 250, 60, 70, "#2aa05a", "#f7f8f4");
    g.fillStyle = "#1f3a2a"; g.textAlign = "left"; g.textBaseline = "middle";
    g.font = '800 34px "Helvetica Neue", Arial'; g.fillText("HERALD", 334, 82); g.font = '700 26px "Helvetica Neue", Arial'; g.fillText("COLLEGE", 334, 114);
    g.fillStyle = "#2aa05a"; g.fillRect(470, 66, 3, 64); g.font = '800 40px "Helvetica Neue", Arial'; g.fillText("ing", 490, 98);
    g.textAlign = "center"; g.fillStyle = "#b8862a"; g.font = '900 96px Georgia, "Times New Roman", serif'; g.fillText("GRADUATION", w / 2, 270);
    g.fillStyle = "#3a5a40"; g.font = '700 54px Georgia, "Times New Roman", serif'; g.fillText("C E R E M O N Y", w / 2, 360);
    g.fillStyle = "#2aa05a"; g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
  });
}

export function gradSide(a: Atlas) {
  return a.put(600, 340, (g, w, h) => {
    g.fillStyle = "#f2f4ef"; g.fillRect(0, 0, w, h);
    heraldMark(g, 150, 110, 80, "#2aa05a", "#f2f4ef");
    g.fillStyle = "#1f3a2a"; g.textAlign = "left"; g.textBaseline = "middle"; g.font = '800 36px "Helvetica Neue", Arial'; g.fillText("HERALD", 245, 135); g.font = '700 26px "Helvetica Neue", Arial'; g.fillText("COLLEGE", 245, 170);
    g.fillStyle = "#2aa05a"; g.font = '800 44px "Helvetica Neue", Arial'; g.fillText("ing", 390, 152);
    g.fillStyle = "#b8862a"; g.textAlign = "center"; g.font = '800 40px Georgia, serif'; g.fillText("GRADUATION CEREMONY", w / 2, 260);
  });
}

export function muralTex(a: Atlas) {
  return a.put(520, 420, (g, w, h) => {
    g.fillStyle = "#f6f4f0"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f2a83a"; g.beginPath(); g.roundRect(250, 30, 190, 360, 90); g.fill();
    g.fillStyle = "#e86d2a"; g.beginPath(); g.roundRect(30, 60, 120, 300, 60); g.fill();
    g.fillStyle = "#2a5f9e"; g.beginPath(); g.arc(270, 120, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#fff"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(240, 122); g.lineTo(262, 145); g.lineTo(302, 98); g.stroke();
    g.fillStyle = "#3aa5a8"; g.beginPath(); g.moveTo(170, 400); g.quadraticCurveTo(180, 250, 270, 240); g.quadraticCurveTo(360, 250, 370, 400); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(200, 270); g.quadraticCurveTo(150, 220, 160, 150); g.lineTo(190, 150); g.quadraticCurveTo(200, 220, 235, 255); g.closePath(); g.fill();
    g.fillStyle = "#c98a5a"; g.beginPath(); g.ellipse(272, 200, 30, 36, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1c1a24"; g.beginPath(); g.ellipse(272, 182, 40, 34, 0, Math.PI, Math.PI * 2); g.fill(); g.fillRect(232, 182, 18, 80); g.fillRect(294, 182, 18, 80);
    g.fillStyle = "#e8822a"; g.beginPath(); g.moveTo(120, 80); g.lineTo(220, 80); g.quadraticCurveTo(215, 150, 170, 160); g.quadraticCurveTo(125, 150, 120, 80); g.fill();
    g.fillRect(160, 158, 20, 22); g.fillRect(140, 178, 60, 12);
    g.fillStyle = "#fff"; g.font = '800 40px "Helvetica Neue", Arial'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("1", 170, 115);
    g.strokeStyle = "#2a2a2a"; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 395); g.lineTo(460, 395); g.stroke();
    g.fillStyle = "#2a5f9e"; g.beginPath(); g.moveTo(420, 60); g.lineTo(440, 80); g.lineTo(420, 80); g.fill(); g.fillStyle = "#e86d2a"; g.fillRect(70, 30, 14, 14);
  });
}

export function dashTex(a: Atlas, seed: number) {
  return a.put(480, 270, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#0d2a4a"); bg.addColorStop(1, "#0a1d36"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1a4a7a"; g.fillRect(0, 0, 70, h); g.fillStyle = "#cfe8ff"; for (let i = 0; i < 9; i++) g.fillRect(10, 20 + i * 26, 46 - (i * 7) % 20, 6);
    const panel = (x: number, y: number, pw: number, ph: number) => { g.fillStyle = "#123a63"; g.fillRect(x, y, pw, ph); g.strokeStyle = "#2c6aa8"; g.strokeRect(x, y, pw, ph); };
    panel(82, 12, 180, 110); panel(272, 12, 196, 110); panel(82, 132, 386, 126);
    g.fillStyle = "#5fd0ff"; for (let i = 0; i < 12; i++) { const v = 20 + ((i * 53 + seed * 31) % 70); g.fillRect(92 + i * 14, 112 - v, 9, v); }
    g.strokeStyle = "#7af0c8"; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 18; i++) { const x = 282 + i * 10, y = 90 - Math.sin(i * 0.6 + seed) * 22 - i; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.strokeStyle = "#5fd0ff"; g.lineWidth = 12; g.beginPath(); g.arc(400, 60, 26, -1.5, 2.6); g.stroke(); g.strokeStyle = "#2c6aa8"; g.beginPath(); g.arc(400, 60, 26, 2.6, 4.8); g.stroke();
    g.fillStyle = "#8fd8ff"; for (let i = 0; i < 30; i++) { const v = 14 + ((i * 37 + seed * 17) % 90); g.fillRect(96 + i * 12, 248 - v, 8, v); }
    g.fillStyle = "#cfe8ff"; for (let i = 0; i < 5; i++) g.fillRect(286, 18 + i * 9, 60 - i * 8, 4);
  });
}

export function codeTex(a: Atlas) {
  return a.put(640, 400, (g, w, h) => {
    g.fillStyle = "#1e1e24"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2a2a33"; g.fillRect(0, 0, w, 26); g.fillStyle = "#16161b"; g.fillRect(0, 26, 120, h);
    g.fillStyle = "#8a8aa0"; g.font = '13px Menlo, Monaco, monospace'; g.textBaseline = "middle";
    g.fillText("page.tsx", 140, 13); g.fillText("tailwind.config.ts", 230, 13);
    ["app", " layout.tsx", " page.tsx", "components", " Hero.tsx", " Card.tsx", "lib", "package.json", "tsconfig.json"].forEach((t, i) => g.fillText(t, 10, 44 + i * 20));
    const L: [string, string][][] = [
      [["import", "#c586c0"], [" { Hero } ", "#d4d4d4"], ["from", "#c586c0"], [' "@/components/Hero"', "#ce9178"]],
      [["import", "#c586c0"], [" type", "#569cd6"], [" { Metadata } ", "#d4d4d4"], ["from", "#c586c0"], [' "next"', "#ce9178"]],
      [],
      [["export const", "#569cd6"], [" metadata", "#9cdcfe"], [": ", "#d4d4d4"], ["Metadata", "#4ec9b0"], [" = { title: ", "#d4d4d4"], ['"Princelab"', "#ce9178"], [" };", "#d4d4d4"]],
      [],
      [["export default function", "#569cd6"], [" Page", "#dcdcaa"], ["() {", "#d4d4d4"]],
      [["  return", "#c586c0"], [" (", "#d4d4d4"]],
      [["    <main ", "#808080"], ["className", "#9cdcfe"], ['="flex min-h-screen flex-col', "#ce9178"]],
      [['      items-center gap-8 bg-slate-950 p-12"', "#ce9178"], [">", "#808080"]],
      [["      <Hero ", "#4ec9b0"], ["title", "#9cdcfe"], ["=", "#d4d4d4"], ['"Ship fast"', "#ce9178"], [" />", "#808080"]],
      [["      <section ", "#808080"], ["className", "#9cdcfe"], ['="grid grid-cols-3 gap-6"', "#ce9178"], [">", "#808080"]],
      [["        {cards.", "#d4d4d4"], ["map", "#dcdcaa"], ["((c) => ", "#d4d4d4"], ["<Card ", "#4ec9b0"], ["key", "#9cdcfe"], ["={c.id} {...c} />", "#d4d4d4"], [")}", "#d4d4d4"]],
      [["      </section>", "#808080"]],
      [["    </main>", "#808080"]],
      [["  );", "#d4d4d4"]],
      [["}", "#d4d4d4"]],
    ];
    L.forEach((line, i) => { let x = 170; g.fillStyle = "#5a5a6a"; g.fillText(String(i + 1).padStart(2, " "), 132, 44 + i * 20); for (const [t, c] of line) { g.fillStyle = c; g.fillText(t, x, 44 + i * 20); x += g.measureText(t).width; } });
    g.fillStyle = "#007acc"; g.fillRect(0, h - 20, w, 20); g.fillStyle = "#fff"; g.fillText("TypeScript React   Next.js 14   Tailwind CSS", 12, h - 10);
    g.fillStyle = "#aeafad"; g.fillRect(330, 44 + 9 * 20 - 8, 2, 16);
  });
}

export function nodeLabel(a: Atlas, text: string, color: string) {
  return a.put(320, 80, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = "rgba(0,0,0,0)"; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 4; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 18); g.stroke();
    g.fillStyle = color; g.font = '700 34px "Helvetica Neue", Arial'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 1);
  });
}

export function kalBhairav(a: Atlas) {
  return a.put(420, 520, (g, w, h) => {
    const bg = g.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, w * 0.7); bg.addColorStop(0, "#7a1a10"); bg.addColorStop(1, "#2a0806"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#d8a23a"; g.lineWidth = 10; g.beginPath(); g.moveTo(20, h); g.lineTo(20, 140); g.quadraticCurveTo(w / 2, -40, w - 20, 140); g.lineTo(w - 20, h); g.stroke();
    g.fillStyle = "#1b2440";
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.save(); g.translate(w / 2 + s * 70, 290); g.rotate(s * (0.5 + i * 0.45)); g.fillRect(-14, -150, 28, 150); g.fillStyle = "#d8a23a"; g.fillRect(-16, -110, 32, 10); g.fillRect(-10, -175, 20, 30); g.fillStyle = "#1b2440"; g.restore(); }
    g.beginPath(); g.ellipse(w / 2, 360, 95, 150, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f2efe6"; for (let i = 0; i < 11; i++) { const a = Math.PI * 0.15 + i * Math.PI * 0.07; g.beginPath(); g.arc(w / 2 + Math.cos(a) * 80, 250 + Math.sin(a) * 120, 12, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#1e2a50"; g.beginPath(); g.arc(w / 2, 200, 72, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#d8a23a"; g.beginPath(); g.moveTo(w / 2 - 80, 160); for (let i = 0; i <= 5; i++) { g.lineTo(w / 2 - 80 + i * 32, 90 + (i % 2 ? 0 : 20)); g.lineTo(w / 2 - 64 + i * 32, 150); } g.lineTo(w / 2 + 80, 160); g.closePath(); g.fill();
    g.fillStyle = "#f2efe6"; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(w / 2 - 64 + i * 32, 128, 9, 0, Math.PI * 2); g.fill(); }
    for (const s of [-1, 1]) { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(w / 2 + s * 28, 192, 18, 13, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#c01a10"; g.beginPath(); g.arc(w / 2 + s * 28, 192, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = "#000"; g.beginPath(); g.arc(w / 2 + s * 28, 192, 4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(w / 2, 166, 8, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#c01a10"; g.beginPath(); g.arc(w / 2, 166, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#c01a10"; g.beginPath(); g.ellipse(w / 2, 238, 30, 14, 0, 0, Math.PI); g.fill();
    g.fillStyle = "#fff"; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + s * 20, 236); g.lineTo(w / 2 + s * 14, 258); g.lineTo(w / 2 + s * 8, 236); g.fill(); }
    g.strokeStyle = "#0a0a10"; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2 - 40, 226); g.quadraticCurveTo(w / 2, 214, w / 2 + 40, 226); g.stroke();
    g.fillStyle = "rgba(255,160,40,0.25)"; g.fillRect(0, h - 60, w, 60);
  });
}
