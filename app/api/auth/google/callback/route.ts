import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { READER_COOKIE, readerCookieOptions, readerCookieValue, signReader } from "@/lib/auth/reader";
import { upsertReader } from "@/lib/cms/engagement";
import { OAUTH_COOKIE, safeNext, siteOrigin } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

function readOauthCookie(raw: string | undefined): { state: string; verifier: string; next: string } | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(signReader(`oauth.${payload}`));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/** Google redirects back here with ?code&state. Exchanges the code, verifies the ID token's claims, signs the reader in. */
export async function GET(req: NextRequest) {
  const saved = readOauthCookie(req.cookies.get(OAUTH_COOKIE)?.value);
  const next = safeNext(saved?.next ?? null);
  const origin = siteOrigin(req);
  const fail = (why: string) => {
    console.error("google sign-in failed:", why);
    const res = NextResponse.redirect(`${origin}${next}${next.includes("?") ? "&" : "?"}signin=failed#comments`);
    res.cookies.set(OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!saved || !code || !state || state !== saved.state) return fail("missing or mismatched state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return fail(`token endpoint ${tokenRes.status}`);
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail("no id_token");

  // The token came straight from Google's token endpoint over TLS, so its claims can be checked without
  // re-verifying the signature (Google's OpenID Connect guidance for server-side code flow).
  let claims: { iss?: string; aud?: string; exp?: number; sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
  try {
    claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return fail("unreadable id_token");
  }
  if (!ISSUERS.includes(claims.iss ?? "")) return fail("bad issuer");
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) return fail("bad audience");
  if (!claims.exp || claims.exp < Date.now() / 1000) return fail("expired token");
  if (!claims.sub || !claims.email || claims.email_verified !== true) return fail("unverified email");

  const readerId = await upsertReader({
    sub: claims.sub,
    email: claims.email,
    name: (claims.name || claims.email.split("@")[0]).slice(0, 80),
    picture: (claims.picture ?? "").slice(0, 500),
  });

  const res = NextResponse.redirect(`${origin}${next}#comments`);
  res.cookies.set(READER_COOKIE, readerCookieValue(readerId), readerCookieOptions);
  res.cookies.set(OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  return res;
}
