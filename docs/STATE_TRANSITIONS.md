# AO OS — State Transition Rules v1.1

This document is the authoritative reference for all state machine rules in AO OS.
It grounds every enforcement decision in the AO framework's core operating principles:

- Every entrant must be **individually verified**, **individually paid**, and **individually credentialed**
- Access is tied to **RFID identity** — no sharing, no transfer
- **Booking-to-entry validation** applies where zones require it
- **Time-based expiration** applies to grants, overrides, and bookings
- **Explicit deny** overrides all other access logic

---

## Decision Order

For any check-in or zone-entry decision, evaluate in this exact order:

1. Member exists
2. Member is `active`
3. Valid paid access exists (`active` subscription)
4. RFID credential exists and is `assigned` or `active`, tied to that member
5. No conflicting open visit session (if relevant)
6. Explicit deny override check
7. Explicit allow override check
8. Active grant check
9. Booking check (if zone requires booking)
10. Allow

---

## 1. Member

### States
`pending` | `active` | `suspended` | `banned`

### Transitions
| From        | To              | Condition                                      |
|-------------|-----------------|------------------------------------------------|
| `pending`   | `active`        | Identity complete; profile + consent confirmed |
| `pending`   | `suspended`     | Manual hold before activation                  |
| `pending`   | `banned`        | Immediate revocation before activation         |
| `active`    | `suspended`     | Payment issue, conduct review, manual hold     |
| `active`    | `banned`        | Permanent revocation                           |
| `suspended` | `active`        | Issue resolved                                 |
| `suspended` | `banned`        | Escalation                                     |
| `banned`    | `active`        | ⛔ Admin-only exceptional reversal              |
| `banned`    | `suspended`     | ⛔ Disallowed in normal flow                   |

### Enforcement
- Only `active` members may pass access decisioning (check-in, zone entry, access attempts)
- `pending`, `suspended`, `banned` → deny entry

### Denial Codes
| Code                 | Meaning                       |
|----------------------|-------------------------------|
| `MEMBER_NOT_FOUND`   | No member record for this ID  |
| `MEMBER_NOT_ACTIVE`  | Member exists but is not active |

---

## 2. Membership Subscription

### States
`trialing` | `active` | `past_due` | `paused` | `cancelled`

### Transitions
| From        | To          | Condition                                |
|-------------|-------------|------------------------------------------|
| `trialing`  | `active`    | Billing/activation completed             |
| `trialing`  | `cancelled` | Abandoned before full activation         |
| `active`    | `past_due`  | Billing failure                          |
| `active`    | `paused`    | Manual/account pause                     |
| `active`    | `cancelled` | Member cancellation                      |
| `past_due`  | `active`    | Payment recovered                        |
| `past_due`  | `cancelled` | Payment unresolved                       |
| `paused`    | `active`    | Account resumed                          |
| `paused`    | `cancelled` | Member ends membership while paused      |
| `cancelled` | `active`    | ⛔ Create a new subscription instead      |

### Access-Eligible States
- ✅ `active`
- ✅ `trialing` (trial members admitted)
- ❌ `past_due`, `paused`, `cancelled` → deny

### Denial Codes
| Code                      | Meaning                             |
|---------------------------|-------------------------------------|
| `NO_ACTIVE_SUBSCRIPTION`  | No active or trialing subscription  |

---

## 3. Wristband

### States
`inventory` | `assigned` | `active` | `lost` | `stolen` | `damaged` | `retired`

### Transitions
| From                      | To                              | Condition                                 |
|---------------------------|---------------------------------|-------------------------------------------|
| `inventory`               | `assigned`                      | Assigned to a member                      |
| `assigned`                | `active`                        | First use / activated at check-in         |
| `assigned`                | `inventory`                     | Unassigned before first use (return)      |
| `assigned`                | `lost\|stolen\|damaged\|retired` | Exception event                          |
| `active`                  | `inventory`                     | Unassigned after safe return              |
| `active`                  | `lost\|stolen\|damaged\|retired` | Exception event                          |
| `lost\|stolen\|damaged`   | `inventory`                     | ⛔ Admin-only recovery/refurbishment       |
| `retired`                 | any                             | ⛔ Terminal — no further transitions       |

