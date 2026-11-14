import type { Metadata } from "next";
import AccountForm from "@/components/admin/AccountForm";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  const { email } = requireAdmin();
  return (
    <>
      <header className="page-top">
        <h1>Account</h1>
      </header>
      <AccountForm email={email} />
    </>
  );
}
