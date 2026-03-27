# AO OS Project Status

## Project
AO OS is the operating system for AO Sanctuary.

The current goal is to build the backend foundation for:
- member identity
- membership plans
- subscriptions
- wristband assignment
- access logic
- visit/session tracking

This project is being built locally first using:
- NestJS
- Prisma
- PostgreSQL
- pnpm
- Postman
- VS Code

---

## Current Local Environment
- API base URL: `http://localhost:4000`
- Health endpoint: `GET /v1/health`
- Postman collection: `AO OS API`
- Repo: `AO-OS`

---

## Current Working Modules
- Health
- Members
- Membership Plans
- Subscriptions
- Wristbands

---

## Current Working Endpoints

### Health
- `GET /v1/health`

### Members
- `POST /v1/members`
- `GET /v1/members/:id`

### Membership Plans
- `POST /v1/membership-plans`
- `GET /v1/membership-plans`

### Subscriptions
- `POST /v1/subscriptions`
- `GET /v1/members/:id/subscriptions`

### Wristbands
- `POST /v1/wristbands`
- `GET /v1/wristbands`
- `POST /v1/wristbands/assign`
- `POST /v1/wristbands/unassign`

---

## Current Database State
Prisma schema and migrations are active.

The schema currently includes core models for:
- members
- member profiles
- auth identities
- membership plans
- subscriptions
- payment methods
- locations
- wristbands
- wristband assignments
- access zones
- access points
- access attempts
- member access grants
- member access overrides
- visit sessions
- presence events
- bookings

---

## Known Test Data

### Member
- memberId: `5d211c05-b810-4f4b-aad4-ad465e60a5df`
- email: `test1@aosanctuary.com`

### Membership Plan
- membershipPlanId: `5a360f2a-39f5-4d6c-802f-df369fdbc1f2`
- code: `AO_ESSENTIAL`

### Subscription
- example subscriptionId: `e5b1438b-08f5-40df-92a2-e81aab6038ff`

### Wristbands
- no confirmed test wristband persisted yet at the time of this document
- use API to create first wristband record before assign/unassign verification

---

## Current Development Rules
- keep changes minimal and compilable
- prefer one module at a time
- follow existing patterns in `members`, `membership-plans`, and `subscriptions`
- do not expand scope unless explicitly approved
- test every new endpoint in Postman before moving on
- commit after each working slice

---

## Next Priority
Build the next operational layer after wristbands:

### Access Attempts
Goal:
- represent a wristband/member attempting entry at an access point
- record allow / deny / error decisions
- capture denial reason codes
- create the first real access-control flow

Suggested endpoints:
- `POST /v1/access-attempts`
- `GET /v1/access-attempts`
- `GET /v1/members/:id/access-attempts`

---

## Suggested Build Sequence
1. Verify wristband create/list/assign/unassign flow
2. Build access attempts module
3. Build visit session check-in / check-out
4. Build presence event tracking
5. Add stronger validation and business rules
6. Add OpenAPI/docs later
7. Add tests later

---

## Current Tooling
### Required
- VS Code
- Postman desktop
- PowerShell
- GitHub
- PostgreSQL
- Prisma

### Installed / In Use
- VS Code
- Postman desktop
- GitHub repo
- local NestJS API
- Prisma migrations

---

## Notes
This repo is the source of truth.

Use:
- VS Code agent for code generation and edits
- Postman for endpoint verification
- GitHub for commits and checkpoints
- ChatGPT for architecture, sequencing, debugging, and prompt drafting

---

## Toolchain Integration Status

All tools are connected through this repository as the orchestration layer.

| Tool | Integration | Status |
|------|-------------|--------|
| **GitHub** | CI workflows in `.github/workflows/` | Active |
| **VS Code** | Tasks in `.vscode/tasks.json`, extensions in `.vscode/extensions.json` | Active |
| **Swagger/OpenAPI** | `openapi/ao-os.openapi.yaml` — all endpoints documented | Active |
| **Postman** | Collections in `postman/collections/`, synced via `.postman/resources.yaml` | Active |
| **Notion** | Upstream for product decisions → GitHub Issues → code | Manual |
| **Gmail** | External communication only → action items logged as Issues | Manual |
| **ChatGPT** | Planning and spec drafting → outputs committed to repo | Manual |

### CI Workflows
- `locker-credential-smoke.yml` — locker/credential smoke test (manual dispatch)
- `openapi-validate.yml` — OpenAPI spec lint on push/PR to `openapi/`
- `postman-regression.yml` — Newman regression against all collections (manual dispatch)

### Full toolchain documentation: `docs/TOOLCHAIN.md`
