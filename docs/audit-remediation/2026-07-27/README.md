# Audit remediation execution

The unchanged July 27, 2026 handoff is preserved in [`source/`](source/README.md).
That snapshot is the authoritative specification for this recovery program.

Task identifiers from the handoff remain unchanged in the source tracker. In
repository discussions they are qualified as `AUDIT:<task-id>` so they cannot be
confused with the pre-existing Admin Feature Specification roadmap.

## Non-destructive invariant

All shared-database work follows:

`EXPAND → BACKFILL → VALIDATE → SWITCH → OBSERVE → RETIRE LATER`

- Never reset, restore over, recreate, or wholesale-replay migrations against a
  shared database.
- Never rename or rewrite a migration that may have been shared.
- Never delete tables, columns, rows, storage objects, or legacy migrations in
  this program.
- Treat the connected `Tourify Demo` project as potentially production and
  read-only until deployment configuration independently confirms its role.
- Use newly provisioned disposable databases for replay validation; do not reset
  an existing database.

## Execution artifacts

- [`EXECUTION_STATUS.md`](EXECUTION_STATUS.md) records phase gates and blockers.
- [`environment-registry.json`](environment-registry.json) records confirmed and
  unconfirmed targets without secrets.
- `generated/execution-tracker.csv` augments the original 157 tasks with execution
  evidence fields.
- `generated/local-migration-inventory.json` inventories every local migration,
  including checksums, Git state, duplicate versions, and risk signals.

Regenerate the generated artifacts with:

```sh
npm run audit:remediation-evidence
```

