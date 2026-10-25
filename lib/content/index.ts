import { cache } from "react";
import { hasDatabase } from "../db/mongo";
import { getSiteSettings, listPosts, listProjects } from "../cms/repo";
import type { Pair, PostInput, ProjectInput, ProjectStatus } from "../cms/types";
import { defaultSiteContent, type SiteContent } from "../site/content";
import { readPostFiles, readProjectFiles } from "./files";
import { readingMinutes, renderMarkdown } from "./markdown";

/**
 * What the public pages read. Content comes from MongoDB (edited at /admin); when MONGODB_URI is unset,
 * or the database can't be reached, it falls back to the Markdown files in content/.
 */

export type Metric = Pair;
export type { ProjectStatus };

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
  order: number;
  title: string;
  summary: string;
  date: Date;
  minutes: number;
  tags: string[];
  art?: string;
  artAlt?: string;
  html: string;
}

const opt = (s: string) => s || undefined;

function toProject(p: ProjectInput): Project {
  return {
    slug: p.slug,
    title: p.title,
    tagline: p.tagline,
    summary: p.summary || p.tagline,
    kicker: p.kicker,
    year: p.year,
    when: p.when || p.year,
    role: p.role,
    order: p.order,
    featured: p.featured,
    status: p.status,
    also: p.also,
    alsoNote: opt(p.alsoNote),
    metrics: p.metrics,
    features: p.features,
    cardStack: p.cardStack || p.stack.join(" · "),
    cta: p.cta,
    stack: p.stack,
    highlight: opt(p.highlight),
    repo: opt(p.repo),
    live: opt(p.live),
    art: opt(p.art),
    artAlt: opt(p.artAlt),
    html: renderMarkdown(p.body),
  };
}

function toPost(p: PostInput): Post {
  return {
    slug: p.slug,
    order: p.order ?? 0,
    title: p.title,
    summary: p.summary,
    date: new Date(`${p.date}T00:00:00Z`),
    minutes: readingMinutes(p.body),
    tags: p.tags,
    art: opt(p.art),
    artAlt: opt(p.artAlt),
    html: renderMarkdown(p.body),
  };
}

async function fromDb<T>(read: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!hasDatabase()) return fallback();
  try {
    return await read();
  } catch (err) {
    console.error("content: database unavailable, using content/ files", err);
    return fallback();
  }
}

export const getProjects = cache(async (): Promise<Project[]> => {
  const raw = await fromDb(
    () => listProjects(),
    () => readProjectFiles().filter((p) => !p.draft).sort((a, b) => a.order - b.order),
  );
  return raw.map(toProject);
});

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
}

export const getPosts = cache(async (): Promise<Post[]> => {
  const raw = await fromDb(
    () => listPosts(),
    () => readPostFiles().filter((p) => !p.draft),
  );
  return raw.map(toPost).sort((a, b) => a.order - b.order || b.date.getTime() - a.date.getTime());
});

export async function getPost(slug: string): Promise<Post | undefined> {
  return (await getPosts()).find((p) => p.slug === slug);
}

export const getSiteContent = cache(
  async (): Promise<SiteContent> => fromDb(() => getSiteSettings(), () => defaultSiteContent),
);

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
