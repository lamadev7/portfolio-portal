import Link from "next/link";
import MeadowHero from "@/components/meadow/MeadowHero";
import ProjectCard from "@/components/site/ProjectCard";
import Reel from "@/components/site/Reel";
import { TIERS, tierLabel } from "@/lib/site/content";
import { fmtDate, getPosts, getProjects, getSiteContent } from "@/lib/content";

export const revalidate = 3600;

export default async function Home() {
  const [projects, allPosts, content] = await Promise.all([getProjects(), getPosts(), getSiteContent()]);
  const { site, coreStack, experience, principles, skills, nextPost } = content;
  const featured = [
    ...projects.filter((p) => p.status === "shipped" && p.featured).slice(0, 4),
    ...projects.filter((p) => p.status === "todo"),
  ];
  const also = projects.filter((p) => p.also);
  const posts = allPosts.slice(0, 3);

  return (
    <>
      <MeadowHero labelledBy="hero-title">
        <p className="role">
          <i aria-hidden="true" />
          {site.title}
        </p>
        <h1 id="hero-title">{site.name}</h1>
        <Reel lead="I build" phrases={site.reel} />
        <dl className="facts-row">
          {site.facts.map((f) => (
            <div key={f.k}>
              <dt>{f.k}</dt>
              <dd>{f.v}</dd>
            </div>
          ))}
        </dl>
        <p className="hero-links">
          {site.links.map((l) =>
            l.href.startsWith("/") ? (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            ),
          )}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </MeadowHero>

      <div className="col">
        <section className="stack-strip" aria-label="Core stack" data-reveal>
          {coreStack.map((g) => (
            <div key={g.label}>
              <p className="k">{g.label}</p>
              <ul>
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section id="work" className="sec" aria-labelledby="work-h">
          <div className="sec-head" data-reveal>
            <h2 id="work-h">Selected work</h2>
            <Link href="/work" className="more">
              All projects <span className="arr" aria-hidden="true">→</span>
            </Link>
          </div>
          {featured.map((p) => (
            <div key={p.slug} data-reveal>
              <ProjectCard p={p} />
            </div>
          ))}

          {also.length > 0 && (
            <p className="also" data-reveal>
              Also:{" "}
              {also.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 && " · "}
                  <Link href={`/work/${p.slug}`}>{p.title}</Link>
                  {p.alsoNote && ` (${p.alsoNote})`}
                </span>
              ))}
            </p>
          )}
        </section>

        <section id="experience" className="sec" aria-labelledby="exp-h">
          <h2 id="exp-h" className="sec-head" data-reveal>
            Experience
          </h2>
          <div className="dated">
            {experience.map((e) => (
              <div className="dated-row" key={e.id} data-reveal>
                <p className="dated-when">{e.when}</p>
                <div className="dated-body">
                  <h3>{e.title}</h3>
                  <p className="dated-meta">{e.meta}</p>
                  {e.bullets.length > 0 && (
                    <ul>
                      {e.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="agents" className="sec" aria-labelledby="agents-h">
          <h2 id="agents-h" className="sec-head" data-reveal>
            How I build agents
          </h2>
          <ol className="principles" data-reveal>
            {principles.map((pr, i) => (
              <li key={pr.title}>
                <p className="n">{String(i + 1).padStart(2, "0")}</p>
                <h3>{pr.title}</h3>
                <p>{pr.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="skills" className="sec" aria-labelledby="skills-h">
          <div className="sec-head" data-reveal>
            <h2 id="skills-h">Skills</h2>
            <p className="legend">
              {TIERS.map((t) => (
                <span key={t}>
                  <i className={`tier tier-${t}`} aria-hidden="true" />
                  {tierLabel[t]}
                </span>
              ))}
            </p>
          </div>
          {skills.map((g) => (
            <div className="skill-row" key={g.label} data-reveal>
              <p className="skill-k">{g.label}</p>
              <ul>
                {g.items.map(({ name, tier }) => (
                  <li key={name}>
                    <i className={`tier tier-${tier}`} aria-hidden="true" />
                    {name}
                    <span className="sr"> ({tierLabel[tier]})</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="footnote">Ordered by how often 47 current full-stack AI postings ask for each skill.</p>
        </section>

        <section id="blogs" className="sec" aria-labelledby="blogs-h">
          <div className="sec-head" data-reveal>
            <h2 id="blogs-h">Blogs</h2>
            <Link href="/blog" className="more">
              All posts <span className="arr" aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="dated">
            {posts.map((p) => (
              <div className="dated-row" key={p.slug} data-reveal>
                <p className="dated-when">{fmtDate(p.date)}</p>
                <Link href={`/blog/${p.slug}`} className="dated-body post">
                  <b>{p.title}</b>
                  <span>{p.summary}</span>
                </Link>
              </div>
            ))}
            <div className="dated-row is-next" data-reveal>
              <p className="dated-when">Next</p>
              <div className="dated-body post">
                <b>{nextPost.title}</b>
                <span>{nextPost.summary}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
