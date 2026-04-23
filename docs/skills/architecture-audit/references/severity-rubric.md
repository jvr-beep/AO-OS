# Severity rubric

Use this to calibrate finding severity. Consistency matters more than precision — across a report, Critical should mean the same thing from finding 1 to finding 50.

## Critical

**Definition:** Active exposure, confirmed data loss risk, or user-facing outage risk. Requires fix before next deploy / within days.

**Examples:**
- Hardcoded production secrets in the repo
- Public Cloud Storage bucket exposing PII
- SQL injection path in a user-facing endpoint
- Auth bypass (IDOR where `GET /orders/{id}` returns any order)
- No backups of production data, or backups not tested and DB is not replicated
- RCE vulnerability in a dependency, fix available, not patched

**Not Critical (common miscalibration):**
- "Deprecated dependency" → High or Medium unless actively exploited
- "No CI tests" → High (process gap, not active exposure)
- "Logs contain PII" → High or Critical depending on volume and sensitivity

## High

**Definition:** Would cause an incident within weeks. Fix in current quarter.

**Examples:**
- No observability on a critical service (blind to production issues)
- Single-zone deployment for revenue-critical surface
- Dependencies with known vulnerabilities, not actively exploited
- No rollback procedure documented or automated
- TLS 1.0 / 1.1 still enabled
- Missing rate limiting on auth endpoints
- Service accounts with `editor` or `owner` roles on GCP projects

## Medium

**Definition:** Tech debt that compounds. Fix in next quarter unless touching the area.

**Examples:**
- Inconsistent logging format across services
- Manual deployment steps (not fully automated)
- Missing performance instrumentation (can't see latency breakdowns)
- Docs out of date
- Test coverage gaps in non-critical paths
- Cost optimization opportunities (no auto-shutdown on dev env)

## Low

**Definition:** Polish, consistency, or convenience. Fix when you're in the area anyway.

**Examples:**
- README typos
- Minor naming inconsistencies
- Unused environment variables in config files
- TODO comments older than 6 months
- Duplicate or outdated utility helpers

## Calibration guardrail

Count your Criticals. For a system in active development:
- 0–2 Criticals: healthy posture
- 3–5 Criticals: post-incident territory or accumulated debt
- 6+ Criticals: you're probably miscalibrating — re-audit with a stricter Critical bar, or the system is genuinely in crisis and needs a stop-the-line moment.

If in doubt between two adjacent levels, **pick the lower** — over-severing is the more common failure mode.

## Effort estimates

Pair severity with effort to produce the remediation queue:

- **XS** (<1 day) — config change, small script, doc edit
- **S** (1–3 days) — refactor one file / service, add one dependency properly, add one test suite
- **M** (1–2 weeks) — multi-service change, infra migration, new capability
- **L** (>2 weeks) — major refactor, framework upgrade, platform migration

## Priority bucket assignment

Four buckets — deliberately cadence-neutral so the reader can map them to whatever rhythm they run (sprints, phases, weeks, quarters). Default rules:

- **Now (must-fix):** all Critical + High items with XS/S effort
- **Next (should-fix):** remaining High + Medium items with M effort
- **Later (follow-through):** Low-severity + remaining Medium
- **Backlog:** L-effort items where there's no active incident

Gut-check: can the team realistically complete the Now bucket in their next cadence unit (sprint / phase / whatever)? If the Now bucket has more than 10 items of M+ effort, bump some to Next or flag staffing as a blocker in "What I couldn't check."
