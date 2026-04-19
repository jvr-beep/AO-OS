# AO-OS Privacy & Display Name Policy

**Status:** Enforced as of 2026-04-18  
**Applies to:** All staff-facing operational surfaces, member-facing app

---

## Core Rule

Legal name is sensitive account data. It must never appear on operational staff surfaces by default.

Every surface that shows a person's name must use `staffSafeDisplayName` — a computed value derived from alias or preferred name, never from legal first/last name.

---

## Display Name Precedence

```
alias  →  preferredName (MemberProfile)  →  displayName  →  "Member …{last 6 of number}"
```

Implemented in: `apps/api/src/members/utils/member-display.ts → resolveDisplayName()`

**Never** fall back to `firstName + lastName` on any operational surface.

---

## Schema Fields

| Model | Field | Purpose |
|---|---|---|
| `Member` | `alias` | Chosen name — highest display priority. Member-set. |
| `Member` | `displayName` | Display name computed or staff-set. Tertiary fallback. |
| `MemberProfile` | `preferredName` | Self-declared preferred name. Secondary fallback. |
| `Member` | `firstName` | Legal first name. Restricted. |
| `Member` | `lastName` | Legal last name. Restricted. |

---

## Surfaces Where Display Name Is Enforced

- Floor map inspect panels (map-studio live state)
- Active booking context (room occupancy)
- Locker assignment displays
- Wristband assignment displays
- Visit session context
- Alerts and expiry notices
- Cleaning / turnover context referencing a person
- Member list and member detail views

---

## Legal Name Access

**Endpoint:** `GET /members/:id/legal-identity`  
**Role required:** `admin` only  
**Audit:** Every access writes a `member.legal_identity_accessed` event to `StaffAuditEvent`

**Legitimate use cases:**
- Waiver / legal acknowledgement
- Payment, refund, chargeback processing
- Fraud review
- Identity verification
- Account recovery
- Incident documentation requiring legal identity
- Integrations that must match payment or government records

Legal name must not be used outside these exception paths.

---

## Member-Facing App

Legal first and last name are treated as sensitive account data:
- Hidden by default in all member-facing views
- Revealed only with an explicit visibility action by the member themselves
- Never shown passively in the UI

---

## Engineering Requirements

1. **New code:** Any service querying `Member` for display must select `alias`, `displayName`, and `profile.preferredName` — never `firstName`/`lastName` on operational paths.
2. **Existing code:** Legal name fields must only appear in: create/update member DTOs, billing service (Stripe), waiver service, and the restricted `legal-identity` endpoint.
3. **Search:** Full-text member search may include `firstName`/`lastName` as search predicates (staff need to be able to find members by legal name) but results must be returned with `staffSafeDisplayName` only.
4. **Audit logging:** Every call to `getMemberLegalIdentity` is logged. Do not add code that bypasses this.
5. **Guest model:** The `Guest` model (non-member visitors) uses `firstName`/`lastName` directly — this is intentional. Guests sign in with their real name for waiver purposes. This is separate from the Member privacy policy.
