import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostForm from "@/components/admin/PostForm";
import { getPostById } from "@/lib/cms/repo";
import { sceneOptions } from "@/lib/cms/scenes";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPost({ params }: { params: { id: string } }) {
  requireAdmin();
  const doc = await getPostById(params.id);
  if (!doc) notFound();
  const { id, createdAt, updatedAt, ...initial } = doc;
  return (
    <>
      <header className="page-top">
        <div>
          <Link href="/admin/posts" className="crumb-a">
            ← Blog posts
          </Link>
          <h1>{doc.title}</h1>
        </div>
        <p className="page-meta">Last saved {new Date(updatedAt).toLocaleString("en-GB")}</p>
      </header>
      <PostForm key={id} id={id} initial={initial} scenes={sceneOptions()} />
    </>
  );
}
