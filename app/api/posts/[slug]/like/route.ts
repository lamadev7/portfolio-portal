import type { NextRequest } from "next/server";
import { currentReader, error, json, publishedSlug, sameOrigin } from "@/lib/api";
import { toggleLike } from "@/lib/cms/engagement";

export const dynamic = "force-dynamic";

/** Likes or unlikes the post for the signed-in reader. */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!sameOrigin(req)) return error("Bad origin", 403);
  const reader = await currentReader();
  if (!reader) return error("Sign in with Google to like posts.", 401);
  const slug = await publishedSlug(params.slug);
  if (!slug) return error("Not found", 404);
  return json(await toggleLike(slug, reader.id));
}
