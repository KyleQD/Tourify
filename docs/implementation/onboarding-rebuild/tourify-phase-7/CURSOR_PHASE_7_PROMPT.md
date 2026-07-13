You are implementing Phase 7 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 7 files only. Do not start Phase 8.

Add or merge:
- types/job-posting-builder.ts
- lib/hiring/job-posting-builder-schema.ts
- components/hiring/job-posting-array-field.tsx
- components/hiring/application-form-field-builder.tsx
- components/hiring/job-posting-builder.tsx
- app/actions/hiring/create-job-posting.ts
- app/admin/dashboard/jobs/new/page.tsx
- docs/phase-7-job-posting-builder.md
- .cursor/rules/phase_7_job_posting_builder.md

Critical:
1. Do not delete the old admin job form until all routes have been moved to the universal builder.
2. Preserve real existing fields from components/admin/job-posting-form.tsx by adding them to the typed schema if needed.
3. Do not add mock jobs, mock applicants, mock candidates, or fake onboarding templates.
4. The builder must include employer_entity_type and employer_entity_id on every create payload.
5. Backend routes/actions must still validate hiring permissions using resolveHiringEntity() and can_manage_hiring().
6. If the repo already uses next-safe-action, wrap createJobPostingAction() with the existing actionClient instead of creating a new one.
7. If @/hooks/use-toast does not exist, switch the import to the repo's existing toast helper.
8. If /api/hiring/job-postings response shape differs, adapt only the response handling, not the data model.

Run:
pnpm typecheck
pnpm lint

Real-data validation:
1. Create a draft venue job.
2. Publish a venue job.
3. Create an organization job.
4. Create an artist job.
5. Confirm application_form_template.fields is saved exactly as typed JSON.
6. Confirm no staff_onboarding_candidates, staff_invitations, staff_members, or employment_assignments are created by job creation.

Stop after Phase 7 validation. Do not start Phase 8 application review work.
