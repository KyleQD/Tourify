# TOUR-103 — Legacy `/api/tours/*` route inventory

## Acceptance criteria

- Every `/api/tours/*` consumer has owner, replacement, data source, flag, and retirement milestone
- No undocumented write path remains

## Source of truth

Machine-readable inventory: [`lib/admin/legacy-tour-route-inventory.ts`](../../../lib/admin/legacy-tour-route-inventory.ts)

CI gate: `npm run check:legacy-tour-route-inventory`

## Flag / retirement

| Field | Value |
|---|---|
| Flag | `FEATURE_LEGACY_TOUR_API_WRITES` (reserved; wire in TOUR-604 cutover) |
| Retirement | `TOUR-604` (after telemetry zero + ADR-004 reconciliation) |

## Route summary

| Route | Writes? | Owner | Replacement |
|---|---|---|---|
| `/api/tours` | GET/POST | tour-portfolio | `/api/admin/tours` |
| `/api/tours/planner` | GET/POST | tour-planner | AdminTourEventOperationsService / admin tours |
| `/api/tours/planner/artists` | GET | tour-planner | `/api/admin/tours/artists` |
| `/api/tours/planner/venues` | GET | tour-planner | `/api/admin/tours/venues` |
| `/api/tours/planner/crew` | GET | tour-planner | workforce search (TBD) |
| `/api/tours/[id]` | GET/PUT/DELETE | tour-portfolio | `/api/admin/tours/[id]` |
| `/api/tours/[id]/events` | GET/POST | tour-planner | `/api/admin/tours/.../events` |
| `/api/tours/[id]/events/[eventId]` | GET/PUT/DELETE | tour-planner | Admin event ops |
| `/api/tours/[id]/team` | GET/POST | workforce | `/api/admin/tours/team-members` |
| `/api/tours/[id]/team/[memberId]` | GET/PUT/DELETE | workforce | team-members |
| `/api/tours/[id]/assign-user` | POST | workforce | team-members / grant-admins |
| `/api/tours/[id]/assign-user-to-team` | POST | workforce | team-members |
| `/api/tours/[id]/vendors` | GET/POST | vendor | `/api/admin/tours/vendors` |
| `/api/tours/[id]/vendors/[vendorId]` | GET/PUT/DELETE | vendor | vendors |
| `/api/tours/[id]/jobs` | GET/POST/PUT/DELETE | hiring | hiring job-postings |
| `/api/tours/[id]/invites` | GET/POST | workforce | staff invitations |

## Live UI consumers (product)

- `create-tour-form` → POST `/api/tours` (superseded by builder; still classified)
- Tour command panels → jobs + invites
- Event create / parties panels → planner search GETs
- Artist event create → planner venues/artists

## Orphan writes (no app UI)

- `/api/tours/[id]/events/[eventId]` mutations
- `/api/tours/[id]/assign-user`
- `/api/tours/[id]/assign-user-to-team` (weaker auth; do not add callers)

## Verify

- `npm run check:legacy-tour-route-inventory`
- `__tests__/admin/legacy-tour-route-inventory.test.ts`
