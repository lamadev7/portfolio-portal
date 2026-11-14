"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { JourneyEngine } from "./engine";
import ExplorerMap from "../explorer/ExplorerMap";
import { careerLength, profile } from "@/lib/data/profile";
import { experiences } from "@/lib/data/experiences";
import "./journey.css";

/**
 * Two Trails — the journey stage. Designed at 1440×900; the logical stage grows with the viewport aspect so it always fills the screen.
 * All scene logic lives in JourneyEngine; this component renders the chrome from engine.renderVals()
 * and re-renders whenever the engine calls setState.
 */
export default function Journey({ startMode = "engineer" }: { startMode?: "engineer" | "explorer" }) {
  const [, bump] = useState(0);
  const engine = useMemo(() => new JourneyEngine({ startMode, smooth: 0.045 }, () => bump((n) => n + 1)), []);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 1, w: 1440, h: 900 });

  useEffect(() => {
    (window as any).THREE = THREE;
    engine.mount();
    const refit = () => { const el = stageRef.current; if (!el) return; const w = el.clientWidth, h = el.clientHeight, s = Math.min(w / (h > w ? 760 : 1440), h / 900), vw = Math.round(w / s), vh = Math.round(h / s); engine.resize(vw, vh, s); setFit({ s, w: vw, h: vh }); };
    refit(); window.addEventListener("resize", refit);
    return () => { window.removeEventListener("resize", refit); engine.unmount(); };
  }, []);

  const v: any = engine.renderVals();
  const r: any = (engine as any)._r;
  const x = !!v.isExpB;
  const keyX = (e: React.KeyboardEvent) => { if (e.key === "e" || e.key === "E") v.setEng(); };

  useEffect(() => {
    const eng = engine as any;
    if (!x) { eng.paused = false; return; }
    const t = setTimeout(() => { eng.paused = true; }, 900);
    return () => clearTimeout(t);
  }, [x]);

  return (
    <div className="jr-stage" ref={stageRef} style={{ ["--k" as string]: fit.s }}>
      <ExplorerMap active={x} />
      <div style={{ position: "absolute", zIndex: 1, pointerEvents: x ? "none" : "auto", left: 0, top: 0, width: fit.w, height: fit.h, transform: `scale(${fit.s})`, transformOrigin: "0 0" }}>
<div className={(x ? "root jr jr-x" : "root jr") + (fit.w < 1000 ? " jr-narrow" : "")} ref={r.root} tabIndex={0} onWheel={x ? undefined : v.onWheel} onKeyDown={x ? keyX : v.onKey} onMouseMove={v.onMove} onPointerDown={x ? undefined : v.onDown} onPointerMove={v.onPMove} onPointerUp={v.onUp} onPointerLeave={v.onUp} style={{ width: `${fit.w}px`, height: `${fit.h}px`, position: "relative", overflow: "hidden", background: "#0b1524", color: "#dbe2eb", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px", lineHeight: "1.5", userSelect: "none" }}>

<canvas ref={r.gl} role="img" aria-label="A 3D landscape of Nepal built in the page: golden paddy plains with rivers and mango trees, terraced green hills with pines and houses, the Kathmandu valley with Swayambhunath, Dharahara, Patan's pagodas and Pashupatinath, and the snow-covered Himalaya with prayer flags; lit by the sun, with drifting clouds and falling snow at altitude" style={{ position: "absolute", inset: "0", width: `${fit.w}px`, height: `${fit.h}px`, background: "#0b1524" }}></canvas>
<canvas aria-hidden="true" ref={r.cv} style={{ position: "absolute", inset: "0", width: `${fit.w}px`, height: `${fit.h}px` }}></canvas>

{/* INTRO */}
<div ref={r.intro} style={{ position: "absolute", left: "96px", top: "168px", width: "600px", display: "flex", flexDirection: "column", gap: "18px", zIndex: "4" }}>
<div aria-hidden="true" style={{ position: "absolute", left: "-96px", top: "-168px", width: "900px", height: "700px", background: "radial-gradient(ellipse at 22% 45%, rgba(8,14,24,.42), rgba(8,14,24,0) 62%)", pointerEvents: "none", zIndex: "-1" }}></div>
<div style={{ display: "flex", alignItems: "center", gap: "12px", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "13px", letterSpacing: ".1em", color: "#dbe2eb", textShadow: "0 1px 12px rgba(0,0,0,.5)", animation: "fadeup .9s both .1s" }}><span style={{ width: "22px", height: "1.5px", background: `${v.introAccent}`, transition: "background .6s" }}></span>{v.introKicker}</div>
<h1 style={{ margin: "0", fontFamily: "'Sawton Industrial', Inter, sans-serif", fontWeight: "700", fontSize: "58px", lineHeight: "1", color: "#ffffff", filter: "drop-shadow(0 4px 18px rgba(8,14,26,.5))" }}>
<span style={{ display: "block", overflow: "hidden", paddingBottom: "4px" }}><span style={{ display: "inline-block", animation: "rise 1.2s cubic-bezier(.22,1,.36,1) both .2s" }}>Namaste, I'm Parbat.</span></span>
<span style={{ display: "block", overflow: "hidden", paddingBottom: "4px" }}><span style={{ display: "inline-block", animation: "rise 1.2s cubic-bezier(.22,1,.36,1) both .35s", color: `${v.introAccent}`, transition: "color .6s" }}>{v.introLine}</span></span>
</h1>
<div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "14px", animation: "fadeup .9s both .7s" }}>
<div aria-hidden="true" style={{ position: "absolute", left: "-40px", right: "-60px", top: "-26px", bottom: "-26px", background: "radial-gradient(closest-side, rgba(8,14,24,.62), rgba(8,14,24,.38) 60%, rgba(8,14,24,0))", pointerEvents: "none", zIndex: "-1" }}></div>
<p style={{ margin: "0", maxWidth: "500px", fontSize: "16px", lineHeight: "1.55", color: "#dbe2eb", textShadow: "0 1px 10px rgba(8,14,26,.6)" }}>{v.introP}</p>
<p className="jr-rline"><span className="jr-rline-dot" aria-hidden="true"></span><b>{experiences[0].title} @ {experiences[0].at}</b><span aria-hidden="true">·</span><span>{careerLength()} experience</span><span aria-hidden="true">·</span><span>{profile.availability.replace(" and ", " & ")}</span></p>
</div>
<div style={{ display: "flex", alignItems: "center", gap: "12px", animation: "fadeup .9s both .9s" }}>
<button className="btn btn-p" onClick={v.begin} style={{ height: "52px", padding: "0 24px", border: "0", borderRadius: "3px", background: "#316add", color: "#ffffff", font: "600 15px Inter, sans-serif", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>Walk the Road <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "nudge 1.6s ease-in-out infinite" }}><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>
<Link href="/resume" className="btn btn-g jr-sec">Résumé</Link>
</div>
</div>

{/* HEADER */}
<div className="jr-keep" aria-hidden="true" style={{ position: "absolute", top: "0", left: "0", right: "0", height: "120px", background: "linear-gradient(180deg, rgba(8,14,24,.7), rgba(8,14,24,0))", pointerEvents: "none", zIndex: "5" }}></div>
<header style={{ position: "absolute", top: "0", left: "0", right: "0", height: "84px", boxSizing: "border-box", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", zIndex: "6" }}>
<button onClick={v.goHome} aria-label="Back to the start" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0", border: "0", background: "transparent", cursor: "pointer" }}>
<svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" style={{ filter: "drop-shadow(0 1px 8px rgba(0,0,0,.6))" }}><path d="M2 20 9 7l4 6 3-4 6 11z"></path><path d="M7.5 9.8 9 7l1.5 2.8" stroke="#98b9fb"></path></svg>
<span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: "1.3" }}><span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "13px", color: "#ffffff" }}>parbat.lama</span><span ref={r.region} style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "10.5px", letterSpacing: ".08em", color: "#a3b3c6" }}>TERAI · SARLAHI</span></span>
</button>
{/* blended mode switch: two words, a sliding line of light */}
<div role="radiogroup" aria-label="Portfolio mode" onKeyDown={v.swKey} style={{ position: "relative", display: "flex", alignItems: "center", gap: "20px", height: "44px" }}>
<button className="sw" role="radio" aria-checked={v.isEngA} tabIndex={v.engTab} onClick={v.setEng} style={{ width: "100px", height: "44px", padding: "0", border: "0", background: "transparent", font: "500 12px Inter, sans-serif", letterSpacing: ".22em", color: `${v.engC}`, textShadow: "0 1px 12px rgba(0,0,0,.55)", cursor: "pointer" }}><span aria-hidden="true" ref={r.wEng}>ENGINEER</span><span style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>Engineer</span></button>
<span aria-hidden="true" style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(219,226,235,.4)" }}></span>
<button className="sw" role="radio" aria-checked={v.isExpA} tabIndex={v.expTab} onClick={v.setExp} style={{ width: "100px", height: "44px", padding: "0", border: "0", background: "transparent", font: "500 12px Inter, sans-serif", letterSpacing: ".22em", color: `${v.expC}`, textShadow: "0 1px 12px rgba(0,0,0,.55)", cursor: "pointer" }}><span aria-hidden="true" ref={r.wExp}>EXPLORER</span><span style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>Explorer</span></button>
<span aria-hidden="true" style={{ position: "absolute", left: "0", bottom: "6px", width: "64px", height: "1.5px", borderRadius: "2px", background: `${v.ulC}`, boxShadow: `0 0 10px ${v.ulC}, 0 0 22px ${v.ulC}`, transform: `translateX(${v.ulX}px)`, transition: "transform .65s cubic-bezier(.65,0,.35,1), background .65s ease, box-shadow .65s ease" }}></span>
</div>
<div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
<button className="ib" onClick={v.toggleLight} aria-label={v.lightT} title={v.lightT}>{v.isNight ? (<><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg></>) : null}{v.isDayI ? (<><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg></>) : null}</button>
<button className="ib" onClick={v.toggleSnd} aria-pressed={v.sndOn} aria-label={v.sndT} title={v.sndT} style={{ color: `${v.sndC}` }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v4h4l5 4V6L8 10H4z"></path><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"></path></svg><span className="lb">{v.sndT}</span></button>
</div>
</header>

{/* BOTTOM: elevation profile + step pins */}
<div aria-hidden="true" style={{ position: "absolute", bottom: "0", left: "0", right: "0", height: "130px", background: "linear-gradient(0deg, rgba(8,14,24,.85), rgba(8,14,24,0))", pointerEvents: "none", zIndex: "5" }}></div>
<canvas aria-hidden="true" ref={r.pf} style={{ position: "absolute", left: "0", bottom: "16px", width: `${fit.w}px`, height: "90px", zIndex: "6", pointerEvents: "none" }}></canvas>
<nav aria-label="Life steps" style={{ position: "absolute", left: "0", right: "0", bottom: "16px", height: "90px", zIndex: "7" }}>
{v.pins.map((p: any, idx: number) => (<React.Fragment key={idx}><button className="pin" onClick={p.go} aria-label={p.aria} style={{ position: "absolute", left: `${p.left}px`, top: "14px", width: "28px", height: "44px", padding: "0", border: "0", background: "transparent", cursor: "pointer", transform: "translateX(-50%)" }}></button></React.Fragment>))}
<span style={{ position: "absolute", left: "40px", bottom: "22px", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "10.5px", letterSpacing: ".1em", color: "#a3b3c6" }}>TERAI</span>
<span style={{ position: "absolute", right: "40px", bottom: "22px", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "10.5px", letterSpacing: ".1em", color: "#a3b3c6" }}>HIMALAYA</span>
</nav>

</div>

      </div>
      {!x ? (<>
        <div className="jr-say" ref={r.say} data-mode={v.story.mode || "none"} data-tail="on">
          {v.story.mode === "say" ? (<>
            <div className="jr-say-head"><span className="jr-say-no">{v.story.no}</span><span>{v.story.date}</span><span aria-hidden="true">·</span><span>{v.story.place}</span></div>
            <div className="jr-say-title">{v.story.title}</div>
          </>) : null}
          <p className="jr-say-line" aria-hidden="true"><span className="jr-say-ghost">{v.story.line}</span><span className="jr-say-typed" ref={r.sayT}></span></p>
          {v.story.ach ? (<div className="jr-say-ach"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3"></path></svg><span className="jr-say-ach-k">Milestone</span><span>{v.story.ach}</span></div>) : null}
          {v.story.cta ? (<div className="jr-say-cta"><Link href="/resume" className="jr-say-btn jr-say-btn-p">Résumé</Link><a href="mailto:parbatlama70@gmail.com" className="jr-say-btn">Email</a></div>) : null}
          {v.story.mode === "say" ? (<div className="jr-say-dots" aria-hidden="true">{v.story.dots.map((d: string, i: number) => <span key={i} data-s={d} />)}</div>) : null}
        </div>
        <p className="jr-sr" aria-live="polite">{v.story.live}</p>
        {v.story.bar ? (
          <div className="jr-bar" role="group" aria-label="Story controls">
            <button type="button" className="jr-bar-b jr-bar-play" onClick={v.storyToggle} aria-label={v.story.auto ? "Pause the story" : "Play the story"} title={v.story.auto ? "Pause" : "Play"}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{v.story.auto ? <path d="M9 5v14M15 5v14"></path> : <path d="M8 5.5v13l10-6.5z"></path>}</svg>
            </button>
            <button type="button" className="jr-bar-b" onClick={v.storyPrev} disabled={v.story.first} aria-label="Previous chapter" title="Previous chapter"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"></path></svg></button>
            <button type="button" className="jr-bar-b" onClick={v.storyNext} disabled={v.story.last} aria-label="Next chapter" title="Next chapter"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"></path></svg></button>
            <div className="jr-bar-txt"><span className="jr-bar-k">Chapter {v.story.barNo} / {v.story.barTotal}</span><span className="jr-bar-d">{v.story.barDate}</span><span className="jr-bar-t">{v.story.barTitle}</span></div>
            <span className="jr-bar-p" aria-hidden="true"><span ref={r.barP}></span></span>
          </div>
        ) : null}
      </>) : null}
    </div>
  );
}
