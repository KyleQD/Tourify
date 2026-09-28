# Event Discovery — Repository Audit

**Date:** 2026-08-04 · **Branch:** `feature/event-discovery-integrations` · **Auditor:** Kimi (principal engineer role)

## 1. Canonical event tables

Tourify currently has **three** event stores that are already merged at read time by the discovery rail:

| Table | Migration | Role | Notes |
|---|---|---|---|
| `public.events` | `20240416000000_create_events.sql`, heavily extended by `20260325123000_artist_events_unified_events.sql` | **Primary public artist event table** (unified artist pipeline) | Columns incl. `artist_id`, `name`, `event_type`, `event_date` (date), `start_time`/`end_time` (time), `venue_name`, `address`, `city`, `state`, `country`, `latitude`/`longitude` (float8), `slug` (unique), `status` (`draft`/`published`/`cancelled`), `tags`/`genre_tags` (jsonb), `ticket_url` via later alters, `creator_account_type` (`artist`/`venue`/`manager`/`organizer`), `tour_id` (20250813122000), `venue_id` (20250813120000). RLS: public reads `status='published'`; owner = `artist_id`. |
| `public.events_v2` | `20250816133000_event_core.sql` | Org-scoped **operational** events (holds → confirmed → advancing → onsite → settled) | `org_id` NOT NULL, `slug` unique per org, `start_at`/`end_at` timestamptz, `timezone`, `settings` jsonb bag (venue info, ticket info, description live inside settings). RLS: org members only via `is_org_member`/`has_perm(..., 'event.manage')`. Public visibility is granted at read time in app code (`isEventsV2PubliclyListable`), not by RLS. |
| `public.artist_events` | `20250100000000_create_missing_auth_tables.sql` | **Legacy** artist event table, still read by `/api/events/discover` | `venue_coordinates` jsonb, date+time split columns, `ticket_url`, price min/max. Still in the live read path — cannot be removed without a compatibility step. |

**Decision (Phase 1 input):** `public.events` is the canonical public event identity for discovery. `events_v2` and `artist_events` are additional native sources projected into the new discovery index. No table is dropped or renamed.

Supporting native tables: `event_attendance`, `event_guestlist`, `event_ticket_types`, `event_ticketing_config`/`event_ticketing_grants` (`20260712120000_event_ticketing_foundation.sql` — native ticketing), `event_posts`, `event_locations`, `event_participants`, `feed_events` (promotion feed, `20250813130000_promotion_core.sql`).

## 2. Venue / artist / organization / tour relationships

- `organizations` (`20250816132000_org_rbac.sql`) with org RBAC helpers `is_org_member`, `has_perm`.
- `venues_v2` (`20250816133000_event_core.sql`, re-asserted `20250818120000`) — org-scoped venues.
- `tours` (twice created: `20250130000001_tour_teams.sql`, `20250818121000_tours_core.sql`) — `events.tour_id` FK already exists on the canonical table.
- `artist_profiles` — linked from `artist_events.artist_profile_id`; `events.artist_id` references `auth.users`.
- `events.venue_id` exists (20250813120000) alongside denormalized venue text fields — discovery index should carry both.

## 3. Public event routes

- `app/events/page.tsx` — events landing (loading/error boundaries exist).
- `app/events/[slug]/page.tsx` + `layout.tsx` — public event page; resolves across **all three** tables via `lib/events/resolve-public-event.ts` (slug first, then UUID fallback).
- `app/events/[slug]/hq/*` — event HQ (management) surface.
- `app/events/create/page.tsx` — creation workflow; `components/events/create-event-dialog.tsx`, `enhanced-event-creator.tsx`.
- Discovery UI: `components/events/enhanced-discover-events.tsx`, `events-filters.tsx`, `events-list.tsx`, `event-card.tsx`, `enhanced-event-card.tsx`.

## 4. Existing search / filtering

- `GET /api/events/discover` (`app/api/events/discover/route.ts`) — merges `events` + `events_v2` + `artist_events` with the service-role client, in-memory location boost, filters: `type`, `location` (soft token match), `dateFrom`, `dateTo`, `tags`, `sortBy`, `strictLocation`, limit/offset (max 200 per source).
- Location matching is **token/ILIKE-based** (`lib/discover/location-match.ts`); no PostGIS anywhere in migrations. No radius search. No cursor pagination (offset only).
- `lib/discover/` also has `ranking.ts`, `normalize.ts`, `enrich.ts`, `ticket-price.ts`, `tours.ts` — reusable for the discovery index builders.
- Global search indexes exist (`20260801215649_global_search_indexes.sql`) but not event-specific FTS.

## 5. Location fields & mapping

- `events.latitude` / `events.longitude` (float8) with btree index `idx_events_geo`.
- `events_v2` has no geo columns; venue geo lives in `venues_v2`/settings.
- `artist_events.venue_coordinates` jsonb.
- No PostGIS extension in any migration. **Phase 2 must add it additively** (`create extension if not exists postgis`) and must honor `POINT(longitude latitude)` order.

