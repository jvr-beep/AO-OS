# AO OS Postman Scenario Matrix

Purpose: verify the hardening pass for access control and presence event guards.

## Environment

Set these Postman environment variables:

- `baseUrl` = `http://localhost:4000/v1`
- `memberId` = `5d211c05-b810-4f4b-aad4-ad465e60a5df`
- `openZoneId` = `dddddddd-0000-0000-0000-000000000001`
- `reservedZoneId` = `eeeeeeee-0000-0000-0000-000000000001`
- `locationId` = `aaaaaaaa-0000-0000-0000-000000000001`
- `openZonePointId` = `aaaa1111-0000-0000-0000-000000000001`
- `reservedZonePointId` = `aaaa2222-0000-0000-0000-000000000001`

Important for local dev:
- Before testing rooms/floor-plans/bookings/cleaning endpoints, apply the rooms migration:
  - `prisma/migrations/20260325170000_rooms_floorplans_bookings_cleaning/migration.sql`
  - If this migration is not applied, requests can fail with HTTP 500 due to missing tables (for example `Room` and `CleaningTask`).

## One-Time Local Data Setup

Run after migrations, before testing:

```sql
-- Base location
INSERT INTO "Location" (id, code, name, "createdAt")
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'AO_MAIN', 'AO Main Floor', NOW())
ON CONFLICT (id) DO NOTHING;

-- Zones
INSERT INTO "AccessZone" (id, code, name, "requiresBooking", "createdAt")
VALUES ('dddddddd-0000-0000-0000-000000000001', 'OPEN_AREA', 'Open Area', false, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "AccessZone" (id, code, name, "requiresBooking", "createdAt")
VALUES ('eeeeeeee-0000-0000-0000-000000000001', 'RESERVED_ZONE', 'Reserved Zone', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Access points mapped to the correct zone
INSERT INTO "AccessPoint" (id, "locationId", "accessZoneId", code, name, "createdAt")
VALUES (
  'aaaa1111-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000001',
  'OPEN_SCANNER',
  'Open Area Scanner',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "AccessPoint" (id, "locationId", "accessZoneId", code, name, "createdAt")
VALUES (
  'aaaa2222-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'eeeeeeee-0000-0000-0000-000000000001',
  'RES_SCANNER',
  'Reserved Zone Scanner',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Access grant for OPEN_AREA
INSERT INTO "MemberAccessGrant" (id, "memberId", "accessZoneId", "validFrom", "validUntil", active, "createdAt")
VALUES (
  'ffffffff-0000-0000-0000-000000000001',
  '5d211c05-b810-4f4b-aad4-ad465e60a5df',
  'dddddddd-0000-0000-0000-000000000001',
  NULL,
  NULL,
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;
```

Note: booking-allowed status is now `reserved` or `checked_in`. If older seeds use `confirmed`, update them for these tests.

## Matrix

| ID | Scenario | Endpoint | Expected |
|---|---|---|---|
| A1 | Allow with active member + valid subscription + valid zone grant | `POST /access-attempts` | `decision = allowed` |
| A2 | Deny with explicit deny override | `POST /access-attempts` | `decision = denied`, `denialReasonCode = ZONE_ACCESS_EXPLICITLY_DENIED` |
| A3 | Deny when booking-required zone has no valid booking | `POST /access-attempts` | `decision = denied`, `denialReasonCode = ZONE_BOOKING_REQUIRED` |
| A4 | Allow check-in with `trialing` subscription | `POST /visit-sessions/check-in` | `status = checked_in` |
| A5 | Deny presence event on checked-out session | `POST /presence-events` | HTTP 403 with `VISIT_SESSION_CLOSED` |

---

## Rooms Slice Verified Behavior (2026-03-25)

Manual verification confirms the following for the rooms/bookings/cleaning flow:

- Overlapping room bookings are not hard-denied.
- Overlapping room bookings are created with `status = waitlisted`.
- Room state progression for a cleaning-required room is:
  - `booked` after reserved booking creation
  - `occupied` after booking check-in
  - `cleaning` after booking check-out (turnover task created)
  - `booked` or `available` after cleaning completion:
    - `booked` if a waitlisted booking was promoted to reserved
    - `available` if no active reservation remains

Observed denial codes during room access verification:
- `NO_ACTIVE_BOOKING` (attempt before booking window)
- `ROOM_ACCESS_WRISTBAND_MISMATCH` (wristband assignment member does not match booking member)

---

## A1: Allow with valid grant

Request:

- Method: `POST`
- URL: `{{baseUrl}}/access-attempts`
- Body:

```json
{
  "memberId": "{{memberId}}",
  "accessPointId": "{{openZonePointId}}",
  "accessZoneId": "{{openZoneId}}",
  "attemptSource": "postman-matrix-a1",
  "occurredAt": "{{$isoTimestamp}}"
}
```

Tests:

```javascript
pm.test("A1 status is 201", function () {
  pm.response.to.have.status(201);
});

const body = pm.response.json();
pm.test("A1 allowed", function () {
  pm.expect(body.decision).to.eql("allowed");
  pm.expect(body.denialReasonCode ?? null).to.eql(null);
});
```

---

## A2: Deny override wins first

Precondition SQL:

```sql
INSERT INTO "MemberAccessOverride" (
  id, "memberId", "accessZoneId", action, reason, "grantedByStaffUserId", "validFrom", "validUntil", "createdAt"
)
VALUES (
  'aaaa3333-0000-0000-0000-000000000001',
  '5d211c05-b810-4f4b-aad4-ad465e60a5df',
  'dddddddd-0000-0000-0000-000000000001',
  'deny',
  'Matrix deny test',
  NULL,
  NOW() - INTERVAL '1 hour',
  NOW() + INTERVAL '1 hour',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET action = EXCLUDED.action,
    "validFrom" = EXCLUDED."validFrom",
    "validUntil" = EXCLUDED."validUntil";
```

