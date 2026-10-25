import type { NextRequest } from "next/server";
import { currentReader, error, json, sameOrigin } from "@/lib/api";
import { deleteComment } from "@/lib/cms/engagement";

export const dynamic = "force-dynamic";

/** Readers can delete their own comments. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!sameOrigin(req)) return error("Bad origin", 403);
  const reader = await currentReader();
  if (!reader) return error("Sign in first.", 401);
  const slug = await deleteComment(params.id, reader.id);
  return slug ? json({ ok: true }) : error("Not found", 404);
}
