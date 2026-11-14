import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate, getPosts, getSiteContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blogs",
  description: "Notes by Parbat Lama on building products and AI agents.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 3600;

export default async function BlogIndex() {
  const [posts, { nextPost }] = await Promise.all([getPosts(), getSiteContent()]);
  return (
    <div className="col">
      <header className="page-head" data-reveal>
        <h1>Blogs</h1>
        <p className="tag">Notes on building products and the agents that run them.</p>
      </header>
      <section id="blogs" className="sec" aria-labelledby="posts-h" style={{ marginTop: 56 }}>
        <h2 id="posts-h" className="sec-head" data-reveal>
          All posts
        </h2>
        <div className="dated">
          {posts.length === 0 && <p className="empty">Nothing here yet.</p>}
          {posts.map((p) => (
            <div className="dated-row" key={p.slug} data-reveal>
              <p className="dated-when">{fmtDate(p.date)}</p>
              <Link href={`/blog/${p.slug}`} className="dated-body post">
                <b>{p.title}</b>
                <span>
                  {p.summary} · {p.minutes} min
                </span>
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
  );
}
