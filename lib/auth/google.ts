import type { NextRequest } from "next/server";

/** Shared by the Google sign-in routes. */

export const OAUTH_COOKIE = "pl_oauth";

/** Where to go after sign-in: a path on this site only. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/blog";
}

export function siteOrigin(req: NextRequest): string {
  return (process.env.SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
}
