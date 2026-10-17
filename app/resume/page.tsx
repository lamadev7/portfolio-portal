import type { Metadata } from "next";
import Link from "next/link";
import { careerLength, profile } from "@/lib/data/profile";
import { experiences } from "@/lib/data/experiences";
import { projects } from "@/lib/data/projects";
import { stackGroups } from "@/lib/data/stack";
import { education } from "@/lib/data/education";
import { contactLinks } from "@/lib/data/contact";
import PrintButton from "./PrintButton";
import "./resume.css";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Résumé",
  description: `${profile.name}, ${profile.headline}. ${profile.location}.`,
  alternates: { canonical: "/resume" },
};

const CONTACT_ORDER = ["Email", "Phone", "Website", "LinkedIn", "GitHub"];

const contacts = CONTACT_ORDER.flatMap((k) => {
  const c = contactLinks.find((l) => l.k === k);
  if (!c) return [];
  const parts = c.v.split("·").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return [{ key: k, label: c.v, href: c.href }];
  return parts.map((p) => ({ key: `${k}-${p}`, label: p, href: `https://${p}` }));
});

const range = (when: string) => when.replace(/\s*→\s*/, " – ");
const bareUrl = (href: string) => href.replace(/^https?:\/\//, "");

/** Print-ready résumé: two A4 sheets on screen, the same two pages on paper. */
export default function ResumePage() {
  const highlights = profile.achievements.filter((a) => a.kind === "work");

  return (
    <div className="rs-root">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />

      <nav className="rs-bar" aria-label="Résumé actions">
        <div className="rs-bar-in">
          <Link href="/" className="rs-btn rs-btn-g">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Back to portfolio
          </Link>
          <span className="rs-bar-title">Résumé · A4</span>
          <PrintButton fileName={`${profile.name.replace(/\s+/g, "-")}-Resume`} />
        </div>
      </nav>

      <main className="rs-doc">
        <article className="rs-sheet" aria-label={`${profile.name}, résumé, page 1`}>
          <header className="rs-head">
            <div className="rs-ident">
              <h1 className="rs-name">{profile.name}</h1>
              <p className="rs-headline">{profile.headline}</p>
              <p className="rs-where">
                {profile.location} ({profile.timezone}) · {careerLength()} experience
              </p>
              <p className="rs-avail">{profile.availability}</p>
            </div>
            <ul className="rs-contact">
              {contacts.map((c) => (
                <li key={c.key}>
                  <a href={c.href} {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </header>

          <section className="rs-sec" aria-labelledby="rs-summary">
            <h2 id="rs-summary" className="rs-h">Summary</h2>
            <p className="rs-summary">{profile.summary}</p>
          </section>

          <section className="rs-sec" aria-labelledby="rs-experience">
            <h2 id="rs-experience" className="rs-h">Experience</h2>
            {experiences.map((job) => (
              <article key={`${job.at}-${job.when}`} className="rs-entry">
                <div className="rs-entry-head">
                  <h3 className="rs-entry-title">
                    {job.title} <span className="rs-at">· {job.at}</span>
                  </h3>
                  <span className="rs-date">{range(job.when)}</span>
                </div>
                <p className="rs-meta">
                  {job.role} · {job.dur}
                </p>
                <p className="rs-body">{job.body}</p>
                {job.bullets.length ? (
                  <ul className="rs-bullets">
                    {job.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="rs-stack">
                  <span className="rs-stack-k">Stack</span>
                  {job.stack.map((s, i) => (
                    <span key={s.v}>
                      {i ? ", " : ""}
                      {s.hl ? <b>{s.v}</b> : s.v}
                    </span>
                  ))}
                </p>
              </article>
            ))}
          </section>
        </article>

        <article className="rs-sheet" aria-label={`${profile.name}, résumé, page 2`}>
          <section className="rs-sec" aria-labelledby="rs-projects">
            <h2 id="rs-projects" className="rs-h">Selected projects</h2>
            {projects.map((p) => (
              <article key={p.id} className="rs-entry rs-proj">
                <div className="rs-entry-head">
                  <h3 className="rs-entry-title">
                    {p.name} <span className="rs-at">· {p.role}</span>
                  </h3>
                  <span className="rs-date">{p.year}</span>
                </div>
                <p className="rs-body">{p.pitch}</p>
                <div className="rs-proj-foot">
                  <p className="rs-stack">
                    <span className="rs-stack-k">Stack</span>
                    {p.stack.join(", ")}
                  </p>
                  <a className="rs-link" href={p.href} target="_blank" rel="noopener">
                    {bareUrl(p.href)}
                  </a>
                </div>
              </article>
            ))}
          </section>

          <section className="rs-sec" aria-labelledby="rs-skills">
            <h2 id="rs-skills" className="rs-h">Skills</h2>
            <dl className="rs-skills">
              {stackGroups.map((g) => (
                <div key={g.label}>
                  <dt>{g.label}</dt>
                  <dd>{g.items.join(", ")}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rs-sec" aria-labelledby="rs-education">
            <h2 id="rs-education" className="rs-h">Education &amp; honours</h2>
            {education.map((e) => (
              <article key={e.title} className="rs-entry rs-edu">
                <div className="rs-entry-head">
                  <h3 className="rs-entry-title">{e.sub}</h3>
                  <span className="rs-date">{range(e.when)}</span>
                </div>
                <p className="rs-meta">
                  {e.title}
                  {e.award ? ` · ${e.award}` : ""}
                </p>
              </article>
            ))}
            <ul className="rs-honours" aria-label="Highlights">
              {highlights.map((a) => (
                <li key={a.title}>
                  <b>{a.title}</b>
                  <span>{a.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
