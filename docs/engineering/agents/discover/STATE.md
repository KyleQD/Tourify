# Discover state

- Last reviewed SHA: `ca3bb0b08870b87ce5f6e4ac69c65ddf31942c96` (dirty shared worktree, 6 concurrent lanes)
- Last reviewed at: 2026-09-25
- Active task: DISC-002 (canonical search + Wave 35 SSRF/sanitizer/drift lane; focused verification passed 12 files / 117 tests and 8 files / 86 tests; INTERNAL_API_ORIGIN prerequisite, three schema drifts and the hosted re-scan still pending)
- Confidence: implementation and focused verification re-checked; three newly-found schema drifts are recorded, not fixed, because the fixes are not discover's

## Durable facts

- Mission: Own search, discovery, world data, directories, news, and recommendations.
- Default working set is recorded in `WORKING_SET.json`.
- **Search infrastructure:** 4+ implementations (legacy ILIKE, unified reshape, global FTS, enhanced creator, venue RPC).
- **FTS infrastructure:** 10+ tables have `global_search_vector` tsvector columns with GIN indexes.
- **World data:** Service-role only access for world tables; world history search is client-side from static JSON.
- **API contracts:** No Zod contracts for search/discover routes.
- **Test coverage:** Search tests (4 files), world tests (1 file), discover lib tests (4 files); missing integration tests.
- **Canonical local search:** `/api/search` now owns the FTS-backed `GlobalSearchResponse` contract, with a 60 requests/minute shared rate-limit bucket. `/api/search/global` is an alias and `/api/search/unified` is a response-shape compatibility adapter. `/api/search/enhanced` remains a compatibility surface for creator-only filters and shares that same limit.

## Current focus

- DISC-001 baseline audit complete. Deliverables: BASELINE.md, GAPS.md, QUESTIONS.md.
- Key gaps: search consolidation (WS-2.3), FTS underutilization (WS-3.2), rate limiting gaps (WS-1.3).
- DISC-002 canonical endpoint implementation re-verified: 12 focused tests, focused ESLint, scoped diff check, and agents:validate passed on 2026-09-10; local Supabase and configured-Redis smoke evidence remains with Release/QA.

## Known risks

- The repository was already heavily modified at bootstrap.
- Generated maps describe topology, not behavioral correctness.
- Search endpoint proliferation creates maintenance burden and inconsistent behavior.
- World data access restrictions limit user-facing features.

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- DISC-002 remains P1 and is a core launch dependency. It requires one canonical search contract, authorization-aware result filtering, Redis-backed rate limiting, and deployed Supabase/429 staging evidence.

## Preserved world-data lineage — 2026-09-22 (CP-056)

- `origin/feature/world-of-music` (merge-base `81448509`, HEAD `00d9f173`) preserves the
  world-geography fork in the discover domain: app/venue, lib/world, components/venue +
  world, app/internal console, world APIs, supabase world migrations, data/world, and 24
  world test files (309 files not in master). Use it as the exclusive source when porting
  world-data islands into master additively; never blanket-merge it onto
  release/clean-snapshot.

## Outbound HTTP trust boundary — 2026-09-25 (DOMAIN-011/012, CP-063)

- **Never derive an outbound destination from the inbound request.** `request.url`,
  `request.nextUrl.origin`, `Host`, and `X-Forwarded-Host` are caller-influenced. The
  reference guard is `lib/discover/outbound-guard.ts` (pure, no I/O) plus
  `lib/discover/internal-json-fetch.ts` (resolve-then-pin over `node:https`/`node:http`).
- The base origin comes only from `INTERNAL_API_ORIGIN`, `NEXT_PUBLIC_APP_URL`,
  `VERCEL_PROJECT_PRODUCTION_URL`, or `VERCEL_URL`, matched as an **exact origin** with no
  localhost fallback. An unconfigured environment performs no outbound request.
- Loopback/private origins need non-production `NODE_ENV` **and**
  `DISCOVER_ALLOW_LOCAL_UPSTREAM=true`.
- Callers pick upstreams by key from the frozen `DISCOVER_UPSTREAM_ROUTES` map; caller
  values only ever reach length-bounded `URLSearchParams` entries.
