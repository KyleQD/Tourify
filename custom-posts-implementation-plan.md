# Custom Post Styles — Implementation Plan

**Source of truth:** `docs/custom-posts/tourify-post-styles-handoff/`  
**Non-destructive:** No existing table is dropped, altered, or backfilled. No existing post renderer or EPK output changes until feature flags are on.  
**No database reset.** All schema work is additive-migration only.

---

## Overview

Every authorized Tourify author can give their posts a recognizable visual identity by selecting an existing EPK template and approved editing controls in the post composer. The chosen appearance is stored as an immutable snapshot on the post and renders consistently across the home feed, profile feed, permalink, and other audited surfaces—inside a strict CSS isolation boundary—without restyling anything outside that post's root element.

The work reuses the existing EPK appearance domain (`lib/epk/epk-appearance.ts`, `lib/epk/epk-skin-tokens.ts`, `lib/epk/epk-template-catalog.ts`, `normalizeEpkAppearance`, `resolveEpkAppearanceForRender`) rather than duplicating it. Post-specific concerns (card-safe tokens, adapter components, database tables) are layered on top additively.

---

## Architecture at a glance

```
lib/appearance/              ← new shared domain (wraps EPK internals; no EPK change)
  contracts.ts
  schema.ts
  template-registry.ts
  capabilities.ts
  sanitize.ts
  compile.ts
  telemetry.ts

components/posts/appearance/  ← new post surface adapter
  styled-post-root.tsx
  post-template-adapter.tsx
  post-style-boundary.tsx
  standard-post-fallback.tsx

components/settings/
  post-styles-settings-panel.tsx   ← NEW: shared panel, used by all profile types
                                      Embedded inside the existing "Appearance" tab
                                      of each account-type settings component

lib/post-style-profiles/      ← new service layer
  profiles.service.ts
  appearance-snapshot.service.ts

supabase/migrations/          ← additive only
  *_post_style_profiles.sql
  *_post_appearances.sql
  *_post_appearance_revisions.sql
  *_post_styles_feature_flags.sql
```

The existing `PostCard` component (`components/feed/post-card.tsx`) is extended—not replaced—with a conditional appearance boundary when a post carries a `post_appearances` row. The `app/api/posts/create/route.ts` is extended—not rewritten—to accept an optional `appearance` field in the request body.

### Settings integration points (existing, confirmed by audit)

| Profile type | Settings component | Appearance tab today | What changes |
|---|---|---|---|
| Artist | `ArtistAccountSettings` | `ArtistPublicAppearancePanel` (EPK template + color) | Add `PostStylesSettingsPanel` below the existing EPK panel |
| General | `GeneralAccountSettings` | Dashboard theme + light/dark mode only | Add `PostStylesSettingsPanel` at bottom of `case 'appearance'` |
| Venue | `VenueAccountSettings` | No `appearance` case yet | Add `appearance` case with `PostStylesSettingsPanel` |
| Organization | `OrganizationAccountSettings` | No `appearance` case yet | Add `appearance` case with `PostStylesSettingsPanel` |

The `account-scoped-settings.tsx` router already renders the `appearance` tab for `artist` accounts and for the `baseTabs` set (which covers general, venue, org). No changes are needed to tab registration — only to the `renderTabContent` switch inside each account-type component.

---

## Sub-Tasks

---

### Task 0 — Repository Audit & Baseline Docs

**Status:** `[ ] pending`

**Intent**  
Produce the audit artifacts required by the spec before any shared code is touched. This phase has zero production code changes—only documentation written to `docs/post-styles/`.

**Expected Outcomes**
- `docs/post-styles/EPK_POST_STYLE_AUDIT.md` exists and maps every EPK template ID, alias, skin token, editor control field in `EpkAppearance`, renderer entry point (`epk-preview.tsx`, `EPKDocument.tsx`), persistence path (`artist_epk_settings.settings.epkAppearance`), and test coverage.
- `docs/post-styles/EPK_POST_PARITY_MATRIX.md` classifies every `EpkAppearance` field and every EPK UI control as `supported`, `bounded`, `adapted`, or `unsupported` for the post-feed surface.
- `docs/post-styles/POST_RENDER_SURFACE_INVENTORY.md` catalogues every surface where a post currently renders (`PostCard`, `post-card-modern`, `streamlined-feed`, `simple-feed`, `social-feed`, `artist-home-feed`, `dashboard-feed`, profile routes, permalink) with a rendering decision (full / compact / neutral / intentionally unstyled).
- `docs/post-styles/ARCHITECTURE_DECISIONS.md` records the six ADR items from the spec.
- `docs/post-styles/BASELINE_AND_VERIFICATION.md` records existing `epk-appearance.test.ts`, `public-artist-appearance.test.ts`, and feed test suite results as pre-change baselines.
- `docs/post-styles/IMPLEMENTATION_STATUS.md` created with Phase 0 complete status.
- `docs/post-styles/implementation-plan.json` — machine-readable ledger seeded from `tourify-post-styles-plan.json` and updated with actual repo paths.

