/** Shapes stored in MongoDB. Bodies are Markdown; the site renders them on read. */

export interface Pair {
  v: string;
  k: string;
}

export type ProjectStatus = "shipped" | "todo";

export interface ProjectInput {
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  kicker: string;
  status: ProjectStatus;
  /** Card label: customLabel, else generated from start/end. */
  when: string;
  /** YYYY-MM-DD; end is "" while ongoing. Both "" when the project has no dates. */
  start?: string;
  end?: string;
  /** Shown instead of the dates, e.g. "Next milestone". */
  customLabel?: string;
  year: string;
  role: string;
  order: number;
  featured: boolean;
  draft: boolean;
  also: boolean;
  alsoNote: string;
  metrics: Pair[];
  features: Pair[];
  cardStack: string;
  cta: "case" | "code";
  stack: string[];
  highlight: string;
  repo: string;
  live: string;
  art: string;
  artAlt: string;
  body: string;
}

export interface PostInput {
  slug: string;
  title: string;
  summary: string;
  date: string; // YYYY-MM-DD
  order: number; // position on the site, lowest first; set by dragging rows in /admin/posts
  tags: string[];
  art: string;
  artAlt: string;
  draft: boolean;
  body: string;
}

export interface Stamped {
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectDoc = ProjectInput & Stamped;
export type PostDoc = PostInput & Stamped;

/** A document as handed to client components: id as a string, dates as ISO strings. */
export type Plain<T> = Omit<T, "createdAt" | "updatedAt"> & { id: string; createdAt: string; updatedAt: string };

export interface UserDoc {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
