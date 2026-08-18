# 001 — CRM and Cloud as Separate Platforms with Separate Databases

Date: 2026-08-18
Status: Decided

## Context
CostTracking needs to manage both business operations (CRM: leads, customers, invoices,
projects) and infrastructure operations (Cloud: servers, VMs, hosting, domains). The
question was whether to build one monolithic application or separate platforms.

## Decision
Build two separate platforms — CRM Platform and Cloud Platform — each with its own
database (PostgreSQL). They communicate via REST APIs (commands) and events (async
lifecycle changes). Cross-references use IDs only, no shared tables.

## Why
- **Ownership clarity**: CRM owns business truth (customers, invoices, costs); Cloud owns
  infrastructure truth (servers, VMs, status, monitoring). No ambiguity about which system
  is authoritative for any piece of data.
- **Independent deployment**: CRM can be updated without affecting Cloud infrastructure
  operations, and vice versa.
- **Future product strategy**: Cloud platform can eventually be sold standalone to
  customers who don't need the CRM.
- **Team scaling**: Different teams can own each platform with clear boundaries.

## Alternatives we considered
- **Shared database**: Rejected because it couples deployment, makes tenant isolation
  harder, and prevents independent scaling.
- **Microservices from day one**: Rejected — too much operational complexity for the
  current team size. Start with modular monoliths, extract when justified.

## Consequences
- Enables: independent deployment, clear data ownership, future SaaS separation
- Constrains: cross-platform queries require API calls (can't just JOIN), need
  reconciliation to detect drift between CRM and Cloud state
- Requires: transactional outbox pattern, saga pattern for distributed transactions
  (e.g., Order → Provision → Bill)
