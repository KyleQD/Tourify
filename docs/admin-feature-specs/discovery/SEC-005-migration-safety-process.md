# SEC-005 — Migration safety process

**Status:** Complete (process and deployment gate)  
**Last revalidated:** 2026-07-21

## Required checklist (every production migration)

1. **Dry run** on a representative snapshot (staging or anonymized copy).
2. **Preflight counts** — rows expected to update/backfill; sample of edge cases.
3. **Unresolved bucket** — rows that cannot be assigned a trusted `org_id` go to quarantine; never guess.
4. **Lock budget** — estimate lock time; use batching/`CONCURRENTLY` where appropriate.
5. **Rollback / forward-fix** — expand-only preferred; document irreversible steps.
6. **Postflight queries** — null `org_id` counts, orphan children, RLS smoke, app dual-read compare.
7. **Verification owner** — named engineer + approval before enabling org feature flag writes.

## Template location

Use `docs/engineering/migration-validation-template.md`. The static gate is `scripts/ci/check-migration-validation.mjs` and runs in main CI plus staging/production migration workflows.

The gate combines unstaged, staged, untracked, pull-request base, push-before, and explicitly supplied last-deployed commit diffs. A clean checkout no longer turns a committed migration PR into an empty scan. Manual deployment requires the reviewed base commit and production additionally requires the controlled release-evidence reference.

Before any hosted push, workflows now list local/remote migration history and execute the official `supabase db push --dry-run` preview. Production database migration execution is manual-dispatch-only and remains subject to the GitHub production environment approval.

## Forbidden

- `supabase db reset` against shared/local data used for ongoing work
- Assigning guessed organizations during backfill
- Dropping a policy without a replacement policy on the same table in the same migration/transaction
- Table/column/database drops, destructive renames, truncation, row deletion, or reset operations
- Unscoped `UPDATE` or `INSERT ... SELECT` backfills
- Existing-table FK/check constraints without `NOT VALID` or an explicit reviewed lock-budget marker
- `SET NOT NULL` without a validated precheck and explicit reviewed lock-budget marker

## Required exception markers

Markers document an already-reviewed safe case; they are not blanket waivers and must include a non-empty evidence identifier:

- `migration-validation: scoped-insert-select <evidence-id>`
- `migration-validation: blocking-constraint-reviewed <evidence-id>`
- `migration-validation: not-null-reviewed <evidence-id>`

Policy removal has no exception marker: each statically dropped table policy must have a replacement `CREATE POLICY` on the same table in the same migration/transaction.
