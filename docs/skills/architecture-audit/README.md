# architecture-audit skill

A Claude skill that audits a running software system's architecture against best-practice frameworks and produces a gap-scored report with a 30-60-90 remediation queue.

## What it audits against

- **Google Cloud Architecture Framework** — 5 pillars (Operational Excellence, Security, Reliability, Performance, Cost)
- **12-factor App** — 12 deployment-discipline principles
- **CNCF Cloud Native Maturity** — 7 dimensions × 5 levels
- **OWASP ASVS** — Application Security Verification Standard

## Why it lives in `AO-OS/docs/skills/`

This skill was built primarily to audit AO-OS and is versioned alongside the code it audits. When AO-OS evolves, so do the AO-OS-specific hints in `references/ao-os-stack.md`. Keeping them in the same repo means they stay in sync.

## How to use it

### From Claude Code

Invoke Claude from any working directory and reference the skill:

```
Use the architecture-audit skill at docs/skills/architecture-audit/ to audit this repo. Quick mode first, then deep.
```

Or to audit AO-OS specifically:

```
Run architecture-audit on AO-OS. Quick mode.
```

Claude will read `SKILL.md` and follow its workflow: discovery → framework-by-framework grading → report.

### Modes

- **Quick (15–25 min):** 50k-foot scorecard + top 10 findings + headline 30-60-90 queue.
- **Deep (60–90 min):** Full framework-by-framework walkthrough, 40–100 findings.
- **Both:** Quick first, review with stakeholders, then Deep.

### What you get

A dated markdown report (`audit-[system]-[mode]-[YYYY-MM-DD].md`) containing:
- One-paragraph system summary
- Scorecard table (framework × pillar × 1–5 rating)
- Top findings ordered by severity
- Findings by framework, each with evidence citation
- 30-60-90 remediation queue
- "What I couldn't check" — explicit verification gaps

## Structure

```
architecture-audit/
├── SKILL.md                     # main entrypoint — read first
├── README.md                    # this file
├── references/                  # framework-specific guidance (loaded on demand)
│   ├── gcp-architecture.md
│   ├── 12-factor.md
│   ├── cncf-maturity.md
│   ├── owasp-asvs.md
│   ├── ao-os-stack.md           # AO-OS hints (only loaded when auditing AO-OS)
│   └── severity-rubric.md
├── assets/                      # report templates
│   ├── quick-scorecard.md
│   ├── deep-report.md
│   └── notion-page.md
└── evals/
    ├── evals.json               # test prompts
    └── fixtures/
        └── bad-service/         # deliberately flawed fixture with 24 seeded issues
            ├── KNOWN_ISSUES.md  # grader's answer key
            ├── package.json
            ├── Dockerfile
            ├── .env.production
            ├── scripts/deploy.sh
            └── src/server.js
```

## Iteration 1 test results (from build)

Ran against AO-OS and the bad-service fixture, with-skill vs. no-skill baseline. Key observations:

- **AO-OS with skill:** 10 findings (0 Critical / 5 High / 5 Medium). The skill-anchored run verified `.env` was gitignored before flagging secrets as Critical. Top concerns surfaced: GitHub Actions with floating tags (supply-chain risk), VM secret sprawl, single-VM prod with no rollback.
- **AO-OS baseline (no skill):** 16 findings (2 Critical / 6 High). Flagged gitignored JWT fallback as Critical without verification. Missed 30-60-90 structure.
- **bad-service with skill:** Quick 10 findings + Deep 38 findings. Framework-by-framework walk. Severity ~7C/14H/16M/1L.
- **bad-service baseline:** 24 findings. Found the obvious issues but less structured output.

Wall-clock cost: skill adds ~3.3 min vs. baseline. Tradeoff: more disciplined severity calibration + consistent structure for quarterly diffing.

## Running the test fixture

If you want to re-verify the skill works:

```
Audit the fixture at docs/skills/architecture-audit/evals/fixtures/bad-service/ using the architecture-audit skill.
```

Compare Claude's findings against `KNOWN_ISSUES.md` (24 seeded flaws).

## Future iterations

V1 limitations (all noted in SKILL.md as "What I couldn't check"):
- No live GCP / IAM / Secret Manager probing — code/config/docs only.
- No Datadog coverage verification — assumes monitors are what they say in config.
- No Vercel / Cloudflare runtime env var inspection.
- No n8n live workflow probing — reads workflow JSON / exports only.

Planned for v2: optional runtime-probe hooks when the user grants credentialed access.

## License

Internal AO-OS tooling.
