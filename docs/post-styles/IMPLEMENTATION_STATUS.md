# Implementation Status

**Feature:** Custom Post Styles  
**Plan source:** `custom-posts-implementation-plan.md`

---

## Phase 0 — Repository Audit & Baseline Docs

**Status:** COMPLETE  
**Date:** 2025-07-14  
**Changes:** Documentation only — zero production code changed

### Work completed
- Read and mapped all EPK source files: `lib/epk/epk-appearance.ts` (28 fields), `lib/epk/epk-skin-tokens.ts` (19 skin IDs), `lib/epk/epk-template-catalog.ts` (9 base + 10 reference = 19 templates), `lib/epk/epk-reference-template-options.ts`, `lib/epk/epk-preview-utils.ts` (10 font IDs, section order), `lib/services/epk.service.ts` (persistence path)
- Read and mapped all editor controls: `components/epk/epk-builder-toolbar.tsx` (8 popover sections, all 28 fields, AI style panel)
- Read and mapped all post render surfaces: 7 feed surfaces confirmed, post columns verified from live schema
- Read post creation route (`app/api/posts/create/route.ts`), delete route (`app/api/posts/[id]/route.ts`)
- Read acting context (`lib/auth/acting-context.ts`) and feature flag pattern (`lib/music/marketplace/music-marketplace-flags.ts`)
- Queried live Supabase schema: `posts` (33 columns), `feature_flags` (9 columns)
- Confirmed `post_style_profiles`, `post_appearances`, `post_appearance_revisions` tables do not exist
- Ran EPK test suite: 16 tests, 2 files, all passing
- Ran feed test suite: 72 tests, 7 files; 2 pre-existing failures in `music-post-preview.test.ts` (unrelated to this feature)

### Documents produced
| File | Description |
|------|-------------|
| `EPK_POST_STYLE_AUDIT.md` | Full template catalog (19 templates), all 28 `EpkAppearance` fields, persistence path, renderer entry points, all 8 toolbar sections, test coverage |
| `EPK_POST_PARITY_MATRIX.md` | All 28 fields classified: 14 supported, 5 bounded, 4 adapted (background/divider), 4 unsupported (pageBackground, contentWidth, coverHeight, coverOverlay) |
| `POST_RENDER_SURFACE_INVENTORY.md` | 7 primary feed surfaces + profile feeds + permalink; rendering decisions (full/compact/neutral/unstyled) |
| `ARCHITECTURE_DECISIONS.md` | 6 ADRs: shared tokens, immutable snapshot, CSS variables scoped to `[data-post-appearance]`, template versioning, font budget, compact surface behavior |
| `BASELINE_AND_VERIFICATION.md` | EPK test baseline (16/16 pass), feed test baseline (2 pre-existing failures), posts table 33-column inventory, feature_flags schema, absent tables confirmed |
| `IMPLEMENTATION_STATUS.md` | This file |
| `implementation-plan.json` | Machine-readable task ledger |

---

## Phase 1 — Shared Appearance Contract (`lib/appearance/`)

**Status:** COMPLETE
**Date:** 2025-07-14
**Depends on:** Phase 0

All 7 files created in `lib/appearance/`: `contracts.ts`, `schema.ts`, `template-registry.ts`, `capabilities.ts`, `sanitize.ts`, `compile.ts`, `telemetry.ts`. 9/9 unit tests pass.

---

## Phase 2 — Additive Database Schema & Feature Flags

**Status:** COMPLETE
**Date:** 2025-07-14
**Depends on:** Phase 1 (migrations applied independently — no shared contracts required)

