import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import SiteForm from "@/components/admin/SiteForm";
import { getSiteSettings } from "@/lib/cms/repo";

export const metadata: Metadata = { title: "Site content" };

export default async function SiteAdmin() {
  requireAdmin();
  const content = await getSiteSettings();
  return (
    <>
      <header className="page-top">
        <div>
          <h1>Site content</h1>
          <p className="page-meta">Hero, stack, experience, skills and footer on the home page.</p>
        </div>
      </header>
      <SiteForm initial={content} />
    </>
  );
}
