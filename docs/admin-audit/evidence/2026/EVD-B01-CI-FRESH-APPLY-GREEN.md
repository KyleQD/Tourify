# ADM-B01 independent CI fresh-apply + RLS matrix (green)

Captured 2026-09-09. Independent CI run of `admin-rls-ci.yml` on the `codex/admin-master-remediation` branch (commit `7cf660ad`).

## Run

- Workflow: `admin-rls-ci.yml` (REL-101), trigger `workflow_dispatch`
- Run: https://github.com/KyleQD/Tourify/actions/runs/34315208538
- Runner: `ubuntu-latest`, Node 20, Supabase CLI pinned `2.22.6` via `supabase/setup-cli@v1`
- Steps: `npm ci` → `supabase start -x realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor` → `supabase migration up --local` → export credentials → `npm run test:rls-matrix`
- Conclusion: **success** (all steps green)

## Result

- Fresh ephemeral database applied the complete active migration chain without failure, including:
  - `20260821000000_reconcile_ticketing_foundation.sql`
  - `20260821010000_reconcile_event_attendance_shape.sql`
  - `20260821025543_unified_guest_list_admissions.sql` (the previous `ticket_allocations` 42P01 blocker)
- Structural + live direct-client RLS matrix tests (`test:rls-matrix`) passed against the fresh database.

## Prerequisite fixes included to reach green

1. `885505af` — additive ticketing/attendance reconciliations and in-chain migrations; CI service flag `storage` → `storage-api`.
2. `0a9d12ce` — sync `package-lock.json` for `npm ci` (missing `three@0.169.0` and transitives).
3. `7cf660ad` — strip quotes from `supabase status -o env` so `API_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` are set without literal quotes before the RLS matrix.

## Scope note

This closes the fresh-database-and-RLS portion of ADM-B01's exit criteria. The representative legacy-upgrade apply and a repeatable local typecheck/build remain outstanding before the batch may be promoted.