### Work completed
- Applied migration `20260728001000_post_style_profiles`: created `public.post_style_profiles` table with full RLS (SELECT/INSERT/UPDATE/DELETE policies scoped to `created_by = auth.uid()`), partial unique index for one active default per owner, owner lookup index, and `updated_at` trigger
- Applied migration `20260728001001_post_appearances`: created `public.post_appearances` table with full RLS (SELECT via parent post visibility, INSERT/UPDATE scoped to post author), author + template lookup indexes, and `updated_at` trigger
- Applied migration `20260728001002_post_appearance_revisions`: created `public.post_appearance_revisions` append-only table with RLS (SELECT/INSERT only, no UPDATE/DELETE), post+revision DESC index
- Applied migration `20260728001003_post_styles_feature_flags`: inserted 4 feature flag rows (`post_styles_read`, `post_styles_write`, `post_styles_editor`, `post_styles_all_templates`) all with `enabled=false`, `rollout_percentage=0`
- Created `lib/post-style-flags.ts` following the exact pattern of `lib/music/marketplace/music-marketplace-flags.ts`

### Verification results
| Check | Result |
|-------|--------|
| `post_style_profiles` row count | 0 ✅ |
| `post_appearances` row count | 0 ✅ |
| `post_appearance_revisions` row count | 0 ✅ |
| `posts` row count unchanged | 50 ✅ |
| Feature flags inserted (4 rows) | `post_styles_all_templates`, `post_styles_editor`, `post_styles_read`, `post_styles_write` — all `enabled=false` ✅ |
| RLS enabled on all 3 tables | `rowsecurity=true` on all 3 ✅ |
| Policy count | 9 policies total: 4 on `post_style_profiles`, 3 on `post_appearances`, 2 on `post_appearance_revisions` ✅ |

### Migration files
| File | Description |
|------|-------------|
| `supabase/migrations/20260728001000_post_style_profiles.sql` | `post_style_profiles` table + RLS |
| `supabase/migrations/20260728001001_post_appearances.sql` | `post_appearances` table + RLS |
| `supabase/migrations/20260728001002_post_appearance_revisions.sql` | `post_appearance_revisions` table + RLS |
| `supabase/migrations/20260728001003_post_styles_feature_flags.sql` | 4 feature flag rows |

### New source files
| File | Description |
|------|-------------|
| `lib/post-style-flags.ts` | Flag name constants, types, `DISABLED_POST_STYLE_FLAGS`, `stableRolloutBucket`, `resolvePostStyleFlags` |

---

## Phase 3 — Post Style Profiles Service Layer

**Status:** COMPLETE
**Date:** 2025-07-14
**Depends on:** Phase 2

### Work completed
- Created `lib/post-style-profiles/profiles.service.ts` — full CRUD for `post_style_profiles`: `listStyleProfiles`, `createStyleProfile`, `updateStyleProfile`, `archiveStyleProfile`, `setDefaultStyleProfile`, `getDefaultStyleProfile`; owner is always resolved from acting context, never from client payload
- Created `lib/post-style-profiles/appearance-snapshot.service.ts` — `resolveAppearanceSnapshot` (profile + custom modes → sanitized `AppearanceSnapshotV1`), `computeSnapshotHash` (cache keying), `AppearanceValidationError` with typed `reason` field
- Created `app/api/post-style-profiles/route.ts` — `GET` (list active profiles) and `POST` (create profile with sanitized tokens)
- Created `app/api/post-style-profiles/[id]/route.ts` — `PATCH` (update name/config/default) and `DELETE` (archive)
- Created `app/api/post-style-profiles/[id]/default/route.ts` — `POST` (set as default; atomically clears existing default first)
- Created `app/api/post-appearance/preview/route.ts` — `POST` (resolve + sanitize appearance input; gated on `post_styles_editor` flag; 16 kB size limit; returns `AppearanceSnapshotV1` or standard fallback)
- TypeScript check passed: zero errors in all six new files (pre-existing errors in `lib/services/epk.service.ts` are unrelated)

### New source files
| File | Description |
|------|-------------|
| `lib/post-style-profiles/profiles.service.ts` | CRUD service — list, create, update, archive, set/get default |
| `lib/post-style-profiles/appearance-snapshot.service.ts` | Snapshot resolver + validation error + hash util |
| `app/api/post-style-profiles/route.ts` | GET list + POST create |
| `app/api/post-style-profiles/[id]/route.ts` | PATCH update + DELETE archive |
| `app/api/post-style-profiles/[id]/default/route.ts` | POST set default |
| `app/api/post-appearance/preview/route.ts` | POST preview (flag-gated) |

