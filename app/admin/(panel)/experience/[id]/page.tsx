import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RoleForm from "@/components/admin/RoleForm";
import { requireAdmin } from "@/lib/auth/session";
import { getRole } from "@/lib/cms/repo";

export const metadata: Metadata = { title: "Edit role" };

export default async function EditRole({ params }: { params: { id: string } }) {
  requireAdmin();
  const role = await getRole(params.id);
  if (!role) notFound();
  const { id, ...initial } = role;
  return (
    <>
      <header className="page-top">
        <div>
          <Link href="/admin/experience" className="crumb-a">
            ← Experience
          </Link>
          <h1>{role.title}</h1>
        </div>
      </header>
      <RoleForm key={id} id={id} initial={initial} />
    </>
  );
}
