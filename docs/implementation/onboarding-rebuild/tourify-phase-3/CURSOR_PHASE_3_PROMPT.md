# Cursor Prompt — Phase 3

You are implementing Phase 3 of the Tourify Universal Hiring & Onboarding rebuild.

Use the attached Phase 3 files only. Do not start Phase 4.

## Add or update files

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
```

## Important merge instructions

1. If `app/api/onboarding/[token]/route.ts` already exists, do not blindly replace it.
2. Preserve any existing real completion logic that creates `staff_members`, `employment_assignments`, or sends notifications.
3. Merge in the new GET payload logic and `resolveOnboardingTemplate()` behavior.
4. Standardize token lookup around the actual repo column: `token` or `invitation_token`.
5. Replace `lib/supabase/hiring-service-client.ts` with the repo's existing service-role helper if one already exists.
6. Before running the seed migration, verify `staff_onboarding_templates` allows global templates where `employer_entity_type` and `employer_entity_id` are null.
7. If `venue_id` is still required, seed templates per employer instead of global rows.

## Validation tasks

Create or identify real rows for these cases:

```txt
Venue candidate with employer_entity_type='venue'
Organization candidate with employer_entity_type='organization'
Artist candidate with employer_entity_type='artist'
Legacy venue candidate with only venue_id
```

Then verify:

```txt
GET /api/onboarding/[token]
```

returns:

```txt
invitation
candidate
employer
template
position
department
progress
```

The template must come from the correct employer where available. It must not blindly return a global default.

Run:

```txt
pnpm typecheck
pnpm lint
```

Stop after Phase 3 validation and report any schema mismatches.
