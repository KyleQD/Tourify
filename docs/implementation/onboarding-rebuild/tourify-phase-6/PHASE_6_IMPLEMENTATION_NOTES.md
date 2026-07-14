# Phase 6 Implementation Notes

## What this phase builds

Phase 6 adds the universal employer-facing hiring dashboard shell and real-data panels for:

- Overview
- Jobs
- Applications
- Onboarding
- Roster
- Templates
- Audit

The dashboard is scoped by `HiringEntity` and is intended to replace venue-only dashboard entry points.

## Important merge instructions

1. Do not blindly overwrite existing app route pages if they contain auth or layout logic.
2. Mount `<HiringDashboard employer={employer} />` inside the existing layout.
3. Replace the included search-param fallback with repo-native acting context where available.
4. Keep the included fallback during migration if routes still need URL-driven scope.
5. Verify that Phase 4 APIs return shapes compatible with `types/hiring-dashboard.ts`.
6. If API response keys differ, normalize in the API route or inside the panel before setting state.

## Real data guarantee

This phase does not use mock data. It only renders:

- Real API results
- Loading states
- Error states
- Empty states

## Deferred to later phases

- Phase 7: full `JobPostingBuilder`
- Phase 8: full application review actions and bulk approval UI
- Phase 9: onboarding kanban and candidate detail drawer
- Phase 10: roster assignment and Work Mode management actions
