# PLAN-104 — Reconciliation preview

## Acceptance criteria

UI displays exact relational and downstream consequences before destructive detach/reorder/date/venue changes.

## Surfaces

- `lib/admin/tour-reconcile-preview.ts` — preview model
- `POST /api/admin/tours/:id/plan/reconcile-preview`
- Tour builder AlertDialog before save when `requiresConfirmation`
- Autosave skips silent destructive writes; protected detachments block save

## Verify

`__tests__/admin/tour-reconcile-preview.test.ts`
