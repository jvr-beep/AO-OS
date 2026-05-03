# Phase 1: N8N Event Polling Workflow

## Overview
**Goal**: Poll AO OS events every 30 minutes and route them to Notion + Gmail.
**Trigger**: Cron (every 30 minutes)
**Actions**: Query → Filter → Route

---

## Workflow Steps (N8N UI Configuration)

### Step 1: Cron Trigger
**Node Type**: `Cron`
- **Trigger**: Every 30 minutes
- **UTC**: True
- **Schedule Expression**: `*/30 * * * *`

This will fire every 30 minutes.

---

### Step 2: HTTP Request → Get Events
**Node Type**: `HTTP Request`

**Configuration:**
- **Method**: `GET`
- **URL**: `https://api.aosanctuary.com/v1/events/poll`
  - (For local development: `http://localhost:4000/v1/events/poll`)
- **Authentication**: `Bearer Token`
- **Bearer Token**: Obtained from Auth Login node — see [Auth Login setup](../../../docs/N8N_HEALTH_CHECK_WORKFLOW.md)
- **Response Format**: `JSON`

**Expected Response Structure:**
```json
{
  "lastPolledAt": "2026-03-26T14:30:00Z",
  "events": [
    {
      "id": "event-uuid",
      "type": "LockerAccessEvent",
      "occurredAt": "2026-03-26T14:25:30Z",
      "data": {
        "memberId": "member-uuid",
        "lockerId": "locker-uuid",
        "decision": "allowed",
        "denialReasonCode": null,
        "eventType": "open_attempt"
      }
    }
  ],
  "eventCounts": {
    "LockerAccessEvent": 5,
    "RoomAccessEvent": 2,
    "CleaningTask": 1,
    ...
  }
}
```

---

### Step 3: Extract Events Array
**Node Type**: `Code`

**Expression Language**: JavaScript

**Code:**
```javascript
// Extract events array from response
const response = $input.first().json;
return response.events.map(event => ({
  ...event,
  severity: determineSeverity(event)
}));

function determineSeverity(event) {
  // Critical: Access denials, hard-blocks, policy violations
  if (event.data.decision === 'denied') return 'critical';
  if (event.type === 'Locker PolicyDecisionEvent' && event.data.reasonCode === 'HARD_BLOCKED') return 'critical';
  if (event.type === 'StaffAuditEvent' && event.data.outcome === 'blocked') return 'critical';
  
  // High: Locker/access events
  if (event.type === 'LockerAccessEvent' || event.type === 'RoomAccessEvent') return 'high';
  if (event.type === 'AccessAttempt') return 'high';
  
  // Medium: Operational updates
  if (event.type === 'CleaningTask' || event.type === 'RoomBooking') return 'medium';
  if (event.type === 'PresenceEvent') return 'medium';
  
  // Low: Audit logs
  if (event.type === 'StaffAuditEvent') return 'low';
  
  return 'low';
}
```

---

### Step 4: Filter Critical Events (for Gmail)
**Node Type**: `Filter`

**Condition:** `event.severity === 'critical'`

This creates a branch for critical events only.

---

### Step 5A: Route to Notion (All Events)
**Node Type**: `Notion Database`

**Configuration:**
- **Operation**: `Append a database item`
- **Database ID**: `{{ $env.NOTION_OPERATIONAL_LOG_DB_ID }}`
- **Database**: Select "Operational Log" from your Notion workspace

**Field Mapping:**
```
Title: {{ event.type | capitalize }} - {{ event.data.memberId }}
Event Type: {{ event.type }}
Status: {{ event.data.decision || 'pending' }}
Severity: {{ event.severity }}
Timestamp: {{ event.occurredAt }}
Member ID: {{ event.data.memberId }}
Locker ID: {{ event.data.lockerId }}
Room ID: {{ event.data.roomId }}
Decision: {{ event.data.decision }}
Denial Reason: {{ event.data.denialReasonCode }}
Raw Data: {{ JSON.stringify(event.data) }}
Polled At: {{ $now().toISOString() }}
```

(Configure Notion fields below in "Notion Schema Setup" section)

---

### Step 5B: Route Critical Events to Gmail
**Node Type**: `Gmail`
(Connected to the "Filter Critical Events" output)