**Todo List**
1. Read and map `lib/epk/epk-appearance.ts` (`EpkAppearance` interface — 28 fields), `lib/epk/epk-skin-tokens.ts` (all `EpkSkinId` values: `modern`, `classic`, `minimal`, `bold`, `cinema`, `gallery`, `luxe`, `poster`, `coastal`, `scrapbook`, `bandcard`, `dossier`, `pressgrid`, `redcolumn`, `checkerboard`, `editorial`, `whitespace`, `colorblock`, `sunburst`), and `lib/epk/epk-template-catalog.ts` (BASE_TEMPLATES + EPK_REFERENCE_TEMPLATE_OPTIONS).
2. Audit `lib/services/epk.service.ts` — how `epkAppearance` is serialized into `artist_epk_settings.settings`, how it is loaded back, and where `normalizeEpkAppearance`/`resolveEpkAppearanceForRender` are called.
3. Read `components/epk/epk-builder-view.tsx`, `epk-builder-toolbar.tsx`, `epk-template-selector.tsx`, `epk-template-variants.tsx`, `epk-appearance-ai-panel.tsx` to enumerate every editor control the author currently sees.
4. Map post renderer surfaces: `components/feed/post-card.tsx` (primary), `components/feed/post-card-modern.tsx`, `components/feed/streamlined-feed.tsx`, `components/feed/simple-feed.tsx`, `components/feed/social-feed.tsx`, `components/artist/artist-home-feed.tsx`, `components/dashboard/dashboard-feed.tsx`, profile-page post lists, and any permalink or detail route.
5. Map `app/api/posts/create/route.ts` (resolves acting context via `resolveActingContext`, constructs `postData`, inserts into `posts`) and `app/api/posts/[id]/route.ts`.
6. Identify `lib/auth/acting-context.ts` → `resolveActingContext` as the acting-account authority. Note how `accountType` and `profileId` land on `posts.posted_as_type` / `posts.posted_as_profile_id`.
7. Note the existing `feature_flags` table schema (`key`, `enabled`, `rollout_percentage`, `target_org_ids`) and the `resolveMusicMarketplaceFlags` pattern as the model for new post-style flags.
8. Run existing EPK tests (`npx vitest run lib/epk/` and `npx jest __tests__/epk/`) and record pass counts in BASELINE_AND_VERIFICATION.md.
9. Write all six `docs/post-styles/` documents.

**Relevant Context**
- EPK skin IDs: [`lib/epk/epk-skin-tokens.ts`](lib/epk/epk-skin-tokens.ts)
- EPK template catalog: [`lib/epk/epk-template-catalog.ts`](lib/epk/epk-template-catalog.ts)
- Appearance normalization: [`lib/epk/epk-appearance.ts`](lib/epk/epk-appearance.ts)
- EPK service + persistence: [`lib/services/epk.service.ts`](lib/services/epk.service.ts)
- Post card (primary renderer): [`components/feed/post-card.tsx`](components/feed/post-card.tsx)
- Post creation: [`app/api/posts/create/route.ts`](app/api/posts/create/route.ts)
- Acting context: [`lib/auth/acting-context.ts`](lib/auth/acting-context.ts)
- Feature-flag pattern: [`lib/music/marketplace/music-marketplace-flags.ts`](lib/music/marketplace/music-marketplace-flags.ts)

---

### Task 1 — Shared Appearance Contract (`lib/appearance/`)

**Status:** `[ ] pending`

**Intent**  
Extract a typed, versioned shared appearance domain that wraps the existing EPK internals without changing EPK output. The EPK editor and renderer must produce byte-identical output before and after this change. Post-specific modules consume the new shared layer.

**Expected Outcomes**
- `lib/appearance/contracts.ts` — exports `AppearanceSurface`, `ControlCapability`, `AppearanceTemplateDefinition`, `AppearanceSnapshotV1`, `PostAppearanceDTO` types from the spec.
- `lib/appearance/template-registry.ts` — re-exports `EPK_TEMPLATE_CATALOG` entries mapped to `AppearanceTemplateDefinition` shape with `lifecycle: "active"`, surface capabilities, and `postFeed`/`postDetail` adapter stubs. Does NOT change `EPK_TEMPLATE_CATALOG` itself.
- `lib/appearance/capabilities.ts` — exports `POST_FEED_CAPABILITY_MAP` derived from the parity matrix (Task 0): maps each `EpkAppearance` field key to `ControlCapability`.
- `lib/appearance/sanitize.ts` — re-exports `normalizeEpkAppearance` with a `sanitizeForPost` wrapper that additionally rejects `pageBackgroundHex`, `contentWidth`, and any `coverHeight`/`coverOverlay` values unsafe for feed cards.
- `lib/appearance/compile.ts` — adapts `resolveEpkAppearanceForRender` to emit `{ cssVariables, rootClassName }` scoped to `[data-post-appearance]` instead of the EPK page wrapper.
- `lib/appearance/telemetry.ts` — thin event emitter for appearance analytics events (spec §14) using structured logs; does not depend on any UI or DB layer.
- Existing EPK imports are unchanged. All new modules import FROM `lib/epk/` — they do not replace it.
- Unit tests in `lib/appearance/__tests__/` covering registry uniqueness, alias resolution, sanitize rejection of unsafe tokens, compile output scope.

**Todo List**
1. Create `lib/appearance/` directory and each module file listed above.
2. In `template-registry.ts`, iterate `EPK_TEMPLATE_CATALOG` and add `capabilities` per the parity matrix; add `lifecycle: "active"` for all current templates and `"retired"` for any discovered legacy aliases.
3. In `sanitize.ts`, import `normalizeEpkAppearance`; add a `POST_UNSAFE_FIELDS` set containing `pageBackgroundHex`, `contentWidth`, `coverHeight`, `coverOverlay` (EPK page-layout-only) and null them out when producing a post snapshot.
4. In `compile.ts`, import `resolveEpkAppearanceForRender`; map its output to `{ cssVariables: CSSProperties, rootClassName: string }` where all Tailwind class tokens that reference a page-level container are replaced by post-card equivalents.
5. Write unit tests; run existing EPK test suite to confirm zero regressions.
6. Update `IMPLEMENTATION_STATUS.md` with Phase 1 complete.

