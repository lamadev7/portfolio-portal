import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectForm from "@/components/admin/ProjectForm";
import { getProjectById } from "@/lib/cms/repo";
import { sceneOptions } from "@/lib/cms/scenes";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProject({ params }: { params: { id: string } }) {
  requireAdmin();
  const doc = await getProjectById(params.id);
  if (!doc) notFound();
  const { id, createdAt, updatedAt, ...initial } = doc;
  return (
    <>
      <header className="page-top">
        <div>
          <Link href="/admin/projects" className="crumb-a">
            ← Projects
          </Link>
          <h1>{doc.title}</h1>
        </div>
        <p className="page-meta">Last saved {new Date(updatedAt).toLocaleString("en-GB")}</p>
      </header>
      <ProjectForm key={id} id={id} initial={initial} scenes={sceneOptions()} />
    </>
  );
}
