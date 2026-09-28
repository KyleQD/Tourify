# Architecture Decisions

**Phase:** Task 0 — Repository Audit & Baseline Docs  
**Date:** 2025-07-14  
**Purpose:** Record the six architectural decisions (ADRs) from the custom post styles specification (doc 03 §14) that govern all implementation choices across Tasks 1–12.

---

## ADR-01: Shared Tokens/Registry vs Duplicated EPK/Post Templates

**Status:** Decided  
**Decided by:** Implementation plan (doc 03 §14)

### Context
The EPK system already has a complete appearance domain: `lib/epk/epk-appearance.ts` (`EpkAppearance` interface, `normalizeEpkAppearance`, `resolveEpkAppearanceForRender`), `lib/epk/epk-skin-tokens.ts` (`EpkSkinId`, `EPK_SKIN_TOKENS`), and `lib/epk/epk-template-catalog.ts` (`EPK_TEMPLATE_CATALOG`). The post styles feature needs to define which tokens are safe for a feed card post.

### Options Considered
1. Duplicate the EPK token system with a separate `PostAppearance` type (independent ownership, easy divergence)
2. Wrap the existing EPK system — new shared modules import FROM `lib/epk/`, apply post-specific constraints on top, no EPK change

### Decision
**Option 2 — Shared, wrapped.**

A new `lib/appearance/` directory wraps EPK internals. It re-exports the EPK template catalog as `AppearanceTemplateDefinition` entries and applies post-specific capability annotations via `POST_FEED_CAPABILITY_MAP`. Neither `lib/epk/epk-appearance.ts` nor `lib/epk/epk-skin-tokens.ts` nor `lib/epk/epk-template-catalog.ts` is modified.

### Consequences
- EPK output is byte-identical before and after any post-styles code is introduced
- All 19 EPK templates are available as post templates immediately via the shared registry
- Post-specific logic is additive and isolated to `lib/appearance/`
- `lib/epk/` tests must pass after every task that touches shared code (enforced by CI)
- If EPK adds a new template, it becomes available to posts automatically via registry iteration

---

## ADR-02: Semantic Snapshot vs Live Style-Profile Reference

**Status:** Decided  
**Decided by:** Implementation plan (doc 03 §14, §5)

### Context
When a post is published with a style, the appearance configuration must be associated with the post. Two main models exist: (a) store a reference to the author's `post_style_profiles` row and resolve appearance at read time, or (b) snapshot the resolved appearance tokens into an immutable `post_appearances` row at publish time.

### Options Considered
1. **Live reference**: `post_appearances.style_profile_id` → join on read → always reflects latest profile edits
2. **Immutable snapshot**: at publish, serialize the resolved `EpkAppearance` into `post_appearances.snapshot` JSONB; profile edits do not retroactively change published posts

### Decision
**Option 2 — Immutable snapshot at publish.**

`post_appearances.snapshot` stores the full resolved `AppearanceSnapshotV1` JSON at the moment of publication. The profile row (`post_style_profiles`) is the authoring source; the snapshot is the immutable published record.

### Consequences
- Published posts always look exactly as the author intended, regardless of future profile changes
- Profile changes require explicit re-style (new revision) on a post to take effect
- Cache keys can use `snapshot_hash` — same hash = no recompile
- Post deletion cascades to `post_appearances` (FK with `ON DELETE CASCADE`)
- `post_appearance_revisions` table provides an append-only audit trail when a post is re-styled
- Schema versioning (`schema_version`, `template_version`, `renderer_version`) on the snapshot enables forward-compatible migration of old snapshots

---

## ADR-03: Scoped CSS Variables vs Shadow DOM

**Status:** Decided  
**Decided by:** Implementation plan (doc 03 §14, §4)

### Context
Post appearance tokens need to style exactly the post card they belong to — without leaking into the host page or adjacent cards. Two main isolation approaches: (a) Shadow DOM provides true style encapsulation, (b) CSS custom properties scoped to a unique attribute selector.

### Options Considered
1. **Shadow DOM**: complete style isolation; no leakage; but breaks React hydration, accessibility tools, and global Tailwind utility classes
2. **CSS variables scoped to `[data-post-appearance]`**: inline CSS custom properties on the root element; all token-using classes reference `var(--epk-*)` which only resolve within the scoped root

### Decision
**Option 2 — CSS variables scoped to `[data-post-appearance]`.**

The post card root element receives `data-post-appearance` and `data-template="{templateId}"` HTML attributes. All appearance tokens are emitted as inline CSS custom properties on that root element. All token-consuming Tailwind-style classes reference `var(--epk-accent)`, `var(--epk-card-bg)`, etc. which resolve only within the `[data-post-appearance]` scope.

The root also receives `isolation: isolate` and `overflow: hidden` to prevent effect-style visual overflow.

### Consequences
- SSR-safe: CSS variables are inline-rendered server-side, no hydration mismatch
- React hydration works normally
- Accessibility tools can traverse the full DOM
- Global Tailwind classes remain unaffected
- No CSS selector from user token data can escape the `[data-post-appearance]` root
- `sanitizeForPost` is the single source of truth for rejecting unsafe token values (no `url()`, `expression()`, `@import`, unescaped selectors)

