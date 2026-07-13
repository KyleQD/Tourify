# Phase 7 Implementation Notes

Phase 7 is complete as a drop-in package for Cursor. It builds the universal job posting builder using the Phase 2 `HiringEntity` foundation and Phase 4 `/api/hiring/job-postings` endpoint.

## Included files

```txt
types/job-posting-builder.ts
lib/hiring/job-posting-builder-schema.ts
components/hiring/job-posting-array-field.tsx
components/hiring/application-form-field-builder.tsx
components/hiring/job-posting-builder.tsx
app/actions/hiring/create-job-posting.ts
app/admin/dashboard/jobs/new/page.tsx
docs/phase-7-job-posting-builder.md
.cursor/rules/phase_7_job_posting_builder.md
CURSOR_PHASE_7_PROMPT.md
```

## Important implementation detail

`JobPostingBuilder` submits through `/api/hiring/job-postings` because that endpoint was created in Phase 4 and already delegates to `HiringOnboardingService.createJobPosting()`.

A server action adapter is included because the Tourify convention prefers server actions and `next-safe-action`. The adapter should be merged with the repo's existing Supabase server helper and action client. Do not create a second safe-action client.

## Before installing

Confirm these Phase 2–6 files exist:

```txt
types/hiring-entity.ts
types/hiring-service.ts
lib/services/hiring-onboarding.service.ts
lib/auth/acting-context.ts
app/api/hiring/job-postings/route.ts
lib/hiring/employer-search-params.ts
components/hiring/hiring-missing-scope.tsx
```

## Known repo-dependent merge points

- `@/hooks/use-toast` may need to become `@/components/ui/use-toast` if your repo uses the older shadcn path.
- `app/actions/hiring/create-job-posting.ts` has a small Supabase helper adapter. Replace it with the existing Tourify server client helper.
- If `app/admin/dashboard/jobs/new/page.tsx` already exists, merge this builder into the existing layout instead of overwriting navigation/auth wrappers.
- If the route should live under `/venue` or `/artist`, mount the same `JobPostingBuilder` there with the resolved `HiringEntity`.

## Validation commands

```bash
pnpm typecheck
pnpm lint
```

## Manual test sequence

1. Open `/admin/dashboard/jobs/new?entity_type=venue&entity_id=<venue_id>`.
2. Create a draft job with at least one application field.
3. Confirm a `job_posting_templates` row is inserted with `employer_entity_type='venue'`.
4. Repeat with `entity_type=organization`.
5. Repeat with `entity_type=artist`.
6. Confirm the public/applicant application flow still reads `application_form_template.fields`.
