# Mobile Ops and Quality Readiness

Audit date: 2026-04-09

## Current-state findings

### CI and test coverage

- Main CI (`.github/workflows/ci.yml`) runs lint, redirect smoke scripts, and web build, but does not run `npm test`.
- Mobile CI (`.github/workflows/mobile-ci.yml`) runs only `npm run typecheck` for `apps/mobile`.
- Redirect safety workflow (`.github/workflows/mobile-redirect-safety.yml`) is useful but narrow in scope.
- No mobile test files exist under `apps/mobile` (`*.test.ts*` not present).
- Existing Jest coverage is limited to a small set of `lib/**/__tests__/*.test.ts` files and does not validate core mobile paths (notifications auth, payment flow, upload contract, venue booking operations).

### Release automation

- EAS profiles are configured in `apps/mobile/eas.json` but there is no CI workflow that runs `eas build` or `eas submit`.
- Deploy workflows are web-focused (Vercel) and do not publish mobile preview/prod artifacts.

### Observability

- Mobile logger (`apps/mobile/lib/observability/logger.ts`) is console-based with a placeholder `captureException`.
- There is no integrated crash/reporting SDK configured in mobile dependencies.

## Readiness score (traffic light)

| Domain | Status | Rationale |
|---|---|---|
| Web/API CI baseline | green | Stable lint/build and redirect smoke gates are in place |
| Mobile CI quality | red | Typecheck-only; no lint/test/build gates for mobile |
| Mobile release automation | red | No CI-driven EAS build/submit or staged release track |
| Observability for mobile | red | Crash capture provider not integrated |
| Critical flow test depth | red | No automated coverage for payment, auth-path drift, upload contract |

## Required quality gates (minimum)

Add these as required checks for mobile-impacting PRs:

1. `mobile-lint`: run `npm --prefix apps/mobile run lint`
2. `mobile-typecheck`: run `npm --prefix apps/mobile run typecheck` (already present)
3. `mobile-unit-smoke`: run mobile-focused Jest/contract tests (new suite)
4. `api-mobile-contract`: run bearer-auth + ownership tests for:
   - `/api/discover`
   - `/api/follow`
   - `/api/notifications`
   - `/api/settings/capabilities`
   - `/api/payment`
   - `/api/portfolio/upload`
5. `mobile-build-preview`: run `eas build --platform all --profile preview` on release branches/tags
6. `mobile-redirect-safety`: keep existing redirect smoke checks as blocking

## Recommended workflow additions

| Workflow | Purpose | Trigger |
|---|---|---|
| `mobile-quality.yml` | lint + typecheck + unit/contract tests | PR paths: `apps/mobile/**`, `app/api/**`, `lib/auth/**` |
| `mobile-preview-release.yml` | EAS preview build for iOS/Android | merge to `main` and manual dispatch |
| `mobile-production-release.yml` | signed store-ready build + submit | manual with approval environment |

## Blocking gaps before production mobile launch

- No automated confidence gate for mobile-critical API contracts.
- No on-device crash reporting and release metadata capture.
- No CI-managed mobile release pipeline for TestFlight and Play Internal.
- Inconsistent auth implementation model across API routes increases regression risk.
