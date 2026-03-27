# N8N Cloud + Notion Setup Guide (Phase 1)

## Part A: Create Notion Database

### Step 1: Go to Notion and Create Database

1. Open [notion.so](https://www.notion.so)
2. Click **+ New** on the left sidebar
3. Select **Database** → **Table**
4. Name it: **AO OS - Operational Log**

### Step 2: Add Database Fields

In your new database, delete the default "Name" field and add these:

| Field Name | Type | Instructions |
|-----------|------|--------------|
| **Title** | Title | Keep this (auto-created) |
| **Event Type** | Select | See selections below |
| **Status** | Select | See selections below |
| **Severity** | Select | See selections below |
| **Timestamp** | Date | Include time, UTC format |
| **Member ID** | Text | UUID reference |
| **Locker ID** | Text | UUID reference |
| **Room ID** | Text | UUID reference |
| **Decision** | Text | allowed/denied/error |
| **Denial Reason** | Text | Reason code |
| **Raw Data** | Text | Full JSON payload |
| **Polled At** | Date | When indexed |

### Step 3: Configure Each Field

**Event Type** (Select):
- Options: `LockerAccessEvent`, `LockerPolicyDecisionEvent`, `AccessAttempt`, `PresenceEvent`, `RoomAccessEvent`, `StaffAuditEvent`, `CleaningTask`, `RoomBooking`
- Color: Purple

**Status** (Select):
- Options: `allowed`, `denied`, `completed`, `in_progress`, `pending`, `cancelled`, `error`
- Color: Blue

**Severity** (Select):
- Options: `critical` (Red), `high` (Orange), `medium` (Yellow), `low` (Gray)
- Color: Based on option

**Timestamp & Polled At** (Date):
- Include time: `✓`
- Date format: Default
- Time zone: UTC

### Step 4: Get Database ID

1. Open your "AO OS - Operational Log" database
2. Copy the URL from browser bar
3. Extract Database ID from: `https://notion.so/<WORKSPACE>/<DATABASE_ID>?v=...`
   - Example: URL is `https://notion.so/my-workspace/abc123def456?v=xyz`
   - Database ID is `abc123def456`
4. **Save this ID** — you'll need it in N8N

---

## Part B: Connect N8N Cloud to Notion

### Step 1: Create Notion Integration Token

1. Go to [notion.com/my-integrations](https://www.notion.com/my-integrations)
2. Click **+ New Integration**
3. Name: `AO OS N8N`
4. Select workspace
5. Capabilities: Check `Read content`, `Update content`, `Create content`
6. Click **Submit**
7. Copy the **Internal Integration Token** (starts with `secret_`)
8. **Save this token** — it's secret!

### Step 2: Add Database to Integration

1. Back in your "AO OS - Operational Log" database (Notion)
2. Click **...** (three dots, top right)
3. Scroll down and click **Connections**
4. Click **+ Connect to** 
5. Find **AO OS N8N** integration and click it
6. Confirm access

### Step 3: Connect in N8N Cloud

1. Log into [n8n.cloud](https://app.n8n.cloud)
2. Go to **Credentials** (left sidebar icon)
3. Click **+ New** (top right)
4. Search for **Notion**
5. Fill in:
   - **Credential name**: `Notion - AO OS`
   - **Notion API Key**: Paste the token from Step 1
   - Click **Create**

---

## Part C: Build the N8N Workflow

### Step 1: Create New Workflow

1. In n8n.cloud, click **+ New workflow**
2. Name: `AO OS Events Polling - Phase 1`

### Step 2: Add Cron Trigger

1. Click the **+** button in the canvas
2. Search for **Cron**
3. Click to add it
4. Configure:
   - **Trigger**: Every 30 minutes
   - **Cron Expression**: `*/30 * * * *`
   - **UTC**: `✓`

### Step 3: Add HTTP Request Node

1. Click the **+** button after Cron
2. Search for **HTTP Request**
3. Configure:
   - **Method**: `GET`
   - **URL**: `http://localhost:4000/v1/events/poll`
     - (If API is remote, use full domain: `https://your-api.com/v1/events/poll`)
   - **Authentication**: `Bearer Token` (from dropdown)
   - **Bearer Token**: Paste your JWT staff token here
     - To get token: Log in as staff user, check browser dev tools → Application → Cookies → look for JWT
     - Or generate one from API if you have auth endpoint

### Step 4: Parse Response

1. Click **+** after HTTP Request
2. Search for **Set** (to restructure data)
3. Name it: `Extract Events`
4. In the **Value** field, use expression:
```javascript
{{
  "events": $node["HTTP Request"].json.body.events,
  "totalEvents": Object.values($node["HTTP Request"].json.body.eventCounts).reduce((a,b) => a+b, 0)
}}
```

### Step 5: Loop Over Events

1. Click **+** after Extract Events
2. Search for **Loop Over Items**
3. Configure:
   - **Items to Loop Over**: `{{$node["Extract Events"].json.events}}`

### Step 6: Score Severity Inside Loop

1. Inside the loop, click **+**
2. Search for **Set** 
3. Name it: `Add Severity Score`
4. Click **Add Expression** for the value
5. Paste this JavaScript:

```javascript
{
  ...item,
  "severity": (function() {
    // Critical: Denials, hard-blocks, staff blocks
    if (item.data.decision === "denied") return "critical";
    if (item.type === "LockerPolicyDecisionEvent" && item.data.reasonCode === "HARD_BLOCKED") return "critical";
    if (item.type === "StaffAuditEvent" && item.data.outcome === "blocked") return "critical";
    
    // High: Access/locker events
    if (["LockerAccessEvent", "RoomAccessEvent", "AccessAttempt"].includes(item.type)) return "high";
    
    // Medium: Operations
    if (["CleaningTask", "RoomBooking", "PresenceEvent"].includes(item.type)) return "medium";
    
    // Low: Audit logs
    return "low";
  })()
}
```

### Step 7: Send to Notion (All Events)

1. Inside the loop, click **+**
2. Search for **Notion Database**
3. Configure:
   - **Credential**: Select `Notion - AO OS` (from Step 3)
   - **Operation**: `Append a database item`
   - **Database**: Select your "AO OS - Operational Log"
   - **Notion fields to send** (map these):

```
Title: = `${item.type} - ${item.data.memberId || item.data.staffUserId || 'System'}`
Event Type: = item.type
Status: = item.data.decision || item.data.status || 'pending'
Severity: = item.severity
Timestamp: = item.occurredAt
Member ID: = item.data.memberId
Locker ID: = item.data.lockerId
Room ID: = item.data.roomId
Decision: = item.data.decision
Denial Reason: = item.data.denialReasonCode
Raw Data: = JSON.stringify(item.data)
Polled At: = $now.toIso()
```

### Step 8: Send Critical Events to Gmail (Branch)

1. Click **+** *before* the Notion node (to add a branch)
2. Search for **Conditional**
3. Name it: `Is Critical?`
4. Configure:
   - **Condition**: `item.severity === 'critical'`
   - **True path**: Lead to Gmail
   - **False path**: Lead to Notion

5. On True path, add **Gmail** node:
   - Search for **Gmail**
   - **Operation**: `Send Email`
   - **To Email**: Enter operations email
   - **Subject**: `🚨 AO OS Critical Event: {{item.type}}`
   - **Message Type**: `HTML`
   - **Message**:
   ```html
   <h2>🚨 Critical Event Alert</h2>
   <p><strong>Type:</strong> {{item.type}}</p>
   <p><strong>Occurred:</strong> {{item.occurredAt}}</p>
   <p><strong>Status:</strong> {{item.data.decision || 'N/A'}}</p>
   <p><strong>Member:</strong> {{item.data.memberId || 'N/A'}}</p>
   <hr>
   <pre>{{JSON.stringify(item.data, null, 2)}}</pre>
   <p><a href="https://operations.ao-os.local">View Dashboard</a></p>
   ```

---

## Part D: Test the Workflow

### Quick Test (Without Waiting 30 mins)

1. In n8n, click the **Test** button (looks like play icon)
2. Watch execution step-by-step
3. Check outputs:
   - **HTTP Request**: Should show JSON with events
   - **Extract Events**: Should show array count
   - **Notion**: Check for success message
   - **Gmail**: Should send test email if critical events found

### Verify in Notion

1. Open your "AO OS - Operational Log" database
2. Refresh the page (Cmd/Ctrl + R)
3. Should see new rows with event data populated

### Verify in Gmail

1. Check your operations email inbox
2. Look for email with subject `🚨 AO OS Critical Event: ...`

### If Test Fails

**HTTP Request returns 401 (Unauthorized)**:
- JWT token is invalid or expired
- Solution: Get fresh token by logging into web UI, checking browser dev tools

**HTTP Request returns 404 (Not Found)**:
- API endpoint not running
- Solution: Verify `pnpm --filter api dev` is running locally, or use remote API URL

**Notion connection fails**:
- Database ID wrong or integration not connected
- Solution: Re-check database ID in URL, verify integration in Notion settings

**Gmail not sending**:
- Gmail account not authorized in N8N
- Solution: Re-authenticate Gmail at Credentials page

---

## Part E: Deploy & Schedule

### Activate Auto-Scheduling

1. In workflow, click **Execution** (top right)
2. Toggle **Active** to ON
3. The workflow will now run every 30 minutes automatically

### Monitor Executions

1. Click **Executions** tab
2. See history of all runs
3. Click any execution to see details
4. Check for errors in logs

---

## Part F: Troubleshooting Reference

| Problem | Cause | Solution |
|---------|-------|----------|
| No events in Notion | API has no new events since last poll | Manually trigger from web UI to generate events, then re-run N8N |
| Events duplicating in Notion | N8N running too frequently | Reduce frequency or check polling cursor is updating |
| Gmail not sending | Gmail account not authorized | Re-auth at N8N Credentials page |
| Workflow stuck on "running" | HTTP timeout or API slow | Increase HTTP timeout to 60s, or check API server |
| "Invalid Bearer token" | Token expired | Generate new JWT by logging into web UI |
| Notion field errors | Field name typo or wrong type | Double-check field names match exactly from Notion database |

---

## Next Steps

Once Phase 1 is stable for a few hours:
1. Monitor Notion for events appearing regularly
2. Verify Gmail alerts for critical events
3. Then start Phase 2: Daily digest aggregation

---
