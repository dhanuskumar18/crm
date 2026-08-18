# CostTracking — Work Tracking Sheet

> **172 items across 15 phases** — extracted from the Excel sheet.
> Tell the AI which item # or phase/feature to implement next.
> Status: ✅ Done | 🔄 In Progress | ⬜ Not Started

---

## Phase Summary

| Phase | Scope | Platform | Status |
|---|---|---|---|
| Phase 0 | Auth, RBAC, tenant, base settings | CRM | ✅ |
| Phase 1 | Leads, Opportunities, Companies/Contacts, Activities, Customer 360 | CRM | 🔄 Partial |
| Phase 2 | Service Catalog, Plans, Quotation, Contract, Order, Subscription | CRM | ⬜ |
| Phase 3 | Invoices, Payments, Expenses, Vendors, Purchasing/Assets | CRM | ⬜ |
| Phase 4 | Projects, Milestones, Tasks, Timesheets | CRM | ⬜ |
| Phase 5 | Profitability & Reports | CRM | ⬜ |
| Phase 6 | Support (Ticketing, SLA, escalation) | CRM | ⬜ |
| Phase 7 | Notifications & Automation | CRM | ⬜ |
| Phase 8 | Dashboard | CRM | ⬜ |
| Phase 9 | Settings (Advanced) | CRM | ⬜ |
| Phase 10 | Search & Global UX | CRM | ⬜ |
| Phase 11 | Cloud Foundation (V1 - Manual) | Cloud | ⬜ |
| Phase 12 | CRM ↔ Cloud Mapping | Shared | ⬜ |
| Phase 13 | V2 Automation (Future) | Cloud | ⬜ |
| Phase 14 | Customer Portal (Future) | Shared | ⬜ |
| Phase 15 | SaaS Readiness (Future) | Shared | ⬜ |

---

## Phase 0 — Foundation & Access

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 1 | Auth | User Registration & Login | Email/password registration with hashed passwords, login returns JWT access token (15-min) and refresh token (30-day in Redis/DB). Foundation for all authenticated access. | P0 | ✅ |
| 2 | Auth | Token Refresh & Logout | Refresh endpoint issues new access token using valid refresh token. Logout invalidates refresh token. Keeps sessions alive without re-login. | P0 | ✅ |
| 3 | Auth | Password Reset Flow | 'Forgot password' sends a time-limited reset token to email (or shows link in dev mode). User sets a new password. | P1 | ✅ |
| 4 | RBAC | Role & Permission Seed | Pre-seeds the default roles (Super Admin, Admin, Sales Manager, Sales Rep, Account Manager, Finance, Support, Operations) with their permission sets so RBAC works from first login. | P0 | ✅ |
| 5 | RBAC | Permission Guard (Enforcement) | Every API request checked: role + module + action (view/create/edit/delete/approve). Unauthorized requests rejected with 403. | P0 | ✅ |
| 6 | Tenant | Organization (Tenant) Setup | Creates the first tenant record (company name, branding basics). All data is scoped to a tenant_id from this point. | P0 | ✅ |
| 7 | Tenant | Tenant Isolation (Row-Level) | Every DB query automatically filters by tenant_id, so one tenant never sees another's data — enforced at the Prisma/query layer, not just the API. | P0 | ✅ |
| 8 | Settings | Base Settings Page | Simple key-value settings (company name, default currency, fiscal year, date format, timezone). Stored in a Settings table, loaded once on app start. | P1 | ✅ |
| 9 | User Mgmt | Invite User | Admin invites a new user by email, assigning a role. User receives a link to set their password and activate their account. | P1 | ✅ |
| 10 | User Mgmt | User List & Deactivation | Lists all users with role, status, last login. Admin can deactivate (not delete) a user, which blocks login but preserves audit history. | P1 | ✅ |
| 11 | User Mgmt | User Profile | Any user can update their own name, phone, avatar, and change password — nothing else (no role self-change). | P2 | ✅ |
| 12 | Audit | Audit Log Foundation | Automatically records every create/update/delete across all modules — who did it, when, what changed (before/after JSON). Queryable for compliance and debugging. | P0 | ✅ |

---

