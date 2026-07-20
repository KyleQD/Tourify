# Mobile Readiness Report

Audit date: 2026-04-09  
Rebaseline: 2026-07-19  
Decision horizon: production iOS + Android launch planning

## Traffic-light summary by domain

| Domain | Status | Notes |
|---|---|---|
| Existing mobile foundation (Expo app shell) | green | Auth, tabs, API client, offline mesh, and expanded journeys exist in `apps/mobile` (feed, music, messages, connect, events, checkout) |
| API and auth compatibility | yellow | Most critical routes are bearer-capable; notifications/payment still use service-role path; bookings still need API boundary |
| Feature parity coverage | yellow | Home/feed/discover/music/messages/connect ship; bookings/payment verify/upload hardening in progress; admin out of scope |
| Shared-code portability | yellow | TS domain logic is reusable; server actions and Next/RSC surfaces are web-only |
| CI/CD and release readiness | yellow | Mobile CI runs lint + typecheck + contract tests; OTA/store workflows exist; in-app unit smokes and EAS preview-on-tag still required |
| Observability and incident response | yellow | Logger has release context + Sentry hook; SDK wiring required before production |
| Security/RBAC governance for mobile | yellow | Redirect hardening exists; mobile API access matrix and CORS tightening in progress |

## Overall readiness verdict

`Yellow-Green`: ready for controlled production via TestFlight / Play Internal with staged rollout. Broad public rollout still requires live Sentry DSN configuration, store smoke of the auth→checkout funnel, and clean first-72-hour telemetry (see `apps/mobile/docs/release-checklist.md`).

## Shipped mobile surfaces (current)

- Auth: login, signup, forgot-password, OAuth callback, multi-account
- Tabs: Home (feed / discover / your stuff), venue Leads, Bookings/Requests, Music, Messages, Profile
- Stack: search, profile/[username], events, checkout, chat, group-chats, connect/claim, onboarding
- Platform: Expo Router, SecureStore session, bearer `apiRequest`, offline cache/queue, push registration, EAS Update

## Deliverables produced in this audit

- Endpoint/auth matrix: `docs/mobile-endpoint-auth-compatibility-matrix.md`
- Feature parity + portability matrix: `docs/mobile-feature-parity-and-portability-matrix.md`
- Ops and quality gates: `docs/mobile-ops-quality-gates.md`
- Security/RBAC review: `docs/mobile-security-rbac-review.md`
- Architecture decision + 30/60/90 backlog: `docs/mobile-architecture-decision-memo.md`
- Mobile API access matrix: `docs/mobile-api-access-matrix.md`

## Top blockers (highest priority)

1. Close password-reset deep link, push tap routing, and checkout server verification.
2. Replace direct venue booking writes with authorized API; fix portfolio upload contract (`kind` + `tos`).
3. Integrate crash reporting with release/environment tags.
4. Finish mobile unit smokes + EAS preview build on release tags.
5. Cache `/api/health` preflight so it is not paid on every `apiRequest`.
