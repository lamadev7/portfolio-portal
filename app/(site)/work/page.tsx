import type { Metadata } from "next";
import ProjectCard from "@/components/site/ProjectCard";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Work",
  description: "AI agents and full-stack products by Parbat Lama.",
  alternates: { canonical: "/work" },
};

export const revalidate = 3600;

export default async function WorkIndex() {
  const projects = await getProjects();
  const ordered = [...projects.filter((p) => p.status === "shipped"), ...projects.filter((p) => p.status === "todo")];

  return (
    <div className="col">
      <header className="page-head" data-reveal>
        <h1>Work</h1>
        <p className="tag">AI agents and full-stack products, each with what was built and what it changed.</p>
      </header>
      <section className="sec" aria-labelledby="shipped-h" style={{ marginTop: 56 }}>
        <h2 id="shipped-h" className="sec-head" data-reveal>
          Projects
        </h2>
        {ordered.map((p) => (
          <div key={p.slug} data-reveal>
            <ProjectCard p={p} />
          </div>
        ))}
      </section>
    </div>
  );
}