### Enforcement Rules
- `assignWristband` → must set status to `assigned`
- `unassignWristband` (normal return) → set status to `inventory`
- `unassignWristband` (reason = `lost`) → set status to `lost`
- `unassignWristband` (reason = `stolen`) → set status to `stolen`
- `unassignWristband` (reason = `damaged`) → set status to `damaged`
- `unassignWristband` (reason = `retired`) → set status to `retired`
- Assigning a wristband that is not in `inventory` → reject with error
- Only `assigned` or `active` wristbands are valid credentials

### Denial Codes
| Code                            | Meaning                                    |
|---------------------------------|--------------------------------------------|
| `WRISTBAND_NOT_FOUND`           | No wristband record for this ID            |
| `WRISTBAND_NOT_ACTIVE`          | Wristband not in an access-eligible state  |
| `NO_ACTIVE_WRISTBAND_ASSIGNMENT`| No active assignment exists for wristband  |

---

## 4. Wristband Assignment

Assignments use boolean `active` flag rather than a status enum.

### Logical States
`active` | `inactive`

### Transitions
| From       | To         | Condition                     |
|------------|------------|-------------------------------|
| (created)  | `active`   | Assignment created            |
| `active`   | `inactive` | Unassignment triggered        |
| `inactive` | `active`   | ⛔ Disallowed — create new assignment instead |

### Enforcement Rules
- Only one `active` assignment per wristband at a time
- Only one `active` assignment per member at a time (unless multi-wristband is explicitly enabled)
- An inactive assignment cannot be reactivated
- Access decisioning must reject an inactive `wristbandAssignmentId`

### Denial Codes
| Code                            | Meaning                                            |
|---------------------------------|----------------------------------------------------|
| `NO_ACTIVE_WRISTBAND_ASSIGNMENT`| Supplied assignment exists but is inactive          |
| `WRISTBAND_ALREADY_ASSIGNED`    | Wristband already has an active assignment         |

---

## 5. Visit Session

### States
`checked_in` | `checked_out`

### Transitions
| From           | To              | Condition                              |
|----------------|-----------------|----------------------------------------|
| (created)      | `checked_in`    | Check-in passes all eligibility checks |
| `checked_in`   | `checked_out`   | Check-out called with valid session    |
| `checked_out`  | `checked_in`    | ⛔ Disallowed — create a new session    |
| `checked_out`  | `checked_out`   | ⛔ Disallowed — session already closed  |

### Enforcement Rules
- A member may have **at most one open** (`checked_in`) visit session at a time
- Check-in denied if open session already exists → `ALREADY_CHECKED_IN`
- Check-out denied if session is already `checked_out` → `VISIT_SESSION_ALREADY_CLOSED`
- Check-out denied if session not found → `VISIT_SESSION_NOT_FOUND`
- Closed sessions (`checked_out`) cannot receive new presence events

### Denial / Error Codes
| Code                          | Meaning                                         |
|-------------------------------|-------------------------------------------------|
| `ALREADY_CHECKED_IN`          | Member already has an open visit session        |
| `VISIT_SESSION_NOT_FOUND`     | No session found for given ID                   |
| `VISIT_SESSION_ALREADY_CLOSED`| Session exists but is already checked out       |

---

## 6. Access Attempt

### Decisions
`allowed` | `denied` | `error`

### Rules
- Every access attempt is **append-only** — never updated
- A new attempt is created each time hardware or a user retries
- `decision` and `denialReasonCode` are derived server-side, never trusted from client input
- Denial reason codes are stable and explicit

### Canonical Denial Reason Codes
| Code                            | Trigger                                         |
|---------------------------------|-------------------------------------------------|
| `MEMBER_NOT_FOUND`              | No member for the given credential              |
| `MEMBER_NOT_ACTIVE`             | Member is pending, suspended, or banned         |
| `NO_ACTIVE_SUBSCRIPTION`        | No active or trialing subscription              |
| `NO_ACTIVE_WRISTBAND_ASSIGNMENT`| Wristband credential is not actively assigned   |
| `WRISTBAND_NOT_ACTIVE`          | Wristband status is not assigned or active      |
| `ALREADY_CHECKED_IN`            | Member already has an open visit session        |
| `ZONE_ACCESS_NOT_GRANTED`       | No grant or override allowing zone entry        |
| `ZONE_ACCESS_EXPLICITLY_DENIED` | An active override explicitly denies access     |
| `ZONE_BOOKING_REQUIRED`         | Zone requires a booking but none was found      |
| `NO_VALID_BOOKING`              | Booking exists but outside valid time window    |

