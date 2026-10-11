"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { JourneyEngine } from "./engine";
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
    const refit = () => { const el = stageRef.current; if (!el) return; const w = el.clientWidth, h = el.clientHeight, s = Math.min(w / 1440, h / 900), vw = Math.round(w / s), vh = Math.round(h / s); engine.resize(vw, vh); setFit({ s, w: vw, h: vh }); };
    refit(); window.addEventListener("resize", refit);
    return () => { window.removeEventListener("resize", refit); engine.unmount(); };
  }, []);

  const v: any = engine.renderVals();
  const r: any = (engine as any)._r;

  return (
    <div className="jr-stage" ref={stageRef}>
      <div style={{ position: "absolute", left: 0, top: 0, width: fit.w, height: fit.h, transform: `scale(${fit.s})`, transformOrigin: "0 0" }}>
<div className="root jr" ref={r.root} tabIndex={0} onWheel={v.onWheel} onKeyDown={v.onKey} onMouseMove={v.onMove} onPointerDown={v.onDown} onPointerMove={v.onPMove} onPointerUp={v.onUp} onPointerLeave={v.onUp} style={{ width: `${fit.w}px`, height: `${fit.h}px`, position: "relative", overflow: "hidden", background: "#0b1524", color: "#dbe2eb", fontFamily: "Inter, system-ui, sans-serif", fontSize: "14px", lineHeight: "1.5", userSelect: "none" }}>

<canvas ref={r.gl} role="img" aria-label="A 3D landscape of Nepal built in the page: golden paddy plains with rivers and mango trees, terraced green hills with pines and houses, the Kathmandu valley with Swayambhunath, Dharahara, Patan's pagodas and Pashupatinath, and the snow-covered Himalaya with prayer flags; lit by the sun, with drifting clouds and falling snow at altitude" style={{ position: "absolute", inset: "0", width: `${fit.w}px`, height: `${fit.h}px`, background: "#0b1524" }}></canvas>
<canvas aria-hidden="true" ref={r.cv} style={{ position: "absolute", inset: "0", width: `${fit.w}px`, height: `${fit.h}px` }}></canvas>

{/* INTRO */}
<div ref={r.intro} style={{ position: "absolute", left: "96px", top: "168px", width: "600px", display: "flex", flexDirection: "column", gap: "18px", zIndex: "4" }}>
<div aria-hidden="true" style={{ position: "absolute", left: "-96px", top: "-168px", width: "900px", height: "700px", background: "radial-gradient(ellipse at 22% 45%, rgba(8,14,24,.42), rgba(8,14,24,0) 62%)", pointerEvents: "none", zIndex: "-1" }}></div>
<div style={{ display: "flex", alignItems: "center", gap: "12px", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "13px", letterSpacing: ".1em", color: "#dbe2eb", textShadow: "0 1px 12px rgba(0,0,0,.5)", animation: "fadeup .9s both .1s" }}><span style={{ width: "22px", height: "1.5px", background: `${v.introAccent}`, transition: "background .6s" }}></span>{v.introKicker}</div>
<h1 style={{ margin: "0", fontFamily: "'Sawton Industrial', Inter, sans-serif", fontWeight: "700", fontSize: "58px", lineHeight: "1", color: "#ffffff", textShadow: "0 4px 30px rgba(8,14,26,.55)" }}>
<span style={{ display: "block", overflow: "hidden", paddingBottom: "4px" }}><span style={{ display: "inline-block", animation: "rise 1.2s cubic-bezier(.22,1,.36,1) both .2s" }}>Namaste, I'm Parbat.</span></span>
<span style={{ display: "block", overflow: "hidden", paddingBottom: "4px" }}><span style={{ display: "inline-block", animation: "rise 1.2s cubic-bezier(.22,1,.36,1) both .35s", color: `${v.introAccent}`, transition: "color .6s" }}>{v.introLine}</span></span>
</h1>
<p style={{ margin: "0", maxWidth: "500px", fontSize: "16px", lineHeight: "1.55", color: "#dbe2eb", textShadow: "0 2px 18px rgba(8,14,26,.6)", animation: "fadeup .9s both .7s" }}>{v.introP}</p>
<div style={{ display: "flex", alignItems: "center", gap: "12px", animation: "fadeup .9s both .9s" }}>
<button className="btn btn-p" onClick={v.begin} style={{ height: "52px", padding: "0 24px", border: "0", borderRadius: "3px", background: "#316add", color: "#ffffff", font: "600 15px Inter, sans-serif", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>Walk the Road <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "nudge 1.6s ease-in-out infinite" }}><path d="M5 12h14M13 6l6 6-6 6"></path></svg></button>

</div>
</div>

{/* STEP CARDS · engineer (one dated life event each) */}
{v.eng.map((m: any, idx: number) => (<React.Fragment key={idx}>
<article data-ms={m.k} data-mode="eng" style={{ position: "absolute", left: "0", top: "0", width: `${m.w}px`, boxSizing: "border-box", padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: "7px", border: "1px solid rgba(219,226,235,.16)", borderRadius: "5px", background: "rgba(8,16,28,.8)", boxShadow: "0 24px 60px rgba(4,8,16,.55)", zIndex: "3", opacity: "0", visibility: "hidden" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "11px", letterSpacing: ".08em" }}><span style={{ color: "#a3b3c6" }}>STEP {m.no} / 11</span><span style={{ padding: "2px 8px", borderRadius: "22px", background: `${m.zbg}`, color: `${m.zc}` }}>{m.zone}</span></div>
<div style={{ fontFamily: "'Sawton Industrial', Inter, sans-serif", fontWeight: "700", fontSize: "26px", lineHeight: "1", color: `${m.dc}` }}>{m.date}</div>
<h2 style={{ margin: "0", fontFamily: "'Sawton Circular', Inter, sans-serif", fontWeight: "500", fontSize: "19px", lineHeight: "1.15", color: "#ffffff" }}>{m.title}</h2>
<p style={{ margin: "0", fontSize: "13.5px", lineHeight: "1.5", color: "#dbe2eb" }}>{m.line}</p>
{m.ach ? (<>
<div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 12px", borderRadius: "3px", background: "rgba(244,185,97,.14)", border: "1px solid rgba(244,185,97,.35)" }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f4b961" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3"></path></svg><span style={{ fontSize: "12.5px", fontWeight: "600", color: "#f4b961" }}>{m.ach}</span></div>
</>) : null}
{m.last ? (<>
<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}><button className="btn btn-p" onClick={v.openRV} style={{ width: "100%", height: "44px", padding: "0 16px", border: "0", borderRadius: "3px", background: "#316add", color: "#ffffff", font: "600 13.5px Inter, sans-serif", cursor: "pointer", whiteSpace: "nowrap" }}>Open Recruiter View</button><a href="mailto:parbatlama70@gmail.com" style={{ width: "100%", boxSizing: "border-box", height: "44px", padding: "0 14px", borderRadius: "3px", border: "1px solid rgba(219,226,235,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13.5px", fontWeight: "600", color: "#ffffff", textDecoration: "none", whiteSpace: "nowrap" }}>Say hello →</a></div>
</>) : null}
</article>
</React.Fragment>))}

