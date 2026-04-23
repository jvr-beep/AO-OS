---
name: architecture-audit
description: Audit a running software system's architecture against best-practice frameworks (Google Cloud Architecture Framework, 12-factor, CNCF Cloud Native Maturity, OWASP ASVS) and produce a gap-scored report with a 30-60-90 remediation queue. Use this skill whenever the user asks to "audit my architecture", "grade the system against best practices", "architecture review", "security posture check", "run a quarterly architecture audit", "check my GCP / n8n / cloud setup against best practices", "where are the architecture gaps", "find technical debt", "produce a remediation plan". Especially for AO-OS and similar GCP + n8n + GitHub + Datadog stacks, but works on any codebase the user points it at. Supports a Quick (50k-foot) mode, a Deep walkthrough mode, or both run in sequence — ask if the user doesn't specify. Produces a dated markdown report designed for drop-in to Notion or any other doc system.
---

# architecture-audit

Audit a running system against best-practice frameworks and produce an actionable remediation plan. Built for quarterly re-runs — output includes enough structure to diff against prior audits.

## What this skill does

For a target system (code + config + workflow definitions + docs), this skill:

1. **Discovers** the stack — what's running, what's in the repo, how components connect.
2. **Grades** the system against four frameworks:
   - **Google Cloud Architecture Framework** (Operational Excellence, Security, Reliability, Performance, Cost)
   - **12-factor App** principles
   - **CNCF Cloud Native Maturity** (progressing levels)
   - **OWASP ASVS** (Application Security Verification Standard) for the security slice
3. **Surfaces gaps** as structured findings — issue, severity, evidence (file path / config / endpoint), recommended fix, effort estimate.
4. **Sequences remediation** into a 30-60-90 queue matching the user's operating cadence.

## Modes

Ask the user which mode they want if they haven't said. Defaults: **Quick first, then Deep.**

### Quick mode (50k-foot)
- **Goal:** Whole-architecture scorecard in 15–25 minutes.
- **What it looks at:** Repo top-level layout, deployment manifests, service boundaries, top auth / secrets / observability files, README / docs, package manifests. Doesn't open every source file.
- **Output:** 1 scorecard (all 5 GCP pillars + security summary) + top 10 findings + 30-60-90 headline queue. See `assets/quick-scorecard.md`.
- **When to use:** First run · stakeholder briefing · "is anything on fire?" sanity check.

### Deep mode (walkthrough)
- **Goal:** Full evidence-backed audit in 60–90 minutes.
- **What it looks at:** Every significant source file, every workflow / n8n node, every IaC template, dependencies, auth flows, data access patterns, error paths, tests. Walks every framework dimension.
- **Output:** Full framework-by-framework report with 40–100 findings, each with evidence citation. See `assets/deep-report.md`.
- **When to use:** Quarterly re-run · before a major build phase · after a security incident.

### Both (recommended for first-ever audit)
Run Quick first, share the 50k-foot scorecard with the user, then run Deep. The Quick findings become headline sections in the Deep report.

## When and how to pick frameworks

All four frameworks apply in most cases. Skip selectively **only** when:
- The system has no cloud footprint → skip GCP Architecture Framework pillars that presuppose cloud (e.g., Reliability-as-GCP-SRE). Keep Operational Excellence, Security.
- The system is pure data / batch (no long-running services) → CNCF maturity applies less; note that explicitly rather than skipping silently.
- The user explicitly scopes out one (e.g., "no security this round") → honor it; add a note that security was skipped.

Each framework has a reference file. **Load it only when you enter that phase of the audit.** Don't preload all four — keep context tight.

- `references/gcp-architecture.md` — Google Cloud Architecture Framework
- `references/12-factor.md` — 12-factor app principles
- `references/cncf-maturity.md` — CNCF Cloud Native Maturity model
- `references/owasp-asvs.md` — OWASP ASVS (security)
- `references/ao-os-stack.md` — AO-OS-specific context (stack, repos, n8n workflows) — load only when auditing AO-OS
- `references/severity-rubric.md` — How to assign Critical / High / Medium / Low

## Discovery phase — how to map the system

Run this first, regardless of mode. It takes 5–10 minutes and anchors everything that follows.

**Step 1: Stack detection.** From the repo root, identify:
- Language(s) and runtimes → `package.json`, `requirements.txt`, `go.mod`, `Dockerfile`, etc.
- Cloud platform(s) → `.gcloudignore`, `app.yaml`, `cloudbuild.yaml`, `terraform/`, `.github/workflows/`, Vercel config, Cloudflare config
- Workflow engines → `n8n/`, `workflows/`, webhook endpoints
- Databases → Prisma schemas, migrations, SQL files, env vars (`DATABASE_URL`, etc.)
- Observability → Datadog config, Sentry, OpenTelemetry imports, logging middleware
- Secret management → `.env.example`, `secrets.yaml`, GCP Secret Manager refs, Vercel/Cloudflare env config

**Step 2: Service boundaries.** What are the deployed surfaces? (e.g., for AO-OS: web app, kiosk, staff board, webhook processor, n8n workflows, Slack agent). A quick map of "who talks to whom" saves time later.

**Step 3: Write a one-paragraph system summary.** Pin this at the top of the report. If you can't summarize in a paragraph, something is wrong with your discovery.

## Grading — how to find and score findings

