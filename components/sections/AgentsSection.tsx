import dynamic from "next/dynamic";
import SectionHead from "@/components/ui/SectionHead";

/**
 * AgentGraph is a heavy client component (animation loop, scenario player).
 * Dynamic-load it with ssr:false so it doesn't bloat the initial HTML.
 */
const AgentGraph = dynamic(() => import("@/components/agents/AgentGraph"), {
  ssr: false,
  loading: () => (
    <div className="agent-panel">
      <div className="panel-head">
        <span>triage-agent.workflow · loading…</span>
      </div>
      <div className="graph" />
    </div>
  ),
});

export default function AgentsSection() {
  return (
    <section id="agents" data-screen-label="04 Agents">
      <SectionHead num="// 03" title="Agentic AI · on the boundaries between agents." meta="live simulator" />
      <div className="agents">
        <div className="intro">
          <h3>
            Click <em>Triage</em> on a ticket. Come back to a PR.
          </h3>
          <p>
            <strong>Triage Agent</strong> reads a Jira or Linear ticket, reproduces the bug,
            writes the fix, runs QA, opens a PR, and comments back — in one session,
            surviving crashes.
          </p>
          <p style={{ color: "var(--ink-faint)", fontSize: 12, marginTop: -4 }}>
            // not a chatbot. an end-to-end workflow.
          </p>

          <ul style={{ margin: "10px 0 14px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            <li style={{ position: "relative", paddingLeft: 18, color: "var(--ink-dim)", fontSize: 13 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>→</span>
              <strong style={{ color: "var(--ink)" }}>5 specialists, scoped tools.</strong> qa can&apos;t push, review can&apos;t write.
            </li>
            <li style={{ position: "relative", paddingLeft: 18, color: "var(--ink-dim)", fontSize: 13 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>→</span>
              <strong style={{ color: "var(--ink)" }}>Evidence-gated handoffs.</strong> dev→qa requires <code>files_changed</code>, <code>build_status</code>, <code>pr_url</code>.
            </li>
            <li style={{ position: "relative", paddingLeft: 18, color: "var(--ink-dim)", fontSize: 13 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>→</span>
              <strong style={{ color: "var(--ink)" }}>Crash-resilient.</strong> MongoDB-backed sessions resume at the last workflow phase.
            </li>
            <li style={{ position: "relative", paddingLeft: 18, color: "var(--ink-dim)", fontSize: 13 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>→</span>
              <strong style={{ color: "var(--ink)" }}>10–25× faster code search.</strong> Zoekt trigram index across all configured repos.
            </li>
            <li style={{ position: "relative", paddingLeft: 18, color: "var(--ink-dim)", fontSize: 13 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>→</span>
              <strong style={{ color: "var(--ink)" }}>Hardened against itself.</strong> Dedupe + bash-safety + productivity-tracker hooks kill stuck loops and self-kill commands.
            </li>
            <li style={{ position: "relative", paddingLeft: 18, color: "var(--ink-dim)", fontSize: 13 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--accent)" }}>→</span>
              <strong style={{ color: "var(--ink)" }}>Ships as a <code>.dmg</code>.</strong> Electron with bundled Redis, Claude CLI, Zoekt, uvx. No <code>brew install</code>.
            </li>
          </ul>

          <p style={{ color: "var(--ink-faint)", fontSize: 12 }}>
            ↓ dispatch a Jira or Linear ticket below to watch the workflow run end-to-end.
          </p>

          <div className="agents-stack">
            stack · <span>Claude Agent SDK</span> · <span>Next.js</span> · <span>MongoDB</span> · <span>Redis · BullMQ</span> · <span>Zoekt</span> · <span>MCP</span> · <span>Electron</span>
          </div>
        </div>
        <AgentGraph />
      </div>
    </section>
  );
}