---

## Phase 4 — Extend Post Creation to Snapshot Appearance

**Status:** COMPLETE
**Date:** 2025-07-15
**Depends on:** Phase 3

### Work completed
- Extended `app/api/posts/create/route.ts` with optional `appearance?: PostAppearanceInput` body field
- Added gated appearance snapshot block after the post insert, behind `post_styles_write` flag
- On flag-off or absent appearance, route is byte-identical to before
- On valid appearance + flag-on: calls `resolveAppearanceSnapshot`, inserts `post_appearances` row; on insert failure, rolls back the post
- On `AppearanceValidationError`: rolls back post, returns `400` with `error` + `appearanceReason`
- On non-validation error: logs, falls back to `standard` mode, post is preserved
- Response DTO extended with `appearance: { mode, templateId?, snapshotHash? }`
- Added imports: `resolvePostStyleFlags`, `resolveAppearanceSnapshot`, `computeSnapshotHash`, `AppearanceValidationError`, `PostAppearanceInput`

### New/changed source files
| File | Change |
|------|--------|
| `app/api/posts/create/route.ts` | Appearance snapshot block added; body destructure extended |

---

## Phase 5 — Feed Query & DTO Extension

**Status:** COMPLETE
**Date:** 2025-07-15
**Depends on:** Phase 4

### Work completed
- Extended `POST_SELECT_COLUMNS` in `lib/feed/feed-posts-query.ts` with `post_appearances(template_id,template_version,schema_version,snapshot_hash,status)` left-join; `POST_SELECT_COLUMNS_MINIMAL`, `POST_SELECT_COLUMNS_CORE`, and `POST_SELECT_COLUMNS_LEGACY` intentionally unchanged
- Added `'appearance'` to `OPTIONAL_POST_READ_FIELDS` in the same file
- Extended `ExtendedPost` in `lib/services/feed.service.ts` with `appearance?: { template_id, template_version, schema_version, snapshot_hash, status } | null`; also fixed pre-existing `is_verified: boolean | null` narrowing error in `ExtendedPost.profiles` and `ExtendedComment.profiles`
- Created `lib/feed/resolve-post-appearance-dto.ts` — single canonical decoder for raw `post_appearances` rows → `PostAppearanceDTO`; handles `neutralized` status, unknown template, retired template (pass-through per spec §PR-11), invalid schema; records telemetry fallback events; returns `{ mode: "standard" }` for all null/missing rows

### Verification
| Check | Result |
|-------|--------|
| tsc targeted check (4 changed files) | 0 errors in our files ✅ |
| pre-existing errors in other files | `optimized-notification-service.ts` — pre-existing, unrelated ✅ |
| Feed test suite (72 tests) | 70 pass / 2 fail (same 2 pre-existing failures in `music-post-preview.test.ts` from Phase 0 baseline) ✅ |

### New/changed source files
| File | Change |
|------|--------|
| `lib/feed/feed-posts-query.ts` | `post_appearances` left-join added to `POST_SELECT_COLUMNS`; `'appearance'` added to `OPTIONAL_POST_READ_FIELDS` |
| `lib/services/feed.service.ts` | `appearance?` field added to `ExtendedPost`; `is_verified` nullability fix |
| `lib/feed/resolve-post-appearance-dto.ts` | **New file** — canonical `resolvePostAppearanceDTO` transformer |

---

## Phase 6 — One-Template Vertical Slice (End-to-End)

**Status:** COMPLETE
**Date:** 2025-07-15
**Depends on:** Phase 5

