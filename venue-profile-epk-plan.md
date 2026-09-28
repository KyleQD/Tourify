# Venue Profile & Venue Kit Plan

## Top-Level Overview

This plan is **entirely additive** — no existing pages are removed or structurally replaced. Three parallel tracks of work:

1. **`/venue/edit` — Expanded Editor**
   Add new content fields (tagline, specs, amenities, upcoming shows, press, booking assets) and a new Appearance tab (template selector + full EpkAppearance customization). All new data is persisted back to `venue_profiles` and `venue_kit_settings`.

2. **`/venue/kit` + `/vk/[slug]` — New Venue Kit Feature**
   A new private builder page at `/venue/kit` where venue owners manage, preview, and publish their Venue Kit. The public output is `/vk/[slug]` — a clean, single-page, shareable and PDF-downloadable document (like a press kit) using the same 12 EPK templates. Data for the kit is entered in `/venue/edit`.

3. **`/venues/[slug]` — Enhanced Public Profile**
   The existing public profile is enhanced with richer sections (specs, amenities, upcoming shows, press, a "View Venue Kit" banner) and a more engagement-driven layout (sticky action bar, stats strip, stronger CTAs). The current tab structure and component files are **preserved and extended**, not replaced.

### Confirmed Design Decisions
- **"Venue Kit"** is the product name. Public URL: `/vk/[slug]`. DB table: `venue_kit_settings`.
- **`/vk/[slug]`** is a **single-page document** — all sections stack vertically, no tabs or nav. Designed to be shared and downloaded as PDF.
- **Same 12 EPK templates** (`modern`, `classic`, `minimal`, `bold`, `black`, `neon`, `sunset`, `cinema`, `gallery`, `luxe`, `poster`, `coastal`) reused directly.
- **`/venue/edit`** is where all content is entered and appearance is customized. `/venue/kit` is the management/preview/publish interface. `/vk/[slug]` is the read-only output.
- **`/venues/[slug]`** keeps its current structure — new sections are added, existing layout is enhanced.

---

## Data Flow

```
/venue/edit  (data entry + appearance)
  ├── Existing fields: name, bio, address, capacity, contact, social
  ├── NEW fields: tagline, specs, amenities, shows, press, booking assets
  ├── NEW appearance tab: template + EpkAppearance customization
  └── All saved to venue_profiles (profile fields) + venue_kit_settings (appearance/layout)
         ↓
/venue/kit  (builder/preview/publish management)
  ├── VkBuilderView: live preview of the document with drag-to-reorder sections
  ├── Status header: Live / Draft / Unsaved + Publish / Copy Link / Download PDF
  └── "Edit content" link → /venue/edit
         ↓
/vk/[slug]  (public, shareable, downloadable)
  └── VkDocument: single-page styled output using chosen template + appearance
        └── Download as PDF (html2pdf)

/venues/[slug]  (public profile — enhanced, not replaced)
  ├── Current: overview, specs (basic), events, gallery, reviews, contact tabs
  └── ENHANCED: better hero, sticky bar, stats strip, richer specs, amenities grid,
                upcoming shows, press section, "View Venue Kit" CTA banner
```

---

## Sub-Tasks

---

### Sub-Task 1 — Database: `venue_kit_settings` Table + `venue_profiles` New Columns

**Status:** `[ ] pending`

**Intent**
Add the persistence layer for all new data: enrich `venue_profiles` with content columns the VK sections need, and create the `venue_kit_settings` table for appearance, layout, and publish settings.

**Expected Outcomes**
- `venue_profiles` gains new nullable columns: `tagline`, `stage_dimensions`, `sound_system`, `lighting_rig`, `green_rooms`, `parking_spots`, `curfew`, `tech_rider_url`, `stage_plot_url`
- `venue_kit_settings` table created with full RLS policies
- Unique partial index on `vk_slug`
- Security advisors show no new issues after migration

