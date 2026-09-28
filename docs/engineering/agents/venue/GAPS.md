# Venue domain gaps

Generated: 2026-09-09 from VENUE-001 read-only audit.

**Triage key:**
- **missing** — feature/capability does not exist
- **incomplete** — partially built, stub, or non-functional
- **improve** — exists but needs quality, security, performance, or consolidation work

---

## 1. RLS & authorization (security — high priority)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 1 | incomplete | Venues/RBAC RLS baseline staged but not applied | `20260823210100_venues_rbac_rls_baseline.sql` staged, WS-1.1 open | `supabase/migrations/20260823210100_venues_rbac_rls_baseline.sql` |
| 2 | improve | Venue API routes use ~8 different authorization idioms (no standard wrapper) | WS-1.7 says "codify ONE standard wrapper" | `app/api/venue/**`, `app/api/venues/**` |
| 3 | improve | `admin/venues/[id]` permission detection flagged "manual review required" | `docs/engineering/generated/permissions.md` line 350 | `app/api/admin/venues/[id]/route.ts` |
| 4 | improve | Multiple `app/api/booking-requests/**` routes have "manual review required" permission detection | `docs/engineering/generated/permissions.md` lines 428-432 | `app/api/booking-requests/**/*.ts` |

## 2. Test coverage (quality — high priority)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 5 | missing | No `__tests__/venue/` directory exists | Working set declares this path but it does not exist | `__tests__/venue/` |
| 6 | missing | No venue-specific unit, integration, or RLS tests found | Grep of test dirs shows zero venue-prefixed test files | `__tests__/` |
| 7 | missing | No venue API contract tests | No test files found for `/api/venue/*` or `/api/venues/*` | `app/api/venue/`, `app/api/venues/` |
| 8 | improve | External acceptance gates (SQL, persona, AT, perf, offline, moderated) tracked but unverified since 2026-07-28 | Legacy progress notes external gates remain open | `.agents/venue-pages-builder/PROGRESS.md` |

## 3. Booking lifecycle (completeness — P1)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 9 | incomplete | Booking lifecycle staged migration not yet applied through pipeline | `20260823130000_booking_lifecycle.sql` + `20260823140000_reservation_conflict_engine.sql` | `supabase/migrations/` |
| 10 | improve | Booking request API has 4 routes with "manual review required" permission markers | `docs/engineering/generated/permissions.md` lines 428-432 | `app/api/booking-requests/**` |
| 11 | incomplete | `venue_booking_lifecycle_history` table exists but full transition state machine not verified in tests | Table exists; no test evidence of state machine correctness | `supabase/migrations/20260823130000_booking_lifecycle.sql` |

## 4. Component architecture (debt — P2)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 12 | improve | Venue components live in two locations: `app/venue/components/` and `components/venue/` | Legacy inventory `cmp-venue-tree-dupe` notes dedup need | `app/venue/components/`, `components/venue/` |
| 13 | improve | 29 redirect/debt routes still present as files (cosmetic debt, not functional) | Legacy inventory sections 9-10 | `app/venue/dashboard/**` redirect pages |
| 14 | improve | Legacy sidebars (`venue-sidebar.tsx`, `venue-owner-sidebar.tsx`) still present though not remounted | Legacy inventory `cmp-legacy-sidebars` | `components/venue/navigation/` |
| 15 | improve | `app/venue/components/ui/` flagged for Phase 4 removal in DEVELOPMENT_BACKLOG.md | `docs/DEVELOPMENT_BACKLOG.md` Phase 4 | `app/venue/components/ui/` |

## 5. Data access & performance (scale — P2)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 16 | missing | No React Query adoption on venue dashboards; still `'use client'`-heavy | WS-3.1 backlog item | `app/venue/dashboard/**`, `app/venue/**` |
| 17 | missing | No ISR or cache headers on public `/venues/[slug]` profile pages | WS-3.4 backlog item | `app/venues/[slug]/page.tsx` |
| 18 | improve | Venue dashboard pages are likely `'use client'`-saturated (no SSR-first verification) | WS-3.1 backlog item | `app/venue/dashboard/**` |

## 6. Contracts & API hygiene (consistency — P2)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 19 | improve | Venue API routes do not use `packages/api-contracts` Zod contracts | WS-2.3 backlog item | `app/api/venue/**`, `app/api/venues/**` |
| 20 | improve | Duplicate search: `/api/planning/venues/search` and `search_public_venues` RPC | Two paths for venue search | `app/api/planning/venues/search/`, `supabase/migrations/20260823110000_public_venue_search_rpc.sql` |
| 21 | improve | `/api/venue/` routes missing explicit rate limiting (only detected `session/auth` or `entity/RBAC`) | `docs/engineering/generated/permissions.md` | `app/api/venue/**` |

## 7. Identity & profile (completeness — P2)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 22 | improve | `venue_identity_bridges` exists but cross-account resolution path not fully traced end-to-end | Table exists; usage path not audited in tests | `supabase/migrations/20260823010000_venue_identity_bridge.sql` |
| 23 | improve | Public profile `url_slug` rename tracked by `venue_slug_history` but slug uniqueness constraint not verified | `record_venue_slug_rename` function exists | `supabase/migrations/20260823100000_slug_rename_history.sql` |
| 24 | incomplete | Venue onboarding summary endpoint exists (`GET /api/venue/onboarding/summary`) but full onboarding flow completion state not verified | Route exists | `app/api/venue/onboarding/summary/route.ts` |

## 8. Venue kit (incomplete — P2)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 25 | incomplete | `venue_kit_settings` table exists, `GET /api/venues/[id]/venue-kit` route exists, page exists — but kit build/management UI is a single page with no mutation evidence | Table + route + page all exist; no POST/PUT detected on kit | `app/venue/kit/page.tsx`, `app/api/venues/[id]/venue-kit/route.ts` |

## 9. Integrations & notifications (P3)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 26 | improve | Venue integrations endpoint exists (`GET, POST /api/venue/integrations`) but external integration health not monitored | Route exists | `app/api/venue/integrations/route.ts` |
| 27 | improve | `venue_workflow_subscriptions` table for notification routing exists but real-time delivery pipeline not verified | Table from `20260825050000_venue_notification_routing.sql` | Supabase migrations |

## 10. Mobile (missing — P3)

| # | Triage | Gap | Evidence | Location |
|---|--------|-----|----------|----------|
| 28 | missing | No venue-specific mobile screens in Expo app | `docs/engineering/generated/routes.md` mobile screens section — zero venue-prefixed entries | `apps/mobile/app/` |

---

## Gap counts by triage

| Triage | Count |
|--------|------:|
| missing | 7 |
| incomplete | 5 |
| improve | 16 |
| **total** | **28** |
