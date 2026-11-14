"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DayPoint } from "@/lib/cms/analytics-types";
import { curve } from "./curve";
import { compact, dayLabel, n } from "./format";

function niceMax(v: number): number {
  if (v <= 0) return 4;
  const raw = v / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((f) => f * p).find((s) => s >= raw && Number.isInteger(s)) ?? 10 * p;
  return Math.max(1, step) * 4;
}

/** Daily page views (area) and visitors (line). Hover, tap or arrow keys pick a day. */
export default function TrafficChart({ series }: { series: DayPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const last = series.length - 1;
  const max = niceMax(Math.max(0, ...series.map((d) => Math.max(d.views, d.visitors))));
  const x = (i: number) => (last > 0 ? (i / last) * 100 : 50);
  const y = (v: number) => 100 - (v / max) * 100;
  const views = curve(series.map((d, i) => [x(i), y(d.views)]));
  const visitors = curve(series.map((d, i) => [x(i), y(d.visitors)]));
  const empty = series.every((d) => !d.views && !d.visitors);

  const step = last < 7 ? 1 : last < 31 ? 7 : 14;
  const ticks = series.map((_, i) => i).filter((i) => (last - i) % step === 0);
  const peak = series.reduce((b, d, i) => (d.views > series[b].views ? i : b), 0);
  const summary =
    series.length === 0
      ? "No traffic data."
      : `Page views and visitors per day, ${dayLabel(series[0].day)} to ${dayLabel(series[last].day)}. ` +
        (empty
          ? "No visits yet."
          : `${n(series.reduce((s, d) => s + d.views, 0))} page views in total; the busiest day was ${dayLabel(series[peak].day)} with ${n(series[peak].views)}.`);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setActive(Math.min(last, Math.max(0, Math.round(((e.clientX - box.left) / box.width) * last))));
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const by: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -7, PageUp: 7 };
    const at = active ?? last;
    const next = e.key === "Home" ? 0 : e.key === "End" ? last : e.key in by ? at + by[e.key] : null;
    if (next === null) return;
    e.preventDefault();
    setActive(Math.min(last, Math.max(0, next)));
  };

  const d = active === null ? null : series[active];
  const ax = active === null ? 0 : x(active);
  const now = series[active ?? last];

  return (
    <div className="tc">
      <div className="tc-y" aria-hidden="true">
        {(empty ? [0] : [0, 1, 2, 3, 4]).map((k) => (
          <span key={k} style={{ top: `${100 - k * 25}%` }}>
            {compact((max / 4) * k)}
          </span>
        ))}
      </div>
      <div className="tc-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={summary}>
          <defs>
            <linearGradient id="tc-wash" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--views)", stopOpacity: 0.2 }} />
              <stop offset="1" style={{ stopColor: "var(--views)", stopOpacity: 0.02 }} />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75].map((g) => (
            <line key={g} x1="0" x2="100" y1={g} y2={g} className="tc-grid" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2="100" y1="100" y2="100" className="tc-base" vectorEffect="non-scaling-stroke" />
          {!empty && (
            <>
              <path d={`${views}L100,100L0,100Z`} fill="url(#tc-wash)" />
              <path d={views} className="tc-views" vectorEffect="non-scaling-stroke" />
              <path d={visitors} className="tc-visitors" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        {empty && <p className="tc-empty">No visits in this period yet</p>}
        {d && (
          <>
            <span className="tc-cross" style={{ left: `${ax}%` }} />
            <span className="tc-dot tc-dot-views" style={{ left: `${ax}%`, top: `${y(d.views)}%` }} />
            <span className="tc-dot tc-dot-visitors" style={{ left: `${ax}%`, top: `${y(d.visitors)}%` }} />
            <div className={ax > 55 ? "tc-tip flip" : "tc-tip"} style={{ left: `${ax}%` }}>
              <time dateTime={d.day}>{dayLabel(d.day, true)}</time>
              <p>
                <i className="key key-views" />
                <strong>{n(d.views)}</strong>
                <span>{d.views === 1 ? "page view" : "page views"}</span>
              </p>
              <p>
                <i className="key key-visitors" />
                <strong>{n(d.visitors)}</strong>
                <span>{d.visitors === 1 ? "visitor" : "visitors"}</span>
              </p>
            </div>
          </>
        )}
        <div
          className="tc-hit"
          tabIndex={0}
          role="slider"
          aria-label="Day"
          aria-valuemin={0}
          aria-valuemax={last}
          aria-valuenow={active ?? last}
          aria-valuetext={now ? `${dayLabel(now.day, true)}: ${n(now.views)} page views, ${n(now.visitors)} visitors` : "No data"}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => e.pointerType !== "touch" && !e.currentTarget.matches(":focus-visible") && setActive(null)}
          onFocus={() => setActive((a) => a ?? last)}
          onBlur={() => setActive(null)}
          onKeyDown={key}
        />
      </div>
      <div className="tc-x" aria-hidden="true">
        {ticks.map((i, k) => (
          <span key={i} className={(ticks.length - 1 - k) % 2 ? "minor" : undefined} style={{ left: `${x(i)}%` }} data-edge={i === 0 ? "start" : i === last ? "end" : undefined}>
            {dayLabel(series[i].day)}
          </span>
        ))}
      </div>
    </div>
  );
}
