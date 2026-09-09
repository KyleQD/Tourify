# ADM-B01 fresh migration rehearsal (reconciled chain)

Captured from the working tree on 2026-09-08. Fresh database rehearsal on a disposable PostgreSQL 15 container from the Supabase base image `public.ecr.aws/supabase/postgres:15.14.1.063` (the image pinned by the local CLI-2.115.0 stack and aligned with `supabase/config.toml` `major_version = 15`). All 277 active-chain migration files were applied in filename order, one transaction per file.

## Result

- 250 of 277 files applied cleanly.
- The three files that constituted the ADM-B01 blocker now apply cleanly:
  - `20260821000000_reconcile_ticketing_foundation.sql` — OK
  - `20260821010000_reconcile_event_attendance_shape.sql` — OK
  - `20260821025543_unified_guest_list_admissions.sql` — OK (the previous `ticket_allocations` SQLSTATE 42P01 failure is gone)
- Raw apply manifest: `raw-fresh-apply-manifest-2026-09-08.txt` (SHA-256 `1d3418675b76cde7fe3c76be56ea80fdb22ed5e80a4bec513dbcc5132048eb41`).
- Failure manifest SHA-256 `b1ac961c86dc5dc00e52aef5f13c4d24305e8749c58ffbd4d582cc5cd0be365b` (27 files).

## Failure classification (27)

All 27 failures are classified as local-stack bootstrap artifacts or cascades of those artifacts, not defects introduced by the reconciliation:

- `storage.buckets` / `storage.objects` do not exist in the raw base image; the CLI local stack creates them via its storage-api bootstrap before repo migrations. (buckets/objects failures: 8 files)
- `auth.jwt()` and `auth.users.email_confirmed_at` are provided by the auth-service bootstrap, absent in the raw base image. (2 files)
- Remaining failures reference objects created by migrations that never completed because of the bootstrap failures above (e.g. `member.position`, `candidate.compliance_status`, `staff_documents` columns, `ensure_workforce_coordinator_channel(uuid)`, `_world_*_place` canonical-prompt staging tables).

The 2026-09-09 attempt to rerun the full CLI `supabase start` stack is documented in `EVD-B01-LOCAL-STACK-TOOLING-ARTIFACT.md`. The CLI local stack could not complete a fresh apply in this environment due to tooling artifacts, not repository SQL:
- CLI 2.22.6 (CI pin): freshly-pulled `realtime:v2.34.47` no longer self-initializes and fails its internal migration (`relation "migrations" does not exist`), an image-tag drift since the 2026-09-07 rehearsal.
- CLI 2.115.0: platform role model runs `postgres` as non-superuser, and its migration-ingest path hits `permission denied for function pg_read_file`; `pgcrypto` is preinstalled and the same `create extension if not exists pgcrypto;` appears in ~30 earlier migrations that apply fine, so this is not a repository statement.

## Consequence

- The repository-chain blocker for ADM-B01 is resolved at the source level; the pinned fresh apply, live RLS tests, CI, and staging still require external environments to confirm and close the batch.
- ADM-B01 remains open until independent CI (`admin-rls-ci.yml` on a clean runner) and staging apply pass with evidence attached to the registry receipt.