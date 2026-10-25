import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import Link from "next/link";
import ProjectForm from "@/components/admin/ProjectForm";
import { blankProject } from "@/lib/cms/blank";
import { sceneOptions } from "@/lib/cms/scenes";

export const metadata: Metadata = { title: "New project" };

export default function NewProject() {
  requireAdmin();
  return (
    <>
      <header className="page-top">
        <div>
          <Link href="/admin/projects" className="crumb-a">
            ← Projects
          </Link>
          <h1>New project</h1>
        </div>
      </header>
      <ProjectForm id={null} initial={blankProject} scenes={sceneOptions()} />
    </>
  );
}
