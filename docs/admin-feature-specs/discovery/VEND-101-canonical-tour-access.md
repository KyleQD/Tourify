# VEND-101 — Migrate vendor/team/job routes to canonical tour access

**Date:** 2026-07-20  
**Spec:** `11_Vendors_Procurement_and_Contracts.md`

## Acceptance criteria

Authorized organization/tour collaborators get consistent results; all mutations verify vendor/engagement/tour/event org and capability.

## What shipped

### Legacy `/api/tours/[id]/*` (owner-only → canonical)

| Route | Capability | Gate |
|-------|------------|------|
| `vendors`, `vendors/[vendorId]` | `vendor.view` / `vendor.manage` | `assertAdminTourAccess` + `tour_id` match |
| `team`, `team/[memberId]` | `workforce.view` / `workforce.manage` | same |
| `assign-user`, `assign-user-to-team` | `workforce.manage` | same; team row must belong to tour |

### Admin surfaces

| Route | Change |
|-------|--------|
| `POST /api/admin/vendor-requests` | `vendor.manage` + `assertAdminEventAccess` |
| `PATCH /api/admin/vendor-requests/[id]` | `requireEventChildAccess` on `event_vendor_requests` |
| `GET /api/admin/team-members` | `workforce.view`; tour/event query params gated |

Admin `/api/admin/tours/{vendors,teams,team-members}` and `/api/tours/[id]/jobs` were already on TOUR-102 — unchanged.

## Follow-ups

- `VEND-102` vendor identity/deduplication ADR
- Event `/api/events/[id]/vendors` family (legacy `hasEventPermission`) when next pass allows
