# AO-OS stack context (load only when auditing AO-OS)

Known topology of AO-OS as of the skill's authoring. Treat as hints — verify freshly during discovery. The system evolves week-to-week.

## Repository layout

Primary local paths (Windows):
- `C:\Users\Jason van Ravenswaay\AO-OS` — main repo (this skill lives here at `docs/skills/architecture-audit/`)
- `C:\Users\Jason van Ravenswaay\AO-OS-auth-hardening` — auth-hardening branch/fork
- `C:\Users\Jason van Ravenswaay\AO-OS-recovered-pre-cleanup` — recovery snapshot
- `C:\Users\Jason van Ravenswaay\ao-site` — marketing / brand site
- `C:\Users\Jason van Ravenswaay\AO-OS\gcp-vscode-ssh` — nested GCP SSH tooling

**Primary audit target: `AO-OS` main repo.** The others are relevant for completeness but main is canonical.

## Known surfaces (services / apps)

Expect to find, at minimum:
- **Web app** — Next.js on Vercel (Cloudflare DNS in front). 21 pages migrated to client-side API calls in April 2026 after Cloudflare blocked Vercel Lambda IPs.
- **Kiosk** — staff/guest kiosk app. Track A (room picker) shipped 2026-04-22; Track B (staff board) deferred pending Map Studio integration.
- **Webhook Event Processor** — live on n8n Cloud since 2026-04-16. Processes webhooks and fans them out.
- **Slack agent** — n8n workflow `dyPXlybjKmTbadn4`, Claude-powered. IF-node conditions fixed 2026-04-17.
- **Map Studio** — native floor-map + facility intelligence (Phases 1–4 shipped; Phase 5 hardware pending).
- **Guest Web App** — last major missing surface as of 2026-04-22 PRD gap assessment.

## Known stack

- **Cloud:** GCP (primary) + Vercel (frontend hosting) + Cloudflare (DNS / edge)
- **Workflow:** n8n Cloud
- **Observability:** Datadog (partial coverage — verify)
- **Email:** Resend (RESEND_API_KEY on VM — outstanding item)
- **Voice:** ElevenLabs (Lane 2 endpoint — outstanding item)
- **Messaging:** Slack
- **Docs:** Notion (separate AO Notion workspace — not the Litmos teamspace)
- **DB:** Prisma schema in main repo — verify engine (likely Postgres via Cloud SQL or Supabase)

## Known integration status (as of 2026-04-18)

There's a `reference_ao_os_integrations.md` memory file with live vs. partial vs. out-of-scope integrations. During discovery, reconcile the repo evidence against that — it's the authoritative list.

## Known open items

Check whether these remain open at audit time:
- RESEND_API_KEY on VM — was outstanding
- ElevenLabs Lane 2 endpoint — was outstanding

## Known past issues (for context, likely already closed)

- **Cloudflare blocked Vercel Lambda IPs** (resolved 2026-04-21 via commit `9696c6d` — all 21 pages moved to client-side API). User reported lingering UI errors post-deploy — verify this is closed.
- **Staff login issue** — resolved alongside Cloudflare fix.

## Corporate / compliance context

- **Parent entity:** Suriname NV (per AO brand context memory)
- **OpCo:** Canada
- **Brand:** ΑΩ (Alpha Omega) identity
- This matters for data residency findings — Suriname / Canada data residency expectations differ from US-default cloud configurations.

## What NOT to confuse

- **AO / AO-OS** — Jason's own product. This audit scope.
- **Litmos** — separate consulting engagement. Completely out of scope for AO-OS audits. Never cross-file.

## Starting discovery commands (when auditing AO-OS)

```bash
# Top-level structure
ls -la "C:\Users\Jason van Ravenswaay\AO-OS"

# Package manifests
find "C:\Users\Jason van Ravenswaay\AO-OS" -maxdepth 3 -name "package.json" -o -name "requirements.txt" -o -name "go.mod"

# IaC / cloud configs
find "C:\Users\Jason van Ravenswaay\AO-OS" -maxdepth 4 -name "*.yaml" -o -name "*.yml" -o -name "Dockerfile" -o -name "cloudbuild.yaml" | head -50

# Secrets-in-repo red flag scan
git -C "C:\Users\Jason van Ravenswaay\AO-OS" log --all --oneline -- "*.env" 2>/dev/null | head
```

Then zoom into whichever surface is the audit's focus.
