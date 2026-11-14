import { getDb } from "../db/mongo";
import type { AnalyticsData, DayPoint, Range, Ranked, Totals } from "./analytics-types";
import { ANALYTICS_TZ, addDays, dayKey, postCounts } from "./engagement";
import { listPosts } from "./repo";

/** The admin analytics dashboard. site_stats and site_dims _ids start with the day, so day ranges ride the _id index. */

type DimDoc = { _id: string; dim: string; key: string; views: number };

const DIMS = { page: "pages", referrer: "referrers", country: "countries", device: "devices", browser: "browsers" } as const;

export async function getAnalytics(range: Range): Promise<AnalyticsData> {
  const d = await getDb();
  const end = dayKey();
  const start = addDays(end, 1 - range);
  const prevStart = addDays(start, -range);
  const after = addDays(end, 1);
  // a day early covers every UTC offset; days are then cut in ANALYTICS_TZ by $dateToString
  const createdSince = new Date(Date.parse(`${prevStart}T00:00:00Z`) - 86400000);
  const perDay = (name: string) =>
    d
      .collection(name)
      .aggregate<{ _id: string; n: number }>([
        { $match: { createdAt: { $gte: createdSince } } },
        { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: ANALYTICS_TZ } }, n: { $sum: 1 } } },
      ])
      .toArray();

  const [days, dims, likes, comments, visitors, readers, likesAll, commentsAll, online, posts, counts] = await Promise.all([
    d
      .collection<{ _id: string; views?: number; visitors?: number; reads?: number }>("site_stats")
      .find({ _id: { $gte: prevStart, $lt: after } })
      .toArray(),
    d
      .collection<DimDoc>("site_dims")
      .aggregate<{ _id: { dim: string; key: string }; views: number }>([
        { $match: { _id: { $gte: start, $lt: after } } },
        { $group: { _id: { dim: "$dim", key: "$key" }, views: { $sum: "$views" } } },
      ])
      .toArray(),
    perDay("likes"),
    perDay("comments"),
    d.collection("visitors").estimatedDocumentCount(),
    d.collection("readers").estimatedDocumentCount(),
    d.collection("likes").estimatedDocumentCount(),
    d.collection("comments").estimatedDocumentCount(),
    d.collection("visitors").countDocuments({ lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } }),
    listPosts({ drafts: true }),
    postCounts(),
  ]);

  const stat = new Map(days.map((x) => [x._id, x]));
  const series: DayPoint[] = Array.from({ length: range }, (_, i) => {
    const day = addDays(start, i);
    const s = stat.get(day);
    return { day, views: s?.views ?? 0, visitors: s?.visitors ?? 0, reads: s?.reads ?? 0 };
  });

  const count = (rows: { _id: string; n: number }[], from: string, to: string) =>
    rows.reduce((n, r) => (r._id >= from && r._id < to ? n + r.n : n), 0);
  const totals = (from: string, to: string): Totals => {
    const t = { views: 0, visitors: 0, reads: 0, likes: count(likes, from, to), comments: count(comments, from, to) };
    for (const s of days)
      if (s._id >= from && s._id < to) {
        t.views += s.views ?? 0;
        t.visitors += s.visitors ?? 0;
        t.reads += s.reads ?? 0;
      }
    return t;
  };

  const top = Object.fromEntries(Object.values(DIMS).map((k) => [k, [] as Ranked[]])) as AnalyticsData["top"];
  for (const x of dims) if (x._id.dim in DIMS) top[DIMS[x._id.dim as keyof typeof DIMS]].push({ key: x._id.key, views: x.views });
  const shareOf = Object.fromEntries(Object.entries(top).map(([k, list]) => [k, list.reduce((n, r) => n + r.views, 0)])) as AnalyticsData["shareOf"];
  for (const list of Object.values(top)) {
    list.sort((a, b) => b.views - a.views || a.key.localeCompare(b.key));
    list.splice(8);
  }

  return {
    range,
    timeZone: ANALYTICS_TZ,
    series,
    totals: totals(start, after),
    previous: totals(prevStart, start),
    allTime: { visitors, readers, likes: likesAll, comments: commentsAll },
    online,
    top,
    shareOf,
    posts: posts
      .map((p) => ({ slug: p.slug, title: p.title, ...(counts[p.slug] ?? { reads: 0, likes: 0, comments: 0 }) }))
      .sort((a, b) => b.reads - a.reads || a.title.localeCompare(b.title)),
  };
}
