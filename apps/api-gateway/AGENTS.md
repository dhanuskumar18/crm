# API Gateway Module

> **Request routing, authentication, and cross-cutting concerns**
>
> NestJS | Port 3002

---

## What this module does

The API Gateway is the single entry point for all client requests (from the Next.js
frontend). It routes requests to the appropriate backend service (currently only
crm-service on port 3001). It will eventually handle: JWT authentication/validation,
RBAC enforcement, rate limiting, request logging, and tenant isolation. Currently it
is a minimal NestJS app that proxies requests.

---

## Key flows

**Request Routing (current):**
1. Client (Next.js frontend) sends HTTP request to gateway (port 3002)
2. Gateway routes to crm-service (port 3001)
3. Response returned to client

**Authentication (planned — Phase 0):**
1. Client sends credentials → gateway issues JWT (access + refresh tokens)
2. Subsequent requests include JWT in Authorization header
3. Gateway validates JWT, extracts user/tenant context
4. Attaches user context to request, forwards to backend service
5. Backend service's PermissionsGuard checks RBAC permissions

---

## Architectural decisions

- **Separate gateway service** — keeps auth/routing concerns out of the CRM service.
  Allows CRM service to focus on business logic only.
- **Will enforce tenant isolation** — gateway extracts tenant_id from JWT and injects
  it into every downstream request, ensuring row-level data isolation.
- **Currently minimal** — only has AppController, AppService, and main.ts bootstrap.
  Full gateway features (auth, proxy, rate-limit) will be added in Phase 0.

---

## How this module connects to others

**apps/web (frontend):** Receives all HTTP requests from the Next.js UI.
**apps/crm-service:** Proxies business requests to CRM backend on port 3001.
**Redis (planned):** Will store sessions, refresh tokens, rate-limit counters.

---

## What this module does NOT do (and why)

- **Does not contain business logic** — all domain logic is in crm-service. Gateway
  only handles cross-cutting infrastructure concerns.
- **Does not directly access the database** — it forwards requests to backend services
  that own their data.

---

## Gotchas and things to know

- **Port 3002** — gateway runs on 3002, CRM service on 3001. Frontend talks to 3002.
- **No proxy middleware yet** — currently just a hello-world NestJS app. HTTP proxying
  needs to be implemented (e.g., using `http-proxy-middleware` or NestJS's built-in
  `ClientProxy`).
- **CORS** — needs to be configured to allow requests from the Next.js dev server.

---

## Last updated

2026-08-18 | Filled from code analysis + architecture documents
