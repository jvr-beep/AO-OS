# Architecture Audit — {{SYSTEM_NAME}} — {{YYYY-MM-DD}}
*Mode: Quick · 50k-foot view*

## System summary
{{One paragraph: what it does, what it runs on, where it runs.}}

## Scorecard

| Framework / Pillar | Score (1–5) | Rationale |
|---|---|---|
| GCP — Operational Excellence | {{x}} | {{one line}} |
| GCP — Security | {{x}} | {{one line}} |
| GCP — Reliability | {{x}} | {{one line}} |
| GCP — Performance | {{x}} | {{one line}} |
| GCP — Cost Optimization | {{x}} | {{one line}} |
| 12-factor (overall) | {{x/12 factors clean}} | {{one line}} |
| CNCF Cloud Native Maturity (avg) | {{x.x}} | {{one line}} |
| OWASP ASVS L2 compliance | {{x}}% | {{one line}} |

Scoring: 1 = absent / broken · 2 = partial / inconsistent · 3 = present and working · 4 = robust · 5 = best-in-class.

## Top 10 findings

| # | Severity | Framework | Finding | Evidence |
|---|---|---|---|---|
| 1 | Critical | {{fw}} | {{one-line finding}} | {{file:line or config ref}} |
| 2 | ... | | | |

Full finding details for each in the "Findings" section below.

## Findings

### 1. {{Finding title}}
- **ID:** `{{descriptive-slug}}`
- **Framework:** {{GCP / 12-factor / CNCF / OWASP}}
- **Category:** {{sub-category}}
- **Severity:** Critical
- **Evidence:** {{specific file path or config reference}}
- **Finding:** {{one sentence}}
- **Impact:** {{what breaks, what's at risk}}
- **Recommended fix:** {{concrete action}}
- **Effort:** XS / S / M / L
- **30-60-90 bucket:** 0-30

*(Repeat for remaining top findings — in Quick mode, limit to 10–15 total.)*

## 30-60-90 remediation queue

### 0-30 days (must-fix)
- [ ] `{{finding-id}}` (Critical, XS) — {{one-line summary}}
- [ ] `{{finding-id}}` (High, S) — {{one-line summary}}

### 30-60 days (should-fix)
- [ ] `{{finding-id}}` (High, M) — {{one-line summary}}

### 60-90 days (follow-through)
- [ ] `{{finding-id}}` (Medium, S) — {{one-line summary}}

### Later / backlog
- [ ] `{{finding-id}}` (Medium, L) — {{one-line summary}}

## What I couldn't check
- {{Missing access / visibility}} — {{what evidence it would need}}

## Recommended next step
{{"Run Deep mode next"  or  "Schedule next quarterly re-run"  or  "Critical-only walkthrough on XYZ area"}}