**Relevant Context**
- `resolveEpkAppearanceForRender`: [`lib/epk/epk-appearance.ts:596`](lib/epk/epk-appearance.ts)
- `normalizeEpkAppearance`: [`lib/epk/epk-appearance.ts:120`](lib/epk/epk-appearance.ts)
- Spec architecture: [`docs/custom-posts/tourify-post-styles-handoff/03-technical-architecture.md`](docs/custom-posts/tourify-post-styles-handoff/03-technical-architecture.md)
- Spec contracts: `AppearanceSnapshotV1`, `PostAppearanceDTO`, `ControlCapability` in §3, §5, §8

---

### Task 2 — Additive Database Schema & Feature Flags

**Status:** `[ ] pending`

**Intent**  
Add the three new tables and four feature flags to the live database without touching existing tables. Deploy with composer writes disabled (flags off) so the read path can be tested safely before any author interaction.

**Expected Outcomes**
- Migration `*_post_style_profiles.sql` creates `post_style_profiles` table with all columns from spec §2, a unique partial index on `(owner_type, owner_id) WHERE is_default = true AND status = 'active'`, a JSON byte-size check constraint, and RLS policies (owner CRUD, public read only if owner profile is public).
- Migration `*_post_appearances.sql` creates `post_appearances` table with `post_id` as PK/FK (cascade delete with posts), `snapshot` jsonb, `snapshot_hash` text, `status` enum (`active`, `neutralized`, `fallback`), and RLS: readable wherever parent post is readable.
- Migration `*_post_appearance_revisions.sql` creates `post_appearance_revisions` with monotonic `revision` per post, `changed_by`, `change_reason`, append-only.
- Migration `*_post_styles_feature_flags.sql` inserts four rows into `feature_flags`: `post_styles_read`, `post_styles_write`, `post_styles_editor`, `post_styles_all_templates` — all `enabled: false`, `rollout_percentage: 0`.
- `lib/post-style-flags.ts` created following the `music-marketplace-flags.ts` pattern, exporting `POST_STYLE_FLAG_NAMES`, `resolvePostStyleFlags(supabase, subjectId)`.
- Cross-user RLS tests added to `__tests__/post-styles/rls.test.ts` verifying that user B cannot read user A's draft profile, cannot insert an appearance for user A's post, and cannot set user A's default.
- Zero changes to the `posts` table. Legacy post creation and reading are confirmed unchanged with flag off.

**Todo List**
1. Write `supabase/migrations/<timestamp>_post_style_profiles.sql` — table DDL, partial unique index, byte-size check, indexes, RLS.
2. Write `supabase/migrations/<timestamp>_post_appearances.sql` — table DDL, FK to `posts`, indexes, RLS that joins `posts` visibility.
3. Write `supabase/migrations/<timestamp>_post_appearance_revisions.sql` — append-only table, no RLS update/delete.
4. Write `supabase/migrations/<timestamp>_post_styles_feature_flags.sql` — insert four flags, all disabled.
5. Apply all four migrations via `mcp__supabase__apply_migration`.
6. Create `lib/post-style-flags.ts` with `resolvePostStyleFlags`.
7. Write and run `__tests__/post-styles/rls.test.ts` for cross-user negative cases.
8. Verify existing post count and content unchanged by comparing before/after row counts.
9. Run `mcp__supabase__get_advisors` (security type) to check for RLS gaps.
10. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- Spec schema: [`docs/custom-posts/tourify-post-styles-handoff/04-data-api-security.md`](docs/custom-posts/tourify-post-styles-handoff/04-data-api-security.md) §2–§5
- Feature flag pattern: [`lib/music/marketplace/music-marketplace-flags.ts`](lib/music/marketplace/music-marketplace-flags.ts)
- Existing `feature_flags` columns: `key`, `enabled`, `rollout_percentage`, `target_org_ids`
- Acting context owner: [`lib/auth/acting-context.ts`](lib/auth/acting-context.ts)

---

### Task 3 — Post Style Profiles Service Layer

**Status:** `[ ] pending`

**Intent**  
Implement server-side CRUD for `post_style_profiles` using the acting-account context for ownership, with transactional one-default enforcement. No UI yet.

**Expected Outcomes**
- `lib/post-style-profiles/profiles.service.ts` — exports `listStyleProfiles`, `createStyleProfile`, `updateStyleProfile`, `archiveStyleProfile`, `setDefaultStyleProfile` (transactional: clears existing default, sets new one atomically).
- `lib/post-style-profiles/appearance-snapshot.service.ts` — exports `resolveAppearanceSnapshot(input: PostAppearanceInput, actingCtx)` that authorizes the acting account, resolves a profile by owner, merges overrides, calls `sanitizeForPost`, validates tokens, and returns an `AppearanceSnapshotV1`. Throws structured errors for unknown templates, unauthorized profile access, invalid tokens.
- API routes (Server Actions preferred, else Route Handlers): `GET/POST /api/post-style-profiles`, `PATCH/DELETE /api/post-style-profiles/[id]`, `POST /api/post-style-profiles/[id]/default`.
- `POST /api/post-appearance/preview` — accepts draft configuration, runs `resolveAppearanceSnapshot`, returns sanitized DTO. Rate-limited.
- Unit/integration tests in `__tests__/post-styles/profiles.service.test.ts` covering: create, default swap transaction, archive, cross-user rejection, unknown template rejection, token constraint failure.