## Phase 1 — CRM Core

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 13 | Leads | Lead CRUD | Create, view, edit, soft-delete leads. Each lead has auto-generated leadCode, source tracking, estimated value, assigned salesperson, and full contact info. | P0 | ✅ |
| 14 | Leads | Lead Status Flow | Move a lead through NEW → CONTACTED → QUALIFIED → CONVERTED or LOST, with each transition validated and audit-logged. The core of the sales pipeline's front end. | P0 | ✅ |
| 15 | Leads | Lead Assignment | Assign/reassign a lead to a sales rep (dropdown of active users with Sales role). Assignment logged in audit. Basic workload distribution. | P0 | ✅ |
| 16 | Leads | Lead → Customer Conversion | One-click conversion: creates Company (if new) + Contact + Customer + optional Opportunity from the lead's data. Lead marked CONVERTED. Prevents duplicate customer creation. | P0 | ✅ |
| 17 | Leads | Lead Filters & List View | Filter leads by status, source, priority, assigned user, date range. Sortable columns, pagination. Sales reps see their own leads; managers see all. | P1 | ✅ |
| 18 | Leads | Lead Import (CSV) | Bulk-import leads from a CSV file. Validates required fields, skips/reports duplicates (by email), creates leads in a single transaction. For migration/campaign data. | P2 | ⬜ |
| 19 | Opportunities | Opportunity CRUD | Create, view, edit, soft-delete opportunities. Links to a lead/customer/company and sits in a specific pipeline stage. Tracks estimated value, probability, expected close date. | P0 | ✅ |
| 20 | Opportunities | Pipeline Drag-and-Drop (Kanban) | Visual Kanban board where each column is a pipeline stage. Drag an opportunity card between columns to change its stage. Updates probability automatically based on stage config. | P0 | ⬜ |
| 21 | Opportunities | Stage Change with Reason | When moving to a 'Lost' stage, require a lost reason. When moving to 'Won', prompt to create an order/quotation. Keeps data clean and triggers the right downstream flow. | P1 | ✅ |
| 22 | Opportunities | Pipeline Configuration | Admin creates/edits pipelines and their stages: name, order, default probability %, color, isWon/isLost flag. Multiple pipelines (e.g., 'New Business', 'Renewals'). | P1 | ✅ |
| 23 | Opportunities | Opportunity Filters & List View | Table/list view with filters: pipeline, stage, owner, value range, expected close date, priority. Complements the Kanban board for reporting-oriented users. | P1 | ✅ |
| 24 | Companies | Company CRUD | Create, view, edit, soft-delete companies. Stores legal name, industry, tax/registration numbers, full address. Central entity linking contacts, customers, leads. | P0 | ✅ |
| 25 | Companies | Company Filters & List View | Filter by status (Prospect/Active/Inactive/Blocked), industry, city/country. Quick search by name. Paginated list with sortable columns. | P1 | ✅ |
| 26 | Contacts | Contact CRUD | Create, view, edit, soft-delete contacts linked to a company. Tracks designation, department, contact type (Decision Maker/Billing/Technical), multiple emails/phones. | P0 | ✅ |
| 27 | Contacts | Contact Type & Role Flags | Mark contacts as isPrimary, isBillingContact, isTechnicalContact, isDecisionMaker. These flags drive who gets invoices, who gets technical notifications, etc. | P1 | ✅ |
| 28 | Contacts | Contact Filters & List View | Filter by company, type, status, role flags. Searchable. Shows which company each contact belongs to. | P1 | ✅ |
| 29 | Activities | Activity Logging | Log activities (Call, Email, Meeting, Note, WhatsApp, Demo, Site Visit) against any entity (lead/company/contact/customer/opportunity). Records date, duration, outcome. | P0 | ✅ |
| 30 | Activities | Activity Timeline | Chronological feed of all activities for an entity — newest first. Filterable by type. Shows who logged it and when. Appears in Customer 360 and entity detail pages. | P1 | ✅ |
| 31 | Activities | Activity Filters | Filter activities across the system: by type, date range, user, linked entity. For managers reviewing team activity volume and patterns. | P1 | ✅ |
| 32 | Follow-Ups | Follow-Up CRUD | Create, view, edit, soft-delete follow-ups linked to any entity. Has due date, priority, assigned user, status (Pending/In Progress/Completed/Missed/Cancelled), optional reminder. | P0 | ✅ |
| 33 | Follow-Ups | Follow-Up Dashboard Widget | Shows upcoming/overdue follow-ups for the logged-in user. Sorted by due date. Quick-complete action. Critical for sales reps to not miss commitments. | P1 | ⬜ |
| 34 | Requirements | Requirement CRUD | Create, view, edit, soft-delete requirements linked to opportunities/leads. Captures business requirement, technical requirement, scope, deliverables, estimated hours/value. | P0 | ✅ |
| 35 | Requirements | Requirement Status Flow | DRAFT → GATHERING → ANALYSIS → CONFIRMED → READY_FOR_QUOTATION (or CANCELLED). Each transition logged. READY_FOR_QUOTATION feeds into Phase 2's quotation flow. | P1 | ✅ |
| 36 | Customer 360 | Customer 360 View | Single page showing everything about a customer: company details, contacts, active services (future), opportunities, recent activities, documents, follow-ups, invoices (future), profitability (future). | P0 | ✅ |
| 37 | Customer 360 | Infrastructure Tab (Placeholder) | Reserved tab in Customer 360 for linked Cloud resources (VMs, hosting, domains). Shows 'No cloud resources linked' until Phase 12 connects CRM to Cloud. | P2 | ⬜ |
| 38 | Documents | Document Upload & List | Upload files (PDF, images, docs) to any entity. Stores metadata (name, type, size, uploader). List with filters by entity and document type. | P1 | ✅ |
| 39 | Tags | Tagging System | Create tags (name + color), apply to any entity (Lead, Company, Contact, Customer, Opportunity). Filter any list by tags. Polymorphic via EntityTag table. | P1 | ✅ |
| 40 | Dashboard | Basic CRM Dashboard | Shows high-level CRM metrics: total leads (by status), pipeline value, conversion rate, upcoming follow-ups, recent activities. Role-filtered. | P1 | ✅ |

