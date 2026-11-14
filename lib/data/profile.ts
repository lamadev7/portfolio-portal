import { fmtDuration } from "./experiences";

export interface Achievement {
  title: string;
  detail: string;
  kind: "academic" | "work";
}

export interface Profile {
  name: string;
  monogram: string;
  headline: string;
  location: string;
  timezone: string;
  availability: string;
  careerStart: Date;
  teamsMentored: string;
  summary: string;
  coreStack: string[];
  educationLine: string;
  achievements: Achievement[];
}

export const profile: Profile = {
  name: "Parbat Lama",
  monogram: "PL",
  headline: "Senior Full-Stack TypeScript Engineer",
  location: "Lalitpur, Nepal",
  timezone: "UTC+5:45",
  availability: "Open to senior and contract roles",
  careerStart: new Date(2022, 0, 1),
  teamsMentored: "~12",
  summary:
    "Senior full-stack TypeScript engineer at PortPro since June 2022, shipping drayOS, a logistics TMS, end to end: React and Next.js interfaces, Node.js services on MongoDB, real-time updates and AWS deploys. Currently building an orchestrator AI agent that supervises dispatcher, billing and CSR sub-agents. First Class Honours graduate in IT who has also supervised ~12 final-year project teams at Herald College Kathmandu.",
  coreStack: [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "MongoDB",
    "PostgreSQL",
    "AWS",
    "Agentic AI: Claude / Google ADK / MCP",
  ],
  educationLine: "BSc (Hons) IT · First Class Honours · AAA Scholarship ×2",
  achievements: [
    { title: "First Class Honours", detail: "BSc (Hons) Information Technology, Herald College Kathmandu, 2023", kind: "academic" },
    { title: "AAA Scholarship", detail: "Awarded in 2023 and 2024", kind: "academic" },
    { title: "~12 final-year project teams supervised", detail: "Herald College Kathmandu, 2025–26", kind: "work" },
    { title: "Orchestrator AI agent", detail: "Supervises dispatcher, billing and CSR sub-agents at PortPro", kind: "work" },
  ],
};

/** Live total experience since the first role, e.g. "4 yrs 9 mos". */
export function careerLength(now?: Date): string {
  return fmtDuration(profile.careerStart, now);
}
