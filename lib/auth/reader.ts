import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Reader session for people who signed in with Google (likes and comments).
 * Signed with SESSION_SECRET under its own label, so it can never be used as an admin session.
 */

export const READER_COOKIE = "pl_reader";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return s;
}

export function signReader(payload: string): string {
  return createHmac("sha256", secret()).update(`reader.${payload}`).digest("base64url");
}

export function readerCookieValue(readerId: string): string {
  const payload = Buffer.from(JSON.stringify({ rid: readerId, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  return `${payload}.${signReader(payload)}`;
}

export const readerCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export function readReaderId(): string | null {
  const raw = cookies().get(READER_COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(signReader(payload));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { rid?: unknown; exp?: unknown };
    if (typeof data.rid !== "string" || typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data.rid;
  } catch {
    return null;
  }
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
