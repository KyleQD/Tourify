You are implementing Phase 13 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 13 files only.

Add:
- types/hiring-real-data-test.ts
- lib/testing/hiring-real-data-test-config.ts
- lib/testing/hiring-real-data-test-helpers.ts
- scripts/hiring/phase-13-real-data-smoke-test.ts
- tests/hiring/phase-13-real-data.spec.ts
- supabase/tests/phase_13_hiring_real_data_checks.sql
- docs/phase-13-real-data-testing.md
- .cursor/rules/phase_13_real_data_testing.md

Critical:
1. Do not add mock data.
2. Do not change product behavior unless a real-data acceptance test exposes a bug.
3. Run these checks on a Supabase preview/branch database first.
4. Configure PHASE13_* env vars using real row IDs from the preview database.
5. Confirm Venue, Organization, and Artist hiring scopes all work.
6. Confirm token onboarding uses entity-scoped templates.
7. Confirm completed onboarding creates staff_members and employment_assignments.
8. Confirm private document buckets remain private.
9. Confirm sensitive fields are not saved raw in onboarding_responses JSON.
10. Confirm legacy venue_id compatibility still works.

Run:
pnpm typecheck
pnpm lint
pnpm test tests/hiring/phase-13-real-data.spec.ts
pnpm tsx scripts/hiring/phase-13-real-data-smoke-test.ts

Also run the SQL checks in:
supabase/tests/phase_13_hiring_real_data_checks.sql

Final report should include:
- scenarios tested
- pass/fail/warn/skip counts
- API route failures
- schema mismatches
- RLS failures
- onboarding token failures
- roster/Work Mode failures
- recommended fixes before production

This is the final planned phase. After validation, create a production-hardening punch list from any failures.
