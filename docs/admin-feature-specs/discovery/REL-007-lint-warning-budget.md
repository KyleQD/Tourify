# REL-007 — Lint warning budget

**Status:** Complete  
**Date:** 2026-07-21

## Policy

1. `npm run lint` uses the supported direct ESLint CLI. Errors always fail and are never baselined.
2. The governed Admin/CI surface snapshots warning counts by repository-relative path and rule.
3. New warning tuples and count increases fail CI; reductions are accepted automatically.
4. Exceptions require path, rule, positive allowance, owner, rationale, tracking issue, and future expiry.
5. Admin warning count is reported on every run and must trend to zero.

The governed paths are Admin pages/routes/components/contracts/tests plus CI scripts. A repository-wide direct lint still runs first; the warning comparator is intentionally scoped because the current compatibility config requires more than five minutes for a whole-repository JSON pass while the governed scan completes in under one minute. Expansion follows the warning burn-down and native flat-config upgrade.

Baseline refresh is an explicit reviewed operation, never part of ordinary CI:

```bash
npm run generate:eslint-warning-baseline
```

Authoritative files:

- `config/quality/eslint-warning-baseline.json`
- `config/quality/eslint-warning-exceptions.json`
- `scripts/ci/check-eslint-warning-budget.mjs`

Ordinary verification: `npm run check:eslint-warning-budget`.
