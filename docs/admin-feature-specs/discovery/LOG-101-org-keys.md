# LOG-101 — Add/verify org scope across logistics

**Date:** 2026-07-20  
**Spec:** `08_Equipment_Catering_Logistics_and_Site_Maps.md`

## Acceptance criteria

Tasks, attachments, equipment, rentals, catering, maps, notes, collaborators, and child records pass direct-client multi-org tests.

## What shipped

### Migration

`20260720178000_logistics_org_keys_log101.sql`

- Additive `org_id` on logistics children (task equipment/activity, catering/backline children, site-map elements/tents/collaborators/activity/notes, map layers/versions/measurements/tasks/issues, equipment instances/workflows/tasks, comms channels)
- Backfill from parents only; quarantine unresolved via `admin_tenant_key_quarantine`
- Restrictive `log101_require_org_id` deny on children + ops parents with nullable org
- `admin_verify_logistics_org_keys()` for counts + parent mismatch

### Contract

`lib/admin/logistics-tenant-keys.ts` — table lists, parent→child FK map, verification helpers, `withLogisticsParentOrgId`.

### Write stamps

- Site map create stamps `org_id` from tour/event parent or acting scope
- Logistics task create stamps `org_id` from authorized logistics scope
- Task equipment / activity inserts inherit task `org_id`

### Deferred (documented)

`equipment_catalog`, `equipment_assets`, `rental_clients` — no safe parent without inventing. Storage-bucket attachments remain object-store scoped (no row metadata table yet). Rental agreement children already keyed in TRAVEL-101.

## Follow-ups

- `LOG-102` task taxonomy/authority
- Replace remaining `auth.uid()` blankets on catering/equipment/backline (capability RLS)
- `MAP-101` map inheritance polish
