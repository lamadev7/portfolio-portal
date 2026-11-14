import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/session";
import { logout } from "../actions";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { email } = requireAdmin();
  return (
    <div className="shell">
      <aside className="side">
        <Link href="/admin" className="side-brand">
          <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1.4">
              <ellipse cx="13" cy="6" rx="2.6" ry="4.4" />
              <ellipse cx="13" cy="20" rx="2.6" ry="4.4" />
              <ellipse cx="6" cy="13" rx="4.4" ry="2.6" />
              <ellipse cx="20" cy="13" rx="4.4" ry="2.6" />
            </g>
            <circle cx="13" cy="13" r="2.4" fill="#b93d24" />
          </svg>
          Admin
        </Link>
        <AdminNav />
        <div className="side-foot">
          <a href="/" target="_blank" rel="noreferrer">
            View site ↗
          </a>
          <p title={email}>{email}</p>
          <form action={logout}>
            <button type="submit" className="btn ghost sm block">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
