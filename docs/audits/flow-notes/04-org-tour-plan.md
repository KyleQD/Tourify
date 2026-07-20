# Flow notes — 04-org-tour-plan — 2026-07-18

## Environment
- Actor: Org
- Tour: Pacific Signal — West Coast Run (10 cities)

## Findings

### P1 — Severe friction
- **Title:** No dedicated band schedule surface
  - Route: Admin calendar / tour hub
  - Actual: Day sheet times stored in `tours.settings.band_schedule` only
  - Fix suggestion: Band Schedule panel on tour hub reading `settings.band_schedule` + stop dates

### P2 — Polish
- **Title:** `staff_shifts` live schema requires `venue_id` + `staff_member_id`
  - Repro: Seed insert without staff_members row fails NOT NULL
  - Workaround: `tours.settings.crew_shifts` + lodging notes for QA completeness
  - Fix suggestion: After hire onboarding completes, auto-create `staff_members` and allow tour-scoped shifts without venue

### P2 — Polish
- **Title:** Lodging is free-text / JSON notes, not bookings
  - Note: Acceptable for planning MVP; logistics tab should render `settings.lodging`

## Hire → ops linkage (2026-07-19)

- Approved workers land on `staff_members` + `employment_assignments.tour_id`
- Tour crew projection writes `tour_team_members` (crew, not admin)
- Assign people via `/api/admin/workforce/people?tour_id=…` for lodging/calendar/tasks
- Worker verification surface: `/dashboard/staff-ops`

## Passed without issue
- 10-city route Seattle → Las Vegas with dates, venues, capacities
- Budget $450k on tour
- Lodging notes per market
- Crew shifts for 3 workers encoded in tour settings
- Band day sheet (load-in / soundcheck / doors / show / load-out) for all 10 cities
