import type { NextRequest } from "next/server";
import { error, json, sameOrigin } from "@/lib/api";
import { READER_COOKIE } from "@/lib/auth/reader";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error("Bad origin", 403);
  const res = json({ ok: true });
  res.cookies.set(READER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
