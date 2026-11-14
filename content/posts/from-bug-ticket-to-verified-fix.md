---
title: From a bug ticket to a verified fix
summary: How Triage Agent turns a Jira or Linear bug into a proven, draft pull request — the architecture, the build, and why a runner grades the fix instead of the model.
date: 2026-11-14
tags: [agents, architecture, testing]
art: s07
---

A coding assistant can already read a bug, find the cause and write a fix. The hard parts are the ones around that work: starting without copy-and-paste, proving the fix actually works, keeping a shared repository safe, and letting a whole team reuse what it learns. Triage Agent is a self-hosted app that closes those gaps. You connect your repositories and your ticket tracker, click **Triage** on a bug, and get back a draft pull request that has already been checked. This is what it is, why it exists, how it is built, and how it works end to end.

## What it is

Triage Agent runs on your own machine or server, as a web app or a packaged macOS desktop app. You point it at your repositories and your ticket tracker (Jira or Linear). When a bug comes in, you click Triage. An AI agent reads the ticket, writes a test that shows the bug, fixes the code, and hands the result to a *runner*. The runner is ordinary code, not the model: it re-runs that test on the old code and on the new code, runs the full test suite and the build, and only then pushes a branch, opens a draft pull request and comments on the ticket.

The agent itself is Claude Code, driven through Anthropic's Claude Agent SDK. Around it, Triage Agent adds what a team actually needs: an isolated workspace per ticket, guardrails, a record of every run, and a shared memory of fixes the team has already verified.

## Why it exists

A chat assistant in one person's editor already fixes bugs. It falls short the moment a team depends on it:

- **Every ticket starts with copy and paste.** Someone moves the ticket text, the repo and the context into a chat by hand.
- **"Fixed" is only a claim.** The same model that wrote the fix is the one reporting that it works. Nothing independent checks it.
- **Lessons stay with one person.** Each engineer's assistant starts from zero, so the team keeps paying to rediscover the same causes.
- **Shared repositories need rules.** No force pushes, no pushes to the main branch, no two tickets editing the same checkout at once.
- **There is no record.** When a fix goes wrong, there is no trail of what the agent ran.

Triage Agent exists to turn the one-off chat fix into something a team can run, trust and audit.

## How it works: one click, seven steps

The default flow uses a single agent session for the thinking, and leaves every check that can be scripted to code. Two words matter below: the **agent** is the Claude model doing open-ended work; the **runner** is plain code that the model cannot talk its way past.

1. **You click Triage.** The ticket's key, summary and description go into a queue for that session.
2. **Prepare the workspace** *(runner)*. A fresh, isolated copy of each repo for this ticket only, the test and build commands proven on earlier runs, and the single best matching past fix from team memory.
3. **Reproduce** *(agent)*. Claude writes a test that shows the reported bug and runs it to confirm it fails for the right reason. If the code actually matches the documented behaviour, it stops with a "works as designed" verdict and changes nothing.
4. **Fix and submit** *(agent)*. The smallest code change that makes the test pass, then one structured hand-off that names the test command, the cause and the changed files.
5. **Verify** *(runner)*. The new test runs on the original commit — it must fail — and on the fix — it must pass. Then the full suite and the build run. Any failure goes back to the same agent session with the output, up to three attempts.
6. **Deliver** *(runner)*. Commit, push a branch (for example `SHOP-42-AGENT`), open a draft pull request, and post one comment on the ticket.
7. **Remember** *(runner)*. Save the verified fix — symptoms, cause, fix, files, commit — to team memory for the next related ticket.

![The Triage Agent workflow: a ticket goes to the runner, which prepares an isolated workspace and recalls memory; the agent reproduces and fixes; the runner verifies, delivers a draft pull request and saves a fix card, with a failed check looping back to the agent up to three times.](/blog/triage-workflow.svg)

A concrete run: ticket `SHOP-42`, "the `SAVE10` discount isn't applied when the cart subtotal is exactly $100." The agent reproduced it, traced it to a strict `>` where the terms said "or more", changed one line (`src/pricing.js`), and the runner verified and delivered the draft pull request in about sixteen seconds, at roughly six cents of model cost.

## The agent and the runner

> An agent saying "fixed" is a claim. The step that runs the test is where you check it.

This split is the core idea. The model is good at writing a fix. It is the wrong thing to also *grade* the fix, because the same reasoning that wrote a bug can convince itself the bug is gone. So the grading lives in code the model cannot override. The runner owns the facts: the test fails before the change, passes after, the suite is green, the build is green. Only then does anything ship — as a draft, never merged automatically. A failed check isn't the end; its output is fed back to the same session to try again, up to three times.

## Architecture

The app is a few plain parts wired in a line, so each one does a single job and the whole thing survives a restart.

- **The interface** is a Next.js and React front end — the tickets list, the live chat view of a run, the knowledge page, configuration and team settings. The desktop version is the same interface wrapped in an Electron window.
- **The API layer** is a set of Next.js routes. Sending a message and streaming a run's progress are two separate endpoints, so the browser can reconnect to a run in progress.
- **The job queue** is Redis with BullMQ. Each message becomes a job, so tickets run one at a time per session and a server restart picks up where it left off instead of losing the work.
- **The worker** is the heart of it, called the chat runner. For each job it chooses the agent's role, builds the prompt, attaches the tools and the safety hooks, and calls the Claude Agent SDK. After the agent finishes thinking, this same worker runs the verify, deliver and remember steps — the runner.
- **The agent** is the Claude Agent SDK starting the Claude Code command-line tool, which talks to Anthropic's API and to its tools.
- **The tools** connect over the Model Context Protocol, a standard way to give a model typed tools: Jira, Linear, GitHub, a real browser for UI checks, fast code search, plus two of the app's own — one to submit a fix, one to search memory.
- **Storage** is MongoDB for everything that should last (users, projects, sessions, messages, run traces, memory cards) and Redis for the live event stream that feeds the browser.

