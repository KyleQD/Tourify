# Tourify Beta K2 — Initial Architecture Audit

**Date:** 2026-08-03
**Auditor:** Kimi (per Rule 1 — Audit Before Coding)
**Status:** Complete

---

## 1. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js (App Router) | 15.5.14 | Turbopack dev mode |
| Runtime | React | 18.2.0 | StrictMode enabled |
| Language | TypeScript | 5.x | Strict builds — `ignoreBuildErrors: false` |
| Styling | Tailwind CSS | 3.4.17 | Custom neon color tokens, CSS variables |
| UI System | shadcn/ui | — | 60+ components in `components/ui/` |
| Icons | Lucide React | 0.454.0 | — |
| State (Server) | TanStack Query | 5.82.0 | `@tanstack/react-query-devtools` present |
| State (Client) | Zustand | 5.0.8 | — |
| Forms | React Hook Form | 7.54.1 | `@hookform/resolvers` + Zod |
| Validation | Zod | 3.24.1 | — |
| Animation | Framer Motion | 12.18.1 | — |
| Charts | Recharts | 2.15.3 | — |
| Auth | Supabase Auth (SSR) | 2.39.3 | `@supabase/ssr` 0.6.1, PKCE flow |
| Database | Supabase PostgreSQL | — | 100+ tables (see schema analysis) |
| ORM (legacy) | Prisma | 6.7.0 | Minimal schema — NOT source of truth |
| Payments | Stripe | 22.0.1 | — |
| Email | Resend | 4.5.1 | — |
| Storage | AWS S3 + Supabase Storage | — | `@aws-sdk/client-s3` |
| Rate Limit | Upstash Redis | 1.35.3 | `@upstash/ratelimit` |
| Observability | Sentry | 9.47.1 | client/edge/server configs |
| Testing | Jest + Vitest + Playwright | — | Unit + E2E coverage |
| AI SDK | Vercel AI SDK | 6.0.202 | `@ai-sdk/openai` |

---

## 2. Project Structure

```
tourify-beta-K2/
├── app/                    # Next.js App Router (110+ route groups)
│   ├── api/                # 123 API route handlers
│   ├── auth/               # Auth pages (callback, confirm, signout, etc.)
│   ├── dashboard/          # Main dashboard
│   ├── onboarding/         # Multi-step onboarding
│   └── [80+ feature dirs]  # artist, venue, events, tours, bookings, etc.
├── components/             # 111 domain-specific + ui/ (shadcn)
├── contexts/               # React contexts (auth, artist, jukebox, profile, social)
├── hooks/                  # 62 shared hooks
├── lib/                    # 99 domain-organized utility modules
│   ├── supabase/           # Client/server/middleware auth clients
│   ├── auth/               # Auth helpers, route guards, admin gates
│   ├── navigation/         # Route registry, blocked routes, public shares
│   └── [per-domain libs]   # artist, venue, analytics, etc.
├── types/                  # 36 shared type definitions
├── supabase/               # SQL migrations, seed scripts, functions
├── prisma/                 # Legacy schema (minimal — NOT source of truth)
├── docs/                   # 157 documentation files
├── __tests__/              # 41 test directories (Jest + Vitest)
├── scripts/                # 167 CI, deployment, QA, audit scripts
├── public/                 # Static assets
└── apps/mobile/            # React Native mobile app
```

---

## 3. Authentication Architecture

### Pattern: Supabase SSR Cookie-Based Auth
- **Middleware** (`middleware.ts`): Centralized route protection, session refresh, role gating
- **Client** (`lib/supabase/client.ts`): Singleton Proxy-pattern browser client with legacy RN fallback
- **Server** (`lib/supabase/server.ts`): `createServerClient` using Next.js `cookies()`
- **Middleware helper** (`lib/supabase/middleware.ts`): `updateSession()` refreshes tokens, returns `{user, supabase, supabaseResponse}`

### Route Protection Strategy
- `protectedRoutes[]` — 46 route prefixes requiring authentication
- `authRoutes[]` — `/login`, `/auth/signin` (redirect authed users to `/dashboard`)
- Admin routes — `userHasAdminSurfaceAccess()` gate in middleware
- Artist routes — `pathnameRequiresArtistAccount()` gate (checks `artist_profiles` + `account_type`)
- Public share routes — `isPublicShareRoute()` bypasses auth
- Production blocked routes — `isProductionBlockedPathname()` returns 404

### Multi-Account System
- `profiles` table: base user record with `account_type`
- `accounts` table: polymorphic account records linking to profile tables
- `account_relationships`: ownership/permission links between profiles
- `use-multi-account.tsx` hook + `MultiAccountProvider`
- Account context URL resolver: `lib/navigation/account-context-url.ts`

---

## 4. Database Schema Analysis

### Source of Truth
**Supabase migrations** (in `supabase/migrations/` and `supabase/sql/`) — NOT Prisma.

