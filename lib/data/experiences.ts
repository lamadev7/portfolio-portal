/**
 * Data layer — pure TypeScript data shapes for static portfolio content.
 * Kept separate from components so copy edits don't require touching JSX.
 */

export interface ExperienceStack {
  v: string;
  hl?: boolean;
}

export interface Experience {
  when: string;
  /** Either a fixed string, or {start,end} to compute "N yrs M mos" live. */
  dur: string;
  title: string;
  at: string;
  role: string;
  body: string;
  bullets: string[];
  stack: ExperienceStack[];
}

/**
 * Real-time duration helper — months between two dates as "N yrs M mos".
 * `end` omitted ⇒ now (so ongoing roles grow over time on each render).
 */
export function fmtDuration(start: Date, end?: Date): string {
  const e = end ?? new Date();
  let months =
    (e.getFullYear() - start.getFullYear()) * 12 + (e.getMonth() - start.getMonth());
  if (e.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  const parts: string[] = [];
  if (yrs > 0) parts.push(`${yrs} ${yrs === 1 ? "yr" : "yrs"}`);
  if (mos > 0) parts.push(`${mos} ${mos === 1 ? "mo" : "mos"}`);
  return parts.length ? parts.join(" ") : "0 mos";
}

export const experiences: Experience[] = [
  {
    when: "Jun 2022 → Present",
    dur: `${fmtDuration(new Date(2022, 5, 1))} · Full-time · On-site`,
    title: "Senior Full-Stack Engineer",
    at: "PortPro",
    role: "Lalitpur, Nepal",
    body:
      "Fullstack engineer on the PortPro logistics platform — designing scalable React UIs and shipping the backend REST APIs they run against.",
    bullets: [
      "Optimised front-end performance — memory cleanup on long-running map sessions, streaming bulk-upload for large freight imports, and a reusable component design system that cut new-screen lead time by ~40%.",
      "Optimised map-rendering surfaces with Mapbox GL (WebGL) and React Leaflet for smooth interaction at production data volumes.",
      "Owned features end-to-end: data models, services in Node (Express / Hapi.js) on MongoDB and Sequelize, through to the TypeScript React interface.",
      "Wired real-time experiences with Socket.io and Pusher; deployed on AWS with CI/CD.",
      "Building an orchestrator admin AI agent that manages and monitors other dispatcher-related sub-agents — including dispatcher, billing, and CSR — across the platform.",
    ],
    stack: [
      { v: "TypeScript", hl: true },
      { v: "React" }, { v: "Next.js" }, { v: "Tailwind" }, { v: "Bootstrap" },
      { v: "Node.js" }, { v: "Express" }, { v: "Hapi.js" }, { v: "Python (FastAPI)" },
      { v: "MongoDB" }, { v: "Sequelize" },
      { v: "Mapbox GL" }, { v: "React Leaflet" },
      { v: "Google ADKs", hl: true }, { v: "Claude", hl: true },
      { v: "AWS EC2" }, { v: "AWS S3" }, { v: "CI/CD" },
    ],
  },
  {
    when: "Aug 2025 → Apr 2026",
    dur: `${fmtDuration(new Date(2025, 7, 1), new Date(2026, 3, 1))} · Part-time · On-site`,
    title: "Final Year Project Supervisor",
    at: "Herald College Kathmandu",
    role: "Kathmandu, Nepal",
    body:
      "Supervised and mentored final-year BSc IT cohorts across a portfolio of capstone projects — guiding teams from problem framing through architecture, implementation, and defence.",
    bullets: [
      "Led ~12 student teams across diverse domains: blockchain voting systems, AI-driven recommendation engines for medical / logistics / mental-health sectors, and full-stack web platforms.",
      "Reviewed architecture decisions, code quality, and engineering trade-offs — pushing teams to make their decisions explicit and defendable rather than accidental.",
      "Ran weekly working sessions on agentic patterns (planner + tool-using sub-agents), data modelling, and shipping production-grade UX on student-team timelines.",
    ],
    stack: [
      { v: "Mentorship" }, { v: "Code Review" },
      { v: "Solidity" }, { v: "Web3" },
      { v: "AI / RecSys" }, { v: "Agentic systems", hl: true },
      { v: "React" }, { v: "Next.js" }, { v: "Python" },
      { v: "Architecture" },
    ],
  },
  {
    when: "Jan 2022 → Jul 2022",
    dur: `${fmtDuration(new Date(2022, 0, 1), new Date(2022, 6, 1))} · Full-time · Remote`,
    title: "Frontend Developer",
    at: "Princelab Pvt. Ltd.",
    role: "Kathmandu, Nepal",
    body:
      "Built marketing and product surfaces in Next.js with TypeScript and Tailwind. A short, focused stint — shipped fast, learned faster.",
    bullets: [],
    stack: [
      { v: "Next.js" }, { v: "React" }, { v: "TypeScript" }, { v: "Tailwind" },
    ],
  },
];
