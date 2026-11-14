"use client";

import { Fragment, useEffect, useState } from "react";

/**
 * Triage Agent live workflow panel.
 *
 * Replaces the old orchestrator + 3 sub-agents SVG graph. The panel now
 * visualizes the actual triage flow — ticket → orchestrator → qa(reproduce)
 * → dev(fix) → qa(verify) → review → pr·comment — and lets the viewer
 * dispatch a Jira or Linear ticket scenario to see it animate end-to-end.
 */

interface Stage {
  id: string;
  role: string;
  label: string;
  sub: string;
  tag: string;
}

const STAGES: Stage[] = [
  { id: "ticket", role: "input",  label: "ticket",       sub: "fetch",          tag: "" },
  { id: "orch",   role: "router", label: "orchestrator", sub: "auto-route",     tag: "claude · MCP" },
  { id: "qa1",    role: "agent",  label: "qa",           sub: "reproduce bug",  tag: "no write/push" },
  { id: "dev",    role: "agent",  label: "dev",          sub: "fix · branch",   tag: "write + push" },
  { id: "qa2",    role: "agent",  label: "qa",           sub: "verify fix",     tag: "qa on live app" },
  { id: "review", role: "agent",  label: "review",       sub: "read pr",        tag: "no write" },
  { id: "pr",     role: "output", label: "pr · comment", sub: "→ ticket",       tag: "" },
];

type ScenarioId = "jira" | "linear";
interface Scenario {
  ticketKey: string;
  sourceLabel: string;
  steps: Array<[number, string]>;
}

const SCENARIOS: Record<ScenarioId, Scenario> = {
  jira: {
    ticketKey: "SKLR-1284",
    sourceLabel: "JIRA",
    steps: [
      [0, "→ orchestrator received SKLR-1284 (jira REST)"],
      [1, "  orchestrator.classify() → bug · severity: high"],
      [1, "  routes=[qa, dev, qa, review]"],
      [2, "  qa.reproduce() · zoekt indexed · 4 repos"],
      [2, "  ↳ login fast-path · 198ms"],
      [2, "  ↳ playwright nav /loads/7841 · error reproduced"],
      [2, "✓ qa → dev · evidence: stack_trace, repro_steps"],
      [3, "  dev.fetch_context() · 4 files · cross-repo"],
      [3, "  dev.edit() · src/api/loads.ts · src/lib/validate.ts"],
      [3, "  dev.test() · 12 passing · branch fix/sklr-1284"],
      [3, "✓ dev → qa · pr=#4421 · build=green"],
      [4, "  qa.verify() · target dev :3047"],
      [4, "  ↳ playwright replay · scenario passes"],
      [4, "✓ qa → review · verified=true"],
      [5, "  review.read_pr() · diff +24 -11 · clean"],
      [5, "✓ review.approve()"],
      [6, "  orchestrator.comment_back() · jira PR linked"],
      [6, "✓ session complete · 1m 47s · 89 turns · cache 92%"],
    ],
  },
  linear: {
    ticketKey: "ENG-42",
    sourceLabel: "LINEAR",
    steps: [
      [0, "→ orchestrator received ENG-42 (linear graphql)"],
      [1, "  orchestrator.classify() → feature · scope: api"],
      [1, "  routes=[qa, dev, qa, review]"],
      [2, "  qa.reproduce() · context fetch from spec"],
      [2, "✓ qa → dev · acceptance criteria locked"],
      [3, "  dev.fetch_context() · 6 files"],
      [3, "  dev.edit() · src/api/agents.ts + tests"],
      [3, "  dev.test() · 18 tests pass"],
      [3, "✓ dev → qa · pr=#4422"],
      [4, "  qa.verify() · all scenarios pass"],
      [4, "✓ qa → review"],
      [5, "  review.read_pr() · diff +89 -3 · clean"],
      [5, "✓ review.approve()"],
      [6, "  orchestrator.comment_back() · chat reply"],
      [6, "✓ session complete · 2m 14s · 113 turns"],
    ],
  },
};

interface LogLine {
  t: "ok" | "route" | "work" | "head" | "ready";
  text: string;
}

type StageState = "pending" | "active" | "done";

