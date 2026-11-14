import type { NextRequest } from "next/server";
import { error, json, publishedSlug, sameOrigin, visitorId } from "@/lib/api";
import { getEngagement, isBot, recordRead } from "@/lib/cms/engagement";
import { untracked } from "@/lib/cms/traffic";

export const dynamic = "force-dynamic";

/** Counts this visitor's read of the post (once per visitor, not for untracked traffic) and returns the totals. */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  if (!sameOrigin(req)) return error("Bad origin", 403);
  const slug = await publishedSlug(params.slug);
  if (!slug) return error("Not found", 404);
  const vid = visitorId();
  const counted = vid && !isBot(req.headers.get("user-agent")) && !untracked(req);
  const reads = counted ? await recordRead(slug, vid) : (await getEngagement(slug, null)).reads;
  return json({ reads });
}
