import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { readReaderId } from "./auth/reader";
import { getReader, type Reader } from "./cms/engagement";
import { getPost } from "./content";
import { hasDatabase } from "./db/mongo";

/** Small helpers shared by the public API routes. */

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const error = (message: string, status: number) => json({ error: message }, status);

/** Mutations must come from this site (the cookies are SameSite=Lax too). */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === req.nextUrl.origin || origin === process.env.SITE_URL;
}

export function visitorId(): string | null {
  const v = cookies().get("pl_vid")?.value;
  return v && /^[a-f0-9]{32}$/.test(v) ? v : null;
}

export async function currentReader(): Promise<Reader | null> {
  const id = readReaderId();
  return id ? getReader(id) : null;
}

/** The slug of a published post, or null. */
export async function publishedSlug(slug: string): Promise<string | null> {
  if (!hasDatabase() || !/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return (await getPost(slug)) ? slug : null;
}
