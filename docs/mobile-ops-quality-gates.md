# Mobile Ops and Quality Readiness

Audit date: 2026-04-09  
Rebaseline: 2026-07-19

## Current-state findings

### CI and test coverage

- Main CI (`.github/workflows/ci.yml`) runs lint, redirect smoke scripts, and web build.
- Mobile CI (`.github/workflows/mobile-ci.yml`) runs:
  - `npm ci` (mobile + root)
  - contract tests: `lib/api/__tests__/contracts.test.ts`
  - `npm run lint` in `apps/mobile`
  - `npm run typecheck` in `apps/mobile`
- Redirect safety workflow (`.github/workflows/mobile-redirect-safety.yml`) remains in place.
- Remaining gap: in-app unit/smoke tests under `apps/mobile` and CI job to run them.

### Release automation

- EAS profiles are configured in `apps/mobile/eas.json`.
- Store/OTA workflows exist:
  - `.github/workflows/mobile-ota-production.yml`
  - `.github/workflows/mobile-ios-release.yml`
  - `.github/workflows/android-ota-production.yml`
  - `.github/workflows/android-native-release.yml`
- Remaining gap: dedicated EAS **preview** build workflow on release tags / manual dispatch (not every PR).

### Observability

- Mobile logger (`apps/mobile/lib/observability/logger.ts`) includes release context and forwards to Sentry via `captureException`.
- `@sentry/react-native` is initialized in `apps/mobile/lib/observability/sentry.ts` when `EXPO_PUBLIC_SENTRY_DSN` is set.
- Remaining gap: ensure production/preview EAS secrets include the DSN and validate a crash appears in Sentry before broad rollout.

## Readiness score (traffic light)

| Domain | Status | Rationale |
|---|---|---|
| Web/API CI baseline | green | Stable lint/build and redirect smoke gates are in place |
| Mobile CI quality | green | Lint + typecheck + contracts + in-app unit smokes |
| Mobile release automation | yellow-green | OTA + store lanes + `mobile-preview-release.yml` on tags/manual |
| Observability for mobile | yellow-green | Sentry SDK wired; production DSN must be configured per environment |
| Critical flow test depth | yellow-green | Contract + push/checkout/reset-password unit smokes; expand E2E later |

## Required quality gates (minimum)

Required checks for mobile-impacting PRs:

1. `mobile-lint`: `npm --prefix apps/mobile run lint`
2. `mobile-typecheck`: `npm --prefix apps/mobile run typecheck`
3. `mobile-unit-smoke`: mobile-focused unit tests under `apps/mobile`
4. `api-mobile-contract`: bearer-auth + ownership tests for discover/follow/notifications/capabilities/payment/portfolio/bookings
5. `mobile-build-preview`: `eas build --platform all --profile preview` on release tags / manual dispatch
6. `mobile-redirect-safety`: existing redirect smoke checks as blocking

## Workflow inventory

| Workflow | Purpose | Trigger |
|---|---|---|
| `mobile-ci.yml` | lint + typecheck + contract tests (+ unit smokes) | PR paths: `apps/mobile/**`, `app/api/**`, `lib/auth/**`, contracts |
| `mobile-redirect-safety.yml` | deep-link redirect allowlist | PR / dispatch |
| `mobile-preview-release.yml` | EAS preview build iOS/Android | release tags + manual dispatch |
| `mobile-ota-production.yml` / `android-ota-production.yml` | OTA JS updates | production lanes |
| `mobile-ios-release.yml` / `android-native-release.yml` | signed store builds | manual / release |

## Blocking gaps before production mobile launch

- In-app unit smokes for offline queue, push routing, reset-password, payment reconcile.
- On-device crash reporting SDK wired through the existing logger hook.
- EAS preview build gate on release tags.
- Auth model consistency and bookings API boundary (see endpoint + access matrices).