Request:

- Method: `POST`
- URL: `{{baseUrl}}/access-attempts`
- Body:

```json
{
  "memberId": "{{memberId}}",
  "accessPointId": "{{openZonePointId}}",
  "accessZoneId": "{{openZoneId}}",
  "attemptSource": "postman-matrix-a2",
  "occurredAt": "{{$isoTimestamp}}"
}
```

Tests:

```javascript
pm.test("A2 status is 201", function () {
  pm.response.to.have.status(201);
});

const body = pm.response.json();
pm.test("A2 denied by explicit deny override", function () {
  pm.expect(body.decision).to.eql("denied");
  pm.expect(body.denialReasonCode).to.eql("ZONE_ACCESS_EXPLICITLY_DENIED");
});
```

Cleanup SQL (after A2):

```sql
DELETE FROM "MemberAccessOverride"
WHERE id = 'aaaa3333-0000-0000-0000-000000000001';
```

---

## A3: Booking-required zone without valid booking

Precondition SQL (clear booking and overrides for reserved zone):

```sql
DELETE FROM "Booking"
WHERE "memberId" = '5d211c05-b810-4f4b-aad4-ad465e60a5df'
  AND "accessZoneId" = 'eeeeeeee-0000-0000-0000-000000000001';

DELETE FROM "MemberAccessOverride"
WHERE "memberId" = '5d211c05-b810-4f4b-aad4-ad465e60a5df'
  AND "accessZoneId" = 'eeeeeeee-0000-0000-0000-000000000001';
```

Request:

- Method: `POST`
- URL: `{{baseUrl}}/access-attempts`
- Body:

```json
{
  "memberId": "{{memberId}}",
  "accessPointId": "{{reservedZonePointId}}",
  "accessZoneId": "{{reservedZoneId}}",
  "attemptSource": "postman-matrix-a3",
  "occurredAt": "{{$isoTimestamp}}"
}
```

Tests:

```javascript
pm.test("A3 status is 201", function () {
  pm.response.to.have.status(201);
});

const body = pm.response.json();
pm.test("A3 denied for booking required", function () {
  pm.expect(body.decision).to.eql("denied");
  pm.expect(body.denialReasonCode).to.eql("ZONE_BOOKING_REQUIRED");
});
```

---

## A4: Allow check-in with trialing subscription

Precondition SQL:

```sql
-- Ensure trialing subscription exists
INSERT INTO "MembershipSubscription" (
  id, "memberId", "membershipPlanId", "billingProvider", status, "startDate", "createdAt"
)
VALUES (
  'aaaa4444-0000-0000-0000-000000000001',
  '5d211c05-b810-4f4b-aad4-ad465e60a5df',
  (SELECT id FROM "MembershipPlan" ORDER BY "createdAt" ASC LIMIT 1),
  'manual',
  'trialing',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET status = 'trialing';

-- Ensure no open session exists for the member
UPDATE "VisitSession"
SET status = 'checked_out', "checkOutAt" = NOW()
WHERE "memberId" = '5d211c05-b810-4f4b-aad4-ad465e60a5df'
  AND status = 'checked_in';
```

Request:

- Method: `POST`
- URL: `{{baseUrl}}/visit-sessions/check-in`
- Body:

```json
{
  "memberId": "{{memberId}}",
  "locationId": "{{locationId}}",
  "checkInAt": "{{$isoTimestamp}}"
}
```

Tests:

```javascript
pm.test("A4 status is 201", function () {
  pm.response.to.have.status(201);
});

const body = pm.response.json();
pm.test("A4 check-in succeeded for trialing", function () {
  pm.expect(body.status).to.eql("checked_in");
  pm.environment.set("openVisitSessionId", body.id);
});
```

---

## A5: Deny presence event after check-out

Step 1 request (check-out):

- Method: `POST`
- URL: `{{baseUrl}}/visit-sessions/check-out`
- Body:

```json
{
  "visitSessionId": "{{openVisitSessionId}}",
  "checkOutAt": "{{$isoTimestamp}}"
}
```

Step 1 test:

```javascript
pm.test("A5 step1 checkout status is 201", function () {
  pm.response.to.have.status(201);
});
```

Step 2 request (presence event should fail):

- Method: `POST`
- URL: `{{baseUrl}}/presence-events`
- Body:

```json
{
  "visitSessionId": "{{openVisitSessionId}}",
  "memberId": "{{memberId}}",
  "accessZoneId": "{{openZoneId}}",
  "eventType": "zone_entered",
  "sourceType": "postman",
  "sourceReference": "matrix-a5",
  "occurredAt": "{{$isoTimestamp}}",
  "payloadJson": {
    "scenario": "A5"
  }
}
```

Step 2 tests:

```javascript
pm.test("A5 step2 rejected with 403", function () {
  pm.response.to.have.status(403);
});

pm.test("A5 step2 returns VISIT_SESSION_CLOSED", function () {
  const text = pm.response.text();
  pm.expect(text).to.include("VISIT_SESSION_CLOSED");
});
```

---

## Suggested Folder Layout In Postman

- Folder: `AO OS Hardening Matrix`
- Requests in order: `A1`, `A2`, `A3`, `A4`, `A5-Step1`, `A5-Step2`
- Run with Collection Runner in listed order

## Exit Criteria

Matrix passes when:

1. A1 returns allowed
2. A2 returns denied with `ZONE_ACCESS_EXPLICITLY_DENIED`
3. A3 returns denied with `ZONE_BOOKING_REQUIRED`
4. A4 returns checked_in with trialing subscription
5. A5-Step2 returns 403 and includes `VISIT_SESSION_CLOSED`