![The Triage Agent architecture: the browser or desktop app sends a message to Next.js API routes, which enqueue a job in Redis and BullMQ; a worker — the chat runner — drives the Claude Agent SDK and Claude Code CLI, which call Anthropic's API and tools over MCP; the runner reads and writes MongoDB, streams events through Redis back to the browser, and pushes a branch and draft pull request to the git remote.](/blog/triage-architecture.svg)

Put together, a request flows top to bottom: browser → API route → queue → worker → agent → tools, with results written to MongoDB and progress streamed back to the browser through Redis. The important design point is that the runner sits *between* the queue and the agent, so it — not the model — owns the workspace, the checks and the delivery. The agent never pushes code or opens a pull request itself.

## Two pipelines: one agent by default, five on demand

The project began with five specialists in a row: one to reproduce, one to fix, one to verify, one to build and push, one to review. It worked, but every new agent re-read the same code just to catch up, and the verify and push steps were fixed command sequences that never needed a model at all. On the benchmark it took about 83 seconds and $0.35 per bug.

So the default is now the **fast pipeline**: one agent session plus the runner. A reviewer agent joins only when the change is large — more than about 80 lines or 5 files. Same ticket, same model, the cost of the extra agents disappears:

- five agents: about **83 seconds** and **$0.35** per bug
- one agent plus the runner: about **16 seconds** and **$0.06** per bug — roughly 5× faster and 6× cheaper

The five-agent **full pipeline** is still available, set per project or by a single environment switch, for teams that want a full review loop on every ticket. Most of the saving comes from replacing three agent runs with code that executes the same checks.

## Team memory: learn once, reuse next time

After the runner has proven and delivered a fix, it saves a **fix card** for that repository: what the bug looked like, the root cause, the fix, the files and the commit. When a later ticket on the same repo overlaps with a card, the runner puts that one card into the agent's request, so the agent starts from a known cause instead of searching from scratch. The agent can also search memory itself with new terms it finds while working.

The rules that keep the memory useful instead of noisy:

- **Only proven fixes are saved**, never raw ticket text. Saving every outcome does worse than a small, careful memory, and memory fed from arbitrary input can be poisoned.
- **A fix to the same files updates the existing card** with history, rather than adding a duplicate.
- **Cards are checked against the code.** If the files a card cites have changed since its fix, the card is flagged stale. Cards that go unused and unaccepted stop being offered after 90 days.
- **People have the last word.** Marking a pull request "merged" promotes its card; "rejected" or "wrong diagnosis" withdraws it. Admins can see, delete and add cards on the knowledge page.
- **Each component's fixes also become a small skill** in the agent's workspace, so the agent sees a one-line description and opens the detail only when it is relevant.

This was measured honestly: on a 35-module repo where the cause sits in a shared helper far from the symptom, memory saved only a few percent of time and cost, because plain code search already found the file in one step. The bigger wins should come on codebases where finding the cause takes many steps — which hasn't been measured yet, and the write-up says so rather than overselling it.

## Guardrails that run as code

Rules that live only in a prompt get ignored eventually, so the important ones are enforced by hooks that run *before* every action and can simply refuse it:

- No force push, no push to the main branch, no resetting shared work.
- Pull requests are always drafts; marking one ready is blocked.
- Each ticket gets its own isolated checkout; the shared base copy is read-only to agents.
- The command the agent reports as its test passes the same safety checks before the runner executes it.
- Production secrets never enter prompts, and the server's own secrets are stripped from the agent's environment.
- The operator's personal Claude settings and instructions are kept out of every agent run.

## What it is built with

- **Interface:** Next.js (App Router), React, Tailwind CSS.
- **Server:** Node.js, Next.js API routes, a BullMQ job queue, Server-Sent Events for live updates, signed-token sessions.
- **Agent:** the Claude Agent SDK and the Claude Code CLI, running `claude-sonnet-5-5`, with tools over the Model Context Protocol.
- **Tools:** Jira, Linear, GitHub, a Playwright browser, Zoekt code search, plus the app's own submit-fix and search-memory tools.
- **Data:** MongoDB for durable state, Redis for the queue and the live stream.
- **Desktop:** Electron, with Redis, code search and Claude Code bundled in.
- **Build and test:** TypeScript, a pnpm and Turborepo monorepo, Vitest, Playwright, an evaluation harness that runs the real model, and GitHub Actions.

## How it was tested

The app is tested the way it asks you to trust it — with real runs, not just assertions. There are four levels:

- **Unit tests** for the logic: runner verification, the memory store, the safety rules, the prompts and the routing. Around **600 tests**, green on the main branch.
- **Evaluation scenarios** that run the real model against fixture repositories with known bugs: a genuine bug, a Jira-plus-GitHub flow, a "not actually a bug" case, memory on and off, and the 35-module repo. A scenario only counts as passing if every trial passes.
- **End-to-end runs** through the browser and through the HTTP API, from first setup to a delivered fix, including two tickets running at once on one repo, roles and the knowledge page.
- **Security probes** for cross-site request forgery, ticket-id injection, concurrent setup and bad input types.

Building it this way surfaced its own bugs: **thirty defects were found and fixed** during testing before it was called done.

## In short

Triage Agent takes a bug ticket and returns a fix that has been proven, not just claimed. The model does the open-ended work — reproduce, diagnose, fix. Code does everything that has to be trustworthy — isolate the workspace, run the checks, enforce the safety rules, deliver the draft pull request, and remember what worked. That division is the whole design: let the agent be creative where creativity helps, and let plain code be strict where strictness is what you actually need.