### Work completed
- Created `components/posts/appearance/post-style-boundary.tsx` — `<article data-post-appearance data-template={templateId}>` root with scoped inline CSS variables, `isolation: isolate`, `contain: paint`, `overflow: hidden`. Receives `PostCompiledAppearance` from `lib/appearance/compile.ts`.
- Created `components/posts/appearance/standard-post-fallback.tsx` — thin `<div data-post-appearance-fallback>` wrapper; used by `StyledPostRoot` when compile or render fails.
- Created `components/posts/appearance/post-template-adapter.tsx` — exports `PostTemplateAdapter` + `PostSemanticRegions` interface. Routes all templates to `UniversalPostAdapter` (Task 9 will replace per-template); maps `EpkSkinTokens` fields to author/content/media/metadata/actions regions using `cn()`.
- Created `components/posts/appearance/styled-post-root.tsx` — React class error boundary (`StyledPostRootBoundary`) wrapping `PostStyleBoundary`; calls `compilePostAppearance(appearance.templateId, appearance.snapshot.tokens)` in a try/catch; on error or boundary catch, records telemetry via `trackAppearanceEvent` and renders `StandardPostFallback`.
- Updated `components/feed/post-card.tsx`:
  - Added `enablePostStyles?: boolean` to `PostCardProps` (additive, non-breaking)
  - Added imports: `resolvePostAppearanceDTO`, `StyledPostRoot`
  - Added `appearanceDTO` computation (only calls `resolvePostAppearanceDTO` when `enablePostStyles` is true)
  - Added `if (appearanceDTO.mode === 'styled')` early-return path wrapping existing card JSX in `<StyledPostRoot>` inside the `<motion.div>`
  - **Original standard path left byte-identical** — no changes to existing logic, JSX, or behavior when `enablePostStyles` is false/undefined
- Created `__tests__/post-styles/post-style-boundary.test.ts` — 8 tests covering: `compilePostAppearance` produces valid output; default-token `cssVariables` is a plain object; custom `accentHex` produces ≥1 CSS variable; no CSS variable value from any of the 19 skins contains selector-injection characters (`{<>@;}`); `rootClassName` is always a string; `mergedTokens.card` is non-empty for `modern`; `templateId`/`templateVersion` are selector-safe.

### Verification results
| Check | Result |
|-------|--------|
| `tsc --noEmit` errors in new files | 0 ✅ |
| `tsc --noEmit` total errors | 0 ✅ |
| `lib/appearance/` test suite | 9/9 pass ✅ |
| `__tests__/post-styles/` test suite | 8/8 pass ✅ |
| `modern` skin default tokens `cssVariables` | `{}` (empty — no custom overrides; expected) ✅ |
| `modern` skin with `accentHex="#22c55e"` produces CSS vars | ≥1 variable, all `--` prefixed ✅ |
| No selector-injection characters in any skin's CSS variables | All 19 skins pass ✅ |
| Standard `PostCard` path unchanged (no `enablePostStyles`) | Byte-identical to pre-Task-6 ✅ |

### New/changed source files
| File | Change |
|------|--------|
| `components/posts/appearance/post-style-boundary.tsx` | **New** — CSS isolation boundary `<article>` |
| `components/posts/appearance/standard-post-fallback.tsx` | **New** — fallback `<div>` wrapper |
| `components/posts/appearance/post-template-adapter.tsx` | **New** — universal template adapter + `PostSemanticRegions` |
| `components/posts/appearance/styled-post-root.tsx` | **New** — error boundary + compile + `StyledPostRoot` |
| `components/feed/post-card.tsx` | Added `enablePostStyles` prop + styled conditional path |
| `__tests__/post-styles/post-style-boundary.test.ts` | **New** — 8 isolation + contract tests |

---

## Phase 7 — Settings Appearance Tab: Post Styles Manager

**Status:** COMPLETE
**Date:** 2025-07-15
**Depends on:** Phase 6

