# PLAN-103 — Exact stop reconciliation

## Acceptance criteria

Submitted set supports add/update/reorder/detach; omitted links are handled according to explicit mode; event identity is retained unless separately eligible for deletion.

## Modes

| Mode | Omitted current links | Event rows |
|---|---|---|
| `exact` (default) | Detach `tour_events` link | Retained |
| `merge` | Kept | Retained |
| `attach_only` | Untouched | Retained |

## Surfaces

- `lib/admin/tour-stop-reconciliation.ts` — pure planner
- `AdminTourEventOperationsService.reconcileTourAssignments({ mode })`
- Plan write: `reconcileMode` on `PUT /api/admin/tours/:id/plan` (builder sends `exact`)
- Response includes `reconciliation` summary (`added` / `updated` / `detachEventIds` / `retainedEventIds`)

## Verify

`__tests__/admin/tour-stop-reconciliation.test.ts`
