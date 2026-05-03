# N8N Workflow Quick Reference

> **Connector config**: [`n8n/connector.config.json`](../n8n/connector.config.json)  
> **Full connector guide**: [`docs/N8N_CONNECTOR_SETUP.md`](N8N_CONNECTOR_SETUP.md)

---

## Direction 1: n8n → Notion (Outbound Polling)

### Visual Flow

```
┌─────────────────┐
│  Cron Trigger   │ (Every 30 min: */30 * * * *)
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│  HTTP GET                │ https://api.aosanctuary.com/v1/events/poll
│  Bearer: <JWT-token>     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Extract Events Array    │ (Set node with expression)
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Loop Over Events        │ (ForEach item in events)
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Score Severity          │ (critical/high/medium/low)
└────────┬─────────────────┘
         │
    ┌────┴────┐
    │          │
  Critical   Other
    │          │
    ▼          ▼
┌────────┐  ┌────────────────┐
│ Gmail  │  │ Notion (All)   │
│(Alert) │  │(Append DB item)│
└────────┘  └────────────────┘
```

---

## Direction 2: Notion → n8n (Inbound Webhook)

### Visual Flow

```
[Notion Automation]
       ↓  POST with x-notion-secret header
[n8n Webhook]  https://ao-os.app.n8n.cloud/webhook/ao-os/notion-event
       ↓
[Validate Secret]
       ↓
[Parse Notion Payload]
       ↓
  ┌────┴────────────────────┐
api_action              other event
  ↓                         ↓
[Get Auth Token]    [Update Notion Status]
  ↓
[POST to AO OS API]
  ↓
[Respond 200 OK]
```

### Webhook Endpoint

```
Method: POST
URL: https://ao-os.app.n8n.cloud/webhook/ao-os/notion-event
Header: x-notion-secret: <NOTION_WEBHOOK_SECRET>
```

---

## Key Values Reference

### Cron Expression
```
*/30 * * * *
├─ Every 30 minutes
├─ Any hour
├─ Any day of month
├─ Any month
└─ Any day of week
```

### API Request
```
URL: https://api.aosanctuary.com/v1/events/poll
Method: GET
Auth: Bearer <JWT-token>
```

### Event Type Options
- LockerAccessEvent
- LockerPolicyDecisionEvent
- AccessAttempt
- PresenceEvent
- RoomAccessEvent
- StaffAuditEvent
- CleaningTask
- RoomBooking

### Severity Rules
```javascript
if (decision === 'denied') → 'critical'
if (reasonCode === 'HARD_BLOCKED') → 'critical'
if (outcome === 'blocked') → 'critical'
else if (type in [Locker, Room, Access]) → 'high'
else if (type in [Cleaning, Booking, Presence]) → 'medium'
else → 'low'
```

### Notion Field Mappings
```
Title → ${item.type} - ${actor}
Event Type → item.type
Status → item.data.decision
Severity → item.severity (calculated)
Timestamp → item.occurredAt
Member ID → item.data.memberId
Locker ID → item.data.lockerId
Room ID → item.data.roomId
Decision → item.data.decision
Denial Reason → item.data.denialReasonCode
Raw Data → JSON.stringify(item.data)
Polled At → $now.toIso()
```

---

## Setup Checklist

### Health Check Workflow (Run First)

- [ ] Import `n8n/workflows/health-check.json` (or create manually)
- [ ] Auth Login node: POST `https://api.aosanctuary.com/v1/auth/login`
- [ ] Auth Login body: `{"email": "staff@ao-os.local", "password": "TestPassword123!"}`
- [ ] Execute Auth Login → confirm HTTP 200 + `accessToken` in output
- [ ] Log Success (Notion): re-select DB from dropdown
- [ ] Log Success: add only 4 properties (Name, Workflow Name, Status, Timestamp)
- [ ] Log Failure (Notion): keep **disabled**
- [ ] Execute workflow → confirm 1 row in Notion

### Polling Workflow (After Health Check Passes)

- [ ] Notion database created: "AO OS - Operational Log"
- [ ] All 12 fields added to Notion
- [ ] Notion integration token created
- [ ] Database connected to Notion integration
- [ ] N8N credentials created: "Notion - AO OS"
- [ ] N8N workflow created: "AO OS Events Polling - Phase 1"
- [ ] Cron node: `*/30 * * * *`
- [ ] HTTP Request node: GET /v1/events/poll with Bearer token
- [ ] Extract Events node: Parse response array
- [ ] Loop Over Items node: Iterate events
- [ ] Severity scoring: JavaScript logic added
- [ ] Conditional: severity === 'critical'
- [ ] Notion node (all events path)
- [ ] Gmail node (critical path)
- [ ] Test workflow manually
- [ ] Verify Notion entries
- [ ] Verify Gmail sent
- [ ] Activate workflow (toggle Active = ON)
- [ ] Monitor Executions tab

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| 401 Unauthorized | JWT expired → get new token from web UI login |
| 404 Not Found | API not running → check `pnpm --filter api dev` |
| "Invalid database ID" | Copy/paste Database ID again from Notion URL |
| Notion connection timeout | Check integration token is valid in Notion settings |
| Gmail auth failed | Re-authenticate Gmail at N8N Credentials |
| "No notifications enabled" | Check Gmail account allows less-secure apps OR use app password |

---

## Optional: Create Sample Event

To test without waiting 30 mins, create an event in AO OS UI:

1. Open http://localhost:3000 (web UI)
2. Go to **Lockers** page
3. Try to **Assign Locker** (creates LockerAccessEvent)
4. Go back to N8N
5. Click **Test** on workflow
6. Should see new event in HTTP response
7. Check Notion database for new row

---