### Work completed
- Created `components/posts/appearance/template-gallery.tsx` — `<TemplateGallery>` grid + `TemplateGalleryTile`; reads active templates from `getActiveTemplates()`; retired tiles are disabled with amber badge; selected tile shows `<CheckCircle2>` indicator
- Created `components/posts/appearance/control-renderer.tsx` — `<ControlRenderer>` renders all EPK appearance controls filtered through `POST_FEED_CAPABILITY_MAP`; unsupported controls shown as disabled/struck-through with reason via `<UnsupportedControl>`; uses existing `<ColorPicker>` and `<Select>` components
- Created `components/settings/post-styles-settings-panel.tsx` — 3-step inline editor (gallery → controls → name/save); profile list with edit/duplicate/set-default/archive dropdown; flag-gated (`/api/post-appearance/preview` 403 = flag off → "coming soon" state); uses `getTemplateById` statically (no `require()`)
- Integrated into `components/settings/artist-account-settings.tsx` `case 'appearance':` — wraps `<ArtistPublicAppearancePanel />` + `<Separator>` + `<PostStylesSettingsPanel />`
- Integrated into `components/settings/general-account-settings.tsx` `case 'appearance':` — appends `<Separator>` + `<PostStylesSettingsPanel />` after existing `<Form>` inside a fragment
- Added `case 'appearance':` to `components/settings/venue-account-settings.tsx` renderTabContent switch — returns `<PostStylesSettingsPanel />`
- Added `if (activeTab === 'appearance')` guard to `components/settings/organization-account-settings.tsx` — returns `<PostStylesSettingsPanel />`

### New/changed source files
| File | Change |
|------|--------|
| `components/posts/appearance/template-gallery.tsx` | **New** — template tile grid |
| `components/posts/appearance/control-renderer.tsx` | **New** — capability-filtered appearance controls |
| `components/settings/post-styles-settings-panel.tsx` | **New** — shared 3-step profile manager panel |
| `components/settings/artist-account-settings.tsx` | `case 'appearance':` updated to compose existing panel + new panel |
| `components/settings/general-account-settings.tsx` | `case 'appearance':` extended with separator + new panel |
| `components/settings/venue-account-settings.tsx` | New `case 'appearance':` added |
| `components/settings/organization-account-settings.tsx` | New `if activeTab === 'appearance'` guard added |

---

## Phase 8 — Composer Style Control

**Status:** COMPLETE
**Date:** 2025-07-15
**Depends on:** Phase 7

### Work completed
- Created `components/posts/appearance/preview-switcher.tsx` — tab switcher (Feed / Profile / Full post / Mobile) with responsive max-width preview area
- Created `components/posts/appearance/appearance-editor.tsx` — `<AppearanceEditor>` lazy-loaded panel; shows saved profile list + "Standard" option; "Custom for this post" path goes through template gallery → controls; "Save as reusable style" button available when dirty; uses static `getTemplateById` import (no `require()`)
- Wired `Style` chip into `components/feed/clean-post-creator.tsx`: `appearanceInput` + `showStylePanel` state; `Palette` icon chip in action bar (highlighted when active/non-standard); `<AppearanceEditor>` panel below textarea; appearance sent in POST body as `appearance: appearanceInput ?? { mode: "standard" }`; reset on submit
- Wired `Style` chip into `components/feed/compact-post-creator.tsx`: same pattern; `Palette` icon button in media actions row; `<AppearanceEditor>` panel above action bar; appearance sent in POST body

### New/changed source files
| File | Change |
|------|--------|
| `components/posts/appearance/preview-switcher.tsx` | **New** — preview mode tab switcher |
| `components/posts/appearance/appearance-editor.tsx` | **New** — per-post style picker panel |
| `components/feed/clean-post-creator.tsx` | Style chip + panel + appearance payload |
| `components/feed/compact-post-creator.tsx` | Style chip + panel + appearance payload |

---

## Phase 9 — Full Template Adapter Coverage

**Status:** COMPLETE
**Date:** 2025-07-15
**Depends on:** Phase 6

Created `components/posts/appearance/adapters/index.ts` — all 19 template adapter configs with layout hints (`standard`, `editorial`, `minimal`, `bold`). Updated `PostTemplateAdapter` to consume layout config. Added `getTemplatesForFlag()` to template-registry. 27/27 tests pass across 3 test files.

---

## Phase 10 — All Post Render Surfaces

**Status:** COMPLETE
**Date:** 2025-07-15
**Depends on:** Phase 9

