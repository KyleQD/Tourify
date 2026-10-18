# NEWS FOUNDATION M1 — Public Access Security Gate

Status: **Draft implementation; do not enable in production without security sign-off.**

## Scope

The public News route is enabled with `NEWS_PUBLIC_ACCESS_ENABLED=true`. This is **off by default**.

Allowed routes: `/news`, approved category routes, and one-slug `/news/story/[slug]`, `/news/topic/[slug]`, `/news/author/[slug]`, `/news/source/[slug]`.

Authoring, editorial, review and admin routes are **not** allowlisted. New routes require explicit review. API `GET /api/news/feed` already supports optional authentication; anonymous responses use the public-only content gate regardless of launch flag.

## Reused infrastructure

- `middleware.ts` owns request-level login redirects.
- `lib/news/feed-service.ts` collects external RSS news, community blogs, social posts, music and events.
- `lib/news/ranking.ts` ranks and paginates candidates; NewsRank v2 remains future work.
- `lib/news/publication.ts` is an explicit, fail-closed public feed eligibility guard.
- `/blog/[slug]` remains the canonical public page for published community articles.

Public-only candidate rules in this milestone:
- RSS links require approved ingestion status and HTTP(S) article URL.
- Community articles must have a published `/blog/` URL and approved status from the adapter.
- Approved, visible public music and published explicitly public legacy events are eligible.
- Ordinary social posts, unreviewed news submissions, and private operational `events_v2` records are **not eligible**, even if visible to a signed-in user elsewhere.
- Signed-in News feed retains legacy behavior until the public-launch flag is switched on; then the eligibility guard applies to everyone.

**This guard is defense in depth, not a substitute for database privacy controls.**

## Security blocker discovered in staging

In the active staging database, `public.posts` has a SELECT policy named `Anyone can view posts` with predicate `true`. This is broader than the intended public/followers/private post visibility model.

The `public.events` table also has an unrestricted SELECT policy named `Events are viewable by everyone`.

Before enabling public News:
1. Audit *all* SELECT policies and effective table grants for `posts`, `events`, `artist_blog_posts`, `music_tracks`, linked profile tables, and any exposed views or RPC functions.
2. Replace unrestricted policies with purpose-specific public, owner, and follower/member policies. **Do not simply drop the broad policy without testing the rest of the app.** If `visibility`, `is_visible`, and `moderation_status` are used for public posts, public policies must require the appropriate published, visible, approved combination.
3. Ensure RLS rules use database-side authorization, not frontend filters or self-declared user metadata.
4. Verify table grants: anonymous clients should not have unauthorized write privileges.
5. Test direct Supabase anonymous requests, authenticated owners, followers, unrelated logged-in users, and service-role boundaries; include hidden and removed post fixtures.
6. Audit all existing social features for regressions before merging policy changes.
7. Test a signed-out browser hitting `/news` and `/api/news/feed` against staging.
8. Verify no signed-out access to `/admin/news`, `/news/editor`, `/news/drafts`, or any private APIs.
9. Check the response payload, rendered HTML, cached objects, Open Graph assets, and search indexes for nonpublic content.
10. After release approval, set `NEWS_PUBLIC_ACCESS_ENABLED=true` on the target deployment and roll it out. Rollback is setting it to `false` and redeploying.

## CI / QA

Unit tests:
- `lib/routing/public-news-routes.test.ts`
- `lib/news/publication.test.ts`
- Existing `lib/news/ranking.test.ts` remains unchanged.

Required additional integration tests before release:
- Anonymous GETs return only allowed candidate classes and never return raw `post_*` or `eventv2_*` items.
- Anonymous Supabase reads cannot retrieve followers/private/hidden/unapproved posts.
- `/news` returns HTTP 200 without a session with flag enabled and redirects to login while disabled.
- Private subroutes remain protected whether the flag is enabled or disabled.
- Published blogs remain accessible by guests and drafts remain inaccessible.
- Source URI, rights, images and canonical links are checked before indexing.
- Guest requests cannot trigger authenticated comment/share/publish endpoints.
- Existing logged-in News and social feeds still function after RLS policy changes.
- Test both staging and demo schema variants before production.

## Follow-on work

**M2:** News submissions and moderation state persisted to a separate News index, story clusters, duplicate matching, source credibility without equating a registered publisher to verified claims, durable RSS jobs, NewsRank v2 blending.

**M3:** Server-rendered original news story pages, SEO, accessible public comment reading, feed snapshot pagination, governance console, persistent cache and operational telemetry.

This milestone does not authorize production deployment or Supabase DDL changes.
