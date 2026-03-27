# Sprint 4B Phase 1: Event Polling Implementation Guide

## Overview

**Objective**: Make AO OS workflows visible to staff via event routing and operational digests.

**Phase 1 Scope**: Event consumption (all 8 event types) → Notion Operational Log + Gmail alerts (critical events only)

**Architecture**:
- N8N polls AO OS API every 30 minutes
- API returns all new events since last poll (idempotent via cursors)
- N8N routes to: Notion (all events) + Gmail (critical events only)
- Staff access Notion dashboard for full event history

---

## What Was Built

### 1. API Infrastructure

**New Migration**: `20260326140000_add_event_polling_cursor`
- Adds `EventPollingCursor` table to track polling state per event type
- Initializes 8 cursors (starts at deployment time)
- Enables idempotent polling (no duplicate events)

**New API Module**: `apps/api/src/events-polling/`
- **Service**: `EventsPollingService` 
  - Polls all 8 event tables
  - Scores event severity (critical/high/medium/low)
  - Returns events since last poll
  - Updates cursor automatically
  
- **Controller**: `EventsPollingController`
  - Endpoint: `GET /v1/events/poll?since=<optional-iso-timestamp>`
  - Auth: JWT + role guard (admin/operations only)
  - Response: 200 with PolledEventsResponse

**Integration**: Added to `apps/api/src/app.module.ts`

---

## Event Types Supported

| Type | Source Table | Key Fields | Severity |
|------|-------------|-----------|----------|
| **LockerAccessEvent** | LockerAccessEvent | memberId, lockerId, decision, denialReasonCode | high |
| **LockerPolicyDecisionEvent** | LockerPolicyDecisionEvent | decision, reasonCode (watches for HARD_BLOCKED) | critical |
| **AccessAttempt** | AccessAttempt | memberId, decision, denialReasonCode | high |
| **PresenceEvent** | PresenceEvent | memberId, eventType (entry/exit) | medium |
| **RoomAccessEvent** | RoomAccessEvent | bookingId, decision, eventType | high |
| **StaffAuditEvent** | StaffAuditEvent | eventType, outcome (watches for "blocked") | critical + low |
| **CleaningTask** | CleaningTask | status (open/in_progress/completed) | medium |
| **RoomBooking** | Booking | status (created/checked_in/checked_out) | medium |

---

## Severity Scoring Rules

Events from the API are pre-scored for routing:

- **CRITICAL** (Gmail alert + Notion):
  - Any event with `decision: 'denied'`
  - StaffAuditEvent with `outcome: 'blocked'`
  - LockerPolicyDecisionEvent with `reasonCode: 'HARD_BLOCKED'`
  
- **HIGH** (Notion only):
  - LockerAccessEvent, AccessAttempt, RoomAccessEvent
  
- **MEDIUM** (Notion only):
  - CleaningTask, RoomBooking, PresenceEvent
  
- **LOW** (Notion only):
  - Informational StaffAuditEvents

---

## Setup Steps

### Step 1: Deploy API Changes
```bash
cd c:\Users\Jason van Ravenswaay\AO-OS

# Apply migration
pnpm exec prisma migrate deploy

# Build API
pnpm --filter api build

# Restart API server
pnpm --filter api dev
```

### Step 2: Get API Authentication Token

You need a valid JWT token to authenticate N8N polling:

**Option A: Use an existing staff user:**
```bash
# Login as staff user via web UI, copy JWT from browser dev tools (Application → Cookies)
```

**Option B: Create a service account:**
```bash
# Use a dedicated operations staff account (created in staff management UI)
# Generate OAuth token or use API key (if you implement one)
```

Store this token securely in N8N.

### Step 3: Create Notion Database

Follow [docs/NOTION_OPERATIONAL_LOG_SCHEMA.md](../../docs/NOTION_OPERATIONAL_LOG_SCHEMA.md):

1. Create "AO OS - Operational Log" database in Notion
2. Set up required fields (Event Type, Status, Severity, Timestamp, etc.)
3. Create suggested views (Critical this hour, By Type, Access Denials)
4. Copy Database ID for N8N configuration

### Step 4: Build N8N Workflow

Follow [apps/api/test/smoke/N8N_PHASE1_POLLING_WORKFLOW.md](../../apps/api/test/smoke/N8N_PHASE1_POLLING_WORKFLOW.md):

1. Create Cron trigger (every 30 minutes)
2. Add HTTP request to `GET /v1/events/poll`
3. Parse response and score severity
4. Route to Notion (all events)
5. Route critical events to Gmail
6. Test manually before scheduling

### Step 5: Configure N8N Credentials

In N8N UI:

**1. Add Notion Integration:**
   - Credentials type: Notion
   - Authorize with Notion account
   - Select "AO OS - Operational Log" database

**2. Add Gmail Integration:**
   - Credentials type: Gmail
   - Authorize with operations email
   - Allow sending on behalf of account

**3. Add Environment Variables:**
   - `NOTION_OPERATIONAL_LOG_DB_ID=<database-id>`
   - `STAFF_DIGEST_EMAIL=operations@ao-os.local`
   - `AO_OS_API_BASE=http://localhost:4000/v1`

---

## API Endpoint Reference

### GET /v1/events/poll

**Authentication**: JWT Bearer token (staff, admin/operations role)

**Query Parameters**:
- `since`: (optional) ISO timestamp to retrieve events after. If omitted, uses last poll cursor.

**Example Request**:
```bash
curl -X GET http://localhost:4000/v1/events/poll \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json"
```

