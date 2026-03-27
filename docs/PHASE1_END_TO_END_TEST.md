# Phase 1 End-to-End Testing Guide

## Goal
Generate test events → Poll API → Verify Notion/Gmail

**Time**: ~10-15 minutes

---

## Step 1: Generate Test Events (5 min)

### Create a Locker Access Event
1. Open http://localhost:3000 (AO OS web UI)
2. Go to **Lockers** page (left nav)
3. Click **Evaluate Policy** or **Assign Locker** button
4. Fill in any member ID (can be fake UUID format)
5. Submit form
6. ✓ Creates `LockerAccessEvent` + `LockerPolicyDecisionEvent`

### Create a Room Booking Event
1. Go to **Bookings** page
2. Click **Create Booking**
3. Fill in:
   - Member ID: any UUID
   - Access Zone: any from dropdown
   - Dates: today + tomorrow
   - Click **Create**
4. ✓ Creates `RoomBooking` event

### Create a Cleaning Task Event
1. Go to **Cleaning** page
2. Click **Create Task** or use existing room
3. Click **Start Cleaning**
4. ✓ Creates `CleaningTask` event (status changed)

### Generate an Access Denial (for critical alert)
1. Go to **Lockers** page
2. Look for a member with "SUSPENDED" status (or create one in Members)
3. Try to **Assign Locker** with suspended member
4. ✓ Creates denied `LockerAccessEvent` → Should trigger critical severity

**Now you have ~4-6 events in the database ready to poll.**

---

## Step 2: Get JWT Token (2 min)

You're already logged into http://localhost:3000, so you have a valid session.

### Option A: From Browser Cookie (Easiest)
1. Press `F12` (Dev Tools)
2. Go to **Application** tab
3. Click **Cookies** → `http://localhost:3000`
4. Find cookie value (looks like `eyJ...`)
5. Copy the entire value
6. **Save it** — you'll use it next

### Option B: From API Login (If cookies missing)
```powershell
$body = @{
    email = "staff@ao-os.local"
    password = "your-password"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:4000/v1/auth/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"

$token = ($response.Content | ConvertFrom-Json).accessToken
Write-Output $token
```

---

## Step 3: Test Polling Endpoint (3 min)

### Verify API is Running
```powershell
cd c:\Users\Jason van Ravenswaay\AO-OS

# Check if API is running
$headers = @{ 'Authorization' = 'Bearer test' }
try {
    Invoke-WebRequest -Uri "http://localhost:4000/v1/health" -ErrorAction Stop
    Write-Output "✓ API is running"
} catch {
    Write-Output "✗ API not running. Start it: pnpm --filter api dev"
}
```

### Test Polling Endpoint
```powershell
# Replace YOUR_JWT_TOKEN with actual token from Step 2
$token = "YOUR_JWT_TOKEN"

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

$response = Invoke-WebRequest -Uri "http://localhost:4000/v1/events/poll" `
  -Headers $headers `
  -Method Get `
  -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 200) {
    Write-Output "✓ Polling endpoint returned 200"
    
    $body = $response.Content | ConvertFrom-Json
    Write-Output "Events polled: $($body.eventCounts)"
    Write-Output ""
    Write-Output "Event breakdown:"
    $body.eventCounts | ConvertTo-Json
    
    Write-Output ""
    Write-Output "Sample events:"
    $body.events | Select-Object -First 3 | ConvertTo-Json
} else {
    Write-Output "✗ Failed: $($response.StatusCode) - $($response.Content)"
}
```

**Expected output:**
```
✓ Polling endpoint returned 200
Events polled: @{LockerAccessEvent=1; RoomBooking=1; CleaningTask=1; ...}

Event breakdown:
{
  "LockerAccessEvent": 1,
  "LockerPolicyDecisionEvent": 0,
  "AccessAttempt": 0,
  ...
}

Sample events:
[
  {
    "id": "550e8400-...",
    "type": "LockerAccessEvent",
    "occurredAt": "2026-03-26T14:25:30Z",
    "data": { "memberId": "...", "decision": "allowed", ... }
  },
  ...
]
```

If you see this → **API is working correctly!** ✓

---

## Step 4: Trigger N8N Workflow (2 min)

### In N8N Cloud

1. Open [n8n.cloud](https://app.n8n.cloud)
2. Go to your **"AO OS Events Polling - Phase 1"** workflow
3. Click **Test** button (top right, play icon)
4. Watch the execution flow through:
   - Cron (trigger)
   - HTTP Request (should return 200 + events)
   - Extract Events (should show count)
   - Loop Over Items (should process each event)
   - Notion append (should show success)
   - Gmail (if critical events, should show sent)

**Check N8N Execution Logs:**
- If any step fails, click it to see error details
- Common issues: wrong JWT, database ID, Gmail auth

---

## Step 5: Verify Notion Entries (2 min)

### Check Notion Database

1. Open [notion.so](https://notion.so)
2. Go to **"AO OS - Operational Log"** database
3. Refresh page (Cmd/Ctrl + R)
4. **Should see new rows:**
   - Event Type populated
   - Status showing (allowed/denied/completed)
   - Severity colored (red/orange/yellow/gray)
   - Timestamp showing poll time
   - Raw JSON in data column

**If you see rows → Notion integration working!** ✓

### Check Gmail (for critical events)

1. Open Gmail
2. Look for email with subject: `🚨 AO OS Critical Event: ...`
3. Email should contain:
   - Event type
   - Member ID
   - Full JSON payload

**If you see email → Gmail routing working!** ✓

---

## Troubleshooting During Test

| Step | Issue | Fix |
|------|-------|-----|
| **1: Events** | No events showing in UI | Make sure you actually submitted forms (submit button clicked) |
| **2: Token** | Can't find cookie | Check you're logged in. Try Option B (API login). |
| **3: API** | Returns 401 | Token invalid or expired. Get fresh one from browser. |
| **3: API** | Returns 404 | API not running. `pnpm --filter api dev` |
| **3: API** | Returns empty events | Polling cursor may have moved past events. Reset by querying with `?since=2026-03-26T00:00:00Z` |
| **4: N8N** | HTTP step fails | Check Bearer token again, verify API URL |
| **4: N8N** | Notion append fails | Database ID wrong, or integration not connected | 
| **5: Notion** | No rows appear | Check N8N logs for Notion errors, verify DB connection |
| **5: Gmail** | No email sent | No critical events, or Gmail auth failed |

---

## Test Checklist

```
Phase 1 End-to-End Test Checklist
==================================

[ ] Generated locker access event
[ ] Generated room booking event
[ ] Generated cleaning task event
[ ] Got JWT token from browser
[ ] API endpoint responds 200
[ ] Polling returns events JSON
[ ] N8N workflow ran without errors
[ ] Events appear in Notion (all types)
[ ] Notion fields populated correctly
[ ] Critical event triggered Gmail alert
[ ] Gmail email delivered and formatted correctly

If all checked → Phase 1 is working! 🎉
```

---

## Next Steps After Successful Test

1. **Leave workflow active** (toggle Active = ON) for 30 mins
2. **Monitor Notion for new events** every 30 mins
3. **No changes needed** to AO OS (N8N is observation-only)
4. **If stable for 2-3 hours**, proceed to Phase 2 (daily digests)

---
