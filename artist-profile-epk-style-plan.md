# Artist Profile EPK Style & Layout Overhaul

## Overview

Two parallel but related changes:

1. **EPK → Profile Style Sync**: Add a toggle card on the EPK overview page (`/artist/epk`) — positioned in the Overview tab's left column, below the One-Line Pitch card — that lets artists apply their EPK's current template/font/appearance to their public artist profile. When enabled, the profile automatically mirrors EPK styling instead of using the separately-configured Public Appearance settings.

2. **Public Profile Layout Restructure**: Reorder and improve the sections on the public artist profile page — removing the Share card, moving About to the top, moving Stats just below Socials, expanding the posts feed into a full social-feed style, and keeping music inline (repositioned).

These changes share the same theme/appearance infrastructure (`PublicArtistAppearance`, `EpkAppearance`, `artist_epk_settings`) and do not require new database tables.

---

## New Section Order (Public Artist Profile)

After this work, the public profile layout will be:

```
PublicArtistHero
  └─ Hero banner, avatar, name, genres, follow/message/book buttons

[Social Links — if configured]
  └─ "Connect" card with external social links

[Stats — moved up from bottom]
  └─ Followers, Monthly Listeners, Total Streams

[About / Bio — moved to top, if bio exists]
  └─ Artist biography

[Band Members — if band]

[Music Section — inline, repositioned]

[Storefront — if listings exist]

[Events Section]

[Work & Services — if not band]

[External Links — if storefront links exist]

[Member of — if organizations exist]

[Media Gallery — if media exists]

[Posts Feed — REDESIGNED as full social feed]

[EPK Preview — if not band]
```

**Removed:** `ProfileShareCard` (the "Share your profile" section is removed entirely).

---

## Sub-Tasks

---

### Sub-Task 1 — EPK Overview Page: "Apply EPK Style to Profile" Toggle Card

**Intent**
Add a new `<Card>` to the Overview tab of the EPK editor tabs component, positioned in the left column immediately after the One-Line Pitch card (after line ~666 in `components/epk/epk-editor-tabs.tsx`, before the closing `</div>` of the left column). The card contains a single toggle switch and description. When enabled, it writes the EPK's current `template`, `epkFont`, and `epkAppearance` into the `public_appearance` field of `artist_epk_settings.settings`. When on, saving the EPK or any EPK appearance change also updates the public profile appearance to match. When off, the public profile appearance is managed independently via the existing Public Appearance panel.

This reuses the existing persistence path (`PUT /api/artist/public-appearance`) and the existing `PublicArtistAppearance` type — it simply sources the values from the EPK's own appearance state rather than a separate editor.

**Expected Outcomes**
- A new card labeled "Apply EPK Style to Profile" appears in the Overview tab left column, directly below the One-Line Pitch card
- Card contains: title, short description ("Your public artist page will use the same visual style as your press kit"), and a Switch toggle
- When toggled ON, `PUT /api/artist/public-appearance` is called immediately with the current EPK's `{ template, epkFont, epkAppearance }`
- When the EPK is saved while toggle is ON, the public profile appearance is also updated to match the EPK
- When toggled OFF, the public profile appearance is left as-is; the standalone Public Appearance panel resumes control
- The toggle state (`use_epk_appearance_on_profile: boolean`) is persisted in `artist_epk_settings.settings` and loaded on page return

**Todo List**
1. Add `use_epk_appearance_on_profile: boolean` to the `EPKData` type (or the settings JSONB shape) with a default of `false` in `DEFAULT_EPK_DATA`
2. Wire the new field into the EPK page state/load/save cycle in `app/artist/epk/page.tsx` so it persists with the rest of EPK data
3. Add the toggle card JSX to the Overview tab left column in `components/epk/epk-editor-tabs.tsx` — after the One-Line Pitch `</Card>` (line ~666) and before the column's closing `</div>`. Pass `useEpkStyleOnProfile` value and `onUseEpkStyleOnProfileChange` handler as props
4. Add the new props (`useEpkStyleOnProfile`, `onUseEpkStyleOnProfileChange`) to the `EpkEditorTabsProps` interface
5. In the toggle's `onCheckedChange` handler: when turned ON, immediately call `PUT /api/artist/public-appearance` with `{ template: epkData.template, epkFont: epkData.epkFont, epkAppearance: epkData.epkAppearance }`
6. In the EPK save logic (`app/artist/epk/page.tsx` save handler or `lib/services/epk.service.ts`), after saving EPK data, check if `use_epk_appearance_on_profile` is true; if so, call `PUT /api/artist/public-appearance` with the EPK's current appearance values
7. Style the card consistently with the surrounding cards in the Overview tab (use `epkSurface`, `border-white/10` classes already in use)

