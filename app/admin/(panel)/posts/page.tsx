import type { Metadata } from "next";
import Link from "next/link";
import PostsTable from "@/components/admin/PostsTable";
import { requireAdmin } from "@/lib/auth/session";
import { postCounts } from "@/lib/cms/engagement";
import { listPosts } from "@/lib/cms/repo";

export const metadata: Metadata = { title: "Blog posts" };

export default async function PostsAdmin() {
  requireAdmin();
  const [posts, counts] = await Promise.all([listPosts({ drafts: true }), postCounts()]);
  const rows = posts.map(({ id, title, slug, date, draft }) => ({ id, title, slug, date, draft, ...(counts[slug] ?? { reads: 0, likes: 0, comments: 0 }) }));
  return (
    <>
      <header className="page-top">
        <h1>Blog posts</h1>
        <div className="page-actions">
          <Link className="btn" href="/admin/posts/new">
            New post
          </Link>
        </div>
      </header>
      <PostsTable initial={rows} />
    </>
  );
}
