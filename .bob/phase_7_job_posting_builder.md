---
description: Phase 7 rules for the universal Tourify job posting builder.
globs:
  - "components/hiring/job-posting-builder.tsx"
  - "components/hiring/application-form-field-builder.tsx"
  - "components/hiring/job-posting-array-field.tsx"
  - "lib/hiring/job-posting-builder-schema.ts"
  - "types/job-posting-builder.ts"
  - "app/actions/hiring/create-job-posting.ts"
  - "app/admin/dashboard/jobs/new/page.tsx"
alwaysApply: false
---

# Phase 7 — Job Posting Builder Rules

- Do not add mock jobs, mock applicants, or mock onboarding templates.
- Every create/update payload must include `employer_entity_type` and `employer_entity_id`.
- Do not trust client-submitted employer scope on the backend; backend routes and actions must resolve permission again.
- Keep `application_form_template.fields` fully typed. Do not use `z.any()` for field schemas.
- Keep platform onboarding and hiring onboarding separate.
- Do not create staff members, candidates, invitations, or employment assignments from the job posting form.
- Draft and publish are the only submit behaviors in this phase.
- If replacing existing admin job forms, preserve any real production-only fields by adding them to the typed schema before removal.
- If using `next-safe-action`, wrap the provided server action logic with the repo's existing action client instead of inventing a second action client.
