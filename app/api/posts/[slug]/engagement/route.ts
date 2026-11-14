import { currentReader, error, json, publishedSlug } from "@/lib/api";
import { googleConfigured } from "@/lib/auth/reader";
import { getEngagement } from "@/lib/cms/engagement";

export const dynamic = "force-dynamic";

/** Reads, likes and comments for a post, plus who is signed in. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = await publishedSlug(params.slug);
  if (!slug) return error("Not found", 404);
  const reader = await currentReader();
  const data = await getEngagement(slug, reader?.id ?? null);
  return json({ ...data, me: reader ? { name: reader.name, picture: reader.picture } : null, google: googleConfigured() });
}
