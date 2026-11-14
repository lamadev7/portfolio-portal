import SectionHead from "@/components/ui/SectionHead";
import { stackGroups } from "@/lib/data/stack";

export default function Stack() {
  return (
    <section id="stack" data-screen-label="06 Stack">
      <SectionHead num="// 06" title="Stack" meta={`${stackGroups.length.toString().padStart(2, "0")} buckets`} />
      <div className="stack-grid">
        {stackGroups.map((g) => (
          <div className="stack-col" key={g.label}>
            <h4>{g.label}</h4>
            <div className="items">
              {g.items.map((it, j) => (
                <span className="item" key={j}>
                  {it}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