**`venue_kit_settings` Schema**
```sql
id                  UUID PK
user_id             UUID NOT NULL → auth.users
venue_profile_id    UUID → venue_profiles (nullable for legacy)
theme               TEXT default 'dark'
template            TEXT default 'modern'
is_public           BOOLEAN default false
vk_slug             TEXT (unique partial where not null)
custom_domain       TEXT
seo_title           TEXT
seo_description     TEXT
use_vk_style_on_profile  BOOLEAN default false
settings            JSONB  -- vkFont, vkAppearance, sectionOrder, sectionVisibility
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

**Todo List**
1. Inspect current `venue_profiles` columns via `mcp__supabase__list_tables` to confirm which new columns are missing
2. Apply migration: add missing enrichment columns to `venue_profiles`
3. Apply migration: create `venue_kit_settings` table
4. Add RLS: owner CRUD (`user_id = auth.uid()`), public SELECT (`is_public = true`)
5. Add unique partial index: `CREATE UNIQUE INDEX ON venue_kit_settings (vk_slug) WHERE vk_slug IS NOT NULL`
6. Add unique partial index: `CREATE UNIQUE INDEX ON venue_kit_settings (venue_profile_id) WHERE venue_profile_id IS NOT NULL`
7. Run `mcp__supabase__get_advisors` (security type) to confirm no gaps

**Relevant Context**
- Artist equivalent migration: `supabase/migrations/20260327150000_artist_epk_settings_active.sql`
- Profile-scoped pattern: `supabase/migrations/20260715023000_profile_scoped_epk_settings.sql`
- Confirmed existing `venue_profiles` columns: `capacity_standing`, `capacity_seated`, `capacity_total`, `amenities TEXT[]`, `age_restrictions`, `operating_hours JSONB`, `contact_info JSONB`, `social_links JSONB`, `avatar_url`, `cover_image_url`, `settings JSONB`

---

### Sub-Task 2 — `VKData` Type & `VenueKitService`

**Status:** `[ ] pending`

**Intent**
Define the `VKData` TypeScript interface and build `lib/services/venue-kit.service.ts` — the venue equivalent of `lib/services/epk.service.ts`. This service is the single source of truth for loading, saving, and publishing Venue Kit data.

**Expected Outcomes**
- `VKData` interface exported covering all venue sections
- `VenueKitService` class with `loadVKData()`, `saveVKData()`, `getPublicVKData()`, `getVKSaveState()`
- `resolveVkSlugCandidate()` utility for unique slug generation
- Reuses `EpkAppearance` and `EpkFontId` types directly from the EPK library

**`VKData` Shape**
```
Identity:   venueName, tagline, bio, venueTypes[], location, website, avatarUrl, coverUrl
Specs:      capacityTotal, capacitySeated, capacityStanding, stageDimensions, soundSystem,
            lightingRig, loadingDock (bool), greenRooms, parkingSpots, curfew, ageRestrictions
