# Flow notes — 03-org-jobs-hire — 2026-07-18

## Environment
- Actor: Org + Workers 1–3
- Templates used: General Staff, Security Guard, Bartender

## Findings

### P1 — Severe friction (mitigated)
- **Title:** Hiring hub MissingScope without acting org / query params
  - Route: `/admin/dashboard/hiring`
  - Repro: Open hiring while General persona active → amber empty state
  - Fix shipped: `HiringMissingScope` lists hiring-capable personas with deep links (`entity_type` + `entity_id`)
  - Clickthrough uses scoped URL with org entity id

### P2 — Polish
- **Title:** Invite email dependency for non-seeded hires
  - Note: Scenario mints `staff_invitations.token` so QA does not need SendGrid
  - Product path should surface “copy invite link” after approve

## Hire → roster → ops verification (2026-07-19)

After application approve (not only onboarding approve):

1. Worker appears on Hiring Hub **Roster** as `pending`
2. Worker appears in `/api/admin/workforce/people` for the org/tour/event
3. Calendar / event task / lodging guest pickers can select the hire
4. Job with `tour_id` projects a crew row into `tour_team_members`
5. Worker opens `/dashboard/staff-ops` for shifts, tasks, lodging, travel
6. Onboarding approve upgrades roster to `active` / compliant

## Passed without issue
- Three published jobs linked to tour + distinct onboarding templates
- Workers 1–3 open `/onboarding/hire/{token}` authenticated (Playwright ✓)
- Candidate rows linked to worker `user_id` + `job_posting_id`
