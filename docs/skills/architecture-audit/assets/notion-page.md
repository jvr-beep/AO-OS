# Notion-ready formatting guide

Use this when the output destination is a Notion page. The report content is identical to the quick or deep template — only the formatting adapts to Notion's native blocks.

## Block conventions

Use Notion-flavored markdown:

- **Callouts** for the executive summary and "What I couldn't check" section:
  ```
  <callout icon="📋">
  Executive summary text here.
  </callout>
  ```

- **Toggles** for each framework section so the page doesn't sprawl:
  ```
  ## Findings — Google Cloud Architecture Framework
  <details>
  <summary>Operational Excellence</summary>
  ... findings ...
  </details>
  ```

- **Tables** for the scorecard and remediation queues — Notion tables render well.

- **Checkbox lists** for the 30-60-90 queues — users can check them off inline:
  ```
  - [ ] `secrets-in-env-example` (Critical, XS) — remove .env.production from repo history
  ```

## Emoji use

Minimal. Only on callouts (📋 for summary, ⚠️ for what-I-couldn't-check) and severity labels if the user prefers (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low). Skip otherwise — the report is technical, not marketing.

## Findings database (if one exists in the Notion space)

If the AO Notion space has a findings / issues database, create one row per finding with:

| Property | Value |
|---|---|
| Title | The finding title (matches the `finding-id`) |
| Severity | Critical / High / Medium / Low |
| Framework | GCP / 12-factor / CNCF / OWASP |
| Status | Open (set on creation) |
| Effort | XS / S / M / L |
| Bucket | 0-30 / 30-60 / 60-90 / later |
| Evidence | The specific file / config / endpoint reference |
| Fix | Recommended action |
| Audit run | Link back to the audit report page |

This makes quarterly diffs trivial — filter by "Audit run" and compare.

## Page cover / icon

Set the icon to 🏗️ (audit / architecture). No cover image unless the user has a brand asset.

## Linking back to evidence

When citing a file path, write `{{repo-name}}/{{path}}:{{line}}` as plain text — don't link unless there's a public source viewer. The reader who needs to verify will grep their local checkout.