Amenities:  amenities string[]  (same values stored in venue_profiles.amenities)
Media:      photos[] { id, url, caption, isHero }
Shows:      upcomingShows[] { id, date, artistName, ticketUrl, status }
Press:      press[] { id, title, outlet, url, date, excerpt }
Contact:    email, phone, bookingEmail, website, techRiderUrl, stagePlotUrl
Social:     social[] { id, platform, url, username }
Appearance: theme, template, vkFont (EpkFontId), vkAppearance (EpkAppearance), useVkStyleOnProfile
Publishing: isPublic, vkSlug, vkSlugUpdateMode, customDomain, seoTitle, seoDescription
Layout:     sectionOrder string[], sectionVisibility Record<string, boolean>
Meta:       venueProfileId, lastSavedAt
```

**Todo List**
1. Create `lib/services/venue-kit.service.ts`
2. Define and export `VKData` interface
3. Implement `loadVKData(venueProfileId, db)` — reads `venue_kit_settings` + joins `venue_profiles` for all identity/specs/contact/social fields
4. Implement `saveVKData(userId, vkData, db)` — upserts `venue_kit_settings` (appearance/layout/publish) + updates `venue_profiles` (profile content fields); handles slug resolution
5. Implement `getPublicVKData(slug, db)` — reads `venue_kit_settings` where `is_public = true` + joins `venue_profiles`; returns null if not found or private
6. Implement `getVKSaveState(userId, venueProfileId, db)` — returns `{ hasSavedVk, publicUrl, lastSavedAt, isPublic }`
7. Implement `resolveVkSlugCandidate({ userId, inputSlug, venueName, existingSlug, slugUpdateMode })` — mirrors `resolveEpkSlugCandidate()`

**Relevant Context**
- Mirror entirely: `lib/services/epk.service.ts` — `EPKData` interface, `EPKService` class, `resolveEpkSlugCandidate()`, `EpkSaveError`
- Reuse types: `lib/epk/epk-appearance.ts` → `EpkAppearance`; `lib/epk/epk-preview-utils.ts` → `EpkFontId`, `normalizeEpkFontId`, `isSectionVisible`, `normalizeEpkLayout`

---

### Sub-Task 3 — `useVKSync` Hook

**Status:** `[ ] pending`

**Intent**
Create `hooks/use-vk-sync.ts` — manages local VK state with dirty tracking, auto-save, and publish controls. Mirrors `hooks/use-epk-sync.ts`. This hook is consumed by both `/venue/edit` (appearance panel) and `/venue/kit` (builder/status header).

**Expected Outcomes**
- Returns: `vkData`, `updateVKData`, `saveVK`, `publishVK`, `unpublishVK`, `isSaving`, `isDirty`, `isPublished`, `savedPublicUrl`, `lastSavedAt`, `saveError`, `isLoading`
- Auto-save debounced ~2s after changes
- Loads on mount from `VenueKitService.loadVKData()`, seeds identity from `useProfile()` if new
- Re-seeds name/bio/avatar/cover when venue profile context updates

**Todo List**
1. Create `hooks/use-vk-sync.ts`
2. On mount: call `VenueKitService.loadVKData(venueProfileId)`, seed identity fields from `useProfile()` if first load
3. Implement `updateVKData(partial)` with dirty flag tracking
4. Implement debounced auto-save (~2s) calling `VenueKitService.saveVKData()`
5. Implement `saveVK()` — manual save with `isSaving` state
6. Implement `publishVK()` / `unpublishVK()` — flip `isPublic` then save immediately
7. Sync venue profile context changes (name, bio, avatar, cover) back into `vkData`

**Relevant Context**
- Mirror: `hooks/use-epk-sync.ts`
- Venue profile context: `app/venue/context/profile-context.tsx` → `useProfile()`

---

### Sub-Task 4 — Venue Kit Section Editor Components

**Status:** `[ ] pending`

**Intent**
Build the individual form panel components for each Venue Kit section. These live in `components/venue-kit/` and are consumed by `/venue/edit` (the data entry surface). Each receives `vkData` + `updateVKData` props.

**Expected Outcomes**
- `components/venue-kit/` directory with 9 section editors + 1 tab container
- Consistent with EPK editor section component API (`vkData`, `updateVKData`)
- Amenities section reusable in both the editor and the public profile amenities grid

**Section Components**
| File | Key Fields |
|------|-----------|
| `overview-section.tsx` | venueName, tagline (max 100 chars), bio, venueTypes[], website |
| `specs-section.tsx` | capacityTotal/Seated/Standing, stageDimensions, soundSystem, lightingRig, loadingDock (bool), greenRooms, parkingSpots, curfew, ageRestrictions |
| `amenities-section.tsx` | Toggle grid — 12 items with Lucide icons: Wi-Fi, Parking, ADA Accessible, Green Room, Sound System, Lighting Rig, Full Bar, Kitchen, Security, Coat Check, Merch Table, Livestream Setup |
| `shows-section.tsx` | Add/edit/delete rows: date, artistName, ticketUrl, status (upcoming / completed / cancelled) |
| `press-section.tsx` | Add/edit/delete rows: title, outlet, url, date, excerpt |
| `media-section.tsx` | Cover image, avatar, photo gallery (upload + reorder) |
| `contact-section.tsx` | email, phone, bookingEmail, techRiderUrl, stagePlotUrl |
| `social-section.tsx` | Platform select + URL per row (Instagram, Facebook, Twitter/X, YouTube, TikTok, Spotify, Bandcamp) |
| `vk-editor-tabs.tsx` | Tab container wiring all 8 sections; receives `vkData` + `updateVKData` |

**Todo List**
1. Create `components/venue-kit/overview-section.tsx`
2. Create `components/venue-kit/specs-section.tsx`
3. Create `components/venue-kit/amenities-section.tsx`
4. Create `components/venue-kit/shows-section.tsx`
5. Create `components/venue-kit/press-section.tsx`
6. Create `components/venue-kit/media-section.tsx`
7. Create `components/venue-kit/contact-section.tsx`
8. Create `components/venue-kit/social-section.tsx`
9. Create `components/venue-kit/vk-editor-tabs.tsx`

**Relevant Context**
- Mirror: `components/epk/epk-editor-tabs.tsx`, `components/epk/contact-section.tsx`, `components/epk/social-section.tsx`, `components/epk/shows-section.tsx`, `components/epk/music-section.tsx`
- Amenity icons: `lucide-react` — Wifi, Car, Accessibility, Music2, Lightbulb, Beer, UtensilsCrossed, ShieldCheck, Shirt, Radio, Video

---

### Sub-Task 5 — `/venue/edit` Expansion (New Fields + Appearance Tab)

**Status:** `[ ] pending`

**Intent**
Expand the existing `/venue/edit` page by adding:
1. All new VK content fields via the `vk-editor-tabs.tsx` section editors (Overview, Specs, Amenities, Shows, Press, Media, Contact, Social)
2. A new **Appearance** tab with template selector + full `EpkAppearance` panel
3. A `VkCommandHeader` status bar (same as EPK command header) for save/publish/copy-link actions
4. A "Venue Kit" card/link in the sidebar or within the page pointing to `/venue/kit`

The existing profile form fields (name, bio, address, capacity, contact) are **preserved** — the new tabs are added alongside them, not replacing them.

**Expected Outcomes**
- `/venue/edit` has a new section structure: existing basic fields (preserved) + new content tabs + new Appearance tab
- `VkCommandHeader` visible at top of page showing Live/Draft/Unsaved status
- `useVKSync` hook wired into the edit page
- New content tabs use `VkEditorTabs` component
- New Appearance tab uses template selector (12 EPK templates) + EpkAppearance controls
- All changes auto-save via `useVKSync`

**New Components Needed**
- `components/venue-kit/vk-command-header.tsx` — mirrors `EpkCommandHeader` from `app/artist/epk/page.tsx`; shows status pill + Save Draft / Publish / Unpublish / Copy Kit URL / Preview Kit / Download PDF actions
- `components/venue-kit/vk-appearance-panel.tsx` — wraps `EpkTemplateSelector` + full appearance controls (reuse from EPK); props: `vkData`, `updateVKData`

**Todo List**
1. Read `components/venue/edit-profile-content.tsx` fully to understand current field structure and layout
2. Read `app/venue/edit/page.tsx` (or wherever edit is routed) to understand page mounting
3. Build `components/venue-kit/vk-command-header.tsx`
4. Build `components/venue-kit/vk-appearance-panel.tsx` — reuse `components/epk/epk-template-selector.tsx` and EPK appearance controls
5. Mount `useVKSync` in the edit page component
6. Add `VkCommandHeader` at the top of the edit page layout
7. Add a "Venue Kit Content" section/card to the edit page that renders `VkEditorTabs`
8. Add an "Appearance" tab/section to the edit page that renders `VkAppearancePanel`
9. Add a "Venue Kit" link/banner in the edit page pointing to `/venue/kit` for preview + publish management
10. Confirm existing basic profile fields (name, bio, address, capacity, operating hours, contact, social) are untouched

**Relevant Context**
- Files to read first: `components/venue/edit-profile-content.tsx`, `app/venue/edit/page.tsx` (check which exists)
- Mirror command header: `app/artist/epk/page.tsx` → `EpkCommandHeader` component (lines 55–100)
- Template selector to reuse: `components/epk/epk-template-selector.tsx`
- EPK appearance panel to reuse: `components/epk/epk-appearance-ai-panel.tsx` or appearance controls in `components/epk/epk-builder-view.tsx`

---

### Sub-Task 6 — Venue Kit Document Renderer (`VkDocument`)

**Status:** `[ ] pending`

**Intent**
Build the single-page Venue Kit document renderer. This is the visual output — one long vertically-stacked page using the chosen EPK template and appearance settings. All sections render sequentially (no tabs, no navigation). Designed to look great both on screen and as a PDF.

**Key Constraint:** This is a **document**, not a website. The rendering follows the same pattern as the EPK preview/template system — venue-specific section content rendered into EPK template chrome.

**Expected Outcomes**
- `components/venue-kit/vk-document.tsx` — wraps `EpkPageChrome`, iterates `sectionOrder`, renders each visible section
- `components/venue-kit/vk-section-renderers.tsx` — one function per section key, venue-flavored content using EPK render context
- All 12 templates render correctly with venue data
- `EpkAppearance` system applied via `resolveEpkAppearanceForRender()` (reused directly)
- `epkFontClass()` applied for font selection (reused directly)
- `components/venue-kit/vk-pdf-export.tsx` — PDF download via `html2pdf`, filename `{vkSlug}-venue-kit.pdf`

**VK Section Renderers**
| Section Key | Content Description |
|------------|---------------------|
| `hero` | Full-bleed cover image; avatar circle; venue name + tagline; capacity badge; venue type pills; website + booking email in footer strip |
| `bio` | Styled description paragraph |
| `specs` | Two-column grid of labeled spec rows with icons (capacities, stage, sound, lighting, facilities) |
| `amenities` | Icon + label grid — available items highlighted, unavailable dimmed |
| `shows` | Chronological show list: date column + artist name + ticket link |
| `gallery` | 2–3 column responsive photo grid |
| `press` | Press mention cards: outlet badge + title + excerpt + date |
| `contact` | Contact block: email, phone, booking email; download buttons for tech rider + stage plot |
| `social` | Social platform icon row with links |

**Todo List**
1. Create `components/venue-kit/vk-section-renderers.tsx` — implement `renderVkSection(sectionKey, vkData, ctx)` and `createVkRenderCtx(vkData)`
2. Create `components/venue-kit/vk-document.tsx` — wraps `EpkPageChrome`, applies appearance + font, iterates `sectionOrder`, calls `renderVkSection` for each visible section
3. Implement hero renderer: cover image + avatar + name/tagline + capacity badge + type pills
4. Implement specs renderer: two-column grid with Lucide icons per row
5. Implement amenities renderer: icon grid, reuse `amenities-section.tsx` display logic (not edit logic)
6. Implement shows renderer: sorted ascending by date, each row: date | artist | ticket link
7. Implement gallery renderer: responsive photo grid
8. Implement press renderer: cards with outlet name as badge
9. Implement contact renderer: contact info block + asset download buttons
10. Implement social renderer: icon row
11. Create `components/venue-kit/vk-pdf-export.tsx` — dynamically imported PDF export using `html2pdf`, same pattern as `components/epk/EPKDocument.tsx`

**Relevant Context**
- Reuse entirely: `components/epk/epk-template-variants.tsx` → `EpkPageChrome`, `createEpkRenderCtx()`, `renderEpkSection()` (for reference on API shape)
- Reuse: `lib/epk/epk-appearance.ts` → `resolveEpkAppearanceForRender()`
- Reuse: `components/epk/epk-preview-fonts.tsx` → `epkFontClass()`
- Reuse: `components/epk/epk-ui-styles.ts` — shared style tokens
- Mirror PDF: `components/epk/EPKDocument.tsx`

---

### Sub-Task 7 — `/venue/kit` Private Builder Page

**Status:** `[ ] pending`

**Intent**
Create the new authenticated Venue Kit builder page at `/venue/kit`. This is where venue owners:
- Preview their kit as it will appear publicly
- Drag-and-drop to reorder sections
- Toggle section visibility
- Publish/unpublish the kit
- Copy the public URL
- Download PDF
- Navigate to `/venue/edit` to change content or appearance

This page is the **management interface** for the kit. Content and appearance are edited in `/venue/edit`. The builder here focuses on layout control and publishing.

**Expected Outcomes**
- `app/venue/kit/page.tsx` — authenticated page, mirrors structure of `app/artist/epk/page.tsx`
- `VkCommandHeader` shows Live/Draft/Unsaved status + Publish/Unpublish/Copy URL/Download/View Live actions
- `VkBuilderView` — drag-and-drop section reordering using `@dnd-kit`, wraps `VkDocument` with interactive overlays
- Toggle section visibility per section
- "Edit Content & Appearance" button links back to `/venue/edit`
- Route protected (venue account required)
- Nav link added to venue sidebar

**New Components**
- `components/venue-kit/vk-builder-view.tsx` — DnD wrapper around `VkDocument`; each section has a drag handle + visibility toggle; mirrors `components/epk/epk-builder-view.tsx`

**Todo List**
1. Create `app/venue/kit/page.tsx` as client component
2. Implement `VkBuilderView` in `components/venue-kit/vk-builder-view.tsx`:
   - Wire `DndContext` + `SortableContext` from `@dnd-kit/core` / `@dnd-kit/sortable`
   - Reuse `SortableEpkSection` (or create `SortableVkSection` wrapping same logic)
   - Reuse `EpkHiddenSectionsPanel` for collapsed hidden sections
   - Each section overlay shows drag handle + eye toggle
3. Mount `useVKSync` in the kit page
4. Render `VkCommandHeader` at top
5. Render `VkBuilderView` as main content
6. Add "Edit Content & Appearance →" link/button pointing to `/venue/edit`
7. Add `/venue/kit` to the venue sidebar navigation (read sidebar component first to find correct insertion point)
8. Confirm `/venue/kit` is protected by the existing venue auth guard in `app/venue/layout.tsx`

**Relevant Context**
- Mirror: `app/artist/epk/page.tsx` — full page structure, `EpkCommandHeader`, builder/editor modes
- DnD reuse: `components/epk/epk-builder-view.tsx`, `components/epk/sortable-epk-section.tsx`, `components/epk/epk-hidden-sections-panel.tsx`
- Venue sidebar: find the sidebar component used in `app/venue/layout.tsx` or `components/venue/`

---

### Sub-Task 8 — Public Venue Kit Page: `/vk/[slug]`

**Status:** `[ ] pending`

**Intent**
Create the public-facing Venue Kit page. A server component that fetches VK data, renders `VkDocument` read-only, provides a "Download PDF" button, and includes full SEO metadata + OG tags for social sharing.

**Expected Outcomes**
- `app/vk/[slug]/page.tsx` — server component, mirrors `app/epk/[slug]/page.tsx`
- Renders `VkDocument` at full page width with a minimal floating action bar (venue name, Download PDF, Share/copy link)
- `generateMetadata()` exports SEO title, description, and OG image (cover photo)
- Styled 404 fallback for missing or private kits
- View increment on page load

**Todo List**
1. Create `app/vk/[slug]/page.tsx` as server component
2. Call `VenueKitService.getPublicVKData(slug)` — returns null if not found or `is_public = false`
3. Return styled 404 state if null (dark gradient, "Venue Kit not found" message — match artist profile 404 style)
4. Implement `generateMetadata({ params })` — set title from `vkData.seoTitle || vkData.venueName`, description from `vkData.seoDescription`, OG image from `vkData.coverUrl`
5. Render `<VkDocument vkData={data} />` as the main content
6. Add a floating action bar (fixed top or bottom): venue name (small label) + "Download PDF" button + "Copy Link" button
7. Trigger view count increment server-side (direct DB update or call to `/api/venues/[id]/views`)

**Relevant Context**
- Mirror: `app/epk/[slug]/page.tsx`
- PDF export component: `components/venue-kit/vk-pdf-export.tsx` (built in Sub-Task 6)
- 404 style reference: `app/artist/[username]/page.tsx` not-found return block

---

### Sub-Task 9 — Enhanced Public Venue Profile: `/venues/[slug]`

**Status:** `[ ] pending`

**Intent**
Enhance the existing `/venues/[slug]` public profile page by adding new sections and upgrading the layout for engagement. The current component structure and tabs are **preserved** — new sections are added, the hero is upgraded, and a "View Venue Kit" banner is inserted. No existing sections are removed.

**Engagement Upgrades (Research-Backed)**
Artists visiting a venue profile need to quickly answer: *"Is this venue right for my act?"* The profile must surface the decision-making data fast:
- **Hero upgrade**: stronger CTA buttons, capacity badge + rating stars visible immediately, tagline shown
- **Sticky action bar**: appears after scrolling past hero — compact name + "Book" + "View Kit" buttons remain accessible
- **Stats strip**: total shows hosted, avg rating, response time — social proof at a glance
- **Specs section** (new): scannable technical spec grid — the most-requested info for booking decisions
- **Amenities grid** (new): icon tiles showing what's available — replaces/supplements the text-based amenities list
- **Upcoming shows** (new): signals active venue, creates urgency ("others are booking here")
- **Press section** (new): third-party credibility
- **"View Venue Kit" banner** (new): drives traffic to the shareable VK document
- **Contact section upgrade**: booking lead time + deposit info shown alongside contact details

**Expected Outcomes**
- Existing tabs (Overview, Events, Gallery, Reviews, Contact) preserved
- Hero section enhanced: tagline, capacity badge, rating display, stronger CTA buttons
- Sticky action bar added (appears on scroll past hero)
- Stats strip added below hero
- New "Technical Specs" tab or card added showing specs grid
- New "Amenities" section added (within Overview tab or as new card)
- New "Upcoming Shows" card added to Events tab
- New "Press" section added
- "View Venue Kit" banner added (only renders if `is_public = true` on `venue_kit_settings`)
- All new data read from the enriched `venue_profiles` columns added in Sub-Task 1

**New Components**
- `components/public-venue/public-venue-sticky-bar.tsx` — compact action bar (scroll-triggered)
- `components/public-venue/public-venue-stats-strip.tsx` — shows hosted, avg rating, response time
- `components/public-venue/public-venue-specs-card.tsx` — two-column spec grid
- `components/public-venue/public-venue-amenities-grid.tsx` — icon + label tiles
- `components/public-venue/public-venue-press-section.tsx` — press mention cards
- `components/public-venue/public-venue-kit-banner.tsx` — "View / Download Venue Kit" CTA (links to `/vk/[slug]`)

**Todo List**
1. Read `app/venues/[slug]/page.tsx` fully to understand current state + data fetching + tab structure
2. Read `components/profile/venue-profile-enhanced.tsx` to see what specs/amenities display already exists
3. Upgrade the hero section in `app/venues/[slug]/page.tsx`: add tagline display, capacity badge, avg star rating, stronger "Book" + "Message" CTA layout
4. Create and mount `public-venue-sticky-bar.tsx` — scroll listener, shows after hero, compact Book + Kit buttons
5. Create and mount `public-venue-stats-strip.tsx` — shows hosted (event count), avg rating, response rate (from venue settings if available)
6. Create `public-venue-specs-card.tsx` and add it to the Overview tab (or as a new "Specs" tab) — reads new `venue_profiles` spec columns
7. Create `public-venue-amenities-grid.tsx` and add it to Overview tab — reads `venue_profiles.amenities[]`
8. Add upcoming shows display to the Events tab (separate from past events) — fetch from existing events API
9. Create `public-venue-press-section.tsx` — add as new card in Overview or new "Press" tab; reads press data from VK settings if published
10. Create `public-venue-kit-banner.tsx` — check `venue_kit_settings` for `is_public = true`; if true, render prominent banner with link to `/vk/{vk_slug}` and a "Download PDF" button
11. Enhance contact tab: show booking lead time, deposit info from `venue_profiles.settings` if present

**Relevant Context**
- File to enhance (read first): `app/venues/[slug]/page.tsx` — currently ~890 lines, client component
- Existing venue profile enhanced component: `components/profile/venue-profile-enhanced.tsx` — has some specs/amenities already (with mock data); check for reusable display logic
- VK data to pull: query `venue_kit_settings` where `venue_profile_id = venue.id AND is_public = true` to get vk_slug + press data + appearance

---

## Execution Order

```
[1] DB Migration                          ← foundation for all data
      ↓
