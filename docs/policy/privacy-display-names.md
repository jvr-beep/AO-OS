# AO-OS Privacy & Display Name Policy

**Status:** Enforced as of 2026-04-21 (updated)
**Applies to:** All surfaces — kiosk, staff console, member-facing app, API responses

---

## Core Rule

Legal name is sensitive personal data. It must **never** appear on any operational surface, any kiosk screen, or any default view anywhere in the system.

Privacy is a foundational pillar of AO Sanctuary. Guests and members choose a name. That chosen name is how they are known throughout the system.

---

## The Only Legitimate Uses of Legal Name

Real first/last name may only be accessed or displayed in these contexts:

1. **Waiver / legal acknowledgement** — collection only, never displayed back
2. **Original account creation** — collected during onboarding, never shown in UI after
3. **Payment setup** — passed to Stripe for billing, never displayed in product UI
4. **Admin legal identity endpoint** — `GET /members/:id/legal-identity`, admin role only, audit-logged

In every other context — including kiosk check-in, staff consoles, booking confirmations, visit views, floor maps — legal name must not appear.

---

## What Is Shown Instead

**Members** identify by their chosen name:

```text
alias  →  preferredName (MemberProfile)  →  displayName  →  "Member …{last 6 of number}"
```

Implemented in: `apps/api/src/members/utils/member-display.ts → resolveDisplayName()`

**Guests** (non-member visitors) have no alias system. On any surface that would otherwise show a guest's name, use their **booking code** or **visit reference** as the identifier. Never show `firstName` or `lastName`.

---

## Kiosk Rules

- **No name of any kind** may appear on any kiosk screen
- Booking confirmation screens identify the booking by **booking code**, tier, date, and time — not by name
- Walk-in identity capture collects name for the waiver record only — it is never displayed back to the guest after submission
- Shoulder visibility is a real threat on a shared screen; treat every kiosk screen as fully public

---

## Mobile App Rules

Legal name is hidden by default on all member-facing views. It is revealed only by an explicit privacy-eye action by the member on their own device — the same UX pattern used for password reveal. It is never shown passively.

---

## Schema Fields

| Model | Field | Permitted Use |
| --- | --- | --- |
| `Member` | `alias` | Display everywhere |
| `Member` | `displayName` | Display fallback |
| `MemberProfile` | `preferredName` | Display fallback |
| `Member` | `firstName` | Collection only — waiver, account creation, Stripe |
| `Member` | `lastName` | Collection only — waiver, account creation, Stripe |
| `Guest` | `firstName` | Collection only — waiver |
| `Guest` | `lastName` | Collection only — waiver |

---

## Surfaces Where This Is Enforced

- Kiosk — all screens
- Floor map inspect panels
- Active booking and visit context
- Locker and wristband assignment displays
- Alerts and expiry notices
- Cleaning / turnover context
- Staff member list and member detail views
- Booking confirmation screens
- Check-in consoles

---

## Legal Name Access (Members)

**Endpoint:** `GET /members/:id/legal-identity`
**Role required:** `admin` only
**Audit:** Every access writes a `member.legal_identity_accessed` event to `StaffAuditEvent`

---

## Engineering Requirements

1. **Member display:** Any service querying `Member` for display must select `alias`, `displayName`, and `profile.preferredName` — never `firstName`/`lastName`.
2. **Guest display:** Never select or return `firstName`/`lastName` from `Guest` in any response destined for a UI surface. These fields exist solely for waiver record-keeping.
3. **Kiosk API responses:** Kiosk endpoints (`/kiosk/*`) must not include any name fields in their responses. Use booking code as the reference identifier.
4. **Search:** Full-text search may use name fields as predicates but results must be returned with display name only.
5. **New code review gate:** Any PR that introduces `firstName`, `lastName`, `first_name`, or `last_name` on a non-collection, non-waiver, non-billing path must be flagged in review.
6. **Audit logging:** Every call to `getMemberLegalIdentity` is logged. Do not bypass this.
