import Link from "next/link";
import type { AnalyticsData } from "@/lib/cms/analytics-types";
import { n } from "./format";

const LIMIT = 10;

/** Posts by all-time reads, with likes and comments. */
export default function TopPosts({ posts }: { posts: AnalyticsData["posts"] }) {
  const max = Math.max(1, ...posts.map((p) => p.reads));
  return (
    <section className="panel">
      <header className="panel-head bars-head">
        <h2>Posts</h2>
        <span>All time</span>
      </header>
      {posts.length === 0 ? (
        <p className="rep-empty bars-empty">No posts yet</p>
      ) : (
        <table className="table eng">
          <thead>
            <tr>
              <th>Title</th>
              <th>Reads</th>
              <th className="num">Likes</th>
              <th className="num">Comments</th>
            </tr>
          </thead>
          <tbody>
            {posts.slice(0, LIMIT).map((p) => (
              <tr key={p.slug}>
                <td>
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="row-link">
                    {p.title}
                  </a>
                </td>
                <td className="eng-reads">
                  <span className="nums">
                    {n(p.reads)}
                    <span className="eng-unit"> {p.reads === 1 ? "read" : "reads"}</span>
                  </span>
                  <span className="bar" aria-hidden="true">
                    {p.reads > 0 && <i style={{ width: `${(p.reads / max) * 100}%` }} />}
                  </span>
                </td>
                <td className="num nums">
                  {n(p.likes)}
                  <span className="eng-unit"> {p.likes === 1 ? "like" : "likes"}</span>
                </td>
                <td className="num nums">
                  {n(p.comments)}
                  <span className="eng-unit"> {p.comments === 1 ? "comment" : "comments"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {posts.length > LIMIT && (
        <Link href="/admin/posts" className="panel-more">
          All {posts.length} posts →
        </Link>
      )}
    </section>
  );
}
