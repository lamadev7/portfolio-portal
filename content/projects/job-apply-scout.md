---
title: Job Apply Scout
tagline: A shortlist, not a wall of listings.
year: 2025
role: Solo
featured: true
agent: true
highlight: The match percentage comes from skill set-intersection, not a model's guess, so it's reproducible and explainable.
repo: https://github.com/lamadev7/job-hunt-scout
art: s03
kicker: Browser agent · deterministic scoring
when: 2025
m1: 2 boards | scanned live in a headed browser
m2: Explainable | match % from skill overlap, not a model guess
m3: Never | auto-applies; the person decides
cardStack: Next.js 16 · React 19 · Playwright · Prisma · SQLite
cta: code
order: 4.2
summary: An AI job-hunt agent. It reads your resume, scans job boards in a live browser and keeps only the postings that match your skills.
f1: Resume to profile | Upload a PDF and your skills, tools, roles and education become a profile you can edit. Works with Claude or a built-in parser with no key.
f2: Live browser scan | Drives a real Chromium session across LinkedIn, Indeed and other boards at once, streaming matches to the screen as it reads.
f3: Learns new job boards | For a board it hasn't seen, it learns a reusable recipe for finding and reading postings.
f4: Match you can check | A score from skill overlap, required versus nice-to-have and years of experience. Only postings above your bar are saved.
f5: Gaps and milestones | Each match shows matched and missing skills; the gaps that keep coming up become a learning checklist.
f6: You stay in charge | It never submits an application. Apply opens the posting for you to finish.
stack: [Next.js 16, React 19, TypeScript, Playwright, Claude API, Prisma, SQLite, TanStack Query, Zustand, Zod]
shotFrame: wide
s1: /work/job-apply-scout/01-resume-profile.webp | Resume parsed into an editable profile
s2: /work/job-apply-scout/02-agent-scan-running.webp | Agent scanning postings in a live browser
s3: /work/job-apply-scout/03-match-shortlist.webp | Saved matches with match % and gaps
s4: /work/job-apply-scout/04-match-breakdown.webp | Matched versus missing skills
s5: /work/job-apply-scout/05-learning-milestones.webp | Skill gaps turned into learning milestones
---

An AI job-hunt agent. It reads your resume, scans LinkedIn and Indeed in a live, headed browser, and ranks every posting against your skills.

## Matching you can check

The score is a set intersection between the skills on your resume and the skills in the posting. The same resume and posting always give the same number, and you can see exactly why.

The model only reads the resume. It never invents the numbers.

## It never applies for you

Scout scores and shortlists. Applying stays your decision.
