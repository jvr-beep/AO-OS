# N8N ↔ Notion Connector Setup

## Connector Overview

This document answers the three questions required to wire the AO OS n8n ↔ Notion connector:

| Question | Answer |
|----------|--------|
| **n8n URL** | `https://ao-os.app.n8n.cloud` |
| **Direction** | **Both** — see sections below |
| **Notion databases** | `AO OS - Operational Log` + `AO OS - Health Check Log` |

All connector parameters are defined in [`n8n/connector.config.json`](../n8n/connector.config.json).

---

## n8n URL

| Instance | URL |
|----------|-----|
| **n8n cloud** | `https://ao-os.app.n8n.cloud` |
| **Webhook base** | `https://ao-os.app.n8n.cloud/webhook` |
| **API base** | `https://ao-os.app.n8n.cloud/api/v1` |

---

## Notion Databases

| Database | Purpose | Env Var |
|----------|---------|---------|
| **AO OS - Operational Log** | All AO OS events (polled every 30 min from API) | `NOTION_OPERATIONAL_LOG_DB_ID` |
| **AO OS - Health Check Log** | Auth health check run results | `NOTION_HEALTH_CHECK_DB_ID` |

To get a database ID: open the database in Notion → copy from the URL:
```
https://notion.so/<workspace>/<DATABASE_ID>?v=...
```

---

## Direction 1: n8n → Notion (Outbound)

n8n polls the AO OS API and writes events into Notion.

### Workflows

| Workflow | File | Trigger | What it writes |
|----------|------|---------|---------------|
| **AO OS Auth Health Check** | [`n8n/workflows/health-check.json`](../n8n/workflows/health-check.json) | Manual | 1 row in Health Check Log |
| **AO OS Events Polling** | (build manually per [`N8N_PHASE1_POLLING_WORKFLOW.md`](../apps/api/test/smoke/N8N_PHASE1_POLLING_WORKFLOW.md)) | Cron (every 30 min) | Rows in Operational Log |

### Flow

```
[n8n Manual/Cron Trigger]
         ↓
[HTTP POST /auth/login]   →   accessToken
         ↓
[HTTP GET /events/poll]   →   events array
         ↓
[Score Severity + Loop]
         ↓
[Notion: Append DB item]  →   AO OS - Operational Log
```

### Setup

