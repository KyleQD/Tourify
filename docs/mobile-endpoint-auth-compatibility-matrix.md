# Mobile Endpoint and Auth Compatibility Matrix

Audit date: 2026-04-09  
Rebaseline: 2026-07-19

Legend:
- `mobile-ready`: contract is callable from native clients with Bearer auth and predictable behavior
- `needs-normalization`: callable from mobile but has auth/contract inconsistency or missing hardening
- `web-only`: current implementation assumes web session/cookies or missing API boundary for mobile

| Journey | Mobile client usage | Backend surface | Auth path | Status | Findings | Required remediation |
|---|---|---|---|---|---|---|
| Discover feed | `apps/mobile/lib/api/discover.ts` -> `GET /api/discover` | `app/api/discover/route.ts` | `authenticateApiRequest` (Bearer fallback + cookies) | mobile-ready | Supports unauth and auth-aware cache policy, returns mobile-usable sections payload | Document response contract and publish typed schema for mobile clients |
| Follow/unfollow | `apps/mobile/lib/api/follow.ts` -> `POST /api/follow` | `app/api/follow/route.ts` | `authenticateApiRequest` | mobile-ready | Bearer-compatible, ownership and self-follow guardrails present | Normalize error envelope (`error` vs `details` vs `message`) |
| Feed posts | `apps/mobile/lib/api/feed.ts` -> `/api/feed/posts` | `app/api/feed/posts/route.ts` | Bearer via `authenticateApiRequest` family | mobile-ready | Used by Home feed + composer | Keep pagination contract stable |
| Music catalog/stream | `apps/mobile/lib/api/music.ts` | artist/music + stream APIs | Bearer | mobile-ready | Separate Expo player; no shared web jukebox queue | Avoid redundant stream URL fetches |
| Messages / chats | chat + group-chat screens via `apiRequest` | messaging route handlers | Bearer | mobile-ready | FlatList-based UIs | Continue user-scoped auth |
| Notifications list/update | `apps/mobile/lib/api/notifications.ts` -> `GET/PATCH /api/notifications` | `app/api/notifications/route.ts` | `ProductionAuthService.authenticateRequest` | needs-normalization | Works with Bearer fallback but route uses service-role client path after auth | Prefer user-scoped where possible; document service-role justification |
| Creator capabilities | `apps/mobile/lib/api/creator-capabilities.ts` -> `GET/PUT /api/settings/capabilities` | `app/api/settings/capabilities/route.ts` | `authenticateApiRequest` | mobile-ready | Bearer-compatible and profile-scoped updates | Add schema versioning to response and request payload docs |
| Checkout session + verify | `apps/mobile/app/checkout/index.tsx`, `lib/api/payments.ts` -> `/api/payment` + `/api/ticketing/verify` | `app/api/payment/route.ts`, `app/api/ticketing/verify/route.ts` | Bearer | mobile-ready | Checkout polls verify after browser return before completed UI | Keep idempotent webhook sync as defense-in-depth |
| Portfolio upload | `apps/mobile/lib/api/uploads.ts` + Profile UI -> `POST /api/portfolio/upload` | `app/api/portfolio/upload/route.ts` | `authenticateApiRequest` | mobile-ready | Sends `kind` + `tos=accepted`; API also accepts `portfolioType` alias | Keep TOS gate in UI |
| Social suggestions | none currently in `apps/mobile`, candidate endpoint | `app/api/social/suggestions/route.ts` | cookie-oriented helper risk | web-only | Not on v1 mobile critical path | Migrate to bearer-capable auth before mobile use |
| Session introspection | none currently in `apps/mobile` | `app/api/auth/session/route.ts` | no server validation | web-only | Not a real server verification contract | Replace or remove from public API map |
| Venue booking operations | `apps/mobile/app/(tabs)/bookings.tsx` + `lib/api/venue-booking-requests.ts` | `/api/venue/booking-requests` | `authenticateApiRequest` + venue manage authz | mobile-ready | List/approve/reject via authorized API | Keep RLS as defense-in-depth |
| Venue profile stats | `apps/mobile/app/(tabs)/profile.tsx` direct Supabase reads | no dedicated mobile API | Supabase RLS | needs-normalization | Direct reads reduce contract stability | API read model later, or document intentional RLS contract |
| Connect claim | `apps/mobile/app/connect/*` | `/api/connect/*` | Bearer | mobile-ready | Deep link + App Links configured | Keep redirect allowlist tests |

## Auth model risks to resolve before mobile scale

1. Two active auth stacks are used across routes:
   - `lib/auth/api-auth.ts` -> returns user-scoped client from Bearer fallback path
   - `lib/auth/production-auth.ts` -> authenticates user, then returns service-role client
2. Cookie-only helper still appears on some non-critical routes (e.g. social suggestions).
3. Session endpoint (`app/api/auth/session/route.ts`) is not a real server verification contract.

## Minimum contract standard for mobile-facing routes

- Require `Authorization: Bearer <access_token>` for all protected routes.
- Return consistent envelope on errors (`{ error, code, details? }`).
- Tag routes as `user-scoped` or `service-role` in docs and require justification for service-role usage.
- Add one contract test suite for bearer auth success/failure and ownership checks on mobile-critical endpoints.
