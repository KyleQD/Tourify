# Mobile API Access Matrix

Date: 2026-07-19

This matrix documents auth model, ownership checks, and role expectations for mobile-critical endpoints.

## Auth stacks

| Helper | Client returned | When to use |
|---|---|---|
| `authenticateApiRequest` / `authenticateRequestWithBearerFallback` | User-scoped Supabase client | Default for all consumer mobile routes |
| `resolveActingContext` | User-scoped + verified acting profile | Multi-account actions (feed, notifications, posts) |
| `ProductionAuthService` / service-role after auth | Service-role client | Only when justified (cross-user fanout, admin ops). Document per route. |

Native clients authenticate with `Authorization: Bearer <access_token>`. Cookie sessions remain for web.

## Route matrix

| Route | Methods | Auth | Ownership / role | Client model | Notes |
|---|---|---|---|---|---|
| `/api/discover` | GET | Optional bearer | Public + personalized when authed | user-scoped | Cache-aware |
| `/api/follow` | POST | Bearer required | Actor cannot follow self; target must exist | user-scoped | |
| `/api/feed/posts` | GET/POST | Bearer for writes | Acting profile via headers | user-scoped + acting | |
| `/api/notifications` | GET/PATCH/POST/DELETE | Bearer via acting context | Actor owns notification target account | user-scoped for auth; NotificationService may use service-role for writes | Prefer user-scoped ownership checks |
| `/api/settings/capabilities` | GET/PUT | Bearer required | Profile-scoped to caller | user-scoped | |
| `/api/payment` | POST/GET | Bearer required | Booking `user_id` must match caller | user-scoped reads; Stripe side-effects | Verify before mobile UI marks completed |
| `/api/ticketing/enhanced` | POST | Bearer preferred | Ticket purchase for event | mixed | Returns `checkout_url` + `checkout_session_id` |
| `/api/ticketing/verify` | GET | Bearer recommended | Session metadata sale ownership | service-role sale lookup | Mobile polls after browser checkout |
| `/api/portfolio/upload` | POST | Bearer required | Upload path namespaced to `user.id` | user-scoped storage | Requires `kind` + `tos=accepted` (`portfolioType` accepted as alias) |
| `/api/venue/booking-requests` | GET/PATCH | Bearer required | `canManageVenue(..., manage_bookings)` | auth user-scoped + service-role data after authz | Mobile must not write table directly |
| `/api/connect/*` | GET/POST | Bearer / deep-link token | Claim token ownership rules | user-scoped | App Links covered by redirect tests |
| `/api/music/*` (mobile wrappers) | GET/POST | Bearer | Artist/library ownership per route | user-scoped | Stream URLs not cached offline |

## Error envelope standard

Mobile-facing routes should return:

```json
{ "error": "Human readable message", "code": "machine_code", "details": optional }
```

## CORS

Production API CORS is origin-allowlisted via `lib/api/cors.ts` + middleware (not `*`).

Allowed by default:
- `https://tourify.app`
- `https://www.tourify.app`
- localhost origins in non-production

Override with `CORS_ALLOWED_ORIGINS` (comma-separated). Native React Native requests do not rely on browser CORS.

## Explicitly out of scope for mobile v1

- `/api/admin/*` staffing and deep venue ops
- Server-action-only venue/org/forum writers without route-handler mirrors
