# Phase 9 — Candidate Onboarding, Kanban, and Workflow

## Scope

Phase 9 adds the employer-facing candidate pipeline that tracks real `staff_onboarding_candidates` rows from invitation through onboarding completion and roster readiness.

This phase does not create mock candidates and does not replace the worker-facing token flow. It connects the employer dashboard to real candidate data and gives admins a clean review surface for documents, invitations, workflow status, and Work Mode output.

## Files added

```txt
types/hiring-candidate-workflow.ts
lib/hiring/candidate-workflow-schema.ts
lib/hiring/candidate-workflow-utils.ts
lib/services/hiring-candidate-workflow.service.ts
components/hiring/onboarding-kanban.tsx
components/hiring/onboarding-kanban-filters.tsx
components/hiring/candidate-detail-drawer.tsx
components/hiring/candidate-document-review.tsx
components/hiring/workflow-timeline.tsx
app/api/admin/onboarding/candidates/route.ts
app/api/admin/onboarding/documents/[documentId]/review/route.ts
app/admin/dashboard/onboarding/page.tsx
app/admin/dashboard/candidates/page.tsx
```

## Real data expectations

The candidate kanban fetches from:

```txt
GET /api/admin/onboarding/candidates?entity_type=&entity_id=
```

The route delegates to `HiringCandidateWorkflowService.listCandidates()` and reads real Supabase rows from:

```txt
staff_onboarding_candidates
job_applications
job_posting_templates
staff_onboarding_templates
staff_documents
onboarding_workflows
staff_members
employment_assignments
```

If the current repo has different relationship names, merge the normalization logic and adapt the Supabase `.select()` string to match the database.

## Kanban columns

The UI groups candidates into:

```txt
Invitation Sent
Started
Needs Documents
Submitted
In Review
Completed
Rejected
```

These are display columns only. They do not replace database status enums. The grouping function is `getCandidateKanbanColumnId()`.

## Document review

The detail drawer includes document review actions that call:

```txt
PATCH /api/admin/onboarding/documents/[documentId]/review
```

This endpoint must verify that the document belongs to a candidate under the active `HiringEntity` before updating `staff_documents`.

## Important merge notes

1. If `app/api/admin/onboarding/candidates/route.ts` already exists, merge this route rather than overwriting production behavior.
2. Keep any existing credential vault review logic intact.
3. If documents are stored in a different table or bucket metadata table, adapt `HiringCandidateWorkflowService` rather than changing the component contract.
4. If `HiringDashboardShell` or `resolveEmployerFromSearchParams` differs from Phase 6, use the repo’s current implementation.
5. Do not add drag-and-drop status changes until the backend has guarded status transition APIs.

## Validation

Test with real data:

```txt
1. Approve an application and confirm a candidate appears in Invitation Sent.
2. Open the candidate drawer and verify job, template, application, and token data.
3. Start the token onboarding flow and confirm the candidate moves to Started.
4. Submit required documents and confirm document rows appear.
5. Verify/reject a document and confirm staff_documents updates.
6. Complete onboarding and confirm the candidate moves to Completed.
7. Confirm staff_members and employment_assignments appear in the drawer.
```
