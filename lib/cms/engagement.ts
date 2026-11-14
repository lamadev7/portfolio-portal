import { ObjectId } from "mongodb";
import { getDb } from "../db/mongo";
import type { Hit } from "./traffic";
import { CmsError } from "./validate";

/**
 * Visitors, reads, likes and comments. Visitors are anonymous ids from the pl_vid cookie (no IPs stored);
 * likes and comments belong to readers who signed in with Google.
 */

export interface Reader {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface PublicComment {
  id: string;
  body: string;
  name: string;
  picture: string;
  createdAt: string;
  mine: boolean;
}

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|whatsapp|discord|curl|wget|python-requests/i;
export const isBot = (ua: string | null) => !ua || BOT.test(ua);

function zone(): string {
  const tz = process.env.ANALYTICS_TZ || "Asia/Kathmandu";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return "Asia/Kathmandu";
  }
}

/** Analytics days (site_stats, site_dims) are cut in this timezone. Older docs are keyed in UTC. */
export const ANALYTICS_TZ = zone();
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: ANALYTICS_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD in ANALYTICS_TZ. */
export const dayKey = (at = new Date()) => dayFormat.format(at);
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const today = () => dayKey();
const db = getDb;

// ---------- readers (Google accounts) ----------

export async function upsertReader(g: { sub: string; email: string; name: string; picture: string }): Promise<string> {
  const now = new Date();
  const res = await (await db()).collection("readers").findOneAndUpdate(
    { googleSub: g.sub },
    { $set: { email: g.email.toLowerCase(), name: g.name, picture: g.picture, lastLoginAt: now }, $setOnInsert: { googleSub: g.sub, createdAt: now } },
    { upsert: true, returnDocument: "after", projection: { _id: 1 } },
  );
  return (res!._id as ObjectId).toHexString();
}

export async function getReader(id: string): Promise<Reader | null> {
  if (!ObjectId.isValid(id)) return null;
  const r = await (await db()).collection("readers").findOne({ _id: new ObjectId(id), banned: { $ne: true } });
  return r ? { id, name: String(r.name ?? ""), email: String(r.email ?? ""), picture: String(r.picture ?? "") } : null;
}

// ---------- visits ----------

/** One page view. A visitor counts once per day towards "visitors"; the referrer only on entry views. */
export async function trackVisit(vid: string, hit: Hit): Promise<void> {
  const d = await db();
  const day = today();
  const dims: [string, string | null][] = [
    ["page", hit.path],
    ["referrer", hit.referrer],
    ["country", hit.country],
    ["device", hit.device],
    ["browser", hit.browser],
  ];
  const [before] = await Promise.all([
    d
      .collection<{ _id: string; lastDay?: string }>("visitors")
      .findOneAndUpdate(
        { _id: vid },
        { $set: { lastDay: day, lastSeen: new Date() }, $inc: { views: 1 }, $setOnInsert: { firstSeen: new Date() } },
        { upsert: true, returnDocument: "before", projection: { lastDay: 1 } },
      ),
    d.collection<{ _id: string }>("site_dims").bulkWrite(
      dims
        .filter((x): x is [string, string] => x[1] !== null)
        .map(([dim, key]) => ({
          updateOne: { filter: { _id: `${day}|${dim}|${key}` }, update: { $inc: { views: 1 }, $setOnInsert: { day, dim, key } }, upsert: true },
        })),
      { ordered: false },
    ),
  ]);
  await d
    .collection<{ _id: string }>("site_stats")
    .updateOne({ _id: day }, { $inc: { views: 1, visitors: before?.lastDay === day ? 0 : 1 } }, { upsert: true });
}

/** Counts a read once per visitor per post; returns the post's read count. */
export async function recordRead(slug: string, vid: string): Promise<number> {
  const d = await db();
  const first = await d
    .collection<{ _id: string }>("post_reads")
    .updateOne({ _id: `${slug}:${vid}` }, { $setOnInsert: { slug, at: new Date() } }, { upsert: true });
  const stats = d.collection<{ _id: string; reads?: number }>("post_stats");
  if (first.upsertedCount) {
    const [doc] = await Promise.all([
      stats.findOneAndUpdate({ _id: slug }, { $inc: { reads: 1 } }, { upsert: true, returnDocument: "after" }),
      d.collection<{ _id: string }>("site_stats").updateOne({ _id: today() }, { $inc: { reads: 1 } }, { upsert: true }),
    ]);
    return doc?.reads ?? 1;
  }
  return (await stats.findOne({ _id: slug }))?.reads ?? 0;
}

// ---------- likes ----------

export async function toggleLike(slug: string, readerId: string): Promise<{ likes: number; liked: boolean }> {
  const d = await db();
  const likes = d.collection("likes");
  const removed = await likes.deleteOne({ postSlug: slug, readerId });
  let liked = false;
  if (!removed.deletedCount) {
    try {
      await likes.insertOne({ postSlug: slug, readerId, createdAt: new Date() });
      liked = true;
    } catch (err) {
      // a double click raced us: the like already exists
      if ((err as { code?: number }).code !== 11000) throw err;
      liked = true;
    }
  }
  return { likes: await likes.countDocuments({ postSlug: slug }), liked };
}

// ---------- comments ----------