### Generated Types
`lib/database.types.ts` — 33,753 lines of generated Supabase TypeScript types covering:

| Domain | Key Tables |
|--------|-----------|
| Auth/Users | `profiles`, `users` (auth), `user_profiles` |
| Artist | `artist_profiles`, `artist_services`, `artist_portfolios` |
| Venue | `venue_profiles`, `venue_booking_requests`, `venue_team_members`, `venue_equipment` |
| Tours/Events | `tours`, `events`, `tour_team_members`, `event_expenses`, `event_notes`, `accommodations` |
| Social | `posts`, `post_likes`, `post_comments`, `follows`, `friend_suggestions_view` |
| Staff/Hiring | `venue_team_members` (enhanced), `staff_certifications`, `staff_performance_reviews`, `staff_skills`, `job_postings`, `job_applications` |
| Messaging | `messages`, `conversations`, `conversation_participants` |
| Marketplace | `marketplace_listings`, `marketplace_orders` |
| Music | `music_tracks`, `music_albums`, `music_playlists`, `jukebox_queues` |
| Analytics | `analytics`, `analytics_metrics`, `analytics_snapshots`, `analytics_reports` |
| Achievements | `achievements`, `achievement_progress_events`, `user_achievements` |
| Admin | `admin_roles`, `admin_audit_log`, `admin_onboarding` |
| Rights | `agreement_templates`, `agreement_acceptances`, `music_rights_anchors` |
| Organizations | `organizations`, `organization_members`, `orgs` |

### Prisma Schema Status
`prisma/schema.prisma` contains ONLY legacy models: `User`, `Account`, `Session`, `Profile`, `UserActiveProfile`, `VerificationToken`. **This is NOT the production schema.** It appears to be residual from an early NextAuth.js migration.

---

## 5. API Architecture

### Route Count: ~123 API route directories

Key API domains:
- `/api/auth/*` — Session, signup, username check
- `/api/admin/*` — Admin surface APIs (RBAC protected)
- `/api/artist/*` — Artist profile, events, EPK
- `/api/venue/*` — Venue profiles, bookings, team
- `/api/events/*` — Event CRUD, tour management
- `/api/bookings/*` — Booking requests, approvals
- `/api/messages/*` — Messaging, conversations
- `/api/posts/*` — Social feed, likes, comments
- `/api/marketplace/*` — Listings, orders
- `/api/music/*` — Tracks, albums, playlists
- `/api/staff/*` — Staff management, scheduling
- `/api/hiring/*` — Job postings, applications
- `/api/analytics/*` — Metrics, reports, snapshots
- `/api/stripe/*` — Payment intents, webhooks
- `/api/webhooks/*` — External service webhooks

### API Patterns
- Server Actions also used (`app/actions/`)
- `next-safe-action` for type-safe server actions
- CORS handling via `lib/api/cors.ts`
- Service role client restricted by allowlist (`lib/supabase/service-role-allowlist.ts`)

---

## 6. Component Architecture

### shadcn/ui Base (60+ components)
Located in `components/ui/`. Standard Radix-based primitives: dialog, dropdown, select, table, form, etc.

### Domain Components (111 directories)
Organized by feature:
- `components/artist/`, `components/venue/`, `components/events/`
- `components/feed/`, `components/posts/`, `components/messaging/`
- `components/dashboard/`, `components/admin/`, `components/analytics/`
- `components/ticketing/`, `components/staff/`, `components/hiring/`

### Layout Components
- `AppChrome` — root layout wrapper
- `ThemeProvider` — dark/light mode (`next-themes`)
- `AuthProvider` — auth state context
- `MandatoryTosGate` — terms-of-service enforcement
- `MultiAccountProvider` — account switching
- `ChunkLoadRecovery` — dynamic import error boundary

---

## 7. Hooks Inventory (62 files)

Key custom hooks:
- `use-auth.ts` — auth state & helpers
- `use-multi-account.tsx` — account switching
- `use-theme` — theme management
- `use-notifications.ts` — realtime notifications
- `use-feed.ts` — social feed data
- `use-global-search.ts` — search
- `use-admin-capabilities.ts` — admin feature gates
- `use-acting-context.ts` — account context resolution
- `use-mobile.ts` / `use-mobile.tsx` — responsive detection
- `use-debounce.ts` — input debouncing

---

## 8. Routing & Navigation

### Route Registry
- `lib/navigation/account-dashboard-routes.ts` — per-account-type dashboard routes
- `lib/navigation/app-chrome-visibility.ts` — layout chrome visibility rules
- `lib/routing/public-share-routes.ts` — public/anonymous accessible routes
- `lib/routing/production-blocked-routes.ts` — routes hidden in production