Each finding has this shape (use the structure consistently — it's what makes quarterly diffing possible):

```
- ID: A descriptive slug, e.g., "secrets-hardcoded-in-env-example" — stable across re-runs
- Framework: Which framework this violates (GCP / 12-factor / CNCF / OWASP)
- Category: Sub-category within the framework (e.g., GCP > Security > IAM)
- Severity: Critical | High | Medium | Low (see severity-rubric.md)
- Evidence: File path, line number, config snippet, endpoint, or observable behavior. Be specific — "see src/api/foo.ts:42" not "in the API code"
- Finding: One sentence stating the gap
- Impact: Why it matters (what breaks, what's at risk)
- Recommended fix: Concrete, actionable — "add OWASP secure headers middleware to src/middleware/security.ts" not "improve security"
- Effort: XS (<1 day) | S (1–3 days) | M (1–2 weeks) | L (>2 weeks)
- 30-60-90 bucket: 0-30 | 30-60 | 60-90 | later
```

### Key discipline: evidence or skip

**Don't invent findings.** If you can't cite a file / config / behavior, don't include the finding. It's better to note "couldn't verify X — need access to production logs" than to hallucinate a risk. List verification gaps separately under "What I couldn't check" at the end of the report.

### Verify before scoring Critical

A finding is only Critical if the exposure is real. Common over-scoring patterns to avoid:
- "Secret in env file" — check if the file is gitignored and the "secret" is a placeholder or dev-only value. If validated as real + exposed, Critical. If gitignored dev-only, High or Medium.
- "Hardcoded fallback in code" — check if env validation prevents that fallback from reaching production. If validated-away, High (code smell) not Critical.
- Do the verification work before labeling Critical. It takes 2 minutes and keeps severity calibrated.

### Calibrating severity

See `references/severity-rubric.md`. The rough rule:
- **Critical** = active exposure, data loss, or user-facing outage risk. Fix before next deploy.
- **High** = would cause incident within weeks; fix in current quarter.
- **Medium** = tech debt that compounds; fix in next quarter.
- **Low** = polish / consistency; fix when touching the area anyway.

Be honest about Critical — if everything is Critical, nothing is. Most mature systems have 1–5 Critical findings; legacy systems can have 10+. More than that usually signals miscalibration.

## Report structure

Generate a single markdown document per audit. Structure is **identical** across quick and deep so quarterly diffs work.

```
# Architecture Audit — [System Name] — [YYYY-MM-DD]

## System summary
One paragraph. What this system does, what it runs on, where it runs.

## Scorecard
Table: Framework × Pillar, 5-point rating, one-line rationale.

## Top findings (ordered by severity then effort)
1. [Critical] Finding title — one-sentence summary
2. [Critical] ...
3. [High] ...
...

## Findings by framework

### Google Cloud Architecture Framework
(One subsection per pillar: Ops Excellence, Security, Reliability, Performance, Cost)
- For each, list findings with the full finding template.

### 12-factor
...

### CNCF Cloud Native Maturity
...

### OWASP ASVS (security deep-dive)
...

## 30-60-90 remediation queue

### 0-30 days (must-fix)
- [ID] (Critical) Fix summary — owner TBD — effort XS/S
...

### 30-60 days (should-fix)
...

### 60-90 days (follow-through)
...

### Later / backlog
...

## What I couldn't check
- List items where evidence wasn't accessible (e.g., "production logs — no Datadog access this run")

## Changes since last audit (only on quarterly re-runs)
- Closed since [prior date]: [finding IDs]
- New since [prior date]: [finding IDs]
- Regressed since [prior date]: [finding IDs]
```

Templates with worked examples:
- `assets/quick-scorecard.md` — quick-mode output template
- `assets/deep-report.md` — deep-mode output template
- `assets/notion-page.md` — same content formatted for Notion drop-in (callouts, toggles, database-friendly table format)

## Output destination

**Default:** Write a single markdown file named `audit-[system]-[YYYY-MM-DD].md` into the current working directory or a location the user specifies.

**If the user asks for Notion output:** Ask for the target Notion page / database first. If the Notion integration can reach it, push the report as a child page + create one row per finding in a findings database if one exists. If the Notion space isn't accessible, write markdown and tell the user — don't silently skip.

## Running on AO-OS specifically

AO-OS is the primary target system this was built for. Before auditing AO-OS, load `references/ao-os-stack.md` — it maps the known repos, n8n workflows, GCP projects, and integrations so discovery doesn't start from scratch. Still do fresh discovery — the file is a starting hint, not ground truth.

**Keep AO and Litmos separate.** AO-OS audits go to AO Notion (or markdown → AO Notion later). Litmos has its own teamspace and isn't in scope for AO-OS audits. Never cross-file.

## Quarterly re-run discipline

When this skill runs on a system that has been audited before:
1. Read the most recent audit report from the output directory.
2. Compare finding IDs (that's why IDs are descriptive slugs — they should match across runs for the same gap).
3. In the report, generate a **"Changes since last audit"** section: closed · new · regressed.
4. Roll unresolved findings forward with original date-logged preserved.

This is what makes the skill useful long-term. Without this comparison, you're just producing reports.

## How much to write

A quick-mode report is ~3–6 pages. A deep-mode report for a medium system is 15–30 pages. Don't pad. Every finding must earn its place. Prefer concrete specificity over comprehensiveness — a 20-finding report with real evidence beats a 60-finding report with speculation.

## Tone

Technical, direct, no hedging. This document is read by the people who will fix the issues. Assume they're smart. Point at the problem, cite evidence, say what to do about it.

Don't editorialize ("this is a serious concern that warrants immediate attention!!"). State severity with the label, move on. The reader can infer urgency from Critical vs. Medium.
