# Module Dependency Map

> Update this file whenever you add or change a connection between modules.
> Read this first whenever you're doing cross-module work.

---

## Internal Dependencies (crm-service modules)

```
PrismaModule ← (used by ALL domain modules for DB access)
AuditModule  ← (used by ALL domain modules for audit logging)
OutboxModule ← (used by modules that emit business events)

LeadsModule → CompaniesModule (lead belongs to company)
LeadsModule → ContactsModule (lead linked to contact)
LeadsModule → OpportunitiesModule (lead converts to opportunity)
LeadsModule → CustomersModule (lead converts to customer)

OpportunitiesModule → PipelinesModule (opportunity belongs to pipeline/stage)
OpportunitiesModule → LeadsModule (opportunity linked to lead)
OpportunitiesModule → CustomersModule (opportunity linked to customer)
OpportunitiesModule → CompaniesModule (opportunity linked to company)
OpportunitiesModule → ContactsModule (opportunity linked to contact)

CustomersModule → CompaniesModule (customer belongs to company)
CustomersModule → ContactsModule (customer has primary contact)

RequirementsModule → OpportunitiesModule (requirement linked to opportunity)
RequirementsModule → LeadsModule (requirement from lead)
RequirementsModule → CompaniesModule (requirement belongs to company)

Customer360Module → CustomersModule (aggregates customer data)
Customer360Module → ActivitiesModule (shows customer activities)
Customer360Module → OpportunitiesModule (shows customer opportunities)
Customer360Module → DocumentsModule (shows customer documents)

DashboardModule → LeadsModule (lead statistics)
DashboardModule → OpportunitiesModule (pipeline metrics)
DashboardModule → CustomersModule (customer metrics)

ActivitiesModule → (linked to Lead, Company, Contact, Customer, Opportunity)
FollowUpsModule → (linked to Lead, Company, Contact, Customer, Opportunity)
TagsModule → (polymorphic tags via EntityTag for any entity)
DocumentsModule → (linked to Customer, Company, Contact, Opportunity, Requirement)
```

---

## App-to-App Dependencies

```
apps/web → apps/api-gateway (frontend calls gateway API)
apps/api-gateway → apps/crm-service (gateway proxies to CRM backend)
apps/crm-service → PostgreSQL (via Prisma, port 5433)
apps/crm-service → RabbitMQ (optional, for outbox event publishing)
```

---

## Shared / core modules

These modules are imported by many others and need extra care when changing:

- **PrismaModule** — every domain module depends on it for DB access
- **AuditModule** — audit logging across all entities
- **OutboxModule** — event publishing for cross-platform communication
- **common/** — shared DTOs (pagination), guards (permissions), filters, interceptors

---

## External connections (future)

```
crm-service → RabbitMQ/Kafka (event bus for CRM ↔ Cloud events)
crm-service → Redis (sessions, caching, rate limiting)
cloud-service → Proxmox API (VM provisioning via Infrastructure Adapter)
cloud-service → Domain Registrar APIs (domain/DNS management)
cloud-service → Let's Encrypt (SSL certificate automation)
```

---
Created by setup_brain.py on 2026-08-18 | Filled from code analysis
