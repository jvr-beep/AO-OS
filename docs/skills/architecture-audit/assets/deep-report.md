# Architecture Audit — {{SYSTEM_NAME}} — {{YYYY-MM-DD}}
*Mode: Deep · Full framework walkthrough*

## System summary
{{One paragraph. What this system does, what it runs on, where it runs, who uses it.}}

## Discovery notes
- **Stack:** {{languages, runtimes, cloud platforms}}
- **Surfaces:** {{deployed services / apps, in scope for this audit}}
- **Repos examined:** {{paths}}
- **Out of scope this run:** {{what we didn't look at and why}}

## Scorecard

| Framework / Pillar | Score | Δ vs. last audit | Rationale |
|---|---|---|---|
| GCP — Operational Excellence | {{x/5}} | {{±x}} | {{one line}} |
| GCP — Security | {{x/5}} | {{±x}} | |
| GCP — Reliability | {{x/5}} | {{±x}} | |
| GCP — Performance | {{x/5}} | {{±x}} | |
| GCP — Cost Optimization | {{x/5}} | {{±x}} | |
| 12-factor clean factors | {{x/12}} | {{±x}} | |
| CNCF Cloud Native Maturity (avg) | {{x.x}} | {{±x}} | |
| OWASP ASVS L2 coverage | {{x}}% | {{±x}}% | |

## Executive summary
{{3–5 sentences. The bottom line for a stakeholder who will read only this section. What's the posture. What are the top 3 risks. What's the ask.}}

---

## Findings — Google Cloud Architecture Framework

### Operational Excellence

{{One-paragraph state-of-affairs at the start — the qualitative "here's how this dimension looks."}}

#### Findings
- **{{finding-id}}** — [{{severity}}] {{finding title}}
  - **Category:** Ops / CI-CD, Ops / Observability, etc.
  - **Evidence:** {{specific reference}}
  - **Finding:** {{one sentence}}
  - **Impact:** {{why it matters}}
  - **Fix:** {{concrete action}}
  - **Effort:** {{XS/S/M/L}} · **Bucket:** {{0-30 / 30-60 / 60-90 / later}}

*(Repeat for each finding in this pillar.)*

### Security
*(same structure)*

### Reliability
*(same structure)*

### Performance Efficiency
*(same structure)*

### Cost Optimization
*(same structure)*

---

## Findings — 12-factor

Factor-by-factor pass/partial/fail. Cite evidence for any non-pass.

| Factor | Status | Evidence / Gap |
|---|---|---|
| I. Codebase | Pass / Partial / Fail | {{}} |
| II. Dependencies | | {{}} |
| III. Config | | {{}} |
| IV. Backing Services | | {{}} |
| V. Build, Release, Run | | {{}} |
| VI. Processes | | {{}} |
| VII. Port Binding | | {{}} |
| VIII. Concurrency | | {{}} |
| IX. Disposability | | {{}} |
| X. Dev/prod Parity | | {{}} |
| XI. Logs | | {{}} |
| XII. Admin Processes | | {{}} |

### Findings
{{Finding entries for any Partial / Fail rows.}}

---

## Findings — CNCF Cloud Native Maturity

| Dimension | Current level | Target level | Gap |
|---|---|---|---|
| Build & Deploy | L{{x}} | L{{y}} | {{what's missing to reach target}} |
| Application Definition | L{{x}} | L{{y}} | |
| Observability | L{{x}} | L{{y}} | |
| Service Mesh / Networking | L{{x}} | L{{y}} | |
| Data | L{{x}} | L{{y}} | |
| Security | L{{x}} | L{{y}} | |
| Infrastructure | L{{x}} | L{{y}} | |

### Findings
{{Finding entries for each dimension's current-to-target gap.}}

---

## Findings — OWASP ASVS (security deep-dive)

### V2 — Authentication
- Password hashing algorithm: {{evidence}}
- MFA available: {{yes/no/partial}}
- Session management: {{evidence}}
- Rate limiting / lockout: {{evidence}}

#### Findings
{{Finding entries}}

### V3 — Session Management
*(same structure)*

### V4 — Access Control
*(same structure)*

### V5 — Validation, Sanitization, Encoding
*(same structure)*

### V7 — Error Handling & Logging
*(same structure)*

### V9 — Communications
*(same structure)*

---

## 30-60-90 remediation queue (consolidated)

### 0-30 days — must-fix
| ID | Severity | Effort | Finding | Recommended fix |
|---|---|---|---|---|

### 30-60 days — should-fix
| ID | Severity | Effort | Finding | Recommended fix |
|---|---|---|---|---|

### 60-90 days — follow-through
| ID | Severity | Effort | Finding | Recommended fix |
|---|---|---|---|---|

### Later / backlog
| ID | Severity | Effort | Finding | Recommended fix |
|---|---|---|---|---|

---

## What I couldn't check
- {{Each gap with what evidence it would need}}

## Changes since last audit
*(Only present on re-runs. Omit on first run.)*

### Closed since {{prior date}}
- `{{finding-id}}` — {{what was done}}

### New since {{prior date}}
- `{{finding-id}}` — {{summary}}

### Regressed since {{prior date}}
- `{{finding-id}}` — {{what regressed and evidence}}

### Rolled forward (unchanged)
- `{{finding-id}}` — originally logged {{date}}

---

## Appendix: framework scoring detail
*(Optional — expand the scorecard rationale if useful.)*