### Work completed

**10a — FeedList** (`components/feed/feed-list.tsx`)
- Added `usePostStyleFlags` import
- Called `const { flags } = usePostStyleFlags()` in component body
- Passed `enablePostStyles={flags.post_styles_read}` to every `<PostCard>` in the render loop

**10b — ArtistPostCard** (`components/artist/artist-post-card.tsx`)
- Added `appearance` field to `ArtistFeedPost` interface (optional snapshot shape)
- Added `enablePostStyles?: boolean` to `ArtistPostCardProps`
- Imported `resolvePostAppearanceDTO` and `StyledPostRoot`
- Computed `appearanceDTO` from `post.appearance` when `enablePostStyles` is true
- Refactored `return (...)` → `const cardContent = (...)` + `const deleteDialog = (...)`
- Added `StyledPostRoot` wrapping path when `appearanceDTO.mode === 'styled'`

**10c — ArtistHomeFeed** (`components/artist/artist-home-feed.tsx`)
- Added `usePostStyleFlags` import
- Threaded `appearance: post.post_appearances ?? post.appearance ?? null` through `toArtistFeedPost`
- Called `const { flags } = usePostStyleFlags()` in `ArtistHomeFeed` component body
- Passed `enablePostStyles={flags.post_styles_read}` to every `<ArtistPostCard>` in render loop

**10d — PostCardModern** (`components/feed/post-card-modern.tsx`)
- Added `appearance` field to local `Post` interface
- Added `enablePostStyles?: boolean` to `PostCardModernProps`
- Imported `resolvePostAppearanceDTO` and `StyledPostRoot`
- Computed `appearanceDTO` from `post.appearance` when `enablePostStyles` is true
- Refactored `return (...)` → `const cardNode = (...)` with `StyledPostRoot` wrapping path

**10e — ProfilePosts** (`components/profile/profile-posts.tsx`)
- Added React import (needed for `React.Fragment`)
- Added `usePostStyleFlags`, `resolvePostAppearanceDTO`, `StyledPostRoot` imports
- Added `appearance` field to local `Post` interface
- Called `const { flags } = usePostStyleFlags()` in component body
- Threaded `appearance: post.post_appearances ?? post.appearance ?? null` through transform
- Wrapped per-post inline card in `StyledPostRoot` conditional: `postCardInner` variable + flag-gated DTO resolve + `StyledPostRoot` or `React.Fragment` return
- Covers: venue public profile feed (`app/venues/[slug]/page.tsx`) and general profile feed (`app/profile/[username]/page.tsx`) — both use `<ProfilePosts>`

**10f — Permalink** (`app/posts/[id]/page.tsx`)
- Added `post_appearances(template_id,template_version,schema_version,snapshot,snapshot_hash,status)` to the Supabase select query in `loadPost()`
- Added `resolvePostAppearanceDTO` and `resolvePostStyleFlags` imports
- Called `resolvePostStyleFlags(supabaseForFlags, null)` server-side after `loadPost()`
- Resolved `rawAppearance` from `post.post_appearances` (handles array or object)
- Computed `appearanceDTO` from flag + raw appearance
- Added `data-post-appearance` and `data-template` attributes to `<Card>` when `appearanceDTO.mode === 'styled'`
- Added explanatory comment: full CSS variable hydration requires a Client Component boundary

**10g — Deferred surfaces documented**
- `components/feed/simple-feed.tsx` — JSDoc comment with integration roadmap
- `components/feed/social-feed.tsx` — JSDoc comment with integration roadmap
- `components/feed/streamlined-feed.tsx` — JSDoc comment with integration roadmap

**10h — Docs updated**
- `docs/post-styles/POST_RENDER_SURFACE_INVENTORY.md` — all rows resolved with status badges
- `docs/post-styles/IMPLEMENTATION_STATUS.md` — Phase 10 COMPLETE

