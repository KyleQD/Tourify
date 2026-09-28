# Migration, Cutover, and Rollback

## Modes

Per-organization persisted modes are `legacy_read`, `compare`, `canonical_read`, and `canonical_write`. Modes change only after recorded reconciliation and approval. There is never a dual-write mode.

## Cutover evidence

Reconciliation covers setup, products, orders, ticket counts and states, inventory, gross/fees/tax/refunds/net, promotions, admissions, and settlements. Counts, states, inventory, check-ins, and minor-unit totals must match exactly. A provider rounding exception is bounded to one minor unit and explicitly approved.

## Rollback boundary

Before the first canonical write, the persisted read mode can return to `legacy_read`. After canonical writes begin, legacy write authority is not restored. Affected operations are paused and repaired forward with compensating movements, idempotent retries, quarantined issues, and retained evidence.

Operational flags independently pause sales, refunds, promotions, offline scanning, or settlement publication. No rollback deletes data, drops historical tables, or weakens authorization.

## Cohorts

Internal organizations precede a small production cohort and staged expansion. Missing, denied, stale, mismatched, or unowned sources block cohort advancement. Comparison panels and mode details are internal Admin observability only.

