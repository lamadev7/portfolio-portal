import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Art from "@/components/site/Art";
import { fmtDate, getPost, getPosts } from "@/lib/content";
import { sceneArt } from "@/lib/content/art";

type Params = { params: { slug: string } };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const p = getPost(params.slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.summary,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { title: p.title, description: p.summary, type: "article", publishedTime: p.date.toISOString() },
  };
}

export default function PostPage({ params }: Params) {
  const all = getPosts();
  const i = all.findIndex((p) => p.slug === params.slug);
  if (i < 0) notFound();
  const p = all[i];
  const older = all[i + 1] ?? all[0];

  return (
    <article className="col">
      <header className="page-head" data-reveal>
        <Link href="/blog" className="crumb">
          <span className="arr" aria-hidden="true">←</span> All posts
        </Link>
        <h1>{p.title}</h1>
        <p className="tag">{p.summary}</p>
        <p className="meta">
          <span>
            <time dateTime={p.date.toISOString().slice(0, 10)}>{fmtDate(p.date)}</time>
          </span>
          <span>{p.minutes} min read</span>
          {p.tags.length > 0 && <span>{p.tags.join(", ")}</span>}
        </p>
      </header>

      <Art art={sceneArt(p.art, p.artAlt)} priority />

      <div className="prose" data-reveal dangerouslySetInnerHTML={{ __html: p.html }} />

      {older && older.slug !== p.slug && (
        <Link href={`/blog/${older.slug}`} className="next-link">
          <small>{i + 1 < all.length ? "Older post" : "Latest post"}</small>
          <b>{older.title} →</b>
        </Link>
      )}
    </article>
  );
}