- **CodeQL does not cover this class completely.** `js/request-forgery` flags
  `fetch(\`${origin}${path}\`)` built from `request.url` but did *not* flag the identical
  sinks at `app/api/hub/route.ts:82` and `lib/news/feed-service.ts:673`, which use
  `request.nextUrl.origin`. A clean scan is not evidence a self-fetch is safe — grep for
  `nextUrl.origin` reaching a network sink before trusting the alert count. **Both siblings
  are now fixed** (2026-09-25, Wave 34): a new fan-out extends the frozen
  `INTERNAL_UPSTREAM_ROUTES` map in `lib/discover/internal-json-fetch.ts` and calls
  `fetchInternalJson` by key. It never gets a second transport, a second allowlist, or a
  second redirect policy. `DISCOVER_UPSTREAM_ROUTES` is left byte-identical.
- A taint value that enters a module this lane owns while the supplying routes belong to
  another lane is severed at the **service** boundary: the property stays optional and
  `@deprecated`, is documented as ignored, and is read by nothing. `BuildNewsFeedParams.requestOrigin`
  is in that state. **Wave 35 reduced it to one call site**: the
  `app/api/news/feed/route.ts:83` site was removed, leaving only
  `app/api/feed/for-you/route.ts:27`, a social-owned shared file. The field itself cannot be
  deleted until that line goes, because removing it is an excess-property-check compile error
  there. One line, routed in `HF-DISC-002-FORYOU-REQUESTORIGIN-RESIDUAL`.
- **The CP-069 grep found a third instance of the class, live in the repository.**
  `lib/opportunities/rss-opportunities-service.ts:38` builds
  `new URL('/api/feed/rss-news', params.origin)` from `request.nextUrl.origin` at
  `app/api/opportunities/sync/route.ts:13` and `app/api/opportunities/route.ts:36`, then
  calls the global `fetch` six times in a `categories.map`. Not discover-owned; routed in
  `HF-DISC-002-OPPORTUNITIES-SELF-FETCH-SSRF`. The fix needs no new route map entry —
  the `newsRssFeed` key already exists. **The standing check after fixing any sink of this
  class is `rg -n "new URL\('/api/" app lib`, not the scanner.**
  **WAVE 35: FIXED (DISC-SSRF-004).** The grep found it, the grant then covered it, and it
  is closed by porting the same guard — a new frozen `OPPORTUNITIES_UPSTREAM_ROUTES` key
  (`opportunitiesRssNews`, same `/api/feed/rss-news` pathname) and `fetchInternalJson` by
  key. No second allowlist, transport or redirect policy. `origin` is deleted from the
  parameter type and both callers, so `app/api/opportunities/**` no longer reads
  `request.nextUrl.origin` at all. 19 tests in
  `__tests__/discover/opportunities-self-fetch-ssrf.test.ts`; every rejection path asserts
  zero sockets **and** zero upserts. **`rg -n "new URL\('/api/" app lib` now returns only
  prose in doc comments — the class has no remaining instance in the repository.**
- Known remaining consumers of the older, weaker pattern (validate-then-resolve,
  regex-only hostnames, no IP-encoding normalization):
  `lib/marketplace/external-import.ts`. Not discover-owned.

## Blocking release prerequisite — INTERNAL_API_ORIGIN (raised Wave 33, still unactioned)

- `/api/discover`, `/api/hub` and the news feed's external RSS candidates perform **no
  outbound request at all** unless an operator has declared an internal origin. There is
  no localhost fallback, so an unconfigured environment does not error — it returns empty
  sections with one warning naming the variable to set.
- The variables read, in precedence order, all server-side: `INTERNAL_API_ORIGIN`,
  `NEXT_PUBLIC_APP_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`. A value may be a
  space- or comma-separated list; a source containing any unusable entry contributes
  nothing, so a typo yields an empty allowlist rather than a widened one.
- `DISCOVER_ALLOW_LOCAL_UPSTREAM` is a development-only opt-in and must stay unset in every
  deployed environment: a loopback or private-literal origin is refused when
  `NODE_ENV=production` even with it set.
- Tracked as a blocking item on DISC-002 and in `HF-DISC-002-INTERNAL-API-ORIGIN` (to
  release). This lane cannot set it: no deployed environment is reachable from this
  workspace and fabricating a value or claiming hosted evidence is forbidden.
- **Wave 35 added a FOURTH surface**: `POST /api/opportunities/sync` and
  `GET /api/opportunities?refresh=true` now go through the guard, so the opportunities RSS
  ingest upserts zero records without the variable. This is the **opposite** of that
  surface's previous state — before Wave 35 it worked, because it used a caller-supplied
  origin. Setting the variable is now required for it to function at all.
