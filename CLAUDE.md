# AO OS — Claude Context

This repository powers **AO OS**, the operational software infrastructure for AO, a luxury men's
bathhouse, health spa, and fitness club based in Toronto.

## What this system does

AO OS manages the full operational stack for the venue:

- **RFID wristband access control** — member check-in, locker assignment, zone access gating
- **Member profile management** — tiers, visit history, billing relationships
- **Resource booking** — rooms, lockers, treatment appointments
- **Visit session tracking** — active session state, duration, spend
- **Payments and billing** — membership dues, day passes, add-ons
- **Audit logging** — all access events, staff actions, mutations
- **Reporting and analytics** — utilization, revenue, session data

## Staff roles

When reviewing code or proposing changes, be aware of these roles and their permission boundaries:

- **Front desk** — check-in, wristband issuance, locker assignment, payment collection
- **Floor ops** — zone monitoring, locker override, incident logging
- **Cleaner** — locker availability updates only
- **Manager** — full operational view, reporting, override capabilities
- **Admin** — system configuration, member management, role assignment

## API conventions

- All endpoints are RESTful under `/api/v1/`
- Auth uses short-lived JWT tokens; wristband RFID events use signed webhook payloads
- Member IDs are UUIDs; locker IDs are `LOC-{zone}-{number}` format
- Timestamps are ISO 8601 UTC throughout
- Mutations require idempotency keys on POST/PATCH
- Error responses follow `{ error: { code, message, detail } }` structure

## Engineering constraints

- Never propose changes to migration files — schema changes require manual DBA review
- Never modify `.env` files or any credential material
- Never touch `infra/` or `terraform/` — infrastructure changes are out of scope for automated fixes
- RFID and access control logic in `src/access/` is security-sensitive — flag findings, never auto-patch
- Billing and payment logic in `src/billing/` requires human review regardless of risk level

## Code review priorities

When analyzing PRs or running audits, prioritize findings in this order:

1. Security issues — auth bypasses, over-broad permissions, exposed secrets
2. Access control correctness — role boundary violations, missing guards
3. Data integrity — missing idempotency, unsafe mutations, audit log gaps
4. CI/workflow hygiene — unpinned actions, missing timeouts, fragile shell
5. Documentation — runbook gaps, missing inline comments on complex logic

## Tone and output

- Be direct and specific — name the file, line, and exact issue
- Proposed changes must be minimal and reviewable
- Never propose speculative refactors — only fix what is clearly wrong
- All AI-generated PRs require human approval before merge
