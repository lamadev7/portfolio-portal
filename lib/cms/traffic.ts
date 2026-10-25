import type { NextRequest } from "next/server";
import { OWNER_COOKIE } from "../auth/owner";
import { listPosts, listProjects } from "./repo";

/** Which page views count, and how each one is bucketed for the analytics breakdowns. */

export interface Hit {
  path: string;
  /** Referrer hostname or "Direct" on entry views; null on client-side navigations. */
  referrer: string | null;
  country: string;
  device: "Desktop" | "Mobile" | "Tablet";
  browser: "Chrome" | "Safari" | "Firefox" | "Edge" | "Other";
}

function requestHost(req: NextRequest): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host).split(",")[0].trim().toLowerCase();
  return host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
}

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$|\.local$/;

/** Local runs, preview deployments (ANALYTICS_TRACK_LOCAL=1 counts them anyway) and the owner's browser are not counted. */
export function untracked(req: NextRequest): boolean {
  if (req.cookies.has(OWNER_COOKIE)) return true;
  if (process.env.ANALYTICS_TRACK_LOCAL === "1") return false;
  const env = process.env.VERCEL_ENV;
  return Boolean(env && env !== "production") || LOCAL.test(requestHost(req));
}

const BROWSERS: [Hit["browser"], RegExp][] = [
  ["Edge", /Edg(e|A|iOS)?\//],
  ["Chrome", /Chrome\/|CriOS\/|Chromium\//],
  ["Firefox", /Firefox\/|FxiOS\//],
  ["Safari", /Safari\//],
];

const device = (ua: string): Hit["device"] =>
  /iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua) ? "Tablet" : /Mobi|iPhone|iPod|Android/i.test(ua) ? "Mobile" : "Desktop";

function referrer(raw: unknown, host: string): string {
  try {
    const h = new URL(String(raw)).hostname.replace(/^www\./, "");
    return h && h !== host.replace(/^www\./, "") ? h : "Direct";
  } catch {
    return "Direct";
  }
}

/** The tracker's `{ path, referrer, entry }` plus request headers, or null when the path isn't a countable site page. */
export function readHit(req: NextRequest, body: unknown): Hit | null {
  const b = (body ?? {}) as { path?: unknown; referrer?: unknown; entry?: unknown };
  const path = typeof b.path === "string" ? b.path.split(/[?#]/)[0] : "";
  if (!path.startsWith("/") || path.length > 200 || /^\/(admin|api)(\/|$)/.test(path)) return null;
  const ua = req.headers.get("user-agent") ?? "";
  const country = req.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  return {
    path,
    referrer: b.entry === true ? referrer(b.referrer, requestHost(req)) : null,
    country: /^[A-Z]{2}$/.test(country) ? country : "Unknown",
    device: device(ua),
    browser: BROWSERS.find(([, re]) => re.test(ua))?.[0] ?? "Other",
  };
}

// published slugs, refreshed every few minutes, so made-up paths can't fill the top-pages list
let slugs: { at: number; blog: Set<string>; work: Set<string> } | null = null;

/** True for "/", "/blog", "/work" and published posts and projects: the only pages the tracker runs on. */
export async function countablePath(path: string): Promise<boolean> {
  if (path === "/" || path === "/blog" || path === "/work") return true;
  const m = /^\/(blog|work)\/([a-z0-9-]{1,80})$/.exec(path);
  if (!m) return false;
  if (!slugs || Date.now() - slugs.at > 5 * 60_000) {
    const [posts, projects] = await Promise.all([listPosts(), listProjects()]);
    slugs = { at: Date.now(), blog: new Set(posts.map((p) => p.slug)), work: new Set(projects.map((p) => p.slug)) };
  }
  return slugs[m[1] as "blog" | "work"].has(m[2]);
}
