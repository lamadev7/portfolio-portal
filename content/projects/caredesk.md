---
title: CareDesk
tagline: Patient intake and scheduling agents, built on synthetic data.
summary: Front-desk AI agents for a clinic, built on synthetic patients. They take intake, book appointments and draft pre-visit notes, and a clinician approves anything clinical. Not a diagnostic tool.
kicker: Healthcare · multi-agent · MCP · FHIR · guardrails
status: todo
when: TODO
year: 2026
role: Solo
order: 4.5
featured: true
m1: FHIR via MCP | book, reschedule and cancel, each confirmed first
m2: Guardrails | PHI redaction, red-flag escalation, injection tests
m3: Evals in CI | synthetic conversations scored for safety and task success
f1: Intake agent | Collects the reason for the visit, history and insurance in conversation, then writes a structured FHIR record.
f2: Scheduling agent | Books, reschedules and cancels through the FHIR MCP server; every change waits for the patient to confirm.
f3: Pre-visit summariser | Drafts the clinician's note; nothing is saved until a clinician approves it.
f4: Cited answers (RAG) | Answers from clinic policies and public patient-education pages, each linked to its source.
f5: Safety guardrails | Red-flag escalation, PHI redaction, no diagnosis or dosing advice, prompt-injection tests.
f6: Evals and audit | Synthetic conversations scored in CI for safety and task success; every tool call is audited.
cardStack: Next.js · LangGraph · FastAPI · FHIR · Bedrock Guardrails · pgvector · AWS
cta: case
stack: [Next.js, TypeScript, LangGraph, FastAPI, Claude, Amazon Bedrock, Bedrock Guardrails, MCP, HAPI FHIR, Synthea, PostgreSQL, pgvector, ECS Fargate, Step Functions, DynamoDB, CloudTrail, Langfuse, GitHub Actions]
highlight: Healthcare and regulated work comes up in 15 of 47 current full-stack AI postings. This project proves the parts they ask for most: guardrails, PII handling, human review, audit trails and evals.
art: s22
---

Clinics lose staff hours to intake forms, scheduling calls and pre-visit paperwork. CareDesk hands that front-desk work to a small team of agents and keeps a person in charge of anything clinical. It runs only on synthetic patients and public information, and it never diagnoses.

## What it does

- **Intake agent:** collects the reason for the visit, history and insurance in plain conversation, then writes a structured FHIR record.
- **Scheduling agent:** finds open slots and books, reschedules or cancels through a FHIR server. Every write waits for the patient's confirmation.
- **Summariser:** drafts a pre-visit note for the clinician, who approves or edits it before it is saved.
- **Answers with citations:** clinic policies and public patient-education pages are retrieved with RAG, and every answer links its source.

## Guardrails

- Red-flag symptoms, such as chest pain or trouble breathing, stop the flow and show emergency guidance straight away.
- PHI is redacted from logs and traces, and every tool call is written to an audit trail.
- A prompt-injection suite tests the paths where outside text enters: patient messages and retrieved pages.
- The agents refuse to give diagnoses or dosing advice, and those refusals are tested.

## Evals

A golden set of synthetic conversations, generated from Synthea patients, is scored for task success, safety and faithfulness. LLM-as-judge does the scoring, with human spot checks. The CI build fails when any score drops.

## Architecture

```
Next.js patient chat + clinician console
  -> API Gateway (REST + WebSocket)
  -> ECS Fargate: LangGraph orchestrator (intake, scheduling, summariser)
       -> Bedrock (Claude) behind Bedrock Guardrails
       -> MCP server "fhir-tools" -> HAPI FHIR (Synthea patients)
       -> Aurora PostgreSQL + pgvector (policies, patient education)
  -> Step Functions (clinician approval)
  -> DynamoDB (sessions), CloudTrail + Langfuse (audit, traces, cost)
```

## Data

Synthetic patients come from [Synthea](https://synthetichealth.github.io/synthea/), served by a local [HAPI FHIR](https://hapifhir.io/) server. Patient-education content comes from public pages such as [MedlinePlus](https://medlineplus.gov/). No real patient data is used.
