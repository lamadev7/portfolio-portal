import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { siteStats } from "@/lib/cms/engagement";
import { countContent, listPosts, listProjects } from "@/lib/cms/repo";

const n = (x: number) => x.toLocaleString("en");
const plural = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;

export default async function Dashboard() {
  requireAdmin();
  const [counts, stats, projects, posts] = await Promise.all([countContent(), siteStats(), listProjects({ drafts: true }), listPosts({ drafts: true })]);
  const titles = new Map(posts.map((p) => [p.slug, p.title]));
  const recent = [...projects.map((p) => ({ ...p, kind: "project" as const })), ...posts.map((p) => ({ ...p, kind: "post" as const }))]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <>
      <header className="page-top">
        <h1>Dashboard</h1>
        <div className="page-actions">
          <Link className="btn ghost" href="/admin/posts/new">
            New post
          </Link>
          <Link className="btn" href="/admin/projects/new">
            New project
          </Link>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <b>{n(stats.visitors)}</b>
          <span>Visitors, all time</span>
        </div>
        <div className="stat">
          <b>{n(stats.viewsToday)}</b>
          <span>
            Views today · {n(stats.visitorsToday)} {stats.visitorsToday === 1 ? "visitor" : "visitors"}
          </span>
        </div>
        <div className="stat">
          <b>{n(stats.views30)}</b>
          <span>Views, last 30 days</span>
        </div>
        <Link href="/admin/comments" className="stat">
          <b>{n(stats.comments)}</b>
          <span>
            {stats.comments === 1 ? "Comment" : "Comments"} · {plural(stats.likes, "like", "likes")} · {plural(stats.readers, "reader", "readers")}
          </span>
        </Link>
      </div>
      <div className="stats">
        <Link href="/admin/projects" className="stat">
          <b>{counts.projects}</b>
          <span>Projects</span>
        </Link>
        <Link href="/admin/posts" className="stat">
          <b>{counts.posts}</b>
          <span>Blog posts</span>
        </Link>
        <div className="stat">
          <b>{counts.drafts}</b>
          <span>Drafts</span>
        </div>
        <Link href="/admin/site" className="stat">
          <b>Edit →</b>
          <span>Site content</span>
        </Link>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2>Most-read posts</h2>
        </header>
        {stats.topPosts.length === 0 ? (
          <p className="rep-empty" style={{ padding: "14px 18px" }}>
            No reads counted yet.
          </p>
        ) : (
          <ul className="top-list">
            {stats.topPosts.map((t) => (
              <li key={t.slug}>
                <a href={`/blog/${t.slug}`} target="_blank" rel="noreferrer" className="row-link">
                  {titles.get(t.slug) ?? t.slug}
                </a>
                <span className="nums">{n(t.reads)} reads</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Recently edited</h2>
        </header>
        <ul className="list">
          {recent.map((r) => (
            <li key={r.kind + r.id}>
              <Link href={`/admin/${r.kind === "project" ? "projects" : "posts"}/${r.id}`}>
                <span className="list-title">{r.title}</span>
                <span className="list-meta">
                  {r.kind === "project" ? "Project" : "Post"}
                  {r.draft && <em className="tag tag-draft">Draft</em>}
                  <time dateTime={r.updatedAt}>{new Date(r.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
