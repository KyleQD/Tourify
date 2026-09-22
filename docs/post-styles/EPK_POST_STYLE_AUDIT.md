# EPK Post Style Audit

**Phase:** Task 0 — Repository Audit & Baseline Docs  
**Date:** 2025-07-14  
**Sources audited:** `lib/epk/epk-appearance.ts`, `lib/epk/epk-skin-tokens.ts`, `lib/epk/epk-template-catalog.ts`, `lib/epk/epk-reference-template-options.ts`, `lib/epk/epk-preview-utils.ts`, `lib/services/epk.service.ts`, `components/epk/epk-builder-toolbar.tsx`

---

## 1. EPK Template Catalog

### BASE_TEMPLATES (9 core skins)

| # | Template ID | Name | Description | skinId | Accent |
|---|-------------|------|-------------|--------|--------|
| 1 | `modern` | Modern | Sleek gradients with premium aesthetics | `modern` | purple-400 |
| 2 | `classic` | Classic | Warm editorial layout for press and bookers | `classic` | orange-400 |
| 3 | `minimal` | Minimal | Clean monochrome with subtle depth | `minimal` | gray-600 |
| 4 | `bold` | Bold | Electric highlights and strong contrast | `bold` | cyan-400 |
| 5 | `cinema` | Cinema | Letterbox charcoal with silver platinum type | `cinema` | zinc-300 |
| 6 | `gallery` | Gallery | Museum white with airy editorial space | `gallery` | neutral-800 |
| 7 | `luxe` | Luxe | Deep navy with champagne gold accents | `luxe` | `#c9a962` |
| 8 | `poster` | Poster | Concert ink with coral stamp energy | `poster` | `#f07167` |
| 9 | `coastal` | Coastal | Soft sage sand with calm teal accents | `coastal` | `#2d6a5a` |

### EPK_REFERENCE_TEMPLATE_OPTIONS (10 additional skins)

| # | Template ID | Name | Description | defaultFont |
|---|-------------|------|-------------|-------------|
| 10 | `scrapbook` | Scrapbook | Warm editorial paper, rounded color fields, split portrait cover | serif |
| 11 | `bandcard` | Band Card | Compact black-and-yellow band sheet with high-impact hierarchy | sans |
| 12 | `dossier` | Dossier | Photocopied paper, annotation energy, press-file presentation | sans |
| 13 | `pressgrid` | Press Grid | Clean white press sheet with banner photography and modular grids | sans |
| 14 | `redcolumn` | Red Column | Red portrait column, vertical editorial labels, concise artist facts | sans |
| 15 | `checkerboard` | Checkerboard | Purple race-grid accents, black information field, poster energy | sans |
| 16 | `editorial` | Editorial | High-fashion split cover with oversized type and red/black contrast | sans |
| 17 | `whitespace` | Whitespace | Airy white portfolio with image-led composition and precise rules | sans |
| 18 | `colorblock` | Color Block | Full red art direction with sparse photography and thin typography | sans |
| 19 | `sunburst` | Sunburst | Yellow and red retro press kit with bold photography and section blocks | sans |

**Total in `EPK_TEMPLATE_CATALOG`:** 19 templates (9 base + 10 reference)

### Legacy Aliases (resolved at runtime, not in catalog)

The `resolveEpkPreviewTemplateId` function in `lib/epk/epk-skin-tokens.ts` maps legacy IDs:
- `black` → `minimal`
- `neon` → `bold`
- `sunset` → `classic`

These appear in the toolbar's Template selector as legacy options but are not `EpkSkinId` values.

---

## 2. EpkSkinId Values (19 canonical skin IDs)

```typescript
type EpkSkinId =
  | "modern" | "classic" | "minimal" | "bold" | "cinema"
  | "gallery" | "luxe" | "poster" | "coastal" | "scrapbook"
  | "bandcard" | "dossier" | "pressgrid" | "redcolumn"
  | "checkerboard" | "editorial" | "whitespace" | "colorblock" | "sunburst"
```

---

