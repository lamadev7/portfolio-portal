import type { Metadata } from "next";
import Link from "next/link";
import ExperienceTable from "@/components/admin/ExperienceTable";
import { requireAdmin } from "@/lib/auth/session";
import { listRoles } from "@/lib/cms/repo";

export const metadata: Metadata = { title: "Experience" };

export default async function ExperienceAdmin() {
  requireAdmin();
  const rows = (await listRoles()).map(({ id, title, when, start, end, meta }) => ({ id, title, when, start, end, meta }));
  return (
    <>
      <header className="page-top">
        <h1>Experience</h1>
        <div className="page-actions">
          <Link className="btn" href="/admin/experience/new">
            Add role
          </Link>
        </div>
      </header>
      <ExperienceTable initial={rows} />
    </>
  );
}