export async function addComment(slug: string, reader: Reader, body: string): Promise<PublicComment> {
  const d = await db();
  const comments = d.collection("comments");
  const recent = await comments.countDocuments({ readerId: reader.id, createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } });
  if (recent >= 5) throw new CmsError("You're commenting a lot. Try again in a few minutes.");
  const now = new Date();
  const res = await comments.insertOne({ postSlug: slug, readerId: reader.id, name: reader.name, picture: reader.picture, body, createdAt: now });
  return { id: res.insertedId.toHexString(), body, name: reader.name, picture: reader.picture, createdAt: now.toISOString(), mine: true };
}

/** Deletes a comment. Readers may delete only their own; pass readerId null for an admin. */
export async function deleteComment(id: string, readerId: string | null): Promise<string | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await (await db()).collection("comments").findOneAndDelete(
    { _id: new ObjectId(id), ...(readerId ? { readerId } : {}) },
    { projection: { postSlug: 1 } },
  );
  return doc ? String(doc.postSlug) : null;
}

export async function getEngagement(slug: string, readerId: string | null) {
  const d = await db();
  const [stats, likes, liked, comments] = await Promise.all([
    d.collection<{ _id: string; reads?: number }>("post_stats").findOne({ _id: slug }),
    d.collection("likes").countDocuments({ postSlug: slug }),
    readerId ? d.collection("likes").countDocuments({ postSlug: slug, readerId }, { limit: 1 }) : Promise.resolve(0),
    d.collection("comments").find({ postSlug: slug }).sort({ createdAt: 1 }).limit(500).toArray(),
  ]);
  return {
    reads: stats?.reads ?? 0,
    likes,
    liked: liked > 0,
    comments: comments.map(
      (c): PublicComment => ({
        id: c._id.toHexString(),
        body: String(c.body),
        name: String(c.name ?? "Reader"),
        picture: String(c.picture ?? ""),
        createdAt: (c.createdAt as Date).toISOString(),
        mine: Boolean(readerId && c.readerId === readerId),
      }),
    ),
  };
}

// ---------- admin views ----------

export async function siteStats() {
  const d = await db();
  const t = today();
  const since = (n: number) => addDays(t, -n);
  const [visitors, days, comments, readers, likes, top] = await Promise.all([
    d.collection("visitors").estimatedDocumentCount(),
    d.collection<{ _id: string; views?: number; visitors?: number }>("site_stats").find({ _id: { $gte: since(29) } }).toArray(),
    d.collection("comments").estimatedDocumentCount(),
    d.collection("readers").estimatedDocumentCount(),
    d.collection("likes").estimatedDocumentCount(),
    d.collection<{ _id: string; reads?: number }>("post_stats").find({}).sort({ reads: -1 }).limit(5).toArray(),
  ]);
  const sum = (key: "views" | "visitors", from: string) => days.filter((x) => x._id >= from).reduce((n, x) => n + (x[key] ?? 0), 0);
  return {
    visitors,
    viewsToday: days.find((x) => x._id === t)?.views ?? 0,
    visitorsToday: days.find((x) => x._id === t)?.visitors ?? 0,
    views7: sum("views", since(6)),
    views30: sum("views", since(29)),
    comments,
    readers,
    likes,
    topPosts: top.map((x) => ({ slug: x._id, reads: x.reads ?? 0 })),
  };
}

export async function totalVisitors(): Promise<number> {
  return (await db()).collection("visitors").estimatedDocumentCount();
}

export async function listRecentComments(limit = 200) {
  const docs = await (await db()).collection("comments").find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  const readerIds = Array.from(new Set(docs.map((c) => String(c.readerId)))).filter(ObjectId.isValid);
  const readers = await (await db())
    .collection("readers")
    .find({ _id: { $in: readerIds.map((x) => new ObjectId(x)) } }, { projection: { email: 1 } })
    .toArray();
  const email = new Map(readers.map((r) => [r._id.toHexString(), String(r.email ?? "")]));
  return docs.map((c) => ({
    id: c._id.toHexString(),
    postSlug: String(c.postSlug),
    name: String(c.name ?? ""),
    email: email.get(String(c.readerId)) ?? "",
    body: String(c.body),
    createdAt: (c.createdAt as Date).toISOString(),
  }));
}

/** Reads, likes and comments per post slug, for the admin posts list. */
export async function postCounts(): Promise<Record<string, { reads: number; likes: number; comments: number }>> {
  const d = await db();
  const [stats, likes, comments] = await Promise.all([
    d.collection<{ _id: string; reads?: number }>("post_stats").find({}).toArray(),
    d.collection("likes").aggregate<{ _id: string; n: number }>([{ $group: { _id: "$postSlug", n: { $sum: 1 } } }]).toArray(),
    d.collection("comments").aggregate<{ _id: string; n: number }>([{ $group: { _id: "$postSlug", n: { $sum: 1 } } }]).toArray(),
  ]);
  const out: Record<string, { reads: number; likes: number; comments: number }> = {};
  const row = (slug: string) => (out[slug] ??= { reads: 0, likes: 0, comments: 0 });
  for (const s of stats) row(s._id).reads = s.reads ?? 0;
  for (const l of likes) row(l._id).likes = l.n;
  for (const c of comments) row(c._id).comments = c.n;
  return out;
}
