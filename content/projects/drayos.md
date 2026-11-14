---
title: drayOS at PortPro
tagline: A logistics platform, shipped end to end.
year: 2022
role: Senior full-stack engineer, PortPro
featured: true
highlight: A reusable component design system cut new-screen lead time by about 40%.
art: s23
kicker: Production full-stack · orchestrator agent
when: 2022 – now
m1: ~40% | faster new screens with a shared design system
m2: 10k | live markers kept smooth, each moving within a second
m3: Streaming | bulk import for large freight uploads
cardStack: React · Node (Express, Hapi.js) · MongoDB · React Leaflet · Socket.io · AWS
cta: case
order: 2
summary: PortPro's logistics platform for trucking companies. I build across dispatch, rates, live tracking and messaging, and the AI agents that now help run billing and order entry.
f1: AI billing workbench | Billing rules with a sandbox to test them on real loads, a streaming billing chat, and an AI agent that checks every manual price change before a person approves it.
f2: Order Entry board | Incoming EDI and email orders are grouped, checked for bad container numbers and clashes, and turned into loads, with an agent chat alongside.
f3: Rates and tariffs | Customer rates, vendor and driver tariffs, and a rebuilt tariff system with bulk upload into a fast grid, live quote pricing and a public Tariff API.
f4: Live tracking map | Live drivers and trucks, trip playback, share links with live ETA, and GPS history merged from truck devices and the driver app. Built in React Leaflet so 10k moving markers stay smooth, each updating its position within a second.
f5: Driver messaging | Channels tied to loads, seen-by receipts, automatic translation, online status from location, and old chats moved from MongoDB to PostgreSQL.
f6: Dispatch and reporting | Load detail, the dispatcher grid, driver hours checks, exception reason codes, email and download audits, and on-time performance reports.
stack: [React, Redux, Node.js, MongoDB, PostgreSQL, TimescaleDB, Elasticsearch, Python, Google ADK, MCP, Firebase, React Leaflet, AWS]
---

drayOS is PortPro's logistics TMS. I've worked on it since June 2022, owning features end to end: data models and Node services on MongoDB and Sequelize, through to the TypeScript React screens.

## Agents

I'm now building an orchestrator AI agent that manages and monitors the platform's other agents, including the dispatcher, billing and customer-service sub-agents.
