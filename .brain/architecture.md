# Architecture

> The most important cross-cutting context file.
> Updated when major decisions change.

---

## System design overview

CostTracking is a **two-platform system**: a CRM Platform (business truth) and a
Cloud Platform (infrastructure truth, future). Both are modular monoliths that
communicate via APIs for commands and events for asynchronous lifecycle changes.
The CRM is a REST API backend (NestJS) with a Next.js frontend. The system is
designed for multi-tenancy from the start. Currently only the CRM Platform is
being built; the Cloud Platform comes in Phase 11+.

```
COSTTRACKING
     |
+----+----+
|         |
CRM       CLOUD (future)
|         |
Business  Infrastructure
Truth     Truth
|         |
+--- API + EVENTS ---+
```

---

## Key technology choices and why

- **NestJS** → chosen for its modular architecture that maps cleanly to domain modules
  (leads, customers, opportunities, etc.). Each module has its own controller, service,
  DTOs, and can be extracted to a microservice later without rewriting.

- **Prisma ORM** → type-safe database access, auto-generated client from schema,
  migration support. Chosen over TypeORM for better DX and schema-first approach.

- **PostgreSQL** → relational database required for ACID transactions across
  invoices/payments/costs. All financial data needs referential integrity.

- **Transactional Outbox Pattern** → events are stored in the `outbox_events` table
  within the same DB transaction as the business operation, then published async.
  This guarantees at-least-once delivery without distributed transactions.

- **pnpm workspace** → monorepo with `apps/crm-service`, `apps/api-gateway`,
  `apps/web`. Turbo for build orchestration.

---

## Communication patterns between modules

**Within CRM (current):**
- Direct imports within the NestJS monolith. Each domain module (leads, customers,
  opportunities, etc.) is a NestJS Module with its own service injected via DI.
- Cross-module calls are service-to-service via dependency injection.
- The `OutboxModule` handles async event publishing.

**CRM ↔ Cloud (future):**
- REST APIs for synchronous commands (e.g., provision a VM)
- Event bus (RabbitMQ/Kafka) for async lifecycle changes (e.g., ResourceProvisioned)
- Saga pattern for distributed transactions (Order → Provisioning → Billing)
- Reconciliation service to detect CRM/Cloud state drift

---

## Data storage strategy

| Store | What goes there | Why |
|---|---|---|
| PostgreSQL (`crm_db`) | All CRM entities: companies, contacts, leads, customers, opportunities, pipelines, requirements, activities, follow-ups, tags, documents, audit logs, outbox events | Relational, ACID required for business data |
| PostgreSQL (future `cloud_db`) | Cloud entities: servers, VMs, hosting accounts, domains, SSL, backups | Separate DB for Cloud platform independence |
| Redis (planned) | Sessions, rate-limit counters, refresh tokens, cache | Ephemeral, fast access |
| Object Storage (planned) | File uploads, document attachments | Blob storage for files |

---

## Entity ownership rules

- **CRM owns**: Customer, Lead, Opportunity, Service/Subscription (commercial), Invoice,
  Payment, Cost, Profitability, Project, Support Ticket
- **Cloud owns** (future): Server, VM, Hosting Account, Website, Domain, DNS, SSL,
  Backup, Monitoring, Provisioning Job
- Cross-references use IDs only — no shared tables between CRM and Cloud databases

---

## Production patterns (from architecture docs)

These patterns are specified in the architecture docs and should be followed:

1. **State machines** — every business entity has explicit states including failure/cancellation
2. **Idempotency** — every command that creates/mutates a billable resource requires an idempotency key
3. **Saga / compensation** — distributed transactions (Order → Provision → Bill) use saga pattern
4. **Transactional outbox** — events are written to outbox table in same transaction
5. **Idempotent consumers** — event consumers store processed event IDs
6. **Retry with backoff** — provisioning jobs retry with exponential backoff
7. **Reconciliation** — periodic CRM vs Cloud state comparison
8. **Audit logs** — append-only, captures actor/action/before/after/timestamp
9. **Tenant isolation** — row-level security or mandatory tenant_id filter
10. **Infrastructure adapter** — provider-specific commands behind generic interface

---

## Deployment and infrastructure

**Current (local dev):**
- Docker Compose runs PostgreSQL 16 on port 5433
- `npm run start:dev` for crm-service (port 3001) and api-gateway (port 3002)
- `pnpm --filter web dev` for Next.js frontend

**Production (planned):**
- TBD — architecture docs recommend Docker/Kubernetes
- CRM and Cloud should be independently deployable

---

## Patterns we deliberately do NOT use

- **No shared database** between CRM and Cloud — they use separate DBs with explicit cross-references
- **No microservices yet** — start with modular monoliths; extract only when scale or ownership requires it
- **No immediate destructive deletion** — use soft deletes with retention/deletion policy
- **No auto-healing of billing state** — reconciliation surfaces mismatches for human review, never auto-corrects
- **No direct hypervisor calls from CRM** — all infrastructure commands go through the Cloud platform's Infrastructure Adapter

---
Created by setup_brain.py on 2026-08-18 | Filled from architecture documents