## 3. EpkAppearance Interface (28 fields)

All fields sourced from `lib/epk/epk-appearance.ts:8–37`.

### Typography (4 fields)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `fontSizeScale` | enum | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` |
| `textColorPreset` | enum | `"inherit" \| "high_contrast" \| "muted"` | `"inherit"` |
| `textColorCustomHex` | `string \| null` | valid 6-digit hex or null | `null` |
| `headingScale` | enum | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` |

### Card Shape & Surface (3 fields)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `cardRadius` | enum | `"sharp" \| "rounded" \| "pill"` | `"rounded"` |
| `cardSurface` | enum | `"default" \| "elevated" \| "minimal"` | `"default"` |
| `surfaceStyle` | enum | `"default" \| "glass" \| "solid" \| "editorial" \| "outlined"` | `"default"` |

### Color Tokens (6 fields)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `accentHex` | `string \| null` | valid 6-digit hex or null | `null` |
| `secondaryAccentHex` | `string \| null` | valid 6-digit hex or null | `null` |
| `pageBackgroundHex` | `string \| null` | valid 6-digit hex or null | `null` |
| `cardBackgroundHex` | `string \| null` | valid 6-digit hex or null | `null` |
| `borderColorHex` | `string \| null` | valid 6-digit hex or null | `null` |

### Border (1 field)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `borderStrength` | enum | `"subtle" \| "default" \| "strong"` | `"default"` |

### Button (2 fields)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `buttonStyle` | enum | `"solid" \| "glass" \| "outline" \| "neon" \| "minimal"` | `"solid"` |
| `buttonRadius` | enum | `"sharp" \| "rounded" \| "pill"` | `"rounded"` |

### Effects & Background (4 fields)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `effectStyle` | enum | `"none" \| "glow" \| "glass" \| "shadow" \| "neon" \| "grain" \| "spotlight" \| "poster"` | `"none"` |
| `effectIntensity` | enum | `"subtle" \| "medium" \| "high"` | `"subtle"` |
| `backgroundStyle` | enum | `"template" \| "solid" \| "radial" \| "mesh" \| "spotlight"` | `"template"` |
| `sectionDividerStyle` | enum | `"none" \| "line" \| "accent" \| "glow" \| "ticker"` | `"line"` |

### Media Treatment (1 field)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `heroImageTreatment` | enum | `"natural" \| "cinematic" \| "duotone" \| "soft" \| "posterized"` | `"natural"` |

### Avatar (2 fields)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `avatarShape` | enum | `"circle" \| "rounded" \| "square"` | `"circle"` |
| `avatarSize` | enum | `"sm" \| "md" \| "lg" \| "xl"` | `"lg"` |

### Page Layout (3 fields)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `contentWidth` | enum | `"narrow" \| "default" \| "wide"` | `"default"` |
| `sectionSpacing` | enum | `"compact" \| "default" \| "relaxed"` | `"default"` |

### Cover Image (2 fields — Classic & Cinema templates only)
| Field | Type | Allowed Values | Default |
|-------|------|----------------|---------|
| `coverHeight` | enum | `"short" \| "medium" \| "tall"` | `"medium"` |
| `coverOverlay` | enum | `"light" \| "medium" \| "heavy"` | `"medium"` |

---

## 4. EPK Font IDs (10 values)

Defined in `lib/epk/epk-preview-utils.ts`:

```typescript
type EpkFontId = "sans" | "serif" | "display" | "geometric" | "mono"
               | "editorial" | "condensed" | "soft" | "slab" | "wide"