**Configuration:**
- **Operation**: `Send Email`
- **To Email**: `{{ $env.STAFF_DIGEST_EMAIL }}`
- **Subject**: `🚨 AO OS Critical Event: {{ event.type }}`
- **Message Type**: `HTML`
- **Message Body**: 

```html
<h2>Critical Event Alert</h2>
<p><strong>Event Type:</strong> {{ event.type }}</p>
<p><strong>Occurred At:</strong> {{ event.occurredAt }}</p>
<p><strong>Status:</strong> {{ event.data.decision || 'N/A' }}</p>
<p><strong>Member:</strong> {{ event.data.memberId }}</p>
<p><strong>Details:</strong></p>
<pre>{{ JSON.stringify(event.data, null, 2) }}</pre>
<hr>
<p><a href="https://operations.ao-os.local/dashboard">View Dashboard</a></p>
```

---

### Step 6: Continue → Notion (All Events)
**Node Type**: `Set`

**Action**: Route all events to Notion regardless of severity.

**Configuration:**
- Connect the HTTP Response output (Step 2) directly to Notion node
- Inside the Notion node, use `Loop Over Items` to process each event

---

## N8N Workflow Summary (Visual Structure)

```
[Cron 30min] 
    ↓
[HTTP GET /events/poll]
    ↓
[Extract Events + Score Severity]
    ↓
    ├─→ [Filter: severity === 'critical']
    │       ↓
    │   [Gmail: Send Alert]
    │
    └─→ [All Events]
           ↓
        [Notion: Append to Operational Log]
```

---

## Environment Variables (Add to N8N)

Set these in N8N credentials manager:

```env
# Notion
NOTION_OPERATIONAL_LOG_DB_ID=<database-id>

# Gmail
STAFF_DIGEST_EMAIL=operations@ao-os.local

# AO OS API
AO_OS_API_BASE=https://api.aosanctuary.com/v1
AO_OS_API_KEY=<staff-api-token>
```

---

## Testing the Workflow

1. **Deploy** the workflow in N8N
2. **Trigger manually** (don't wait 30 mins)
3. **Check Notion**: Events should appear in Operational Log after ~5s
4. **Check Gmail**: Critical events should arrive in operations inbox
5. **View N8N logs** for any errors

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No events polled" | Check `lastPolledAt` cursor - may need manual reset |
| Notion connection fails | Verify Notion DB ID and API key in credentials |
| Gmail auth fails | Reauthorize Gmail account in N8N UI |
| Filter not working | Check that `event.severity` is being computed in Step 3 |
| Events missing from Notion | Check N8N execution logs - may be a field mapping issue |

---

## Next: Phase 2 (Daily Digests)

Once polling is working, Phase 2 adds:
- Daily scheduler (8 AM)
- Aggregate stats (bookings, cleaning, wristbands)
- Notion Automation Log
- Gmail management summary

---

## Notion Property Remap (Required After DB Changes)

Whenever the Notion database schema changes or node configurations become stale, follow this pattern to reset the property mappings:

1. Open the **Notion** node in the workflow canvas.
2. **Re-select the database** from the dropdown — this clears stale property IDs.
3. **Delete all old mapped properties** (click the trash icon on each row).
4. **Add fresh property mappings** using only the fields that exist in your database. Example for operational log:

   | Property | Type | Value |
   |----------|------|-------|
   | **Title** | title | `={{$json.type}} - {{$json.data.memberId &#124;&#124; 'System'}}` |
   | **Event Type** | select | `={{$json.type}}` |
   | **Status** | select | `={{$json.data.decision &#124;&#124; 'pending'}}` |
   | **Severity** | select | `={{$json.severity}}` |
   | **Timestamp** | date | `={{$json.occurredAt}}` |
   | **Member ID** | rich text | `={{$json.data.memberId}}` |
   | **Locker ID** | rich text | `={{$json.data.lockerId}}` |
   | **Room ID** | rich text | `={{$json.data.roomId}}` |
   | **Decision** | rich text | `={{$json.data.decision}}` |
   | **Denial Reason** | rich text | `={{$json.data.denialReasonCode}}` |
   | **Raw Data** | rich text | `={{JSON.stringify($json.data)}}` |
   | **Polled At** | date | `={{$now}}` |

5. Click **Execute previous nodes** from the Notion node and confirm one row appears in Notion.

> **Tip**: Always run the health-check workflow first (`AO OS Auth Health Check`) to confirm auth is working before testing the full polling flow.

---
