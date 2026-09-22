# WORK-104 — Remove demo availability/templates from live mode

**Date:** 2026-07-20  
**Spec:** `06_Workforce_Hiring_Roster_and_Scheduling.md`

## Acceptance criteria

Live organizations use persisted records only; demo fixtures are isolated by environment/account and visibly labeled.

## What shipped

- Live availability derived from assigned shifts only (`deriveLiveAvailability`) — no `index % 5` invented available/pending slots.
- Live staff without shifts marked `pending` (unknown), not `available`.
- Live templates = `[]` via `selectSchedulingTemplates("live")`; demo fixtures renamed `DEMO_SHIFT_TEMPLATES` with `isDemoFixture: true`.
- Templates UI labels demo samples; live empty state explains isolation.
- Create-shift template picker no longer offers demo presets in live mode.

## Follow-ups

- WORK-404 / WORK-407 — persisted availability intervals and org-owned templates.
- WORK-105 — identity merge/reconciliation.
