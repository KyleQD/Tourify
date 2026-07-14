You are implementing Phase 9 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 9 files only. Do not start Phase 10.

Add or merge:
- types/hiring-candidate-workflow.ts
- lib/hiring/candidate-workflow-schema.ts
- lib/hiring/candidate-workflow-utils.ts
- lib/services/hiring-candidate-workflow.service.ts
- components/hiring/onboarding-kanban.tsx
- components/hiring/onboarding-kanban-filters.tsx
- components/hiring/candidate-detail-drawer.tsx
- components/hiring/candidate-document-review.tsx
- components/hiring/workflow-timeline.tsx
- app/api/admin/onboarding/candidates/route.ts
- app/api/admin/onboarding/documents/[documentId]/review/route.ts
- app/admin/dashboard/onboarding/page.tsx
- app/admin/dashboard/candidates/page.tsx
- docs/phase-9-candidate-kanban-workflow.md
- .cursor/rules/phase_9_candidate_workflow.md

Critical:
1. Do not add mock candidates, mock documents, or fake onboarding activity.
2. Use real staff_onboarding_candidates rows scoped by employer_entity_type and employer_entity_id.
3. If existing admin onboarding candidate routes already exist, merge carefully and preserve working behavior.
4. Do not let client components create staff_members or employment_assignments.
5. Do not add drag-and-drop status mutation until a guarded backend transition exists.
6. Keep application status separate from onboarding candidate status.
7. Verify document review checks employer scope before updating staff_documents.
8. Adapt Supabase relationship names in HiringCandidateWorkflowService to the actual schema.

Run:
pnpm typecheck
pnpm lint

Real-data validation:
1. Approve a real application and confirm a candidate appears in the kanban.
2. Open the candidate drawer and verify application, job, template, invitation, and workflow data.
3. Submit worker onboarding and verify the candidate progress/status changes.
4. Verify/reject a real uploaded document.
5. Confirm completed candidates show staff_members and employment_assignments when those rows exist.

Stop after Phase 9 validation. Do not start Phase 10 roster/Work Mode panel work.
