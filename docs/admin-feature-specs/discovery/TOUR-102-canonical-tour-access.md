# TOUR-102 — Canonical tour access service

## Acceptance criteria

- All panels resolve the same org/tour authority
- Collaborator and entity-grant behavior is consistent
- Legacy endpoints delegate to it

## Decision

Introduce `lib/admin/tour-access.service.ts` as the single authority resolver:

| Relation | Rule |
|---|---|
| `org_member` | `org_members` row for `tour.org_id` + acting org match |
| `tour_collaborator` | Active/confirmed `tour_team_members` (entity grants / grant-admins) |
| `legacy_owner` | `org_id` null and `created_by`/`user_id` = actor; no acting org |
| deny | Cross-org, pending collab, guessed IDs → `TourAccessDeniedError` (404) |

Capability checks (`requireTourCapability`) use org capability catalogs for members/owners and role defaults for collaborators (`admin`/`tour_manager`/… may `tour.manage`).

## Delegation path

```
assertAdminTourAccess / AdminTourEventOperationsService.getTour
  → requireTourAccess (canonical)
  → load tour + events presentation
```

Legacy `/api/tours/*` and panel routes that already call `assertAdminTourAccess` inherit the same authority. Authority-only callers can use `assertTourAuthority` / `requireTourAccess` without event fanout.

## Verify

- `__tests__/admin/tour-access.service.test.ts`
