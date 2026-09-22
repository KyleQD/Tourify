# TIX-101 — Drop permissive legacy ticketing policies

**Date:** 2026-07-20  
**Spec:** `09_Ticketing_Admissions_and_Guest_Lists.md`

## Acceptance criteria

Explicit migration drops blanket policies; direct Org A/Org B tests prove parent and record-ID isolation before UI rollout.

## What shipped

### Migration

`20260720180000_tix101_drop_legacy_policies.sql`

- Idempotent `DROP POLICY IF EXISTS` for SEC-108 blankets + `ticket_analytics_events_insert`
- `admin_verify_tix101_no_blanket_policies()` — must return zero rows after apply

Capability policies from `20260719230353_admin_ticketing_security.sql` remain the destination model (`has_perm` + `ticketing.*`).

### Isolation contract

`lib/admin/tix101-rls-isolation-contract.ts`

- Dropped policy list
- Isolation tables via `events_v2.org_id` / `event_id`
- `buildTix101OrgIsolationCases()` — Org A allow, Org B/anon deny, parent + record-id dimensions

### Tests

`__tests__/admin/tix101-rls-isolation-contract.test.ts` — structural Org A/B coverage (live DB optional later via `ADMIN_RLS_TEST_DATABASE_URL`).

## Follow-ups

- `TIX-102` harden foundation membership `*_all` policies / grants
- Wire live persona matrix when RLS CI DB is available
