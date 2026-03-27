# AO OS Toolchain Integration

## Overview

AO OS acts as the **source of truth and orchestration layer** for all connected tools. Every decision, contract, and verification trace back to this repository.

```
┌─────────────────────────────────────────────────────────────┐
│                      AO OS (GitHub Repo)                     │
│                   Source of Truth / Orchestration            │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  GitHub  │  VS Code │ Swagger  │  Postman │  Notion/ChatGPT │
│  CI/CD   │   Impl.  │ Contract │  Verify  │  Context/Plan   │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
```

---

## Tool Roles

### AO OS (this repository)
**Role:** Source of truth and orchestration layer

- All API contracts live in `openapi/ao-os.openapi.yaml`
- All regression specs live in `postman/collections/`
- All CI workflows live in `.github/workflows/`
- All agent instructions live in `AGENT_INSTRUCTIONS.md`
- All project state lives in `PROJECT_STATUS.md`

### GitHub
**Role:** Code, issues, PRs, release history

- Code changes flow through pull requests
- GitHub Actions runs the full verification pipeline on every PR and merge:
  - OpenAPI spec validation (`openapi-validate.yml`)
  - Locker/credential smoke tests (`locker-credential-smoke.yml`)
  - Postman regression (`postman-regression.yml`)
- Issues track feature requests, bugs, and vendor requirements
- Releases mark stable checkpoints

**Integration point:** `.github/workflows/`

### VS Code
**Role:** Implementation surface

- Tasks in `.vscode/tasks.json` run the full local dev workflow (API start, migrations, smoke tests)
- Recommended extensions in `.vscode/extensions.json` enforce toolchain consistency
- The Prisma extension is pinned to v6 (see `.vscode/settings.json`)

**Integration point:** `.vscode/`

### Swagger / OpenAPI
**Role:** Contract surface

- The canonical API contract is `openapi/ao-os.openapi.yaml`
- Postman syncs from this spec via `.postman/resources.yaml`
- The OpenAPI spec is linted on every PR via `openapi-validate.yml`
- New endpoints must be added to the spec before or alongside code

**Integration point:** `openapi/ao-os.openapi.yaml`, `.postman/resources.yaml`

### Postman
**Role:** Verification and smoke/regression surface

- Collections in `postman/collections/` cover all major flows
- Scenario matrices in `postman/specs/` document expected behavior
- Newman runs Postman collections in CI via `postman-regression.yml`
- Postman Desktop syncs with the workspace via `.postman/resources.yaml`

**Integration point:** `postman/collections/`, `.postman/resources.yaml`

### Notion
**Role:** Decisions, product context, vendor requirements, rollout plans

- Product decisions and vendor requirements documented in Notion are translated into:
  - GitHub Issues (implementation backlog)
  - `AGENT_INSTRUCTIONS.md` (coding rules)
  - `PROJECT_STATUS.md` (current state)
  - `openapi/ao-os.openapi.yaml` (API contract changes)
- Notion is the upstream for "why" — GitHub is the downstream for "what and how"

**Integration point:** Notion items → GitHub Issues → code

### Gmail
**Role:** External communication only

- Vendor agreements, external partner coordination, and compliance notifications arrive via Gmail
- Action items from Gmail are logged as GitHub Issues or Notion entries before implementation
- No implementation details should originate directly from email threads

**Integration point:** Gmail → Notion or GitHub Issue → AO OS repo

### ChatGPT
**Role:** Planning, spec drafting, implementation guidance, verification prompts

- Used for architecture review, spec drafting, debugging, and Postman prompt generation
- Outputs are reviewed and committed to the repo (as agent instructions, OpenAPI updates, or Postman scripts)
- ChatGPT is never the source of truth — all outputs must be reviewed and committed here

**Integration point:** ChatGPT output → `AGENT_INSTRUCTIONS.md`, `openapi/`, `postman/specs/`

---

