# AO OS — Staff User Guide

All user stories for front-of-house, operations, and admin roles. Written for staff who are already logged in.

---

## Table of Contents

1. [Roles and Access](#roles-and-access)
2. [Dashboard](#dashboard)
3. [Guest Arrival — Check-In Console](#guest-arrival--check-in-console)
4. [Guest Profiles](#guest-profiles)
5. [Visit Management](#visit-management)
6. [Bookings](#bookings)
7. [Rooms and Lockers](#rooms-and-lockers)
8. [Wristbands](#wristbands)
9. [Cleaning and Room Readiness](#cleaning-and-room-readiness)
10. [Members](#members)
11. [Floor Plans and Map Studio](#floor-plans-and-map-studio)
12. [Settings — Catalog and Waivers](#settings--catalog-and-waivers)
13. [Staff Management and Audit Log](#staff-management-and-audit-log)
14. [Kiosk Flow — What Guests See](#kiosk-flow--what-guests-see)
15. [Sandbox (Testing Only)](#sandbox-testing-only)

---

## Roles and Access

| Role | Access |
|------|--------|
| **staff** | Check-in, visits, guests, rooms, lockers, wristbands, cleaning |
| **operations** | Everything above + settings, waiver compliance, map studio authoring |
| **admin** | Everything above + staff management, audit log |

Pages that require elevated roles will redirect to the dashboard if you don't have access.

---

## Dashboard

**URL:** `/dashboard`

The dashboard is your real-time operating picture. It loads automatically when you log in.

### What you see

**Primary metrics (top row)**
- **Active Visits** — guests currently inside
- **Check-ins Today** — total arrivals since midnight
- **Revenue Today** — sum of all succeeded payments since midnight (CAD)
- **Open Exceptions** — system alerts requiring attention; shown in red when non-zero

**Resource metrics (second row)**
- **Available Resources** — rooms/lockers ready to assign; shown in red when zero
- **Occupied** — currently in use
- **On Hold** — reserved during an active payment window

**Upcoming Arrivals table**
Lists bookings arriving in the next 2 hours. Columns: booking code, guest identifier, arrival window, status. Refresh the page for an updated view.

**API Health widget**
Live status of the backend API. If it shows degraded or down, alert your operations lead.

**Signed in as**
Shows your name, email, and role at the top right.

**Quick Links**
One-click navigation to every major section.

**Member Lookup**
Search by member UUID, name, email, or member number directly from the dashboard without navigating away.

---

## Guest Arrival — Check-In Console

**URL:** `/check-in`

This is the primary workstation tool for processing arrivals. Keep it open throughout your shift.

### Kiosk queue — Awaiting Wristband

When a guest completes payment at the kiosk, their visit appears in the **Awaiting Wristband** panel with a pulsing indicator.

1. Identify the guest by name and pass type shown in the queue.
2. Issue the wristband physically.
3. Click **Assign & Activate** — this marks the visit `checked_in` then `active` in a single action.

Guests remain in the queue until you click Assign & Activate or they are activated through another path.

### Booking check-in (staff-assisted)

Use this when a guest with a pre-existing booking arrives at the desk rather than using the kiosk.

1. Scan or type the **booking code** (e.g. `AO-WXYZ`) into the Booking Code field.
2. Alternatively paste the booking **UUID** if you have it.
3. Click **Check In from Booking**.
4. You are taken to the visit detail page on success.

If the booking has a balance due, a folio charge will be created. Collect payment and record it on the visit detail page.

### Walk-in check-in (no booking)

Use this when a guest arrives without any prior reservation and is paying at the desk.

1. Obtain or locate the **Guest UUID** (find the guest first via `/guests` if needed).
2. Select the **pass** (tier) from the dropdown.
3. Enter **duration** in minutes (default: 120).
4. Enter the **quoted price** in cents (e.g. `5000` = $50.00 CAD).
5. Enter the **amount paid now** in cents (can be 0 for deferred payment).
6. Select **payment method**: Cash, Card, or Stripe.
7. Click **Walk-In Check In**.

The system creates the visit, records the payment, and opens the visit detail.

### Quick checkout

If you only have the visit UUID and need to close a visit fast:

1. Paste the **Visit UUID** into the Quick Checkout field.
2. Click **Check Out**.

### Active visits table

Shows all guests currently checked in or active. From here you can:
- **View** — opens the full visit detail
- **Check Out** — immediately closes the visit (use for departing guests or emergencies)

---

## Guest Profiles

**URL:** `/guests` → click any row → `/guests/[guestId]`

### Searching guests

On the guests list, search by name, email, phone, or member number. Results are filtered as you type.

### Guest detail page

The guest profile shows:
- Contact information (name, email, phone)
- Risk flag status with reason and timestamp
- Visit history
- Bookings (upcoming and past)
- Waiver records
- Wristband link history

### Editing contact information

In the **Edit Contact** panel:
1. Update First Name, Email, and/or Phone.
2. Click **Save Changes**.

Changes take effect immediately. The guest's version counter increments.

### Flagging or banning a guest

In the **Risk Flag** panel:
1. Set the status dropdown to **Flagged** or **Banned**.
2. Enter a reason in the text field (required for flagged/banned).
3. Click **Save**.

A yellow warning banner (flagged) or red warning banner (banned) appears at the top of the guest profile with the reason, timestamp, and your user ID recorded. Clear the flag by setting status back to **Clear**.

> Banned guests should not be admitted. Flag a guest when you want to record a concern without denying entry.

### Cancelling a booking

In the **Bookings** table, any booking in `reserved` or `confirmed` status shows a **Cancel** button.

1. Click **Cancel**.
2. Enter the reason in the confirmation prompt.
3. Confirm. The booking status changes to `cancelled`.

Cancellations cannot be undone from the UI. Contact operations if a cancellation was made in error.

---

## Visit Management

**URL:** `/visits` → click any row → `/visits/[visitId]`

### Filtering visits

Use the filter buttons at the top:
- **Pending** — initiated, awaiting payment, ready for assignment
- **Active** — checked in, active, extended
- **Closed** — checked out, cancelled

### Visit detail

The visit detail page is the single source of truth for an in-progress guest stay. It shows:
- Guest name (linked to guest profile)
- Pass, mode (Restore / Release / Retreat), duration
- Assigned room or locker
- Current status with history
- Folio (charges and payments)
- Staff notes

### Checking out a visit

Click **Check Out** at the top of the visit detail. The visit status moves to `checked_out` and the assigned resource is released.

### Adding a folio charge (line item)

In the **Folio** section:
1. Select the **line type** (service charge, upgrade, retail, etc.).
2. Enter a **description**.
3. Set **quantity** and **unit amount** in cents.
4. Click **Add Line Item**.

Line items accumulate on the folio and are included in revenue reporting.

### Recording a payment

In the **Record Payment** section of the folio:
1. Enter the **amount** in cents.
2. Select the **payment provider** (cash, card, stripe).
3. Click **Record Payment**.

This creates a `succeeded` payment transaction tied to the folio.

### Staff notes

Staff notes are private — guests never see them.

**Adding a note:**
1. Type in the note field at the bottom of the visit detail.
2. Click **Add Note**.

**Editing a note:**
1. Click **Edit** next to any existing note.
2. Update the text.
3. Click **Save**.

Notes are timestamped and attributed to the staff member who created them.

---

## Bookings

**URL:** `/bookings`

### Viewing bookings

The bookings list shows all reservations across all guests. Filter by:
- Room or locker via the resource filter
- Member via the member filter
- Status (reserved, confirmed, checked_in, cancelled)

Click any booking to see full details.

### Pre-filtering from other pages

Many pages link directly to bookings with pre-applied filters. For example, clicking a guest name on the bookings page navigates to their guest profile.

---

## Rooms and Lockers

**URL:** `/rooms` and `/lockers`

### Resource list

Shows all rooms (or lockers) with their current status. Status colours:
- **Available** — ready to assign (green)
- **Occupied** — guest currently inside (blue)
- **Held** — reserved during an active payment window (amber)
- **Cleaning** — cleaning in progress (orange)
- **Out of Service** — maintenance or fault (red)

### Resource detail

Click any room or locker to open the detail page, which shows:
- Current status and assigned visit (if occupied)
- Zone code and tier
- Booking history

### Changing resource status

In the status panel on the resource detail page:
1. Select the new status from the dropdown: `available`, `cleaning`, `out_of_service`.
2. Optionally add a reason note.
3. Click **Update Status**.

> You cannot manually change the status of an occupied resource. Check out the active visit first.

---

## Wristbands

**URL:** `/wristbands`

### What wristbands track

Each RFID wristband has a UID and is linked to a guest and visit when issued. The wristbands page shows the full inventory.

### Assigning a wristband

Wristband assignment happens as part of the check-in flow. After assigning physically, click **Assign & Activate** in the Check-In Console kiosk queue. The system links the wristband to the visit automatically.

### Viewing wristband history

Click any wristband to see all link records — which guest, which visit, link status, and reason code.

---

## Cleaning and Room Readiness

**URL:** `/cleaning`

### Cleaning queue

After a guest checks out, their room or locker moves to `cleaning` status. The cleaning page lists all resources in this state.

### Marking a room ready

1. Find the room or locker in the cleaning list.
2. Click **Mark Ready** (or the equivalent action button).
3. The resource status returns to `available` and the room appears in the room picker for new guests.

> If a room needs a longer maintenance window, set it to `out_of_service` via the resource detail page instead.

---

## Members

**URL:** `/members` → `/members/[memberId]`

### Searching members

Search by member UUID, name, email, or member number. The search works across all fields simultaneously.

### Member detail

Shows:
- Member number and display name
- Subscription status and tier
- Visit history
- Linked guest profile
- Account and billing summary

From the member detail you can navigate to the linked guest profile to view waivers, flag history, and bookings.

---

## Floor Plans and Map Studio

**URL:** `/floor-plans` and `/map-studio`

### Floor Plans (all staff)

Browse published floor plans. Use these as a reference during operations — they show the physical layout of rooms and zones.

### Map Studio (operations and admin only)

Map Studio is the authoring interface for facility floor plans.

**Viewing a floor:**
All staff can open a floor plan from Map Studio in read-only mode.

**Editing a floor (operations/admin):**
1. Navigate to `/map-studio` and click the floor you want to edit.
2. The authoring panel appears on the right.
3. Make changes to the SVG layout.
4. Save your draft.
5. Submit for approval if the approval workflow is enabled.

Published maps feed into the room picker and facility overview across the system.

---

## Settings — Catalog and Waivers

**URL:** `/settings` (operations and admin only)

### Pass catalog (tiers)

The catalog section lists all pass tiers (House Pass, Private Pass, Retreat Pass, Travel Pass, etc.).

**Viewing a tier:**
Click any tier to see its product type, base price, duration options, and active status.

**Editing duration options:**
Each tier can have multiple duration/price combinations. Use the edit controls to add or update duration options.

**Creating a new tier:**
Use the Create Tier form at the top of the catalog section. Required fields: product type, code, name, base price.

### Resources

The resources section lists all rooms and lockers with their new metadata fields.

**Editing a resource:**
Click a resource row to expand it. You can update:
- Description (shown to guests on the room picker)
- Features (e.g. "soaking tub", "shower", "double locker")
- Floor section (used to group rooms on the kiosk picker)
- Private flag (marks discrete rooms as "Private" on the guest picker)
- Max occupancy
- Status (available, cleaning, out_of_service)

### Waiver documents

**Viewing current waiver:**
The active waiver document is shown with its version, publish date, and full body text.

**Creating a draft:**
1. Click **New Version**.
2. Enter a version string (e.g. `AO-WAIVER-v2`), title, and body text.
3. Save as draft.

**Publishing a waiver:**
1. Open the draft.
2. Click **Publish**.
3. Confirm. The new waiver becomes active immediately. Guests who signed the previous version will be prompted to re-sign on their next visit.

> Publishing a new waiver invalidates all existing signed waivers. Only do this when the house rules have materially changed.

### Waiver compliance report

**URL:** `/settings/waiver-compliance` (operations and admin only)

Shows:
- Current waiver version
- Total guests with outstanding re-sign requirements
- Full list of guests who need to re-sign, with their last-signed version and date

Use this report before events or during audits to confirm compliance status.

---

## Staff Management and Audit Log

### Staff list

**URL:** `/staff` (admin only)

Lists all staff accounts with their role and status. From here you can:
- Create new staff accounts
- Edit roles
- Deactivate accounts

### Audit log

**URL:** `/staff/audit` (admin only)

Every staff action that mutates data is recorded in the audit log. The log shows:
- Timestamp
- Staff user ID and name
- Action type
- Target resource (guest ID, visit ID, etc.)
- Before/after values where available

Use the audit log for:
- Investigating complaints or discrepancies
- Regulatory compliance reporting
- Identifying unusual patterns in staff activity

---

## Kiosk Flow — What Guests See

Understanding the kiosk helps staff assist guests who get stuck.

### Walk-in path

```
/kiosk → Identity → Waiver → Product Type → Select Pass → Select Room → Payment → Assign → Active
```

| Step | What happens |
|------|-------------|
| **Identity** | Guest enters first name, last/email/phone optional. System looks up existing guest or creates new. |
| **Waiver** | House rules displayed. Guest types full name to sign. If a valid waiver is already on file, they see a confirmation screen and skip the signature. |
| **Product Type** | Guest chooses Locker or Room. |
| **Select Pass** | Guest picks tier (House Pass, Private Pass, Retreat Pass, Travel Pass) and visit mode (Restore, Release, Retreat). |
| **Select Room** | Guest sees available rooms/lockers with descriptions and features. Top match is highlighted as "For You" if they have preferences on file. "Let AO Choose" auto-assigns the best available. |
| **Payment** | Stripe payment form. Zero-price passes skip directly to Assign. |
| **Assign** | Guest is told to collect their wristband at the desk. Staff clicks Assign & Activate in the Check-In Console. |
| **Active** | Guest sees their live visit timer and zone guide on the kiosk screen. |

### Booking path

```
/kiosk/booking → Confirm Booking → (Waiver if needed) → Select Room → Payment or Assign → Active
```

| Step | What happens |
|------|-------------|
| **Booking Lookup** | Guest enters booking code or phone number. |
| **Confirm** | Booking summary shown (pass, date, window, balance). If no valid waiver on file, a yellow banner prompts them to sign first. |
| **Waiver** | Same as walk-in waiver step; skipped if waiver is current. |
| **Select Room** | Same room picker as walk-in. Booking tier pre-filters available options. |
| **Payment / Assign** | If balance due, Stripe payment form. If paid in full, goes straight to Assign. |

### Common kiosk issues and staff fixes

| Issue | Staff action |
|-------|-------------|
| Guest typed wrong name at identity, now wants to fix it | Find their guest record via `/guests`, use Edit Contact panel to correct name |
| Guest's booking not found | Verify booking code is correct (case-insensitive); check booking status isn't `cancelled` in `/bookings` |
| Payment declined at kiosk | Ask guest to use a different card; or process payment at the desk via Walk-In Check In with `paymentProvider: card` |
| Room they wanted is no longer available | The room picker only shows `available` rooms; either assign "Let AO Choose" or check if another room can be manually freed |
| Kiosk frozen or in error state | Use the kiosk's "Start Over" button; or reset via the Staff Assistance modal on error screens |
| Guest session expired (30-min kiosk timeout) | Guest must start over from `/kiosk`; their guest record and any waiver already signed are preserved |

---

## Sandbox (Testing Only)

**URL:** `/sandbox`

The sandbox is a sensor and access control simulator. It lets you trigger kiosk and reader events without physical hardware.

**Use the sandbox to:**
- Test the full check-in/checkout flow in a staging environment
- Simulate RFID reader taps for wristband assignment
- Verify that sensor events are processed correctly before a hardware integration goes live

Do not use the sandbox during live operations — events it generates are real and will affect visit and resource states in the database.
