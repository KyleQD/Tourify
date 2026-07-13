# Phase 5 Implementation Notes

## What this phase builds

Phase 5 adds the worker-facing onboarding UI for token-based hiring onboarding.

It includes:

- typed worker onboarding payload and field definitions
- wizard shell
- stepper
- dynamic template-driven form renderer
- upload field component
- review and submit component
- token onboarding flow
- `/onboarding/[token]` route wrapper
- `/onboarding/hire/[token]` route wrapper

## What this phase intentionally does not build

This phase does not build:

- employer dashboard
- application review panel
- candidate kanban
- roster manager
- upload API implementation
- credentials vault implementation
- route redirects

Those are later phases.

## Expected dependencies

The repo should already have:

```txt
@/components/ui/alert
@/components/ui/button
@/components/ui/card
@/components/ui/checkbox
@/components/ui/input
@/components/ui/label
@/components/ui/progress
@/components/ui/select
@/components/ui/textarea
@/components/hiring/hiring-state-card
@/hooks/use-toast
@/lib/utils
@/types/hiring-entity
```

If any UI component path differs, adapt imports to match the repo.

## API dependency

The UI depends on the Phase 3 token route:

```txt
GET /api/onboarding/[token]
POST /api/onboarding/[token]
```

The response should include the real candidate, invitation, employer, and resolved onboarding template.

## Upload dependency

The upload field calls:

```txt
POST /api/hiring/onboarding/upload
```

If that endpoint is not implemented yet, do not enable templates with required file fields until Phase 11 or connect the component to the repo's existing secure upload path.

## Validation notes

`DynamicOnboardingForm` builds a Zod schema from the provided template fields. Required or blocking fields must be completed before the review step can submit.

## Cursor merge note

If a file already exists, merge carefully. Do not overwrite existing production completion logic in API routes. This phase is client UI plus route wrappers only.
