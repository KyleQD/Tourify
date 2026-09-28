# Phase 12 — Controlled Release Runbook
## Custom Post Styles — Tourify

**Feature:** Custom Post Styles  
**Feature flags:** `post_styles_read`, `post_styles_write`, `post_styles_editor`, `post_styles_all_templates`  
**Current state (dev):** All 4 flags `enabled=true, rollout_percentage=100`  
**Current state (prod):** All 4 flags `enabled=false, rollout_percentage=0`  
**Non-destructive:** No existing tables altered, no backfills, no database reset.

---

## Pre-launch checklist

### Code & tests
- [ ] All 66 tests passing (`npx vitest run __tests__/post-styles __tests__/epk lib/appearance/__tests__`)
- [ ] EPK tests unregressed (16/16)
- [ ] No TypeScript errors in `lib/appearance/`, `components/posts/appearance/`, `app/api/post-style-profiles/`
- [ ] `SKIN_BASE_COLORS` exported in `lib/appearance/compile.ts` ✅

### Database (Supabase)
- [ ] Migrations `20260728001000–001003` applied to production
- [ ] RLS verified on `post_style_profiles`, `post_appearances`, `post_appearance_revisions`
- [ ] Feature flag rows present in production `feature_flags` table with `enabled=false`
- [ ] `post_appearances` table has `snapshot` column with correct type (`jsonb`)
- [ ] Indexes verified: `author_lookup`, `post_lookup`, `template_lookup` on `post_appearances`

---

## Stage 1 — Internal / Staff (Day 0)

**Activate:** Set all 4 flags to `enabled=true, rollout_percentage=5` for users in the `staff` or `beta_tester` group.

```sql
-- Production: enable for staff only (update user_ids as needed)
UPDATE feature_flags
SET enabled = true, rollout_percentage = 5, metadata = jsonb_set(metadata, '{staff_only}', 'true')
WHERE flag_name IN ('post_styles_read','post_styles_write','post_styles_editor','post_styles_all_templates');
```