1. Import workflows from `n8n/workflows/` or build manually.
2. Add Notion credentials in n8n (**Credentials** → **+ New** → **Notion API Key**).
3. Add required environment variables (see [Environment Variables](#environment-variables)).
4. Run the health-check workflow first to confirm end-to-end auth works.

---

## Direction 2: Notion → n8n (Inbound Webhook)

Notion automation calls an n8n webhook when a database item changes. n8n processes the event and optionally writes back to the AO OS API.

### Workflow

| Workflow | File | Trigger | What it does |
|----------|------|---------|--------------|
| **AO OS Notion → n8n Webhook** | [`n8n/workflows/notion-to-n8n-webhook.json`](../n8n/workflows/notion-to-n8n-webhook.json) | Webhook (POST) | Routes Notion event → AO OS API |

### Webhook URL

```
https://ao-os.app.n8n.cloud/webhook/ao-os/notion-event
```

### Flow

```
[Notion Automation]  →  POST /webhook/ao-os/notion-event
                                  ↓
                         [Validate Secret header]
                                  ↓
                         [Parse Notion payload]
                                  ↓
              ┌──────────────────┴─────────────────┐
       api_action                             other event
              ↓                                     ↓
    [Get Auth Token]                   [Update Notion page status]
              ↓
    [POST to AO OS API]
              ↓
         [Respond 200]
```

### Setup Steps

#### 1. Import the Workflow

1. In n8n, go to **Workflows** → **Import from file**.
2. Select `n8n/workflows/notion-to-n8n-webhook.json`.
3. Activate the workflow (toggle **Active** = ON) — the webhook URL becomes live.

#### 2. Add the Webhook Secret

1. In n8n, go to **Settings** → **Variables** (or add as env var).
2. Set `NOTION_WEBHOOK_SECRET` to a random string (e.g., generate with `openssl rand -hex 32`).
3. Store the same value in Notion automation config (see below).

#### 3. Configure Notion Automation

1. Open the Notion database you want to trigger from.
2. Click **...** → **Automations** → **+ New automation**.
3. **Trigger**: Select the condition (e.g., "When Status is changed to 'needs_review'").
4. **Action**: Click **+ Add action** → **Send HTTP request**.
5. Fill in:
   - **URL**: `https://ao-os.app.n8n.cloud/webhook/ao-os/notion-event`
   - **Method**: `POST`
   - **Headers**: `x-notion-secret: <your-NOTION_WEBHOOK_SECRET>`
   - **Body** (JSON):
     ```json
     {
       "eventType": "notion_page_update",
       "pageId": "{{page.id}}",
       "databaseId": "{{database.id}}",
       "properties": {
         "status": "{{page.properties.Status}}"
       }
     }
     ```
6. Click **Save**.

#### 4. Test

1. In n8n, open the webhook workflow → click **Listen for test event**.
2. In Notion, trigger the automation (change a page status to the trigger value).
3. Confirm the webhook is received in n8n.
4. Check the payload in the **Parse Notion Payload** node output.

---

## Environment Variables

Set these in n8n (**Settings** → **Variables**, or via your n8n cloud environment):

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NOTION_OPERATIONAL_LOG_DB_ID` | Yes | Operational Log database ID | `abc123def456` |
| `NOTION_HEALTH_CHECK_DB_ID` | Yes | Health Check Log database ID | `xyz789abc123` |
| `AO_OS_API_BASE` | Yes | AO OS API base URL | `https://api.aosanctuary.com/v1` |
| `AO_OS_STAFF_EMAIL` | Yes (inbound webhook) | Staff email for API auth | `staff@ao-os.local` |
| `AO_OS_STAFF_PASSWORD` | Yes (inbound webhook) | Staff password for API auth | (keep in secrets manager) |
| `STAFF_DIGEST_EMAIL` | Yes (polling) | Critical alert recipient | `operations@ao-os.local` |
| `NOTION_WEBHOOK_SECRET` | Yes (inbound webhook) | Shared secret for webhook validation | (generate randomly) |

---

## Credential Setup (n8n)

### Notion Credential

1. Go to **Credentials** → **+ New**.
2. Search for **Notion API**.
3. Enter:
   - **Credential name**: `Notion - AO OS`
   - **API Key**: Paste the Notion Internal Integration Token (starts with `secret_`)
4. Click **Save**.

### How to get the Notion Integration Token

1. Go to [notion.com/my-integrations](https://www.notion.com/my-integrations).
2. Click **+ New Integration** → name it `AO OS N8N`.
3. Capabilities: `Read content`, `Update content`, `Create content`.
4. Click **Submit** → copy the token.
5. In each Notion database: click **...** → **Connections** → **+ Connect to** → select `AO OS N8N`.

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Webhook returns 401 | Wrong or missing `x-notion-secret` header | Check `NOTION_WEBHOOK_SECRET` matches in both n8n and Notion automation |
| Notion automation doesn't fire | Trigger condition not met | Check automation trigger in Notion; manually trigger to test |
| n8n webhook not receiving | Workflow not active | Toggle workflow Active = ON |
| API call fails from webhook workflow | Bad credentials or wrong URL | Check `AO_OS_API_BASE`, `AO_OS_STAFF_EMAIL`, `AO_OS_STAFF_PASSWORD` |
| Notion write fails | Stale property IDs | Re-select DB from dropdown; delete old props; add fresh mappings |
| No rows in Operational Log | Polling workflow not active or no new events | Check workflow Active status; trigger manually |

---

## Workflow Index

| File | Name | Direction | Trigger |
|------|------|-----------|---------|
| [`n8n/workflows/health-check.json`](../n8n/workflows/health-check.json) | AO OS Auth Health Check | n8n → Notion | Manual |
| [`n8n/workflows/notion-to-n8n-webhook.json`](../n8n/workflows/notion-to-n8n-webhook.json) | AO OS Notion → n8n Webhook | Notion → n8n | Webhook |
| *(build manually)* | AO OS Events Polling | n8n → Notion | Cron (30 min) |
