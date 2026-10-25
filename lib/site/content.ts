/**
 * Shape and default values of the editable site copy (hero, stack, experience, skills …).
 * The live values come from the "settings" collection and are edited at /admin/site;
 * these defaults are the seed and the fallback when no database is configured.
 */

export type Tier = "production" | "projects" | "learning";

export const tierLabel: Record<Tier, string> = {
  production: "Production",
  projects: "Projects",
  learning: "Learning now",
};

export const TIERS: Tier[] = ["production", "projects", "learning"];

export interface ExperienceItem {
  id: string;
  /** Shown on the site. Generated from start/end when they're set. */
  when: string;
  /** YYYY-MM-DD; "" for roles saved before the date picker. */
  start?: string;
  /** YYYY-MM-DD, or "" while the role is current. */
  end?: string;
  /** start → end (or the save date, for a current role). */
  totalExperience?: { years: number; months: number; days: number } | null;
  title: string;
  meta: string;
  bullets: string[];
}

export interface SiteContent {
  site: {
    name: string;
    title: string;
    location: string;
    email: string;
    reel: string[];
    facts: { k: string; v: string }[];
    links: { label: string; href: string }[];
  };
  coreStack: { label: string; items: string[] }[];
  experience: ExperienceItem[];
  principles: { title: string; body: string }[];
  skills: { label: string; items: { name: string; tier: Tier }[] }[];
  nextPost: { title: string; summary: string };
  contact: { heading: string; sub: string };
}

const P: Tier = "production", S: Tier = "projects", L: Tier = "learning";
const items = (list: [string, Tier][]) => list.map(([name, tier]) => ({ name, tier }));

export const defaultSiteContent: SiteContent = {
  site: {
    name: "Parbat Lama",
    title: "Senior Full-stack AI Engineer",
    location: "Lalitpur, Nepal",
    email: "parbatlama70@gmail.com",
    reel: [
      "AI agents that ship to production.",
      "full-stack products, React to Postgres.",
      "multi-agent systems with MCP and ADK.",
    ],
    facts: [
      { k: "Experience", v: "4+ years, since 2022" },
      { k: "Based in", v: "Nepal · UTC+5:45" },
      { k: "Open to", v: "Remote, senior roles" },
      { k: "Focus", v: "Agents · RAG · web" },
    ],
    links: [
      { label: "Résumé (PDF) →", href: "/resume" },
      { label: "GitHub →", href: "https://github.com/lamadev7" },
      { label: "LinkedIn →", href: "https://linkedin.com/in/parbat-lama-0bb4101b8" },
    ],
  },
  coreStack: [
    { label: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
    { label: "Backend", items: ["Node.js", "Express · Hapi.js", "FastAPI", "REST · GraphQL"] },
    { label: "Data", items: ["PostgreSQL", "MongoDB", "Prisma", "Redis · BullMQ"] },
    { label: "AI & agents", items: ["Google ADK", "MCP", "Claude Agent SDK", "RAG"] },
    { label: "Cloud", items: ["AWS", "Docker", "CI/CD", "Nginx"] },
  ],
  experience: [
    {
      id: "exp-portpro",
      when: "Jun 2022 – now",
      title: "Senior Full-Stack Engineer · PortPro",
      meta: "Lalitpur · full-time · drayOS logistics platform",
      bullets: [
        "Building an orchestrator agent that manages and monitors the dispatcher, billing and support sub-agents.",
        "Own features end to end: data models, Node services (Express, Hapi.js) on MongoDB, and TypeScript React screens.",
        "Cut new-screen lead time ~40% with a reusable component design system.",
        "Kept WebGL map surfaces (Mapbox GL) smooth at production volume; streaming bulk import; real-time with Socket.io and Pusher on AWS.",
      ],
    },
    {
      id: "exp-herald-fyp",
      when: "Aug 2025 – Apr 2026",
      title: "Final Year Project Supervisor · Herald College",
      meta: "Kathmandu · part-time",
      bullets: [
        "Supervised ~12 capstone teams: blockchain voting, AI recommendation engines, full-stack platforms.",
        "Ran weekly sessions on planner + tool-using sub-agent patterns, data modelling and architecture reviews.",
      ],
    },
    {
      id: "exp-princelab",
      when: "Jan – Jul 2022",
      title: "Frontend Developer · Princelab",
      meta: "Remote · Next.js, TypeScript and Tailwind product surfaces",
      bullets: [],
    },
    {
      id: "exp-bsc",
      when: "2021 – 2023",
      title: "BSc (Hons) Information Technology · Herald College",
      meta: "First Class Honours · AAA Scholarship 2023 and 2024",
      bullets: [],
    },
  ],
  principles: [
    { title: "One orchestrator, scoped specialists", body: "Each sub-agent gets only the tools its job needs." },
    { title: "Handoffs need evidence", body: "No “done” without files changed, build status and a link." },
    { title: "Tools through MCP", body: "Typed tools, confirmations for writes, human review where it matters." },
    { title: "Measure it", body: "Evals, traces, and cost and latency per run." },
  ],
  // Ordered by how often 47 current full-stack AI postings ask for each skill.
  skills: [
    {
      label: "AI & agents",
      items: items([
        ["LLM APIs (Claude, OpenAI)", P], ["Multi-agent orchestration", P], ["Tool calling", P], ["Google ADK", P],
        ["RAG", S], ["MCP", S], ["Claude Agent SDK", S], ["Prompt caching", S],
        ["Evals (golden sets, LLM-as-judge)", L], ["LangGraph / LangChain", L], ["Guardrails", L],
      ]),
    },
    {
      label: "Frontend",
      items: items([
        ["TypeScript", P], ["React", P], ["Next.js", P], ["Tailwind CSS", P],
        ["Streaming UIs (WebSocket, SSE)", P], ["Redux Toolkit", P], ["Mapbox GL", P],
      ]),
    },
    {
      label: "Backend",
      items: items([
        ["Node.js", P], ["Express", P], ["Hapi.js", P], ["REST", P],
        ["GraphQL", S], ["Python", S], ["FastAPI", S], ["Queues (BullMQ)", S],
      ]),
    },
    {
      label: "Data",
      items: items([["MongoDB", P], ["PostgreSQL", S], ["Prisma", S], ["Redis", S], ["Vector DBs (pgvector, Pinecone)", L]]),
    },
    {
      label: "Cloud & DevOps",
      items: items([
        ["AWS (EC2, S3)", P], ["CI/CD", P], ["Docker", S], ["Nginx", S],
        ["Terraform", L], ["Kubernetes", L], ["GCP / Vertex AI", L],
      ]),
    },
    {
      label: "Observability",
      items: items([["Langfuse / OpenTelemetry", L], ["Cost and latency per run", L], ["Error tracking (Sentry)", L]]),
    },
    {
      label: "Workflow",
      items: items([["Claude Code", P], ["Spec-first development", P], ["Code review", P], ["Testing (Jest, Playwright)", S]]),
    },
  ],
  nextPost: {
    title: "How I gate prompts in CI",
    summary: "Golden sets, LLM-as-judge and the check that fails the build.",
  },
  contact: {
    heading: "Hiring for a full-stack AI role?",
    sub: "Open to remote senior roles. Overlaps European afternoons from Nepal (UTC+5:45).",
  },
};