---

## 7. Presence Event

### Recommended Event Types
Use consistent string values:

| Type            | Meaning                      |
|-----------------|------------------------------|
| `zone_entered`  | Member entered a zone        |
| `zone_exited`   | Member exited a zone         |
| `locker_opened` | Member opened a locker       |
| `locker_closed` | Member closed a locker       |
| `room_entered`  | Member entered a room        |
| `room_exited`   | Member exited a room         |

### Rules
- Presence events are **append-only** — never updated
- A valid open (`checked_in`) visit session is required to create a presence event
- Presence events must reference the same `memberId` as the visit session
- Events must not be created after session is `checked_out`
- Events should only target zones the member is authorized to access

### Denial / Error Codes
| Code                       | Meaning                                          |
|----------------------------|--------------------------------------------------|
| `VISIT_SESSION_NOT_FOUND`  | No visit session found for given ID              |
| `VISIT_SESSION_CLOSED`     | Session exists but is already checked out        |
| `ZONE_ACCESS_NOT_GRANTED`  | Member not authorized to enter this zone         |

---

## 8. Access Grant / Override Precedence

### MemberAccessGrant
A grant is usable only when all of the following are true:
- `active = true`
- `validFrom <= now` (or `validFrom` is null — no lower bound)
- `validUntil >= now` (or `validUntil` is null — no upper bound)

### MemberAccessOverride Actions
`allow` | `deny`

### Precedence Order (highest to lowest)
1. **Explicit deny override** — beats everything
2. **Explicit allow override** — beats grant
3. **Active grant** — standard long-term access
4. **Booking** — if zone requires booking and booking is valid
5. **Deny** — default when no rule grants access

### Denial Codes
| Code                            | Meaning                                         |
|---------------------------------|-------------------------------------------------|
| `ZONE_ACCESS_EXPLICITLY_DENIED` | An active deny override exists for this member/zone |
| `ZONE_ACCESS_NOT_GRANTED`       | No grant, override, or booking allows access    |

---

## 9. Booking

### States
`reserved` | `checked_in` | `completed` | `cancelled` | `expired` | `no_show`

### Transitions
| From              | To                                       |
|-------------------|------------------------------------------|
| `reserved`        | `checked_in`, `cancelled`, `expired`, `no_show` |
| `checked_in`      | `completed`                              |
| `completed`       | ⛔ terminal                              |
| `cancelled`       | ⛔ terminal                              |
| `expired`         | ⛔ terminal                              |
| `no_show`         | ⛔ terminal                              |

### Enforcement
If `AccessZone.requiresBooking = true`, allow zone entry only if:
- Booking exists for the same member
- Booking is for the same zone
- Booking time window is valid (`startsAt <= now <= endsAt`)
- Booking status is `reserved` or `checked_in`

### Denial Codes
| Code                    | Meaning                                          |
|-------------------------|--------------------------------------------------|
| `ZONE_BOOKING_REQUIRED` | Zone requires a booking but none was found       |
| `NO_VALID_BOOKING`      | Booking found but outside time window or invalid status |

---

## Operational Rules (Non-Negotiable)

These rules must be enforced at all times:

1. Every entrant must have their own valid paid access and active RFID credential
2. No shared entry, no credential transfer
3. Assigning a wristband always sets wristband status to `assigned`
4. Normal unassign sets wristband status to `inventory`
5. Exception unassign (lost/stolen/damaged/retired) sets wristband to that exception state
6. A member cannot have two open visit sessions at once
7. A closed visit session cannot receive new presence events
8. A zone requiring booking must deny without a valid booking in the correct time window
9. An explicit deny override beats all other access logic
