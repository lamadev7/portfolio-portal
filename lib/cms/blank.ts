import type { PostInput, ProjectInput } from "./types";

/** Starting values for the "new project" and "new post" forms. */

export const blankProject: ProjectInput = {
  slug: "",
  title: "",
  tagline: "",
  summary: "",
  kicker: "",
  status: "shipped",
  when: "",
  start: "",
  end: "",
  customLabel: "",
  year: String(new Date().getFullYear()),
  role: "Solo",
  order: 50,
  featured: false,
  draft: true,
  also: false,
  alsoNote: "",
  metrics: [],
  features: [],
  cardStack: "",
  cta: "case",
  stack: [],
  highlight: "",
  repo: "",
  live: "",
  art: "",
  artAlt: "",
  body: "",
};

export const blankPost = (): PostInput => ({
  slug: "",
  title: "",
  summary: "",
  date: new Date().toISOString().slice(0, 10),
  order: 0,
  tags: [],
  art: "",
  artAlt: "",
  draft: true,
  body: "",
});
