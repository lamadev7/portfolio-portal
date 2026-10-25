import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, ownerCookie } from "./lib/auth/owner";

/**
 * Pages: gives every visitor an anonymous id (pl_vid) before the page loads, so view counting never races.
 * Admin: marks a signed-in admin's browser as the owner's (pl_owner), so their views aren't counted.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (req.cookies.has("pl_admin") && !req.cookies.has(OWNER_COOKIE)) res.cookies.set(OWNER_COOKIE, "1", ownerCookie);
    return res;
  }
  if (!req.cookies.get("pl_vid")) {
    res.cookies.set("pl_vid", crypto.randomUUID().replace(/-/g, ""), {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = {
  // pages (skipping API routes, Next internals, the admin and static files), plus the admin for pl_owner
  matcher: ["/((?!api|admin|_next|meadow|fonts|models|voice|aerial|.*\\.[a-zA-Z0-9]+$).*)", "/admin/:path*"],
};
