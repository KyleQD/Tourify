# ADM-B01 fresh migration rehearsal

Captured from the working tree on 2026-09-07 using the Supabase CLI version pinned by `.github/workflows/admin-rls-ci.yml` (`2.22.6`). The run used a newly created disposable local database; it did not connect to, reset, or reseed a persistent database.

## Result

The active migration chain applied successfully through `20260819210230_connected_worker_work_hub_security_hardening.sql`, then failed while applying `20260821025543_unified_guest_list_admissions.sql`.

Postgres reported `SQLSTATE 42P01`: `public.ticket_allocations` does not exist. The failing statement attempts to add columns and foreign keys to that table before the active chain creates it.

Repository tracing found the only table creation in `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/20260712120000_event_ticketing_foundation.sql`. Its archive manifest classifies it as `local_only_unapplied`, and the archive policy prohibits direct restoration without production-schema review and a new additive migration.

## Consequence

ADM-B01 remains open. Fresh-database application, live RLS tests, legacy-upgrade reconciliation, type-check, build, CI, and independent verification are not satisfied. No historical migration was edited and no archived migration was promoted.
