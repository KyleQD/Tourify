# Launch readiness roadmap

This document expands the architecture audit into a **sequenced plan** for shipping Tourify safely. It reflects what was already tightened in code (Supabase client boundaries, social API session clients, friend-suggestions hook → HTTP) and what remains for a production-grade launch.

---

## Guiding principles

1. **User-scoped data** uses `@/lib/supabase/server` (`await createClient()`) so Postgres RLS applies wherever policies exist.
2. **Elevated operations** use `@/lib/supabase/service-role` (`createServiceRoleClient()`) only after explicit auth (session, signed webhook, cron secret, admin check).
3. **Browser code** uses `@/lib/supabase/client` (`supabase` singleton) — never service role keys in the bundle.
4. **Route Handlers** do not import the `@/lib/supabase` barrel (ESLint enforces this under `app/api/**`).

---

## Phase 0 — Done in this pass (foundation)

| Item | Status |
|------|--------|
| Remove misleading `createServerClient` / `createClient` service-role export from `lib/supabase/client.ts` | Done |
| Barrel `@/lib/supabase` + `lib/supabase.ts`: export `createServiceRoleClient` explicitly; remove `createClient` alias | Done |
| Artist event **server actions**: `await createClient()` from `@/lib/supabase/server` | Done |
| Social API routes (`simple-suggestions`, `all-users`, `simple-connection-request`): cookie session client | Done |
| `friend-suggestions` / `event-page` services: `createServiceRoleClient` from `service-role` | Done |
| `OptimizedNotificationService`: `getNotificationsDb()` — service role on server, browser client in browser | Done |
| `use-friend-suggestions`: HTTP to `/api/social/suggestions` + `/api/social/simple-connection-request` (no DB from client) | Done |
| `use-optimized-notifications` + artist events dashboard: browser `supabase` from `@/lib/supabase/client` | Done |
| Cron + admin applications route: import service role from `@/lib/supabase/service-role` | Done |
| ESLint: forbid `@/lib/supabase` imports in `app/api/**` | Done |

---

## Phase 1 — Security hardening (pre-launch, high priority)

**1.0 Done in this pass (partial)**  
- Consolidated many `app/api/**` service-role clients onto `import { createServiceRoleClient, serviceRoleClient } from '@/lib/supabase/service-role'` (notifications, invitations, onboarding templates, payment, cron, opportunities, messages, social suggested, debug introspection routes, posts comments, etc.).  
- `app/api/posts/create`: shared cookie parser `parseUserFromRequestCookieHeader`; **removed hardcoded test-user fallback** (unauthenticated requests now get `401`).  
- `app/api/opportunities/sync`: uses `isAuthorizedCronRequest` (Vercel cron + `Authorization` / `x-internal-api-secret` + legacy `x-cron-secret` when it matches `CRON_SECRET`).  
- `lib/auth/route-guards.ts`: documented production internal-auth expectations; cron guard accepts legacy `x-cron-secret`.  
- Removed dead `@supabase/supabase-js` import from `app/api/feed/rss-news/route.ts`.

**1.1 RLS audit (Supabase)** — still required  
For tables touched by: social graph, notifications, marketplace, ticketing, venue staffing, and artist events — verify policies for `SELECT` / `INSERT` / `UPDATE` / `DELETE` match product rules. Service-role paths in `lib/auth/server.ts` (e.g. suggestions after auth) bypass RLS; treat them as **trusted server code** and keep surface small.

**1.2 API route inventory** — ongoing  
Scan remaining handlers for:

- Any **new** raw `createClient(url, serviceKey)` (prefer `@/lib/supabase/service-role`).
- Missing auth on mutating routes (POST/PATCH/DELETE).
- Debug routes: ensure `isAuthorizedInternalRequest` (or equivalent) and disable or 404 in production where appropriate (all under `app/api/debug/**` currently gate in production).

**1.3 Secrets & env**  
Confirm `SUPABASE_SERVICE_ROLE_KEY` is never `NEXT_PUBLIC_*`. Rotate any key that ever appeared in client bundles or logs.

**1.4 Webhooks & cron**  
Verify signature verification (Stripe, Printful, ticketing, etc.) and shared secrets for cron (`route-guards`). No anonymous service-role access.

---

## Phase 2 — Auth & session consistency

| Item | Status |
|------|--------|
| **2.1** Remove `@supabase/auth-helpers-nextjs`; use `@/lib/supabase/client` (browser) + `await createClient()` from `@/lib/supabase/server` (RSC / Route Handlers) | Done — dependency removed from root `package.json`; automated pass in `scripts/migrate-auth-helpers-supabase.py` + manual fixes for multiline / edge cases |
| **2.2** Venue no longer wraps a mock `AuthProvider`; `app/venue/context/auth-context.tsx` and `context/auth.tsx` re-export `@/contexts/auth-context` | Done |
| **2.3** Shared Tourify session cookie parsing | Done — `lib/supabase/tourify-session-cookie.ts` used by `lib/supabase/middleware.ts`, `lib/auth/api-auth.ts`, and `lib/auth/server.ts` |
| **2.4** `nuqs` for URL state | Optional / not started |

**Note:** `@/context/auth` still resolves to `context/auth.tsx`, which now re-exports the real provider; prefer importing `@/contexts/auth-context` in new code.

---

## Phase 3 — Performance & UX (post-launch iteration OK)

**3.1 Reduce `"use client"` pages**  
Move data loading to Server Components; keep small islands for charts, DnD, and heavy forms.

**3.2 Bundle & API consolidation**  
Group related `app/api` handlers; shared Zod schemas; consistent error JSON shape.

**3.3 Prisma**  
Either use intentionally for reporting/migrations or document as legacy so new code stays Supabase-first.

---

## Phase 4 — Quality gates (CI)

- `eslint` (including `app/api` override) in CI.
- Add `typecheck` with increased Node heap if needed, or incremental `tsc -p` subsets per package.
- Smoke E2E: login, dashboard, one artist flow, one venue flow, one marketplace path.

---

## Phase 5 — Launch day checklist

- [ ] Production Supabase project: migrations applied, RLS reviewed.
- [ ] Env vars set on host (Vercel/etc.): URL, anon, service role, cron secrets, third-party keys.
- [ ] Remove or lock down `app/debug/**` and `app/api/debug/**` in production.
- [ ] Error monitoring (e.g. Sentry) + `app/api/analytics/errors` reviewed.
- [ ] Rate limiting on sensitive auth and social endpoints.
- [ ] Legal: privacy, terms, cookie consent if required.

---

## Phase 6 — After launch

- Gradual removal of `@/lib/supabase` barrel for **components** too: prefer `@/lib/supabase/client` import for clarity.
- Mobile app: align bearer auth with web permission model (`lib/auth/mobile-request-auth.ts`).
- Feature flags for risky areas (marketplace, hiring).

---

## References (code)

- Session (RSC / Route Handlers): `lib/supabase/server.ts`
- Browser: `lib/supabase/client.ts`
- Service role: `lib/supabase/service-role.ts`
- Barrel (browser helpers + re-exports): `lib/supabase/index.ts` — **not** for `app/api/**` (ESLint).

When in doubt: **server session → `server.ts`; elevated → `service-role.ts`; React client → `client.ts`.**
