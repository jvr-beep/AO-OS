# AO OS - State Transition Rules v1.1

This document is the authoritative reference for all state machine rules in AO OS.
It grounds every enforcement decision in the AO framework's core operating principles:

- Every entrant must be individually verified, individually paid, and individually credentialed
- Access is tied to RFID identity: no sharing, no transfer
- Booking-to-entry validation applies where zones require it
- Time-based expiration applies to grants, overrides, and bookings
- Explicit deny overrides all other access logic

---

## Decision Order

For any check-in or zone-entry decision, evaluate in this exact order:

1. Member exists
2. Member is active
3. Valid paid access exists (active or trialing subscription)
4. RFID credential exists and is assigned or active, tied to that member
5. No conflicting open visit session (if relevant)
6. Explicit deny override check
7. Explicit allow override check
8. Active grant check
9. Booking check (if zone requires booking)
10. Allow

---

## 1. Member

### States
pending | active | suspended | banned

### Transitions
| From        | To        | Condition                                      |
|-------------|-----------|------------------------------------------------|
| pending     | active    | Identity complete; profile + consent confirmed |
| pending     | suspended | Manual hold before activation                  |
| pending     | banned    | Immediate revocation before activation         |
| active      | suspended | Payment issue, conduct review, manual hold     |
| active      | banned    | Permanent revocation                           |
| suspended   | active    | Issue resolved                                 |
| suspended   | banned    | Escalation                                     |
| banned      | active    | Admin-only exceptional reversal                |
| banned      | suspended | Disallowed in normal flow                      |

### Denial or Error Codes
| Code              | Meaning                              |
|-------------------|--------------------------------------|
| MEMBER_NOT_FOUND  | No member record for this ID         |
| MEMBER_NOT_ACTIVE | Member exists but is not active      |

### Enforcement Module or Service
- apps/api/src/access-control/access-control.service.ts

---

## 2. MembershipSubscription

### States
trialing | active | past_due | paused | cancelled

### Transitions
| From      | To        | Condition                           |
|-----------|-----------|-------------------------------------|
| trialing  | active    | Billing or activation completed     |
| trialing  | cancelled | Abandoned before full activation    |
| active    | past_due  | Billing failure                     |
| active    | paused    | Manual or account pause             |
| active    | cancelled | Member cancellation                 |
| past_due  | active    | Payment recovered                   |
| past_due  | cancelled | Payment unresolved                  |
| paused    | active    | Account resumed                     |
| paused    | cancelled | Member ends membership while paused |
| cancelled | active    | Disallowed; create new subscription |

### Access-Eligible States
- active
- trialing

### Denial or Error Codes
| Code                   | Meaning                                    |
|------------------------|--------------------------------------------|
| NO_ACTIVE_SUBSCRIPTION | No active or trialing subscription exists  |

### Enforcement Module or Service
- apps/api/src/access-control/access-control.service.ts

---

## 3. Wristband

### States
inventory | assigned | active | lost | stolen | damaged | retired

### Transitions
| From                    | To                         | Condition                            |
|-------------------------|----------------------------|--------------------------------------|
| inventory               | assigned                   | Assigned to a member                 |
| assigned                | active                     | First use or activated at check-in   |
| assigned                | inventory                  | Unassigned before first use (return) |
| assigned                | lost or stolen or damaged or retired | Exception event          |
| active                  | inventory                  | Unassigned after safe return         |
| active                  | lost or stolen or damaged or retired | Exception event          |
| lost or stolen or damaged | inventory                | Admin-only recovery or refurbishment |
| retired                 | any                        | Disallowed (terminal)                |

### Allowed and Disallowed Transitions
- Allowed: inventory -> assigned, assigned -> active, assigned -> inventory, active -> inventory, and exception transitions to lost/stolen/damaged/retired
- Disallowed: retired -> any, and direct activation from inventory without assignment

### Denial or Error Codes
| Code                             | Meaning                                   |
|----------------------------------|-------------------------------------------|
| WRISTBAND_NOT_FOUND              | No wristband record for this ID           |
| WRISTBAND_NOT_ACTIVE             | Wristband not in an access-eligible state |
| WRISTBAND_NOT_IN_INVENTORY       | Assignment attempted while not inventory  |

### Enforcement Module or Service
- apps/api/src/wristbands/services/wristbands.service.ts
- apps/api/src/access-control/access-control.service.ts

---

## 4. WristbandAssignment

Assignments use boolean active rather than a status enum.

### Logical States
active | inactive

### Transitions
| From      | To       | Condition                              |
|-----------|----------|----------------------------------------|
| created   | active   | Assignment created                     |
| active    | inactive | Unassignment triggered                 |
| inactive  | active   | Disallowed; create a new assignment    |

### Allowed and Disallowed Transitions
- Allowed: created -> active, active -> inactive
- Disallowed: inactive -> active

### Denial or Error Codes
| Code                             | Meaning                                      |
|----------------------------------|----------------------------------------------|
| NO_ACTIVE_WRISTBAND_ASSIGNMENT   | Assignment missing or inactive               |
| WRISTBAND_ALREADY_ASSIGNED       | Wristband already has active assignment      |

### Enforcement Module or Service
- apps/api/src/wristbands/services/wristbands.service.ts
- apps/api/src/access-control/access-control.service.ts

