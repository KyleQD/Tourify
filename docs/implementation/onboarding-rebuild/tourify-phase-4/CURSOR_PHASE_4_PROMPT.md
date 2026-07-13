# Cursor Prompt — Phase 4 API Cleanup

You are implementing Phase 4 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 4 files only. Do not start Phase 5.

## Add files

```txt
lib/api/hiring-route-helpers.ts
lib/api/hiring-api-schemas.ts
app/api/hiring/dashboard/route.ts
app/api/hiring/job-postings/route.ts
app/api/hiring/applications/route.ts
app/api/hiring/applications/[id]/route.ts
app/api/hiring/invite/route.ts
app/api/hiring/roster/route.ts
app/api/job-applications/route.ts
app/api/admin/job-postings/route.ts
app/api/admin/applications/route.ts
app/api/admin/applications/[id]/route.ts
app/api/admin/onboarding/dashboard/route.ts
app/api/admin/onboarding/candidates/route.ts
app/api/admin/onboarding/templates/route.ts
app/api/admin/onboarding/workflows/route.ts
docs/phase-4-api-cleanup.md
.cursor/rules/phase_4_api_cleanup.md
```

## Merge carefully

If any route already exists, do not blindly overwrite it.

Preserve real existing business logic by moving it into `HiringOnboardingService` or calling the service facade from the route. Remove duplicated approval bridge logic from route files.

## Required checks

1. Verify imports match the repo path aliases.
2. Merge `getAuthenticatedUserId()` with the existing Supabase cookie/session helper if the dashboard uses cookies instead of bearer auth.
3. Verify `staff_invitations` token column naming.
4. Verify `job_applications` columns for applicant name/email/phone fields.
5. Verify `staff_onboarding_templates` supports the inserted fields used by the templates route.
6. Confirm legacy `venue_id` query params still resolve as `HiringEntity` venue scope.

## Run

```txt
pnpm typecheck
pnpm lint
```

## Real-data API test

Test with real Supabase rows:

```txt
GET  /api/hiring/dashboard?entity_type=venue&entity_id=<venue_id>
POST /api/hiring/job-postings
GET  /api/hiring/applications?entity_type=venue&entity_id=<venue_id>
PATCH /api/hiring/applications/<application_id>
POST /api/hiring/invite
GET  /api/hiring/roster?entity_type=venue&entity_id=<venue_id>
```

Then test with `organization` and `artist` employer scopes.

Stop after Phase 4 validation. Report schema mismatches before starting Phase 5.
```
