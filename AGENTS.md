# Project Brain — CostTracking CRM

> This file is auto-loaded by Antigravity, Claude Code, and Codex
> when you work in this project. It explains the system and points
> to the real context files.

---

## How the brain system works

This project uses per-module `AGENTS.md` files + a `.brain/` folder.
When you open a file in a module, your AI loads that module's `AGENTS.md`
automatically — it already knows the flows, decisions, and constraints
without you having to re-explain them every session.

| What you need | Where it is |
|---|---|
| Project overview & tech stack | `.brain/index.md` |
| System architecture & tech decisions | `.brain/architecture.md` |
| Module-to-module dependency map | `.brain/connections.md` |
| Why major decisions were made | `.brain/decisions/` |
| Work tracking sheet (what to build) | `.brain/work-tracking.md` |
| What a specific module does | `<module>/AGENTS.md` |

## Module context files

- `apps/crm-service/AGENTS.md` — CRM backend (NestJS + Prisma)
- `apps/api-gateway/AGENTS.md` — API Gateway (NestJS)
- `apps/web/AGENTS.md` — Frontend (Next.js)

## Project structure

```
crm/                          ← pnpm monorepo root
├── apps/
│   ├── crm-service/          ← NestJS backend, Prisma ORM, port 3001
│   ├── api-gateway/          ← NestJS gateway, port 3002
│   └── web/                  ← Next.js frontend
├── .brain/                   ← Project knowledge hub
├── docker-compose.yml        ← PostgreSQL 16 on port 5433
└── setup_brain.py            ← Brain scaffolding (can be deleted)
```

## Architecture documents (reference)

These .docx files in the project root contain the full product vision:
- `CostTracking_Full_Product_Architecture_and_Flow.docx` — business-level architecture
- `CostTracking_Technical_Architecture_and_Flow.docx` — production-grade patterns
- `CostTracking_Technical_Flow_Architecture.docx` — detailed operational flows
- `CostTracking_Work_Tracking_Sheet (2).xlsx` — 172 items across 15 phases

## Team rule

If your PR changes something significant in a module — a new flow, a changed
architectural decision, a new dependency on another module — update that
module's `AGENTS.md` in the same PR. The reviewer checks it alongside the code.

---
Created by setup_brain.py on 2026-08-18 | Filled with project context
