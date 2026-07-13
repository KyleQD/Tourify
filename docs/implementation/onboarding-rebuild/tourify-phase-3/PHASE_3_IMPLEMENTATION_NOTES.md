# Phase 3 Implementation Notes

## What this phase includes

Phase 3 adds the entity-scoped onboarding template resolver and updates token onboarding loading so worker onboarding uses the correct employer template.

## Files

```txt
types/onboarding-template-resolver.ts
lib/hiring/default-onboarding-templates.ts
lib/services/onboarding-template-resolver.service.ts
lib/services/token-onboarding-payload.service.ts
lib/supabase/hiring-service-client.ts
app/api/onboarding/[token]/route.ts
supabase/migrations/20260625010000_seed_global_staff_onboarding_templates.sql
docs/phase-3-template-resolver-token-route.md
.cursor/rules/phase_3_template_system.md
CURSOR_PHASE_3_PROMPT.md
```

## Expected Cursor merge work

1. Confirm the repo's canonical Supabase server/service client path.
2. Replace `createHiringServiceClient()` usage with the existing repo helper if preferred.
3. Confirm token column naming: `token` vs `invitation_token`.
4. Confirm `staff_onboarding_templates` columns before running the seed migration.
5. Merge the new GET resolver behavior into the existing `app/api/onboarding/[token]/route.ts` if the existing POST route has important completion logic.
6. Do not delete existing staff activation logic unless Phase 10 replacement is ready.

## Validation checklist

- Opening an onboarding token returns invitation, candidate, employer, position, template, existing responses, and progress.
- A venue-scoped candidate resolves a venue-scoped template.
- An organization-scoped candidate resolves an organization-scoped template.
- An artist-scoped candidate resolves an artist-scoped template.
- Legacy venue candidates with only `venue_id` still resolve.
- Missing templates return a safe fallback and set `shouldSeedTemplate: true` internally.
- No fake candidates or fake template rows are used in production UI.

## Stop condition

Stop after Phase 3 validation. Do not start Phase 4 API cleanup until token template resolution is proven against real rows.
