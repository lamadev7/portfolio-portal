import type { NextRequest } from "next/server";
import { json, sameOrigin, visitorId } from "@/lib/api";
import { isBot, trackVisit } from "@/lib/cms/engagement";
import { readHit, untracked } from "@/lib/cms/traffic";
import { hasDatabase } from "@/lib/db/mongo";

export const dynamic = "force-dynamic";

/** One page view from the site's tracker (components/site/Track.tsx). */
export async function POST(req: NextRequest) {
  const vid = visitorId();
  if (!hasDatabase() || !vid || !sameOrigin(req) || untracked(req) || isBot(req.headers.get("user-agent"))) return json({ ok: false }, 202);
  const hit = readHit(req, await req.json().catch(() => null));
  if (!hit) return json({ ok: false }, 202);
  try {
    await trackVisit(vid, hit);
    return json({ ok: true });
  } catch (err) {
    console.error("track failed", err);
    return json({ ok: false }, 202);
  }
}
