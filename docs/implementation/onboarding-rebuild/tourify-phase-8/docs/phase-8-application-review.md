# Phase 8 — Application Review Rebuild

## Scope

Phase 8 adds the employer-facing application review UI for the Universal Hiring & Onboarding module.

This phase does **not** create candidates directly from client components. Approval, rejection, waitlisting, and shortlisting are sent to the canonical Phase 4 API layer, which must delegate to `HiringOnboardingService`.

## Files

```txt
types/hiring-application-review.ts
lib/hiring/application-review-schema.ts
components/hiring/application-review-panel.tsx
components/hiring/application-review-filters.tsx
components/hiring/application-detail-drawer.tsx
components/hiring/bulk-application-actions.tsx
components/hiring/application-review-empty-state.tsx
app/admin/(dashboard-shell)/applications/page.tsx
app/admin/dashboard/applications/page.tsx
```

## Data flow

```txt
ApplicationReviewPanel
→ GET /api/hiring/applications?entity_type=&entity_id=&status=&job_id=
→ render real application rows
→ PATCH /api/hiring/applications/[id]
→ HiringOnboardingService.approveApplication() for approvals
→ candidate/token/workflow/employment bridge handled server-side
```

## Required API response shape

`GET /api/hiring/applications` should return one of:

```ts
{
  data: HiringApplicationReviewItem[]
}
```

or:

```ts
{
  applications: HiringApplicationReviewItem[]
}
```

Each application item should contain:

```ts
{
  id: string
  status: string
  appliedAt?: string
  rating?: number
  formResponses: Record<string, unknown>
  applicant: {
    id: string
    name: string
    email: string
    phone?: string | null
    avatarUrl?: string | null
  }
  job: {
    id: string
    title: string
    department?: string | null
    position?: string | null
    location?: string | null
  }
  candidate?: {
    id: string
    status?: string | null
    stage?: string | null
    onboardingProgress?: number | null
    invitationToken?: string | null
  } | null
  eligibility?: {
    isEligible?: boolean | null
    issues?: string[]
  } | null
}
```

## Decision payload

`PATCH /api/hiring/applications/[id]` receives:

```json
{
  "action": "approve",
  "employer_entity_type": "venue",
  "employer_entity_id": "uuid"
}
```

Allowed actions:

```txt
approve
reject
shortlist
waitlist
mark_reviewed
```

## Real-data requirements

- Do not insert fake applications.
- Do not add local mock candidates.
- Do not create `staff_members` or `employment_assignments` from React components.
- Empty states must reflect real empty API responses.
- Approval must run through the server bridge so candidate, token, workflow, audit, and Work Mode assignment stay consistent.

## Merge notes

The components intentionally reuse existing small UI components:

```txt
ApplicationApplicantSummary
ApplicationJobSummary
ApplicationResponsesList
ApplicationReviewActions
ApplicationStatusBadge
ApplicationInsightsBadges
ApplicationRating
```

If these components live outside `components/hiring`, update imports instead of duplicating them.
