# Job Posting Component Standards

These standards keep job-posting creation consistent across Tourify. The goal is to let every route preserve its own workflow while sharing the same UI foundation, validation expectations, and adapter pattern.

## Allowed Creation Surfaces

- New modal-style posting flows must use `components/job-posting/job-posting-wizard-shell.tsx`.
- Full create/edit workforce pages must use `components/hiring/job-posting-builder.tsx`.
- Do not create route-local copied modal wizards for new job-posting work.
- If a route needs a new field, add it to the relevant canonical contract before adding route-local state.

## Canonical Contracts

- Workforce, admin, venue, and scoped staffing postings use `JobPostingFormValues` and `jobPostingFormSchema`.
- Public artist-marketplace postings use `CreateJobFormData`.
- Route-specific defaults belong in adapters or wrapper props, not in duplicated UI shells.
- Job status semantics must stay explicit:
  - Workforce-style flows use `draft`, `published`, `closed`, or `archived`.
  - Artist-marketplace flows use `draft`, `open`, `paused`, `closed`, or `filled` where supported by their endpoint.

## Adapter Requirement

Every posting route must own only an adapter/wrapper that maps canonical form values to:

- The existing endpoint.
- Required route context such as employer, venue, event, or tour IDs.
- Auth or acting-context headers.
- Success refresh behavior.
- Endpoint-specific response and error handling.

Shared adapter helpers live in `lib/job-posting/job-posting-adapters.ts`.

## UX Rules

- Use the shared dialog sizing, scroll behavior, step indicator, footer, and loading state.
- Keep required fields labeled with `*` and disable continue/submit until the current step is valid.
- Keep title and description first in every posting flow.
- Preserve a final review step before submit.
- Use consistent toast language:
  - Success: `Job posted`, `Job posting published`, or `Draft saved`.
  - Failure: `Could not post job`, `Failed to create job`, or `Unable to create job posting`.
- Keep modal content within `max-h-[90vh]` and allow internal scrolling.
- Mobile layouts must stack fields before switching to multi-column grids on larger screens.

## Behavior Preservation Checklist

Before replacing or editing a job-posting component, document and preserve:

- Required fields.
- Optional fields.
- Default values.
- Submit endpoint and method.
- Auth headers or credentials.
- Status value sent on create.
- Route context included in the payload.
- Success callback or refresh behavior.
- Error message behavior.
- Whether the route creates workforce postings, artist jobs, or an endpoint-specific compatibility record.

## Deprecation Rule

When a route is migrated, remove the old component or mark it with a clear `Deprecated` comment in the same change. Do not leave two active job-posting forms for the same route.

Current legacy components retained only for compatibility:

- `components/admin/job-posting-form.tsx`
- `components/admin/enhanced-job-posting-form.tsx`
- `components/venue/jobs/create-job-modal.tsx`

## Review Checklist

Reject new job-posting changes that:

- Introduce an independent job-posting schema.
- Copy a modal shell, progress stepper, or submit footer.
- Add route-specific category constants when an existing category source is available.
- Put endpoint-specific payload mapping directly inside shared UI.
- Change a route from one endpoint/table to another without an explicit migration plan.
- Remove route context such as event, tour, venue, employer, or acting-account scope.
