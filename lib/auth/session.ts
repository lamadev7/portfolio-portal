import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Admin session: an HMAC-signed, httpOnly cookie scoped to /admin, valid for 7 days.
 * Rotating SESSION_SECRET signs everyone out.
 */

const COOKIE = "pl_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSession(email: string): void {
  const payload = Buffer.from(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: MAX_AGE,
  });
}

export function readSession(): { email: string } | null {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: unknown; exp?: unknown };
    if (typeof data.email !== "string" || typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/admin", maxAge: 0 });
}

/** For admin pages and server actions: the signed-in admin, or a redirect to the login page. */
export function requireAdmin(): { email: string } {
  const session = readSession();
  if (!session) redirect("/admin/login");
  return session;
}

// Best-effort login throttle: 5 failed attempts per address per 10 minutes (per server instance).
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 10 * 60 * 1000;

function clientKey(): string {
  const h = headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export function loginBlocked(): boolean {
  const a = attempts.get(clientKey());
  return Boolean(a && a.count >= 5 && a.until > Date.now());
}

export function recordLoginFailure(): void {
  const key = clientKey();
  const a = attempts.get(key);
  const now = Date.now();
  attempts.set(key, a && a.until > now ? { count: a.count + 1, until: a.until } : { count: 1, until: now + WINDOW_MS });
}

export function clearLoginFailures(): void {
  attempts.delete(clientKey());
}
