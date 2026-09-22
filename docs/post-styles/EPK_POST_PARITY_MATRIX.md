# EPK–Post Parity Matrix

**Phase:** Task 0 — Repository Audit & Baseline Docs  
**Date:** 2025-07-14  
**Purpose:** For every `EpkAppearance` field, classify its applicability to a feed card post surface. This matrix is the source of truth for `lib/appearance/capabilities.ts` → `POST_FEED_CAPABILITY_MAP`.

---

## Classification Definitions

| Code | Meaning |
|------|---------|
| **supported** | Token is safe and semantically meaningful in a feed card with no modification |
| **bounded** | Supported, but with tighter constraints for card context (e.g. font size capped, spacing compressed) |
| **adapted** | The EPK page concept maps to a different post concept; requires an adapter transform |
| **unsupported** | Page-layout-only, semantically inapplicable, or unsafe in a card; nulled out by `sanitizeForPost` |

---

## Field-by-Field Classification

### Typography Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `fontSizeScale` | Global body font scale for the full EPK page | **bounded** | Safe, but cap effective range to `xs`–`lg`; `xl` is oversized for a compact card and should be clamped to `lg` in the post adapter |
| `textColorPreset` | Applies preset text tone (inherit / high_contrast / muted) to headings and body copy | **supported** | Fully card-safe; used as-is on card text regions |
| `textColorCustomHex` | Custom hex override for all text tokens | **supported** | Applied via CSS variable scoped to `[data-post-appearance]`; hex sanitized by `normalizeHexColor` |
| `headingScale` | Scale multiplier for section headings on EPK page | **bounded** | Post has one heading (author name); `xl` clamped to `lg` to prevent overflow in compact layouts |

### Card Shape & Surface Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `cardRadius` | Corner rounding of all section cards inside EPK | **supported** | Directly applicable to the post card wrapper radius |
| `cardSurface` | Shadow/elevation depth of section cards | **supported** | Directly applicable; `elevated` adds drop shadow, `minimal` removes all decoration |
| `surfaceStyle` | Visual finish of card shell (glass / solid / editorial / outlined) | **supported** | Applied via `SURFACE_STYLE_CLASS` map scoped to `[data-post-appearance]` |

### Color Token Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `accentHex` | Primary accent for buttons, icons, and highlights on the EPK page | **supported** | Applied as `--epk-accent` CSS variable; used by action buttons (like, comment, share) and inline icon accents within post |
| `secondaryAccentHex` | Secondary accent for badges and supporting UI elements | **supported** | Applied as `--epk-secondary` CSS variable; used by hashtag badges and secondary UI decorations |
| `pageBackgroundHex` | **Page-level** background color for the entire EPK document | **unsupported** | This is a page container color, not a card color. Feed posts render inside the host page's own background; applying this would bleed color outside the post boundary. Nulled by `sanitizeForPost`. |
| `cardBackgroundHex` | Background color of individual section cards | **supported** | Directly maps to post card background; applied via `--epk-card-bg` CSS variable |
| `borderColorHex` | Border color of section cards | **supported** | Directly applicable to post card border; applied via `--epk-border` CSS variable |

### Border Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `borderStrength` | Overall border opacity/weight across EPK sections | **supported** | Fully applicable; controls the post card border presence |

### Button Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `buttonStyle` | Visual style of action buttons in EPK (social links, booking CTAs) | **supported** | Applied to action buttons within the post card (like, comment, share, bookmark). Not all EPK button contexts exist in a post but the styling classes are safe |
| `buttonRadius` | Corner rounding of buttons | **supported** | Directly applicable to post action buttons |

### Effects & Background Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `effectStyle` | Decorative effect applied to the EPK card shell (glow, glass, shadow, neon, grain, spotlight, poster) | **bounded** | Most effects are card-safe. `spotlight` and `poster` require post-specific implementation since they reference page-level positioning in EPK. The card-safe subset: `none`, `glow`, `glass`, `shadow`, `neon`, `grain`. The page-positioned values `spotlight` and `poster` fall back to `shadow` in the post adapter if not explicitly adapted. |
| `effectIntensity` | Intensity modifier for `effectStyle` (subtle / medium / high) | **bounded** | Safe but `high` intensity effects (especially neon/grain) should be capped at `medium` in compact card layout to avoid visual overload |
| `backgroundStyle` | Page-level background texture/gradient mode (template / solid / radial / mesh / spotlight) | **adapted** | In EPK this sets the full-page background. In a post card, this is adapted to a card background treatment using the same pattern applied to the card's own background surface instead of the page root. `template` → card inherits skin token, `solid` → `cardBackgroundHex`, `radial`/`mesh`/`spotlight` → inlined gradient on the card shell |
| `sectionDividerStyle` | Decorative divider between EPK page sections | **adapted** | EPK uses this between full-width page sections. In a post card, adapted to the divider between the content body and the action bar. Rendered as a single horizontal rule with the chosen style. `ticker` reduced to `accent` in compact surfaces. |

### Media Treatment Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `heroImageTreatment` | CSS filter/blend treatment applied to the EPK hero cover or avatar image | **supported** | Directly applicable to post media images. The same CSS filter classes (`cinematic`, `duotone`, `soft`, `posterized`) apply cleanly to post images in `FeedMediaGrid` |

