# N8N Auth Health Check Workflow

## Overview

A minimal workflow to validate that the AO OS API authentication endpoint is reachable and returning a valid `accessToken`. Results are logged to a Notion database.

**Workflow file**: [`n8n/workflows/health-check.json`](../n8n/workflows/health-check.json) (import directly into n8n)

---

## Workflow Structure

```
[Manual Trigger]
      ↓
[Auth Login]  POST https://api.aosanctuary.com/v1/auth/login
      ↓
[Log Success (Notion)]  → Appends 1 row to health-check DB
[Log Failure (Notion)]  ← disabled by default
```

---

## Node Configuration

### Auth Login

| Field | Value |
|-------|-------|
| **Node type** | HTTP Request |
| **Method** | POST |
| **URL** | `={{ $env.AO_OS_API_BASE }}/auth/login` |
| **Send Body** | JSON |
| **Body email** | `={{ $env.AO_OS_STAFF_EMAIL }}` |
| **Body password** | `={{ $env.AO_OS_STAFF_PASSWORD }}` |

Set the environment variables in n8n to:
- `AO_OS_API_BASE` = `https://api.aosanctuary.com/v1`
- `AO_OS_STAFF_EMAIL` = `staff@ao-os.local`
- `AO_OS_STAFF_PASSWORD` = (your staff password)

**Expected response** (HTTP 200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "staffUser": {
    "id": "...",
    "email": "staff@ao-os.local",
    "fullName": "...",
    "role": "operations"
  }
}
```

Verify `accessToken` is present in the output before proceeding.

---

### Log Success (Notion)

Re-select the Notion database from the dropdown each time you add the node (this clears stale property IDs).

**Notion database properties** — add only these 4, delete any others:

| Property | Type | Value |
|----------|------|-------|
| **Name** | title | `AO OS auth health check` |
| **Workflow Name** | rich text | `AO OS auth health check` |
| **Status** | select | `Success` |
| **Timestamp** | date | `{{$now}}` |

---

### Log Failure (Notion)

Keep this node **disabled** (`disabled: true`) during initial setup and testing so it cannot break test runs. Re-enable only after the success path is verified end-to-end.

---

## Setup Steps

1. Import `n8n/workflows/health-check.json` into n8n (or build manually).
2. Open the **Auth Login** node and confirm the URL and body use environment variables:
   - **URL**: `={{ $env.AO_OS_API_BASE }}/auth/login`
   - **email**: `={{ $env.AO_OS_STAFF_EMAIL }}`
   - **password**: `={{ $env.AO_OS_STAFF_PASSWORD }}`
3. Execute **Auth Login** by itself → confirm HTTP 200 and `accessToken` in output.
4. Open **Log Success (Notion)** → re-select the Notion Database from the dropdown.
5. Delete any old mapped properties, then add the 4 properties listed above.
6. Confirm **Log Failure (Notion)** is disabled (greyed out in the canvas).
7. Click **Execute Workflow** and confirm one row appears in Notion.

---

## Environment Variables

Set in n8n credentials manager:

```env
AO_OS_API_BASE=https://api.aosanctuary.com/v1
AO_OS_STAFF_EMAIL=staff@ao-os.local
AO_OS_STAFF_PASSWORD=<your-staff-password>
NOTION_HEALTH_CHECK_DB_ID=<your-notion-database-id>
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Auth Login returns 401 | Wrong credentials or API not running | Verify `staff@ao-os.local` exists and password is `TestPassword123!` |
| Auth Login returns 404 | Wrong URL | Confirm `https://api.aosanctuary.com/v1/auth/login` is reachable |
| Notion write fails | Stale property IDs | Re-select DB from dropdown, delete old properties, re-add fresh mappings |
| No row in Notion | Wrong DB ID | Copy DB ID fresh from Notion URL |

---

## Next Steps

Once the health-check is passing end-to-end:

1. Apply the same **Notion remap pattern** to the polling workflow:
   - Open `AO OS Events Polling - Phase 1`
   - In the Notion node: re-select DB, delete old properties, add fresh mappings
   - See [`N8N_PHASE1_POLLING_WORKFLOW.md`](../apps/api/test/smoke/N8N_PHASE1_POLLING_WORKFLOW.md) for field list

2. Activate the polling workflow (toggle **Active = ON**).
