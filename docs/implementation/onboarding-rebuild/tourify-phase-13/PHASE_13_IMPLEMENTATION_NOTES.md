# Phase 13 Implementation Notes

## Scope

This package is the final planned phase for the Tourify Universal Hiring & Onboarding rebuild. It adds validation tooling and acceptance docs only.

## Files included

```txt
types/hiring-real-data-test.ts
lib/testing/hiring-real-data-test-config.ts
lib/testing/hiring-real-data-test-helpers.ts
scripts/hiring/phase-13-real-data-smoke-test.ts
tests/hiring/phase-13-real-data.spec.ts
supabase/tests/phase_13_hiring_real_data_checks.sql
docs/phase-13-real-data-testing.md
.cursor/rules/phase_13_real_data_testing.md
```

## Integration notes

- The smoke-test script assumes `tsx` is available. If the repo does not use `tsx`, run it with the repo's preferred TypeScript script runner.
- The smoke-test script uses `@supabase/supabase-js`. If that dependency is already installed, no action is needed.
- The Vitest test file is intentionally lightweight and only validates helper behavior. The real acceptance value is the smoke script and SQL checks.
- The smoke-test script is designed to skip scenarios whose env vars are not configured.
- If API routes require authenticated cookies, adapt the script to inject a test session cookie or use service-test endpoints in a preview environment.

## What not to do

- Do not seed fake production data to make tests pass.
- Do not bypass RLS in app routes.
- Do not put the Supabase service role key in the browser.
- Do not treat successful table queries alone as full acceptance. Full acceptance requires manual end-to-end worker submission too.