{/* STEP CARDS · explorer (polaroids) */}
{v.exp.map((m: any, idx: number) => (<React.Fragment key={idx}>
<article data-ms={m.k} data-mode="exp" style={{ position: "absolute", left: "0", top: "0", width: "280px", boxSizing: "border-box", padding: "10px 10px 14px", display: "flex", flexDirection: "column", gap: "10px", borderRadius: "4px", background: "#f5f2ea", color: "#172a41", boxShadow: "0 30px 60px rgba(4,8,16,.5)", zIndex: "3", opacity: "0", visibility: "hidden" }}>
<div style={{ height: "140px", borderRadius: "2px", background: "repeating-linear-gradient(135deg, #dcd6c8 0 10px, #e6e1d5 10px 20px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#4e657f" }}>
<svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
<span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "11px", letterSpacing: ".04em" }}>{m.photo}</span>
</div>
<div style={{ padding: "0 6px", display: "flex", flexDirection: "column", gap: "6px" }}>
<div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "11px", letterSpacing: ".05em", color: "#4e657f" }}><span>{m.kind}</span><span>{m.meta}</span></div>
<h2 style={{ margin: "0", fontFamily: "'Sawton Circular', Inter, sans-serif", fontWeight: "500", fontSize: "19px", lineHeight: "1.15", color: "#172a41" }}>{m.title}</h2>
<p style={{ margin: "0", fontSize: "14px", lineHeight: "1.5", color: "#394e66" }}>{m.line}</p>
{m.contact ? (<><a href="mailto:parbatlama70@gmail.com" style={{ fontSize: "14px", fontWeight: "600", color: "#316add", textDecoration: "none" }}>parbatlama70@gmail.com →</a></>) : null}
</div>
</article>
</React.Fragment>))}

