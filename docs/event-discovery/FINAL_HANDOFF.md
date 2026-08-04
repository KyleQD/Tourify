# FINAL HANDOFF — Event Discovery & Tour Integration

**Date:** 2026-08-04 · **Branch:** `feature/event-discovery-integrations`

## 1. Branch name

`feature/event-discovery-integrations` (from `main` @ `76d8389e`)

## 2. Commit summary

1. `8b702db3` docs: Phase 0 audit suite (7 docs + progress tracker)
2. `be313ca2` feat: Phase 1 provider foundation — contracts, zod schemas, flags, registry, foundation migration + RLS, 16 tests
3. `4e6cd6ad` feat: Phase 2 PostGIS discovery index, nearby/upcoming RPCs, search service, `/api/events/search`
4. `02e4dd9b` feat: Phase 3 discovery UX (flag-gated `DiscoveryExplorer`)
5. `52eeab60` feat: Phase 4 Ticketmaster pilot + canonical ingest + matcher + sync cron + claims/merges migration
6. `0afa4554` feat: Phases 5–6 merge review API, slug redirects, claims, tour attach
7. `d4ace5e2` feat: Phase 7 Bandsintown permission-safe pilot
8. admin UI (providers/sync/duplicates/claims) + admin route registry
9. service-role allowlist entries

## 3. Completed phases

- Phase 0 — Audit ✅ (6 audit docs + tracker)
- Phase 1 — Canonical provider foundation ✅
- Phase 2 — PostGIS discovery index ✅ (live EXPLAIN validation blocked, see §9)
- Phase 3 — Discovery UX ✅ (flag-gated; E2E browser evidence deferred)
- Phase 4 — Ticketmaster pilot ✅ (fixture-tested; live smoke blocked, no key)
- Phase 5 — Deduplication & canonical quality ✅
- Phase 6 — Claims, ownership, tour links ✅
- Phase 7 — Bandsintown permission-safe pilot ✅ (default `disabled`)
- Phase 8 — Ops, rollout, runbook ✅

## 4. Migrations added (additive only)

- `20260804130000_event_provider_foundation.sql` — external sources, ticket offers, connections, sync jobs/runs + RLS + grants
- `20260804131000_event_discovery_postgis.sql` — postgis, `event_discovery_index`, GiST/B-tree/GIN indexes, `event_discovery_nearby`, `event_discovery_upcoming`, tsvector trigger, `user_event_discovery_preferences` + RLS
- `20260804132000_event_claims_merges.sql` — merge candidates/decisions, slug redirects, claims, field overrides, `event_merge_execute()` + RLS

No existing table dropped, truncated, or renamed.

## 5. Routes & major components

**API:** `GET /api/events/search` · `POST /api/events/[eventId]/claim` · `POST /api/events/[eventId]/tour` · `/api/integrations/bandsintown/{connect,status,disconnect}` · `/api/admin/{event-providers,event-sync,event-merges,event-claims}` · `POST /api/cron/events/sync` (Vercel Cron `17 */6 * * *`, CRON_SECRET)

**UI:** `components/events/discovery/discovery-explorer.tsx` (mounted on `/events` behind `NEXT_PUBLIC_EVENT_DISCOVERY_V2`, legacy fallback kept) · admin pages `app/admin/dashboard/events/{providers,sync,duplicates,claims}`

**Libs:** `lib/events/providers/*`, `canonical-event-service.ts`, `event-matcher.ts`, `discovery-index.ts`, `search-service.ts`, `location.ts`, `cursors.ts`

## 6. Provider modes enabled

None by default. Ticketmaster `off`; Bandsintown `disabled`; discovery v2 `off`. All activation is env-driven.

## 7. Tests & build results

- `npx vitest run __tests__/events/` — **68/68 pass** (12 files, incl. 16 pre-existing)
- Scoped `eslint` on all new files — clean (3 cosmetic warnings in one admin page)
- `check:admin-route-registry` — new routes registered (remaining violations pre-existing)
- `check:service-role-allowlist` — new modules registered (remaining violations pre-existing)
- `scan-for-secrets.sh` — no findings in new code
- **Pre-existing:** full `tsc --noEmit` exceeds the 300 s tool limit on this repo; not introduced by this work. A full `next build` was not completed locally for the same reason — must run in CI before merge.

