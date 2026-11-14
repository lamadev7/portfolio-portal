import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { readSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  if (readSession()) redirect("/admin");
  return (
    <main className="login">
      <div className="login-card">
        <svg width="30" height="30" viewBox="0 0 26 26" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.3">
            <ellipse cx="13" cy="6" rx="2.6" ry="4.4" />
            <ellipse cx="13" cy="20" rx="2.6" ry="4.4" />
            <ellipse cx="6" cy="13" rx="4.4" ry="2.6" />
            <ellipse cx="20" cy="13" rx="4.4" ry="2.6" />
          </g>
          <circle cx="13" cy="13" r="2.4" fill="#b93d24" />
        </svg>
        <h1>Portfolio admin</h1>
        <p>Sign in to edit projects, posts and site content.</p>
        <LoginForm />
      </div>
    </main>
  );
}
