import { NextResponse, type NextRequest } from "next/server";

/** Gives every visitor an anonymous id (pl_vid) before the page loads, so view counting never races. */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
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
  // pages only: skip API routes, Next internals, the admin and static files
  matcher: ["/((?!api|admin|_next|meadow|fonts|models|voice|aerial|.*\\.[a-zA-Z0-9]+$).*)"],
};
