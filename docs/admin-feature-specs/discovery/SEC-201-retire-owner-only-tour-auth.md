# SEC-201 — Retire owner-only tour authorization

**Date:** 2026-07-20  
**Spec:** `01_Platform_Tenancy_RBAC_and_Audit.md`

## Acceptance criteria

Legacy routes delegate to canonical org/entity authorization; valid collaborators receive consistent behavior across every command-center tab.

## What shipped

### Migrated routes

| Route | Gate |
|---|---|
| `/api/tours/[id]` GET/PATCH/DELETE | `withAdminCapability` + `assertAdminTourAccess` |
| `/api/tours/[id]/events` GET/POST | same |
| `/api/tours/[id]/events/[eventId]` GET/PATCH/DELETE | same |
| `/api/tours/planner` GET | same (removed `user_id`/`created_by` OR filter + service-role bypass) |

Already on canonical access (VEND-101 / TOUR-102): team, vendors, jobs, invites, assign-*.

Admin command-center tabs already use `/api/admin/tours/**` + `assertAdminTourAccess`.

### Contract

- `lib/admin/sec201-owner-only-retirement.ts`
- `__tests__/admin/sec201-owner-only-retirement.test.ts` — source scan + collaborator access via `resolveTourAccess`

### Collaborator model

`resolveTourAccess` grants `tour_collaborator` for active `tour_team_members` on org-scoped tours when acting `orgId` matches — owners are no longer the only readers.

## Follow-ups

- `SEC-202` state-aware authorization
- Pure collaborators without `org_members` still need acting-org selection (SEC-204 / product)