[2] VKData Type + VenueKitService         ← data layer
      ↓
[3] useVKSync Hook                        ← state management
      ↓
[4] VK Section Editor Components          ← UI building blocks
      ↓
[5] /venue/edit Expansion                 ← venues can now enter data + customize appearance
      ↓
[6] VkDocument Renderer                   ← document output
      ↓
[7] /venue/kit Builder Page               ← management interface
      ↓
[8] /vk/[slug] Public Page               ← shareable document goes live
      ↓
[9] Enhanced /venues/[slug] Profile       ← public profile enriched with new data
```

---

## Complete File List

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/..._venue_kit.sql` | DB: venue_kit_settings + venue_profiles new columns |
| `lib/services/venue-kit.service.ts` | VKData type + VenueKitService class |
| `hooks/use-vk-sync.ts` | VK state hook |
| `components/venue-kit/overview-section.tsx` | Editor: identity + tagline |
| `components/venue-kit/specs-section.tsx` | Editor: technical specs |
| `components/venue-kit/amenities-section.tsx` | Editor: amenity toggle grid |
| `components/venue-kit/shows-section.tsx` | Editor: upcoming shows |
| `components/venue-kit/press-section.tsx` | Editor: press mentions |
| `components/venue-kit/media-section.tsx` | Editor: cover/avatar/gallery |
| `components/venue-kit/contact-section.tsx` | Editor: contact + booking assets |
| `components/venue-kit/social-section.tsx` | Editor: social links |
| `components/venue-kit/vk-editor-tabs.tsx` | Tab container for all section editors |
| `components/venue-kit/vk-appearance-panel.tsx` | Template selector + EpkAppearance controls |
| `components/venue-kit/vk-command-header.tsx` | Status bar + action buttons |
| `components/venue-kit/vk-section-renderers.tsx` | Venue section render functions |
| `components/venue-kit/vk-document.tsx` | Single-page VK document component |
| `components/venue-kit/vk-pdf-export.tsx` | PDF download wrapper |
| `components/venue-kit/vk-builder-view.tsx` | DnD section reorder builder |
| `app/venue/kit/page.tsx` | Private Venue Kit builder page |
| `app/vk/[slug]/page.tsx` | Public shareable Venue Kit page |
| `components/public-venue/public-venue-sticky-bar.tsx` | Scroll-triggered action bar |
| `components/public-venue/public-venue-stats-strip.tsx` | Stats: shows hosted, rating |
| `components/public-venue/public-venue-specs-card.tsx` | Technical specs grid |
| `components/public-venue/public-venue-amenities-grid.tsx` | Amenity icon grid |
| `components/public-venue/public-venue-press-section.tsx` | Press mention cards |
| `components/public-venue/public-venue-kit-banner.tsx` | "View Venue Kit" CTA banner |

### Modified Files

| File | Change |
|------|--------|
| `app/venues/[slug]/page.tsx` | Enhance hero, add sticky bar, stats strip, specs card, amenities grid, shows, press, kit banner |
| `components/venue/edit-profile-content.tsx` or `app/venue/edit/page.tsx` | Add VkCommandHeader + VkEditorTabs (new content tabs) + VkAppearancePanel (new appearance tab) + useVKSync |
| Venue sidebar component (to be identified) | Add "Venue Kit" nav link → `/venue/kit` |
