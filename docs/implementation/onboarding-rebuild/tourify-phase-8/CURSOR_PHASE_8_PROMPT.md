You are implementing Phase 8 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 8 files only. Do not start Phase 9.

Add or merge:
- types/hiring-application-review.ts
- lib/hiring/application-review-schema.ts
- components/hiring/application-review-panel.tsx
- components/hiring/application-review-filters.tsx
- components/hiring/application-detail-drawer.tsx
- components/hiring/bulk-application-actions.tsx
- components/hiring/application-review-empty-state.tsx
- app/admin/(dashboard-shell)/applications/page.tsx
- app/admin/dashboard/applications/page.tsx
- docs/phase-8-application-review.md
- .cursor/rules/phase_8_application_review.md

Critical:
1. Do not add mock application rows.
2. Do not add fake candidate or fake eligibility data.
3. Preserve existing route layouts and auth wrappers.
4. If application-review components already exist, reuse the small presentational components and replace only the venue-only/container logic.
5. The panel must fetch real data from GET /api/hiring/applications.
6. Approve/reject/shortlist/waitlist must call PATCH /api/hiring/applications/[id].
7. Approval must be handled server-side by HiringOnboardingService.approveApplication().
8. Client components must not write directly to staff_onboarding_candidates, staff_invitations, staff_members, or employment_assignments.
9. If the API response shape differs, adapt the Phase 4 route output to the typed UI contract.
10. If @/components/ui/dialog does not support this dialog style, adapt to the repo's existing sheet/drawer component.

Run:
pnpm typecheck
pnpm lint

Real-data validation:
1. Open applications for a venue employer.
2. Open applications for an organization employer.
3. Open applications for an artist employer.
4. Filter by pending, reviewed, shortlisted, approved, and rejected.
5. Approve a pending application and confirm candidate + token are created by the backend bridge.
6. Reject an application and confirm no candidate is created.
7. Confirm no mock rows appear when there are zero applications.

Stop after Phase 8 validation. Do not start Phase 9 candidate kanban/workflow work.