**Todo List**
1. Create `lib/post-style-profiles/` directory.
2. Implement `profiles.service.ts` with all CRUD + one-default transaction using `supabase.rpc` or a sequential update-then-insert inside a Supabase transaction function.
3. Implement `appearance-snapshot.service.ts` using `lib/appearance/sanitize.ts` and `lib/appearance/compile.ts`.
4. Create route handlers following the existing `app/api/posts/create/route.ts` pattern (using `resolveActingContext`).
5. Create preview endpoint with input size check (reject > 16 kB JSON body).
6. Write unit/integration tests.
7. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- Acting context: [`lib/auth/acting-context.ts`](lib/auth/acting-context.ts) → `resolveActingContext` pattern in [`app/api/posts/create/route.ts`](app/api/posts/create/route.ts)
- Snapshot service spec: [`docs/custom-posts/tourify-post-styles-handoff/03-technical-architecture.md`](docs/custom-posts/tourify-post-styles-handoff/03-technical-architecture.md) §6
- API contracts: [`docs/custom-posts/tourify-post-styles-handoff/04-data-api-security.md`](docs/custom-posts/tourify-post-styles-handoff/04-data-api-security.md) §4

---

### Task 4 — Extend Post Creation to Snapshot Appearance

**Status:** `[ ] pending`

**Intent**  
Extend `app/api/posts/create/route.ts` to accept an optional `appearance` field and atomically write a `post_appearances` row alongside the post insert. All existing behavior is unchanged when `appearance` is absent or the `post_styles_write` flag is off.

**Expected Outcomes**
- `app/api/posts/create/route.ts` reads an optional `appearance?: PostAppearanceInput` from the request body.
- When `post_styles_write` flag is off OR `appearance` is absent, the route behaves identically to today.
- When `post_styles_write` is on and `appearance` is provided: calls `resolveAppearanceSnapshot`, inserts the `post_appearances` row in the same logical transaction as the post (Supabase sequential insert with post delete on appearance failure).
- On appearance validation failure, returns a field-level error and does NOT publish the post.
- Existing tests for post creation still pass.
- New tests: `__tests__/post-styles/post-create-appearance.test.ts` — styled post creates both rows; invalid token returns 400 without post; flag-off produces no appearance row.

**Todo List**
1. Import `resolvePostStyleFlags` and `resolveAppearanceSnapshot` into the route.
2. Destructure optional `appearance` from the request body.
3. After the post insert succeeds, if appearance input is present and flag is on: call `resolveAppearanceSnapshot`, insert `post_appearances` row, delete post on failure.
4. Extend the response DTO to include `appearance: { mode: "styled", ... } | { mode: "standard" }`.
5. Write tests covering the three paths (no appearance, valid styled, invalid).
6. Confirm existing post creation tests still pass.
7. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- Post creation route: [`app/api/posts/create/route.ts`](app/api/posts/create/route.ts)
- `resolveActingContext` already provides `userId`, `accountType`, `profileId`
- Spec publish transaction: [`docs/custom-posts/tourify-post-styles-handoff/04-data-api-security.md`](docs/custom-posts/tourify-post-styles-handoff/04-data-api-security.md) §3

---

### Task 5 — Feed Query & DTO Extension

**Status:** `[ ] pending`

**Intent**  
Extend the canonical post query to include the `post_appearances` row when present, and extend the `ExtendedPost` / feed DTO to carry `PostAppearanceDTO`. All existing feed surfaces are unaffected when no appearance row exists.

**Expected Outcomes**
- `lib/feed/feed-posts-query.ts` select columns optionally include `post_appearances(template_id, template_version, schema_version, snapshot, snapshot_hash, status)` with a LEFT JOIN (null = standard mode).
- `lib/services/feed.service.ts` (or wherever `ExtendedPost` is declared) extended with `appearance?: PostAppearanceDTO | null`.
- A `resolvePostAppearanceDTO(row)` transformer that returns `{ mode: "styled", ... }` or `{ mode: "standard" }` and records a fallback reason when a snapshot exists but fails validation.
- The transformer is the single canonical decoder — not duplicated in each page.
- No new network request per card; appearance data comes with the post query.
- Existing feed queries with no appearance data produce the same result as before.

**Todo List**
1. Update the `POST_SELECT_COLUMNS` constant in `lib/feed/feed-posts-query.ts` to add a nullable left-join on `post_appearances`.
2. Add `appearance` to the `ExtendedPost` type in `lib/services/feed.service.ts`.
3. Create `lib/feed/resolve-post-appearance-dto.ts` with the `resolvePostAppearanceDTO` transformer.
4. Call the transformer in the feed query transform layer.
5. Verify that all existing feed tests pass with no changes to expected output when `appearance` is null.
6. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- Feed query: [`lib/feed/feed-posts-query.ts`](lib/feed/feed-posts-query.ts)
- `POST_SELECT_COLUMNS` variants: lines 5–80 in `feed-posts-query.ts`
- ExtendedPost base: [`lib/services/feed.service.ts`](lib/services/feed.service.ts) (imported in `post-card.tsx` line 39)
- Spec DTO: [`docs/custom-posts/tourify-post-styles-handoff/03-technical-architecture.md`](docs/custom-posts/tourify-post-styles-handoff/03-technical-architecture.md) §8

