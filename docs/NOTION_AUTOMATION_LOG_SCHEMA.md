# Notion Database Schema — Automation Log

This Notion database is used by the **AO OS Auth Healthcheck** n8n workflow (and future automation workflows) to record the outcome of every scheduled run.

> **Database ID placeholder:** `REPLACE_WITH_AUTOMATION_LOG_DB_ID`  
> Replace this in the n8n workflow JSON (`docs/n8n/AO_OS_Auth_Healthcheck_v2.13.3_n8n-cloud.json`) after creating the database.

---

## Required Columns

Create the following fields in Notion (**+ Add a property**):

| Field Name | Notion Type | Notes |
|------------|-------------|-------|
| **Name** | Title | Auto-created by Notion; used for the page title |
| **Workflow Name** | Text | Name of the n8n workflow that wrote the entry |
| **Status** | Select | Options: `Success`, `Failure` |
| **Timestamp** | Date (with time) | ISO 8601 datetime of the run |
| **Trigger** | Text | What triggered the run (e.g. "Schedule every 5 minutes") |
| **Raw Payload** | Text | Full JSON response body — truncated to 1800 chars (Success runs) |
| **Error Message** | Text | Error message from the response body, if any (Success runs — empty string when absent) |
| **Error Details** | Text | Full error description (Failure runs only) |

---

## Setup Instructions

### 1. Create the Database

1. Open Notion and navigate to your workspace
2. Click **+ New page** → select **Table** (full page or inline)
3. Name the database **AO OS - Automation Log**

### 2. Add the Required Fields

Add each field listed in the table above:

- **Status** → type `Select` → add options `Success` (Green) and `Failure` (Red)
- **Timestamp** → type `Date` → enable "Include time"
- **Workflow Name**, **Trigger**, **Raw Payload**, **Error Message**, **Error Details** → type `Text`

### 3. Get the Database ID

1. Open the database in Notion
2. Copy the URL from your browser bar:  
   `https://notion.so/<WORKSPACE>/<DATABASE_ID>?v=...`
3. The **Database ID** is the long alphanumeric segment before the `?v=`
4. Example: `abc123def456ghi789jkl012mno345pq`

### 4. Connect to n8n

1. In n8n, open **Settings → Credentials**
2. Add a **Notion API** credential (Internal Integration Token)
3. Open `docs/n8n/AO_OS_Auth_Healthcheck_v2.13.3_n8n-cloud.json` and replace:
   - `REPLACE_WITH_AUTOMATION_LOG_DB_ID` → your database ID
   - `REPLACE_WITH_NOTION_CREDENTIAL_ID` → the credential ID shown in n8n
   - `REPLACE_WITH_NOTION_CREDENTIAL_NAME` → the credential name shown in n8n
4. Import the updated JSON into n8n (**Workflows → Import from file**)

### 5. Share the Database with Your Integration

1. In Notion, open the Automation Log database
2. Click **Share** (top right)
3. Search for your integration name and click **Invite**

---

## Sample Entry

| Name | Workflow Name | Status | Timestamp | Trigger | Raw Payload | Error Message | Error Details |
|------|--------------|--------|-----------|---------|-------------|---------------|---------------|
| AO OS Auth Healthcheck — 2026-03-27 23:30 | AO OS Auth Healthcheck | Success | 2026-03-27T23:30:00Z | Schedule every 5 minutes | `{"accessToken":"eyJ..."}` | — | — |
| AO OS Auth Healthcheck — 2026-03-27 23:25 | AO OS Auth Healthcheck | Failure | 2026-03-27T23:25:00Z | Schedule every 5 minutes | — | — | Login failed: accessToken not returned |

---

## Suggested Views

- **All Runs** — default table view, sorted by Timestamp descending
- **Failures Only** — filter: Status = Failure
- **Last 24 Hours** — filter: Timestamp is within last 1 day
