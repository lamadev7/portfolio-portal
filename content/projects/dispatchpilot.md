---
title: DispatchPilot
tagline: A dispatcher copilot on AWS, with an eval gate in CI.
summary: A dispatcher copilot on AWS: cited answers over public freight and port rules, multi-agent workflows through a published MCP server, and an eval gate that fails CI when quality drops.
kicker: Flagship · RAG · LangGraph · MCP · evals · AWS
status: next
draft: true
progress: M1 of 4
when: Next milestone
year: 2026
role: Solo
order: 20
m1: 50 req/s | sustained in a 10-minute load test
m2: < 2 s | p95 time to first token
m3: 200 questions | golden set; CI fails on regression
cardStack: Next.js · LangGraph · Aurora pgvector · ECS Fargate · SQS · Step Functions · Terraform · Langfuse
stack: [Next.js, TypeScript, LangGraph, Claude, Amazon Bedrock, MCP, PostgreSQL, pgvector, ECS Fargate, SQS, Step Functions, DynamoDB, Terraform, Langfuse, GitHub Actions, k6]
highlight: One build that proves evals, vector search, LangGraph, an authored MCP server, observability, guardrails and AWS infrastructure at a stated scale.
art: s20
---

Dispatchers lose time on tariff lookups, detention and demurrage rules, and exceptions. DispatchPilot answers those questions with citations and runs the follow-up work through agents. It uses public data only: FMCSA hours-of-service rules, public terminal guides, ISO 6346 container codes, public tariffs and synthetic loads.

## Architecture

```
Next.js (CloudFront)
  -> API Gateway (REST + WebSocket)
  -> ECS Fargate orchestrator
       -> SQS -> Fargate agent workers (LangGraph + Claude / Bedrock)
       -> MCP server "freight-tools" (published to npm)
  -> Aurora PostgreSQL Serverless v2 + pgvector   docs, loads
     DynamoDB                                     sessions, eval runs
     ElastiCache                                  semantic cache
  -> Step Functions (human approval), EventBridge (events)
  -> CloudWatch, X-Ray, Langfuse (traces, cost)
```

## Targets to prove

- 50 requests per second sustained in a 10-minute k6 load test
- p95 time to first token under 2 s, full answer under 8 s
- 99.5% availability over a 30-day synthetic probe
- Cost per 1,000 queries, published

## Milestones

### M1 · Foundation (weeks 1–2)

- Terraform: VPC, Aurora, Fargate, CloudFront
- Next.js chat UI with streaming
- Ingest public documents into pgvector
- Baseline RAG endpoint with citations
- GitHub Actions CI/CD with Docker builds
- README with a one-command local run

### M2 · Agents and MCP (weeks 3–4)

- LangGraph router, retriever, planner and verifier
- Publish the freight-tools MCP server (lookup_tariff, validate_container, hos_check)
- SQS workers with a dead-letter queue
- Step Functions approval flow
- Langfuse tracing on every run
- Synthetic load generator

### M3 · Evals and guardrails (weeks 5–6)

- 200-question golden set
- LLM-as-judge rubric and retrieval metrics
- CI gate that fails on regression
- Prompt-injection suite based on the OWASP LLM Top 10
- PII redaction and schema-checked output
- Prompt caching, semantic cache and a cost dashboard

### M4 · Scale and write-up (weeks 7–8)

- k6 load test and tuning
- Chaos tests: kill a worker, throttle the model
- Autoscaling policies
- Optional Bedrock AgentCore variant
- Load-test and eval reports
- Case study and the post "How I gate prompts in CI"

## Cost and risks

About $60–120 a month while live (Aurora about $45, Fargate $15–25, model usage $10–30). The stack stops between demos. The risks are scope creep (the AgentCore variant goes first), synthetic data that looks fake, idle cost, and Bedrock quotas in the region.
