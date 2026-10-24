---
title: Triage Agent
tagline: Click Triage on a ticket. Come back to a pull request.
year: 2026
role: Solo
order: 1
featured: true
agent: true
stack: [Claude Agent SDK, Next.js, MongoDB, Redis, BullMQ, Zoekt, MCP, Electron]
highlight: Handoffs need evidence. Dev can't hand over to QA without the files changed, the build status and a PR link.
art: s09
kicker: Multi-agent · MCP · Claude Agent SDK
when: 2026
summary: Takes a Jira or Linear ticket to a reviewed pull request: reproduce, fix, QA, PR, in one crash-resilient session.
m1: 5 | specialist agents, each with scoped tools
m2: 10–25× | faster code search with a Zoekt index
m3: Resumable | sessions restart at the last phase after a crash
cardStack: Next.js · MongoDB · Redis · BullMQ · Electron
cta: case
---

Triage Agent reads a Jira or Linear ticket, reproduces the bug, writes the fix, runs QA, opens a pull request and comments back on the ticket. It does all of that in one session, and the session survives crashes. It is a workflow, not a chatbot.

## A team with scoped tools

Five specialists share the work, and each one only gets the tools its job needs. QA can't push. Review can't write code.

Work moves between them through evidence-gated handoffs. Dev to QA, for example, is refused unless it carries `files_changed`, `build_status` and `pr_url`.

## Built to keep going

- **Crash-resilient.** Sessions are stored in MongoDB and resume at the last workflow phase.
- **Fast code search.** A Zoekt trigram index across every configured repo makes search 10–25× faster.
- **Hardened against itself.** Dedupe, bash-safety and productivity-tracker hooks stop stuck loops and self-kill commands.

## Ships as a .dmg

It's an Electron app with Redis, the Claude CLI, Zoekt and uvx bundled inside, so there is nothing to `brew install`.