---

### Task 6 — One-Template Vertical Slice (End-to-End)

**Status:** `[ ] pending`

**Intent**  
Build the post-safe CSS isolation boundary, one representative template adapter (`modern`), and the conditional render path in `PostCard`. An author using internal test accounts can select the `modern` template, publish, and see the styled post in the feed and permalink. No composer UI yet — the style input is provided via the preview API or a test fixture.

**Expected Outcomes**
- `components/posts/appearance/post-style-boundary.tsx` — renders `<article data-post-appearance data-template={templateId} style={cssVariables} className={rootClassName + " isolation-isolate overflow-hidden"}>` and applies `lib/appearance/compile.ts` output.
- `components/posts/appearance/standard-post-fallback.tsx` — renders the unmodified existing post card layout (imports and delegates to the current inner card JSX).
- `components/posts/appearance/post-template-adapter.tsx` — for `modern` template: maps `compiled.variants` to post semantic regions (author, text, media, reactions). Serves as the pattern for all subsequent adapters.
- `components/posts/appearance/styled-post-root.tsx` — error boundary wrapping `PostStyleBoundary`; on error, records fallback reason via `lib/appearance/telemetry.ts` and renders `StandardPostFallback`.
- `PostCard` updated: if `post.appearance?.mode === "styled"` AND `post_styles_read` flag is on, render `StyledPostRoot`; otherwise render the existing card layout unchanged.
- Visual regression: adjacent styled and unstyled posts in a test feed — no style leak confirmed.
- SSR: no hydration mismatch; CSS variables inline-rendered server-side.
- Performance: no card dimension change after hydration (no CLS).
- A `__tests__/post-styles/post-style-boundary.test.tsx` with isolation assertion (no selector escaping the `[data-post-appearance]` scope).

**Todo List**
1. Create `components/posts/appearance/` directory and all four component files.
2. Implement `PostStyleBoundary` with scoped inline CSS variables and `isolation: isolate`.
3. Implement `StandardPostFallback` that delegates to the existing `PostCard` inner layout without props change.
4. Implement `modern` template adapter — map tokens to post regions.
5. Implement `StyledPostRoot` error boundary.
6. Update `PostCard` to conditionally render `StyledPostRoot` when `post_styles_read` is on and appearance is styled.
7. Verify existing `PostCard` tests pass unchanged when flag is off.
8. Test with a seed styled post in the dev database.
9. Confirm no CSS selector outside `[data-post-appearance]` is generated from user token data.
10. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- `PostCard`: [`components/feed/post-card.tsx`](components/feed/post-card.tsx)
- Spec rendering boundary: [`docs/custom-posts/tourify-post-styles-handoff/03-technical-architecture.md`](docs/custom-posts/tourify-post-styles-handoff/03-technical-architecture.md) §4
- `resolveEpkAppearanceForRender` (from which compile.ts derives): [`lib/epk/epk-appearance.ts:596`](lib/epk/epk-appearance.ts)

---

### Task 7 — Settings Appearance Tab: Post Styles Manager

**Status:** `[ ] pending`

**Intent**  
Build the primary user-facing entry point for creating, editing, and managing post-style profiles: a `PostStylesSettingsPanel` embedded in the **Appearance tab** of every profile-type settings page. This is where users pick a template, customize it with the EPK editing controls, and save it as a reusable posting style — accessible from Settings → Appearance for every account type. The composer Style control in Task 8 consumes profiles created here.

**Expected Outcomes**

**New shared panel — `components/settings/post-styles-settings-panel.tsx`**
- Displays all saved `post_style_profiles` owned by the current acting account (fetched from `/api/post-style-profiles`).
- Shows a "Default" badge on the active default style and its template thumbnail.
- **Create flow**: template gallery (all templates from `lib/appearance/template-registry.ts`, CSS-gradient thumbnails from `previewClassName`/`colors`) → full editing controls (filtered through `POST_FEED_CAPABILITY_MAP`) → live preview → name field → Save.
- **Edit flow**: reopens the full editor pre-loaded with the profile's saved `configuration` and `template_id`; saving updates the existing profile row.
- **Per-profile actions**: Edit, Duplicate, Rename, Set as Default, Archive — all backed by the Task 3 API routes.
- Live preview uses the production `StyledPostRoot` renderer with sanitized configuration; preview modes: Feed card, Full post, Mobile.
- Empty state: `"No saved styles yet. Start with an EPK template and make it yours."`
- Retired-template notice when a saved profile references a template no longer available for new selection.
- Accessible: all controls keyboard-reachable, correct ARIA labels and landmarks, screen-reader announcements on save/error.
- Only rendered when `post_styles_editor` flag is on; otherwise a "Coming soon" placeholder with no broken UI.

**Settings integration — four components updated additively, zero existing content removed**
- `ArtistAccountSettings` (`case 'appearance'`): existing `ArtistPublicAppearancePanel` renders first (EPK public profile styles, unchanged); `<Separator />` + `<PostStylesSettingsPanel />` appended after under a "Post Styles" heading.
- `GeneralAccountSettings` (`case 'appearance'`): existing `DashboardThemePicker` + light/dark select render unchanged; `<PostStylesSettingsPanel />` appended below with a "Post Styles" heading.
- `VenueAccountSettings`: add new `case 'appearance'` in `renderTabContent` returning `<PostStylesSettingsPanel />`.
- `OrganizationAccountSettings`: add new `case 'appearance'` in `renderTabContent` returning `<PostStylesSettingsPanel />`.
- `account-scoped-settings.tsx`: **no changes needed** — `appearance` tab is already registered in `baseTabs` (line 158) for general/venue/org and explicitly for artists (line 132).

