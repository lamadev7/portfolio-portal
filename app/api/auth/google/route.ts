import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_COOKIE, safeNext, siteOrigin } from "@/lib/auth/google";
import { googleConfigured, signReader } from "@/lib/auth/reader";

export const dynamic = "force-dynamic";

/** Starts "Sign in with Google": authorization code flow with PKCE and a signed state cookie. */
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!googleConfigured()) {
    return new NextResponse("Google sign-in isn't set up on this site yet.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${siteOrigin(req)}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const payload = Buffer.from(JSON.stringify({ state, verifier, next })).toString("base64url");
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, `${payload}.${signReader(`oauth.${payload}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
