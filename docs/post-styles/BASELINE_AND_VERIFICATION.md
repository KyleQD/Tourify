# Baseline and Verification

**Phase:** Task 0 — Repository Audit & Baseline Docs  
**Date:** 2025-07-14  
**Purpose:** Record pre-change baselines for tests, database state, and infrastructure that must remain stable through all subsequent implementation tasks.

---

## 1. EPK Test Baseline

### Test files found

| File | Location | Test count | Status |
|------|----------|------------|--------|
| `epk-appearance.test.ts` | `__tests__/epk/epk-appearance.test.ts` | 11 | ✅ All pass |
| `epk-template-resolve.test.ts` | `__tests__/epk/epk-template-resolve.test.ts` | 5 | ✅ All pass |

**EPK total: 16 tests, 2 files — all passing at baseline.**

### EPK test run results (pre-change)

```
✓ __tests__/epk/epk-template-resolve.test.ts > resolveEpkPreviewTemplateId > maps core skins 1:1
✓ __tests__/epk/epk-template-resolve.test.ts > resolveEpkPreviewTemplateId > maps the five new skins 1:1
✓ __tests__/epk/epk-template-resolve.test.ts > resolveEpkPreviewTemplateId > maps reference template skins 1:1
✓ __tests__/epk/epk-template-resolve.test.ts > resolveEpkPreviewTemplateId > keeps legacy accent aliases
✓ __tests__/epk/epk-template-resolve.test.ts > resolveEpkPreviewTemplateId > defaults unknown ids to modern
✓ __tests__/epk/epk-appearance.test.ts > normalizeHexColor > accepts valid 6-digit hex
✓ __tests__/epk/epk-appearance.test.ts > normalizeHexColor > rejects invalid values
✓ __tests__/epk/epk-appearance.test.ts > normalizeEpkAppearance > returns defaults for empty input
✓ __tests__/epk/epk-appearance.test.ts > normalizeEpkAppearance > normalizes new customization fields
✓ __tests__/epk/epk-appearance.test.ts > normalizeEpkAppearance > falls back unknown enums to defaults
✓ __tests__/epk/epk-appearance.test.ts > resolveEpkAppearanceForRender > sets CSS vars and content width for custom colors
✓ __tests__/epk/epk-appearance.test.ts > resolveEpkAppearanceForRender > keeps gallery narrow when contentWidth is default
✓ __tests__/epk/epk-appearance.test.ts > resolveEpkAppearanceForRender > includes palette presets for every reference template
✓ __tests__/epk/epk-appearance.test.ts > resolveEpkAppearanceForRender > loads the first palette preset for a selected template
✓ __tests__/epk/epk-appearance.test.ts > normalizeEpkFontId > accepts all registered font ids
✓ __tests__/epk/epk-appearance.test.ts > normalizeEpkFontId > falls back unknown fonts to sans

Test Files: 2 passed (2)
Tests:      16 passed (16)
Duration:   ~190ms
```

**Requirement:** All 16 EPK tests must continue to pass after every task that touches shared code. Any regression is a blocking failure.

---

## 2. Feed Test Baseline

### Feed-related test files found

| File | Location | Status at baseline |
|------|----------|--------------------|
| `feed-posts-route.test.ts` | `__tests__/feed/feed-posts-route.test.ts` | ✅ Pass |
| `feed-client.test.ts` | `__tests__/feed/feed-client.test.ts` | ✅ Pass |
| `music-post-preview.test.ts` | `__tests__/feed/music-post-preview.test.ts` | ⚠️ 2 pre-existing failures (unrelated to post styles) |
| `attending-event-posts.test.ts` | `__tests__/feed/attending-event-posts.test.ts` | ✅ Pass |

**Pre-existing failures in `music-post-preview.test.ts`:** 2 failures exist at the Task 0 baseline. These are NOT caused by post styles work and must not be fixed as part of this feature. They are documented here so they are not misattributed to Task 1–12 changes.

Feed test run summary at baseline:
- 2 files failed, 5 passed (7 total)
- 2 tests failed, 70 passed (72 total)

---

## 3. `posts` Table — Column Inventory (confirmed from live schema)

Confirmed via `information_schema.columns` query on `2025-07-14`:

| Column | Data Type | Nullable | Default |
|--------|-----------|----------|---------|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `user_id` | uuid | NO | — |
| `content` | text | YES | — |
| `images` | ARRAY (text[]) | YES | `'{}'::text[]` |
| `video_url` | text | YES | — |
| `post_type` | text | YES | `'general'` |
| `visibility` | text | YES | `'public'` |
| `engagement_stats` | jsonb | YES | `{"likes":0,"views":0,"shares":0,"comments":0}` |
| `metadata` | jsonb | YES | `'{}'::jsonb` |
| `created_at` | timestamptz | NO | `timezone('utc', now())` |
| `updated_at` | timestamptz | NO | `timezone('utc', now())` |
| `hashtags` | ARRAY (text[]) | YES | — |
| `location` | text | YES | — |
| `type` | text | YES | `'text'` |
| `likes_count` | integer | YES | `0` |
| `comments_count` | integer | YES | `0` |
| `shares_count` | integer | YES | `0` |
| `posted_as_profile_id` | uuid | YES | — |
| `posted_as_account_type` | text | YES | `'primary'` |
| `account_id` | uuid | YES | — |
| `media_urls` | ARRAY (text[]) | YES | `'{}'::text[]` |
| `account_display_name` | text | YES | — |
| `account_username` | text | YES | — |
| `account_avatar_url` | text | YES | — |
| `route_context` | text | YES | — |
| `tagged_users` | ARRAY (uuid[]) | YES | — |
| `is_pinned` | boolean | YES | `false` |
| `views_count` | integer | YES | `0` |
| `posted_as_type` | text | YES | `'general'` |
| `content_ref_type` | text | YES | — |
| `content_ref_id` | uuid | YES | — |
| `moderation_status` | text | NO | `'approved'` |
| `is_visible` | boolean | NO | `true` |

**Total columns in `posts`:** 33

**Note on `poll_ends_at` / `poll_total_votes`:** These columns are referenced in `lib/feed/feed-posts-query.ts:POST_SELECT_COLUMNS` but are NOT present in the live schema at this baseline. They appear to be queried speculatively or added via a migration not yet reflected. This discrepancy should be investigated before Task 4 or Task 5.

---

## 4. `feature_flags` Table — Column Inventory

Confirmed via `information_schema.columns` on `2025-07-14`:

| Column | Data Type | Nullable |
|--------|-----------|----------|
| `id` | uuid | NO |
| `key` | text | NO |
| `name` | text | NO |
| `description` | text | YES |
| `enabled` | boolean | NO |
| `rollout_percentage` | integer | NO |
| `target_org_ids` | ARRAY | YES |
| `created_at` | timestamptz | NO |
| `updated_at` | timestamptz | NO |

**Total columns:** 9  
**Pattern reference:** `lib/music/marketplace/music-marketplace-flags.ts` → `resolveMusicMarketplaceFlags` reads `key`, `enabled`, `rollout_percentage` and uses stable hash bucketing for partial rollouts.

---

## 5. New Tables Status (confirmed absent at baseline)

The following tables do **not exist** in the live database at Task 0 baseline (confirmed via `information_schema.tables`):

| Table | Status |
|-------|--------|
| `post_style_profiles` | ❌ Does not exist — to be created in Task 2 |
| `post_appearances` | ❌ Does not exist — to be created in Task 2 |
| `post_appearance_revisions` | ❌ Does not exist — to be created in Task 2 |

**Confirmation:** SQL query `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('post_style_profiles','post_appearances','post_appearance_revisions')` returned 0 rows.

---

## 6. EPK Appearance Test File Location Notes

- `lib/epk/epk-appearance.test.ts` exists in the lib tree but vitest `include` is configured for `__tests__/**/*.test.ts`
- Tests for epk-appearance are run from `__tests__/epk/epk-appearance.test.ts` (confirmed to run successfully)
- The spec references `public-artist-appearance.test.ts` — **this file does not exist** at Task 0 baseline; it may be a planned test file referenced in the spec. Confirmed: no match for `*appearance*.test.ts` outside `__tests__/epk/epk-appearance.test.ts`

---

## 7. Verification Gates for Future Tasks

Tasks 1–12 must run the following checks before marking complete:

| Check | Command | Requirement |
|-------|---------|-------------|
| EPK tests | `npx vitest run __tests__/epk/` | All 16 must pass |
| Feed tests | `npx vitest run __tests__/feed/` | No new failures beyond 2 pre-existing |
| Post styles tests | `npx vitest run __tests__/post-styles/` | All pass (tests added incrementally per task) |
| Supabase security advisor | `mcp__supabase__get_advisors({ type: "security" })` | No new unmitigated RLS gaps after each migration |
| TypeScript | `npx tsc --noEmit` | Zero new type errors |

---

## 8. Hardening Results Placeholder

_To be completed in Task 11 — Hardening._

| Check | Result | Notes |
|-------|--------|-------|
| CSS injection fuzz | — | `sanitizeForPost` not yet created |
| WCAG AA contrast | — | Template tokens not yet audited |
| Keyboard navigation | — | Composer panel not yet built |
| prefers-reduced-motion | — | Effects not yet implemented |
| Core Web Vitals (LCP/INP/CLS) | — | Styled feed not yet deployed |
| EPK visual regression | — | Snapshot baselines not yet captured |