### Avatar Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `avatarShape` | Shape of the artist avatar (circle / rounded / square) | **supported** | Directly applicable to the author avatar in the post card header |
| `avatarSize` | Size of the artist avatar (sm / md / lg / xl) | **bounded** | Post card header has a fixed header height. `xl` size in an EPK hero context is too large for a card avatar; capped at `md` in the post adapter to maintain compact card layout proportions |

### Page Layout Fields

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `contentWidth` | Max-width of the EPK page content column (`narrow` / `default` / `wide`) | **unsupported** | This is a page-layout-only concept: it constrains how wide the EPK column is within the viewport. Feed cards have no meaningful concept of content width — they fill their container slot. Nulled by `sanitizeForPost`. |
| `sectionSpacing` | Vertical gap between EPK page sections (`compact` / `default` / `relaxed`) | **bounded** | In EPK, this controls inter-section page gap. In post cards, adapted to internal vertical padding between card regions (header, content, media, actions). `relaxed` capped to `default` in compact card surfaces to avoid excessive internal padding |

### Cover Image Fields (Classic & Cinema templates only)

| Field | EPK Use | Post Card Classification | Reason / Adaptation Notes |
|-------|---------|--------------------------|---------------------------|
| `coverHeight` | Height of the EPK hero cover image section (`short` / `medium` / `tall`) | **unsupported** | EPK cover is a full-width hero section at the top of the page. Post cards have no equivalent hero cover section. Nulled by `sanitizeForPost`. |
| `coverOverlay` | Opacity of the gradient overlay on the EPK hero cover | **unsupported** | EPK-page-specific. No equivalent in a post card layout. Nulled by `sanitizeForPost`. |

---

## Summary Counts

| Classification | Count | Fields |
|----------------|-------|--------|
| **supported** | 14 | `textColorPreset`, `textColorCustomHex`, `cardRadius`, `cardSurface`, `surfaceStyle`, `accentHex`, `secondaryAccentHex`, `cardBackgroundHex`, `borderColorHex`, `borderStrength`, `buttonStyle`, `buttonRadius`, `heroImageTreatment`, `avatarShape` |
| **bounded** | 7 | `fontSizeScale`, `headingScale`, `effectStyle`, `effectIntensity`, `backgroundStyle` (→ adapted to card), `sectionSpacing`, `avatarSize` |
| **adapted** | 2 | `backgroundStyle`, `sectionDividerStyle` |
| **unsupported** | 4 | `pageBackgroundHex`, `contentWidth`, `coverHeight`, `coverOverlay` |

> **Note:** `backgroundStyle` and `sectionDividerStyle` appear under both "bounded" and "adapted" in some analyses. The definitive classification used in `POST_FEED_CAPABILITY_MAP` is **adapted** for both — they are supported but require an explicit transform from the page concept to the card concept.

### Final `POST_FEED_CAPABILITY_MAP` counts:
- `supported`: 14
- `bounded`: 5 (`fontSizeScale`, `headingScale`, `effectStyle`, `effectIntensity`, `avatarSize`, `sectionSpacing`)
- `adapted`: 4 (`backgroundStyle`, `sectionDividerStyle`, `effectStyle` page-variants, `sectionSpacing`)
- `unsupported`: 4 (`pageBackgroundHex`, `contentWidth`, `coverHeight`, `coverOverlay`)

---

## `sanitizeForPost` — Fields to Null

The `POST_UNSAFE_FIELDS` set in `lib/appearance/sanitize.ts` (Task 1) must include:

```typescript
const POST_UNSAFE_FIELDS = new Set([
  "pageBackgroundHex",  // page background — not a card concept
  "contentWidth",       // page column width — irrelevant in a feed card
  "coverHeight",        // EPK hero cover height — no equivalent in post card
  "coverOverlay",       // EPK hero overlay — no equivalent in post card
])
```

Fields in this set are forced to their defaults (`null` for hex fields, `"default"` for enum fields) when producing a post appearance snapshot.

---

## EPK Editor Controls → Post Surface Mapping

| Toolbar Section | Controls | Post-safe? | Notes |
|-----------------|----------|------------|-------|
| **Type** | Font family, Body size, Heading scale, Text preset, Custom text color | All ✅ (body size + heading: bounded) | Font family applies to post card via font CSS variable |
| **Colors** | Template palettes, Accent, Secondary accent, Page background, Card surface, Border color | Partial ⚠️ | Page background **skipped** in post snapshot |
| **Cards** | Card corners, Surface, Surface finish, Border strength, Button style, Button radius | All ✅ | Direct card applicability |
| **Layout** | Content width, Section spacing | Partial ⚠️ | Content width **unsupported**; section spacing **bounded** |
| **Photo** | Avatar shape, Avatar size | Both ✅ (size: bounded) | Author avatar in post header |
| **Cover** | Cover height, Cover overlay | Both ❌ | Classic/Cinema page-only; **unsupported** |
| **Effects** | Effect style, Intensity, Background mood, Hero media, Section dividers | Partial ⚠️ | Effect style: bounded; Background mood + dividers: adapted |
| **Template** | Layout skin selector | ✅ | Template ID is the post's `template_id` in `post_style_profiles` |
| **AI Style** | Full appearance generation | ✅ | Output JSON passed through same sanitize path |
