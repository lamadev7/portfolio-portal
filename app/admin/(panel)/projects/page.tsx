import type { Metadata } from "next";
import Link from "next/link";
import ProjectsTable from "@/components/admin/ProjectsTable";
import { requireAdmin } from "@/lib/auth/session";
import { listProjects } from "@/lib/cms/repo";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsAdmin() {
  requireAdmin();
  const projects = await listProjects({ drafts: true });
  const rows = projects.map(({ id, title, slug, status, featured, draft, updatedAt }) => ({ id, title, slug, status, featured, draft, updatedAt }));
  return (
    <>
      <header className="page-top">
        <h1>Projects</h1>
        <div className="page-actions">
          <Link className="btn" href="/admin/projects/new">
            New project
          </Link>
        </div>
      </header>
      <ProjectsTable initial={rows} />
    </>
  );
}
