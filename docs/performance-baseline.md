# Tourify Performance Baseline (Phase 1)

Captured: 2026-07-09  
Project: Tourify Demo (`auqddrodjezjlypkzfpi`)  
Scope: measurement + advisor snapshot. No destructive DB changes.

## Ranked bottlenecks (code audit)

1. Middleware `getUser()` on nearly every request + sequential admin DB gates
2. Duplicate `/api/accounts` after RSC `AccountsSeed`
3. Admin shell mount storm: stats (13 queries) + notifications + venue context
4. Root `Nav` + admin shell double chrome on `/admin/*`
5. Heavy client pages (events planner ~4.7k lines, logistics, site-map)
6. Feed author N+1 (`resolveAccountAuthorSnapshot` per author key)
7. Hiring stats `countByStatus` sequential count queries

## Instrumentation added

| Tool | Location |
|------|----------|
| Server route timing helper | `lib/observability/route-timing.ts` |
| Client navigation marks | `components/performance/navigation-perf-marks.tsx` |
| Login mark | `tourify:login_submit` custom event from auth portal |
| Sampled prod logs | `PERF_LOG_SAMPLE_RATE` (default 0.1 in production) |

### How to capture timings locally

1. Open DevTools → Performance / Console with `npm run dev`
2. Sign in → watch `[perf:nav]` and `[perf:route]` logs
3. Network tab: count `/api/accounts`, `/api/profile/current`, notifications, `/api/admin/dashboard/stats` on login → admin home
4. Optional: `NEXT_PUBLIC_PERF_MARKS=1` in production builds

### Failed to fetch (dev soft-nav)

Console `TypeError: Failed to fetch` from `fetchServerResponse` / `createLazyPrefetchEntry` is an App Router RSC navigation abort, often during Turbopack first-compile of heavy routes.

Mitigations in code:

- Stable `JukeboxProvider` tree in `components/layout/app-chrome.tsx` (no remount on `/dashboard` ↔ `/admin`)
- `prefetch={false}` on admin sidebar links
- Stop querying nonexistent `account_relationships.is_active`

Local recovery:

1. Restart `npm run dev`, hard-refresh once after first compile of `/admin/dashboard`
2. Wait for `Compiled /admin/dashboard` before rapid-clicking sidebar links

### Manual metric worksheet (fill during QA)

| Metric | Before (audit) | After (this pass) | Notes |
|--------|----------------|-------------------|-------|
| Login → dashboard interactive | Slow (full waterfall) | Measure with `login_to_dashboard` | Marks wired |
| `/admin/dashboard` LCP | Blocked by dual Nav + shell fetches | Improved: no root Nav; deferred notifs; venue gated | Re-measure in browser |
| Soft nav admin home → staff | Shell remount storm | loading.tsx + lighter shell | |
| `/api/accounts` on seeded nav | 2–3× | 0 immediate (seed skip) | Mutations still refresh |
| Notification list on admin mount | Full list (100) | Badge-only until open | |
| Feed author enrichment | N+1 per author | Batched by entity table | Tests updated |
| Hiring status counts | Sequential awaits | Parallel `Promise.all` | Same counts |

## Supabase performance advisors (Tourify Demo)

| Lint | Count | Notes |
|------|------:|-------|
| multiple_permissive_policies | 2073 | RLS policy consolidation opportunity (out of Phase 1–2 scope) |
| auth_rls_initplan | 803 | Prefer `(select auth.uid())` pattern in policies |
| unused_index | 743 | Do **not** drop indexes in this pass |
| unindexed_foreign_keys | 315 | Many FKs; only add indexes justified by hot query paths |
| duplicate_index | 34 | Cleanup later with DBA review |

### Plan-relevant index notes

- `hiring_audit_events`: existing `application` / `venue` indexes reported unused; **employer composite** still justified by polymorphic list queries (not present as covering employer filter).
- `staff_documents`: FK on `user_id` / `verified_by` unindexed; candidate_id usage should be verified before adding.
- `posts`: several unused indexes already exist — **do not** add partial public feed index until EXPLAIN confirms sequential scans on the live feed path.
- Production index apply: **deferred** pending explicit approval (additive migration file may be prepared; not auto-applied).

## Bundle / route hotspots (static)

| Route / module | Signal |
|----------------|--------|
| `app/admin/dashboard/events/planner/page.tsx` | ~4.7k line client page |
| `components/admin/logistics/site-map-builder/simcity-site-map-viewer.tsx` | ~3k lines |
| `app/admin/dashboard/logistics/page.tsx` | Eager tab imports |
| Root layout providers | Auth + MultiAccount + Jukebox + Education on all routes |

Run `ANALYZE=true` / bundle analyzer in CI or locally when measuring after Phase 2–4.

## Indexes prepared (not auto-applied)

Migration file (additive only — review before applying to production):

- `supabase/migrations/20260710000000_perf_hiring_audit_employer_indexes.sql`

## Validation checklist (Phase 5)

- [x] No DB reset or destructive migrations performed
- [x] No used routes/components deleted (planner/logistics kept; pages moved to `*-page-client` only)
- [x] Seeded accounts skip immediate `/api/accounts` refetch
- [x] Admin shell parity before hiding root Nav (switcher, logout, messages, notifications)
- [x] Jukebox scoped off `/admin`
- [x] Notification full list deferred until panel open (badge still updates)
- [x] Feed author batching + tests
- [x] Request-scoped `React.cache` on `loadUserAccountsForSession`
- [x] Additive hiring audit index migration **file** prepared (not auto-applied to prod)
- [ ] Manual browser QA: login → dashboard → admin → staff/hiring/logistics
- [ ] Confirm multi-account switch + logout from admin shell
- [ ] Confirm playback continuity leaving admin is acceptable (jukebox remounts outside admin)

## Remaining bottlenecks (follow-up)

- RLS `auth_rls_initplan` / multiple permissive policies (large DBA pass)
- Unused index cleanup (do not drop blindly)
- Candidate/kanban pagination (needs UI approval — not done)
- Slim `select('*')` per-table (needs column audits — not done)
- Middleware cookie-first / matcher narrowing (security review — not done)
- Full event planner file split into modules (still monolithic; logistics/hiring tabs lazy-loaded)
- Apply `20260710000000_perf_hiring_audit_employer_indexes.sql` after explicit prod approval
