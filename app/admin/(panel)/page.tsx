import Link from "next/link";
import BarList, { type BarItem } from "@/components/admin/analytics/BarList";
import Kpi from "@/components/admin/analytics/Kpi";
import Toolbar from "@/components/admin/analytics/Toolbar";
import TopPosts from "@/components/admin/analytics/TopPosts";
import TrafficChart from "@/components/admin/analytics/TrafficChart";
import { country } from "@/components/admin/analytics/format";
import { requireAdmin } from "@/lib/auth/session";
import { getAnalytics } from "@/lib/cms/analytics";
import { RANGES, type Ranked } from "@/lib/cms/analytics-types";
import { countContent, listPosts, listProjects } from "@/lib/cms/repo";

const plain = (rows: Ranked[]): BarItem[] => rows.map((r) => ({ ...r, label: r.key }));

export default async function Dashboard({ searchParams }: { searchParams: { range?: string | string[] } }) {
  requireAdmin();
  const range = RANGES.find((r) => String(r) === searchParams.range) ?? 30;
  const [a, counts, projects, posts] = await Promise.all([getAnalytics(range), countContent(), listProjects({ drafts: true }), listPosts({ drafts: true })]);
  const recent = [...projects.map((p) => ({ ...p, kind: "project" as const })), ...posts.map((p) => ({ ...p, kind: "post" as const }))]
    .sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))
    .slice(0, 6);
  const { totals: t, previous: p } = a;

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

      <div className="dash">
        <Toolbar range={range} online={a.online} visitors={a.allTime.visitors} />

        <div className="kpis">
          <Kpi label="Visitors" value={t.visitors} previous={p.visitors} range={range} series={a.series.map((d) => d.visitors)} />
          <Kpi label="Page views" value={t.views} previous={p.views} range={range} series={a.series.map((d) => d.views)} />
          <Kpi label="Post reads" value={t.reads} previous={p.reads} range={range} series={a.series.map((d) => d.reads)} />
          <Kpi label="Likes" value={t.likes} previous={p.likes} range={range} allTime={a.allTime.likes} />
          <Kpi label="Comments" value={t.comments} previous={p.comments} range={range} allTime={a.allTime.comments} href="/admin/comments" />
        </div>

        <section className="panel">
          <header className="panel-head chart-head">
            <div>
              <h2>Traffic</h2>
              <p>Page views and visitors per day, last {range} days</p>
            </div>
            <ul className="legend">
              <li>
                <i className="key key-area" />
                Page views
              </li>
              <li>
                <i className="key key-visitors" />
                Visitors
              </li>
            </ul>
          </header>
          <div className="chart-body">
            <TrafficChart series={a.series} />
            <p className="chart-note">Your own visits and local or preview traffic aren&apos;t counted.</p>
          </div>
        </section>

        <div className="breakdown">
          <BarList
            title="Top pages"
            total={t.views}
            className="wide"
            items={a.top.pages.map((r) => ({
              ...r,
              label: /^\/(?!\/)/.test(r.key) ? (
                <a href={r.key} target="_blank" rel="noreferrer" className="row-link">
                  {r.key}
                </a>
              ) : (
                r.key
              ),
            }))}
          />
          <BarList title="Referrers" total={t.views} className="wide" items={plain(a.top.referrers)} />
          <BarList
            title="Countries"
            total={t.views}
            items={a.top.countries.map((r) => {
              const c = country(r.key);
              return {
                ...r,
                label: (
                  <>
                    <span className="flag" aria-hidden="true">
                      {c.flag}
                    </span>
                    {c.name}
                  </>
                ),
              };
            })}
          />
          <BarList title="Devices" total={t.views} items={plain(a.top.devices)} />
          <BarList title="Browsers" total={t.views} items={plain(a.top.browsers)} />
        </div>

        <TopPosts posts={a.posts} />

        <div className="dash-foot">
          <section className="panel">
            <header className="panel-head">
              <h2>Content</h2>
            </header>
            <ul className="mini">
              <li>
                <Link href="/admin/projects">Projects</Link>
                <span className="nums">{counts.projects}</span>
              </li>
              <li>
                <Link href="/admin/posts">Blog posts</Link>
                <span className="nums">{counts.posts}</span>
              </li>
              <li>
                <span>Drafts</span>
                <span className="nums">{counts.drafts}</span>
              </li>
              <li>
                <Link href="/admin/site">Edit site content →</Link>
              </li>
            </ul>
          </section>
          <section className="panel">
            <header className="panel-head">
              <h2>Recently edited</h2>
            </header>
            {recent.length === 0 ? (
              <p className="rep-empty bars-empty">Nothing yet</p>
            ) : (
              <ul className="list mini-list">
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
            )}
          </section>
        </div>
      </div>
    </>
  );
}
