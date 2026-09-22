# MAP-101 — Organization inheritance for site maps

**Date:** 2026-07-20  
**Spec:** `08_Equipment_Catering_Logistics_and_Site_Maps.md`

## Acceptance criteria

Authorized tour/event users discover maps by capability; external collaborator/token behavior remains scoped and tested.

## What shipped

### RLS

Migration `20260720179000_site_map_org_inheritance_map101.sql`

- `map101_logistics_select` — `can_logistics(... view|manage)` via `resolve_logistics_org_id`
- `map101_logistics_write` — manage capability mutate
- Dropped blanket authenticated `is_public` SELECT (external read = share-token service route)

Owner + collaborator policies retained.

### Contract + access

- `lib/admin/map-access-contract.ts` — discovery roles, share-token gate, inheritance predicate
- `getSiteMapAccess` — org logistics capability branch (`org_capability` / viewer)
- Public token route uses `evaluateMapShareTokenGate`

### List discovery

`GET /api/admin/logistics/site-maps` no longer filters to `created_by` only; uses acting org scope + RLS inheritance (owner | collaborator | capability).

### Tests

`__tests__/admin/map-access-contract.test.ts` — capability discovery, collaborator scope, token inactive/expired.

## Follow-ups

- Phase 3 map version publication (MAP-303+)
- Child-table SELECT inheritance polish if nested joins still fail under RLS
