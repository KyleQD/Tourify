# Mobile Endpoint and Auth Compatibility Matrix

Audit date: 2026-04-09

Legend:
- `mobile-ready`: contract is callable from native clients with Bearer auth and predictable behavior
- `needs-normalization`: callable from mobile but has auth/contract inconsistency or missing hardening
- `web-only`: current implementation assumes web session/cookies or missing API boundary for mobile

| Journey | Mobile client usage | Backend surface | Auth path | Status | Findings | Required remediation |
|---|---|---|---|---|---|---|
| Discover feed | `apps/mobile/lib/api/discover.ts` -> `GET /api/discover` | `app/api/discover/route.ts` | `authenticateApiRequest` (Bearer fallback + cookies) | mobile-ready | Supports unauth and auth-aware cache policy, returns mobile-usable sections payload | Document response contract and publish typed schema for mobile clients |
| Follow/unfollow | `apps/mobile/lib/api/follow.ts` -> `POST /api/follow` | `app/api/follow/route.ts` | `authenticateApiRequest` | mobile-ready | Bearer-compatible, ownership and self-follow guardrails present | Normalize error envelope (`error` vs `details` vs `message`) |
| Notifications list/update | `apps/mobile/lib/api/notifications.ts` -> `GET/PATCH /api/notifications` | `app/api/notifications/route.ts` | `ProductionAuthService.authenticateRequest` | needs-normalization | Works with Bearer fallback but route uses service-role client path after auth, unlike user-scoped `api-auth` routes | Standardize on one auth helper strategy and document when service-role is allowed |
| Creator capabilities | `apps/mobile/lib/api/creator-capabilities.ts` -> `GET/PUT /api/settings/capabilities` | `app/api/settings/capabilities/route.ts` | `authenticateApiRequest` | mobile-ready | Bearer-compatible and profile-scoped updates | Add schema versioning to response and request payload docs |
| Checkout session + verify | `apps/mobile/lib/api/bookings.ts`, `apps/mobile/lib/api/payments.ts` -> `POST/GET /api/payment` | `app/api/payment/route.ts` | `authenticateRequestWithBearerFallback` | needs-normalization | Auth is mobile-friendly; route mixes user-scoped reads with service-role writes; API helper exists but screen flow is not wired in mobile tabs | Wire booking payment flow in app screens and add explicit idempotency + webhook sync checks |
| Portfolio upload | `apps/mobile/lib/api/uploads.ts` -> `POST /api/portfolio/upload` | `app/api/portfolio/upload/route.ts` | `authenticateApiRequest` | needs-normalization | Mobile sends `portfolioType` and omits required `tos=accepted`; API expects `kind` + `tos`, causing avoidable 400s | Align request contract (`kind`/`portfolioType`) and add shared request builder + validation |
| Social suggestions | none currently in `apps/mobile`, candidate endpoint | `app/api/social/suggestions/route.ts` | `authenticateApiRequest` from `lib/auth/server.ts` | web-only | Uses cookie-only auth helper signature (no `NextRequest` bearer path) | Migrate endpoint to `lib/auth/api-auth.ts` or `mobile-request-auth.ts` |
| Session introspection | none currently in `apps/mobile`, likely needed by clients | `app/api/auth/session/route.ts` | no server validation | web-only | Endpoint explicitly defers session verification to client-side only | Replace with server-verified session endpoint or remove from public API map |
| Venue booking operations | `apps/mobile/app/(tabs)/bookings.tsx` direct Supabase table access | no dedicated mobile API for this flow | Supabase RLS directly from device | needs-normalization | Mobile bypasses backend API contract and writes `venue_booking_requests` directly | Define `/api/venue-booking-requests` contract for approve/reject/list and align authorization checks |
| Venue profile stats | `apps/mobile/app/(tabs)/profile.tsx` direct Supabase reads | no dedicated mobile API for this flow | Supabase RLS directly from device | needs-normalization | Direct table reads reduce contract stability and auditability | Add API read model or document direct-RLS contract as intentionally public-to-authenticated |

## Auth model risks to resolve before mobile scale

1. Two active auth stacks are used across routes:
   - `lib/auth/api-auth.ts` -> returns user-scoped client from Bearer fallback path
   - `lib/auth/production-auth.ts` -> authenticates user, then returns service-role client
2. Cookie-only helper still appears in a route that should be mobile-capable (`app/api/social/suggestions/route.ts`).
3. Session endpoint (`app/api/auth/session/route.ts`) is not a real server verification contract.

## Minimum contract standard for mobile-facing routes

- Require `Authorization: Bearer <access_token>` for all protected routes.
- Return consistent envelope on errors (`{ error, code, details? }`).
- Tag routes as `user-scoped` or `service-role` in docs and require justification for service-role usage.
- Add one contract test suite for bearer auth success/failure and ownership checks on mobile-critical endpoints.
