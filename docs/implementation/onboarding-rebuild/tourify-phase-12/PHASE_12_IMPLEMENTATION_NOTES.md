# Phase 12 Implementation Notes

## Scope

Phase 12 separates Tourify's platform/persona onboarding from staff hiring onboarding.

This package adds:

- Persona onboarding types
- Persona onboarding config
- Persona onboarding UI shell
- Route helpers
- Legacy token redirects
- Retired onboarding route redirects
- Next config redirect snippet
- Cursor rule addendum

## Important merge warnings

Do not blindly overwrite an existing `/onboarding/page.tsx` if it contains real signup, auth, or account creation logic. Instead, merge these behaviors:

1. `/onboarding?token=` redirects to `/onboarding/hire/[token]`.
2. `/onboarding` continues to own platform/persona onboarding.
3. `/onboarding/[token]` becomes a legacy redirect route.
4. `/onboarding/hire/[token]` remains the canonical staff hiring route from Phase 5.

## Expected existing dependencies

The included components assume these already exist in the Tourify app:

```txt
@/components/ui/button
@/components/ui/card
@/components/ui/input
@/components/ui/label
@/components/ui/textarea
@/components/ui/select
@/components/ui/badge
@/lib/utils
```

If your repo uses a different toast or UI helper pattern, adapt only those imports.

## API boundary

`PersonaOnboardingFlow` posts to:

```txt
POST /api/onboarding/unified
```

If the repo uses a different platform onboarding endpoint, update the fetch target in `persona-onboarding-flow.tsx`.

Do not point persona onboarding to staff hiring endpoints.

## Validation

Run:

```bash
pnpm typecheck
pnpm lint
```

Then test:

```txt
/onboarding
/onboarding?type=artist
/onboarding?type=venue
/onboarding?type=organization
/onboarding?token=<valid-token>
/onboarding/<valid-token>
/onboarding/hire/<valid-token>
/onboarding/enhanced-onboarding-flow
/onboarding/complete
```

## Pause point

Stop after validating Phase 12 route behavior. Do not start Phase 13 tests until these boundaries are working.