**Example Response** (200 OK):
```json
{
  "lastPolledAt": "2026-03-26T14:30:00.000Z",
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "LockerAccessEvent",
      "occurredAt": "2026-03-26T14:25:30.000Z",
      "data": {
        "memberId": "member-123",
        "lockerId": "locker-456",
        "wristbandId": "wristband-789",
        "decision": "denied",
        "denialReasonCode": "MEMBER_SUSPENDED",
        "eventType": "open_attempt",
        "sourceReference": "reader-01"
      }
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "type": "CleaningTask",
      "occurredAt": "2026-03-26T14:26:15.000Z",
      "data": {
        "roomId": "room-abc",
        "taskType": "turnover",
        "status": "completed",
        "assignedToStaffUserId": "staff-xyz",
        "notes": "Room ready for next booking"
      }
    }
  ],
  "eventCounts": {
    "LockerAccessEvent": 5,
    "LockerPolicyDecisionEvent": 0,
    "AccessAttempt": 2,
    "PresenceEvent": 3,
    "RoomAccessEvent": 1,
    "StaffAuditEvent": 0,
    "CleaningTask": 2,
    "RoomBooking": 1
  }
}
```

**Error Responses**:
```json
// 400 Bad Request - Invalid "since" parameter
{ "message": "INVALID_SINCE_DATE", "statusCode": 400 }

// 401 Unauthorized - Invalid JWT
{ "message": "Unauthorized", "statusCode": 401 }

// 403 Forbidden - User doesn't have admin/operations role
{ "message": "Forbidden", "statusCode": 403 }
```

---

## Testing the Complete Flow

### 1. Local Testing (Before Deploying N8N)

**Test API Endpoint:**
```bash
# Getting a valid token (from login or staff creation)
TOKEN="<valid-jwt-token>"

# Poll for events
curl -X GET "http://localhost:4000/v1/events/poll" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

Expected: JSON response with events and counts.

**Trigger Events to Test:**
1. Open the web UI → Lockers page
2. Try to assign a locker (creates LockerAccessEvent)
3. Try to assign a cleaning task (creates CleaningTask)
4. Create a booking (creates RoomBooking)
5. Run `curl` above → should see new events

### 2. N8N Workflow Testing

1. Deploy workflow in N8N
2. Click "Trigger test" manually (don't wait 30 mins)
3. Check N8N logs → should show:
   - HTTP request returned 200
   - Events parsed successfully
   - Notion append succeeded (check database)
   - Gmail sent (if critical events present)

### 3. Verify Notion Integration

1. Open Notion dashboard → Operational Log
2. Should see recent events with:
   - Event type populated
   - Severity colored
   - Timestamp showing poll time
   - Member/Locker/Room IDs linked

### 4. Verify Gmail Integration

1. Check operations email inbox
2. Should see email with subject: `🚨 AO OS Critical Event: LockerAccessEvent`
3. Email body shows:
   - Event type and timestamp
   - Decision (denied)
   - Member ID
   - Full JSON payload

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| API returns 401 | JWT token expired or invalid | Re-authenticate to get fresh token |
| "No events found" | Polling cursor ahead of actual events | Manually reset cursor in database |
| Notion connection times out | Bad database ID | Double-check Database ID in N8N |
| Gmail auth fails | Permissions issue | Re-authorize Gmail account in N8N |
| Events duplicate in Notion | Cursor not updating | Check N8N logs for errors in update step |
| Only recent events appear | `lastPolledAt` set too late | Manually query with earlier `since` timestamp |

---

## Next: Phase 2 (Daily Digests)

After Phase 1 is stable, Phase 2 adds:

- **Daily Scheduler**: Fires at 8 AM UTC
- **Aggregation**: Collects stats from last 24h
  - Total bookings created/checked-in/checked-out
  - Cleaning tasks completed
  - Wristbands issued/suspended
  - Hard-block incidents
- **Delivery**:
  - Notion: Append to "Automation Log" page
  - Gmail: Summary email to management
- **Scope**: Still read-only from AO OS (no business logic)

---

## API Deployment Checklist

- [ ] Migration applied successfully
- [ ] API builds without errors
- [ ] New endpoint responds at `GET /v1/events/poll`
- [ ] Authentication kicks in (401 without token)
- [ ] Test polling with valid JWT returns events
- [ ] All 8 event types working
- [ ] Cursor updates after each poll
- [ ] Git commit ready

---

## Files Modified/Created

**API:**
- `apps/api/src/events-polling/` (new module)
  - `events-polling.service.ts`
  - `events-polling.controller.ts`
  - `events-polling.module.ts`
- `apps/api/src/app.module.ts` (import EventsPollingModule)
- `prisma/migrations/20260326140000_add_event_polling_cursor/` (new)

**Documentation:**
- `docs/NOTION_OPERATIONAL_LOG_SCHEMA.md` (Notion setup guide)
- `apps/api/test/smoke/N8N_PHASE1_POLLING_WORKFLOW.md` (N8N workflow)
- `SPRINT_4B_PHASE1_IMPLEMENTATION.md` (this file)

---

## Commit Summary

```
Sprint 4B Phase 1: Event polling infrastructure (API + Notion + N8N docs)

- Add EventPollingCursor migration for idempotent polling
- Create EventsPollingService with all 8 event type handlers
- Add /v1/events/poll endpoint (JWT auth, admin/operations role)
- Implement severity scoring (critical/high/medium/low)
- Document Notion Operational Log database schema
- Provide complete N8N workflow guide (Cron + HTTP + Notion + Gmail)
- Include setup instructions and troubleshooting guide

Phase 1 enables staff to view real-time operational events in Notion
and get critical alerts via Gmail (hard-blocks, access denials).
```

---
