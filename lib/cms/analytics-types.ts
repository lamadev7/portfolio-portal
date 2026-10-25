/** Shape of the admin analytics dashboard data. Produced by getAnalytics() in lib/cms/analytics.ts. */

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export interface DayPoint {
  /** YYYY-MM-DD in the analytics timezone. */
  day: string;
  views: number;
  /** Unique visitors that day. */
  visitors: number;
  /** First-time post reads that day. */
  reads: number;
}

export interface Totals {
  views: number;
  /** Sum of daily unique visitors over the period. */
  visitors: number;
  reads: number;
  likes: number;
  comments: number;
}

export interface Ranked {
  key: string;
  views: number;
}

export interface AnalyticsData {
  range: Range;
  /** IANA timezone the days are cut in, e.g. "Asia/Kathmandu". */
  timeZone: string;
  /** One point per day, oldest first, exactly `range` long, zero-filled. */
  series: DayPoint[];
  totals: Totals;
  /** The `range` days before the current period, for change percentages. */
  previous: Totals;
  allTime: { visitors: number; readers: number; likes: number; comments: number };
  /** Visitors seen in the last 5 minutes. */
  online: number;
  /** Top 8 of each, most viewed first, over the period. */
  top: {
    /** Site paths, e.g. "/", "/blog/some-post". */
    pages: Ranked[];
    /** External referrer hostnames ("google.com"); "Direct" when there is none. */
    referrers: Ranked[];
    /** ISO 3166-1 alpha-2 codes ("NP", "US"); "Unknown" when the host gives none. */
    countries: Ranked[];
    /** "Desktop" | "Mobile" | "Tablet". */
    devices: Ranked[];
    /** "Chrome" | "Safari" | "Firefox" | "Edge" | "Other". */
    browsers: Ranked[];
  };
  /** Posts by reads over all time, with engagement. */
  posts: { slug: string; title: string; reads: number; likes: number; comments: number }[];
}