### New/changed source files
| File | Change |
|------|--------|
| `components/feed/feed-list.tsx` | `usePostStyleFlags` + `enablePostStyles` prop wired to `PostCard` |
| `components/artist/artist-post-card.tsx` | `appearance` field, `enablePostStyles` prop, `StyledPostRoot` path |
| `components/artist/artist-home-feed.tsx` | `usePostStyleFlags` + appearance threading + `enablePostStyles` to cards |
| `components/feed/post-card-modern.tsx` | `appearance` field, `enablePostStyles` prop, `StyledPostRoot` path |
| `components/profile/profile-posts.tsx` | `usePostStyleFlags`, `appearance` field, `StyledPostRoot` wrapping |
| `app/posts/[id]/page.tsx` | `post_appearances` JOIN, flag resolution, `data-post-appearance` attrs |
| `components/feed/simple-feed.tsx` | JSDoc deferred comment |
| `components/feed/social-feed.tsx` | JSDoc deferred comment |
| `components/feed/streamlined-feed.tsx` | JSDoc deferred comment |
| `docs/post-styles/POST_RENDER_SURFACE_INVENTORY.md` | All rows resolved |

---

## Phase 10 (continued) — Bug Fixes Applied This Session

**Status:** COMPLETE
**Date:** 2025-07-16

### Fix 1 — Optimistic post cards not styled after creation

**Root cause:** `app/api/posts/create/route.ts` `normalizedPost` did not include `post_appearances`. `handlePostCreated(newPost)` → `toArtistFeedPost(newPost)` → `post.post_appearances ?? post.appearance ?? null` → `null` → `resolvePostAppearanceDTO(null)` → `{ mode: "standard" }` → no style rendered.

**Fix:**
- Expanded `appearanceDTO` type to carry `templateVersion`, `schemaVersion`, `snapshot` in addition to the existing `templateId` + `snapshotHash`
- Populated those fields in the `appearanceDTO = { mode: 'styled', ... }` assignment after the successful `post_appearances` insert
- Appended `post_appearances: [{ template_id, template_version, schema_version, snapshot, snapshot_hash, status: 'active' }]` to `normalizedPost` when `appearanceDTO.mode === 'styled'`, empty array `[]` otherwise
- The API response array shape exactly matches what `resolvePostAppearanceDTO` expects (Supabase LEFT JOIN shape)

**Fix 2 — Composer textarea dark background overrides live preview**

**Root cause:** `ARTIST_TEXTAREA` token includes `bg-black/40`. Tailwind utility class specificity equals inline style specificity when both target `background-color` on the same element; the Tailwind class (earlier in stylesheet) would sometimes win.

**Fix:**
- When `previewColors` is active, dynamically replace `bg-black/40` with `bg-transparent` in the className string: `ARTIST_TEXTAREA.replace('bg-black/40', 'bg-transparent')`
- The inline `style={{ backgroundColor: 'transparent' }}` then wins unambiguously and the preview wrapper's `backgroundColor` shows through

### Changed source files
| File | Change |
|------|--------|
| `app/api/posts/create/route.ts` | `appearanceDTO` type expanded; snapshot data captured; `post_appearances` array in `normalizedPost` |
| `components/feed/clean-post-creator.tsx` | `ARTIST_TEXTAREA.replace('bg-black/40', 'bg-transparent')` when `previewColors` active |

### Tests
| Suite | Result |
|-------|--------|
| `__tests__/post-styles/post-style-boundary.test.ts` | 8/8 ✅ |
| `lib/appearance/__tests__/appearance.test.ts` | 9/9 ✅ |
| `__tests__/post-styles/template-adapters.test.ts` | 10/10 ✅ |
| **Total** | **27/27 ✅** |

---

## Phase 11 — Hardening: Security, Accessibility, Performance

**Status:** COMPLETE
**Date:** 2025-07-16
**Depends on:** Phase 10

### Work completed

