"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KIND_LABEL, NEPAL_ISO, publishedPlaces, visitedCountryIsos, type Place } from "@/lib/data/places";
import { ExplorerController, FLIGHT_STAGES as STAGES, type ExplorerHooks, type Pad } from "./controller";
import { fmtCoord } from "./geo";
import { iconSvg, kindSvg } from "./icons";
import "./explorer.css";

type Filter = "all" | "nepal" | "abroad";
type Status = "idle" | "loading" | "ready" | "nogl";

const DEV = process.env.NODE_ENV !== "production";
const CREDIT = "Imagery © Esri, Maxar, Earthstar Geographics · Terrain: Mapzen/AWS Terrain Tiles · Borders: Natural Earth";

function Svg({ html, className = "ex-i" }: { html: string; className?: string }) {
  return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const isPhone = () => typeof window !== "undefined" && window.matchMedia("(max-width: 759px)").matches;
const padFor = (panelOpen: boolean, card: boolean): Pad =>
  isPhone()
    ? { top: 56, right: 56, bottom: card ? Math.round(window.innerHeight * 0.46) : 137, left: 0 }
    : { top: 60, right: 0, bottom: 0, left: panelOpen ? 364 : 0 };

function groupPlaces(list: Place[]) {
  const groups: Array<{ key: string; label: string; items: Place[] }> = [];
  const push = (key: string, label: string, p: Place) => {
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, label, items: [] }));
    g.items.push(p);
  };
  list.forEach((p) => p.kind !== "dream" && p.iso === NEPAL_ISO && push("np", "Nepal", p));
  list.forEach((p) => p.kind !== "dream" && p.iso !== NEPAL_ISO && push(`c:${p.country}`, p.country, p));
  list.forEach((p) => p.kind === "dream" && push("dream", "Next summit", p));
  return groups;
}

function Contours() {
  return (
    <svg className="ex-contours" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path
          key={i}
          d={`M-20 ${150 - i * 14} C 60 ${120 - i * 16}, 110 ${170 - i * 20}, 190 ${118 - i * 15} S 320 ${70 - i * 6}, 380 ${96 - i * 12}`}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={`e${i}`} cx="268" cy="62" rx={14 + i * 13} ry={8 + i * 8} />
      ))}
    </svg>
  );
}

