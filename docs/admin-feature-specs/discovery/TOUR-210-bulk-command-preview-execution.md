# TOUR-210 — Bulk command preview/execution

## Acceptance criteria

Bulk operations show eligible/ineligible items before confirmation, require idempotency, and return item-level results without hiding partial failure.

## Shipped

1. **Contracts** — `lib/admin/tour-bulk-command.ts`
   - Actions: `transition` (lifecycle commands), `delete_drafts`, `assign_tags`
   - Max 100 tour ids; validated payload grammar

2. **Preview** — `POST /api/admin/tours/bulk-preview`
   - Per-item eligible/ineligible with codes/blockers/nextState
   - Uses `previewTourTransition` + delete eligibility + access checks
   - No Idempotency-Key required

3. **Execute** — `POST /api/admin/tours/bulk`
   - `withOrgCommand` + required `Idempotency-Key`
   - Item-level `results[]`, `succeeded`, `failed`, `partialFailure`
   - HTTP 200 with `partialFailure: true` when mixed outcomes (never hides failures)

4. **UI** — Portfolio multi-select + `TourBulkCommandDialog` (archive/restore/cancel/delete drafts)

## Verify

```bash
npx vitest run __tests__/admin/tour-bulk-command.test.ts
```

## Follow-ups

- TOUR-301 health aggregation
- Optional bulk assign_tags UI picker on portfolio