---

## Phase 2 — Sales & Commercial

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 41 | Service Catalog | Service Category CRUD | Define top-level service categories (e.g., Web Development, Hosting, Cloud). Each category groups related services. Admin-managed. | P0 | ⬜ |
| 42 | Service Catalog | Service Item CRUD | Define individual services within categories (e.g., 'WordPress Website', 'Shared Hosting 10GB'). Each has: name, description, default price, billing cycle, tax applicability. | P0 | ⬜ |
| 43 | Service Catalog | Plan/Tier Configuration | Some services have multiple plans/tiers (e.g., Basic/Pro/Enterprise hosting). Each plan defines: features, resource limits, pricing. Links back to the parent service item. | P1 | ⬜ |
| 44 | Quotations | Quotation CRUD | Create a quotation for a customer/opportunity. Add line items (from Service Catalog or custom), quantities, unit prices, discounts, tax. Auto-calculates subtotal, tax, total. | P0 | ⬜ |
| 45 | Quotations | Quotation PDF Generation | Generate a branded PDF from the quotation data: company logo, customer details, itemized table, terms & conditions, validity period. Downloadable and email-ready. | P1 | ⬜ |
| 46 | Quotations | Quotation Status Flow | DRAFT → SENT → ACCEPTED / REJECTED / EXPIRED. 'Accepted' triggers order creation. 'Expired' after configurable validity period. Version tracking if quotation is revised. | P1 | ⬜ |
| 47 | Quotations | Quotation Revision / Versioning | When a sent quotation is revised, the system creates a new version (v2, v3…) preserving the old one. Customer always sees the latest; internal users can compare versions. | P2 | ⬜ |
| 48 | Contracts | Contract CRUD | Create a contract linked to customer + quotation. Stores: start/end date, renewal terms (auto-renew or manual), value, signed document upload. Defines the commercial relationship. | P1 | ⬜ |
| 49 | Contracts | Contract Status & Alerts | DRAFT → ACTIVE → EXPIRING → EXPIRED / RENEWED / CANCELLED. System flags contracts expiring within 30/60/90 days for proactive renewal outreach. | P1 | ⬜ |
| 50 | Orders | Order CRUD | Create an order from an accepted quotation (or manually). Copies line items. Order = confirmed commercial commitment. Links to customer, quotation, contract. | P0 | ⬜ |
| 51 | Orders | Order Status Flow | DRAFT → CONFIRMED → IN_PROGRESS → DELIVERED → CLOSED (or CANCELLED). 'Confirmed' triggers subscription/service creation and, in future phases, provisioning. | P0 | ⬜ |
| 52 | Orders | Order → Subscription Creation | When an order is confirmed and contains recurring services, automatically creates a Customer Service/Subscription record per recurring line item with billing cycle and next billing date. | P0 | ⬜ |
| 53 | Subscriptions | Subscription CRUD | View/manage customer subscriptions (ongoing services). Each has: service reference, plan, status, billing cycle, start date, next billing date, auto-renew flag, linked cloud resource (future). | P0 | ⬜ |
| 54 | Subscriptions | Subscription Status Flow | PENDING → ACTIVE → SUSPENDED → CANCELLED / EXPIRED. Suspension can be triggered by overdue invoices (Phase 3). Reactivation on payment. Grace period configurable. | P0 | ⬜ |
| 55 | Subscriptions | Subscription in Customer 360 | Customer 360 page shows all active/past subscriptions: what service, which plan, billing cycle, status, next billing date, linked cloud resource (placeholder until Phase 12). | P1 | ⬜ |

---

