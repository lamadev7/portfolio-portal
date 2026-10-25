import { TIERS, type ExperienceItem, type SiteContent, type Tier } from "../site/content";
import { isISODate, rangeLabel, span, todayISO } from "./dates";
import type { Pair, PostInput, ProjectInput } from "./types";

/** Server-side checks for everything the admin forms send. Messages are shown to the editor as-is. */

export class CmsError extends Error {}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ART = /^s(0[1-9]|1\d|2[0-4])$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function text(v: unknown, label: string, max: number, required = false): string {
  const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
  if (required && !s) throw new CmsError(`${label} is required.`);
  if (s.length > max) throw new CmsError(`${label} must be ${max} characters or fewer.`);
  return s;
}

/**
 * A start–end range from the date picker. `present` leaves the end open (""); stored rows carry no `present`,
 * so there an empty end already means ongoing. No start means no dates.
 */
function range(r: Raw, label: string): { start: string; end: string } {
  const start = typeof r.start === "string" ? r.start : "";
  if (!start) return { start: "", end: "" };
  if (!isISODate(start)) throw new CmsError(`${label}: the start must be a valid date.`);
  const end = typeof r.end === "string" ? r.end : "";
  if (r.present === true || (r.present === undefined && !end)) return { start, end: "" };
  if (!end) throw new CmsError(`${label}: pick an end date, or mark it as ongoing.`);
  if (!isISODate(end)) throw new CmsError(`${label}: the end must be a valid date.`);
  if (end < start) throw new CmsError(`${label}: the end can't be before the start.`);
  return { start, end };
}

function link(v: unknown, label: string, allowPath = false): string {
  const s = text(v, label, 500);
  if (s && !/^https?:\/\//.test(s) && !(allowPath && /^(\/|mailto:)/.test(s))) {
    throw new CmsError(`${label} must start with ${allowPath ? "http(s)://, / or mailto:" : "http:// or https://"}.`);
  }
  return s;
}

