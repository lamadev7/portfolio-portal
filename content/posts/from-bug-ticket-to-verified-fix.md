---
title: From a bug ticket to a verified fix
summary: An agent writes the fix; plain code proves it before the pull request opens.
date: 2026-11-14
tags: [agents, testing]
art: s07
---

A coding assistant can already read a bug, find the cause and write a fix. The hard part is everything around that: starting the work without copy-and-paste, proving the fix actually works, and letting a whole team share what it learns. Triage Agent is a self-hosted app that closes those gaps. You connect your repositories and your ticket tracker, click **Triage** on a bug, and get back a draft pull request that has already been checked.

## One click, then proof

When you click Triage, the agent reads the ticket and writes a test that shows the bug. Then it makes the smallest change that fixes it. Nothing ships on the agent's word.

A separate step, which is ordinary code and not the model, takes over and checks the work:

- the new test must **fail on the old code** and **pass on the fix**
- the full test suite must pass
- the build must pass

Only when all of that is green does it push a branch, open a draft pull request and leave one comment on the ticket. A real run: a `SAVE10` discount wasn't applied when a cart came to exactly $100. The agent traced it to a `>` that should have been `>=`, changed one line, and the fix was verified and delivered in about sixteen seconds.

## The runner is the whole point

> An agent saying "fixed" is a claim. The step that runs the test is where you check it.

The model is good at writing the fix. It is not the right thing to also grade the fix, because the same reasoning that wrote the bug can convince itself the bug is gone. So the grading lives in code that the model cannot talk its way past. If a check fails, the output goes back to the same session to try again, up to three attempts. If the code already matches the documented behaviour, the agent says "works as designed" and changes nothing.

## One agent, not five

The project started with five specialists in a row: one to reproduce, one to fix, one to verify, one to build and push, one to review. It worked, but each new agent re-read the same code just to catch up, and the verify and push steps were fixed command sequences that never needed a model at all.

So the default now is one agent plus the runner. A reviewer joins only when the change is large. Same ticket, same model, the numbers moved a long way:

- five agents: about **83 seconds** and **$0.35** per bug
- one agent plus the runner: about **16 seconds** and **$0.06**

The five-agent version is still available for teams that want a full review loop on every ticket.

## Memory the team shares

After a fix is proven and delivered, the app saves a short card for that repository: what the bug looked like, the cause, the fix, the files and the commit. When a later ticket on the same repo overlaps, that card is handed to the agent so it starts from a known cause instead of searching from scratch.

A few rules keep the memory honest:

- only **proven** fixes are saved, never raw ticket text
- a fix to the same files updates the existing card instead of adding a duplicate
- if the cited files have changed since the fix, the card is flagged as stale
- people have the last word: marking a pull request "merged" keeps the card, "wrong diagnosis" withdraws it

## Guardrails that actually hold

Rules that only live in a prompt get ignored eventually, so the ones that matter are enforced in code that runs before every action and can simply refuse it. No force pushes, no pushes to the main branch, no resetting shared work. Every ticket gets its own isolated checkout. Pull requests are always drafts. The server's own secrets and your personal settings never reach the agent.

## What it's built with

A Next.js and React front end, a Node back end with a job queue so tickets run one at a time and survive a restart, and MongoDB for anything that should last. The agent is Claude Code, driven through the Claude Agent SDK, with its tools — Jira, Linear, GitHub, a browser, code search — connected over the Model Context Protocol. It runs as a web app or a packaged macOS desktop app.

The whole thing is tested the way it asks you to trust it: six hundred unit tests, real-model runs against fixture repos with known bugs, and full browser and API runs from setup to a delivered fix. Thirty of its own defects were found and fixed that way before it was done.