{/* HEADER */}
<div aria-hidden="true" style={{ position: "absolute", top: "0", left: "0", right: "0", height: "120px", background: "linear-gradient(180deg, rgba(8,14,24,.7), rgba(8,14,24,0))", pointerEvents: "none", zIndex: "5" }}></div>
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
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

</div>
<button className="ib" onClick={v.toggleCards} aria-pressed={v.cardsOn} aria-label={v.cardsT} title={v.cardsT} style={{ color: `${v.cardsC}` }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="15" rx="2"></rect><path d="M7 9h10M7 13h6"></path>{v.cardsOn === "true" ? null : <path d="M4 20L20 4"></path>}</svg><span className="lb">{v.cardsT}</span></button>
<button className="ib" onClick={v.toggleLight} aria-label={v.lightT} title={v.lightT}>{v.isNight ? (<><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg></>) : null}{v.isDayI ? (<><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg></>) : null}</button>
<button className="ib" onClick={v.toggleSnd} aria-pressed={v.sndOn} aria-label={v.sndT} title={v.sndT} style={{ color: `${v.sndC}` }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v4h4l5 4V6L8 10H4z"></path><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"></path></svg><span className="lb">{v.sndT}</span></button>
<button className="ib" onClick={v.openRV} aria-label="Open Recruiter View: profile, projects, skills and CV" title="R\u00e9sum\u00e9 \u00b7 profile, projects, skills, CV"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><circle cx="12" cy="9" r="2.4"></circle><path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4"></path></svg><span className="lb">Résumé · profile, projects, skills, CV</span></button>
</div>
</header>

{/* BOTTOM: elevation profile + step pins */}
<div aria-hidden="true" style={{ position: "absolute", bottom: "0", left: "0", right: "0", height: "130px", background: "linear-gradient(0deg, rgba(8,14,24,.85), rgba(8,14,24,0))", pointerEvents: "none", zIndex: "5" }}></div>
<canvas aria-hidden="true" ref={r.pf} style={{ position: "absolute", left: "0", bottom: "16px", width: `${fit.w}px`, height: "90px", zIndex: "6", pointerEvents: "none" }}></canvas>
<nav aria-label="Life steps" style={{ position: "absolute", left: "0", right: "0", bottom: "16px", height: "90px", zIndex: "7" }}>
{v.pins.map((p: any, idx: number) => (<React.Fragment key={idx}><button className="pin" onClick={p.go} aria-label={p.aria} style={{ position: "absolute", left: `${p.left}px`, top: "14px", width: "28px", height: "44px", padding: "0", border: "0", background: "transparent", cursor: "pointer", transform: "translateX(-50%)" }}></button></React.Fragment>))}
<span style={{ position: "absolute", left: "40px", bottom: "22px", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "10.5px", letterSpacing: ".1em", color: "#a3b3c6" }}>TERAI</span>
<span style={{ position: "absolute", right: "212px", bottom: "22px", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "10.5px", letterSpacing: ".1em", color: "#a3b3c6" }}>HIMALAYA</span>
</nav>

{/* ============ RECRUITER VIEW ============ */}
{v.rv ? (<>
<div onWheel={v.stop} onPointerDown={v.stop} onKeyDown={v.stop} style={{ position: "absolute", inset: "0", zIndex: "20", background: "rgba(6,11,20,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
<div role="dialog" aria-label="Recruiter view" style={{ width: "1240px", height: "790px", boxSizing: "border-box", display: "flex", flexDirection: "column", borderRadius: "6px", background: "#f8f9fb", color: "#172a41", boxShadow: "0 40px 120px rgba(0,0,0,.5)", overflow: "hidden", animation: "pop .5s cubic-bezier(.22,1,.36,1) both", userSelect: "text" }}>
<div style={{ padding: "24px 32px 0", display: "flex", flexDirection: "column", gap: "10px", background: "#ffffff", borderBottom: "1px solid #dbe2eb" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "0" }}>
<div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "6px 14px" }}><h2 style={{ margin: "0", fontFamily: "'Sawton Industrial', Inter, sans-serif", fontWeight: "700", fontSize: "34px", color: "#172a41" }}>Parbat Lama</h2><span style={{ fontSize: "15px", fontWeight: "600", color: "#316add" }}>Senior Full-Stack TypeScript Engineer</span></div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: "13px", color: "#4e657f" }}><span>Lalitpur, Nepal · UTC+5:45</span><span>{v.totalExp} experience · 3 roles</span><span style={{ color: "#367628", fontWeight: "600" }}>● Available Q3 2026 · senior &amp; contract</span></div>
</div>
<button onClick={v.closeRV} aria-label="Close recruiter view" style={{ flex: "none", width: "40px", height: "40px", border: "1px solid #dbe2eb", borderRadius: "3px", background: "#ffffff", color: "#172a41", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{v.fit.map((f: any, idx: number) => (<React.Fragment key={idx}><span style={{ padding: "3px 10px", borderRadius: "22px", background: "#ecf1fe", color: "#2554ad", fontSize: "12px", fontWeight: "600" }}>{f}</span></React.Fragment>))}</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "10px" }}>
<div role="tablist" aria-label="Recruiter view sections" style={{ display: "flex", gap: "4px" }}>
{v.tabs.map((t: any, idx: number) => (<React.Fragment key={idx}><button role="tab" className="tab" aria-selected={t.sel} onClick={t.go} style={{ height: "42px", padding: "0 16px", border: "0", borderBottom: `2px solid ${t.bc}`, background: "transparent", font: "600 13.5px Inter, sans-serif", color: `${t.c}`, cursor: "pointer" }}>{t.label}</button></React.Fragment>))}
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingBottom: "8px" }}>
<a className="act" href="mailto:parbatlama70@gmail.com" style={{ height: "34px", padding: "0 14px", borderRadius: "3px", border: "1px solid #316add", background: "#316add", color: "#ffffff", fontSize: "12.5px", fontWeight: "600", display: "flex", alignItems: "center", textDecoration: "none" }}>Email</a>
<a className="act" href="https://linkedin.com/in/parbat-lama-0bb4101b8" target="_blank" rel="noopener" style={{ height: "34px", padding: "0 14px", borderRadius: "3px", border: "1px solid #bfccda", color: "#172a41", fontSize: "12.5px", fontWeight: "600", display: "flex", alignItems: "center", textDecoration: "none" }}>LinkedIn ↗</a>
<a className="act" href="https://github.com/lamadev7" target="_blank" rel="noopener" style={{ height: "34px", padding: "0 14px", borderRadius: "3px", border: "1px solid #bfccda", color: "#172a41", fontSize: "12.5px", fontWeight: "600", display: "flex", alignItems: "center", textDecoration: "none" }}>GitHub ↗</a>
<span title="Your CV PDF goes here" style={{ height: "34px", boxSizing: "border-box", padding: "0 14px", borderRadius: "3px", border: "1px dashed #879aaf", color: "#4e657f", fontSize: "12.5px", fontWeight: "600", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>Download CV · [ADD PDF]</span>
</div>
</div>
</div>
<div className="scrl" style={{ flex: "1", overflowY: "auto", padding: "26px 32px 32px" }}>

{v.tabOverview ? (<>
<div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
<section><h3 style={{ margin: "0 0 8px", fontSize: "11px", letterSpacing: ".1em", color: "#687d96" }}>SUMMARY</h3><p style={{ margin: "0", fontSize: "15px", lineHeight: "1.65", color: "#293b51" }}>Full-stack TypeScript engineer with {v.totalExp} shipping production features end to end on drayOS, PortPro's TMS for drayage carriers — React interfaces, Node services and public APIs, real-time data, third-party integrations (Orderful EDI, QuickBooks) and AWS deploys. Now building AI agents: a document validation agent and an orchestrator over dispatcher, billing and CSR agents at work, plus a ticket-to-PR triage agent of my own.</p></section>
<section><h3 style={{ margin: "0 0 12px", fontSize: "11px", letterSpacing: ".1em", color: "#687d96" }}>EXPERIENCE</h3>
<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
{v.jobs.map((j: any, idx: number) => (<React.Fragment key={idx}>
<div style={{ paddingLeft: "16px", borderLeft: `2px solid ${j.c}` }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}><span style={{ fontSize: "15.5px", fontWeight: "700", color: "#172a41" }}>{j.role} · {j.org}</span><span style={{ flex: "none", padding: "2px 9px", borderRadius: "22px", background: "#f1f4f8", fontSize: "12px", fontWeight: "600", color: "#293b51" }}>{j.dur}</span></div>
<div style={{ fontSize: "12.5px", color: "#687d96" }}>{j.when} · {j.where}</div>
<ul style={{ margin: "8px 0 0", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>{j.pts.map((x: any, idx: number) => (<React.Fragment key={idx}><li style={{ fontSize: "13.5px", lineHeight: "1.5", color: "#293b51" }}>{x}</li></React.Fragment>))}</ul>
</div>
</React.Fragment>))}
</div>
</section>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
<section style={{ padding: "18px 20px", borderRadius: "5px", background: "#ffffff", border: "1px solid #dbe2eb" }}><h3 style={{ margin: "0 0 12px", fontSize: "11px", letterSpacing: ".1em", color: "#687d96" }}>AT A GLANCE</h3>
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
<div><div style={{ fontFamily: "'Sawton Industrial', Inter, sans-serif", fontSize: "28px", color: "#172a41" }}>{v.totalShort}</div><div style={{ fontSize: "12px", color: "#4e657f" }}>Production experience</div></div>
<div><div style={{ fontFamily: "'Sawton Industrial', Inter, sans-serif", fontSize: "28px", color: "#172a41" }}>~40%</div><div style={{ fontSize: "12px", color: "#4e657f" }}>Faster new screens (design system)</div></div>
<div><div style={{ fontFamily: "'Sawton Industrial', Inter, sans-serif", fontSize: "28px", color: "#172a41" }}>11</div><div style={{ fontSize: "12px", color: "#4e657f" }}>Projects in the archive</div></div>
<div><div style={{ fontFamily: "'Sawton Industrial', Inter, sans-serif", fontSize: "28px", color: "#172a41" }}>~12</div><div style={{ fontSize: "12px", color: "#4e657f" }}>Capstone teams mentored</div></div>
</div></section>
<section style={{ padding: "18px 20px", borderRadius: "5px", background: "#ffffff", border: "1px solid #dbe2eb" }}><h3 style={{ margin: "0 0 12px", fontSize: "11px", letterSpacing: ".1em", color: "#687d96" }}>EDUCATION &amp; HONOURS</h3>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px", color: "#293b51" }}>
<div><b style={{ color: "#172a41" }}>BSc (Hons) Information Technology — First Class</b><br />Herald College Kathmandu · Feb 2021 – Oct 2023</div>
<div><b style={{ color: "#172a41" }}>AAA Scholarship</b> · 2023 and 2024</div>
<div><b style={{ color: "#172a41" }}>+2 Management (Computer Science major)</b><br />Uniglobe SS / College, Kathmandu · 2019 – 2020</div>
</div></section>
<section style={{ padding: "18px 20px", borderRadius: "5px", background: "#ffffff", border: "1px solid #dbe2eb" }}><h3 style={{ margin: "0 0 10px", fontSize: "11px", letterSpacing: ".1em", color: "#687d96" }}>CONTACT</h3>
<div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13.5px" }}>
<a href="mailto:parbatlama70@gmail.com" style={{ color: "#316add", textDecoration: "none" }}>parbatlama70@gmail.com</a>
<a href="tel:+9779745339427" style={{ color: "#316add", textDecoration: "none" }}>+977 974 533 9427</a>
<a href="https://lamaparbat.com.np" target="_blank" rel="noopener" style={{ color: "#316add", textDecoration: "none" }}>lamaparbat.com.np ↗</a>
<span style={{ color: "#293b51" }}><a href="https://github.com/lamadev7" target="_blank" rel="noopener" style={{ color: "#316add", textDecoration: "none" }}>github.com/lamadev7 ↗</a> · <a href="https://github.com/lamaparbat" target="_blank" rel="noopener" style={{ color: "#316add", textDecoration: "none" }}>github.com/lamaparbat ↗</a></span>
<a href="https://linkedin.com/in/parbat-lama-0bb4101b8" target="_blank" rel="noopener" style={{ color: "#316add", textDecoration: "none" }}>linkedin.com/in/parbat-lama ↗</a>
</div></section>
</div>
</div>
</>) : null}

{v.tabProjects ? (<>
<div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
{v.archive.map((g: any, idx: number) => (<React.Fragment key={idx}>
<section><h3 style={{ margin: "0 0 12px", fontSize: "11px", letterSpacing: ".1em", color: "#687d96" }}>{g.title}</h3>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px" }}>
{g.items.map((p: any, idx: number) => (<React.Fragment key={idx}>
<article className="pc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "8px", borderRadius: "5px", background: "#ffffff", border: "1px solid #dbe2eb" }}>
<div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#687d96" }}><span style={{ fontWeight: "600", color: "#316add" }}>{p.no}</span><span>{p.tag}</span></div>
<div style={{ fontSize: "16px", fontWeight: "700", color: "#172a41" }}>{p.title}</div>
<p style={{ margin: "0", fontSize: "13px", lineHeight: "1.55", color: "#394e66" }}>{p.desc}</p>
<ul style={{ margin: "0", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "3px" }}>{p.hl.map((h: any, idx: number) => (<React.Fragment key={idx}><li style={{ fontSize: "12.5px", lineHeight: "1.45", color: "#293b51" }}>{h}</li></React.Fragment>))}</ul>
<div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "auto", paddingTop: "8px" }}>{p.stack.map((t: any, idx: number) => (<React.Fragment key={idx}><span style={{ padding: "2px 8px", borderRadius: "3px", background: "#f1f4f8", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "11px", color: "#394e66" }}>{t}</span></React.Fragment>))}</div>
<div style={{ display: "flex", gap: "14px", fontSize: "12.5px", fontWeight: "600" }}>{p.links.map((k: any, idx: number) => (<React.Fragment key={idx}><a href={k.href} target="_blank" rel="noopener" style={{ color: "#316add", textDecoration: "none" }}>{k.label} ↗</a></React.Fragment>))}{p.note ? (<><span style={{ color: "#687d96", fontWeight: "500" }}>{p.note}</span></>) : null}</div>
</article>
</React.Fragment>))}
</div>
</section>
</React.Fragment>))}
</div>
</>) : null}

{v.tabSkills ? (<>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "14px" }}>
{v.skills.map((g: any, idx: number) => (<React.Fragment key={idx}>
<section style={{ padding: "18px 20px", borderRadius: "5px", background: "#ffffff", border: "1px solid #dbe2eb" }}><h3 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "700", color: "#172a41" }}>{g.title}</h3><div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{g.items.map((t: any, idx: number) => (<React.Fragment key={idx}><span style={{ padding: "4px 10px", borderRadius: "3px", background: "#f1f4f8", fontSize: "12.5px", color: "#293b51" }}>{t}</span></React.Fragment>))}</div></section>
</React.Fragment>))}
</div>
</>) : null}

</div>
</div>
</div>
</>) : null}
</div>

      </div>
    </div>
  );
}
