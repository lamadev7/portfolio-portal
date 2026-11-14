/**
 * Calendar dates for the admin's date pickers. Dates are "YYYY-MM-DD" strings, never Date objects,
 * so no timezone can shift a day. Shared by the forms (live preview) and the validators (what gets saved).
 */

export interface Span {
  years: number;
  months: number;
  days: number;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Days in month `m` (1-12) of year `y`. */
export const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const parts = (s: string) => s.split("-").map(Number) as [number, number, number];
const ordinal = (s: string) => Date.UTC(...(parts(s).map((n, i) => (i === 1 ? n - 1 : n)) as [number, number, number])) / 86400000;

export function isISODate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = parts(s);
  return y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m);
}

/** Today in the site owner's timezone. */
export function todayISO(timeZone = "Asia/Kathmandu"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** "25 Oct 2026". */
export function longDate(s: string): string {
  const [y, m, d] = parts(s);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Whole years, months and days from `start` to `end` (end-of-month days clamp, as on a calendar). */
export function span(start: string, end: string): Span {
  if (end <= start) return { years: 0, months: 0, days: 0 };
  const [y1, m1, d1] = parts(start);
  const [y2, m2, d2] = parts(end);
  let total = (y2 - y1) * 12 + (m2 - m1);
  const anchor = (n: number) => {
    const y = y1 + Math.floor((m1 - 1 + n) / 12);
    const m = ((m1 - 1 + n) % 12) + 1;
    return iso(y, m, Math.min(d1, daysIn(y, m)));
  };
  if (anchor(total) > end) total -= 1;
  return { years: Math.floor(total / 12), months: total % 12, days: ordinal(end) - ordinal(anchor(total)) };
}

/** "4 years, 4 months, 24 days"; zero parts are left out. */
export function formatSpan(s: Span): string {
  const out = (
    [
      [s.years, "year"],
      [s.months, "month"],
      [s.days, "day"],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(([n, unit]) => `${n} ${unit}${n === 1 ? "" : "s"}`);
  return out.length ? out.join(", ") : "0 days";
}

/** The label the site shows: "Jun 2022 – now", "Jan – Jul 2022" (unit "month") or "2022 – now", "2025" (unit "year"). */
export function rangeLabel(start: string, end: string, unit: "month" | "year"): string {
  const [y1, m1] = parts(start);
  if (unit === "year") {
    if (!end) return `${y1} – now`;
    const y2 = parts(end)[0];
    return y1 === y2 ? `${y1}` : `${y1} – ${y2}`;
  }
  const from = `${MONTHS[m1 - 1]} ${y1}`;
  if (!end) return `${from} – now`;
  const [y2, m2] = parts(end);
  if (y1 !== y2) return `${from} – ${MONTHS[m2 - 1]} ${y2}`;
  return m1 === m2 ? from : `${MONTHS[m1 - 1]} – ${MONTHS[m2 - 1]} ${y2}`;
}

/**
 * Reads an old free-text label ("Jun 2022 – now", "Jan – Jul 2022", "2021 – 2023", "2025") back into a range:
 * months start on the 1st and end on their last day; "now" means ongoing (end ""). Null when it isn't a date.
 */
export function parseLabel(label: string): { start: string; end: string } | null {
  const sides = label.trim().split(/\s+[–—-]\s+|\s*[–—]\s*/);
  if (sides.length > 2 || !sides[0]) return null;
  const read = (s: string) => {
    const m = /^(?:([a-z]{3})[a-z]*\.?\s+)?(\d{4})$/i.exec(s) ?? /^([a-z]{3})[a-z]*\.?$/i.exec(s);
    if (!m) return null;
    const month = m[1] ? MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()) + 1 : 0;
    if (m[1] && !month) return null;
    return { month, year: m[2] ? Number(m[2]) : 0 };
  };
  const a = read(sides[0]);
  const ongoing = sides[1] !== undefined && /^(now|present|current|today)$/i.test(sides[1]);
  const b = sides[1] === undefined ? a : ongoing ? null : read(sides[1]);
  if (!a || (!b && !ongoing)) return null;
  const startYear = a.year || b?.year || 0;
  if (!startYear) return null;
  const start = iso(startYear, a.month || 1, 1);
  if (ongoing || !b) return { start, end: "" };
  const endYear = b.year || startYear;
  const endMonth = b.month || 12;
  const end = iso(endYear, endMonth, daysIn(endYear, endMonth));
  return end >= start ? { start, end } : null;
}