export default function AgentGraph() {
  const [running, setRunning] = useState<ScenarioId | null>(null);
  const [stageIdx, setStageIdx] = useState(-1);
  const [autoCycle, setAutoCycle] = useState(true);
  const [tick, setTick] = useState(0);
  const [log, setLog] = useState<LogLine[]>([
    { t: "ready", text: "triage-agent.ready() · 5 specialists · MCP tools loaded" },
  ]);

  // tick clock for packet pulse
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const frame = () => {
      setTick((performance.now() - start) / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // scenario runner
  useEffect(() => {
    if (!running) return;
    const s = SCENARIOS[running];
    setLog([{ t: "head", text: `─── triage ${s.sourceLabel} · ${s.ticketKey} ───` }]);
    setStageIdx(0);
    let i = 0;
    const interval = setInterval(() => {
      const step = s.steps[i];
      if (!step) {
        clearInterval(interval);
        setStageIdx(STAGES.length);
        setTimeout(() => {
          setRunning(null);
          setStageIdx(-1);
        }, 2200);
        return;
      }
      const [stage, line] = step;
      setStageIdx(stage);
      const txt = line.trim();
      const tType: LogLine["t"] =
        txt.startsWith("✓") ? "ok" : txt.startsWith("→") ? "route" : "work";
      setLog((prev) => [...prev, { t: tType, text: line }].slice(-9));
      i++;
    }, 650);
    return () => clearInterval(interval);
  }, [running]);

  // auto-cycle: when idle + autoCycle on, schedule next jira run
  useEffect(() => {
    if (running || !autoCycle) return;
    const delay = stageIdx === -1 && log.length <= 1 ? 1500 : 4500;
    const tm = setTimeout(() => setRunning("jira"), delay);
    return () => clearTimeout(tm);
  }, [running, autoCycle, stageIdx, log.length]);

  const stateOf = (i: number): StageState => {
    if (stageIdx >= STAGES.length) return "done";
    if (stageIdx < 0) return "pending";
    if (i < stageIdx) return "done";
    if (i === stageIdx) return "active";
    return "pending";
  };

  const cur = stageIdx >= 0 && stageIdx < STAGES.length ? STAGES[stageIdx] : null;
  const allDone = stageIdx >= STAGES.length;
  const stagesDone = Math.max(0, Math.min(stageIdx, STAGES.length));
  const progress = allDone ? 1 : stageIdx < 0 ? 0 : stagesDone / STAGES.length;

  const phase = !running && stageIdx < 0
      ? "idle · pick a ticket below to dispatch"
    : allDone
      ? "✓ workflow complete · PR opened · comment posted to ticket"
    : cur
      ? `${cur.label}.run() · ${cur.sub}`
      : "starting…";

  return (
    <div className="agent-panel triage-panel">
      <div className="panel-head">
        <span>triage-agent.workflow · ws://internal</span>
        <span className="lamps">
          <span className="lamp on" />
          <span className="lamp on" />
          <span className={running ? "lamp on" : "lamp"} />
        </span>
      </div>

      <div className="triage-flow">
        {STAGES.map((s, i) => {
          const st = stateOf(i);
          const prevDone = i > 0 && stateOf(i - 1) === "done";
          const liveArrow = st === "active" && tick % 1 < 0.5;
          const arrowCls =
            "tf-arrow" +
            (prevDone ? " tf-arrow-done" : "") +
            (liveArrow ? " tf-arrow-live" : "");
          return (
            <Fragment key={s.id}>
              {i > 0 && (
                <div className={arrowCls}>
                  →{liveArrow && <span className="tf-packet" />}
                </div>
              )}
              <div className={`tf-step tf-${st}`}>
                <div className="tf-icon">
                  {st === "done" ? "✓" : st === "active" ? "●" : "○"}
                </div>
                <div className="tf-role">{s.role}</div>
                <div className="tf-label">{s.label}</div>
                <div className="tf-sub">{s.sub}</div>
                {s.tag && <div className="tf-tag">{s.tag}</div>}
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className="triage-flow-foot">
        <span><span className="tf-phase">{phase}</span></span>
        <div className="tf-progress">
          <div className="tf-progress-fill" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
        </div>
        <span style={{ color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
          {stagesDone} / {STAGES.length} stages
        </span>
      </div>

      <div className="log">
        {log.map((l, i) => (
          <div className="line" key={i}>
            <span className="t">[{String(i).padStart(2, "0")}]</span>{" "}
            <span className={l.t === "ok" ? "ok" : l.t === "head" || l.t === "route" ? "a" : ""}>
              {l.text}
            </span>
          </div>
        ))}
      </div>

      <div className="agent-controls">
        <button
          className={running === "jira" ? "running" : ""}
          onClick={() => !running && setRunning("jira")}
        >
          ▸ triage JIRA · SKLR-1284
        </button>
        <button
          className={running === "linear" ? "running" : ""}
          onClick={() => !running && setRunning("linear")}
        >
          ▸ triage LINEAR · ENG-42
        </button>
        <button
          style={{ marginLeft: "auto" }}
          disabled={!running && !autoCycle}
          onClick={() => {
            if (running) {
              setRunning(null);
              setStageIdx(-1);
              setLog((l) => [...l, { t: "ok" as const, text: "■ session terminated" }].slice(-9));
            }
            setAutoCycle(false);
          }}
        >
          {running ? "■ stop" : autoCycle ? "■ pause auto" : "□ idle"}
        </button>
        {!autoCycle && !running && (
          <button onClick={() => setAutoCycle(true)}>▶ resume auto</button>
        )}
      </div>
    </div>
  );
}
