You are implementing Phase 5 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 5 files only. Do not start Phase 6.

Add or merge:
- types/hiring-worker-onboarding.ts
- components/hiring/onboarding-module/onboarding-stepper.tsx
- components/hiring/onboarding-module/onboarding-upload-field.tsx
- components/hiring/onboarding-module/onboarding-wizard-shell.tsx
- components/hiring/onboarding-module/dynamic-onboarding-form.tsx
- components/hiring/onboarding-module/onboarding-review-submit.tsx
- components/hiring/onboarding-module/token-onboarding-flow.tsx
- app/onboarding/[token]/page.tsx
- app/onboarding/hire/[token]/page.tsx
- docs/phase-5-worker-onboarding-ui.md
- .cursor/rules/phase_5_worker_onboarding_ui.md

Critical instructions:
1. This phase is worker-facing UI only.
2. Do not rebuild employer dashboards yet.
3. Do not add mock candidate/template/employer data.
4. The flow must fetch real data from GET /api/onboarding/[token].
5. The flow must submit real responses to POST /api/onboarding/[token].
6. If app/onboarding/[token]/page.tsx already exists, preserve important route metadata but replace the body with TokenOnboardingFlow.
7. If the repo does not yet have POST /api/hiring/onboarding/upload, leave OnboardingUploadField compile-ready and connect it during Phase 11.
8. Verify imports for useToast, HiringStateCard, and shadcn UI components.
9. Do not create staff_members or employment_assignments from client components.
10. Stop after Phase 5 validation.

Run:
pnpm typecheck
pnpm lint

Manual test with real data:
1. Use a real staff_invitations token generated from Phase 3.
2. Visit /onboarding/<token>.
3. Confirm the UI displays the real employer, candidate, position, and template fields.
4. Fill required fields.
5. Confirm missing required fields block submission.
6. Submit and confirm POST /api/onboarding/[token] handles completion server-side.
7. Repeat using /onboarding/hire/<token>.

Report any schema or import mismatches before proceeding to Phase 6.
