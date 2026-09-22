# SEC-104 — Admin endpoint classification & migration

**Status:** Complete (classification 100%; first high-risk wave migrated)  
**Date:** 2026-07-20

## Classification

- All **185** `app/api/admin/**/route.ts` files listed in `lib/admin/api-route-registry.ts`
- CI: `npm run check:admin-route-registry` fails if any route is missing
- Remaining `legacy_pending_migration` entries trend toward `capability_gated`

## Migrated this wave (high-risk logistics + tour delete)

| Route | Wrapper |
|-------|---------|
| `/api/admin/tours` DELETE | `withOrgCommand` |
| `/api/admin/logistics/vendors` | `withAdminCapability` |
| `/api/admin/logistics/metrics` | `withAdminCapability` |
| `/api/admin/logistics/transport` | `withAdminCapability` |

Finance/ticketing surfaces already largely use `withAdminCapability` (see finances routes). Further waves continue converting legacy logistics/hiring/calendar routes.
