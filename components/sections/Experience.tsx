import SectionHead from "@/components/ui/SectionHead";
import { experiences, type Experience } from "@/lib/data/experiences";

/** Single experience row — kept inline to its only consumer. */
function ExperienceRow({ exp }: { exp: Experience }) {
  return (
    <article className="exp">
      <div className="when">
        {exp.when}
        <span className="dur">{exp.dur}</span>
      </div>
      <div className="body">
        <h4>
          {exp.title} <span className="at">— {exp.at}</span>
        </h4>
        <div className="role-meta">{exp.role}</div>
        <p>{exp.body}</p>
        {exp.bullets.length > 0 && (
          <ul>
            {exp.bullets.map((b, j) => (
              <li key={j}>{b}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="stack">
        <span className="label">Stack</span>
        {exp.stack.map((s, j) => (
          <span key={j} className={"tag" + (s.hl ? " hl" : "")}>
            {s.v}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function Experience() {
  return (
    <section id="experience" data-screen-label="02 Experience">
      <SectionHead num="// 01" title="Experience" meta={`${String(experiences.length).padStart(2, "0")} roles · 04 yrs`} />
      <div className="exp-list">
        {experiences.map((e, i) => (
          <ExperienceRow key={i} exp={e} />
        ))}
      </div>
    </section>
  );
}