/** Explorer mode: satellite + 3D terrain map of Nepal that zooms out into a globe, with Parbat's places. */
export default function ExplorerMap({ active, standalone = false }: { active: boolean; standalone?: boolean }) {
  const places = useMemo(() => publishedPlaces(), []);
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const stats = useMemo(
    () => ({
      places: places.filter((p) => p.kind !== "dream").length,
      countries: visitedCountryIsos(places).length,
      dreams: places.filter((p) => p.kind === "dream").length,
      abroad: places.filter((p) => p.iso !== NEPAL_ISO).length,
    }),
    [places],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLSpanElement>(null);
  const ctl = useRef<ExplorerController | null>(null);
  const globeSeen = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flying, setFlying] = useState(false);
  const [stage, setStage] = useState(0);
  const [hint, setHint] = useState(false);
  const [credits, setCredits] = useState(false);

  const shown = useMemo(
    () => places.filter((p) => (filter === "all" ? true : filter === "nepal" ? p.iso === NEPAL_ISO : p.iso !== NEPAL_ISO)),
    [places, filter],
  );
  const groups = useMemo(() => groupPlaces(shown), [shown]);
  const order = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const current = activeId ? byId.get(activeId) ?? null : null;

  const panelRef = useRef(panelOpen);
  panelRef.current = panelOpen;

  const select = useCallback(
    (id: string) => {
      const p = byId.get(id);
      if (!p) return;
      setActiveId(id);
      setSheetOpen(false);
      ctl.current?.flyToPlace(p, padFor(panelRef.current, true));
    },
    [byId],
  );
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    if (!active) {
      ctl.current?.setActiveView(false);
      return;
    }
    if (ctl.current) {
      ctl.current.setActiveView(true);
      return;
    }
    const el = mapRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hooks: ExplorerHooks = {
      onSelect: (id) => selectRef.current(id),
      onReady: () => setStatus("ready"),
      onFail: () => {
        setStatus("nogl");
        setSheetOpen(true);
      },
      onFlight: (f) => {
        setFlying(f);
        if (!f && !globeSeen.current) setHint(true);
      },
      onGlobe: () => {
        globeSeen.current = true;
        setHint(false);
      },
      onBearing: (deg) => {
        if (compassRef.current) compassRef.current.style.transform = `rotate(${-deg}deg)`;
      },
      onStage: setStage,
    };
    const c = new ExplorerController(el, places, hooks, reduced);
    ctl.current = c;
    setStatus("loading");
    void c.init();
  }, [active, places]);

  useEffect(
    () => () => {
      ctl.current?.destroy();
      ctl.current = null;
    },
    [],
  );

  useEffect(() => {
    ctl.current?.setActive(activeId);
  }, [activeId, status]);

  useEffect(() => {
    ctl.current?.setVisible(shown.map((p) => p.id));
  }, [shown, status]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, []);

  const step = (d: number) => {
    if (!current) return;
    const seq = order.some((p) => p.id === current.id) ? order : places;
    const i = seq.findIndex((p) => p.id === current.id);
    select(seq[(i + d + seq.length) % seq.length].id);
  };
  const seq = current && order.some((p) => p.id === current.id) ? order : places;
  const idx = current ? seq.findIndex((p) => p.id === current.id) : -1;

  const chips: Array<{ k: Filter; label: string; n: number }> = [
    { k: "all", label: "All", n: stats.places },
    { k: "nepal", label: "Nepal", n: stats.places - stats.abroad },
    { k: "abroad", label: "Abroad", n: stats.abroad },
  ];

  return (
    <div
      ref={rootRef}
      className="ex"
      role="region"
      data-on={active ? "true" : "false"}
      data-standalone={standalone ? "true" : "false"}
      data-status={status}
      data-panel={panelOpen ? "open" : "closed"}
      data-sheet={sheetOpen ? "open" : "closed"}
      data-card={current ? "open" : "closed"}
      aria-label="Explorer: map of places"
      aria-hidden={active ? undefined : true}
    >
      <div className="ex-sky" aria-hidden="true" />
      <div className="ex-glow" aria-hidden="true" />
      <div ref={mapRef} className="ex-map" />

      <div className="ex-veil" aria-hidden={status !== "loading"}>
        <p className="ex-kicker">Loading satellite imagery and terrain</p>
        <span className="ex-veil-bar" />
      </div>

      {status === "nogl" ? (
        <div className="ex-nogl ex-glass" role="note">
          <Svg html={iconSvg("globe", 20)} />
          <p>
            <strong>The 3D map needs WebGL</strong>, which this browser has turned off. The places are all in the list.
          </p>
        </div>
      ) : null}

      <div className={`ex-caption ex-glass${flying ? " is-on" : ""}`} aria-hidden={!flying}>
        <span className="ex-kicker">Flying north</span>
        <span className="ex-caption-stage">{STAGES[stage]}</span>
        <span className="ex-caption-track" aria-hidden="true">
          {STAGES.map((s, i) => (
            <i key={s} className={i <= stage ? "is-past" : undefined} />
          ))}
        </span>
      </div>

      <div className={`ex-hint ex-glass${hint && !current ? " is-on" : ""}`} role="status">
        {hint ? (
          <>
            <Svg html={iconSvg("globe", 15)} />
            <span className="ex-hint-desk">Scroll out to see the globe</span>
            <span className="ex-hint-touch">Pinch out to see the globe</span>
          </>
        ) : null}
      </div>

      <button
        type="button"
        className="ex-open ex-glass"
        onClick={() => setPanelOpen(true)}
        aria-label="Show places panel"
        tabIndex={panelOpen ? -1 : 0}
      >
        <Svg html={iconSvg("list", 16)} />
        <span>Places</span>
        <span className="ex-open-n">{pad2(stats.places)}</span>
      </button>

      <aside className="ex-panel ex-glass" aria-label="Places">
        <button
          type="button"
          className="ex-handle"
          onClick={() => setSheetOpen((v) => !v)}
          aria-expanded={sheetOpen}
          aria-controls="ex-list"
        >
          <span className="ex-handle-bar" aria-hidden="true" />
          <span className="ex-sr">{sheetOpen ? "Hide places list" : "Show places list"}</span>
        </button>
        <header className="ex-ph">
          <p className="ex-kicker">Explorer · Life outside work</p>
          <h2 className="ex-title">From the plains to the peaks</h2>
          <p className="ex-lede">Places that shaped me, from the Terai where I grew up to the Himalaya, and beyond.</p>
          <dl className="ex-stats">
            <div>
              <dd>{pad2(stats.places)}</dd>
              <dt>{stats.places === 1 ? "Place" : "Places"}</dt>
            </div>
            <div>
              <dd>{pad2(stats.countries)}</dd>
              <dt>{stats.countries === 1 ? "Country" : "Countries"}</dt>
            </div>
            {stats.dreams ? (
              <div>
                <dd>{pad2(stats.dreams)}</dd>
                <dt>Next summit</dt>
              </div>
            ) : null}
          </dl>
          <button type="button" className="ex-collapse" onClick={() => setPanelOpen(false)} aria-label="Hide places panel">
            <Svg html={iconSvg("collapse", 16)} />
          </button>
        </header>
        <div className="ex-body" id="ex-list">
          {stats.abroad ? (
            <div className="ex-chips" role="group" aria-label="Filter places">
              {chips.map((c) => (
                <button key={c.k} type="button" className="ex-chip" aria-pressed={filter === c.k} onClick={() => setFilter(c.k)}>
                  {c.label}
                  <span>{c.n}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="ex-list">
            {groups.map((g) => (
              <div key={g.key} className="ex-group" role="group" aria-label={g.label}>
                <h3 className="ex-gh">
                  <span>{g.label}</span>
                  <span>{pad2(g.items.length)}</span>
                </h3>
                <ul>
                  {g.items.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="ex-row"
                        data-kind={p.kind}
                        aria-current={p.id === activeId ? "true" : undefined}
                        onClick={() => select(p.id)}
                      >
                        <Svg className="ex-row-ico" html={kindSvg(p.kind, 15)} />
                        <span className="ex-row-txt">
                          <span className="ex-row-name">{p.name}</span>
                          <span className="ex-row-sub">
                            {p.region} · {KIND_LABEL[p.kind]}
                          </span>
                        </span>
                        <span className="ex-row-meta">{p.altitude ? `${p.altitude.toLocaleString("en-US")} m` : null}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {current ? (
        <article key={current.id} className="ex-card ex-glass" aria-label={`${current.name} details`} data-kind={current.kind}>
          <button type="button" className="ex-card-x" onClick={() => setActiveId(null)} aria-label="Close place card">
            <Svg html={iconSvg("close", 16)} />
          </button>
          <figure className="ex-photo">
            {current.photo ? (
              <img src={current.photo} alt={current.name} loading="lazy" />
            ) : (
              <div className="ex-frame">
                <Contours />
                <Svg className="ex-frame-ico" html={kindSvg(current.kind, 18)} />
                <span className="ex-frame-name">{current.name}</span>
                <span className="ex-frame-ll">{fmtCoord(current.ll)}</span>
              </div>
            )}
          </figure>
          <div className="ex-card-body">
            <p className="ex-kicker">
              {KIND_LABEL[current.kind]}
              {current.kind === "dream" ? " · not yet visited" : ""}
            </p>
            <h3 className="ex-card-name">{current.name}</h3>
            <p className="ex-card-where">
              {current.region} · {current.country}
            </p>
            {current.when || current.altitude ? (
              <dl className="ex-meta">
                {current.when ? (
                  <div>
                    <dt>When</dt>
                    <dd>{current.when}</dd>
                  </div>
                ) : null}
                {current.altitude ? (
                  <div>
                    <dt>Altitude</dt>
                    <dd>{current.altitude.toLocaleString("en-US")} m</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            <p className="ex-card-line">{current.line}</p>
            {DEV && !current.photo ? <p className="ex-devhint">[Add a photo / memory in lib/data/places.ts]</p> : null}
            <div className="ex-card-nav">
              <button type="button" className="ex-btn" onClick={() => step(-1)} aria-label="Previous place">
                <Svg html={iconSvg("prev", 16)} />
                <span>Prev</span>
              </button>
              <span className="ex-card-pos">
                {current.kind === "dream"
                  ? "Next summit"
                  : `${pad2(seq.filter((p) => p.kind !== "dream").findIndex((p) => p.id === current.id) + 1)} / ${pad2(seq.filter((p) => p.kind !== "dream").length)}`}
              </span>
              <button type="button" className="ex-btn" onClick={() => step(1)} aria-label="Next place">
                <span>Next</span>
                <Svg html={iconSvg("next", 16)} />
              </button>
            </div>
          </div>
        </article>
      ) : null}

      {status !== "nogl" ? (
        <div className="ex-ctl" role="toolbar" aria-label="Map controls">
          <div className="ex-ctl-acts ex-glass">
            <button type="button" onClick={() => ctl.current?.seeWorld(padFor(panelOpen, false))} aria-label="See the world">
              <Svg html={iconSvg("globe", 17)} />
              <span className="ex-ctl-lb">See the world</span>
            </button>
            <button type="button" onClick={() => ctl.current?.backToNepal(padFor(panelOpen, false))} aria-label="Back to Nepal">
              <Svg html={iconSvg("peaks", 17)} />
              <span className="ex-ctl-lb">Back to Nepal</span>
            </button>
            <button
              type="button"
              onClick={() => (flying ? ctl.current?.stopFlight() : ctl.current?.playFlight())}
              aria-label={flying ? "Stop flight" : "Replay flight"}
            >
              <Svg html={flying ? iconSvg("close", 17) : iconSvg("replay", 17)} />
              <span className="ex-ctl-lb">{flying ? "Stop flight" : "Replay flight"}</span>
            </button>
          </div>
          <div className="ex-ctl-zoom ex-glass">
            <button type="button" onClick={() => ctl.current?.zoomBy(1)} aria-label="Zoom in">
              <Svg html={iconSvg("plus", 17)} />
            </button>
            <button type="button" onClick={() => ctl.current?.zoomBy(-1)} aria-label="Zoom out">
              <Svg html={iconSvg("minus", 17)} />
            </button>
            <button type="button" onClick={() => ctl.current?.resetNorth()} aria-label="Reset north">
              <span ref={compassRef} className="ex-compass" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M12 3 15.2 12H8.8z" fill="#f4b961" stroke="#f4b961" />
                  <path d="M12 21 8.8 12h6.4z" stroke="currentColor" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <div className={`ex-credit${credits ? " is-open" : ""}`}>
        <button type="button" className="ex-credit-btn" onClick={() => setCredits((v) => !v)} aria-expanded={credits} aria-label="Map credits">
          <Svg html={iconSvg("info", 15)} />
        </button>
        <p>{CREDIT}</p>
      </div>
    </div>
  );
}