**Validation steps:**
1. Log in as a staff artist account
2. Navigate to Dashboard → New Post — confirm **Style** chip visible in composer
3. Click Style → Template Gallery appears with 19 templates
4. Select `modern` template → composer preview updates with dark background + white text
5. Textarea background no longer dark (shows the skin's bg colour through)
6. Post the styled post → it appears on the feed immediately with the style applied (no page refresh needed)
7. Navigate to Settings → Appearance → confirm **Post Styles** panel visible below EPK settings
8. Create a profile: name it "Test Profile", pick `luxe`, save → appears in composer Style picker
9. Single post permalink (`/posts/{id}`) shows `data-post-appearance` attribute on the card
10. Profile page (`/profile/username`) shows the styled post card correctly

**Rollback:** Set all 4 flags to `enabled=false`.

---

## Stage 2 — Soft Launch: `post_styles_read` only (Day 3–7)

Enable read-only flag for a broader audience first — users can *see* styled posts from staff authors without being able to create them.

```sql
UPDATE feature_flags
SET enabled = true, rollout_percentage = 50
WHERE flag_name = 'post_styles_read';
```

**What changes visually:**
- Styled posts from staff appear with skin colours in all feed surfaces
- Unstyled posts remain unchanged (standard fallback path)
- No composer UI shown to non-flagged users

**Monitoring signals:**
- Error telemetry: watch for `renderer_fallback` events in `trackAppearanceEvent` logs
- Watch for `unknown_template` or `invalid_schema` fallback events (would indicate snapshot corruption)
- `post_appearances` row count in production should stay at 0 (only staff can write)

---

## Stage 3 — Creator Beta: `post_styles_write` + `post_styles_editor` (Day 7–14)

Enable write + editor flags at 20% rollout for artist, venue, org account types.

```sql
UPDATE feature_flags
SET enabled = true, rollout_percentage = 20
WHERE flag_name IN ('post_styles_write', 'post_styles_editor');
```

**What changes for flagged users:**
- **Style** chip appears in `CleanPostCreator` and `CompactPostCreator`
- `AppearanceEditor` panel is accessible (base 1-template free tier)
- `post_style_profiles` API endpoints become accessible
- Settings → Appearance → Post Styles panel is interactive

**Monitoring signals:**
- `post_appearances` insert rate (expected: small volume from beta users)
- P99 post creation latency: snapshot serialization adds ~5ms — alert if >50ms regression
- Watch for `POST /api/posts/create` 400 errors with `appearanceReason` (template disabled, invalid schema)
- Watch for `POST /api/post-style-profiles` 403 (flag mis-routing)

---

## Stage 4 — All Templates: `post_styles_all_templates` (Day 14+)

```sql
UPDATE feature_flags
SET enabled = true, rollout_percentage = 20
WHERE flag_name = 'post_styles_all_templates';
```

Without this flag, `getTemplatesForFlag()` returns only the first (free) template.  
With this flag, all 19 templates are available.

---

## Stage 5 — Full Rollout (Day 21+)

```sql
UPDATE feature_flags
SET rollout_percentage = 100
WHERE flag_name IN (
  'post_styles_read',
  'post_styles_write',
  'post_styles_editor',
  'post_styles_all_templates'
);
```

---

## Rollback procedures

### Rollback all user-visible composer UI
```sql
UPDATE feature_flags
SET enabled = false
WHERE flag_name IN ('post_styles_write','post_styles_editor','post_styles_all_templates');
```
`post_styles_read` can stay enabled — existing styled posts will still render.

### Emergency: disable all rendering
```sql
UPDATE feature_flags
SET enabled = false
WHERE flag_name IN (
  'post_styles_read','post_styles_write','post_styles_editor','post_styles_all_templates'
);
```
All posts fall back to standard rendering. No data loss — `post_appearances` rows are preserved.

### Hot-patch: disable a specific template
If a specific template is found to cause rendering issues:
```sql
-- Neutralise all posts using the 'bold' template (they'll fall back to standard)
UPDATE post_appearances
SET status = 'neutralized'
WHERE template_id = 'bold';
```
`resolvePostAppearanceDTO` checks `status === 'neutralized'` and returns `{ mode: 'standard' }` for those posts.

---

## Key invariants to monitor in production

| Invariant | Query |
|-----------|-------|
| No `post_appearances` rows with `status` other than `active`/`neutralized` | `SELECT status, count(*) FROM post_appearances GROUP BY status` |
| No orphaned `post_appearances` (no parent post) | `SELECT count(*) FROM post_appearances pa LEFT JOIN posts p ON p.id = pa.post_id WHERE p.id IS NULL` |
| Snapshot schema version is always 1 | `SELECT schema_version, count(*) FROM post_appearances GROUP BY schema_version` |
| Template IDs are all known values | `SELECT DISTINCT template_id FROM post_appearances WHERE template_id NOT IN ('modern','classic','minimal','bold','cinema','gallery','luxe','poster','coastal','scrapbook','bandcard','dossier','pressgrid','redcolumn','checkerboard','editorial','whitespace','colorblock','sunburst')` |
| No `post_style_profiles` with `is_default = true` for same owner twice | `SELECT created_by, count(*) FROM post_style_profiles WHERE is_default = true AND status = 'active' GROUP BY created_by HAVING count(*) > 1` |

---

## Feature flag constants (reference)

```ts
// lib/post-style-flags.ts
export const POST_STYLES_READ        = 'post_styles_read'
export const POST_STYLES_WRITE       = 'post_styles_write'
export const POST_STYLES_EDITOR      = 'post_styles_editor'
export const POST_STYLES_ALL_TEMPLATES = 'post_styles_all_templates'
```

`post_styles_read` gates:
- Rendering styled posts in feeds, profile pages, permalink

`post_styles_write` gates:
- Writing `post_appearances` row on post creation
- Appearance payload accepted by `POST /api/posts/create`

`post_styles_editor` gates:
- `AppearanceEditor` UI in composer
- `POST /api/post-appearance/preview` endpoint
- Settings → Appearance → Post Styles panel (interactive state)

`post_styles_all_templates` gates:
- All 19 templates available in Template Gallery
- Without: only 1 template returned by `getTemplatesForFlag()`

---

## Files changed in this feature (full inventory)

### New migrations
| File | Description |
|------|-------------|
| `supabase/migrations/20260728001000_post_style_profiles.sql` | `post_style_profiles` table + RLS |
| `supabase/migrations/20260728001001_post_appearances.sql` | `post_appearances` table + RLS |
| `supabase/migrations/20260728001002_post_appearance_revisions.sql` | `post_appearance_revisions` (append-only) |
| `supabase/migrations/20260728001003_post_styles_feature_flags.sql` | 4 feature flag rows |

### New source files
| File | Description |
|------|-------------|
| `lib/appearance/contracts.ts` | Types: `AppearanceTemplateDefinition`, `PostAppearanceDTO`, `PostAppearanceInput`, `AppearanceSnapshotV1` |
| `lib/appearance/schema.ts` | `CURRENT_SCHEMA_VERSION = 1` |
| `lib/appearance/template-registry.ts` | 19-entry registry; `getTemplateById`, `getActiveTemplates`, `getTemplatesForFlag` |
| `lib/appearance/capabilities.ts` | `POST_FEED_CAPABILITY_MAP` (28-field capability matrix) |
| `lib/appearance/sanitize.ts` | `sanitizeForPost`, `POST_UNSAFE_FIELDS` |
| `lib/appearance/compile.ts` | `compilePostAppearance`, `getSkinColorsForPreview`, `SKIN_BASE_COLORS` (19 skins) |
| `lib/appearance/telemetry.ts` | `trackAppearanceEvent` |
| `lib/post-style-flags.ts` | `resolvePostStyleFlags`, flag name constants |
| `lib/post-style-profiles/profiles.service.ts` | CRUD for `post_style_profiles` |
| `lib/post-style-profiles/appearance-snapshot.service.ts` | `resolveAppearanceSnapshot`, `computeSnapshotHash` |
| `lib/feed/resolve-post-appearance-dto.ts` | Canonical `resolvePostAppearanceDTO` decoder |
| `components/posts/appearance/post-style-boundary.tsx` | `<article>` CSS isolation boundary |
| `components/posts/appearance/standard-post-fallback.tsx` | Standard fallback wrapper |
| `components/posts/appearance/post-template-adapter.tsx` | Universal template adapter |
| `components/posts/appearance/styled-post-root.tsx` | Error boundary + compile + `StyledPostRoot` |
| `components/posts/appearance/adapters/index.ts` | 19 template adapter configs |
| `components/posts/appearance/template-gallery.tsx` | Template tile grid |
| `components/posts/appearance/control-renderer.tsx` | Capability-filtered appearance controls |
| `components/posts/appearance/preview-switcher.tsx` | Preview mode tab switcher |
| `components/posts/appearance/appearance-editor.tsx` | Per-post style picker panel |
| `components/settings/post-styles-settings-panel.tsx` | Settings → Appearance → Post Styles manager |
| `app/api/post-style-profiles/route.ts` | GET list + POST create profiles |
| `app/api/post-style-profiles/[id]/route.ts` | PATCH update + DELETE archive |
| `app/api/post-style-profiles/[id]/default/route.ts` | POST set default |
| `app/api/post-appearance/preview/route.ts` | POST preview (flag-gated) |
| `hooks/use-post-style-flags.ts` | `usePostStyleFlags` React hook |
| `__tests__/post-styles/post-style-boundary.test.ts` | 8 CSS isolation tests |
| `__tests__/post-styles/template-adapters.test.ts` | 10 adapter coverage tests |
| `lib/appearance/__tests__/appearance.test.ts` | 9 registry/sanitize/capability tests |
| `__tests__/post-styles/hardening.test.ts` | 23 hardening tests (11a–11e) |

### Modified source files
| File | Change |
|------|--------|
| `lib/feed/feed-posts-query.ts` | `post_appearances` left-join in `POST_SELECT_COLUMNS` |
| `lib/services/feed.service.ts` | `appearance?` field on `ExtendedPost` |
| `app/api/posts/create/route.ts` | Appearance snapshot block; `normalizedPost.post_appearances` for optimistic rendering |
| `components/feed/post-card.tsx` | `enablePostStyles` prop + `StyledPostRoot` path |
| `components/feed/post-card-modern.tsx` | `enablePostStyles` prop + `StyledPostRoot` path |
| `components/feed/feed-list.tsx` | `usePostStyleFlags` + `enablePostStyles` prop |
| `components/feed/clean-post-creator.tsx` | Style chip, `AppearanceEditor` panel, live preview, textarea bg fix |
| `components/feed/compact-post-creator.tsx` | Style chip + `AppearanceEditor` panel |
| `components/artist/artist-post-card.tsx` | `appearance` field, `enablePostStyles`, `StyledPostRoot` |
| `components/artist/artist-home-feed.tsx` | `usePostStyleFlags`, appearance threading, `enablePostStyles` |
| `components/feed/post-card-modern.tsx` | `enablePostStyles` + `StyledPostRoot` path |
| `components/profile/profile-posts.tsx` | `usePostStyleFlags`, `StyledPostRoot` wrapping |
| `components/settings/artist-account-settings.tsx` | `case 'appearance':` extended with Post Styles panel |
| `components/settings/general-account-settings.tsx` | `case 'appearance':` extended with Post Styles panel |
| `components/settings/venue-account-settings.tsx` | New `case 'appearance':` with Post Styles panel |
| `components/settings/organization-account-settings.tsx` | New `appearance` guard with Post Styles panel |
| `app/posts/[id]/page.tsx` | `post_appearances` JOIN, flag resolution, `data-post-appearance` attrs |
| `lib/appearance/compile.ts` | `SKIN_BASE_COLORS` exported |