function strings(v: unknown, label: string, maxItems: number, maxLen: number): string[] {
  const list = typeof v === "string" ? v.split(",") : arr(v);
  return list
    .map((x, i) => text(x, `${label} ${i + 1}`, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function pairs(v: unknown, label: string, maxItems: number): Pair[] {
  return arr(v)
    .slice(0, maxItems)
    .map((p, i) => ({ v: text(obj(p).v, `${label} ${i + 1} title`, 80), k: text(obj(p).k, `${label} ${i + 1} text`, 300) }))
    .filter((p) => p.v || p.k);
}

function slug(v: unknown): string {
  const s = text(v, "Slug", 80, true);
  if (!SLUG.test(s)) throw new CmsError("Slug may only use lowercase letters, numbers and single hyphens.");
  return s;
}

function art(v: unknown): string {
  const s = text(v, "Painting", 3);
  if (s && !ART.test(s)) throw new CmsError("Painting must be one of s01–s24.");
  return s;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function cleanProject(input: unknown): ProjectInput {
  const r = obj(input);
  const order = Number(r.order);
  const { start, end } = range(r, "Dates");
  const customLabel = text(r.customLabel, "Custom label", 40);
  return {
    slug: slug(r.slug),
    title: text(r.title, "Title", 120, true),
    tagline: text(r.tagline, "Tagline", 200),
    summary: text(r.summary, "Summary", 600, true),
    kicker: text(r.kicker, "Kicker", 120),
    status: r.status === "todo" ? "todo" : "shipped",
    when: customLabel || (start ? rangeLabel(start, end, "year") : text(r.when, "When", 40)),
    start,
    end,
    customLabel,
    year: start ? start.slice(0, 4) : text(r.year, "Year", 20),
    role: text(r.role, "Role", 120),
    order: Number.isFinite(order) ? order : 99,
    featured: r.featured === true,
    draft: r.draft === true,
    also: r.also === true,
    alsoNote: text(r.alsoNote, "Also note", 120),
    metrics: pairs(r.metrics, "Result", 3),
    features: pairs(r.features, "Feature", 8),
    cardStack: text(r.cardStack, "Card stack line", 200),
    cta: r.cta === "code" ? "code" : "case",
    stack: strings(r.stack, "Stack item", 40, 60),
    highlight: text(r.highlight, "Highlight", 400),
    repo: link(r.repo, "Repository link"),
    live: link(r.live, "Live link"),
    art: art(r.art),
    artAlt: text(r.artAlt, "Painting description", 300),
    body: text(r.body, "Body", 60000),
  };
}

export function cleanPost(input: unknown): PostInput {
  const r = obj(input);
  const date = text(r.date, "Date", 10, true);
  if (!DATE.test(date) || Number.isNaN(Date.parse(date))) throw new CmsError("Date must be a valid date (YYYY-MM-DD).");
  const order = Number(r.order);
  return {
    slug: slug(r.slug),
    order: Number.isFinite(order) ? order : 0,
    title: text(r.title, "Title", 160, true),
    summary: text(r.summary, "Summary", 300, true),
    date,
    tags: strings(r.tags, "Tag", 12, 40),
    art: art(r.art),
    artAlt: text(r.artAlt, "Painting description", 300),
    draft: r.draft === true,
    body: text(r.body, "Body", 60000, true),
  };
}

const ROLE_ID = /^[a-z0-9-]{1,40}$/;

export function newRoleId(): string {
  return `exp-${globalThis.crypto.randomUUID().slice(0, 8)}`;
}

/** One experience entry. Keeps a valid id, or gives the entry a new one. */
export function cleanRole(input: unknown, label = "Role"): ExperienceItem {
  const e = obj(input);
  const id = typeof e.id === "string" && ROLE_ID.test(e.id) ? e.id : newRoleId();
  const { start, end } = range(e, `${label} dates`);
  return {
    id,
    when: start ? rangeLabel(start, end, "month") : text(e.when, `${label} dates`, 40),
    start,
    end,
    totalExperience: start ? span(start, end || todayISO()) : null,
    title: text(e.title, `${label} title`, 140, true),
    meta: text(e.meta, `${label} details`, 200),
    bullets: (typeof e.bullets === "string" ? e.bullets.split("\n") : arr(e.bullets))
      .map((b, j) => text(b, `${label} bullet ${j + 1}`, 400))
      .filter(Boolean)
      .slice(0, 10),
  };
}

export function cleanSite(input: unknown): SiteContent {
  const r = obj(input);
  const s = obj(r.site);
  const tier = (v: unknown): Tier => (TIERS.includes(v as Tier) ? (v as Tier) : "projects");
  return {
    site: {
      name: text(s.name, "Name", 80, true),
      title: text(s.title, "Title", 120, true),
      location: text(s.location, "Location", 80),
      email: text(s.email, "Email", 120, true),
      reel: strings(s.reel, "Rolling line", 6, 80),
      facts: arr(s.facts)
        .slice(0, 6)
        .map((f, i) => ({ k: text(obj(f).k, `Fact ${i + 1} label`, 40), v: text(obj(f).v, `Fact ${i + 1} value`, 60) }))
        .filter((f) => f.k || f.v),
      links: arr(s.links)
        .slice(0, 8)
        .map((l, i) => ({ label: text(obj(l).label, `Link ${i + 1} label`, 60), href: link(obj(l).href, `Link ${i + 1} URL`, true) }))
        .filter((l) => l.label && l.href),
    },
    coreStack: arr(r.coreStack)
      .slice(0, 8)
      .map((g, i) => ({ label: text(obj(g).label, `Stack group ${i + 1}`, 40), items: strings(obj(g).items, "Stack item", 10, 40) }))
      .filter((g) => g.label),
    experience: arr(r.experience).slice(0, 20).map((e, i) => cleanRole(e, `Experience ${i + 1}`)),
    principles: arr(r.principles)
      .slice(0, 8)
      .map((p, i) => ({ title: text(obj(p).title, `Principle ${i + 1} title`, 80), body: text(obj(p).body, `Principle ${i + 1} text`, 200) }))
      .filter((p) => p.title),
    skills: arr(r.skills)
      .slice(0, 12)
      .map((g, i) => ({
        label: text(obj(g).label, `Skill group ${i + 1}`, 40),
        items: arr(obj(g).items)
          .slice(0, 30)
          .map((it, j) => ({ name: text(obj(it).name, `Skill ${j + 1} in group ${i + 1}`, 60), tier: tier(obj(it).tier) }))
          .filter((it) => it.name),
      }))
      .filter((g) => g.label),
    nextPost: { title: text(obj(r.nextPost).title, "Next post title", 160), summary: text(obj(r.nextPost).summary, "Next post summary", 300) },
    contact: { heading: text(obj(r.contact).heading, "Contact heading", 120, true), sub: text(obj(r.contact).sub, "Contact text", 300) },
  };
}
