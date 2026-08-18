# Project Index

> This file is read when the AI needs an overview of the whole project
> rather than a single module.

---

## Project overview

CostTracking is an internal CRM + Cloud management platform for a web agency.
It manages the full business lifecycle: lead acquisition → customer onboarding →
service delivery → invoicing → payment tracking → profitability analysis. The Cloud
platform (future) will manage hosting, VMs, domains, SSL, and infrastructure. The
internal agency deployment is the first production customer; once proven, it becomes
a multi-tenant SaaS product for other agencies.

---

## Tech stack

| Layer | Technology |
|---|---|
| Language | TypeScript (backend + frontend) |
| Backend framework | NestJS (modular monolith) |
| ORM | Prisma (PostgreSQL) |
| Frontend framework | Next.js (React) |
| Primary database | PostgreSQL 16 (Docker, port 5433, DB: `crm_db`) |
| Cache | Redis (planned — not yet configured) |
| Queue / event bus | RabbitMQ (optional — transactional outbox pattern in place) |
| Auth approach | JWT (planned — permissions guard structure exists) |
| Package manager | pnpm (workspace monorepo) |
| Build orchestration | Turbo (configured in devDependencies) |
| Hosting / infra | Docker Compose (local dev), production TBD |
| CI/CD | TBD |

---

## Modules

| Module | What it does |
|---|---|
| `apps/crm-service` | CRM backend — leads, companies, contacts, customers, opportunities, pipelines, requirements, activities, follow-ups, tags, documents, customer-360, dashboard, audit, outbox events |
| `apps/api-gateway` | API gateway — request routing, will handle auth/RBAC enforcement, rate limiting |
| `apps/web` | Next.js frontend — CRM UI (dashboard, lead management, customer views, etc.) |

---

## Database

Single PostgreSQL database (`crm_db`) with these entity groups:

| Entity Group | Models |
|---|---|
| Company & Contacts | Company, Contact |
| Sales Pipeline | Lead, Customer, Pipeline, PipelineStage, Opportunity |
| Requirements | Requirement |
| Activities | Activity, FollowUp |
| Organization | Tag, EntityTag |
| Documents | Document |
| System | AuditLog, OutboxEvent |

Prisma schema: `apps/crm-service/prisma/schema.prisma` (718 lines)

---

## External services

- PostgreSQL 16 (Docker) → primary data store
- RabbitMQ (optional, planned) → event publishing from outbox
- No external SaaS integrations yet

---

## Key architecture decisions

- **Two-platform design**: CRM owns business truth; Cloud (future) owns infrastructure truth
- **Modular monolith**: Start monolithic within each platform; extract microservices only when justified
- **Transactional outbox**: Events are written to an outbox table in the same DB transaction, then published async
- **Soft deletes**: All entities use `deletedAt` for soft deletion
- **Code-based auto-generation**: IDs are UUIDs; entities have auto-generated codes (leadCode, customerCode, etc.)

---
Created by setup_brain.py on 2026-08-18 | Filled with project context