## Phase 3 — Finance

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 56 | Invoices | Invoice CRUD | Create invoices manually or auto-generated from subscriptions. Line items, quantities, unit prices, tax, discounts. Links to customer, order, subscription. | P0 | ⬜ |
| 57 | Invoices | Invoice Auto-Generation | Recurring subscriptions trigger automatic invoice creation on each billing cycle date. System creates the invoice with correct line items and sends notification. | P0 | ⬜ |
| 58 | Invoices | Invoice Number & Sequence | Auto-generated invoice numbers following a configurable pattern (e.g., INV-2026-0001). Sequential, gap-free within a fiscal year. | P1 | ⬜ |
| 59 | Invoices | Invoice PDF Generation | Branded PDF: company logo, customer details, itemized table, payment terms, bank details, tax breakdown. Matches quotation PDF style. | P1 | ⬜ |
| 60 | Invoices | Invoice Status Flow | DRAFT → SENT → PARTIALLY_PAID → PAID → OVERDUE → VOID / CANCELLED. Overdue auto-calculated based on due date. Partially paid tracks amount remaining. | P0 | ⬜ |
| 61 | Invoices | Credit Notes | Issue a credit note against an invoice (full or partial). Reduces the customer's outstanding balance. Links to original invoice. For refunds, billing errors, goodwill. | P2 | ⬜ |
| 62 | Payments | Payment Recording | Record a payment against an invoice: amount, date, method (bank transfer/card/cash/cheque/online), reference number. Supports partial payments. Updates invoice status. | P0 | ⬜ |
| 63 | Payments | Payment Allocation | When a customer pays, allocate the amount across one or more outstanding invoices (oldest-first by default, or manual allocation). Handles overpayment as credit balance. | P1 | ⬜ |
| 64 | Payments | Payment History | Full payment history per customer: date, amount, method, linked invoice, who recorded it. Visible in Customer 360 and in a dedicated finance view. | P1 | ⬜ |
| 65 | Payments | Overdue Payment Alerts | System identifies invoices past due date and surfaces them: dashboard widget for finance, in-app notification, optional email to customer. Configurable reminder schedule. | P1 | ⬜ |
| 66 | Expenses | Expense Recording | Record business expenses: amount, date, category, vendor, project (optional), description, receipt upload. For tracking costs that affect profitability. | P1 | ⬜ |
| 67 | Expenses | Expense Categories | Admin-managed categories (Salaries, Hosting Costs, Software Licenses, Travel, Marketing, etc.). Used for grouping and reporting. | P1 | ⬜ |
| 68 | Vendors | Vendor CRUD | Manage vendor/supplier records: name, contact info, services provided, payment terms. Link expenses and purchases to vendors. | P1 | ⬜ |
| 69 | Vendors | Vendor Payment Tracking | Track what's owed to each vendor: outstanding purchase orders, upcoming payments, payment history. Separate from customer billing. | P2 | ⬜ |
| 70 | Purchasing | Purchase Order CRUD | Create purchase orders to vendors: items, quantities, prices, expected delivery. Status flow: DRAFT → SENT → RECEIVED → CLOSED. Links to vendor and project. | P2 | ⬜ |
| 71 | Assets | Asset Register | Track company assets (servers, hardware, software licenses): purchase date, cost, depreciation, assigned to (employee/project), warranty expiry. | P2 | ⬜ |

---

## Phase 4 — Projects & Delivery

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 72 | Projects | Project CRUD | Create projects linked to customer + order/subscription. Define: name, type (one-time/ongoing), start/end dates, budget, assigned PM. Tracks delivery of sold services. | P0 | ⬜ |
| 73 | Projects | Project Status Flow | PLANNING → IN_PROGRESS → ON_HOLD → COMPLETED / CANCELLED. Status changes logged. Completion triggers final invoicing check. | P0 | ⬜ |
| 74 | Projects | Project in Customer 360 | Customer 360 shows all active and completed projects: name, status, progress %, budget vs actual, assigned PM. Quick link to project detail page. | P1 | ⬜ |
| 75 | Milestones | Milestone CRUD | Define milestones within a project: name, target date, deliverables, payment trigger (if milestone billing). Ordered sequence. Completion tracked. | P1 | ⬜ |
| 76 | Tasks | Task CRUD | Create tasks within a project/milestone. Assign to team members. Priority, due date, estimated hours, status (TODO/IN_PROGRESS/REVIEW/DONE). The work unit for timesheets. | P0 | ⬜ |
| 77 | Tasks | Task Board (Kanban) | Visual Kanban board for project tasks. Drag between columns (TODO → IN_PROGRESS → REVIEW → DONE). Filter by assignee, priority. For daily team standups. | P1 | ⬜ |
| 78 | Tasks | My Tasks View | Personal task list for the logged-in user across all projects. Sorted by due date. Overdue highlighted. Quick status update. For individual productivity. | P1 | ⬜ |
| 79 | Timesheets | Time Entry | Log time spent on a task: date, hours, description. Links to employee (user) and task. Foundation for cost allocation and billing. | P0 | ⬜ |
| 80 | Timesheets | Timesheet Summary | Weekly/monthly view of time entries per user. Total hours by project/task. For payroll, capacity planning, and project cost calculation. | P1 | ⬜ |
| 81 | Timesheets | Employee Cost Rate | Set hourly cost rate per employee (or per role). Used to calculate internal labor cost for projects. Can vary by time period. | P1 | ⬜ |