## 6. Ticket links / native ticketing

- Native ticketing foundation: `event_ticketing_config`, `event_ticketing_grants`, `event_ticket_types` (`20260712120000_event_ticketing_foundation.sql`), behind flag `FEATURE_TICKETING_V2` (+ `NEXT_PUBLIC_` twin).
- Free-text `ticket_url` on `events`/`artist_events` and in `events_v2.settings`.
- Venue-side "ticketing integrations" UI exists (`app/venue/components/integrations/ticketing-integrations.tsx`) but is a **stub list** (ticketmaster id present, no real API client). No Ticketmaster/Bandsintown/SeatGeek server client exists anywhere in `lib/`, `app/api/`, or migrations.

## 7. RLS & authorization

- Org RBAC: `is_org_member(uid, org_id)`, `has_perm(uid, org_id, perm)` used by `events_v2`, calendars, holds.
- `public.events` RLS: `auth.uid() = artist_id` write; published-read for everyone.
- Admin model: `app/admin/**` with admin route registry check (`check:admin-route-registry`) — new admin pages must be registered.
- Service-role usage is allowlisted (`check:service-role-allowlist` script, `lib/supabase/service-role.ts`). Any new service-role route must be added to the allowlist.

## 8. Scheduled jobs / cron

- Vercel Cron in `vercel.json`: `/api/cron/contract-sign-reminders` (11:00), `/api/cron/social-analytics` (03:00), plus more paths under `app/api/cron/` (`event-reminders`, `staffing-overview-refresh`, `workflow-automations`, `admin-publication-outbox`).
- Cron auth: `CRON_SECRET` in `.env.example` ("Secret for authenticating cron jobs and calendar feed tokens"); `social-analytics` route verifies it. Reuse this pattern for event sync jobs.

## 9. Feature flags

- Env-var based, e.g. `FEATURE_TICKETING_V2` (public twin `NEXT_PUBLIC_FEATURE_TICKETING_V2`), `FEATURE_ENTITY_RBAC`, audit gates in `lib/config/audit-feature-gates.ts` (`FEATURE_AUDIT_*_APPROVED`).
- Environment contract validation: `lib/config/environment-contract.ts` + `npm run validate:env:production` (runs at build start). **New env vars must be added to `ENVIRONMENT_CONTRACT` and `.env.example`.**
- No DB-backed flag system; the env-var pattern is the established one. New flags: `EVENT_DISCOVERY_V2`, `EVENT_PROVIDER_TICKETMASTER`, `EVENT_PROVIDER_BANDSINTOWN`, `EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE`, `EVENT_EXTERNAL_CLAIMS`, `EVENT_MAP_VIEW`, `EVENT_RECOMMENDED_SORT`, `EVENT_PROVIDER_ADMIN_TOOLS`.

## 10. Analytics

- `lib/analytics` module exists; `app/api/analytics` route; work-mode telemetry precedent (`20260728181917_work_mode_ux_telemetry.sql`). Discovery events should follow the existing telemetry table pattern.

## 11. Tests

- Jest (`npm test`) + Vitest (`npm run test:unit`, `__tests__/`) + Playwright (`npm run test:e2e`, `tests/e2e/`).
- RLS persona matrix precedent: `npm run test:rls-matrix`.
- Security checks: `scan-for-secrets.sh`, `check:service-role-allowlist`, `check:sec001-drift`.

## 12. Slugs & redirects

- `events.slug` globally unique (`idx_events_slug_unique`); public URL = `/events/[slug]`.
- `events_v2` slug unique **per org** — collision risk with global `/events/[slug]`; resolver tries `events` first (see INTEGRATION_CONFLICTS).
- No redirect table exists today; Phase 5 must add `event_slug_redirects` for merged events.

## 13. Duplicate / import logic

- None. No external import pipeline, no dedup logic, no merge tooling. Venue attendance import wizard is CSV attendance-only.

## 14. Repo ↔ DB drift

- Supabase project `supabase-TourifyApp` (`ndqaenaejzoxxengthsk`) is currently **INACTIVE** — live DB audit could not be performed this turn; migrations are treated as source of truth. Migration reconciliation tooling exists (`audit:migration-reconciliation`, `check:migration-checksums`). A live-schema diff must be run when the project is restored (recorded as blocker EVT-000-B1).

## 15. Build / test baseline

- HEAD commit `76d8389e` is "fix: resolve TypeScript errors blocking production build" — build health was recently repaired. Baseline `lint`/`typecheck`/`test`/`build` runs are pending and will be recorded in `IMPLEMENTATION_PROGRESS.json` (working tree on `main` carried uncommitted modifications into this branch; none are from this work).

## Non-destructive confirmation

- No table will be dropped, truncated, or renamed. `artist_events` and legacy `events` columns stay.
- All new tables go in `public` with RLS enabled from creation.
- All provider behavior is behind env flags, default off.
