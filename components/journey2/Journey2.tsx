"use client";

import React, { useEffect, useRef, useState } from "react";
import ExplorerMap from "../explorer/ExplorerMap";
import { STOPS } from "./contracts";
import { Director, type Ui } from "./director";
import Intro from "./ui/Intro";
import Header from "./ui/Header";
import StoryBar from "./ui/StoryBar";
import Bubble from "./ui/Bubble";
import Cta from "./ui/Cta";
import "./journey2.css";

/** Journey v2: the aerial map and the 3D location scenes stacked and crossfaded by the director; React only draws the chrome. */
export default function Journey2() {
  const gl = useRef<HTMLCanvasElement>(null), aerial = useRef<HTMLDivElement>(null), bubble = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null), bar = useRef<HTMLSpanElement>(null), dir = useRef<Director | null>(null);
  const [ui, setUi] = useState<Ui | null>(null);
  const [x, setX] = useState(false);

  useEffect(() => {
    let d: Director | null = null;
    /* deferred so React's dev double-mount never builds two renderers on the one canvas */
    const t = setTimeout(() => {
      d = new Director({ gl: gl.current!, aerial: aerial.current!, bubble: () => bubble.current, typed: () => typed.current, bar: () => bar.current }, setUi);
      dir.current = d; (window as any).__j2 = d;
      setUi(d.ui);
      d.mount().catch((e) => console.warn("journey2 mount", e));
    }, 0);
    const rs = () => d && d.resize();
    window.addEventListener("resize", rs);
    return () => { clearTimeout(t); window.removeEventListener("resize", rs); if (d) d.dispose(); dir.current = null; };
  }, []);

  useEffect(() => { if (dir.current) dir.current.setVisible(!x); }, [x]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = dir.current; if (!d || x || !d.ui.started) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); d.next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); d.prev(); }
      else if (e.key === " " && tag !== "BUTTON" && tag !== "A") { e.preventDefault(); d.toggle(); }
      else if (e.key === "Escape") d.pause();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [x]);

  const wheel = useRef({ acc: 0, at: 0 });
  const onWheel = (e: React.WheelEvent) => {
    const d = dir.current; if (!d || !d.ui.started) return;
    const w = wheel.current, now = performance.now();
    if (now - w.at < 1400) return;
    w.acc += e.deltaY;
    if (Math.abs(w.acc) > 140) { w.acc > 0 ? d.next() : d.prev(); w.acc = 0; w.at = now; }
  };
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { if (!dir.current || !dir.current.ui.started || e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY, moved: 0 }; dir.current.dragging(true); };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current, d = dir.current; if (!g || !d) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y; g.x = e.clientX; g.y = e.clientY; g.moved += Math.abs(dx) + Math.abs(dy);
    d.look(dx, dy); if (g.moved > 8) d.interrupt();
  };
  const onUp = () => { if (drag.current && dir.current) dir.current.dragging(false); drag.current = null; };

  const u = ui, stop = STOPS[u ? u.i : 0], started = !!u && u.started, cta = !!u && !!u.cap && !!u.cap.cta;
  const running = !!u && !u.paused && !u.hold && !u.ended;
  return (
    <div className="j2" data-x={x ? "true" : "false"} data-started={started ? "true" : "false"}>
      <ExplorerMap active={x} />
      <div className="j2-stage" onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
        <div className="j2-aerial" ref={aerial} />
        <canvas className="j2-gl" ref={gl} role="img" aria-label={"A night-time 3D scene of " + stop.name + ", " + stop.region} />
        <div className="j2-shade" aria-hidden="true" />
      </div>
      <div className="j2-ui">
        {!started ? <Intro ready={!!u && u.ready} onWalk={() => dir.current && dir.current.start()} /> : null}
        {started ? <Bubble cap={u!.cap} elRef={bubble} typedRef={typed} /> : null}
        {started && u!.loading ? <p className="j2-load" role="status">Landing at {stop.name}…</p> : null}
        {started && cta ? <Cta onReplay={() => dir.current && dir.current.go(0)} /> : null}
        {started ? (
          <StoryBar stop={stop} no={u!.i + 1} total={STOPS.length} date={u!.date} running={running} first={u!.i === 0} last={u!.i === STOPS.length - 1}
            barRef={bar} onToggle={() => dir.current && dir.current.toggle()} onPrev={() => dir.current && dir.current.prev()} onNext={() => dir.current && dir.current.next()} />
        ) : null}
        <p className="j2-sr" aria-live="polite">{started && u!.cap ? u!.cap.title + ". " + u!.cap.text : ""}</p>
      </div>
      <Header region={started ? stop.region.toUpperCase() : "NEPAL · NIGHT"} explorer={x} muted={!!u && u.muted}
        onMode={setX} onMute={() => dir.current && dir.current.setMuted(!dir.current.ui.muted)} onHome={() => { setX(false); if (dir.current && dir.current.ui.started) dir.current.go(0); }} />
    </div>
  );
}
