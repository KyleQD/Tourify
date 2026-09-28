# TIX-105 — Remove default capacities

**Date:** 2026-07-20  
**Spec:** `09_Ticketing_Admissions_and_Guest_Lists.md`

## Acceptance criteria

Event builder requires explicit ticket setup or “not ticketed”; no GA/VIP records/quantities are silently created.

## What shipped

### Contract

`lib/admin/event-ticketing-setup.ts`

- Modes: `incomplete` | `not_ticketed` | `explicit_setup`
- `normalizeExplicitTicketTypeDrafts` — rejects missing names / non-positive qty (no GA/100 defaults)

### Surfaces

- Event setup checklist treats `not_ticketed` as ticketing **ready**
- Planner publish requires `ticketing_setup=not_ticketed` or explicit ticket drafts; removed `|| 'General Admission'` / `|| 100`
- Admin event create: ticketing setup select; prices are intent-only
- `ticketing_setup` persisted on `events_v2.settings` via tour-event-operations
- Event ticket manager: no default qty 100; create requires positive quantity

## Follow-ups

- Phase 1 next: `FIN-101`
- Org cutover still gated by TIX-104 mismatch dashboard
