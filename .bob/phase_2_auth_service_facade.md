---
description: Phase 2 rules for the Tourify universal hiring/onboarding auth and service foundation.
globs: ["lib/auth/**", "lib/services/**", "types/**", "app/api/**"]
alwaysApply: false
---

# Phase 2 — Auth + Service Facade Rules

## Scope

Phase 2 implements only the auth, acting context, permission, and service facade foundation.
Do not rebuild the worker onboarding UI yet.
Do not rebuild the employer dashboard yet.
Do not delete venue compatibility fields.

## Required patterns

- Use `HiringEntity` for every hiring/onboarding mutation.
- Keep legacy `venueId` compatibility only as a resolver input.
- Validate permissions through `can_manage_hiring()` or the canonical repo RBAC equivalent.
- Centralize approval logic in `HiringOnboardingService.approveApplication()`.
- Expected failures must return structured result objects, not random thrown errors.
- No mock data, local fake candidates, local fake activity, or fake AI insights.

## Do not do yet

- Do not rewrite UI components in this phase.
- Do not create new onboarding routes in this phase.
- Do not retire legacy onboarding routes in this phase.
- Do not remove `venue_id` columns.
- Do not reset the database.

## Cursor task boundary

Stop after the Phase 2 files compile and the service facade is importable.
Report schema mismatches rather than guessing destructive changes.
