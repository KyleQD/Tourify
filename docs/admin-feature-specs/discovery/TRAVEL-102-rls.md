# TRAVEL-102 — Replace permissive RLS

**Date:** 2026-07-20  
**Spec:** `07_Travel_Transport_and_Lodging.md`

## Acceptance criteria

Direct clients cannot list or mutate another organization through parent or child IDs; legitimate tour/logistics roles pass.

## What shipped

Migration `20260720176000_travel_rls_travel102.sql`

### Catalog blankets removed

`lodging_providers`, `lodging_room_types`, `lodging_availability`, `rental_clients` no longer allow `auth.uid() IS NOT NULL`.  
They receive `org_id` (backfill when uniquely determined), quarantine unresolved, and `can_logistics` policies.

### Children hardened (post TRAVEL-101 org_id)

Select/write require:

1. `child.org_id is not null`
2. `can_logistics(uid, child.org_id, view|manage)`
3. `EXISTS (parent … AND parent.org_id IS NOT DISTINCT FROM child.org_id)`

Guessing a foreign parent UUID or child UUID from another org fails.

### Contract

`lib/admin/travel-rls-contract.ts` — tables, removed bypass patterns, policy predicate docs.

## Follow-ups

- `TRAVEL-103` — per-command schemas (reject arbitrary CRUD payloads)
- Stamp catalog creates with acting `org_id` in lodging API when acting context is present
