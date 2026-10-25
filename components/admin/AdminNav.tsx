"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/posts", label: "Blog posts" },
  { href: "/admin/experience", label: "Experience" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/site", label: "Site content" },
  { href: "/admin/account", label: "Account" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="side-nav" aria-label="Admin">
      {LINKS.map((l) => {
        const current = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
