---
title: TriageOps
tagline: The Triage Agent as a hosted, sandboxed platform.
summary: The Triage Agent as a hosted platform: public GitHub issues become sandboxed sub-agent runs that open pull requests, with budgets and an audit trail. Targets: 20 concurrent runs, p95 queue-to-start under 30 s.
kicker: Agent platform · sandboxed runs · Step Functions
status: planned
draft: true
when: Planned · after DispatchPilot
year: 2026
role: Solo
order: 21
m1: 20 | concurrent runs
m2: < 30 s | p95 queue to start
m3: 50 issues | eval set, scored by tests passing
stack: [Claude Agent SDK, ECS Fargate, Step Functions, DynamoDB, S3, EventBridge, GitHub App, Terraform, Langfuse]
highlight: Reuses the Terraform modules, MCP server, tracing and eval harness from DispatchPilot.
art: s21
---

Teams want agentic bug-fixing they can trust. TriageOps takes the Triage Agent's five scoped specialists and runs each one in its own sandbox, with a hard budget per run and a full audit trail. It's demonstrated on public open-source issues in a sandbox organisation and rebuilt from scratch, with no employer code.

## Architecture

```
Next.js dashboard
  -> API Gateway
  -> Step Functions (one state machine per run)
       -> ECS Fargate sandbox task per sub-agent (Claude Agent SDK)
       -> GitHub App
  -> DynamoDB (runs, budgets), S3 (artifacts, diffs), EventBridge
  -> MCP server (reused from DispatchPilot)
```

## Milestones

### M1 · Single agent

- GitHub App in a sandbox organisation
- One agent run on Fargate
- Dashboard run list
- Terraform reused from DispatchPilot

### M2 · Orchestration

- Step Functions with five sub-agents
- Reuse the MCP server
- Budget caps per run

### M3 · Evals and safety

- Eval harness on 50 public issues
- Prompt-injection tests through issue text
- Sandbox hardening, allow-listed commands, secret scanning

### M4 · Scale and write-up

- 20-run concurrency test
- Cost per resolved issue
- Threat model and case study
