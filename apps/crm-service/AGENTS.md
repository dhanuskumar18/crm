# CRM Service Module

> **Backend service — the core of the CostTracking platform**
>
> NestJS modular monolith | Prisma ORM | PostgreSQL | Port 3001

---

## What this module does

The CRM Service owns all business truth for the CostTracking platform. It manages
the full commercial lifecycle: lead capture → company/contact management → opportunity
tracking through sales pipelines → requirement gathering → customer onboarding. It also
provides cross-cutting features: polymorphic tagging (EntityTag), document attachments,
activity logging, follow-up scheduling, customer-360 aggregation, dashboard metrics,
and a full audit trail. All state changes are recorded via AuditService, and business
events are written to the OutboxEvent table using the transactional outbox pattern.

---

## Key flows

**Lead → Customer Conversion:**
1. Lead is created via `LeadsService.create()` with leadCode auto-generated
2. Sales works the lead: logs Activities, schedules FollowUps, changes status (NEW → CONTACTED → QUALIFIED)
3. Lead is converted via `LeadConversionService` — creates Company (if new), Contact, Customer, and optionally an Opportunity
4. Lead status → CONVERTED, conversion fields populated (convertedCustomerId, convertedCompanyId, convertedContactId)
5. Outbox event emitted: `lead.converted`
On error: Lead stays in current status, conversion is rolled back (Prisma transaction)

**Opportunity Pipeline Flow:**
1. Opportunity created via `OpportunitiesService.create()` with pipeline + initial stage
2. Opportunity moves through PipelineStages via stage change (updates stageId, probability, weightedValue)
3. Stage marked isWon → opportunity closed-won, closedAt set
4. Stage marked isLost → opportunity closed-lost, lostReason recorded
5. Audit log captures every stage change with old/new data

**Customer 360:**
1. `Customer360Service` aggregates data across modules for a single customer
2. Fetches: customer details, company, contacts, opportunities, activities, documents, follow-ups
3. Returns unified view — used by frontend's customer detail page

---

## Architectural decisions

- **Transactional Outbox** — business events (lead.created, opportunity.stage_changed, etc.)
  are written to `outbox_events` table in the same Prisma transaction as the entity change.
  A separate relay process publishes them to RabbitMQ. This guarantees at-least-once delivery.

- **Soft deletes everywhere** — every entity has `deletedAt`, `deletedBy`. Queries filter
  by `deletedAt: null` by default. No hard deletes in normal operations.

- **Polymorphic tagging** — `EntityTag` links any Tag to any entity type (LEAD, COMPANY,
  CONTACT, CUSTOMER, OPPORTUNITY) via `entityType` + `entityId` discriminator pattern.

- **Code auto-generation** — `leadCode`, `customerCode`, `opportunityCode`, `companyCode`,
  `requirementCode` are auto-generated unique identifiers separate from UUID `id`.

- **Global exception filter + logging interceptor** — `GlobalExceptionFilter` catches all
  errors; `LoggingInterceptor` logs request/response. Both registered at APP level.

- **PermissionsGuard** — registered globally via `APP_GUARD`. Checks RBAC permissions
  on every request.

---

## How this module connects to others

**api-gateway:** Gateway proxies HTTP requests to this service on port 3001.
**PostgreSQL:** All data access via Prisma (`crm_db` on port 5433).
**RabbitMQ (optional):** OutboxModule can publish events to RabbitMQ exchange.
**web (frontend):** Frontend calls the API gateway, which routes to this service.

---

## What this module does NOT do (and why)

- **Does not handle authentication** — auth (JWT issuance, login/logout) is planned for
  the api-gateway or a separate auth-service. This service only enforces permissions
  via PermissionsGuard assuming a valid user context is passed.

- **Does not manage cloud infrastructure** — VMs, hosting, domains, SSL are the Cloud
  Platform's responsibility (Phase 11+). CRM only holds cross-reference IDs.

- **Does not generate invoices or process payments** — these are Phase 3 (Finance).
  The data model for invoices/payments hasn't been built yet.

- **Does not manage projects or tasks** — Phase 4 (Projects & Delivery). Requirements
  module captures pre-sale requirements, not project execution.

- **Does not send notifications** — Phase 7. Business events are recorded in the outbox
  but no notification delivery system exists yet.

---

## Gotchas and things to know

- **Port 5433 not 5432** — Docker maps PostgreSQL to host port 5433 to avoid conflicts
  with any local Postgres installation.
- **No auth middleware yet** — PermissionsGuard exists but there's no JWT validation or
  user extraction middleware. `createdBy`, `assignedTo` fields accept arbitrary strings.
- **RabbitMQ is optional** — the outbox events table accumulates events but the relay
  process to publish them to RabbitMQ may not be running. Service works fine without it.
- **Decimal fields** — `estimatedValue`, `weightedValue` use `@db.Decimal(18, 2)`.
  Prisma returns these as `Decimal` objects, not plain numbers.
- **Unique constraints with soft deletes** — Contact email uniqueness is scoped to
  `[email, deletedAt]` so deleted contacts don't block new ones with the same email.

---

## Last updated

2026-08-18 | Filled from code analysis + architecture documents