**Shared sub-components created here (also consumed by Task 8 composer)**
- `components/posts/appearance/template-gallery.tsx` — registry-sourced template tiles, CSS-gradient thumbnails, active/retired state indicators, current-selection highlight.
- `components/posts/appearance/control-renderer.tsx` — EPK editing controls (palette, typography, surface, effect, border, spacing) filtered through `POST_FEED_CAPABILITY_MAP`; shows short reason for `unsupported` controls; never silently drops any.

**Todo List**
1. Create `components/posts/appearance/template-gallery.tsx` sourcing tiles from `lib/appearance/template-registry.ts`.
2. Create `components/posts/appearance/control-renderer.tsx` importing EPK controls from `components/epk/`; apply `POST_FEED_CAPABILITY_MAP`.
3. Create `components/settings/post-styles-settings-panel.tsx`:
   a. Load owned profiles from `/api/post-style-profiles` on mount.
   b. Profile list: cards with thumbnail, name, Default badge, and action menu (Edit / Duplicate / Rename / Set Default / Archive).
   c. Create/Edit editor: template gallery → control renderer → preview (Feed / Full post / Mobile using `StyledPostRoot`) → name → Save.
   d. Empty state and flag-gated placeholder when `post_styles_editor` is off.
4. Update `ArtistAccountSettings` `case 'appearance'`: append `<PostStylesSettingsPanel />` after existing `ArtistPublicAppearancePanel`.
5. Update `GeneralAccountSettings` `case 'appearance'`: append `<PostStylesSettingsPanel />` after existing appearance form.
6. Add `case 'appearance'` to `VenueAccountSettings` `renderTabContent`.
7. Add `case 'appearance'` to `OrganizationAccountSettings` `renderTabContent`.
8. Write keyboard and ARIA tests for the settings panel.
9. Verify existing artist and general appearance content is pixel-identical (no regression).
10. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- Tab registration: [`components/settings/account-scoped-settings.tsx:114`](components/settings/account-scoped-settings.tsx) — `baseTabs` includes `appearance` at line 158; artist at line 132.
- Artist appearance: [`components/settings/artist-account-settings.tsx:1015`](components/settings/artist-account-settings.tsx) — falls to `default` (EPK panel is a separate import).
- General `case 'appearance'`: [`components/settings/general-account-settings.tsx:592`](components/settings/general-account-settings.tsx).
- Venue settings: [`components/settings/venue-account-settings.tsx`](components/settings/venue-account-settings.tsx) — no `case 'appearance'` today.
- Org settings: [`components/settings/organization-account-settings.tsx`](components/settings/organization-account-settings.tsx) — no `case 'appearance'` today.
- Existing EPK appearance panel as control model: [`components/settings/artist-public-appearance-panel.tsx`](components/settings/artist-public-appearance-panel.tsx).
- Profiles API from Task 3: `/api/post-style-profiles`

---

### Task 8 — Composer Style Control

**Status:** `[ ] pending`

**Intent**  
Add the `Style` chip to the post composer so authors can instantly apply a saved profile (created in Settings → Appearance) or make a one-post customization inline. This task builds only the composer surface and reuses `template-gallery.tsx` and `control-renderer.tsx` created in Task 7 — no component duplication.

**Expected Outcomes**
- `components/posts/appearance/appearance-editor.tsx` — lazy-loaded panel triggered by the `Style` chip. Shows saved profiles list (with Default indicator and thumbnails), template gallery, editing controls, and preview switcher.
- Composer `Style` chip shows the active default profile's thumbnail + name, or "Standard" when no default is set.
- Per-post override: editing any token creates a draft labeled "Custom for this post" without modifying the saved profile.
- "Save as reusable style" promotes the draft configuration to a new `post_style_profiles` row via Task 3 API.
- `components/posts/appearance/preview-switcher.tsx` — Feed / Profile / Full post / Mobile preview using `StyledPostRoot` with sanitized draft output.
- Draft style persisted in component state or `localStorage` keyed to the draft; restored on page refresh.
- All controls keyboard-reachable with correct ARIA labels.
- Only rendered when `post_styles_editor` flag is on.
- `template-gallery.tsx` and `control-renderer.tsx` are imported from their Task 7 locations — no copied JSX.

**Todo List**
1. Create `components/posts/appearance/preview-switcher.tsx` (four preview modes using `StyledPostRoot`).
2. Create `components/posts/appearance/appearance-editor.tsx` composing `template-gallery.tsx`, `control-renderer.tsx`, saved-profile list, and `preview-switcher.tsx`.
3. Wire `Style` chip into primary composer components (`clean-post-creator.tsx`, `compact-post-creator.tsx`, `enhanced-post-creator.tsx`) behind the `post_styles_editor` flag.
4. Implement per-post override path and "Custom for this post" label.
5. Implement "Save as reusable style" action (POST to `/api/post-style-profiles`).
6. Add draft-recovery state.
7. Keyboard, focus-trap, and ARIA tests for the composer panel.
8. Confirm `template-gallery.tsx` and `control-renderer.tsx` are shared — no copied component trees.
9. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- Composer entry points: [`components/feed/clean-post-creator.tsx`](components/feed/clean-post-creator.tsx), [`components/feed/compact-post-creator.tsx`](components/feed/compact-post-creator.tsx), [`components/feed/enhanced-post-creator.tsx`](components/feed/enhanced-post-creator.tsx)
- Shared sub-components from Task 7: `template-gallery.tsx`, `control-renderer.tsx` in `components/posts/appearance/`
- UX spec composer flows A–C: [`docs/custom-posts/tourify-post-styles-handoff/02-ux-ui-spec.md`](docs/custom-posts/tourify-post-styles-handoff/02-ux-ui-spec.md)

