# Phase 9 Implementation Notes

## What this package builds

Phase 9 adds the employer-facing candidate onboarding pipeline:

- real-data `OnboardingKanban`
- filter bar
- candidate detail drawer
- document review card
- workflow timeline
- candidate workflow service
- candidate API route
- document review API route
- route mount examples for admin onboarding/candidates pages

## What this package does not build

This phase does not:

- add drag-and-drop mutation
- create candidates from applications
- complete onboarding
- create staff members
- create employment assignments
- upload documents
- implement file storage buckets
- replace credential vault logic

Those responsibilities remain in the service/API layers from other phases.

## Merge carefully

The Supabase select string in `HiringCandidateWorkflowService.listCandidates()` is intentionally explicit but may need adaptation to the repo’s actual relationship names.

Check these likely mismatch areas:

- `applications:job_applications(...)` relationship alias
- `staff_documents` relationship name
- `onboarding_workflows` relationship shape
- `staff_members` relationship from candidates
- `employment_assignments` relationship from candidates
- `staff_documents.reviewed_by` column
- `hiring_audit_events.event_type` enum or text constraint

If a relationship is not available, query the child table separately in the service and keep the component contract unchanged.

## Required validation

Run:

```txt
pnpm typecheck
pnpm lint
```

Then validate with real rows for:

```txt
venue candidate
organization candidate
artist candidate
legacy venue candidate
candidate with documents
candidate with completed onboarding
candidate with staff_members + employment_assignments
```
