---
title: Make the decision explicit
summary: The review note I gave most to capstone teams.
date: 2026-06-09
tags: [mentoring, engineering]
art: s12
---

I supervised about twelve final-year project teams at Herald College Kathmandu. Their projects ranged from blockchain voting to recommendation engines to full-stack platforms, but one review note kept coming back.

## Accidental decisions

Most architecture choices in a student project aren't wrong. They're accidental. A database gets picked because the tutorial used it. An API shape appears because the first screen needed it. Nobody chose it, so nobody can defend it.

## Write it down

The fix is small. For each real decision, write three lines:

1. What we chose.
2. What we didn't choose, and why not.
3. What would make us change our minds.

A team that can say why they didn't pick the other option has made a decision. A team that can't has made a default.

## Why it matters past the defence

The examiners ask "why this?" and an explicit decision answers it in one breath. The habit matters more later, though. In a real codebase, the person asking is a teammate a year from now, and the three lines are all they'll have.
