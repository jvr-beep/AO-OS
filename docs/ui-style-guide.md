# AO-OS UI Style Guide

All tokens are defined in `apps/web/tailwind.config.ts`. Use canonical tokens in all new code. Legacy `ao-*` aliases exist for backwards-compatibility only — do not use in new work.

---

## 1. Semantic Token Map

### Surface

- `surface-0`: #0B0E11 — Obsidian, primary background
- `surface-1`: #0F1620 — Deep Navy Stone, alternate background / cards
- `surface-2`: #1C222B — Bronzed Charcoal, elevated cards, separation layers
- `surface-elevated`: #1C222B — same as surface-2, use for modals/overlays

### Text

- `text-primary`: #EDE9E3 — Warm Ivory, primary body text
- `text-secondary`: #9CA3AF — Stone Grey, secondary labels
- `text-muted`: #6B7280 — subdued / placeholder text
- `text-inverse`: #0B0E11 — text on accent backgrounds

### Accent

- `accent-primary`: #2F8F83 — AO Metallic / Electrum Teal — use sparingly, beacon color only

### Border

- `border-subtle`: #1C222B — low-contrast dividers
- `border-strong`: #2F8F83 — teal accent borders

### Status (Resource / Visit / Wristband)

- `status-available`: #2F8F83
- `status-held`: #F59E42
- `status-occupied`: #F43F5E
- `status-cleaning`: #FBBF24
- `status-out-of-service`: #6B7280

### Feedback

- `info`: #2F8F83
- `warning`: #F59E42
- `critical`: #F43F5E
- `success`: #22C55E

### Exception

- `exception-open`: #F43F5E
- `exception-acknowledged`: #F59E42
- `exception-resolved`: #2F8F83

---

## 2. Typography

- **Sans-serif**: System UI — all transactional and operational UI
- **Serif** (`font-heading`): Reserved for rare branded section moments only
- **Hierarchy**: Large calm headings, strong but not busy. No decorative type in operational views.

---

## 3. Component Doctrine

- Layered, framed, intentional panels
- Sparse copy, strong hierarchy
- Teal (`accent-primary`) used only as a beacon — never as a fill color on large areas
- Large, calm hit targets
- State communicated via icon + label, not color alone
- Tables: `bg-surface-0` thead, `divide-y divide-gray-700` rows, `hover:bg-gray-700/40` row hover

---

## 4. Exception Patterns

- Inline banners (`border-red-700 bg-red-900 text-red-200` / `border-green-700 bg-green-900 text-green-200`) for recoverable issues
- Blocking modals for critical / irreversible failures
- Severity chips: `exception-open`, `exception-acknowledged`, `exception-resolved`

---

## 5. Legacy Aliases (do not use in new code)

These are kept in `tailwind.config.ts` for backwards-compatibility only. They all map to canonical tokens:

| Legacy class | Canonical equivalent |
| ------------ | -------------------- |
| `ao-primary` | `accent-primary` (#2F8F83) |
| `ao-teal` | `accent-primary` (#2F8F83) |
| `ao-dark` | `surface-0` (#0B0E11) |
| `ao-darker` | `surface-0` (#0B0E11) |
| `accent-active` | `accent-primary` (#2F8F83) |

---

_Last updated to match `tailwind.config.ts` as of AO-OS v1.2. All PRs must use canonical tokens._
