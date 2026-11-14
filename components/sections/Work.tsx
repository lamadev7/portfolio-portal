import SectionHead from "@/components/ui/SectionHead";
import { projects, type WorkProject } from "@/lib/data/projects";

function ProjectCard({ w }: { w: WorkProject }) {
  return (
    <a className="work-card" href={w.href} target="_blank" rel="noopener noreferrer">
      <div className="work-top">
        <span className="work-id">PROJECT_{w.id}</span>
        <span className="work-arrow">↗</span>
      </div>
      <h4>
        <span className="brace">{"{ "}</span>
        {w.slot}
        <span className="brace">{" }"}</span>
      </h4>
      <div className="work-name">{w.name}</div>
      <div className="pitch">{w.pitch}</div>
      <div className="highlight">
        <span className="hl-k">↳ highlight</span>
        <span className="hl-v">{w.highlight}</span>
      </div>
      <div className="work-stack">
        {w.stack.map((s, j) => (
          <span key={j} className="ws-tag">
            {s}
          </span>
        ))}
      </div>
      <div className="work-meta">
        <span className="k">Role</span><b>{w.role}</b>
        <span className="k">Year</span><b>{w.year}</b>
        <span className="k">Source</span><b>github ↗</b>
      </div>
    </a>
  );
}

export default function Work() {
  return (
    <section id="work" data-screen-label="03 Work">
      <SectionHead
        num="// 02"
        title="Selected Work"
        meta={`${String(projects.length).padStart(2, "0")} projects · open source`}
      />
      <div className="work-grid">
        {projects.map((w) => (
          <ProjectCard key={w.id} w={w} />
        ))}
      </div>
    </section>
  );
}
