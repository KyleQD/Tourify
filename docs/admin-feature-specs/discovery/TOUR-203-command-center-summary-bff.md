# TOUR-203 — Command-center summary BFF

**Date:** 2026-07-20  
**Spec:** `02_Tour_Portfolio_Lifecycle_and_Command_Center.md`

## Acceptance criteria

One initial request returns identity, lifecycle, current/published versions, counts, risks, freshness, and domain access; p95 target is defined and measured.

## What shipped

| Piece | Detail |
|---|---|
| `GET /api/admin/tours/:id/summary` | BFF (`tour.view`) |
| `lib/admin/tour-command-center-summary.ts` | Assembler + `TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS = 800` |
| Telemetry | `tour.summary` via `recordTourSummaryTelemetry`; response `meta.latencyMs` + `withinP95Target` |
| Client | Tour command-center page prefers summary (fanoutCount=1); falls back to legacy 5-call fanout |

### Summary payload

- `identity`, `lifecycle`, `versions` (metadata / plan / published)
- `counts`, `risks`, `freshness`, `domainAccess`
- Hydration slices: `tour`, `events`, `teamMembers`, `vendors`, `financeTransactions`

## Tests

`__tests__/admin/tour-command-center-summary.test.ts`

## Follow-ups

- TOUR-204 split tab bundles
- TOUR-601 materialize/cache read model
