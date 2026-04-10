# Mobile Readiness Report

Audit date: 2026-04-09
Decision horizon: production iOS + Android launch planning

## Traffic-light summary by domain

| Domain | Status | Notes |
|---|---|---|
| Existing mobile foundation (Expo app shell) | green | Auth, tabs, API client, and baseline journeys exist in `apps/mobile` |
| API and auth compatibility | yellow | Most critical routes are bearer-capable; auth helper drift and a few web-only outliers remain |
| Feature parity coverage | yellow | Discover/notifications/profile foundations exist; bookings/payment/upload/admin parity is incomplete |
| Shared-code portability | yellow | TS domain logic is reusable; server actions and Next/RSC surfaces are web-only |
| CI/CD and release readiness | red | Mobile CI is typecheck-only and lacks release automation |
| Observability and incident response | red | No mobile crash reporting integration yet |
| Security/RBAC governance for mobile | yellow | Good base docs exist, but mobile-wide route matrix and unified auth policy are missing |

## Overall readiness verdict

`Yellow-Red`: ready for controlled preview iteration, not ready for production-scale mobile release.

## Deliverables produced in this audit

- Endpoint/auth matrix: `docs/mobile-endpoint-auth-compatibility-matrix.md`
- Feature parity + portability matrix: `docs/mobile-feature-parity-and-portability-matrix.md`
- Ops and quality gates: `docs/mobile-ops-quality-gates.md`
- Security/RBAC review: `docs/mobile-security-rbac-review.md`
- Architecture decision + 30/60/90 backlog: `docs/mobile-architecture-decision-memo.md`

## Top blockers (highest priority)

1. Standardize auth strategy across mobile-facing API routes (remove helper drift).
2. Add mobile quality gates (lint, contracts, tests, EAS preview build) as required checks.
3. Integrate crash reporting and release/environment tagging in mobile builds.
4. Resolve known API contract mismatches (portfolio upload payload, payment flow wiring, direct booking writes).
