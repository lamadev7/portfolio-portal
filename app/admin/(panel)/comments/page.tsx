import type { Metadata } from "next";
import CommentsTable from "@/components/admin/CommentsTable";
import { requireAdmin } from "@/lib/auth/session";
import { listRecentComments } from "@/lib/cms/engagement";

export const metadata: Metadata = { title: "Comments" };

export default async function CommentsAdmin() {
  requireAdmin();
  const rows = await listRecentComments();
  return (
    <>
      <header className="page-top">
        <h1>Comments</h1>
      </header>
      <CommentsTable initial={rows} />
    </>
  );
}
