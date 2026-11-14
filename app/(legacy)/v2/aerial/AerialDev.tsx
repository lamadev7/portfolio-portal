"use client";

import { useEffect, useRef, useState } from "react";
import { STOPS, type Stop } from "@/components/journey2/contracts";
import { ATTRIBUTION, createAerial, type AerialExt } from "@/components/journey2/aerial";
import { Meter } from "@/components/journey2/aerial/metrics";

const START: Stop = { id: "nepal", scene: "sarlahi", name: "Nepal", region: "", ll: [84.12, 28.39], chapters: [] };

type Row = { leg: string; fps: number; p95: number; worst: number; long: number; blank: number; sharp: number; ms: number };

export default function AerialDev() {
  const host = useRef<HTMLDivElement>(null);
  const aerial = useRef<AerialExt | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [from, setFrom] = useState(-1);
  const [to, setTo] = useState(0);

  useEffect(() => {
    const a = createAerial();
    aerial.current = a;
    void a.mount(host.current!).then(() => setReady(true));
    return () => a.dispose();
  }, []);

  const leg = async (a: AerialExt, f: Stop, t: Stop, lift: boolean) => {
    const m = new Meter(a.map!);
    const t0 = performance.now();
    m.start();
    if (lift) await a.liftFrom(f);
    await a.fly(f, t);
    const r = { leg: `${f.id}→${t.id}`, ...m.stop(), ms: Math.round(performance.now() - t0) };
    console.log("[A]", JSON.stringify(r));
    setRows((x) => [...x, r]);
    return r;
  };

  const run = async (list: Stop[]) => {
    const a = aerial.current;
    if (!a || busy) return;
    setBusy(true);
    setRows([]);
    const out: Row[] = [];
    try {
      for (let i = 1; i < list.length; i++) {
        out.push(await leg(a, list[i - 1], list[i], list[i - 1].id !== "nepal"));
        await new Promise((r) => setTimeout(r, list[i].flyby ? 300 : 1100));
        if (list[i].flyby && i < list.length - 1) await a.orbit(list[i], { durationSec: 2.5 });
      }
    } finally {
      setBusy(false);
    }
    const sum = out.reduce((s, r) => ({ long: s.long + r.long, blank: s.blank + r.blank }), { long: 0, blank: 0 });
    console.log("[A] route", JSON.stringify(sum));
    (window as unknown as { __aerialRows?: Row[] }).__aerialRows = out;
    return out;
  };

  useEffect(() => {
    (window as unknown as { __aerialStopsList?: Stop[] }).__aerialStopsList = STOPS;
    (window as unknown as { __aerialDev?: unknown }).__aerialDev = {
      route: () => run([START, ...STOPS]),
      leg: (i: number, j: number) => run([i < 0 ? START : STOPS[i], STOPS[j]]),
      legs: (ids: string[]) => run(ids.map((id) => (id === "nepal" ? START : STOPS.find((s) => s.id === id)!))),
      aerial: () => aerial.current,
      Meter,
    };
  });

  const btn = { padding: "6px 10px", background: "#1b2440", color: "#dfe7ff", border: "1px solid #34406a", borderRadius: 6, cursor: "pointer", font: "12px system-ui" } as const;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#03050c" }}>
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", left: 12, top: 12, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", maxWidth: "calc(100vw - 24px)" }} data-ui>
        <button style={btn} disabled={!ready || busy} onClick={() => void run([START, ...STOPS])}>Fly whole route</button>
        <select style={btn} value={from} onChange={(e) => setFrom(+e.target.value)}>
          <option value={-1}>nepal</option>
          {STOPS.map((s, i) => <option key={s.id} value={i}>{s.id}</option>)}
        </select>
        <select style={btn} value={to} onChange={(e) => setTo(+e.target.value)}>
          {STOPS.map((s, i) => <option key={s.id} value={i}>{s.id}</option>)}
        </select>
        <button style={btn} disabled={!ready || busy} onClick={() => void run([from < 0 ? START : STOPS[from], STOPS[to]])}>Fly leg</button>
        <span style={{ color: "#8b97b8", font: "12px system-ui" }}>{ready ? (busy ? "flying…" : "ready") : "loading…"}</span>
      </div>
      {rows.length > 0 && (
        <table style={{ position: "absolute", right: 12, top: 12, color: "#cfd8f2", font: "11px ui-monospace, monospace", background: "rgba(5,8,18,.72)", borderRadius: 6, padding: 6 }} data-ui>
          <tbody>
            <tr><th align="left">leg</th><th>fps</th><th>p95</th><th>worst</th><th>&gt;33ms</th><th>blank</th><th>sharp</th><th>s</th></tr>
            {rows.map((r) => (
              <tr key={r.leg + r.ms}><td>{r.leg}</td><td>{r.fps}</td><td>{r.p95}</td><td>{r.worst}</td><td>{r.long}</td><td>{r.blank}</td><td>{r.sharp}</td><td>{(r.ms / 1000).toFixed(1)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ position: "absolute", left: 12, bottom: 8, color: "rgba(200,210,235,.55)", font: "10px system-ui" }}>{ATTRIBUTION}</div>
    </div>
  );
}
