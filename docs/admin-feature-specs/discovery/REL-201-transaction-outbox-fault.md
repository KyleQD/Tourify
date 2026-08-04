# REL-201 — Transaction/outbox fault injection tests

## Discovery

### What the AC requires

REL-201 requires that transaction/outbox fault scenarios are testable in isolation:

1. **Pre-commit failure** — error before any write; zero domain rows, zero outbox rows
2. **Post-commit / pre-outbox failure** — domain row committed; outbox row absent; idempotent re-issue creates outbox row without duplicate domain row
3. **During-retry failure** — first handler attempt throws → `failed` outcome (no false success); second attempt delivers; handler invoked exactly once (no duplicate side-effect)
4. **Dead-letter** — row reaches `dead` after `maxAttempts`; is discoverable (not silently dropped); replay re-queues without a new domain row
5. **Fatal error** — immediate `dead` on first attempt; no retry budget wasted
6. **Recovery state always accessible** — dead rows remain in store and are replayable

### Existing infrastructure

- `lib/admin/publication-outbox.ts` — `shouldDeadLetterOutbox`, `nextOutboxStatusAfterFailure`, `computePublicationOutboxBackoffSeconds`, `classifyPublicationOutboxError`, handler registry
- `lib/admin/publication-outbox.service.ts` — `commitDomainWithOutbox`, `processPublicationOutboxBatch`, `replayPublicationOutboxDeadLetter` (all I/O-bound, not directly unit-testable)
- `lib/admin/tour-transition.service.ts` — uses `commitDomainWithOutbox` + idempotency keys
- `lib/admin/publication-transactional-publish.service.ts` — atomic snapshot + outbox via RPC

None of the service-layer functions are unit-testable without mocking Supabase RPCs. The right approach is:

### Approach

**Pure simulation layer** in `lib/admin/transaction-outbox-fault.ts` that:

- Models the three fault phases as `OutboxFaultPhase`
- Provides `SimulatedStore` (in-memory domain rows + outbox rows + handler invocation log)
- `simulateCommitWithOutbox` — idempotent commit+enqueue with fault injection
- `simulateProcessOutboxRow` — claim+handle+mark with per-attempt fault injection
- `simulateReplayDeadLetter` — re-queues dead rows; invariant-checks no duplicate domain row

Test file directly imports the simulation helpers + the real pure helpers from `publication-outbox.ts` (backoff, dead-letter threshold, fatal classification) to keep contract coupling.

### Files

- `lib/admin/transaction-outbox-fault.ts` — pure fault injection simulation helpers (185 lines)
- `__tests__/admin/transaction-outbox-fault.test.ts` — 18 cases across 6 describe groups

### Verification

```
✓ 18/18 tests passed
```
