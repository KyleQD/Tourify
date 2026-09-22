# Active Supabase migration chain

Only numbered SQL files directly in this directory are active migrations. Their
lexicographic filename order is the authoritative schema apply order for local
and hosted Supabase environments.

`archive/`, `../migration-archive/`, `../migrations_backup/`, and root-level
`supabase/*.sql` files are retained only as historical evidence. They are never
an apply source and must not be copied into an active environment.

CP-051 in `docs/engineering/INDEX.md` governs application in every environment:
review the exact numbered migration and target history, then apply migrations
manually and explicitly, one at a time, through the approved operator path.
Do not run `supabase db reset`, force a full-chain replay, or use archived SQL as
an apply source. If a migration version is absent but its objects are present,
pause for catalog and history reconciliation before any re-apply or history
repair. Record target, operator, time, file checksum, postflight, and forward
repair evidence in its migration-validation manifest and DB-008 ledger.
