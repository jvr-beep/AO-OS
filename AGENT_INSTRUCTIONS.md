# AO OS Agent Instructions

## Purpose
This repository contains the backend foundation for AO OS, the operating system for AO Sanctuary.

The immediate goal is to build minimal, working backend modules in a safe sequence.

---

## General Rules
- Keep changes minimal and compilable.
- Prefer small vertical slices over large speculative builds.
- Do not widen scope unless explicitly asked.
- Follow existing NestJS project structure already used in this repo.
- Match patterns used in:
  - `members`
  - `membership-plans`
  - `subscriptions`

---

## Architecture Rules
- Use NestJS module/controller/service structure.
- Use Prisma for data access.
- Use `PrismaService` instead of raw database code.
- Keep DTOs simple unless validation is explicitly requested.
- Use plain response DTOs when the project already uses them.
- Prefer explicit imports and minimal abstractions.
- Do not introduce new frameworks or major dependencies without approval.

---

## Prisma Rules
- Do not edit `schema.prisma` unless explicitly requested.
- Do not create or modify migrations unless explicitly requested.
- Assume existing Prisma models are the source of truth.
- If a requested endpoint can be built from the current schema, do that first.
- If schema changes seem necessary, explain why before editing.

---

## API Build Rules
- Build one module at a time.
- For each module, start with only the minimal endpoints needed.
- Do not add optional routes unless explicitly requested.
- Do not add OpenAPI/Swagger decorators unless explicitly requested.
- Do not add e2e tests unless explicitly requested.
- Do not add class-validator unless explicitly requested.
- Do not add PUT/DELETE endpoints unless explicitly requested.

---

## Preferred Workflow
1. Inspect existing project structure.
2. List files to be created or edited.
3. Wait for approval before large changes.
4. Implement the smallest compilable version.
5. Verify imports and module wiring.
6. Stop after the requested slice is complete.

---

## File and Module Conventions
When creating a new module, prefer this structure:

- `module-name.module.ts`
- `controllers/module-name.controller.ts`
- `services/module-name.service.ts`
- `dto/create-module-name.dto.ts`
- `dto/module-name.response.dto.ts`

Only add extra DTOs when needed.

---

## app.module.ts Rules
- Update `app.module.ts` only when necessary to register a new module.
- Use the same import style already present in the repo.
- Do not refactor unrelated imports or formatting.

---

## Coding Style
- Keep code readable and conservative.
- Prefer straightforward logic over clever abstractions.
- Keep methods short.
- Avoid speculative helper utilities.
- Match existing naming conventions in the repo.

---

## Testing and Verification
- Primary verification method is local compile + Postman request testing.
- Do not add test suites unless explicitly requested.
- Do not mark work complete if imports or module wiring are broken.

---

## Current Priority Order
1. Wristbands
2. Access Attempts
3. Visit Sessions
4. Presence Events
5. Access-control business logic refinement

---

## Current Base API
Base URL for local testing:
`http://localhost:4000`

Current health endpoint:
`GET /v1/health`

---

## Instructions for Agent Responses
When asked to build something:
- first state what files will be created or edited
- keep the change set narrow
- call out any compile risks before editing
- do not silently change unrelated files

When asked to review something:
- focus on compile errors
- import mismatches
- incorrect Prisma usage
- module wiring errors
- endpoint naming consistency

---

## What Not To Do
- Do not redesign the architecture unless asked.
- Do not introduce authentication flows yet unless asked.
- Do not add frontend code.
- Do not add deployment configuration unless asked.
- Do not add extra database tables without approval.
- Do not convert working code into a more abstract pattern unless asked.

---

## Definition of Done
A task is done when:
- code compiles
- module wiring is correct
- endpoint paths match expectations
- Postman can exercise the new endpoint successfully
- no unrelated files were changed without reason

---

## Toolchain Integration

AO OS is the **source of truth and orchestration layer** for all connected tools.

### Tool Roles
| Tool | Role |
|------|------|
| **AO OS (this repo)** | Source of truth — all contracts, instructions, and state live here |
| **GitHub** | Code, issues, PRs, release history — CI enforces the contract |
| **VS Code** | Implementation surface — use `.vscode/tasks.json` for local workflow |
| **Swagger/OpenAPI** | Contract surface — `openapi/ao-os.openapi.yaml` is updated with every new endpoint |
| **Postman** | Verification surface — collections in `postman/collections/` verify the contract |
| **Notion** | Decisions, product context, vendor requirements, rollout plans |
| **Gmail** | External communication only — action items must be logged as GitHub Issues |
| **ChatGPT** | Planning, spec drafting, implementation guidance, verification prompts |

### Contract-First Rule
When adding a new endpoint:
1. Update `openapi/ao-os.openapi.yaml` first
2. Implement the endpoint to match the spec
3. Add or update the Postman collection to verify it
4. Commit everything in the same PR

### Full toolchain documentation: `docs/TOOLCHAIN.md`
