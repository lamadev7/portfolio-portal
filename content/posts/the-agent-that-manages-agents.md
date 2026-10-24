---
title: The agent that manages agents
summary: Scoped tools, evidence-gated handoffs and resumable sessions.
date: 2026-10-20
tags: [agents, architecture]
art: s15
---

One big agent with every tool is easy to start and hard to trust. When it goes wrong, you can't tell which part of it went wrong. So I've been building the other shape: one orchestrator that supervises a few specialists.

## Give each specialist less

A specialist should only hold the tools its job needs. In Triage Agent, QA can't push and review can't write code. That isn't a limit on what the system can do. It's what makes a mistake small: a confused reviewer can comment, and that's all.

## Make handoffs carry evidence

The orchestrator never takes "done" on faith. A handoff from dev to QA has to carry the files changed, the build status and a link to the pull request. If any of them is missing, the handoff is refused and the work goes back.

> An agent saying it finished is a claim. The handoff is where you check it.

## Plan for the crash

Long workflows get interrupted. Sessions live in MongoDB, so a restart resumes at the last completed phase instead of starting over. The supervisor's own state is just data, which is also what makes it easy to inspect.

## What the orchestrator actually does

It doesn't do the work. It decides who works next, checks what came back, and stops loops before they burn an afternoon. Most of the value is in those refusals.
