# Discover state

- Last reviewed SHA: `d21769046d517898144ee09a1c7bb4a7d36b068f` (dirty shared worktree)
- Last reviewed at: 2026-09-25
- Active task: DISC-002 (canonical search + Wave 34 SSRF/sanitizer/drift lane; focused verification passed; INTERNAL_API_ORIGIN prerequisite and hosted re-scan still pending)
- Confidence: implementation and focused verification re-checked

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
  is in that state; `app/api/news/feed/route.ts:83` and `app/api/feed/for-you/route.ts:27`
  still pass it and still need the property removed.
- **The CP-069 grep found a third instance of the class, live in the repository.**
  `lib/opportunities/rss-opportunities-service.ts:38` builds
  `new URL('/api/feed/rss-news', params.origin)` from `request.nextUrl.origin` at
  `app/api/opportunities/sync/route.ts:13` and `app/api/opportunities/route.ts:36`, then
  calls the global `fetch` six times in a `categories.map`. Not discover-owned; routed in
  `HF-DISC-002-OPPORTUNITIES-SELF-FETCH-SSRF`. The fix needs no new route map entry —
  the `newsRssFeed` key already exists. **The standing check after fixing any sink of this
  class is `rg -n "new URL\('/api/" app lib`, not the scanner.**
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

## Code-scanning triage — 2026-09-25 (DOMAIN-013, revised Wave 34)

- Of the 96 open CodeQL alerts on PR #14, exactly **1** is inside discover's file
  ownership (`app/api/discover/**`, `lib/discover/**`, `lib/search/**`,
  `app/api/search/**`): alert #16 `js/request-forgery` (critical), now fixed.
- **6** more are inside the discover charter but not its file ownership: #40, #41, #42,
  #43, #45, #46. All six are the same defect — regex tag strip followed by entity decode,
  so `<`/`>` are reintroduced after the strip. Registered as 3 time-bounded dispositions
  in `security/security-scan-exceptions.json` (expiry 2026-12-25). **Never dismissed.**
- **Wave 34 outcome:** the root-cause helper those dispositions required now exists as
  `lib/news/text-sanitize.ts` `toPlainText` — decode in one semicolon-terminated pass,
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
