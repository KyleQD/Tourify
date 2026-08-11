# REL-101 — Database / RLS CI environment

**Status:** Partially complete; all-domain and prior-snapshot evidence blocked  
**Date:** 2026-07-21

## Delivered

1. Persona/parent-child matrix: `lib/testing/rls-persona-matrix.ts`
2. Structural Vitest suite: `__tests__/admin/rls-persona-matrix.test.ts`
3. Fixture identities: `lib/testing/admin-feature-factory.ts`
4. CI workflow: `.github/workflows/admin-rls-ci.yml`
   - Starts ephemeral Supabase in GitHub Actions
   - Applies unapplied migrations to a fresh ephemeral stack with `supabase migration up --local`; no reset operation is used
   - Exports ephemeral-only API keys and runs structural plus direct-client owner/viewer/outsider/anonymous/service-role tests
5. npm script: `npm run test:rls-matrix`

## Live SQL suite

Enabled only when URL, anonymous key, and service-role key are all present. The live suite creates deterministic identities/rows in the disposable CI instance and does not delete or reset a database.

## Hard rule

Never run `supabase db reset`. Never point fixture variables at Tourify Demo or production. Current direct execution covers core tour isolation; every parent/child pair and supported prior-snapshot migration still require expansion after canonical contract persistence lands.
