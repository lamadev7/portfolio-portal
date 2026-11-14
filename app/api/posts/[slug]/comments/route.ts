import type { NextRequest } from "next/server";
import { currentReader, error, json, publishedSlug, sameOrigin } from "@/lib/api";
import { addComment } from "@/lib/cms/engagement";
import { CmsError } from "@/lib/cms/validate";

export const dynamic = "force-dynamic";

/** Adds a comment from the signed-in reader. */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!sameOrigin(req)) return error("Bad origin", 403);
  const reader = await currentReader();
  if (!reader) return error("Sign in with Google to comment.", 401);
  const slug = await publishedSlug(params.slug);
  if (!slug) return error("Not found", 404);
  const raw = (await req.json().catch(() => ({}))) as { body?: unknown };
  // keep line breaks and tabs, drop other control characters
  const body = typeof raw.body === "string" ? raw.body.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim() : "";
  if (!body) return error("Write something first.", 400);
  if (body.length > 2000) return error("Comments can be up to 2,000 characters.", 400);
  try {
    return json(await addComment(slug, reader, body), 201);
  } catch (err) {
    if (err instanceof CmsError) return error(err.message, 429);
    throw err;
  }
}
