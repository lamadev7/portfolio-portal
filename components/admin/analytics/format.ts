const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const n = (x: number) => x.toLocaleString("en");

const short = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const compact = (x: number) => (x < 1000 ? n(x) : short.format(x));
export const figure = (x: number) => (x < 100_000 ? n(x) : short.format(x));

/** "25 Oct" (or "Sat, 25 Oct") from a YYYY-MM-DD day that is already in the analytics timezone. */
export function dayLabel(day: string, weekday = false): string {
  const [y, m, d] = day.split("-").map(Number);
  const label = `${d} ${MONTHS[m - 1]}`;
  return weekday ? `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${label}` : label;
}

export function change(now: number, before: number): { dir: "up" | "down" | "flat"; text: string } | null {
  if (!before) return null;
  const p = ((now - before) / before) * 100;
  const abs = Math.abs(p);
  if (abs < 0.05) return { dir: "flat", text: "0%" };
  return { dir: p > 0 ? "up" : "down", text: `${abs < 9.95 ? abs.toFixed(1) : n(Math.round(abs))}%` };
}

export const percent = (part: number, whole: number) => {
  const p = whole ? Math.min(100, (part / whole) * 100) : 0;
  return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`;
};

const regions = new Intl.DisplayNames(["en"], { type: "region" });

export function country(code: string): { flag: string; name: string } {
  if (!/^[A-Za-z]{2}$/.test(code)) return { flag: "", name: code };
  const c = code.toUpperCase();
  return { flag: String.fromCodePoint(...Array.from(c, (ch) => 0x1f1a5 + ch.charCodeAt(0))), name: regions.of(c) ?? c };
}