### Task 9 — Full Template Adapter Coverage

**Status:** `[ ] pending`

**Intent**  
Implement `postFeed` and `postDetail` adapters for every active EPK template (all 19 skins). Complete the parity matrix with automated test references.

**Expected Outcomes**
- Every template listed in `EPK_TEMPLATE_CATALOG` has a `postFeed` adapter in `components/posts/appearance/adapters/`.
- Retired/disabled templates render using the `standard-post-fallback` with a documented reason code.
- `post_styles_all_templates` flag gates the full set; when off, only the slice template (`modern`) is available.
- Deterministic thumbnail rendered from a sample post for each template (no placeholder gradients).
- Snapshot fixtures for minimum content, maximum content, long author name, media, marketplace post type.
- Parity matrix in `docs/post-styles/EPK_POST_PARITY_MATRIX.md` updated with pass/fail per template.
- Nested quote/repost styles confirmed isolated (two `[data-post-appearance]` roots, no token merge).

**Todo List**
1. Create `components/posts/appearance/adapters/` directory with one file per template.
2. Implement each adapter by mapping the template's skin tokens to post semantic regions.
3. Register adapters in `lib/appearance/template-registry.ts` entries.
4. Generate thumbnails using a static sample post rendered at a fixed width.
5. Add snapshot fixtures and visual regression tests for all 19 templates.
6. Test nested quote-post with outer template `luxe` and inner template `cinema`.
7. Gate full set behind `post_styles_all_templates` flag.
8. Update parity matrix and `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- All skin IDs: [`lib/epk/epk-skin-tokens.ts:1`](lib/epk/epk-skin-tokens.ts) — `modern`, `classic`, `minimal`, `bold`, `cinema`, `gallery`, `luxe`, `poster`, `coastal`, `scrapbook`, `bandcard`, `dossier`, `pressgrid`, `redcolumn`, `checkerboard`, `editorial`, `whitespace`, `colorblock`, `sunburst`
- Reference template options: [`lib/epk/epk-reference-template-options.ts`](lib/epk/epk-reference-template-options.ts)
- Spec phase 5: [`docs/custom-posts/tourify-post-styles-handoff/05-implementation-plan.md`](docs/custom-posts/tourify-post-styles-handoff/05-implementation-plan.md)

---

### Task 10 — All Post Render Surfaces

**Status:** `[ ] pending`

**Intent**  
Replace or route every post render path through the canonical `StyledPostRoot` / `StandardPostFallback` so styled posts appear consistently everywhere a post is rendered. This phase uses the render-surface inventory from Task 0.

**Expected Outcomes**
- All surfaces classified as "full styled" in `POST_RENDER_SURFACE_INVENTORY.md` render via `StyledPostRoot`.
- All surfaces classified as "compact approved variant" render via a `PostCompactAdapter` (a narrower version of the feed adapter).
- All surfaces classified as "neutral preview" show standard styling and link to the permalink.
- Operational surfaces (moderation admin view, analytics) remain intentionally unstyled and documented as such.
- Post cache keys include `snapshot_hash`; cache invalidation fires when `post_appearances.updated_at` changes.
- Block/report/delete/edit controls verified present in every styled surface.
- Privacy changes (post deleted, account deactivated) confirmed to remove appearance access via cascading RLS.

**Todo List**
1. For each surface in the inventory, update the component to conditionally render `StyledPostRoot` or `StandardPostFallback` per the classification.
2. Update any feed query that does not yet include the `post_appearances` LEFT JOIN.
3. Ensure SSR/RSC compatibility (CSS variables inline-rendered, no client-only hydration required for the initial paint).
4. Update post cache key generation to include `snapshot_hash` where caching exists.
5. Write surface-integration tests for each classified surface.
6. Confirm operational/moderation surfaces skip styled rendering with documentation.
7. Update `POST_RENDER_SURFACE_INVENTORY.md` with all rows resolved.
8. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- Render surfaces: all components in `components/feed/`, `components/artist/`, `components/dashboard/`, profile routes, permalink
- Spec phase 6: [`docs/custom-posts/tourify-post-styles-handoff/05-implementation-plan.md`](docs/custom-posts/tourify-post-styles-handoff/05-implementation-plan.md)

---

### Task 11 — Hardening: Security, Accessibility, Performance

**Status:** `[ ] pending`

**Intent**  
Complete the security, accessibility, and performance validation required before any rollout increase. All mandatory gates from `README.md` and `06-qa-release.md` must pass.

**Expected Outcomes**
- Full RLS authorization matrix tests pass (cross-user, cross-account, organization/venue member boundaries).
- CSS injection fuzz: values containing `url()`, `expression()`, `@import`, unescaped selectors all rejected by `sanitizeForPost`.
- Oversized JSON (> 16 kB), unknown schema version, malformed assets all return structured errors.
- WCAG AA contrast check for every active template's default token set.
- Keyboard navigation through composer Style panel: no focus trap, all controls reachable, correct announcements.
- `prefers-reduced-motion` disables animated effects.
- Forced-colors mode preserves content and actions.
- Mixed-template feed performance: feed with 20 styled posts stays within LCP / INP / CLS budgets.
- Render compile cache confirmed functional (same snapshot hash → no recompile).
- Existing EPK visual baselines still pass (zero diff or explicitly approved).

**Todo List**
1. Run full `__tests__/post-styles/` suite including rls, profiles, post-create, boundary, and surface tests.
2. Run CSS injection fuzz tests against `sanitizeForPost`.
3. Run contrast checker against all template token defaults.
4. Run WCAG keyboard and screen-reader audit on composer Style panel.
5. Run `prefers-reduced-motion` and `forced-colors` checks.
6. Run Lighthouse / Core Web Vitals on a page with 20 mixed-style posts.
7. Confirm EPK visual baselines unchanged (run `npx vitest run lib/epk/` and snapshot compare).
8. Close all critical/high findings before enabling rollout.
9. Update `docs/post-styles/BASELINE_AND_VERIFICATION.md` with hardening results.
10. Update `IMPLEMENTATION_STATUS.md`.

**Relevant Context**
- QA spec: [`docs/custom-posts/tourify-post-styles-handoff/06-qa-release.md`](docs/custom-posts/tourify-post-styles-handoff/06-qa-release.md)
- Non-negotiable gates: [`docs/custom-posts/tourify-post-styles-handoff/README.md`](docs/custom-posts/tourify-post-styles-handoff/README.md)
- Sanitize module: `lib/appearance/sanitize.ts` (from Task 1)

---

### Task 12 — Controlled Release

**Status:** `[ ] pending`

**Intent**  
Enable post styles for production users in a phased rollout using the `feature_flags` table. Document runbooks and stop conditions.

**Expected Outcomes**
- Feature flags updated in production database in stages (1 % → 5 % → 25 % → 50 % → 100 %).
- Observability dashboards monitoring: fallback rate by template, feed LCP/INP/CLS, renderer errors, editor funnel.
- Alerts configured for fallback spike, performance regression, cross-account error.
- Rollback steps documented and rehearsed: flags off → all posts render through `StandardPostFallback`; appearance records preserved.
- `docs/post-styles/IMPLEMENTATION_STATUS.md` updated to final complete state.
- Backlog follow-ups (premium template entitlements, compact surface notifications, group feeds, embeds) documented separately from launch blockers.

**Todo List**
1. Verify all hardening gates from Task 11 are closed.
2. Enable `post_styles_read` + `post_styles_write` + `post_styles_editor` for internal staff accounts.
3. Monitor 24 h; if no stop conditions, expand `rollout_percentage` to 5.
4. Continue staged rollout per spec §8 stop conditions.
5. Document ownership and runbooks.
6. Separate in-scope launch items from deferred follow-ups.
7. Mark all tasks in `docs/post-styles/implementation-plan.json` complete with evidence.

**Relevant Context**
- Rollout plan: [`docs/custom-posts/tourify-post-styles-handoff/05-implementation-plan.md`](docs/custom-posts/tourify-post-styles-handoff/05-implementation-plan.md) §Phase 8
- Stop conditions: same doc §Stop conditions

---

## Cross-cutting constraints (apply to every task)

1. **No EPK output change.** `normalizeEpkAppearance` and `resolveEpkAppearanceForRender` are imported—not modified. Run `lib/epk/` tests after every task that touches shared code.
2. **No database reset.** All schema changes are `supabase/migrations/` additive SQL files applied via `mcp__supabase__apply_migration`.
3. **Acting-context authorization.** Every write uses `resolveActingContext` from `lib/auth/acting-context.ts`. Client-provided `owner_id` is never trusted directly.
4. **Feature flags gate everything.** Reader (`post_styles_read`), writer (`post_styles_write`), editor UI (`post_styles_editor`), full template set (`post_styles_all_templates`). Legacy posts with no appearance row are always rendered through the standard path regardless of flags.
5. **No arbitrary CSS.** `sanitizeForPost` in `lib/appearance/sanitize.ts` is the single source of truth. No `dangerouslySetInnerHTML`, no raw `style` strings from user JSON.
6. **Immutable snapshots.** Published `post_appearances.snapshot` is never updated in place. An edit creates a new revision via `post_appearance_revisions`.
7. **One canonical decoder.** `resolvePostAppearanceDTO` in `lib/feed/resolve-post-appearance-dto.ts` decodes appearance for all surfaces. No per-page JSON decoding.
8. **Standard fallback always works.** `StandardPostFallback` renders the current `PostCard` inner layout with no appearance dependency. Any error in the styled path falls back silently to this.

---

## Task dependency order

```
Task 0 (audit)
  └─► Task 1 (shared contract)
        └─► Task 2 (DB + flags)
              └─► Task 3 (profiles service)
                    └─► Task 4 (post create extension)
                          └─► Task 5 (feed query DTO)
                                └─► Task 6 (one-template vertical slice)
                                      ├─► Task 7 (settings appearance panel)
                                      │     └─► Task 8 (composer style control)
                                      └─► Task 9 (all template adapters)
                                            └─► Task 10 (all surfaces)
                                                  └─► Task 11 (hardening)
                                                        └─► Task 12 (release)
```

Tasks 7/8 and Task 9 may be worked in parallel after Task 6 is complete.
Tasks 7 and 8 are sequential (composer reuses shared sub-components built in Task 7).
