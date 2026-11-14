---
title: Triage Agent
tagline: Click Triage on a ticket. Come back to a pull request.
year: 2026
role: Solo
featured: true
agent: true
highlight: Handoffs need evidence. Dev can't hand over to QA without the files changed, the build status and a PR link.
art: s09
kicker: Multi-agent · MCP · Claude Agent SDK
when: 2026
m1: 5 | specialist agents, each with scoped tools
m2: 10–25× | faster code search with a Zoekt index
m3: Resumable | sessions restart at the last phase after a crash
cardStack: Next.js · MongoDB · Redis · BullMQ · Electron
cta: case
order: 1
summary: An AI teammate for bug tickets. Pick a Jira or Linear ticket, and specialist agents reproduce the bug, fix it, test it and open a draft pull request.
f1: One-click triage | Press Triage on an assigned ticket and the session starts with the ticket, a branch and the right first agent.
f2: Five specialist agents | Orchestrator, QA, dev, plan and review, each with its own prompt and tools. QA and review can't push.
f3: Evidence-gated handoffs | QA hands over a failing repro; dev shows files changed, build, tests and a PR. Claims are checked against the commands actually run.
f4: Guardrails | Blocks force pushes, hard resets and database drops, and stops a QA/dev loop after three failed rounds to ask you.
f5: Survives a crash | Sessions live in MongoDB, every turn is a queued job, and the live stream replays after a refresh.
f6: Fast code search | Repos are indexed with Zoekt and mapped for calls between services, then one comment goes back to the ticket.
stack: [Claude Agent SDK, MCP, Next.js, React 19, TypeScript, MongoDB, Redis Streams, BullMQ, Zoekt, Electron]
shotFrame: wide
s1: /work/triage-agent/01-tickets.webp | Pick a Jira or Linear ticket
s2: /work/triage-agent/02-live-session.webp | QA reproduces the bug, dev takes over live
s3: /work/triage-agent/03-evidence-gate.webp | Handoffs blocked without real evidence
s4: /work/triage-agent/04-review-pr.webp | Review approves the draft PR; the ticket is updated
s5: /work/triage-agent/05-code-search.webp | Indexed repos with instant code search
s6: /work/triage-agent/06-guardrails.webp | Guardrails stop risky commands and loops
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
