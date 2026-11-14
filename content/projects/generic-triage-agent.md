---
title: Generic Triage Agent
tagline: The front desk for any agent fleet.
year: 2025
role: Solo
order: 5
agent: true
stack: [Python, LLM tool use, FastAPI]
highlight: Routing decisions are schema-driven, which is what lets it slot in front of any agent fleet.
repo: https://github.com/lamadev7/generic-traige-agent
art: s05
also: true
alsoNote: FastAPI router for agent fleets
kicker: Agent routing · FastAPI
---

A drop-in triage layer. It classifies incoming requests and routes each one to the right specialised handler, so it can sit at the front of any multi-agent system.

## Schema-driven routing

The routing decisions are made against schemas rather than hand-written rules. That's what makes the layer generic: the same triage agent can front very different fleets.
