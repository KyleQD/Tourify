# EVENT-104 — Event version / conflict handling

**Date:** 2026-07-20  
**Spec:** `05_Event_Advancing_Day_Sheets_and_Live_Ops.md`

## Acceptance criteria

Concurrent changes and tour-plan changes surface version conflict or approved reconciliation; no silent overwrite.

## What shipped

| Piece | Behavior |
|---|---|
| `events_v2.event_version` | Optimistic concurrency column (default 1) |
| `updateEvent` | Bumps version; CAS on `event_version`; optional `expected_version` → 409 + diff |
| Tour plan reconcile | `touchEventsForTourPlanChange` bumps versions + `settings.tour_plan_touched_at` |
| `PATCH /api/admin/events/[id]` | Returns `code=version_conflict`, `diff`, server `event` |

## Client contract

Send `expected_version` (or `event_version`) equal to the loaded `event.event_version`. On 409, adopt server snapshot / reconcile — never overwrite silently.
