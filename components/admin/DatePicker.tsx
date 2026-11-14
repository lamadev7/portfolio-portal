"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { MONTHS, daysIn, iso, longDate, parts, todayISO } from "@/lib/cms/dates";

/** Calendar date pickers for the admin forms: one date, or a start–end range that can stay open ("now"). */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
type View = { y: number; m: number };

const viewOf = (s: string): View => {
  const [y, m] = parts(s || todayISO());
  return { y, m };
};
const shiftDay = (s: string, n: number) => {
  const [y, m, d] = parts(s);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
};

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, root, trigger };
}

function Calendar({
  view,
  onView,
  focus,
  dayClass,
  onPick,
  onHover,
}: {
  view: View;
  onView: (v: View) => void;
  focus: string;
  dayClass: (day: string) => string;
  onPick: (day: string) => void;
  onHover?: (day: string | null) => void;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(focus);
  const today = todayISO();
  const thisYear = parts(today)[0];
  const years = Array.from({ length: thisYear + 6 - 1990 }, (_, i) => thisYear + 5 - i);
  const lead = (new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay() + 6) % 7;
  const days = Array.from({ length: daysIn(view.y, view.m) }, (_, i) => iso(view.y, view.m, i + 1));
  const step = (n: number) => onView(n < 0 ? (view.m === 1 ? { y: view.y - 1, m: 12 } : { y: view.y, m: view.m - 1 }) : view.m === 12 ? { y: view.y + 1, m: 1 } : { y: view.y, m: view.m + 1 });

  useEffect(() => {
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${active}"]`)?.focus({ preventScroll: true });
  }, [active, view]);

  function onKey(e: KeyboardEvent) {
    const n = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!n) return;
    e.preventDefault();
    const next = shiftDay(active, n);
    setActive(next);
    const [y, m] = parts(next);
    if (y !== view.y || m !== view.m) onView({ y, m });
  }

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-step" aria-label="Previous month" onClick={() => step(-1)}>
          ‹
        </button>
        <select aria-label="Month" value={view.m} onChange={(e) => onView({ ...view, m: Number(e.target.value) })}>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label="Year" value={view.y} onChange={(e) => onView({ ...view, y: Number(e.target.value) })}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button type="button" className="cal-step" aria-label="Next month" onClick={() => step(1)}>
          ›
        </button>
      </div>
      <div className="cal-grid" ref={grid} onKeyDown={onKey} onMouseLeave={() => onHover?.(null)}>
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal-wd" aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {days.map((day) => {
          const cls = dayClass(day);
          return (
            <button
              key={day}
              type="button"
              data-day={day}
              tabIndex={day === active || (!days.includes(active) && day.endsWith("-01")) ? 0 : -1}
              className={`cal-day${day === today ? " is-today" : ""}${cls ? ` ${cls}` : ""}`}
              aria-label={longDate(day)}
              aria-pressed={/\bis-(sel|start|end)\b/.test(cls)}
              onClick={() => {
                setActive(day);
                onPick(day);
              }}
              onMouseEnter={() => onHover?.(day)}
            >
              {parts(day)[2]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Shell({ label, empty, children, popover }: { label: string; empty: boolean; children: ReactNode; popover: ReturnType<typeof usePopover> }) {
  const { open, setOpen, root, trigger } = popover;
  return (
    <div className="dp" ref={root}>
      <button ref={trigger} type="button" className={empty ? "in dp-trigger is-empty" : "in dp-trigger"} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CalendarIcon />
        <span>{label}</span>
      </button>
      {open && (
        <div className="dp-pop" role="dialog" aria-label="Choose dates">
          {children}
        </div>
      )}
    </div>
  );
}

/** One date, as "YYYY-MM-DD". */
export function DatePicker({ value, onChange, placeholder = "Select a date" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const pop = usePopover();
  const [view, setView] = useState(viewOf(value));
  return (
    <Shell label={value ? longDate(value) : placeholder} empty={!value} popover={pop}>
      <Calendar
        view={view}
        onView={setView}
        focus={value || todayISO()}
        dayClass={(day) => (day === value ? "is-sel" : "")}
        onPick={(day) => {
          onChange(day);
          pop.setOpen(false);
          pop.trigger.current?.focus();
        }}
      />
      <div className="dp-foot">
        <button
          type="button"
          className="dp-link"
          onClick={() => {
            onChange(todayISO());
            pop.setOpen(false);
          }}
        >
          Today
        </button>
      </div>
    </Shell>
  );
}

export interface RangeValue {
  start: string;
  /** "" while `present` is true. */
  end: string;
  present: boolean;
}

/** A start–end range. Pick the start, then the end; or tick `presentLabel` to leave it running to today. */
export function DateRangePicker({ value, onChange, presentLabel }: { value: RangeValue; onChange: (v: RangeValue) => void; presentLabel: string }) {
  const pop = usePopover();
  const [view, setView] = useState(viewOf(value.start));
  const [picking, setPicking] = useState<"start" | "end">("start");
  const [hover, setHover] = useState<string | null>(null);
  const { start, end, present } = value;
  const label = start ? `${longDate(start)} → ${present ? "Present" : end ? longDate(end) : "…"}` : "Select dates";
  const tail = picking === "end" && !present && hover && start && hover > start ? hover : end;

  function pick(day: string) {
    if (present) {
      onChange({ start: day, end: "", present });
      pop.setOpen(false);
    } else if (picking === "start" || !start || day < start) {
      onChange({ start: day, end: "", present });
      setPicking("end");
    } else {
      onChange({ start, end: day, present });
      setPicking("start");
      pop.setOpen(false);
      pop.trigger.current?.focus();
    }
  }

  return (
    <Shell label={label} empty={!start} popover={pop}>
      <p className="dp-step">{present ? "Pick the start date" : picking === "end" && start ? "Now pick the end date" : "Pick the start date"}</p>
      <Calendar
        view={view}
        onView={setView}
        focus={start || todayISO()}
        onHover={setHover}
        onPick={pick}
        dayClass={(day) => {
          if (day === start) return tail || present ? "is-start" : "is-sel";
          if (!present && day === tail) return "is-end";
          if (start && day > start && ((present && day <= todayISO()) || (tail && day < tail))) return "in-range";
          return "";
        }}
      />
      <div className="dp-foot">
        <label className="dp-check">
          <input
            type="checkbox"
            checked={present}
            onChange={(e) => {
              setPicking("start");
              onChange({ start, end: "", present: e.target.checked });
            }}
          />
          {presentLabel}
        </label>
        <button
          type="button"
          className="dp-link"
          onClick={() => {
            setPicking("start");
            onChange({ start: "", end: "", present: false });
          }}
        >
          Clear
        </button>
      </div>
    </Shell>
  );
}
