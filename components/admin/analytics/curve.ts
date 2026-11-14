type Pt = [number, number];

const r = (v: number) => Math.round(v * 100) / 100;

/** SVG path through the points as a monotone cubic, so the curve never overshoots the data (no dips below zero). */
export function curve(pts: Pt[]): string {
  if (pts.length < 3) return pts.map(([x, y], i) => `${i ? "L" : "M"}${r(x)},${r(y)}`).join("");
  const s = pts.slice(1).map(([x, y], i) => (y - pts[i][1]) / (x - pts[i][0]));
  const t = pts.map((_, i) => {
    if (i === 0 || i === pts.length - 1) return NaN;
    const [a, b] = [s[i - 1], s[i]];
    return (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), 0.25 * Math.abs(a + b)) || 0;
  });
  t[0] = (3 * s[0] - t[1]) / 2;
  t[pts.length - 1] = (3 * s[s.length - 1] - t[pts.length - 2]) / 2;
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const h = (x1 - x0) / 3;
    d += `C${r(x0 + h)},${r(y0 + h * t[i - 1])} ${r(x1 - h)},${r(y1 - h * t[i])} ${r(x1)},${r(y1)}`;
  }
  return d;
}