```

Font is stored as `epkFont` on the `EPKData` object alongside `epkAppearance`.

---

## 5. Persistence Path

### Storage location
- Table: `artist_epk_settings`
- Column: `settings` (JSONB)
- Key path: `settings.epkAppearance` → serialized `EpkAppearance` object
- Secondary key: `settings.epkFont` → `EpkFontId` string

### Serialization flow (write)
1. User changes a control in `EpkBuilderToolbar` → `onCommitStyle({ epkAppearance: ... })` fires
2. `EPKData.epkAppearance` patch is sent to `epkService.saveEPKData()`
3. `normalizeSavePayload` in `epk.service.ts:857` validates hex fields via `invalidEpkAppearanceHexFields`, then calls `normalizeEpkAppearance(rawAppearance, template)` before persisting
4. `saveEPKSettings` in `epk.service.ts:1040` writes `settings.epkAppearance = normalizedAppearance` to `artist_epk_settings`

### Deserialization flow (read)
1. `loadEPKData` calls `getEPKSettings` → reads `settings` JSONB blob
2. `transformToEPKData` extracts `epkSettings.settings.epkAppearance` and passes it through `normalizeEpkAppearance` again as a safety net
3. The resulting `EpkAppearance` is passed to `resolveEpkAppearanceForRender` inside EPK components

---

## 6. EPK Renderer Entry Points

| Component | Path | Role |
|-----------|------|------|
| `EPKDocument` | `components/epk/EPKDocument.tsx` | Full EPK page structure; receives `epkData + resolved appearance` |
| `epk-preview.tsx` | `components/epk/epk-preview.tsx` | EPK preview renderer entry point; orchestrates skin + appearance |
| `epk-builder-view.tsx` | `components/epk/epk-builder-view.tsx` | Editor host; manages undo history and state |

### Key functions
- `normalizeEpkAppearance(raw, template)` — `lib/epk/epk-appearance.ts:120` — normalizes any unknown/invalid tokens to defaults
- `resolveEpkAppearanceForRender(...)` — `lib/epk/epk-appearance.ts:596` — produces `ResolvedEpkAppearance` with `wrapperClassName`, `rootStyle`, `mergedTokens`, and variant classes

---

## 7. EPK Builder Toolbar — Editor Control Sections

All controls are in `components/epk/epk-builder-toolbar.tsx`. Sections map to toolbar Popover buttons:

### Type (popover)
- Font family — grid of `EpkFontId` buttons (10 fonts): Sans, Serif, Display, Geometric, Mono, Editorial, Condensed, Soft, Slab, Wide
- Body size — segmented row: xs / sm / md / lg / xl (→ `fontSizeScale`)
- Heading scale — segmented row: sm / md / lg / xl (→ `headingScale`)
- Text preset — Select: Inherit template / High contrast / Muted (→ `textColorPreset`)
- Custom text color — ColorSwatchRow + ColorPicker + HexWithNative (→ `textColorCustomHex`)

### Colors (popover)
- Template palettes — preset rows with 6-color swatch stripe; each applies `accentHex`, `secondaryAccentHex`, `pageBackgroundHex`, `textColorCustomHex`, `cardBackgroundHex`, `borderColorHex` in one click
- Accent (buttons / icons) — ColorSwatchRow + ColorPicker + HexWithNative (→ `accentHex`)
- Secondary accent — ColorSwatchRow + ColorPicker + HexWithNative (→ `secondaryAccentHex`)
- Page background — ColorSwatchRow + ColorPicker + HexWithNative (→ `pageBackgroundHex`)
- Card surface — HexWithNative only (→ `cardBackgroundHex`)
- Border color — HexWithNative only (→ `borderColorHex`)

### Cards (popover)
- Card corners — segmented row: sharp / rounded / pill (→ `cardRadius`)
- Surface — Select: Default / Elevated shadow / Minimal (→ `cardSurface`)
- Surface finish — Select: Template default / Glass / Solid / Editorial shadow / Outlined (→ `surfaceStyle`)
- Border strength — segmented row: subtle / default / strong (→ `borderStrength`)
- Button style — Select: Solid / Glass / Outline / Neon / Minimal (→ `buttonStyle`)
- Button radius — segmented row: sharp / rounded / pill (→ `buttonRadius`)

### Layout (popover)
- Content width — button list: Narrow / Default / Wide (→ `contentWidth`)
- Section spacing — button list: Compact / Default / Relaxed (→ `sectionSpacing`)

### Photo (popover)
- Shape — segmented row: circle / rounded / square (→ `avatarShape`)
- Size — segmented row: sm / md / lg / xl (→ `avatarSize`)

### Cover (popover, disabled unless `classic` or `cinema` template)
- Height — segmented row: short / medium / tall (→ `coverHeight`)
- Overlay — segmented row: light / medium / heavy (→ `coverOverlay`)

### Effects (popover)
- Effect style — Select: None / Subtle glow / Glass / Editorial shadow / Neon / Grain-noise / Spotlight / Poster texture (→ `effectStyle`)
- Intensity — segmented row: subtle / medium / high (→ `effectIntensity`)
- Background mood — Select: Template default / Solid / Radial aura / Mesh aura / Spotlight (→ `backgroundStyle`)
- Hero media — Select: Natural / Cinematic / Duotone / Soft / Posterized (→ `heroImageTreatment`)
- Section dividers — Select: None / Fine line / Accent line / Glow line / Ticker dash (→ `sectionDividerStyle`)

### Template (popover)
- Layout skin — Select of all 19 canonical skin IDs + 3 legacy aliases (→ `epkData.template`)

### AI Style (popover)
- `EpkAppearanceAiPanel` — generates `template + epkFont + epkAppearance` from a natural-language prompt; applies via `handleAiApply`

### Utility (always visible right side)
- Undo — reverts last committed style change
- Reset — returns to template defaults

---

## 8. Existing Test Coverage

### EPK-specific test files

| File | Location | Tests | Status |
|------|----------|-------|--------|
| `epk-appearance.test.ts` | `__tests__/epk/epk-appearance.test.ts` | 11 tests | ✅ All pass |
| `epk-template-resolve.test.ts` | `__tests__/epk/epk-template-resolve.test.ts` | 5 tests | ✅ All pass |

**EPK test baseline: 16 tests, 2 files, all passing.**

### Feed-related test files (adjacent)

| File | Location |
|------|----------|
| `feed-posts-route.test.ts` | `__tests__/feed/feed-posts-route.test.ts` |
| `feed-client.test.ts` | `__tests__/feed/feed-client.test.ts` |
| `music-post-preview.test.ts` | `__tests__/feed/music-post-preview.test.ts` |
| `attending-event-posts.test.ts` | `__tests__/feed/attending-event-posts.test.ts` |

**Note:** `music-post-preview.test.ts` had 2 pre-existing failures (unrelated to EPK) at baseline. See `BASELINE_AND_VERIFICATION.md`.

### No EPK appearance tests found in `lib/epk/` directory
Vitest `include` pattern only resolves tests under `__tests__/`. The `lib/epk/epk-appearance.test.ts` file exists in the lib tree but is included through `__tests__/epk/` symlink or project pattern — confirmed run and passing.

---

## 9. EpkSkinTokens Interface (18 token keys)

Each `EpkSkinId` maps to an `EpkSkinTokens` record in `EPK_SKIN_TOKENS`. Token semantics:

| Token | Semantic Role |
|-------|--------------|
| `page` | Full-page wrapper Tailwind classes |
| `card` | Section / card shell classes |
| `cardMuted` | Muted card variant classes |
| `heading` | Heading text classes |
| `subheading` | Subheading text classes |
| `badge` | Badge chip classes |
| `btnPrimary` | Primary button classes |
| `btnGhost` | Ghost button classes |
| `dashed` | Dashed border / placeholder |
| `accentIcon` | Icon accent color |
| `oneLinerWrap` | One-liner section wrapper |
| `muted` | Secondary / supporting text |
| `label` | Uppercase micro-label text |
| `link` | Inline link classes |
| `statCell` | Stat hero cell shell |
| `statValue` | Stat number emphasis |
| `trackArtFallback` | Music track art placeholder |
| `bodyStrong` | Primary body text on cards |
| `outlineBtn` | Social / booking outline button |
| `isLightSurface` | `boolean` — whether placeholders use light tone |

**Total token keys:** 19 (18 string + 1 boolean)
