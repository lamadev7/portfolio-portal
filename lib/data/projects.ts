export interface WorkProject {
  id: string;
  year: string;
  role: string;
  slot: string;
  name: string;
  pitch: string;
  stack: string[];
  highlight: string;
  href: string;
}

export const projects: WorkProject[] = [
  {
    id: "01",
    year: "2025",
    role: "Solo",
    slot: "technical_report_reviewer_agent",
    name: "Technical Report Reviewer",
    pitch:
      "AI-assisted student report reviewer. Upload templates + good/bad samples; Claude flags critical & major issues with hover popovers, the reviewer edits/approves, then emails feedback with inline screenshots.",
    stack: ["Next.js", "TypeScript", "LLM Agents", "Postgres + Prisma", "Playwright"],
    highlight:
      "Prompt caching cuts ~90% off input cost for batches of reports against the same knowledge base.",
    href: "https://github.com/lamadev7/technical-report-reviewer-agent",
  },
  {
    id: "02",
    year: "2025",
    role: "Solo",
    slot: "job_apply_scout",
    name: "Job Apply Scout",
    pitch:
      "An AI job-hunt agent that reads your resume, scans LinkedIn & Indeed in a live headed browser, and ranks every posting against your skills with deterministic, traceable matching — a focused shortlist, not a wall of listings. It scores; it never auto-applies.",
    stack: ["Next.js 16", "React 19", "TypeScript", "LLM Agents", "Playwright", "Prisma + SQLite"],
    highlight:
      "Match % comes from skill set-intersection, not an LLM guess — reproducible and explainable. The model only reads the resume; it never invents the numbers.",
    href: "https://github.com/lamadev7/Job-Apply-Scout",
  },
  {
    id: "03",
    year: "2025",
    role: "Solo",
    slot: "generic_triage_agent",
    name: "Generic Triage Agent",
    pitch:
      "A drop-in triage layer that classifies incoming requests and routes them to the right specialised handler — usable as a frontline for any multi-agent system.",
    stack: ["Python", "LLM tool-use", "FastAPI"],
    highlight:
      "Designed to be slotted in front of any agent fleet — schema-driven routing decisions.",
    href: "https://github.com/lamadev7/generic-traige-agent",
  },
  {
    id: "04",
    year: "2024",
    role: "Contributor",
    slot: "skillreal_payload",
    name: "SkillReal — Payload CMS",
    pitch:
      "Headless CMS backend for SkillReal — content modelling, auth, media, and admin tooling powering the product surfaces.",
    stack: ["Payload CMS", "TypeScript", "Node.js", "MongoDB"],
    highlight:
      "Schema-first content modelling with the Payload admin auto-generating the editor UI.",
    href: "https://github.com/SkillReal-LTD/skillreal-payload",
  },
  {
    id: "05",
    year: "2023",
    role: "Solo",
    slot: "blockchain_election_dapp",
    name: "Blockchain Election dApp",
    pitch:
      "Decentralised voting system on Ethereum — voter registration + verification, ballot creation, on-chain vote casting via MetaMask, and tamper-proof result tabulation. Live at dappvote.vercel.app.",
    stack: ["Solidity", "Hardhat", "Web3.js", "Next.js", "Express", "MongoDB"],
    highlight:
      "Clean-architecture Node backend in front of the smart contract; Express clustered with PM2; Jest + Supertest coverage across the API layer.",
    href: "https://github.com/lamaparbat/BLOCKCHAIN-ELECTION-DAPP",
  },
];
