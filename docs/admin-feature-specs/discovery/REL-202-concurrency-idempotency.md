# REL-202 — Concurrency / idempotency suite

## Discovery

### What the AC requires

REL-202 requires that the following eight surfaces behave **deterministically under duplicate or racing requests**:

| Surface | Concurrent scenario | Required outcome |
|---|---|---|
| Autosave (plan) | Two clients write on same version | CAS conflict → 409; loser gets diff; no silent overwrite |
| Stop reorder | Two reorders on stale version | Last-in-wins on successful version; conflicting request gets 409 |
| Publish | Duplicate idempotency key | Returns original record; no second checksum overwrite |
| Bulk assignment | Some items succeed, some fail | `partialFailure=true`; never hidden |
| Inventory reserve | Same reservationId twice | Idempotent; capacity consumed only once |
| Inventory finalize (scan) | Same ticket scanned twice | Idempotent; no double-consume |
| Finance posting | Two writes with same `expected_updated_at` | First wins; second gets CAS conflict (409) |
| Provider webhook | Duplicate delivery / replay | Signature verified first; then dedup by `(providerId, idempotencyKey)` |

### Existing infrastructure mapped

- **Autosave / plan version**: `TourPlanVersionConflictError` (409) in `tour-plan.service.ts`; `buildTourPlanConflictDiff` in `tour-plan-diff.ts`
- **Stop reorder**: `reorderStopsByIndex` / `assignContiguousOrdinals` / `assertUniqueContiguousOrdinals` in `tour-stop-ordinals.ts`
- **Publish idempotency**: `buildPublicationCommitIdempotencyKey` in `publication-transactional-publish.ts`; `alreadyExisted` return path in `commitDomainWithOutbox`
- **Bulk**: `summarizeBulkExecuteResults` + `partialFailure` in `tour-bulk-command.ts`
- **Inventory**: `reserveInventory` / `releaseInventory` / `finalizeInventory` in `lib/ticketing/inventory.ts` (service-layer, I/O-bound)
- **Finance CAS**: `expected_updated_at` fields in `updateTransactionCommandSchema` / `updateBudgetCommandSchema`; status machine in `canTransitionPaymentStatus` / `canTransitionSettlementStatus`
- **Webhook dedup**: no existing pure helper — modeled in simulation

### Approach

**Pure simulation layer** in `lib/admin/concurrency-idempotency.ts` covering all eight surfaces with injectable state objects. The test suite imports both simulation helpers **and** the real existing pure helpers from `tour-stop-ordinals.ts`, `tour-bulk-command.ts`, `tour-plan-diff.ts`, and `finance-command-schemas.ts` to keep contract coupling real.

### Files

- `lib/admin/concurrency-idempotency.ts` — pure simulation helpers (297 lines)
- `__tests__/admin/concurrency-idempotency.test.ts` — 37 cases across 9 describe groups

### Verification

```
✓ 37/37 tests passed
```