- The release lane has filed `HF-RELEASE-035-INTERNAL-API-ORIGIN-OPERATOR` to consume this,
  and reports that the committed deployment templates carry none of the four variable names,
  so the handoff has landed and the operator step is now the only thing between the
  prerequisite and a working `/api/discover`.

## Code-scanning triage — 2026-09-25 (DOMAIN-013, revised Wave 34)

- Of the 96 open CodeQL alerts on PR #14, exactly **1** is inside discover's file
  ownership (`app/api/discover/**`, `lib/discover/**`, `lib/search/**`,
  `app/api/search/**`): alert #16 `js/request-forgery` (critical), now fixed.
- **6** more are inside the discover charter but not its file ownership: #40, #41, #42,
  #43, #45, #46. All six are the same defect — regex tag strip followed by entity decode,
  so `<`/`>` are reintroduced after the strip. Registered as 3 time-bounded dispositions
  in `security/security-scan-exceptions.json` (expiry 2026-12-25). **Never dismissed.**
- **Wave 34 outcome:** the root-cause helper those dispositions required now exists as
  `lib/news/text-sanitize.ts` `toPlainText` — decode in ONE semicolon-terminated pass,
  strip second, then remove any residual `<`/`>` — with 17 tests. **Alert #43 is fixed in
  code** (`components/feed/rss-news-item.tsx` no longer has a local `stripHtml`). #40, #41,
  #42, #45 and #46 sit in `app/api/feed/rss-news/route.ts`,
  `lib/services/rss-feed.service.ts`, `lib/opportunities/rss-opportunities-service.ts`
  and `components/news/news-page.tsx`, all outside this wave's file ownership, so their
  entries are **retained rather than deleted** and re-routed to
  `HF-DISC-002-RSS-SANITIZE-ORDERING`. The fix at each is a one-line import swap.
- The residual risk that no alert covered — an unvalidated third-party `item.link` reaching
  `window.open` — **is now closed**: `components/feed/rss-news-item.tsx` validates the link
  once per render with `normalizeExternalHttpUrl` and disables Read/Share when it is unusable.
- **No alert is confirmed closed by any of this.** GitHub Advanced Security has no local
  engine, so the only confirmation is a hosted re-scan on the PR. A registry disposition is
  not a dismissal and a local code fix is not a re-scan.
- **Wave 35 outcome: the whole cluster is closed in code and all three registry entries are
  deleted.** The grant covered `app/api/feed/**`, `lib/opportunities/**` and
  `components/news/**`. #40 → `app/api/feed/rss-news/route.ts` now calls `toPlainText`
  (keeping the CDATA unwrap *in front of* it, because `toPlainText` treats a CDATA wrapper
  as markup and would otherwise discard the `<link>` payload, which is the URL itself).
  #41 → the local `toPlainText` in `lib/opportunities/rss-opportunities-service.ts` is
  deleted and the shared one imported. #45 → `decodeTextEntity` is deleted from
  `components/news/news-page.tsx` and all 10 call sites use `toPlainText`.
  **#42 and #46 were resolved by deletion, not by a code change**: the design-system lane
  removed `lib/services/rss-feed.service.ts` as a zero-importer module in `ca3bb0b0`, and
  `rg` confirms no `RSSFeedService` or `cleanText` remains anywhere in `app`, `lib` or
  `components`. Each entry was confirmed unnecessary against the source *before* deletion.
  Pinned by `__tests__/news/rss-sanitize-ordering.test.ts`, which matches the **defect
  shape** (any literal `.replace(/&lt;…/g, '<')`-style entity decode) rather than a
  function name, so a re-introduced strip-then-decode fails whatever it is called, and
  which also asserts the deleted module does not reappear.

## Drift cluster — 2026-09-25 (DOMAIN-017)

- The discover share of HF-DB008-TYPECHECK-SEARCH is **one file**:
  `app/api/search/enhanced/route.ts` selected `artist_profiles.verification_status`, a
  column in neither the active chain nor `lib/database.types.ts`, so PostgREST errored and
  the route silently returned **zero** artist results. Fixed: the select omits the column
  and `verified` derives from `profiles.is_verified`.
- The inventory's `tscFiles` attribution is **stale** for `calculate_venue_profile_completion`:
  its only live consumer in the whole repository is `app/api/settings/route.ts:125`, not
  either search route. The discover share of that object is zero, not eight hits.