### Middleware Redirects (in `next.config.ts`)
- `/feed/*` → `/news`
- `/pulse/*` → `/news`
- `/org/:slug/dashboard` → `/admin/dashboard`
- `/onboarding/enhanced-onboarding-flow/*` → `/onboarding`
- `/onboarding/:token` → `/onboarding/hire/:token`

### Legacy Route Handling (in `middleware.ts`)
- `/auth/signin`, `/signin` → `/login`
- `/auth/signup`, `/signup` → `/login?tab=signup`
- `/venue/*` public profiles → `/venues/[slug]`

---

## 9. Analytics Infrastructure

- **Table**: `analytics`, `analytics_metrics`, `analytics_snapshots`, `analytics_reports`
- **Client**: `lib/analytics/ux-event-client.ts`
- **Structure**: event-based with `metric_type`, `metric_value`, `dimensions` JSONB
- **Reports**: AI-generated reports with `insights`, `recommendations`, `predictions`

---

## 10. Security Measures

| Layer | Implementation |
|-------|---------------|
| CSP | Strict CSP in `next.config.ts` |
| Headers | HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Auth | Supabase PKCE, JWT validation via `getUser()` (never trust cookie JSON) |
| RLS | Supabase Row Level Security (enforced at DB level) |
| CORS | API CORS preflight handling |
| Rate Limit | Upstash Redis rate limiting |
| Input Validation | Zod schemas |
| Secrets | `.env` files, `scan-for-secrets.sh` |
| Audit | `admin_audit_log`, `account_activity_log` tables |

---

## 11. Notable Findings & Risks

### ⚠️ High Priority
1. **Prisma schema is stale** — `prisma/schema.prisma` does NOT reflect the production DB. Migrations are managed via Supabase CLI, not Prisma. Risk: confusion for new developers.
2. **Dual lockfiles** — Both `package-lock.json` AND `pnpm-lock.yaml` exist. `packageManager` field specifies `npm@11.5.2` but pnpm artifacts remain.
3. **Large root file count** — 30+ `*.md` plan files and debug scripts in repo root create clutter.

### ℹ️ Medium Priority
4. **AI agent artifacts in repo** — `.agents/`, `.bob/`, `.cursor/` directories contain generated plans/skills. Should be `.gitignore`d.
5. **123 API routes** — Large surface area; some may be redundant or untested.
6. **Legacy redirects** — Multiple layers of redirects (middleware + next.config) may cause confusion.
7. **Multiple `tsconfig` files** — `tsconfig.phase2.json`, `tsconfig.phase4.json`, `tsconfig.work-mode.json` suggest incremental migration in progress.

### ✅ Strengths
8. **Comprehensive test suite** — Jest, Vitest, Playwright E2E, plus dedicated QA seed scripts.
9. **CI/CD maturity** — GitHub Actions with demo + production deploys, smoke tests, env validation.
10. **Type safety** — Strict TypeScript, generated Supabase types, Zod validation.
11. **Security-first** — CSP, HSTS, audit logs, RLS, service-role allowlist.
12. **Documentation** — 157 docs files covering architecture, audits, implementation plans.

---

## 12. Feature Domains Identified

| Domain | Status | Key Routes |
|--------|--------|-----------|
| Auth & Onboarding | Production | `/login`, `/onboarding`, `/auth/*` |
| Artist Profiles | Production | `/artist`, `/epk`, `/portfolio` |
| Venue Profiles | Production | `/venue`, `/venues/[slug]` |
| Tours & Events | Production | `/tours`, `/events`, `/calendar` |
| Bookings | Production | `/bookings`, `/api/booking-requests` |
| Ticketing | Production | `/tickets`, `/api/ticketing` |
| Social Feed | Production | `/news` (formerly `/feed`), `/posts` |
| Messaging | Production | `/messages`, `/api/messages` |
| Marketplace | Production | `/marketplace`, `/api/marketplace` |
| Music/Jukebox | Production | `/music`, `/api/music` |
| Staff/Hiring | Production | `/jobs`, `/api/hiring`, `/api/staff` |
| Analytics | Production | `/analytics`, `/api/analytics` |
| Admin Dashboard | Production | `/admin`, `/api/admin` |
| Collaborations | Production | `/collaboration` |
| Contracts/Rights | Production | `/contracts`, `/rights-admin` |
| Achievements | Production | `/achievements` |
| Forums/Groups | Production | `/forums`, `/groups` |

---

## 13. Recommended Next Steps

1. **Consolidate package manager** — Remove `pnpm-lock.yaml` or migrate fully to pnpm.
2. **Clean root directory** — Move plan `.md` files to `docs/plans/` or archive.
3. **Gitignore AI artifacts** — Add `.agents/`, `.bob/`, `.cursor/` to `.gitignore`.
4. **Document Prisma status** — Add README note that Prisma is legacy-only.
5. **Audit API routes** — Identify dead or redundant API handlers.

---

*Audit performed per Rule 1 — Audit Before Coding. No code changes were made during this audit.*
