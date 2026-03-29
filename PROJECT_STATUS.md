# AO OS Project Status

## Project
AO OS is the operating system for AO Sanctuary.

This project is built locally using:
- NestJS + Prisma + PostgreSQL
- pnpm monorepo
- Postman + n8n + Notion
- VS Code

---

## Current Local Environment
- API base URL: `http://localhost:4000`
- Health endpoint: `GET /v1/health`
- Postman collection: `AO OS API`
- Repo: `AO-OS`

---

## Completed Modules

### Core / Auth
- Health
- Auth (JWT login, RBAC guards)
- Staff Users
- Staff Audit

### Member Domain
- Members
- Membership Plans
- Subscriptions
- Wristbands
- Wristband Transactions
- Member Account (ledger)

### Access & Presence
- Access Attempts
- Access Control (zones, points, grants, overrides)
- Presence Events

### Facilities
- Rooms
- Floor Plans
- Room Bookings
- Cleaning Tasks
- Lockers (policy engine)

### Guest / Visit Domain *(Sprint 2)*
- Guests
- Waivers
- Catalog (resource tiers)
- Inventory (resources, holds, assignment)
- Guest Bookings
- Visits (status history)
- Folios (line items, payments)
- Orchestrators (walk-in check-in, booking check-in, checkout — with optimistic locking)
- Guest Access (permissions, access events, auto-exception on denied)
- Ops (snapshot, system exceptions CRUD)

### Automation
- Events Polling (n8n, Notion append, Gmail critical alert — v2.14.0)
- Auth Health Check (n8n, Notion log — v2.13.3)

---

## Current Working Endpoints (selected)

### Health
- `GET /v1/health`

### Auth
- `POST /v1/auth/login`

### Orchestrators
- `POST /v1/orchestrators/check-in/booking`
- `POST /v1/orchestrators/check-in/walk-in`
- `POST /v1/orchestrators/checkout`

### Guest Access
- `POST /v1/guest-access/permissions`
- `POST /v1/guest-access/permissions/:id/revoke`
- `GET /v1/guest-access/visits/:visitId/permissions`
- `POST /v1/guest-access/events`
- `GET /v1/guest-access/visits/:visitId/events`

### Ops
- `GET /v1/ops/snapshot`
- `GET /v1/ops/exceptions`
- `POST /v1/ops/exceptions`
- `PATCH /v1/ops/exceptions/:id/status`

### Events Polling
- `GET /v1/events/poll`

---

## Current Database State
Prisma schema and migrations are active. All domains seeded.

Event polling cursors track: LockerAccessEvent, LockerPolicyDecisionEvent, AccessAttempt, PresenceEvent, RoomAccessEvent, StaffAuditEvent, CleaningTask, RoomBooking, GuestAccessEvent, SystemException.

---

## OpenAPI
Full spec at `openapi/ao-os.openapi.yaml` — 38 endpoints across 10 tag groups.

---

## Integration Tests
- `apps/api/test/integration/auth-rbac.int-spec.ts`
- `apps/api/test/integration/access-presence-protections.int-spec.ts`
- `apps/api/test/integration/guest-visit-orchestration.int-spec.ts` *(Sprint 2)*

Run: `pnpm --filter api test:int`

---

## n8n Workflows
| File | Version | Status |
|---|---|---|
| `AO_OS_Auth_Healthcheck_v2.13.3_n8n-cloud.json` | v2.13.3 | Complete — fill in Notion credential placeholders to deploy |
| `AO_OS_Events_Polling_v2.14.0_dynamic-jwt.json` | v2.14.0 | Complete — fill in Gmail + Notion credential IDs to deploy |

**Required env vars for events polling:** `AO_OS_API_BASE`, `AO_OS_N8N_EMAIL`, `AO_OS_N8N_PASSWORD`, `NOTION_OPERATIONAL_LOG_DB_ID`, `NOTION_API_KEY`, `AO_OS_ALERT_EMAIL`

---

## Current Development Rules
- Keep changes minimal and compilable
- Follow existing module patterns
- Test new endpoints in Postman before moving on
- Run `pnpm --filter api build` to verify before committing
- Run `pnpm --filter api test:int` for integration test verification

---

## Current Tooling
### Required
- VS Code + GitHub Copilot
- Postman desktop
- PowerShell
- GitHub
- PostgreSQL + Prisma
- n8n Cloud
- Notion

---

## Notes
This repo is the source of truth.

Use:
- VS Code agent for code generation and edits
- Postman for endpoint verification
- GitHub for commits and checkpoints

