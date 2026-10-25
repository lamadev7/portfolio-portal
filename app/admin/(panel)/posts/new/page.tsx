import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import Link from "next/link";
import PostForm from "@/components/admin/PostForm";
import { blankPost } from "@/lib/cms/blank";
import { sceneOptions } from "@/lib/cms/scenes";

export const metadata: Metadata = { title: "New post" };

export default function NewPost() {
  requireAdmin();
  return (
    <>
      <header className="page-top">
        <div>
          <Link href="/admin/posts" className="crumb-a">
            ← Blog posts
          </Link>
          <h1>New post</h1>
        </div>
      </header>
      <PostForm id={null} initial={blankPost()} scenes={sceneOptions()} />
    </>
  );
}
