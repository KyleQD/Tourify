---
description: Phase 8 application review rebuild rules for Universal Hiring & Onboarding.
globs:
  - "components/hiring/**"
  - "app/admin/**/applications/**"
  - "types/**"
  - "lib/hiring/**"
alwaysApply: false
---

# Phase 8 — Application Review Rules

- Application review UI must use `HiringEntity` scope.
- Do not use `venueId` as the only source of truth.
- Do not add mock applications, fake applicants, fake candidates, or local-only review data.
- `ApplicationReviewPanel` must fetch from `/api/hiring/applications`.
- Review actions must call `/api/hiring/applications/[id]`.
- Approvals must delegate server-side to `HiringOnboardingService.approveApplication()`.
- Client components may not create `staff_onboarding_candidates`, `staff_invitations`, `staff_members`, or `employment_assignments` directly.
- Reject actions should support a reason in the API even if the first UI version only sends the action.
- Bulk actions may call the same single-action endpoint until a dedicated bulk endpoint exists.
- Preserve existing real application-review logic by moving it behind the service/API layer, not by duplicating it in React.
