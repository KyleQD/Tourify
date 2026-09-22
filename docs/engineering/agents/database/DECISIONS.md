# Database decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DB-003 — Active root migration chain is the only apply source

- Date: 2026-09-09
- Status: accepted
- Task: DB-003
- Decision: Only numbered SQL files directly in `supabase/migrations/` are active. Archive directories and root-level Supabase SQL are historical evidence, not apply inputs. Target applies use `supabase db push` so the Supabase migration-history table determines what is pending.
- Evidence: `scripts/ci/check-active-migration-chain.mjs`, `supabase/migrations/README.md`, and the removal of the divergent manual file list in `scripts/run-migrations.sh`.
- Consequences: A fresh local replay uses `supabase db reset`; no operator may replay selected SQL through the Management API or `psql` outside Supabase migration history.

## DB-004 — Generated schema types have one canonical path

- Date: 2026-09-09
- Status: accepted
- Task: DB-004
- Decision: `lib/database.types.ts` is the sole generated Supabase schema contract. `types/supabase.ts` remains only as a re-export compatibility path, while `types/database.types.ts` is explicitly hand-authored application view models.
- Evidence: `scripts/ci/generate-database-types.mjs`, `scripts/ci/check-database-types.mjs`, and the Database Types CI job.
- Consequences: Schema changes require a fresh local replay followed by `npm run generate:database-types`; CI rejects a committed generated file that does not match that replay.
