---
title: "Triage Agent: bug ticket to verified fix"
summary: A self-hosted app where an agent fixes a bug and plain code proves it — the workflow, the architecture, and a benchmark against plain Claude Code.
date: 2026-11-14
tags: [agents, architecture, testing]
---

Triage Agent turns a bug ticket into a draft pull request that has already been checked. You connect your repositories and your ticket tracker (Jira or Linear), click **Triage**, and an agent reproduces the bug and fixes it while a runner proves the fix before anything ships. It is built on Claude Code and runs on your own machine.

## Why it exists

A chat assistant in one person's editor already fixes bugs. It falls short the moment a team depends on it:

- **Every ticket starts with copy and paste** of the ticket, the repo and the context.
- **"Fixed" is only a claim** — the same model that wrote the fix reports that it works, and nothing independent checks it.
- **Lessons stay with one person,** so the team keeps rediscovering the same causes.
- **Shared repositories need rules:** no force pushes, no pushes to main, no two tickets editing the same checkout.
- **There is no record** of what the agent ran when a fix goes wrong.

## How it works

The default flow uses one agent session for the thinking and leaves every check that can be scripted to code. The **agent** is the Claude model doing open-ended work; the **runner** is plain code the model cannot talk its way past.

1. **You click Triage.** The ticket goes into a queue.
2. **Prepare** *(runner)*. A fresh, isolated copy of the repo for this ticket, the proven test and build commands, and the best matching past fix from memory.
3. **Reproduce** *(agent)*. Claude writes a test that shows the bug and confirms it fails for the right reason. If the code matches the documented behaviour, it stops with "works as designed" and changes nothing.
4. **Fix** *(agent)*. The smallest change that makes the test pass, then a structured hand-off naming the test command, cause and files.
5. **Verify** *(runner)*. The new test must fail on the original commit and pass on the fix; then the suite and the build run. A failure goes back to the same session, up to three attempts.
6. **Deliver** *(runner)*. Commit, push a branch, open a draft pull request, comment once on the ticket.
7. **Remember** *(runner)*. Save the verified fix as a card for the next related ticket.

![The Triage Agent workflow: a ticket goes to the runner, which prepares an isolated workspace and recalls memory; the agent reproduces and fixes; the runner verifies, delivers a draft pull request and saves a fix card, with a failed check looping back to the agent up to three times.](/blog/triage-workflow.svg)

A concrete run: ticket `SHOP-42`, "the `SAVE10` discount isn't applied when the subtotal is exactly $100." The agent traced it to a strict `>` where the terms said "or more", changed one line in `src/pricing.js`, and the runner verified and delivered the draft pull request in about sixteen seconds.

## The agent and the runner

> An agent saying "fixed" is a claim. The step that runs the test is where you check it.

This split is the core idea. The model is good at writing a fix; it is the wrong thing to also *grade* the fix, because the reasoning that wrote a bug can convince itself the bug is gone. So the grading lives in code the model cannot override. The runner owns the facts — fails before, passes after, suite green, build green — and only then does anything ship, as a draft, never merged automatically.

## Architecture

A few plain parts wired in a line, so each does one job and the whole thing survives a restart:

- **Interface** — a Next.js and React front end (tickets, the live run view, knowledge, configuration), wrapped in Electron for the desktop app.
- **API + queue** — Next.js routes turn each message into a Redis/BullMQ job, so tickets run one at a time per session and a restart resumes instead of losing work.
- **Worker (the runner)** — picks the role, builds the prompt, attaches the tools and safety hooks, calls the agent, then runs verify, deliver and remember.
- **Agent + tools** — the Claude Agent SDK and Claude Code CLI, with tools over the Model Context Protocol: Jira, Linear, GitHub, a browser, code search, and the app's own submit-fix and search-memory.
- **Storage** — MongoDB for anything durable, Redis for the live event stream to the browser.

![The Triage Agent architecture: the browser or desktop app sends a message to Next.js API routes, which enqueue a job in Redis and BullMQ; a worker — the chat runner — drives the Claude Agent SDK and Claude Code CLI, which call Anthropic's API and tools over MCP; the runner reads and writes MongoDB, streams events through Redis back to the browser, and pushes a branch and draft pull request to the git remote.](/blog/triage-architecture.svg)

The key point: the runner sits *between* the queue and the agent, so it — not the model — owns the workspace, the checks and the delivery. The agent never pushes code or opens a pull request itself.

## Benchmark: against plain Claude Code

Measured on the same bug with the same model (`claude-sonnet-5-5`), comparing plain Claude Code, Triage Agent's default fast pipeline, and its optional five-agent pipeline. The report tracks wall-clock time and model cost per bug; cost is the stand-in for tokens.

![Benchmark on the same bug and model. Time per bug: plain Claude Code 17.2 seconds, Triage fast 15.6 seconds, Triage full five-agent 83 seconds. Model cost per bug: plain Claude Code $0.059, Triage fast $0.058, Triage full $0.353.](/blog/triage-benchmark.svg)

The result that matters: the **fast pipeline costs the same as plain Claude Code** — about 16 seconds and six cents — while also proving the fix, opening the draft pull request, enforcing the guardrails and saving a reusable fix card. You get all of that for free on the time-and-cost budget of a bare assistant.

The project started with **five specialist agents** in a row (reproduce, fix, verify, build, review). It worked, but every extra agent re-read the same code to orient itself, and the verify and push steps were fixed command sequences that never needed a model — about **83 seconds and $0.35** per bug, roughly 5× slower and 6× dearer. So the default moved to one agent plus the runner, with a reviewer agent joining only when the change is large (over ~80 lines or 5 files). The five-agent pipeline is still available for teams that want a full review loop on every ticket.

## Team memory

After a fix is proven and delivered, the runner saves a **fix card** for that repo — symptoms, cause, fix, files, commit. When a later ticket overlaps, the best matching card goes into the agent's request, so it starts from a known cause instead of searching from scratch. A few rules keep it useful:

- **Only proven fixes are saved,** never raw ticket text.
- **A fix to the same files updates the card** instead of adding a duplicate.
- **Cards are checked against the code** and flagged stale when their files change; unused ones retire after 90 days.
- **People have the last word** — "merged" promotes a card, "wrong diagnosis" withdraws it.

Measured honestly, memory saved only a few percent on a repo where plain code search already found the cause in one step; the larger wins should come where finding the cause takes many steps, which hasn't been measured yet.

## Guardrails

The important rules are enforced by hooks that run *before* every action and can refuse it — not left to the prompt:

- No force push, no push to main, no resetting shared work.
- Pull requests are always drafts.
- Each ticket gets its own isolated checkout; the shared base is read-only.
- Production and server secrets, and the operator's personal Claude settings, never reach the agent.

## Built and tested

Next.js, React and Tailwind on the front; Node, BullMQ and Server-Sent Events on the back; MongoDB and Redis for data; Electron for the desktop build; TypeScript across a pnpm and Turborepo monorepo.

It is tested the way it asks you to trust it: around **600 unit tests**, evaluation scenarios that run the real model against repos with known bugs, full browser and HTTP runs from setup to a delivered fix, and security probes. Building it that way surfaced and fixed **thirty of its own defects** before it was done.
