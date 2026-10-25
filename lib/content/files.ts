import fs from "node:fs";
import path from "node:path";
import { parseFrontMatter, type FrontMatter } from "./markdown";
import type { Pair, PostInput, ProjectInput } from "../cms/types";

/**
 * The Markdown files in content/ are the seed for the database and the fallback when MONGODB_URI is unset.
 * Files starting with "_" are templates and are skipped.
 */

const ROOT = path.join(process.cwd(), "content");

function readDir(dir: string): { slug: string; data: FrontMatter; body: string }[] {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const { data, body } = parseFrontMatter(fs.readFileSync(path.join(full, f), "utf8"));
      return { slug: f.replace(/\.md$/, ""), data, body: body.trim() };
    });
}

const str = (v: FrontMatter[string] | undefined) => (v === undefined ? "" : String(v));
const list = (v: FrontMatter[string] | undefined) => (Array.isArray(v) ? v : v ? [String(v)] : []);

// "title | text" fields: m1–m3 (result boxes) and f1–f8 (features)
function pairs(data: FrontMatter, keys: string[]): Pair[] {
  return keys.flatMap((key) => {
    const raw = str(data[key]);
    if (!raw) return [];
    const [v, ...k] = raw.split("|");
    return [{ v: v.trim(), k: k.join("|").trim() }];
  });
}

export function readProjectFiles(): ProjectInput[] {
  return readDir("projects").map(({ slug, data, body }) => ({
    slug,
    title: str(data.title) || slug,
    tagline: str(data.tagline),
    summary: str(data.summary) || str(data.tagline),
    kicker: str(data.kicker),
    status: data.status === "todo" ? "todo" : "shipped",
    when: str(data.when) || str(data.year),
    year: str(data.year),
    role: str(data.role),
    order: typeof data.order === "number" ? data.order : 99,
    featured: data.featured === true,
    draft: data.draft === true,
    also: data.also === true,
    alsoNote: str(data.alsoNote),
    metrics: pairs(data, ["m1", "m2", "m3"]),
    features: pairs(data, ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"]),
    cardStack: str(data.cardStack) || list(data.stack).join(" · "),
    cta: data.cta === "code" ? "code" : "case",
    stack: list(data.stack),
    highlight: str(data.highlight),
    repo: str(data.repo),
    live: str(data.live),
    art: str(data.art),
    artAlt: str(data.artAlt),
    body,
  }));
}

export function readPostFiles(): PostInput[] {
  return readDir("posts").map(({ slug, data, body }) => ({
    slug,
    title: str(data.title) || slug,
    summary: str(data.summary),
    date: str(data.date) || "1970-01-01",
    order: typeof data.order === "number" ? data.order : 0,
    tags: list(data.tags),
    art: str(data.art),
    artAlt: str(data.artAlt),
    draft: data.draft === true,
    body,
  }));
}
