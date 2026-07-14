# Phase 4 Implementation Notes

## What this phase builds

Phase 4 adds the canonical hiring API layer and legacy admin adapters.

It includes:

- Shared route helpers.
- Zod API payload schemas.
- Canonical `/api/hiring/*` routes.
- Updated applicant-facing `/api/job-applications` route.
- Thin legacy adapters for existing admin endpoints.
- Documentation and Cursor rules.

## Important merge notes

1. `getAuthenticatedUserId()` currently validates `Authorization: Bearer <token>` using Supabase Auth.
2. If Tourify uses a cookie-based route handler client elsewhere, merge that existing auth helper into `lib/api/hiring-route-helpers.ts`.
3. If existing admin routes contain extra notification or contract logic, do not delete that logic blindly. Move it into `HiringOnboardingService` instead.
4. If table names differ, update the route wrappers and service facade together.
5. Do not start Phase 5 UI work until these API routes are validated against real Supabase rows.

## Real-data smoke test

Use a preview database with Phase 1 and Phase 3 migrations applied.

Test:

```txt
GET /api/hiring/dashboard?entity_type=venue&entity_id=<venue_id>
POST /api/hiring/job-postings
POST /api/job-applications
PATCH /api/hiring/applications/<application_id>
POST /api/hiring/invite
GET /api/hiring/roster?entity_type=venue&entity_id=<venue_id>
```

Also test legacy:

```txt
GET /api/admin/onboarding/dashboard?venue_id=<venue_id>
GET /api/admin/applications?venue_id=<venue_id>
```

## Stop point

Stop after Phase 4 validation. Do not rebuild worker onboarding UI until Phase 5.
```