---

## ADR-04: Template Lifecycle / Versioning

**Status:** Decided  
**Decided by:** Implementation plan (doc 03 §14, §3)

### Context
The EPK template catalog will evolve — new templates may be added, existing ones may change their token structure, and some may be retired. `post_appearances` snapshots embed a `template_id`; if that template is later retired or its token schema changes, old snapshots must still render.

### Options Considered
1. No versioning — templates are static and never change
2. Semantic versioning on each template definition + renderer versioning on snapshots
3. Single `schemaVersion` on the snapshot only

### Decision
**Three-level versioning on `AppearanceSnapshotV1`:**
- `schema_version` — version of the `AppearanceSnapshotV1` contract itself (currently `1`)
- `template_version` — semver-style version of the specific template's token schema (e.g. `1.0.0`)
- `renderer_version` — version of the card renderer component that should process this snapshot

Templates are given a `lifecycle` field in the registry:
- `"active"` — available for new selection
- `"retired"` — no longer selectable, but old snapshots are rendered via the `standard-post-fallback` with a documented reason code; the profile that references it shows a "Retired template" notice in Settings

### Consequences
- Old snapshots with `renderer_version < current` can be processed by a backward-compat upgrade path
- Retired templates never break existing published posts
- `post_styles_all_templates` feature flag can gate new templates without affecting the registry
- `lib/appearance/template-registry.ts` is the canonical source of `lifecycle` status for all templates

---

## ADR-05: Asset / Font Budget

**Status:** Partially decided (audit pending)  
**Decided by:** Implementation plan (doc 03 §14); final font budget TBD in Task 0 audit

### Context
Custom post styles can reference fonts and potentially assets (background images, textures). Loading many font files or large assets per post card would degrade feed performance significantly (LCP, FID, CLS).

### Decision
**Reuse the approved EPK asset catalog; font budget TBD post-audit.**

The 10 `EpkFontId` values (`sans`, `serif`, `display`, `geometric`, `mono`, `editorial`, `condensed`, `soft`, `slab`, `wide`) are the complete approved font set. No new font files are added for post styles — these fonts are already loaded on pages that render EPK content.

Font-loading strategy for feed pages (which may not currently load EPK fonts): **lazy-load only the font families referenced by posts visible in the viewport**, using `<link rel="preload">` or `FontFace.load()` per unique font in the current feed batch. Max 2 unique font families per feed page load at initial paint.

Background texture / grain effects (`effectStyle: "grain"`, `effectStyle: "poster"`) use inlined SVG noise patterns or CSS-only techniques — no external image assets.

**Audit findings (Task 0):**
- EPK fonts are loaded via the existing `EPK_FONT_CLASS_BY_ID` mapping (Tailwind font-family utilities)
- The feed page does not currently preload EPK fonts
- Font budget specification: ≤ 2 font families in the initial feed viewport; additional families lazy-loaded on scroll — **TBD in Task 1 compile.ts implementation**

### Consequences
- No new font files needed — only reuse what EPK already requires
- Feed LCP impact bounded to the cost of 1–2 additional font family loads maximum
- `sanitizeForPost` must reject any `@font-face` declarations or external `url()` font references in appearance tokens

---

## ADR-06: Compact Surface Behavior

**Status:** Decided  
**Decided by:** Implementation plan (doc 03 §14); surface classification established in `POST_RENDER_SURFACE_INVENTORY.md`

### Context
Posts appear in many surfaces: full-width feed cards, compact search results, notification previews, profile headers, embeds. The appearance treatment that works for a full feed card may be inappropriate (visually or for performance) in compact contexts.

### Decision
**Per-surface classification in `POST_RENDER_SURFACE_INVENTORY.md`.**

Each surface is explicitly classified as one of:
- `full` — render `StyledPostRoot` with full appearance tokens
- `compact` — render `PostCompactAdapter` (bounded tokens only: text color, card radius, accent; no effects or background treatments)
- `neutral` — standard unstyled preview with link to styled permalink
- `unstyled` — intentionally no appearance rendering; documented exclusion

The `AppearanceTemplateDefinition` in the registry must declare both a `postFeed` adapter and a `postDetail` adapter stub (with the detail variant allowing wider layout options).

Compact surfaces suppress all `effectStyle`, `backgroundStyle`, and `sectionDividerStyle` tokens regardless of the snapshot value. This is enforced by the `PostCompactAdapter` component, not by sanitization — the snapshot is preserved as-is; only the rendering layer ignores certain tokens in compact mode.

### Consequences
- Authors set appearance once; all surfaces render it appropriately without author configuration
- Compact surfaces always degrade gracefully regardless of the chosen template's visual intensity
- `POST_RENDER_SURFACE_INVENTORY.md` is the single authoritative source for surface classifications
- Future surfaces (group feeds, embeds) must be added to the inventory with an explicit classification before deployment
- The fallback order is: `styled` → `compact styled` → `neutral` → `standard-post-fallback` — no surface ever shows a broken layout
