# AO-OS — Claude Code Context

This file is read automatically at the start of every Claude Code session.
It is the authoritative source of project context, policies, and conventions.
Keep it current. Policy changes in Google Drive sync here via n8n (see `docs/n8n/drive-policy-sync.md`).

---

## What This Project Is

AO-OS is the operational tech backbone of **Alpha Omega (ΑΩ) Sanctuary** — a luxury thermal wellness facility. It manages members, guests, zones, bookings, lockers, wristbands, access control, facility maps, and agentic ops.

**Owner:** Jason van Ravenswaay (`jvr@aosanctuary.com`)  
**First location:** AO Toronto (code: `AO_TORONTO`)  
**Structure:** Suriname NV parent company + Canada OpCo  

---

## Stack

| Layer | Tech |
|---|---|
| API | NestJS (TypeScript), running on port 4000 |
| Web | Next.js 14 App Router (TypeScript), running on port 3000 |
| Database | PostgreSQL via Prisma 6 + Prisma Accelerate, Cloud SQL on GCP |
| Auth | JWT (`JwtAuthGuard` + `RolesGuard`), staff roles: `front_desk`, `operations`, `admin` |
| Payments | Stripe (subscriptions + guest day pass PaymentIntents) |
| Voice | ElevenLabs — Lane 1: Daniel voice (ops alerts), Lane 2: George voice (ritual coach) |
| Monitoring | Datadog APM (`dd-trace@5`) + Browser RUM (`@datadog/browser-rum@5`), site `us5.datadoghq.com` |
| Automation | n8n Cloud — self-healing pipeline, Slack agent, Google Drive policy sync |
| AI | OpenAI GPT-4o via n8n LangChain (self-heal agent, Slack bot) |
| Infra | GCP VM (Docker Compose), GitHub Actions CI/CD |

---

## Repo Structure

```
apps/
  api/          NestJS API — src/ has one module per domain
  web/          Next.js — app/(protected)/ for staff, app/member/ for members, app/kiosk/ for kiosk
prisma/
  schema.prisma
  migrations/
docs/
  architecture/ Technical architecture memos
  policy/       Operational and product policies (synced from Google Drive)
  n8n/          n8n workflow documentation
CLAUDE.md       ← you are here
```

---

## Multi-tenancy

Every request carries `X-AO-Location` header → `LocationMiddleware` → `LocationContextService` (request-scoped).

- Services access location via `locationContext.locationOrNull?.id`
- All location-aware queries filter by `locationId`
- `LocationModule` must be imported in any feature module that needs location context

---

## Key Patterns

**NestJS service pattern:**
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly locationContext: LocationContextService,
) {}
```

**Prisma schema conventions:** `@@map("snake_case")`, `@db.Timestamptz(6)`, `@db.Decimal(10,2)` for coordinates/money, `@@index`, `@@unique`

**Auth guards on staff routes:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("front_desk", "operations", "admin")
```

**CSS classes:** `card`, `btn-primary`, `form-input`, `text-text-muted`, `text-accent-primary` — see `docs/ui-style-guide.md` for full token map. Accent color: `#2F8F83` (Electrum Teal). Use sparingly.

---

## Privacy & Display Name Policy ⚠️

**This is a product rule, not a UI preference.**

**Legal name (`firstName`, `lastName`) must never appear on staff-facing operational surfaces by default.**

Use `resolveDisplayName()` from `apps/api/src/members/utils/member-display.ts`:
```
alias  →  preferredName (MemberProfile)  →  displayName  →  "Member …{last 6 of number}"
```

- Staff surfaces: always use `staffSafeDisplayName` from `MemberResponseDto`
- Legal name access: `GET /members/:id/legal-identity` — `admin` role only, audit logged
- Exception paths (where legal name is valid): waivers, payments/Stripe, fraud review, identity verification, incident documentation
- `Guest` model (non-member day visitors) uses `firstName`/`lastName` directly — that's intentional for waiver binding

Full policy: `docs/policy/privacy-display-names.md`

---

## Map Studio

Native facility intelligence module — SVG floor maps with live operational overlays.

- Models: `MapFloor` → `MapFloorVersion` → `MapObject`
- Live state: rooms (booking status, occupant alias, time remaining), lockers (full status map), incidents (pulse red)
- Staff UI: `/map-studio` (floor list) → `/map-studio/[floorId]` (viewer + authoring panel)
- Authoring panel (ops/admin only): Upload SVG, Version History, Objects editor
- Rollback: any published version restorable as new draft

