# ADM-B01 ticketing foundation reconciliation

The fresh-chain failure was traced to `public.ticket_allocations` and its related ticketing foundation objects existing only in the archived local-only migration `20260712120000_event_ticketing_foundation.sql`.

A new additive migration now restores that foundation in the active chain before `20260821025543_unified_guest_list_admissions.sql`:

- `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql`
- The migration body was reviewed against the archived source and carried forward without restoring or editing historical migration files; three existing-table constraints use `NOT VALID` so deployment does not take an avoidable validation lock.
- Existing-table constraints that can acquire locks were changed to `NOT VALID`; validation remains a separate controlled operation.
- Migration validation, active-chain policy scanning, Admin route/service-role checks, and the full Admin test suite pass locally after the change.

The disposable fresh-database rehearsal could not be rerun in this session because the exact CI-pinned Supabase CLI could not be downloaded and the local Docker socket was unavailable. This receipt therefore records source-level reconciliation, not a passing migration-apply claim. CI and staging must still apply the complete chain before the blocker is closed.