---

## 5. VisitSession

### States
checked_in | checked_out

### Transitions
| From        | To          | Condition                              |
|-------------|-------------|----------------------------------------|
| created     | checked_in  | Check-in passes eligibility            |
| checked_in  | checked_out | Check-out called for open session      |
| checked_out | checked_in  | Disallowed; create a new session       |
| checked_out | checked_out | Disallowed; session already closed     |

### Allowed and Disallowed Transitions
- Allowed: created -> checked_in, checked_in -> checked_out
- Disallowed: checked_out -> checked_in, checked_out -> checked_out

### Denial or Error Codes
| Code                         | Meaning                                  |
|------------------------------|------------------------------------------|
| ALREADY_CHECKED_IN           | Member already has an open session       |
| VISIT_SESSION_NOT_FOUND      | Session ID does not exist                |
| VISIT_SESSION_ALREADY_CLOSED | Session exists but is already closed     |

### Enforcement Module or Service
- apps/api/src/visit-sessions/services/visit-sessions.service.ts
- apps/api/src/access-control/access-control.service.ts

---

## 6. AccessAttempt

### Decisions
allowed | denied | error

### Rules
- Access attempts are append-only and never updated
- Decision and denialReasonCode are server-derived

### Denial or Error Codes
| Code                             | Meaning                                      |
|----------------------------------|----------------------------------------------|
| MEMBER_NOT_FOUND                 | No member for credential                     |
| MEMBER_NOT_ACTIVE                | Member status not active                     |
| NO_ACTIVE_SUBSCRIPTION           | No active or trialing subscription           |
| NO_ACTIVE_WRISTBAND_ASSIGNMENT   | Wristband assignment not active              |
| WRISTBAND_NOT_ACTIVE             | Wristband status not assigned or active      |
| ALREADY_CHECKED_IN               | Member already has open visit session        |
| ZONE_ACCESS_EXPLICITLY_DENIED    | Active deny override exists                  |
| ZONE_ACCESS_NOT_GRANTED          | No grant or allow override permits entry     |
| ZONE_BOOKING_REQUIRED            | Zone requires booking and no valid booking   |
| NO_VALID_BOOKING                 | Booking exists but not valid for time/status |

### Enforcement Module or Service
- apps/api/src/access-attempts/services/access-attempts.service.ts
- apps/api/src/access-control/access-control.service.ts

---

## 7. PresenceEvent

### Common Event Types
zone_entered | zone_exited | locker_opened | locker_closed | room_entered | room_exited

### Rules
- Presence events are append-only
- visitSessionId must exist
- Visit session must still be checked_in
- Closed sessions cannot receive new events

### Denial or Error Codes
| Code                      | Meaning                                   |
|---------------------------|-------------------------------------------|
| VISIT_SESSION_NOT_FOUND   | No visit session found                    |
| VISIT_SESSION_CLOSED      | Session exists but is not checked_in      |
| ZONE_ACCESS_NOT_GRANTED   | Zone not authorized for member            |

### Enforcement Module or Service
- apps/api/src/presence-events/services/presence-events.service.ts

---

## 8. Booking

### States
reserved | checked_in | completed | cancelled | expired | no_show

### Transitions
| From       | To                                   |
|------------|--------------------------------------|
| reserved   | checked_in, cancelled, expired, no_show |
| checked_in | completed                            |
| completed  | terminal                             |
| cancelled  | terminal                             |
| expired    | terminal                             |
| no_show    | terminal                             |

### Allowed and Disallowed Transitions
- Allowed: reserved -> checked_in/cancelled/expired/no_show, checked_in -> completed
- Disallowed: transitions out of completed/cancelled/expired/no_show

### Denial or Error Codes
| Code                    | Meaning                                          |
|-------------------------|--------------------------------------------------|
| ZONE_BOOKING_REQUIRED   | Zone requires booking and none was found         |
| NO_VALID_BOOKING        | Booking exists but status/time invalid           |

### Enforcement Module or Service
- apps/api/src/access-control/access-control.service.ts

---

## 9. Access Grant and Override Precedence

### Grant Validity
Grant is active only when:
- active is true
- validFrom <= now (or validFrom is null)
- validUntil >= now (or validUntil is null)

### Override Actions
allow | deny

### Precedence (Highest to Lowest)
1. Explicit deny override
2. Explicit allow override
3. Active grant
4. Booking validation for booking-required zones
5. Default deny

### Denial or Error Codes
| Code                          | Meaning                                    |
|-------------------------------|--------------------------------------------|
| ZONE_ACCESS_EXPLICITLY_DENIED | Active deny override exists                |
| ZONE_ACCESS_NOT_GRANTED       | No rule grants access                      |

### Enforcement Module or Service
- apps/api/src/access-control/access-control.service.ts

---

## Operational Non-Negotiables

1. Every entrant must have valid paid access and an active credential
2. No credential sharing or transfer
3. Assigning a wristband sets status to assigned
4. Normal unassign sets status to inventory
5. Exception unassign sets status to lost/stolen/damaged/retired
6. One member cannot have two open visit sessions
7. Closed sessions cannot receive new presence events
8. Booking-required zones deny without valid in-window booking
9. Explicit deny override beats all other access logic
