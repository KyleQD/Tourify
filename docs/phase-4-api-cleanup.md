# Phase 4 — Hiring API Cleanup

## Purpose

Phase 4 creates the canonical API surface for the universal Tourify hiring and onboarding module. These routes delegate to the Phase 2 `HiringOnboardingService` and resolve all employer scope through `HiringEntity`.

No Phase 4 route should implement duplicate approval bridge logic outside the service facade.

## Canonical API routes added

```txt
GET  /api/hiring/dashboard?entity_type=&entity_id=
GET  /api/hiring/job-postings?entity_type=&entity_id=
POST /api/hiring/job-postings
GET  /api/hiring/applications?entity_type=&entity_id=
POST /api/hiring/applications
PATCH /api/hiring/applications/[id]
POST /api/hiring/invite
GET  /api/hiring/roster?entity_type=&entity_id=
```

## Applicant-facing route updated

```txt
GET  /api/job-applications
POST /api/job-applications
```

The POST route does not trust client-supplied employer scope. It loads the job posting and copies:

```txt
job_posting_templates.employer_entity_type
job_posting_templates.employer_entity_id
```

If the posting only has legacy `venue_id`, it falls back to:

```txt
employer_entity_type = "venue"
employer_entity_id = venue_id
```

## Legacy adapters included

The following routes are adapter exports or thin wrappers so existing admin UI paths can keep working while the new UI is built:

```txt
app/api/admin/job-postings/route.ts
app/api/admin/applications/route.ts
app/api/admin/applications/[id]/route.ts
app/api/admin/onboarding/dashboard/route.ts
app/api/admin/onboarding/candidates/route.ts
app/api/admin/onboarding/templates/route.ts
app/api/admin/onboarding/workflows/route.ts
```

## Auth adapter note

`lib/api/hiring-route-helpers.ts` includes `getAuthenticatedUserId()` using `Authorization: Bearer <supabase_access_token>`.

If the Tourify admin UI uses cookie-based Supabase sessions, merge that function with the repo's existing route-handler auth helper. Do not leave dashboard routes unusable behind bearer-only auth if the rest of the repo expects cookies.

## Validation checklist

- [ ] `GET /api/hiring/dashboard` returns real counts for venue, organization, and artist employer scopes.
- [ ] `POST /api/hiring/job-postings` creates a row with `employer_entity_type` and `employer_entity_id`.
- [ ] `POST /api/job-applications` copies employer scope from the posting, not the client.
- [ ] `PATCH /api/hiring/applications/[id]` delegates approval to `HiringOnboardingService.approveApplication()`.
- [ ] Legacy `/api/admin/*` routes still work with `venue_id` during migration.
- [ ] No API route uses mock data.
```
