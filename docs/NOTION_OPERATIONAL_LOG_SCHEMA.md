# Notion Database Schema for Operational Log

## Database: Operational Log

### Purpose
Centralized, searchable log of all AO OS events. Staff can view, filter, and search recent activity.

### Fields to Create in Notion

| Field Name | Type | Description | Format | Required |
|------------|------|-------------|--------|----------|
| **Title** | Title | Event summary | Auto-generated from type + actor | Yes |
| **Event Type** | Select | Classification | LockerAccessEvent, RoomAccessEvent, CleaningTask, etc. | Yes |
| **Status** | Select | Event outcome | allowed, denied, completed, pending, etc. | Yes |
| **Severity** | Select | Alert level | critical, high, medium, low | Yes |
| **Timestamp** | Date | When event occurred | ISO datetime format | Yes |
| **Member ID** | Text | Affected member | UUID (short display) | No |
| **Locker ID** | Text | Affected locker | UUID (short display) | No |
| **Room ID** | Text | Affected room | UUID (short display) | No |
| **Decision** | Text | Access decision | "allowed" / "denied" / "error" | No |
| **Denial Reason** | Text | Why denied | E.g., "HARD_BLOCKED", "MEMBER_SUSPENDED" | No |
| **Raw Data** | Text | Full event JSON | Collapsed for readability | No |
| **Polled At** | Date | When event was indexed | ISO datetime | No |

---

## Setup Instructions (Notion UI)

### 1. Create Database
1. In Notion, click **+ New** → **Database** → **Table**
2. Name it: **AO OS - Operational Log**
3. Copy the **Database ID** from the URL: `https://notion.so/<WORKSPACE>/<DATABASE_ID>?v=...`

### 2. Create Fields

**Title Field** (auto-created):
- **Type**: Title
- **Description**: "Event type + actor (auto-filled)"

**Event Type**:
- **Type**: Select
- **Options**: 
  - LockerAccessEvent
  - LockerPolicyDecisionEvent
  - AccessAttempt
  - PresenceEvent
  - RoomAccessEvent
  - StaffAuditEvent
  - CleaningTask
  - RoomBooking
- **Color**: Purple

**Status**:
- **Type**: Select
- **Options**:
  - allowed
  - denied
  - completed
  - in_progress
  - pending
  - cancelled
  - error
- **Color**: Blue

**Severity**:
- **Type**: Select
- **Options**:
  - critical (Red)
  - high (Orange)
  - medium (Yellow)
  - low (Gray)
- **Color**: Varies by option

**Timestamp**:
- **Type**: Date (with time)
- **Format**: `MMM D, YYYY h:mm A`
- **Time zone**: UTC

**Member ID**:
- **Type**: Text
- **Description**: "UUID of member involved"

**Locker ID**:
- **Type**: Text
- **Description**: "UUID of locker involved"

**Room ID**:
- **Type**: Text
- **Description**: "UUID of room involved"

**Decision**:
- **Type**: Text
- **Description**: "allowed / denied / error / pending"

**Denial Reason**:
- **Type**: Text
- **Description**: "Reason code if access denied"

**Raw Data**:
- **Type**: Text
- **Format**: Code block (JSON)
- **Description**: "Full event payload for debugging"

**Polled At**:
- **Type**: Date (with time)
- **Format**: `MMM D, YYYY h:mm A`
- **Description**: "When event was indexed"

---

## Suggested Views

### 1. All Events (Default)
- **Sort**: Timestamp descending (newest first)
- **Filter**: None
- **Properties**: Title, Event Type, Status, Severity, Timestamp, Member ID

### 2. Critical Events This Hour
- **Filter**: 
  - Severity = critical
  - Timestamp >= now() - 1 hour
- **Sort**: Timestamp descending

### 3. By Event Type
- **Group By**: Event Type
- **Sort**: Timestamp descending
- **Filter**: None

### 4. Access Denials
- **Filter**:
  - Status = denied
  - Timestamp >= now() - 24 hours
- **Sort**: Timestamp descending

### 5. Operational Updates
- **Filter**:
  - Event Type = CleaningTask OR RoomBooking
  - Status = completed
- **Sort**: Timestamp descending

---

## Connect to N8N

Once your database is created:

1. **Get Database ID**:
   - Open the database in Notion
   - Copy from URL: `https://notion.so/<WORKSPACE>/<DATABASE_ID>?v=...`
   - E.g.: `abc123def456ghi789jkl012`

2. **Connect N8N to Notion**:
   - In N8N, create **Notion** credentials
   - Authorize with your Notion account
   - Select the **AO OS - Operational Log** database

3. **Test Connection**:
   - In N8N workflow, add Notion node
   - Select "Append database item" operation
   - Select your database
   - Test a sample event insertion

---

## Optional: Add Automation to Notion

### Auto-Notify on Critical Events
After events are in Notion, add Notion automations:

1. **Trigger**: When Status = "denied" AND Severity = "critical"
2. **Action**: Send Slack notification to #operations

This keeps the team aware without Gmail overload.

---

## FAQ

**Q: Can I manually add events?**
A: Yes, but N8N will overwrite if polling again. Keep manual entries in a separate view for notes.

**Q: How long are events retained?**
A: Notion has unlimited storage. Consider archiving old events monthly.

**Q: Can I export this data?**
A: Yes, Notion supports CSV export. Use for compliance/audits.

**Q: What if N8N fails to append?**
A: Check N8N error logs → Notion auth token not refreshed. Re-authenticate in N8N.

---
