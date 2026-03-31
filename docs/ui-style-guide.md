# AO-OS UI Style Guide

## 1. Semantic Token Map

### Surface
- `surface-0`: #0F1F1B (base, stone/charcoal)
- `surface-1`: #161F1A (layered panel)
- `surface-2`: #232B26 (elevated panel)
- `surface-elevated`: #2C3630 (modal/overlay)

### Text
- `text-primary`: #F3F4F6
- `text-secondary`: #B6BFC7
- `text-muted`: #7A868C
- `text-inverse`: #0F1F1B

### Accent
- `accent-primary`: #14B8A6 (teal, selective)
- `accent-active`: #06B6D4 (cyan, beacon)
- `accent-beacon`: #F59E42 (warm alert)

### Border
- `border-subtle`: #232B26
- `border-strong`: #14B8A6

### Status (Resource/Visit/Wristband)
- `status-available`: #14B8A6
- `status-held`: #F59E42
- `status-occupied`: #F43F5E
- `status-cleaning`: #FBBF24
- `status-out-of-service`: #7A868C

### Feedback
- `info`: #06B6D4
- `warning`: #F59E42
- `critical`: #F43F5E
- `success`: #22C55E

### Exception
- `exception-open`: #F43F5E
- `exception-acknowledged`: #F59E42
- `exception-resolved`: #14B8A6

## 2. Typography
- **Sans-serif**: System UI, clean, calm for all transactional UI
- **Serif**: Only for rare branded headers/section moments
- **Hierarchy**: Large, calm headings; strong but not busy

## 3. Component Doctrine
- Layered, framed, intentional panels
- Sparse copy, strong hierarchy
- Fewer bright accents, teal only as beacon
- Large, calm hit targets
- State = icon + label, not color alone

## 4. Exception Patterns
- Inline banners for recoverable issues
- Blocking modals for critical failures
- Exception drawer/panel for staff
- Severity/status chips for open, acknowledged, resolved

## 5. Implementation Checklist
- [ ] Tailwind config: add semantic tokens
- [ ] globals.css: update base styles, typography
- [ ] Refactor: AppShell, SidebarNav, Button, Card, StatusBadge, Modal, Input
- [ ] State color/icon mapping for resource, visit, wristband, exception
- [ ] Dashboard redesign (flagship)
- [ ] Add exception patterns (banners, modals, panels)

---

_This guide is the foundation for all AO-OS UI work. Every PR should reference these tokens and rules._
