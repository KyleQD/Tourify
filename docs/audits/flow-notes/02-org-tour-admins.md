# Flow notes — 02-org-tour-admins — 2026-07-18

## Environment
- Actor: Org (West Coast Touring Co)
- Tour: `00c6c4b5-0bf7-4c79-a5ad-2b2113ae6453`

## Findings

### P1 — Severe friction
- **Title:** Tour detail hub slow / timeout under turbopack
  - Route: `/admin/dashboard/tours/[id]`
  - Repro: First navigation after seed can exceed 60s before commit
  - Actual: Builder + list paths work; detail is heavier
  - Fix suggestion: Code-split Team/Finance panels; defer workflow sync in `TourTeamManager`

### P1 — Severe friction (fixed in campaign)
- **Title:** No one-click band → tour admin path
  - Fix shipped: `POST /api/admin/tours/[id]/grant-admins` + `GrantTourAdminsPanel` on Team tab
  - Also: `TourTeamManager.assignExistingUser` prefers grant-admins over legacy assign-user

### P2 — Polish
- **Title:** Dual tour team schemas (`profile` jsonb vs `name`/`email` columns)
  - Note: Admin team-members POST now writes live columns (`tour_id`, `name`, `email`, `status`)

## Passed without issue
- Tour create with 10 West Coast stops
- Artists 1–3 + org on Core Production team as admin / tour_manager
- `org_members` tour_manager grants for artists
