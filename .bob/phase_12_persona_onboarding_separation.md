---
description: Keep Tourify platform/persona onboarding separate from staff hiring onboarding.
globs: ["app/onboarding/**", "components/**", "lib/onboarding/**", "types/**", "next.config.*"]
alwaysApply: true
---

# Phase 12 — Persona Onboarding Separation

## Hard boundary

- `/onboarding` is for platform identity and persona setup.
- `/onboarding/hire/[token]` is for staff hiring onboarding.
- Staff hiring onboarding must not be mixed with artist, venue, or organization persona setup.

## Do not create staff records from persona onboarding

Platform/persona onboarding must not create or mutate:

- `staff_onboarding_candidates`
- `staff_invitations`
- `staff_members`
- `employment_assignments`
- hiring audit events

Those outputs belong to the hiring onboarding flow only.

## Legacy routes

Legacy token links must redirect to `/onboarding/hire/[token]`.

Retired routes:

- `/onboarding/enhanced-onboarding-flow` → `/onboarding`
- `/onboarding/complete` → `/onboarding?status=complete`

## Real data only

Do not add fake users, fake candidates, fake employers, fake staff, fake documents, or fake activity while wiring onboarding routes.

## Merge carefully

If the repo already has onboarding routes, merge these route-boundary behaviors instead of deleting existing account creation logic.