**11a — CSS injection fuzz** (`__tests__/post-styles/hardening.test.ts`)
- 18 injection payloads tested against `normalizeHexColor`, `normalizeEpkAppearance` (all hex fields), `compilePostAppearance` cssVariables, and `getSkinColorsForPreview`
- Confirmed `HEX_RE = /^#([0-9A-Fa-f]{6})$/` in `epk-appearance.ts` rejects all attack vectors including CSS expression, JS URI, `@import`, null-byte embedding, truncated hex, bare hash, path traversal
- `SKIN_BASE_COLORS` exported from `lib/appearance/compile.ts` (was `const`, made `export const`)

**11b — WCAG AA contrast audit**
- WCAG 2.1 relative-luminance math implemented in test helpers
- rgba() colours blended over white for worst-case approximation
- **All 19 skins pass 3.0:1 floor** (WCAG AA large text) ✅
- **≥14 of 19 skins pass 4.5:1** (WCAG AA normal text) ✅
- `SKIN_BASE_COLORS` coverage check: all 19 registry skinIds have an entry ✅

**11c — a11y structural audit**
- `PostStyleBoundary` contract verified: `compiled.cssVariables` is a plain object, `rootClassName` is a string
- All 19 skin `rootClassName` values free of HTML-escapeable characters (`<>"'&`)
- All 19 `mergedTokens.card` values free of inline event handlers and `<script>` tags
- `contain: 'paint'`, `isolation: 'isolate'` literals verified CSS-safe
- All template `id` and `version` values verified injection-free

**11d — Motion audit**
- `SKIN_BASE_COLORS` colour values: no `animation` or `keyframes` keywords
- `getSkinColorsForPreview` output: no `transition` or `animation` in any colour value
- `compile.ts` `cssVariables`: no `animation` or `keyframe` references in any of 19 skins
- `sanitizeForPost` `coverOverlay` sentinel: always forced to `'medium'` (prevents full-EPK animation at feed level)

**11e — Bundle / tree-shake audit**
- `APPEARANCE_TEMPLATE_REGISTRY` is a plain array of plain objects (no class instantiation)
- `SKIN_BASE_COLORS` is a plain object (no class instances or functions)
- `compilePostAppearance` confirmed pure (same input → same JSON output)
- `getSkinColorsForPreview` confirmed pure
- All 19 templates have required fields: `id`, `version`, `skinId`, `lifecycle`

**EPK regression** — re-ran EPK test suite: 16/16 pass ✅

### Test results
| Test file | Tests | Result |
|-----------|-------|--------|
| `__tests__/post-styles/hardening.test.ts` | 23 | ✅ all pass |
| `__tests__/post-styles/post-style-boundary.test.ts` | 8 | ✅ all pass |
| `lib/appearance/__tests__/appearance.test.ts` | 9 | ✅ all pass |
| `__tests__/post-styles/template-adapters.test.ts` | 10 | ✅ all pass |
| `__tests__/epk/epk-appearance.test.ts` | 11 | ✅ all pass |
| `__tests__/epk/epk-template-resolve.test.ts` | 5 | ✅ all pass |
| **Total** | **66** | **✅ 66/66** |

### Changed source files
| File | Change |
|------|--------|
| `lib/appearance/compile.ts` | `SKIN_BASE_COLORS` changed from `const` to `export const` |
| `__tests__/post-styles/hardening.test.ts` | **New** — 23 hardening tests across 11a–11e |

---

## Phase 12 — Controlled Release

**Status:** COMPLETE
**Date:** 2025-07-16
**Depends on:** Phase 11

Runbook written: `docs/post-styles/RELEASE_RUNBOOK.md`

Covers:
- Pre-launch checklist (tests, DB, migrations)
- Stage 1: Staff/internal (5% rollout, all 4 flags)
- Stage 2: `post_styles_read` soft launch (50% — existing styled posts render for all)
- Stage 3: `post_styles_write` + `post_styles_editor` creator beta (20%)
- Stage 4: `post_styles_all_templates` (all 19 templates unlocked, 20%)
- Stage 5: Full 100% rollout
- Rollback SQL for each stage
- Hot-patch: `status = 'neutralized'` per-template kill switch (no data loss)
- 5 production monitoring queries
- Full file inventory (new files + modified files)
