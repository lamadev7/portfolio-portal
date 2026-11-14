import type React from "react";

export default function Header({ region, explorer, muted, onMode, onMute, onHome }: {
  region: string; explorer: boolean; muted: boolean; onMode: (x: boolean) => void; onMute: () => void; onHome: () => void;
}) {
  const key = (e: React.KeyboardEvent) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); onMode(!explorer); } };
  return (
    <header className="j2-head">
      <button type="button" className="j2-logo" onClick={onHome} aria-label="Back to the start">
        <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round"><path d="M2 20 9 7l4 6 3-4 6 11z" /><path d="M7.5 9.8 9 7l1.5 2.8" stroke="#98b9fb" /></svg>
        <span><span className="j2-logo-n">parbat.lama</span><span className="j2-logo-r">{region}</span></span>
      </button>
      <div className="j2-sw" role="radiogroup" aria-label="Portfolio mode" onKeyDown={key} data-x={explorer ? "true" : "false"}>
        <button type="button" role="radio" aria-checked={!explorer} tabIndex={explorer ? -1 : 0} onClick={() => onMode(false)}><span aria-hidden="true">ENGINEER</span><span className="j2-sr">Engineer</span></button>
        <span className="j2-sw-dot" aria-hidden="true" />
        <button type="button" role="radio" aria-checked={explorer} tabIndex={explorer ? 0 : -1} onClick={() => onMode(true)}><span aria-hidden="true">EXPLORER</span><span className="j2-sr">Explorer</span></button>
        <span className="j2-sw-line" aria-hidden="true" />
      </div>
      <button type="button" className="j2-ib" onClick={onMute} aria-pressed={!muted} aria-label={muted ? "Sound off" : "Sound on"} title={muted ? "Sound off" : "Sound on"}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10v4h4l5 4V6L8 10H4z" />
          {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
        </svg>
      </button>
    </header>
  );
}