## 8. Security & RLS

- All 11 new tables: RLS enabled at creation; sync tables deny all client access; grants explicitly scoped.
- Provider keys are server-only (no `NEXT_PUBLIC_` twins), read only in `server-only` modules.
- Cron verifies `Authorization: Bearer ${CRON_SECRET}`.
- Admin routes use existing `checkIsAdmin()`; registered in the admin route registry.
- Claims self-scoped (`auth.uid() = claimant_user_id`); ownership never derived from user-editable metadata.
- Precise device location is session-only; saved location is opt-in in `user_event_discovery_preferences` (self-RLS).

## 9. Known blockers

1. **EVT-000-B1 — Supabase project INACTIVE** (`ndqaenaejzoxxengthsk`): live schema diff, RLS verification, advisors, EXPLAIN ANALYZE, and migration application could not run. All SQL is defensive (`if not exists`, `drop if exists`, `NOT VALID`-style patterns).
2. **No provider credentials**: Ticketmaster live smoke test and Bandsintown verification flow are secret-gated and untested against live APIs.
3. **E2E/browser evidence** (acceptance matrix AT-001/2/3/8/13/15) requires a live environment; deferred.
4. Manual city location currently rides the text-query channel until an approved geocoder is wired in.

## 10. Required environment variables

See `.env.example`: `EVENT_DISCOVERY_V2` (+`NEXT_PUBLIC_EVENT_DISCOVERY_V2`), `EVENT_PROVIDER_TICKETMASTER`, `TICKETMASTER_API_KEY`, `EVENT_PROVIDER_BANDSINTOWN`, `EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE` (or `BANDSINTOWN_MODE`), `BANDSINTOWN_APP_ID`, `EVENT_EXTERNAL_CLAIMS`, `EVENT_MAP_VIEW`, `EVENT_RECOMMENDED_SORT`, `EVENT_PROVIDER_ADMIN_TOOLS`, plus existing `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. All registered in `lib/config/environment-contract.ts`.

## 11. Deployment steps

1. Apply the three migrations via the repo's Supabase migration workflow (staging first).
2. Set env vars (flags off) in Vercel; deploy branch.
3. Verify cron route 401s without the secret and is registered in `vercel.json`.
4. Run native backfill (`backfillNativeEvents`) from a server context.
5. Enable `EVENT_DISCOVERY_V2` for a small cohort; compare against `/api/events/discover` (parity).
6. When a Ticketmaster key exists: enable provider, enqueue one market cell, watch `event_sync_runs`.

## 12. Rollback steps

- Per phase: every feature is flag-gated — disable the flag to restore prior behavior instantly (legacy discover rail untouched).
- Migrations are additive; rollback = drop the new tables/functions only (`event_discovery_index`, `event_external_sources`, `event_ticket_offers`, `event_provider_connections`, `event_sync_jobs`, `event_sync_runs`, `event_merge_candidates`, `event_merge_decisions`, `event_slug_redirects`, `event_claims`, `event_field_overrides`, `user_event_discovery_preferences`, RPCs). Existing tables are never touched, so no data rollback is required.
- Cron entry: remove the `/api/cron/events/sync` block from `vercel.json`.

## 13. Items requiring business / provider approval

1. Ticketmaster developer account + API key; legal review of attribution terms.
2. Bandsintown partnership application before `partner` mode; until then production stays `disabled`/`artist_owned_key`.
3. Geocoder approval for manual-location radius search.
4. Live Supabase project restore/repair to run DB validation (owner action).

---

### Definition-of-done statement

Not claiming full "complete" per the master prompt's bar: Phases 0–8 are implemented with 68/68 unit tests passing, but live-DB validation, live-provider smoke tests, and E2E browser evidence are **blocked/deferred with evidence** (§9), not verified.
