import SectionHead from "@/components/ui/SectionHead";
import { education } from "@/lib/data/education";

export default function EduHonors() {
  return (
    <section id="education" data-screen-label="05 Education">
      <SectionHead num="// 04" title="Education & Honors" meta="2019 — 2023" />
      <div className="edu-honors">
        <div className="edu">
          {education.map((row, i) => (
            <div className="row" key={i}>
              <div className="when">{row.when}</div>
              <div>
                <h4>{row.title}</h4>
                <div className="sub">{row.sub}</div>
                {row.award && <div className="award">{row.award}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="honors">
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            // 05 — Honors
          </div>
          <h4>AAA Scholarship</h4>
          <div className="honor-meta">Academic · Attitude · Attendance</div>
          <div className="honor-meta" style={{ color: "var(--ink-faint)" }}>
            Herald College Kathmandu · Innovate Nepal Group
          </div>
          <div className="years">2023 · 2024</div>
        </div>
      </div>
    </section>
  );
}