---

## Phase 5 — Profitability & Reports

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 82 | Profitability | Customer Profitability | Revenue (invoices paid) minus costs (employee time at cost rate + direct expenses + vendor costs + allocated overheads) per customer. Shows which customers are profitable. | P0 | ⬜ |
| 83 | Profitability | Service Profitability | Revenue vs cost breakdown per service type (e.g., all WordPress projects vs all VPS subscriptions). Identifies which service lines make money. | P1 | ⬜ |
| 84 | Profitability | Project Profitability | Budget vs actual cost for each project. Actual = (employee hours × cost rate) + direct expenses + vendor costs. Margin calculated. Alerts if project is over budget. | P0 | ⬜ |
| 85 | Reports | Revenue Report | Total revenue by period (monthly/quarterly/yearly), by customer, by service type. Supports date range filters. Exportable to CSV/PDF. | P1 | ⬜ |
| 86 | Reports | Expense Report | Total expenses by period, by category, by vendor, by project. Supports date range filters. For financial review and tax preparation. | P1 | ⬜ |
| 87 | Reports | Sales Pipeline Report | Weighted pipeline value by stage, expected close dates, conversion rates, average deal size, sales cycle length. For sales forecasting. | P1 | ⬜ |
| 88 | Reports | Aging Report | Outstanding invoices grouped by age buckets (0-30, 31-60, 61-90, 90+ days). Per customer and total. Critical for cash flow management. | P1 | ⬜ |
| 89 | Reports | Team Performance | Activities logged, leads converted, deals won/lost, revenue generated — per salesperson. For sales management and incentive tracking. | P2 | ⬜ |
| 90 | Reports | Report Export | All reports exportable to CSV and PDF. Date range, grouping, and filter parameters preserved in export. Scheduled email delivery (future). | P2 | ⬜ |

---

## Phase 6 — Support

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 91 | Tickets | Ticket CRUD | Create support tickets: subject, description, category, priority, customer link. Assigned to support agent. For tracking customer issues and requests. | P0 | ⬜ |
| 92 | Tickets | Ticket Status Flow | OPEN → IN_PROGRESS → WAITING_ON_CUSTOMER → RESOLVED → CLOSED / REOPENED. Status transitions logged. Resolution time tracked. | P0 | ⬜ |
| 93 | Tickets | Ticket Comments & Thread | Internal and customer-visible comments on a ticket. Threaded conversation. Attachments supported. Internal notes not visible to customer (for future portal). | P1 | ⬜ |
| 94 | Tickets | Ticket Assignment & Escalation | Assign to agent, reassign, escalate to manager. Escalation can be manual or automatic (based on SLA breach). Assignment history logged. | P1 | ⬜ |
| 95 | Tickets | Ticket in Customer 360 | Customer 360 shows open/recent tickets: subject, status, priority, assigned agent. Quick link to ticket detail. Count of total tickets and average resolution time. | P1 | ⬜ |
| 96 | SLA | SLA Configuration | Define SLA policies: response time and resolution time targets per priority level (e.g., Urgent = 1hr response, 4hr resolution). Business hours vs 24/7. | P1 | ⬜ |
| 97 | SLA | SLA Breach Alerts | System monitors ticket age against SLA targets. Approaching breach triggers warning. Actual breach triggers alert to manager and escalation. | P2 | ⬜ |
| 98 | Knowledge Base | KB Article CRUD | Create internal knowledge base articles: title, content (rich text), category, tags. For support agents to find solutions quickly. | P2 | ⬜ |

---

## Phase 7 — Notifications & Automation

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 99 | Notifications | In-App Notification System | Real-time in-app notifications: new assignment, follow-up due, ticket update, invoice overdue. Bell icon with unread count. Mark as read. Stored in DB. | P0 | ⬜ |
| 100 | Notifications | Email Notification Engine | Sends transactional emails on key events: invoice sent, payment received, password reset, ticket update. Uses email templates. Configurable per event type. | P1 | ⬜ |
| 101 | Notifications | Notification Preferences | Per-user settings: which events trigger notifications (in-app, email, both, none). Respects user preferences before sending. | P2 | ⬜ |
| 102 | Automation | Follow-Up Reminder Automation | Automatically creates follow-up reminders: e.g., 'Follow up 3 days after quotation sent', 'Remind 7 days before contract expiry'. Configurable rules. | P1 | ⬜ |
| 103 | Automation | Lead Auto-Assignment Rules | Incoming leads auto-assigned based on rules: round-robin, by source, by industry, by geography. Reduces manual assignment work. | P2 | ⬜ |
| 104 | Automation | Overdue Invoice Escalation | Automated escalation: Day 1 past due = email reminder. Day 7 = second reminder + account manager notified. Day 30 = finance manager alert. Configurable per tenant. | P2 | ⬜ |

