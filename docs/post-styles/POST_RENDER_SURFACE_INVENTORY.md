# Post Render Surface Inventory

**Phase:** Task 10 — All Post Render Surfaces (COMPLETE)
**Updated:** 2025-07-15
**Purpose:** Enumerate every surface where a post is currently rendered, with its rendering decision classification and integration status.

---

## Classification Definitions

| Decision | Meaning |
|----------|---------|
| **full** | Full styled rendering via `StyledPostRoot`; all `EpkAppearance` tokens applied to the card |
| **compact** | Approved compact variant; post renders a narrower layout through `PostCompactAdapter`; bounded tokens only |
| **neutral** | Standard unstyled preview; links to permalink; does not render appearance |
| **unstyled** | Intentionally always unstyled (moderation, analytics, admin operations); documented exclusion |

---

## Surface Inventory

### Primary Feed Surfaces

| Surface | Component File | Rendering Decision | Status | Notes |
|---------|---------------|--------------------|--------|-------|
| Home feed (main) | `components/feed/feed-list.tsx` | **full** | ✅ DONE (Task 10a) | `usePostStyleFlags` + `enablePostStyles={flags.post_styles_read}` wired to `PostCard` |
| Artist home feed | `components/artist/artist-home-feed.tsx` | **full** | ✅ DONE (Task 10c) | `usePostStyleFlags` + `enablePostStyles={flags.post_styles_read}` wired to `ArtistPostCard`; `appearance` threaded through `toArtistFeedPost` |
| Dashboard feed | `components/dashboard/dashboard-feed.tsx` | **full** | 🔄 DEFERRED | Secondary dashboard surface; classify as future integration candidate |
| Social feed | `components/feed/social-feed.tsx` | **full** | 🔄 DEFERRED | Inline card JSX, no PostCard import. Code comment added with integration roadmap |
| Streamlined feed | `components/feed/streamlined-feed.tsx` | **full** | 🔄 DEFERRED | Has demo-mode path. Code comment added with integration roadmap |
| Simple feed | `components/feed/simple-feed.tsx` | **full** | 🔄 DEFERRED | Direct Supabase query + real-time subscription. Code comment added with integration roadmap |

### Alternate Card Renderer

| Surface | Component File | Rendering Decision | Status | Notes |
|---------|---------------|--------------------|--------|-------|
| Modern card | `components/feed/post-card-modern.tsx` | **full** | ✅ DONE (Task 10d) | `appearance` field added to `Post` interface; `enablePostStyles` prop added; `StyledPostRoot` conditional path wired |

### Profile & Artist Page Surfaces

| Surface | Component File | Rendering Decision | Status | Notes |
|---------|---------------|--------------------|--------|-------|
| Public artist profile feed | `app/artist/[username]/page.tsx` → `PublicArtistPage` | **full** | 🔄 DEFERRED | Uses `ProfilePosts` or a custom feed via `getPublicArtistProfileDTO` — to be confirmed |
| Venue public profile feed | `app/venues/[slug]/page.tsx` → `ProfilePosts` | **full** | ✅ DONE (Task 10e) | `ProfilePosts` now imports `usePostStyleFlags`, `resolvePostAppearanceDTO`, `StyledPostRoot`; `appearance` threaded through transform |
| General profile feed | `app/profile/[username]/page.tsx` → `ProfilePosts` | **full** | ✅ DONE (Task 10e) | Same `ProfilePosts` component — covered by Task 10e |

### Post Permalink / Detail

| Surface | Component File | Rendering Decision | Status | Notes |
|---------|---------------|--------------------|--------|-------|
| Post permalink | `app/posts/[id]/page.tsx` | **full** | ✅ DONE (Task 10f) | `post_appearances` LEFT JOIN added to server query; `resolvePostStyleFlags` called server-side; `data-post-appearance` + `data-template` attributes set on Card when styled. Full CSS variable hydration requires a Client Component boundary (documented; future enhancement). |

### Compact / Preview Surfaces

| Surface | Component File | Rendering Decision | Status | Notes |
|---------|---------------|--------------------|--------|-------|
| Feed post search results | (not identified — likely `app/search/`) | **compact** | 🔄 TBD | To be identified and classified in a future task |
| Notifications post preview | (notification components) | **neutral** | 🔄 TBD | Notification dropdowns show snippets; appearance not rendered |
| Collab invite preview | `components/artist/artist-home-feed.tsx` (inline invite JSX) | **compact** | 🔄 DEFERRED | Currently shows plain text; post appearance not rendered for invite previews |
| Shared / embedded post | (to be identified) | **neutral** | 🔄 TBD | Should link to full styled permalink |

### Operational / Admin Surfaces (intentionally unstyled)

| Surface | Component File | Rendering Decision | Notes |
|---------|---------------|--------------------|-------|
| Admin moderation view | (admin dashboard components) | **unstyled** | Intentionally excluded — moderation queue must render consistent neutral format regardless of author appearance config |
| Analytics post detail | (admin / analytics views) | **unstyled** | Intentionally excluded — analytics surfaces need consistent data display |
| Post management in org admin | (admin organization dashboard) | **unstyled** | Intentionally excluded — content management tables render post rows without appearance |

---

## Feed Query Coverage

| Query Path | File | Appearance JOIN | Notes |
|------------|------|-----------------|-------|
| Main feed query | `lib/feed/feed-posts-query.ts` | ✅ YES (Task 5) | `post_appearances(template_id,template_version,schema_version,snapshot_hash,status)` in `POST_SELECT_COLUMNS` |
| Core with profile | `lib/feed/feed-posts-query.ts` | No | Intentionally excluded — compact/secondary use |
| Core (no profile) | `lib/feed/feed-posts-query.ts` | No | Secondary; appearance optional |
| Legacy columns | `lib/feed/feed-posts-query.ts` | No | Kept for backward compat |
| Minimal | `lib/feed/feed-posts-query.ts` | No | Used for notifications/previews |
| SimpleFeed (ad-hoc) | `components/feed/simple-feed.tsx` | No (deferred) | Direct `supabase.from('posts').select('*')` — requires Task 10 follow-up |
| Permalink | `app/posts/[id]/page.tsx` | ✅ YES (Task 10f) | `post_appearances(template_id,template_version,schema_version,snapshot,snapshot_hash,status)` added |
| ProfilePosts | `components/profile/profile-posts.tsx` | Via API (Task 10e) | Fetches via `/api/feed/posts` which uses `POST_SELECT_COLUMNS`; `appearance` threaded through transform |

---

## Rendering Decision Summary

| Decision | Surfaces | Task |
|----------|----------|------|
| **full (DONE)** | FeedList, ArtistHomeFeed, PostCardModern, ProfilePosts (venue + general), permalink | Tasks 6, 10a–10f |
| **full (DEFERRED)** | SocialFeed, StreamlinedFeed, SimpleFeed, DashboardFeed | Code comments added in Task 10g |
| **compact** | Search results, collab invite previews | Future task |
| **neutral** | Notifications, embedded/shared posts | Future task |
| **unstyled** | Moderation, analytics, admin ops | Documented exclusion — no code change |
