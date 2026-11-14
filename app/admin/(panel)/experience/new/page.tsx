import type { Metadata } from "next";
import Link from "next/link";
import RoleForm from "@/components/admin/RoleForm";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Add role" };

export default function NewRole() {
  requireAdmin();
  return (
    <>
      <header className="page-top">
        <div>
          <Link href="/admin/experience" className="crumb-a">
            ← Experience
          </Link>
          <h1>Add role</h1>
        </div>
      </header>
      <RoleForm id={null} initial={{ when: "", title: "", meta: "", bullets: [] }} />
    </>
  );
}