---

## Phase 8 — Dashboard

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 105 | Dashboard | Sales Dashboard | Pipeline value by stage (chart), deals won/lost this month, conversion rate, top opportunities by value. For sales managers. | P0 | ⬜ |
| 106 | Dashboard | Finance Dashboard | Revenue this month/quarter/year, outstanding receivables, overdue amount, recent payments, cash flow trend. For finance team. | P1 | ⬜ |
| 107 | Dashboard | Operations Dashboard | Active projects, overdue tasks, team utilization (hours logged vs capacity), upcoming milestones, resource allocation. For project managers. | P1 | ⬜ |
| 108 | Dashboard | Support Dashboard | Open tickets, avg resolution time, SLA compliance %, tickets by category/priority, agent workload. For support managers. | P1 | ⬜ |
| 109 | Dashboard | Executive Dashboard | Total revenue, total costs, gross margin, customer count, churn rate, top customers by revenue, profitability trend. For leadership. | P1 | ⬜ |
| 110 | Dashboard | My Dashboard (Personal) | Personal widgets: my leads, my follow-ups today, my tasks, my recent activities. Customizable layout. Default landing page after login. | P1 | ⬜ |

---

## Phase 9 — Settings (Advanced)

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 111 | RBAC UI | Role Management UI | Admin creates/edits roles, assigns granular permissions per module (leads.view, leads.create, leads.edit, leads.delete). UI for what was seeded in Phase 0. | P1 | ⬜ |
| 112 | RBAC UI | Permission Matrix View | Grid view: roles as columns, permissions as rows. Quick toggle to grant/revoke. Visual way to audit who can do what. | P1 | ⬜ |
| 113 | Custom Fields | Custom Field Configuration | Admin adds custom fields to any module (Lead, Customer, etc.): text, number, date, dropdown, checkbox. Fields appear in forms and are searchable/filterable. | P2 | ⬜ |
| 114 | Templates | Email Template Manager | Create/edit email templates with variables ({{customer_name}}, {{invoice_total}}). Used by notification engine. HTML editor with preview. | P2 | ⬜ |
| 115 | Templates | Document Template Manager | Templates for quotations, invoices, contracts — header/footer, layout, fields. Supports company branding (logo, colors, fonts). | P2 | ⬜ |
| 116 | Branding | White-Label Branding | Tenant can configure: logo, primary color, app title. Applied across the UI and generated PDFs. For multi-tenant SaaS readiness. | P2 | ⬜ |
| 117 | Import/Export | Bulk Import Module | Generic CSV import for any module: map columns to fields, validate, preview, import. Handles duplicates, errors. For initial data migration. | P2 | ⬜ |
| 118 | Import/Export | Bulk Export Module | Export any list/report to CSV or Excel. Respects current filters. Async for large datasets (generates file, notifies when ready). | P2 | ⬜ |

---

## Phase 10 — Search & Global UX

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 119 | Global Search | Cross-Module Search | Search bar that searches across leads, customers, companies, contacts, opportunities, tickets by name/email/code. Returns grouped results with entity type. | P1 | ⬜ |
| 120 | Global Search | Recent & Pinned Items | Quick access to recently viewed entities and user-pinned favorites. Saves time navigating to frequently-used records. | P2 | ⬜ |
| 121 | Views | Saved / Custom Views | Save filter combinations as named views (e.g., 'My Hot Leads', 'Overdue Invoices'). Personal and shared views. Load a view to instantly apply its filters. | P2 | ⬜ |
| 122 | Views | Column Customization | Users choose which columns appear in list views and their order. Saved per user per module. Different roles may want different columns visible. | P2 | ⬜ |
| 123 | UX | Keyboard Shortcuts | Power-user keyboard shortcuts: Ctrl+K for search, N for new record, arrow keys for navigation. Configurable. | P3 | ⬜ |
| 124 | UX | Breadcrumb Navigation | Contextual breadcrumbs showing the navigation path (Dashboard > Customers > ACME Corp > Project Alpha). Clickable for quick back-navigation. | P2 | ⬜ |

---

