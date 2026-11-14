---
title: Technical Report Reviewer
tagline: Claude reads the report so the reviewer doesn't have to.
year: 2025
role: Solo
featured: true
agent: true
highlight: Prompt caching cuts about 90% off the input cost when a batch of reports is checked against the same knowledge base.
repo: https://github.com/lamadev7/technical-report-reviewer-agent
art: s04
kicker: LLM app · RAG · human-in-the-loop
when: 2025
m1: ~90% | lower input cost with prompt caching
m2: 2 levels | critical and major issues, flagged inline
m3: Reviewed | every finding approved by a person
cardStack: Next.js · TypeScript · PostgreSQL · Prisma · Playwright
cta: code
order: 4
summary: An AI reviewer for student technical reports. It reads each report against templates and graded samples, marks issues on the page, and a person approves every one.
f1: Knowledge base | Templates plus excellent and weak samples; each template gets a marking scheme from its headings and word-count range.
f2: Two-pass review | Fast rule checks for length and required sections, then an AI pass that returns critical and major issues, streamed live.
f3: Issues on the page | The PDF renders in the browser with flagged passages highlighted by severity; hover one to read the issue.
f4: Reviewer in control | Change severity or wording, delete, or comment on any selected text, then approve.
f5: Feedback email | Critical issues go to the student with a screenshot of each flagged passage.
f6: Learns and saves | Issues dismissed three times stop being flagged, cached templates cut input cost by about 90%, and the model can be Claude, OpenAI or Gemini.
stack: [Next.js 16, React 19, TypeScript, PostgreSQL, Prisma, Claude API, OpenAI, Gemini, pdf.js, Playwright, Server-Sent Events]
shotFrame: wide
s1: /work/technical-report-reviewer/03-issue-popover.webp | Flagged issue explained on hover
s2: /work/technical-report-reviewer/04-reviewer-edit.webp | Reviewer rewrites an AI-flagged issue
s3: /work/technical-report-reviewer/05-approved-ready-to-send.webp | Approved review, ready to email
s4: /work/technical-report-reviewer/01-knowledge-base.webp | Knowledge base of templates and graded samples
s5: /work/technical-report-reviewer/02-upload-and-report-list.webp | Upload a report and see review history
---

An AI-assisted reviewer for student technical reports. It does the first careful read, and a person stays in charge of every finding.

## How a review runs

1. Upload the report templates, plus good and bad samples. Together they become the knowledge base.
2. Claude reads each report and flags critical and major issues. They show up as hover popovers on the text itself.
3. The reviewer edits or approves each finding.
4. Feedback goes out by email, with inline screenshots of the flagged passages.

## Why it's cheap to run

Every report in a batch is checked against the same templates and samples, so that part of the prompt is cached. Prompt caching cuts about 90% off the input cost.
