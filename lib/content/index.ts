import fs from "node:fs";
import path from "node:path";
import { parseFrontMatter, readingMinutes, renderMarkdown, type FrontMatter } from "./markdown";

/**
 * Content lives in content/projects/*.md and content/posts/*.md.
 * Adding a project or a post is adding one file: the slug is the file name.
 */

const ROOT = path.join(process.cwd(), "content");

export interface Metric {
  v: string;
  k: string;
}

export type ProjectStatus = "shipped" | "todo";

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  kicker: string;
  year: string;
  when: string;
  role: string;
  order: number;
  featured: boolean;
  status: ProjectStatus;
  also: boolean;
  alsoNote?: string;
  metrics: Metric[];
  features: Metric[];
  cardStack: string;
  cta: "case" | "code";
  stack: string[];
  highlight?: string;
  repo?: string;
  live?: string;
  art?: string;
  artAlt?: string;
  html: string;
}

export interface Post {
  slug: string;
  title: string;
  summary: string;
  date: Date;
  minutes: number;
  tags: string[];
  art?: string;
  artAlt?: string;
  html: string;
}

function readDir(dir: string): { slug: string; data: FrontMatter; body: string }[] {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const { data, body } = parseFrontMatter(fs.readFileSync(path.join(full, f), "utf8"));
      return { slug: f.replace(/\.md$/, ""), data, body };
    })
    .filter((e) => e.data.draft !== true);
}

const str = (v: FrontMatter[string] | undefined) => (v === undefined ? undefined : String(v));
const list = (v: FrontMatter[string] | undefined) => (Array.isArray(v) ? v : v ? [String(v)] : []);

// metric (m1–m3) and feature (f1–f8) fields are written "title | text", e.g. `m1: ~90% | lower input cost`
function pairs(data: FrontMatter, keys: string[]): Metric[] {
  return keys.flatMap((key) => {
    const raw = str(data[key]);
    if (!raw) return [];
    const [v, ...k] = raw.split("|");
    return [{ v: v.trim(), k: k.join("|").trim() }];
  });
}

const STATUSES: ProjectStatus[] = ["shipped", "todo"];

export function getProjects(): Project[] {
  return readDir("projects")
    .map(({ slug, data, body }) => ({
      slug,
      title: str(data.title) ?? slug,
      tagline: str(data.tagline) ?? "",
      summary: str(data.summary) ?? str(data.tagline) ?? "",
      kicker: str(data.kicker) ?? "",
      year: str(data.year) ?? "",
      when: str(data.when) ?? str(data.year) ?? "",
      role: str(data.role) ?? "",
      order: typeof data.order === "number" ? data.order : 99,
      featured: data.featured === true,
      status: STATUSES.find((st) => st === data.status) ?? "shipped",
      also: data.also === true,
      alsoNote: str(data.alsoNote),
      metrics: pairs(data, ["m1", "m2", "m3"]),
      features: pairs(data, ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"]),
      cardStack: str(data.cardStack) ?? list(data.stack).join(" · "),
      cta: data.cta === "code" ? ("code" as const) : ("case" as const),
      stack: list(data.stack),
      highlight: str(data.highlight),
      repo: str(data.repo),
      live: str(data.live),
      art: str(data.art),
      artAlt: str(data.artAlt),
      html: renderMarkdown(body),
    }))
    .sort((a, b) => a.order - b.order);
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}

export function getPosts(): Post[] {
  return readDir("posts")
    .map(({ slug, data, body }) => ({
      slug,
      title: str(data.title) ?? slug,
      summary: str(data.summary) ?? "",
      date: new Date(`${str(data.date) ?? "1970-01-01"}T00:00:00Z`),
      minutes: readingMinutes(body),
      tags: list(data.tags),
      art: str(data.art),
      artAlt: str(data.artAlt),
      html: renderMarkdown(body),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Groups items by year, newest first, keeping their order within a year. */
export function byYear<T>(items: T[], year: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const y = year(it);
    map.set(y, [...(map.get(y) ?? []), it]);
  }
  return Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
}
