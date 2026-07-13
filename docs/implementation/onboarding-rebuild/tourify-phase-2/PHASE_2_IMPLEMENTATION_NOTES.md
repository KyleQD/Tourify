# Phase 2 Implementation Notes

## Completed in this package

This package adds the Phase 2 foundation files:

```txt
types/hiring-entity.ts
types/hiring-service.ts
lib/auth/hiring-permissions.ts
lib/auth/acting-context.ts
lib/services/hiring-onboarding.service.ts
docs/phase-2-auth-service-facade.md
.cursor/rules/phase_2_auth_service_facade.md
CURSOR_PHASE_2_PROMPT.md
```

## What this phase enables

- Resolving Venue, Organization, and Artist hiring scope through `HiringEntity`.
- Checking hiring permission through the Phase 1 `can_manage_hiring()` RPC.
- Creating job postings with employer scope.
- Listing job postings and applications by employer scope.
- Approving applications through a single service facade.
- Creating candidate + invitation + workflow + employment assignment shell during approval.
- Creating direct invites without a prior application.
- Loading token onboarding payloads from real invitation/candidate/template rows.
- Submitting token onboarding responses into real Supabase tables.
- Creating roster rows on onboarding completion.
- Returning real dashboard stats from Supabase counts.

## Important caution

The service uses conservative table/column assumptions based on the onboarding plan. Cursor should compare these with the actual repo schema before committing.

Likely places that may need adjustment:

```txt
staff_invitations.token vs staff_invitations.invitation_token
employment_assignments required fields
staff_members required fields
candidate name/email column names
actual organization membership tables used by can_manage_hiring()
actual Supabase server client import path
```

## Stop condition

Stop after Phase 2 compiles. Do not continue into template resolver or token route rewrites until Phase 3.