- The `seo` cluster (`lib/seo/public-preview-readers.ts`,
  `lib/services/account-management.service.ts`) and `app/api/settings/route.ts` are outside
  discover ownership and are re-routed in `HF-DISC-002-DRIFT-SEO-SETTINGS`.
- `lib/database.types.ts` and every `types/**` file are read-only to this lane. The DB-005
  creator projection is **authored but unapplied** — `accounts.artist_profile_id` and the
  other three columns are absent from the contract — so the creator-filter migration stays
  blocked on a manual apply under CP-051 regardless of typing.

## Absence of findings is not evidence — 2026-09-25 (CP-084, DOMAIN-020)

- Generalises the admin lane's `withAdminCapability` finding and extends CP-069 to the
  compiler. **A tsc diagnostic count is a LOWER BOUND on drift, never an upper bound**, and
  CodeQL's silence is not evidence either: `js/request-forgery` models `request.url` as a
  remote-flow source but not `request.nextUrl.origin`, which is why three identical SSRF
  sinks produced exactly one alert. Two independent verification channels, each blind in a
  known direction; neither one's silence is a signal.
- The discover sweep for the three blind-spot classes (un-generic Supabase clients,
  `any`-typed handler clients, request-derived outbound destinations) found **three live
  schema drifts that silently empty parts of the news feed**, none reported by any gate:
  1. `artist_blog_posts.format` — created only by an **archived** migration
     (`supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/20260717220000_press_content_formats.sql`),
     so the select at `lib/news/feed-service.ts:376-397` and its
     `.in('format', [...])` filter 400 at PostgREST. Live code depends on it; a
     one-line "fix" that removed it was **reverted**, because it belongs to the press lane,
     breaks `__tests__/press/press-formats-and-news.test.ts:30`, and would hide a schema
     regression as a working feature.
  2. `music_tracks.{origin_status,certification_status,certification_level,certification_public_id}`
     — `music_tracks` is a **view** whose projection
     (`supabase/migrations/20260711165607_native_music_player_hardening.sql:118-158`) does
     not include them; they were added to the base table afterwards
     (`20260910140000_artist_music_trust_columns.sql:12-15`), and a base-table column does
     not enter an existing view. Not fixed here: dropping the columns would assert
     `not_recorded` for tracks that may be certified, which is a trust-surface decision.
  3. `user_news_preferences` / `user_news_subscriptions` — created by **no** migration
     anywhere under `supabase/`, so the news personalization signal is permanently empty,
     not temporarily unavailable. The code comment that rationalised it as "may not exist
     yet in early rollout" was corrected; the `catch` was kept.
  All three routed in `HF-DISC-002-NEWSCHEMA-ACTIVE-CHAIN-GAPS` (database, additive,
  CP-051). Nothing was authored, applied or modified under `supabase/**`; no
  `supabase db reset` was run.
- What discover *could* fix without a schema change: both candidate queries now destructure
  and **log** `error` instead of discarding it, so a PostgREST failure is no longer
  indistinguishable from "nothing to show". A dead "legacy" retry that re-selected the
  missing column (and so could never succeed) was removed.
- **The typing root cause is one file, not 25**: `lib/supabase/service-role.ts:11` returns
  a bare `SupabaseClient` with no `Database` generic, and 25 un-generic annotations across
  `lib/news/feed-service.ts`, `lib/search/global-search-service.ts` and
  `lib/opportunities/rss-opportunities-service.ts` propagate it.
  `app/api/feed/posts/route.ts` adds 12 `supabase: any` parameters and 41 bare `any`
  identifiers — the exact `withAdminCapability` shape. Both are outside discover's edit
  scope for a security lane; both are in `HF-DISC-002-TSC-LOWER-BOUND-DRIFT`.
- The instrument, kept as a gate rather than a report:
  `__tests__/news/news-feed-schema-drift.test.ts` parses `lib/database.types.ts` and
  cross-checks every `.from().select()` in `lib/news/**`, with a 7-entry `ACCEPTED` list so
  it is fail-closed for **new** drift and each accepted exception must stay annotated in
  source. Caveat recorded in the test: the contract is not a sufficient oracle —
  `app/api/feed/music/route.ts:174` selects four `artist_music` columns that exist in the
  active chain but not in the contract, so a guard failure means "contract and chain
  disagree", not always "this select is broken".
