---
title: Technical Report Reviewer
tagline: Claude reads the report so the reviewer doesn't have to.
year: 2025
role: Solo
order: 2
featured: true
agent: true
stack: [Next.js, TypeScript, LLM agents, PostgreSQL, Prisma, Playwright]
highlight: Prompt caching cuts about 90% off the input cost when a batch of reports is checked against the same knowledge base.
repo: https://github.com/lamadev7/technical-report-reviewer-agent
art: s04
kicker: LLM app · RAG · human-in-the-loop
when: 2025
summary: Claude reviews student reports against templates and graded samples; a person approves every finding before feedback goes out.
m1: ~90% | lower input cost with prompt caching
m2: 2 levels | critical and major issues, flagged inline
m3: Reviewed | every finding approved by a person
cardStack: Next.js · TypeScript · PostgreSQL · Prisma · Playwright
cta: code
---

An AI-assisted reviewer for student technical reports. It does the first careful read, and a person stays in charge of every finding.

## How a review runs

1. Upload the report templates, plus good and bad samples. Together they become the knowledge base.
2. Claude reads each report and flags critical and major issues. They show up as hover popovers on the text itself.
3. The reviewer edits or approves each finding.
4. Feedback goes out by email, with inline screenshots of the flagged passages.

## Why it's cheap to run

Every report in a batch is checked against the same templates and samples, so that part of the prompt is cached. Prompt caching cuts about 90% off the input cost.