Phases shipped: 1 (data model + viewer), 2 (authoring), 3 (live overlays)  
Next: Phase 4 (AI-assisted authoring + n8n approval flows)

Full doc: `docs/architecture/map-studio.md`

---

## Staff Roles

| Role | Access |
|---|---|
| `front_desk` | Read most operational data, check-in/out |
| `operations` | Full facility ops, map authoring, publish SVG versions |
| `admin` | Everything + legal identity access + staff management |

---

## Self-Healing Pipeline

GitHub Actions → N8N → GPT-4o → auto-fix PR or Slack alert  
Webhook Event Processor live. Slack agent: n8n workflow `dyPXlybjKmTbadn4`.

---

## Brand & Identity

- Brand name: **Alpha Omega** / **AO** / **ΑΩ** — luxury thermal wellness sanctuary
- Tone: Assured, unhurried, composed. Never promotional, never performative.
- No exclamation points in operational or staff copy. Sentences end with periods.
- Staff interfaces are functional. Member-facing copy is warm but never over-promises.

**Color tokens:**

| Token | Hex | Use |
| --- | --- | --- |
| `accent-primary` | `#2F8F83` | Electrum Teal — beacon color, use sparingly |
| `surface-0` | `#0B0E11` | Obsidian — primary background |
| `surface-1` | `#0F1620` | Deep Navy Stone — cards, alternate bg |
| `surface-2` | `#1C222B` | Bronzed Charcoal — elevated surfaces |
| `text-primary` | `#EDE9E3` | Warm Ivory — primary body text |

**Facility zones (AO Toronto):**

| Code | Name | Type |
| --- | --- | --- |
| `ALPHA` | Alpha Zone | Entry / arrival |
| `OMEGA` | Omega Zone | Rest / departure |
| `LABYRINTH` | Labyrinth | Transition corridors |
| `BROTHERHOOD_HALL` | Brotherhood Hall | Social lounge |
| `SANCTUARY` | Sanctuary | Quiet room |
| `CALDARIUM` | Caldarium | Primary heat |
| `THERMARIUM` | Thermarium | Secondary heat |
| `FRIGIDARIUM` | Frigidarium | Cold contrast pool |

Full doc: `docs/policy/brand-identity.md`

---

## Member Experience

**Core principle:** Discretion, unhurried presence, nothing asked of members that isn't necessary.

**Visit modes:**

| Mode | Experience |
|---|---|
| `restore` | Thermal circuit focus — heat, cold contrast, rest |
| `release` | Private room + thermal circuit |
| `retreat` | Longest arc — room + full circuit + lounge |

Ritual guidance (ElevenLabs Lane 2, George voice): `opening` → `mid` → `deep` → `closing`

**Staff interaction rules:**

- Greet by alias / preferred name — never legal name
- Do not ask members about their visit mode
- Check-in is confirmation of arrival, not interrogation
- Session-expiry alerts go to staff only — never announced to member in public

**Wristbands:** Must be assigned before any access. Lost wristband → void + reissue, no fee first occurrence.  
**Lockers:** Assigned at check-in. Premium lockers are Tier-gated. Day-use releases on check-out.  
**Member status:** `pending` → `active` → `suspended` → `cancelled`. Suspended cannot be overridden without admin approval.

Full doc: `docs/policy/member-experience.md`

---

## Active Policies (synced from Google Drive via n8n)

| Policy | File |
|---|---|
| Privacy & Display Names | `docs/policy/privacy-display-names.md` |
| Brand & Identity | `docs/policy/brand-identity.md` |
| Member Experience | `docs/policy/member-experience.md` |

Policy files are auto-synced from AO Google Drive (`AO Corp/Brand/Policy` folder) via n8n workflow `kG5zqJn3INv8yFgw`.  
Do not edit policy files directly in the repo — edit in Drive, sync will propagate.

---

## Do Not

- Expose `firstName`/`lastName` on any operational surface without going through `resolveDisplayName()`
- Commit `.env` or secrets
- Skip `JwtAuthGuard` on staff routes
- Use `git add -A` if there are untracked `.env` or credential files present
- Add `firstName`/`lastName` to new staff-facing DTOs — use `staffSafeDisplayName`
