import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Art from "@/components/site/Art";
import { getProject, getProjects } from "@/lib/content";
import { sceneArt } from "@/lib/content/art";

type Params = { params: { slug: string } };

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const p = getProject(params.slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.tagline,
    alternates: { canonical: `/work/${p.slug}` },
    openGraph: { title: p.title, description: p.tagline, type: "article" },
  };
}

const bare = (href: string) => href.replace(/^https?:\/\/(www\.)?/, "");

export default function ProjectPage({ params }: Params) {
  const all = getProjects();
  const i = all.findIndex((p) => p.slug === params.slug);
  if (i < 0) notFound();
  const p = all[i];
  const next = all[(i + 1) % all.length];

  return (
    <article className="col">
      <header className="page-head" data-reveal>
        <Link href="/work" className="crumb">
          <span className="arr" aria-hidden="true">←</span> All work
        </Link>
        {p.kicker && <p className="kicker">{p.kicker}</p>}
        <h1>{p.title}</h1>
        <p className="tag">{p.summary}</p>
      </header>

      <Art art={sceneArt(p.art, p.artAlt)} priority />

      <dl className="facts-grid" data-reveal>
        <div>
          <dt>{p.status === "todo" ? "Status" : "When"}</dt>
          <dd>{p.when}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{p.role}</dd>
        </div>
        {(p.repo || p.live) && (
          <div>
            <dt>Links</dt>
            <dd>
              {p.live && (
                <a href={p.live} target="_blank" rel="noopener noreferrer">
                  {bare(p.live)}
                </a>
              )}
              {p.live && p.repo && <br />}
              {p.repo && (
                <a href={p.repo} target="_blank" rel="noopener noreferrer">
                  Source on GitHub
                </a>
              )}
            </dd>
          </div>
        )}
      </dl>

      {p.metrics.length > 0 && (
        <div data-reveal>
          <div className={p.status === "todo" ? "metrics metrics-todo" : "metrics"}>
            {p.metrics.map((m) => (
              <div key={m.v + m.k}>
                <p className="metric-v">{m.v}</p>
                <p className="metric-k">{m.k}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.highlight && (
        <p className="callout" data-reveal>
          <small>Worth knowing</small>
          {p.highlight}
        </p>
      )}

      <div className="prose" data-reveal dangerouslySetInnerHTML={{ __html: p.html }} />

      {p.stack.length > 0 && (
        <div className="chips" data-reveal style={{ marginTop: 40 }} aria-label="Stack">
          {p.stack.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}

      {next && next.slug !== p.slug && (
        <Link href={`/work/${next.slug}`} className="next-link">
          <small>Next project</small>
          <b>{next.title} →</b>
        </Link>
      )}
    </article>
  );
}
