# NEWS INDEX M2 — Persistent News Foundation

**Status:** Implementation scaffold in a dependent draft PR; feature disabled.

## Dependency chain

- M1 branch / draft PR #18: anonymous route allowlist and anonymous feed guards.
- M2: SQL review draft + typed contracts + deterministic composer + cursor-safe read route.
- M3: approved source registry UI, durable ingestion job, community review pipeline, editorial clustering, NewsRank v2 and feature cutover.

## What exists in this change

1. A **review-only** schema proposal: `docs/news/sql/NEWS_CORE_V1_REVIEW.sql`.
2. A typed, additive public News content contract.
3. A pure, deterministic 45% RSS / 35% community / 20% editorial feed composer with source and story caps, and unit tests.
4. An **off-by-default** `GET /api/news/indexed` endpoint that relies on caller-scoped Supabase RLS; explicit publication filters, typed fields and validated cursors.

The new API does not yet use the composer because it needs a ranked candidate snapshot and indexing worker. It currently returns chronologically ordered published News index records when explicitly enabled. This is deliberate: do not pretend that NewsRank v2 has been integrated.

## Schema review and migration

The SQL file is **not** a database migration and must not be executed blindly.
Follow the repository's CLI conventions:

```bash
supabase migration new news_core_v1
```

Copy and reconcile the reviewed SQL into the generated timestamped migration file, then test in an isolated database and apply to staging via the standard review process.

The schema includes:
- Approved publishers and feed configuration (`news_sources`).
- Public-safe headline/link records (`news_items`).
- Story clusters (`news_stories`).
- Private reporter submissions and editorial notes (`news_submissions`).
- Private ingestion runs (`news_ingestion_runs`).
- Explicit grants and row-level security.

**Do not use news_items to store private, user-only, or draft story bodies.**
Only public-safe excerpts, authorized media and metadata should be copied into public rows. Public News read policies are exact and fail closed.

## Indexed API rollout

- `NEWS_INDEXED_READ_ENABLED` defaults to disabled.
- When disabled: 404 for `/api/news/indexed`.
- When enabled and migration applied: public index records only, ordered by `published_at, id`.
- No cookies, identities, or service role credentials are echoed into the response.
- Do not enable or route `/news` to this endpoint until ingestion data, rights checks and RLS tests are verified.
- The old `/api/news/feed` remains unchanged by M2.

## Next engineering tasks

**NEWS-004A:** Reconcile staging and demo schema; generate and dry-run migration; add pgTAP SQL policy tests.
**NEWS-004B:** Build sources admin UI. Validate and pin approved publisher domains, rights and feed URLs.
**NEWS-005:** Build restricted scheduled ingest worker. Enforce SSRF protection, DNS/IP checks, redirect restrictions, ETag/Last-Modified, max response sizes, timeouts and XML parser limits; parse RSS/Atom with a reviewed library; dedupe by canonical URL/GUID.
**NEWS-006:** Cluster coverage by shared subject/event; store original publisher identities and dates; corrections invalidate cached snapshots.
**NEWS-007:** Create news submission/review backend and public proof-of-review projection. Ordinary social posts remain excluded until approved.
**NEWS-008:** Integrate NewsRank v2 with composer and test it against editorial quality sets.
**NEWS-009:** Store feed snapshots and pagination keys; invalidate removed and disputed stories.
**NEWS-010:** Add unsigned/signed-in cross-role RLS tests and E2E checks; benchmark P95 and source diversity.

## Acceptance checks

- Fresh anonymous Supabase client sees only published, public, approved, appropriately licensed rows.
- A published link-only item contains no copied excerpt or third-party image.
- Private contributor tips and ingestion logs are never readable by anon/authenticated roles.
- Malformed cursor and limit return 400.
- Composer respects 9/7/4 when candidates are available; it backfills if a source class is empty.
- Duplicate story clusters occupy at most one feed slot.
- The API is unavailable with the feature flag off.
- Legacy news functionality is unaffected.

## Existing release blockers

- PR #18 is not production-ready until broad legacy `posts` and `events` RLS grants/policies are audited.
- Vercel preview is blocked by Node 20 end-of-life (package engines currently 20.x).
- GitHub CI dependency install fails with conflicting `date-fns` peer expectations from `@base-ui/react`.
- The proposed M2 SQL has **not been applied**, and tests have **not run** in this connected environment.
