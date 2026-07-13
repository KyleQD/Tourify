# Phase 3 — Template Resolver and Token Onboarding Route

## Goal

Phase 3 fixes the onboarding template layer so worker token onboarding resolves templates by the actual hiring employer instead of falling back to a global default.

The flow is now:

```txt
token
→ staff_invitations
→ staff_onboarding_candidates
→ employer_entity_type + employer_entity_id
→ job/application/template metadata
→ entity-scoped onboarding template
→ safe global fallback only if no scoped template exists
```

## Files added

```txt
types/onboarding-template-resolver.ts
lib/hiring/default-onboarding-templates.ts
lib/services/onboarding-template-resolver.service.ts
lib/services/token-onboarding-payload.service.ts
lib/supabase/hiring-service-client.ts
app/api/onboarding/[token]/route.ts
supabase/migrations/20260625010000_seed_global_staff_onboarding_templates.sql
```

## Resolver priority

`resolveOnboardingTemplate()` uses this order:

```txt
1. Explicit template id from invitation/candidate/job
2. Employer-scoped template matching position and department
3. Legacy venue-scoped template using venue_id
4. Employer default template
5. Global position/department template
6. Global default template
7. Static safe fallback
```

The static fallback is only a fail-safe. It should not be the normal production path. If `shouldSeedTemplate` returns `true`, the repo should seed or initialize real `staff_onboarding_templates` rows.

## Important integration notes

### Supabase client

This phase includes `lib/supabase/hiring-service-client.ts` as a self-contained service-role client. If the repo already has a canonical server/service Supabase helper, Cursor should replace this helper with the existing project helper.

The token onboarding route is one of the few places service-role usage may be appropriate because an unauthenticated worker opens a token link. Keep this route server-only and audit all writes.

### Token column names

The route supports both:

```txt
staff_invitations.token
staff_invitations.invitation_token
```

Cursor should standardize on the actual repo column if only one exists.

### POST behavior in Phase 3

The provided route saves onboarding responses and updates candidate/invitation progress. Full roster activation through `staff_members` and `employment_assignments` is still completed in Phase 10 unless the existing repo already does it safely.

If the current route already creates staff rows correctly, merge the Phase 3 GET/template resolver logic into the existing route instead of deleting proven completion logic.

### Seed migration

The seed migration creates global defaults for:

```txt
General Staff
Security Guard
Bartender
```

Additional templates are provided in `lib/hiring/default-onboarding-templates.ts` and can be seeded by an admin initialization endpoint in a later phase.

If `staff_onboarding_templates.venue_id` is still `NOT NULL`, do not run the seed migration as-is. Either relax that constraint as part of the Phase 1 schema normalization or seed templates per employer.
