# Tourify pre-reconciliation migration archive

Created during the August 20, 2026 Supabase migration-history reconciliation.

These SQL files are intentionally stored outside `supabase/migrations/` so they cannot be accidentally executed as active migrations.

The archive contains local-only development migrations, superseded variants, malformed historical migration versions, and duplicate migration-version files.

No archived migration should be restored directly to the active migration directory without reviewing the current production schema and creating an appropriate new additive migration.

## Classification counts

- `duplicate_version_noncanonical`: 2
- `invalid_timestamp_local_only`: 15
- `local_only_unapplied`: 236
- `superseded_conflicting_variant`: 34