**Relevant Context**
- `components/epk/epk-editor-tabs.tsx` — Insert new card after line ~666 (after One-Line Pitch `</Card>`, before left column's closing `</div>`). Overview tab left column uses `space-y-4` div. Existing cards use `<Card className={\`${epkSurface} border-white/10\`}>` pattern
- `app/artist/epk/page.tsx` lines 750-771 — `EpkEditorTabs` render with its 21 props; new props need to be added here
- `lib/services/epk.service.ts` — EPK save logic where the appearance sync call should be injected
- `lib/epk/epk-appearance.ts` — `EpkAppearance` type and defaults
- `app/api/artist/public-appearance/route.ts` — PUT endpoint that accepts `{ template, epkFont, epkAppearance }`
- `components/settings/artist-public-appearance-panel.tsx` — No changes in this sub-task (handled in Sub-Task 4)

**Status:** [x] done

---

### Sub-Task 2 — Public Profile: Remove Share Card & Restructure Top Sections

**Intent**
Remove the `ProfileShareCard` component from the public artist profile page, then reorder the top-of-page sections so the layout flows: Hero → Social Links → Stats → About. This makes the profile feel more like a professional artist page (immediate context about who the artist is) rather than a utility sharing tool.

**Expected Outcomes**
- `ProfileShareCard` is no longer rendered on the public artist profile page
- The Stats card (followers, listeners, streams) appears immediately after the Social Links section
- The About/Bio card appears immediately after the Stats card
- All other sections below About remain in roughly the same relative order (band members, music, storefront, events, work & services, external links, member of, media gallery, posts, EPK preview)
- The profile still works for both band and non-band artist types

**Todo List**
1. In `components/public-artist/public-artist-page.tsx`, remove the `<ProfileShareCard>` JSX block (currently lines ~292-298, the first element inside `main.paShell`)
2. Remove the `ProfileShareCard` import if it becomes unused elsewhere in the file
3. Cut the Stats `<section>` block (currently lines ~635-659) and paste it to appear right after the Social Links section (currently lines ~269-289) and before Band Members
4. Cut the About/Bio `<section>` block (currently lines ~547-558) and paste it to appear right after the Stats section
5. Confirm the conditional render for About (`if about.bio`) is preserved in the new position
6. Verify Stats renders correctly for both band and non-band profiles (it is currently unconditional — keep it that way)

**Relevant Context**
- `components/public-artist/public-artist-page.tsx` — Main file, all changes in the JSX return
- `components/profile/profile-share-card.tsx` — Component being removed from profile (file stays, just no longer used here)
- `components/public-artist/public-artist-page.tsx` — all changes are in the JSX return of this single file
- Stats section currently at lines ~635-659
- About section currently at lines ~547-558
- Share card currently at lines ~292-298
- Social Links section currently at lines ~269-289 — Stats moves to just after this block

**Status:** [x] done

---

### Sub-Task 3 — Public Profile: Posts Feed Redesign (Full Social Feed Style)

**Intent**
Replace the current compact posts preview (`PublicArtistPostsSection`) with a full social-feed style layout. Posts should appear as larger, engagement-rich cards — showing media prominently, like/comment/share counts, timestamp, and a pin badge — similar to how a Twitter/Instagram profile presents posts. `PublicArtistPostDTO` already has all required fields (`likesCount`, `commentsCount`, `sharesCount`, `mediaUrls`, `isPinned`, `content`, `createdAt`, `hashtags`). The feed position stays after media gallery, before EPK preview.

**Expected Outcomes**
- Posts render as full-width feed cards with: post text, media images (if any), engagement counts (likes, comments, shares with icons), relative timestamp, and a pin badge for pinned posts
- A section header "Posts" (or "From {artistName}") appears at the top of the section
- Pinned posts still appear first with a visible pin indicator
- Hashtags are rendered in accent color within the post text or as tags below
- The section renders nothing when both `posts` and `pinnedPosts` are empty (no empty-state card needed)
- Each post card uses `paCard` + `themedUi.cardStyle` so it inherits the EPK appearance when the sync toggle is on

**Todo List**
1. Read `components/public-artist/posts/public-artist-posts-section.tsx` in full to understand current render structure and any existing sub-components
2. Create a `PublicArtistPostFeedCard` component (in the same `posts/` directory) — a full-width card with: author header (avatar-less, just artist name + timestamp), post text content, media grid (up to 4 images in a 2×2 grid), engagement row (Heart icon + `likesCount`, MessageCircle + `commentsCount`, Share2 + `sharesCount`), pin badge if `isPinned`, hashtag list. Apply `paCard` + `themedUi.cardStyle` styling
3. Refactor `PublicArtistPostsSection` to: add a "Posts" section header (same `CardTitle` style as other sections), render a vertical `space-y-4` list of `PublicArtistPostFeedCard` items (pinned posts first, then regular), and return `null` if no posts at all
4. Pass `themedUi` (or just `cardStyle` + `paCard` + `paInset`) down as props to `PublicArtistPostsSection` so cards can be themed — update the component's props interface and the call site in `public-artist-page.tsx`
5. Remove any old compact post-preview markup from `PublicArtistPostsSection` that is replaced by the new card component

**Relevant Context**
- `components/public-artist/posts/public-artist-posts-section.tsx` — File to refactor (lines ~1-150)
- `PublicArtistPostDTO` in `lib/public-artist/public-artist-types.ts` lines 156-180 — All needed fields confirmed present: `content`, `mediaUrls`, `likesCount`, `commentsCount`, `sharesCount`, `isPinned`, `createdAt`, `hashtags`, `type`
- `themedUi.cardStyle`, `paCard`, `paInset` from `components/public-artist/public-artist-ui.ts` — Use these for theming
- `components/public-artist/music/public-artist-music-section.tsx` — Reference for themed card pattern in this system
- Heart, MessageCircle, Share2 icons from `lucide-react` — already used in the current posts component
- Feed stays at same position in page: after media gallery, before EPK preview

**Status:** [x] done

---

### Sub-Task 4 — EPK Builder: Public Appearance Panel Awareness of Sync State

**Intent**
Update the existing Public Appearance settings panel (`artist-public-appearance-panel.tsx`) to surface a notice when the "Apply EPK style to profile" toggle is active. When sync is on, the panel should show an informational banner indicating that appearance is being controlled by the EPK settings, with a link to the EPK builder — preventing user confusion about why their manual changes don't persist.

**Expected Outcomes**
- When `use_epk_appearance_on_profile` is `true` in the artist's EPK settings, the Public Appearance panel shows a banner: "Your public profile appearance is synced with your EPK. Changes made here will be overwritten when you save your EPK. [Edit in EPK Builder →]"
- When sync is off, the panel behaves exactly as today
- The banner is read-only (no action required, just informational) with a link to `/artist/epk`

**Todo List**
1. Update `GET /api/artist/public-appearance/route.ts` to also return the `use_epk_appearance_on_profile` boolean from `artist_epk_settings.settings` (alongside the existing `template`, `epkFont`, `epkAppearance` fields)
2. In `artist-public-appearance-panel.tsx`, read the new `useEpkStyleOnProfile` field from the GET response
3. If `useEpkStyleOnProfile` is true, render an informational callout/banner at the very top of the panel (above all controls): "Your profile appearance is synced with your EPK. Changes here will be overwritten on your next EPK save. [Edit in EPK Builder →]" — link to `/artist/epk`
4. No functional blocking: all existing controls remain interactive; this is informational only

**Relevant Context**
- `components/settings/artist-public-appearance-panel.tsx` — Panel to update
- `app/api/artist/public-appearance/route.ts` — GET endpoint to update to return the flag
- `artist_epk_settings.settings` JSONB — Where `use_epk_appearance_on_profile` is stored

**Status:** [x] done

---

## Non-Goals

- No new database tables or schema migrations required
- No changes to the EPK public page (`/epk/[slug]`)
- The `ProfileShareCard` component file is not deleted — it may be used elsewhere
- No changes to the EPK appearance editing controls themselves (template selector, color pickers, etc.)
- No pagination/infinite scroll for the posts feed in this pass (keep it simple)
- No changes to band-type profiles beyond what naturally falls out of the layout reorder

---

## Implementation Order

Sub-tasks are designed to be implemented in order:
1. **Sub-Task 1** first (EPK toggle) — establishes the sync mechanism
2. **Sub-Task 2** (remove share card, reorder sections) — purely structural, safe to do independently
3. **Sub-Task 3** (posts feed redesign) — visual enhancement, builds on the themedUi system
4. **Sub-Task 4** (public appearance panel awareness) — final polish, depends on Sub-Task 1's new flag