## Workflow Diagrams

### Feature Development Workflow

```
Notion (product context)
  │
  ▼
GitHub Issue (implementation ticket)
  │
  ▼
ChatGPT (spec draft, implementation guidance)
  │
  ▼
VS Code (implementation, using tasks.json for local dev)
  │
  ▼
openapi/ao-os.openapi.yaml (contract updated)
  │
  ▼
postman/collections/ (verification collection updated)
  │
  ▼
GitHub PR (code review, CI validation)
  ├── openapi-validate.yml (contract lint)
  ├── postman-regression.yml (regression verification)
  └── locker-credential-smoke.yml (smoke test, manual)
  │
  ▼
GitHub Release (checkpoint)
```

### CI/CD Pipeline

```
git push / PR opened
  │
  ├── openapi-validate.yml
  │     └── Lint openapi/ao-os.openapi.yaml with Spectral
  │
  └── postman-regression.yml
        ├── Spin up PostgreSQL
        ├── Apply Prisma migrations
        ├── Seed base data
        ├── Build and start API
        └── Run Newman against postman/collections/
```

### Contract-First Endpoint Workflow

```
1. Update openapi/ao-os.openapi.yaml  ← define the contract first
2. openapi-validate.yml passes        ← CI confirms spec is valid
3. Implement the endpoint in VS Code  ← code matches the contract
4. Add/update Postman collection      ← verify the implementation
5. postman-regression.yml passes      ← CI confirms implementation
6. Merge PR                           ← GitHub records the change
```

---

## Local Developer Workflow

Use VS Code Tasks (`Ctrl+Shift+P` → `Tasks: Run Task`):

| Task | Description |
|------|-------------|
| `Start API` | Start the NestJS API on port 4000 |
| `Prisma: Generate` | Regenerate the Prisma client |
| `Prisma: Migrate Dev` | Apply pending migrations locally |
| `Prisma: Migrate Deploy` | Deploy migrations (CI-safe) |
| `Smoke: Locker Policy` | Run the locker-policy smoke harness |
| `Typecheck` | Run TypeScript type checking |

---

## Secrets and Environment Variables

| Variable | Used By | Source |
|----------|---------|--------|
| `AUTH_SEED_ADMIN_PASSWORD` | CI workflows | GitHub Secrets |
| `DATABASE_URL` | API, Prisma | `.env` (local), GitHub Secrets (CI) |
| `AUTH_JWT_SECRET` | API | `.env` (local), GitHub Secrets (CI) |
| `AUTH_SEED_ADMIN_EMAIL` | CI workflows | GitHub Secrets or workflow env |
| `AO_SMOKE_BASE_URL` | Smoke harness | Optional override |
| `AO_SMOKE_LOCATION_ID` | Smoke harness | Optional override |

---

## File Map

```
AO-OS/
├── .github/workflows/
│   ├── openapi-validate.yml          ← Swagger/OpenAPI CI gate
│   ├── postman-regression.yml        ← Postman CI gate
│   └── locker-credential-smoke.yml   ← Smoke test (manual dispatch)
├── .postman/
│   └── resources.yaml                ← Postman ↔ OpenAPI sync config
├── .vscode/
│   ├── settings.json                 ← VS Code settings (Prisma pin)
│   ├── tasks.json                    ← VS Code dev workflow tasks
│   └── extensions.json               ← Recommended extensions
├── openapi/
│   └── ao-os.openapi.yaml            ← Swagger/OpenAPI contract (source of truth)
├── postman/
│   ├── collections/                  ← Postman regression collections
│   └── specs/                        ← Scenario matrices and verification guides
├── docs/
│   ├── TOOLCHAIN.md                  ← This file
│   └── STATE_TRANSITIONS.md          ← Access-control state machine
├── AGENT_INSTRUCTIONS.md             ← Coding agent rules
└── PROJECT_STATUS.md                 ← Current project state
```
