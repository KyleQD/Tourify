# Phase 12 — Persona Onboarding Separation

## Purpose

Phase 12 separates platform/persona onboarding from staff hiring onboarding.

The rule is now:

```txt
/onboarding = platform identity and persona setup
/onboarding/hire/[token] = staff hiring onboarding from an employer invitation
```

This prevents the hiring wizard from accidentally mixing with artist, venue, organization, or personal profile setup.

## Why this matters

Staff hiring onboarding collects employment and compliance data for an already approved worker. It can include sensitive data, documents, certifications, and Work Mode activation.

Persona onboarding creates or updates public/business identities such as:

- Individual
- Artist
- Venue
- Organization
- Staffing Agency
- Production Company
- Promoter
- Rental Company
- Performance Agency

These are related product areas, but they should not use the same forms, tables, permissions, or completion logic.

## Files added

```txt
types/persona-onboarding.ts
lib/onboarding/onboarding-route-utils.ts
lib/onboarding/persona-onboarding-config.ts
components/hiring/onboarding-module/persona-onboarding-flow.tsx
app/onboarding/page.tsx
app/onboarding/[token]/page.tsx
app/onboarding/hire/page.tsx
app/onboarding/complete/page.tsx
app/onboarding/enhanced-onboarding-flow/page.tsx
patches/next-config-redirects.snippet.ts
```

## Route behavior

### `/onboarding`

Renders platform/persona onboarding.

Supported query params:

```txt
/onboarding?type=individual
/onboarding?type=artist
/onboarding?type=venue
/onboarding?type=organization
/onboarding?type=staffingAgency
/onboarding?type=productionCompany
/onboarding?type=promoter
```

If `/onboarding?token=<token>` is used, it redirects to:

```txt
/onboarding/hire/<token>
```

### `/onboarding/hire/[token]`

This route remains the canonical staff hiring onboarding route from Phase 5.

It should continue to load the token worker flow and fetch real data from:

```txt
GET /api/onboarding/[token]
```

### `/onboarding/[token]`

Legacy route. Redirects token-shaped values to:

```txt
/onboarding/hire/[token]
```

Non-token values redirect to `/onboarding`.

### `/onboarding/enhanced-onboarding-flow`

Retired route. Redirects to `/onboarding`.

### `/onboarding/complete`

Retired route. Redirects to:

```txt
/onboarding?status=complete
```

## Persona flow API boundary

The included `PersonaOnboardingFlow` submits to:

```txt
POST /api/onboarding/unified
```

This endpoint belongs to platform/persona onboarding, not staff hiring onboarding.

Do not use this endpoint to create:

- `staff_onboarding_candidates`
- `staff_invitations`
- `staff_members`
- `employment_assignments`

Those are staff hiring outputs and must remain behind the staff hiring flow.

## No mock data rule

The persona form is config-driven, but it does not ship fake users, fake profiles, fake staff, or fake employers. It only renders field definitions. The submitted data must go to real platform onboarding APIs.

## Merge notes

If the repo already has a mature `/onboarding/page.tsx`, do not blindly replace it. Merge these behaviors instead:

1. Detect `?token=` and redirect to `/onboarding/hire/[token]`.
2. Keep persona setup on `/onboarding`.
3. Do not let staff hiring token logic execute inside platform onboarding.
4. Keep worker token completion logic in `/onboarding/hire/[token]` and `/api/onboarding/[token]`.

## Validation checklist

- [ ] `/onboarding` renders platform/persona onboarding.
- [ ] `/onboarding?type=artist` renders artist persona setup.
- [ ] `/onboarding?type=venue` renders venue persona setup.
- [ ] `/onboarding?token=abc123...` redirects to `/onboarding/hire/abc123...`.
- [ ] `/onboarding/[token]` redirects to `/onboarding/hire/[token]`.
- [ ] `/onboarding/enhanced-onboarding-flow` redirects to `/onboarding`.
- [ ] `/onboarding/complete` redirects to `/onboarding?status=complete`.
- [ ] Staff hiring onboarding still loads real token payloads.
- [ ] Persona onboarding does not create staff roster records.
