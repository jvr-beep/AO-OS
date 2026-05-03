# n8n Workflows

This directory contains importable n8n workflow JSON files and the connector configuration for the AO OS project.

## Connector Configuration

**[`connector.config.json`](connector.config.json)** — answers the three connector setup questions:

| Question | Answer |
|----------|--------|
| n8n URL | `https://ao-os.app.n8n.cloud` |
| Direction | Both (n8n → Notion and Notion → n8n) |
| Notion databases | `AO OS - Operational Log`, `AO OS - Health Check Log` |

## Workflows

| File | Name | Direction | Trigger |
|------|------|-----------|---------|
| [`workflows/health-check.json`](workflows/health-check.json) | AO OS Auth Health Check | n8n → Notion | Manual |
| [`workflows/notion-to-n8n-webhook.json`](workflows/notion-to-n8n-webhook.json) | AO OS Notion → n8n Webhook | Notion → n8n | Webhook |

## Importing a Workflow

1. In n8n, go to **Workflows** → **⋮** (three dots) → **Import from file**.
2. Select the `.json` file from this directory.
3. Set required environment variables (see [`connector.config.json`](connector.config.json) → `requiredEnvVars`).
4. Add Notion credentials (**Credentials** → **+ New** → **Notion API**).
5. Activate the workflow.

## Documentation

- [N8N Connector Setup Guide](../docs/N8N_CONNECTOR_SETUP.md) — full bidirectional setup (both directions)
- [N8N Health Check Workflow](../docs/N8N_HEALTH_CHECK_WORKFLOW.md) — health check setup steps
- [N8N Workflow Quick Reference](../docs/N8N_WORKFLOW_QUICK_REF.md) — visual flows and key values
- [N8N Cloud + Notion Setup Guide](../docs/N8N_CLOUD_NOTION_SETUP.md) — Notion integration setup
- [Phase 1 Polling Workflow](../apps/api/test/smoke/N8N_PHASE1_POLLING_WORKFLOW.md) — events polling configuration