## Phase 11 — Cloud Foundation (V1 - Manual)

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 125 | Cloud Settings | Cloud Module Activation | Global toggle to enable the Cloud module in the UI. When off, all Cloud menu items and tabs are hidden. Lets CRM-only tenants ignore Cloud entirely. | P0 | ⬜ |
| 126 | Cloud Products | Cloud Product Catalog CRUD | Define the cloud products offered: Shared Hosting, WordPress Hosting, VPS. Each product has: name, description, category, default specs, available plans/tiers. | P0 | ⬜ |
| 127 | Cloud Products | Cloud Plan/Tier Configuration | For each cloud product, define tiers (e.g., VPS Basic: 2 CPU/4GB RAM/50GB SSD at $X/mo). Tiers contain resource limits and pricing used in CRM's Service Catalog. | P1 | ⬜ |
| 128 | Servers | Server Record CRUD | Manually add server records: hostname, IP, location, OS, specs (CPU/RAM/Disk), provider, purchase date, monthly cost. Foundation for tracking infrastructure. | P0 | ⬜ |
| 129 | Servers | Server Status & Notes | Set server status (Active/Maintenance/Decommissioned). Add operational notes. Track warranty/support contract expiry. | P1 | ⬜ |
| 130 | Servers | Server Pool Configuration | Group servers into pools (e.g., 'Shared Hosting Pool', 'VPS Pool India'). Track total vs used capacity per pool. Helps decide where to provision new resources. | P1 | ⬜ |
| 131 | VMs | VM Record CRUD | Manually register VM records: name, host server, specs allocated (vCPU/RAM/Disk), OS, IP, linked customer subscription. For tracking VMs that are created manually in Proxmox. | P0 | ⬜ |
| 132 | VMs | VM Status Management | Set VM status: PROVISIONING → ACTIVE → SUSPENDED → TERMINATED. Manual toggle. When suspended, ops marks it here; Customer 360 reflects the status. | P0 | ⬜ |
| 133 | Hosting | Hosting Account CRUD | Register shared/WordPress hosting accounts: linked server, account ID, website, disk used/quota, bandwidth used/quota, linked customer subscription. | P0 | ⬜ |
| 134 | Hosting | Hosting Status Management | Status: ACTIVE → SUSPENDED → TERMINATED. Manual control. Suspend = stop serving the site; terminate = remove the account after retention period. | P0 | ⬜ |
| 135 | Domains | Domain Record CRUD | Register domain records: domain name, registrar, registration/expiry dates, nameservers, linked customer, auto-renew flag. Tracks domain portfolio. | P1 | ⬜ |
| 136 | Domains | Domain Expiry Alerts | System flags domains expiring within 30/60/90 days. Appears in Cloud dashboard and generates notification. Prevents accidental expiry. | P1 | ⬜ |
| 137 | DNS | DNS Zone Viewer | View DNS records for a domain (A, CNAME, MX, TXT, etc.). Read-only display of manually-maintained records. For quick reference during support. | P2 | ⬜ |
| 138 | SSL | SSL Certificate Record | Track SSL certs: domain, issuer, issue/expiry dates, type (Let's Encrypt/Commercial), status. Linked to hosting account or domain. | P1 | ⬜ |
| 139 | SSL | SSL Expiry Alerts | Flags certificates expiring within 14/30 days. Notification to ops team. For preventing site security warnings. | P1 | ⬜ |
| 140 | Backups | Backup Record & Schedule | Record backup entries: resource backed up, date, size, storage location, retention period. Define expected backup schedule per resource. | P1 | ⬜ |
| 141 | Backups | Backup Compliance Check | Compare actual backup records against expected schedule. Flag missing backups (e.g., 'VPS-Alpha last backup 3 days ago, schedule is daily'). | P2 | ⬜ |
| 142 | Monitoring | Uptime Monitor Configuration | Configure URL/IP endpoints to monitor: check interval, alert threshold, notification recipients. Simple HTTP/ping checks. | P1 | ⬜ |
| 143 | Monitoring | Uptime Status Dashboard | Live dashboard showing monitored endpoints: status (Up/Down), response time, uptime % over 24h/7d/30d. Green/red indicators. | P1 | ⬜ |
| 144 | Monitoring | Downtime Incident Log | When a monitor detects downtime, auto-creates an incident record: start time, end time, duration, affected resource. For SLA reporting and post-mortems. | P2 | ⬜ |
| 145 | Cloud Dashboard | Cloud Operations Dashboard | Overview of all cloud resources: servers, VMs, hosting accounts, domains, SSL — with status counts, expiry warnings, recent changes. For ops team daily view. | P1 | ⬜ |
| 146 | Cloud Dashboard | Resource Capacity View | Server pool utilization: total CPU/RAM/Disk vs allocated vs available. Bar charts per pool. Helps plan capacity before running out. | P2 | ⬜ |
| 147 | Manual Actions | Manual Suspend/Reactivate | Ops can manually suspend (stop serving) or reactivate a VM/hosting account with one click. Records who did it and when. Status synced to CRM subscription. | P0 | ⬜ |
| 148 | Manual Actions | Manual Delete with Safeguards | Delete a cloud resource (VM/hosting) with confirmation, reason required, retention period before permanent removal. Prevents accidental destruction. | P1 | ⬜ |
| 149 | Cloud Settings | Cloud Notification Configuration | Configure which Cloud events (downtime, expiry, suspension) trigger notifications and to whom (ops, account manager, customer). Per event type. | P1 | ⬜ |
| 150 | Cloud Settings | Customer-Facing Status Labels | Map internal resource statuses to customer-friendly labels (e.g., internal 'SUSPENDED_PAYMENT' shown as 'Service Temporarily Paused' in portal). | P2 | ⬜ |
| 151 | Cloud Settings | Notification Rule Configuration | Lets Admin configure exactly who gets notified for which Cloud-side event (e.g., only infra team gets downtime alerts, both infra and account manager get suspension alerts). | P2 | ⬜ |
| 152 | Cloud Audit Log | Manual Action Log | Automatically records every manual create/suspend/reactivate/delete action in Cloud module — who did it and when — for accountability. | P1 | ⬜ |

---

## Phase 12 — CRM ↔ Cloud Mapping

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 153 | Resource Mapping | Link Subscription to Cloud Resource | Manual step: ops connects a CRM Customer Service/Subscription record to the matching Cloud resource record (VM/hosting), establishing the cross-reference. | P0 | ⬜ |
| 154 | Resource Mapping | Infrastructure Tab on Customer 360 | Activates the placeholder tab from Phase 1 — now showing actual linked Cloud resource(s), their status, and key details on the customer's CRM profile. | P0 | ⬜ |
| 155 | Resource Mapping | Manual Status Sync | Status change on either side (CRM subscription or Cloud resource) is reflected on the other, keeping both systems consistent (manual trigger). | P0 | ⬜ |

---

## Phase 13 — V2 Automation (Future)

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 156 | Infrastructure Adapter | Proxmox API Integration | Replaces manual Proxmox actions with API calls (create_vm, start_vm, stop_vm, snapshot, delete_vm). | P3 | ⬜ |
| 157 | Infrastructure Adapter | Generic Adapter Interface | Wraps provider-specific code behind a generic interface so adding AWS/other providers doesn't require rewriting business logic. | P3 | ⬜ |
| 158 | Provisioning Engine | Auto-Create VM/Hosting from Order | When hosting order approved + paid, system auto-calls Infrastructure Adapter to create VM/hosting. No manual step. | P3 | ⬜ |
| 159 | Provisioning Engine | Job Queue with Retry & Idempotency | Provisioning runs as background job (Queued → Running → Succeeded/Failed) with retry and idempotency key. | P3 | ⬜ |
| 160 | Automated Enforcement | Auto-Suspend on Overdue Policy | Invoice overdue past grace period → auto-suspend linked VM/hosting. Warning-then-suspend policy, never immediate cutoff. | P3 | ⬜ |
| 161 | Automated Enforcement | Auto-Reactivate on Payment | Overdue payment recorded → auto-reactivate suspended resource. | P3 | ⬜ |
| 162 | Automated Enforcement | Configurable Grace Period Rules | Different grace periods per service type or customer. | P3 | ⬜ |
| 163 | Reconciliation | CRM vs Cloud State Comparison | Periodic automated check comparing CRM subscription status vs Cloud resource actual state. | P3 | ⬜ |
| 164 | Reconciliation | Drift Alert & Repair | Mismatch found → auto-fix if obvious, or alert human if ambiguous. | P3 | ⬜ |

---

## Phase 14 — Customer Portal (Future)

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 165 | Customer Portal | View Services & Billing | Self-service login for customers to see services, invoices, payment status. | P3 | ⬜ |
| 166 | Customer Portal | View Hosting/VM/Domain/SSL Status | Customers see live status of their own resources without contacting support. | P3 | ⬜ |
| 167 | Customer Portal | Raise Support Tickets | Customers create and track tickets through portal instead of email. | P3 | ⬜ |
| 168 | Customer Portal | Profile & Security | Customers manage own contact details and login/password/security settings. | P3 | ⬜ |

---

## Phase 15 — SaaS Readiness (Future)

| # | Module | Feature | Description | Priority | Status |
|---|---|---|---|---|---|
| 169 | Multi-Tenant & Public API | Tenant Onboarding Flow | Self-service signup for other agencies to create isolated accounts. | P3 | ⬜ |
| 170 | Multi-Tenant & Public API | Plan Limits & Billing Isolation | Usage limits per tenant, separate billing. | P3 | ⬜ |
| 171 | Multi-Tenant & Public API | Public API | Documented, versioned external API for integrations. | P3 | ⬜ |
| 172 | Multi-Tenant & Public API | White-Label / Branding Config | Per-tenant logo, colors, domain customization. | P3 | ⬜ |

---

## How to use this sheet

Tell the AI any of these:
- **By number**: "Implement item #44" (Quotation CRUD)
- **By phase**: "Let's start Phase 2"
- **By feature name**: "Build the Service Catalog"
- **By priority**: "Do all P0 items in Phase 3"

The AI will check the architecture docs, current code, and this sheet to create an implementation plan.

---
Last updated: 2026-08-18 | Extracted from CostTracking_Work_Tracking_Sheet (2).xlsx
