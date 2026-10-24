import Link from "next/link";
import type { Project } from "@/lib/content";

/** One project in the board-B card layout: kicker, title, summary, three result boxes, stack and a link. */
export default function ProjectCard({ p }: { p: Project }) {
  const href = `/work/${p.slug}`;
  const todo = p.status === "todo";
  const code = p.cta === "code" && p.repo;

  return (
    <article className="card">
      <p className="card-kicker">
        <span>{p.kicker}</span>
        {todo ? <span className="badge">TODO</span> : <span>{p.when}</span>}
      </p>
      <h3 className="card-title">
        <Link href={href}>{p.title}</Link>
      </h3>
      <p className="card-summary">{p.summary}</p>
      {p.features.length > 0 ? (
        <ul className="features">
          {p.features.map((f) => (
            <li key={f.v}>
              <b>{f.v}</b>
              <span>{f.k}</span>
            </li>
          ))}
        </ul>
      ) : p.metrics.length > 0 && (
        <div className={todo ? "metrics metrics-todo" : "metrics"}>
          {p.metrics.map((m) => (
            <div key={m.v + m.k}>
              <p className="metric-v">{m.v}</p>
              <p className="metric-k">{m.k}</p>
            </div>
          ))}
        </div>
      )}
      <p className="card-foot">
        <span>{p.cardStack}</span>
        {code ? (
          <a href={p.repo} target="_blank" rel="noopener noreferrer">
            Code →
          </a>
        ) : (
          <Link href={href}>Case study →</Link>
        )}
      </p>
    </article>
  );
}
