# Venue Profile Pages — Audit & Improvement Plan

## Top-Level Overview

A deep, evidence-based audit of every venue-facing page and flow in the `/venue/**` and `/venues/**` routes was conducted by reading actual file contents. The audit surfaced six distinct categories of gaps that span broken user flows, missing persistence, stub UI that renders no content, and incomplete form wiring. All six categories are broken down into focused sub-tasks below.

The goal of this plan is to **complete every incomplete user flow** and **fix every missing or broken piece of functionality** so that the venue operator experience is production-ready end-to-end.

---

## Sub-Tasks

---

### Sub-Task 1 — Fix Avatar Upload in Edit Profile

**Status**: `[ ] pending`

**Intent**
The avatar upload in `edit-profile-content.tsx` is a stub that generates a random placeholder URL instead of opening a real file picker and uploading to Supabase Storage. This means a venue operator can never set their own profile photo.

**Expected Outcomes**
- Clicking the avatar produces a real `<input type="file">` file picker
- The selected image is uploaded to Supabase Storage under the `avatars/` bucket (or equivalent)
- The returned public URL is saved to the profile via `updateProfile()`
- The avatar shown in the shell and overview page updates immediately after save

**Todo List**
1. Read `app/venue/components/edit-profile-content.tsx` lines 220–245 to confirm exact stub code
2. Replace the stub avatar click handler with a hidden `<input type="file" accept="image/*">` ref
3. On file select, upload to Supabase Storage (`supabase.storage.from('avatars').upload(...)`) and get the public URL
4. Call `updateProfile({ avatar_url: publicUrl })` with the returned URL
5. Show upload progress (loading spinner on the avatar circle) and an error toast on failure
6. Verify the new avatar is reflected in `useCurrentVenue()` and the shell header

**Relevant Context**
- File: `app/venue/components/edit-profile-content.tsx` (lines ~220–240)
- Hook: `app/venue/hooks/useCurrentVenue.ts` — `updateVenue()`
- Storage bucket: check existing avatar/image upload patterns in `lib/services/venue.service.ts`

---

### Sub-Task 2 — Add Equipment: Wire Missing Modal Dialog

**Status**: `[ ] pending`

**Intent**
The Equipment page (`/venue/equipment`) has an "Add Equipment" button that sets `isAddModalOpen = true`, but there is no `<Dialog>` or modal component rendered in the JSX for that state. The button is a dead end — clicking it does nothing visible to the user.

**Expected Outcomes**
- Clicking "Add Equipment" opens a modal with fields: name, category, condition, quantity, rental value, notes, last maintenance date
- Submitting the form calls `venueService.addVenueEquipment(venueId, data)` or a new `/api/venue/equipment` POST endpoint
- The equipment list refreshes after successful submission
- Validation prevents submitting with empty required fields

**Todo List**
1. Read `app/venue/equipment/page.tsx` fully to see the existing state/handler scaffolding
2. Check if a `VenueAddEquipmentModal` or similar component already exists in the codebase; if so, import and render it
3. If no component exists, create a `<Dialog>` inside the page with the required form fields
4. Wire the form submit to the appropriate service/API call that persists to `venue_equipment` table
5. Ensure the equipment list re-fetches after successful add (call refresh)
6. Check if edit/delete actions on existing equipment rows also have wired handlers or need similar fixes

**Relevant Context**
- File: `app/venue/equipment/page.tsx` (line ~237 — the Add Equipment button, and the QR modal at lines ~664–700 as a pattern to follow)
- Service: `lib/services/venue.service.ts` — `getVenueEquipment()`; check if `addVenueEquipment()` / `updateVenueEquipment()` exist
- API: check if `/api/venue/equipment` route exists; if not, create it

---

### Sub-Task 3 — Finances: Persist Manual Transactions to Database

**Status**: `[ ] pending`

**Intent**
The "Add Transaction" form on the Finances page (`/venue/finances`) currently writes manual transactions only to local React state (`manualTransactions`). There is no API call or Supabase insert, so all manually-added transactions are lost on page refresh. This makes the manual transaction feature useless for real financial record-keeping.

**Expected Outcomes**
- Submitting the "Add Transaction" form POSTs to a persistent API endpoint
- Saved transactions survive page reload and are visible to all venue admins
- Existing transaction list merges real booking-derived, ticketing, and manual transactions from the database
- A delete/void action on manual transactions is available

**Todo List**
1. Read `app/venue/finances/page.tsx` lines 274–318 to confirm the local-only submit handler
2. Identify the correct table to persist manual transactions (check if `venue_manual_transactions` or `venue_finances` table exists in migrations)
3. If no table exists, create a migration for `venue_manual_transactions` with columns: id, venue_id, amount, description, category, date, created_by, created_at
4. Create or extend `/api/venue/finances` route with POST (create) and GET (list) endpoints
5. Update the submit handler in `finances/page.tsx` to call the API endpoint and refresh the transaction list
6. Update the data fetch on page load to include manual transactions from the API alongside booking/ticketing sources

**Relevant Context**
- File: `app/venue/finances/page.tsx` (lines ~274–318 for submit; lines ~183–240 for existing data fetch logic)
- Migrations: `supabase/migrations/` — check for any existing finance-related migrations
- Pattern: follow how booking transactions are fetched from `venueService.getVenueBookingRequests()` as a model

---

### Sub-Task 4 — Event Ops Tabs: Implement People, Logistics, Communications, and Money Tabs

**Status**: `[ ] pending`

**Intent**
The Event Operations page (`/venue/events/[id]`) has 8 tabs. Only 2 (Overview, Tickets) show real content — the other 4 that represent meaningful operational data (People, Logistics, Communications, Money) are empty-state stubs that just link away to other pages. This breaks the "ops hub" promise of having all event context in one place.

**Gaps per tab:**
- **People** — shows empty state + link to Scheduling. Should show: staff assigned to this event, their roles, shift times
- **Logistics** — shows links to Equipment and Site Maps. Should show: equipment assigned to this event and which site map is active
- **Communications** — shows link to Messages. Should show: message thread for this event specifically
- **Money** — shows link to Finances. Should show: revenue summary for this event (ticket sales + booking budget)
- **Advancing** — shows link to Documents. Should show: documents tagged to this event (rider, contract, etc.)

**Expected Outcomes**
- People tab: displays staff assigned to this specific event (filtered from shifts by event_id)
- Logistics tab: displays equipment items assigned to this event and the active site map
- Money tab: displays event-specific revenue (from ticketing data already fetched + booking budget)
- Communications tab: shows a filtered message thread or conversation tied to this event's booking
- Advancing tab: shows documents tagged to this event (filtered from venue documents)

**Todo List**
1. Read `app/venue/events/[id]/page.tsx` fully to understand the data already fetched (ticketing data is available on lines 66–89)
2. For the **Money tab**: use the already-fetched ticketing data to render an inline revenue breakdown (gross revenue, tickets sold, avg ticket price, booking budget range); remove the "link away" stub
3. For the **People tab**: fetch `/api/venue/shifts` filtered by event date range; display assigned staff with name, role, and shift time; show empty state with link to Scheduling if no shifts exist
4. For the **Logistics tab**: fetch `venueService.getVenueEquipment()` and render all equipment items with condition badges; fetch the site map from `/api/site-maps/shared?venue_id=` and render a mini preview or link to the full viewer
5. For the **Advancing tab**: fetch `venueService.getVenueDocuments()` filtered by event (if `event_id` FK exists) or by date proximity; show document type, name, and download link
6. For the **Communications tab**: check for a `venue_booking_requests` row tied to this event's name or date; surface the requester contact info and request thread; show empty state if no booking exists

**Relevant Context**
- File: `app/venue/events/[id]/page.tsx` (lines 284–374 for stub tab content)
- Ticketing data already fetched at lines 66–89 — reuse for Money tab
- Staff/shifts: `app/venue/hooks/use-venue-events.ts`, `/api/venue/shifts`
- Documents: `lib/services/venue.service.ts` — `getVenueDocuments()`

---

### Sub-Task 5 — Settings Page: Audit and Complete Venue-Specific Settings

**Status**: `[ ] pending`

**Intent**
The Settings page (`/venue/settings`) delegates entirely to `EnhancedSettingsLayout`, `AccountScopedSettings`, and `VenueSettingsPublicLink`. The outer layout is just a gradient wrapper. The actual settings surfaced are unknown without reading the delegated components. This task is to audit what settings currently exist, identify what venue-specific settings are missing, and implement the gaps.

**Key settings that a venue operator needs:**
- Booking request toggle (enable/disable new requests)
- Default response message for booking confirmations
- Notification preferences (email/push for new bookings, messages, reviews)
- Public profile visibility (is_public toggle)
- Venue type / capacity edits (if not in edit profile)
- Connected payment method (for payouts)

**Expected Outcomes**
- Audit of `AccountScopedSettings` and `VenueSettingsPublicLink` components is complete
- At minimum, `is_public` toggle and `booking_enabled` toggle are functional and persist to `venue_profiles.settings` JSONB
- Notification preferences section exists with toggles that persist to user preferences
- Settings page does not show generic/artist-profile settings that don't apply to venue accounts

**Todo List**
1. Read `components/settings/account-scoped-settings.tsx` and `components/venue/venue-settings-public-link.tsx` fully
2. Document what settings currently exist and which are functional vs decorative
3. Identify venue-specific settings that are missing (see list above)
4. Add `is_public` toggle if missing — persists to `venue_profiles.is_public` via `venueService.updateVenueProfile()`
5. Add booking enable/disable toggle — persists to `venue_profiles.settings.booking_enabled`
6. Add notification preferences section — persists to user-level notification settings
7. Remove or hide any artist/musician-specific settings that appear in the venue context

**Relevant Context**
- File: `app/venue/settings/page.tsx`
- Components to audit: `components/settings/account-scoped-settings.tsx`, `components/venue/venue-settings-public-link.tsx`
- Service: `lib/services/venue.service.ts` — `updateVenueProfile()` accepts `settings` JSONB field
- DB: `venue_profiles.is_public`, `venue_profiles.settings`

---

### Sub-Task 6 — Public Venue Profile: Add Reviews Tab and Gallery Tab

**Status**: `[ ] pending`

**Intent**
The public venue profile (`/venues/[slug]`) has 5 tabs: Overview, Events, Amenities, Posts, Contact. There are no Reviews or Gallery tabs, even though the database has a `venue_reviews` table with a rating/comment system, and venues can have cover images and document uploads that could serve as a gallery. Prospective event organizers need to see social proof (reviews) and visual content (gallery) when evaluating a venue.

**Expected Outcomes**
- A **Reviews** tab is added to the public venue profile showing: star rating summary, individual reviews with author name, date, rating, and comment, and a "Write a review" CTA for logged-in users who have booked the venue
- A **Gallery** tab is added showing the venue's cover image, any photo documents tagged as gallery items, or a placeholder "No photos yet" state
- Reviews can be submitted via a form that POSTs to an existing or new review endpoint
- The venue's aggregate star rating is visible in the header area

**Todo List**
1. Read `app/venues/[slug]/page.tsx` lines 1–600 fully to understand the existing tab structure
2. Check if `venue_reviews` has an API route (`/api/venues/[id]/reviews`) — if not, create GET (list) and POST (submit) endpoints; include `response_from_venue` and `responded_at` in the response schema
3. Add a **Reviews** tab to the public profile (`/venues/[slug]`) that:
   - Fetches reviews via GET `/api/venues/[venueId]/reviews`
   - Renders aggregate star rating summary (average + count per star level)
   - Renders individual review cards (author avatar, name, date, star rating, comment)
   - Shows the official venue response beneath each review card where `response_from_venue` is set
   - Shows a "Leave a Review" form for authenticated users who have submitted a booking request to this venue
   - POSTs new reviews and refreshes the list on success
4. Add a venue operator **Respond to Review** flow in the dashboard:
   - Add a Reviews section to `app/venue/overview/page.tsx` (or a new `/venue/reviews` page) listing all reviews with a "Respond" button on each
   - The respond action PATCHes `venue_reviews.response_from_venue` and `venue_reviews.responded_at` via `/api/venue/reviews/[id]`
   - The public profile then shows the response under the corresponding review card
5. Add a **Gallery** tab to the public profile that:
   - Fetches public image documents (`is_public = true`, `mime_type LIKE 'image/%'`) via `venueService.getVenueDocuments()`
   - Renders a responsive image grid (cover image + any uploaded gallery photos)
   - Shows "No photos yet" empty state if no gallery content exists
6. Update the tabs array in `app/venues/[slug]/page.tsx` to include Reviews and Gallery
7. Surface the aggregate star rating in the public venue header (e.g., "4.7 ★ · 23 reviews")

**Relevant Context**
- File: `app/venues/[slug]/page.tsx` (tabs array around line 376–382)
- DB: `venue_reviews` table (columns: rating, title, comment, reviewer_id, is_verified, response_from_venue)
- Pattern: check how existing review systems work in the codebase (grep for `venue_reviews`)
- Gallery assets: `venueService.getVenueDocuments()` filtered to `is_public = true` and `mime_type LIKE 'image/%'`

---

### Sub-Task 7 — Remove Debug Logs and Clean Up Production Code

**Status**: `[ ] pending`

**Intent**
The audit found multiple `console.log` debug statements left in production-facing code paths. These log sensitive data and create noise in production monitoring.

**Specific findings:**
- `app/venue/hooks/useCurrentVenue.ts` — `console.log('Updating venue with database fields:', dbUpdates)` (exposes update payload)
- `components/user-card.tsx` — `console.log("Sending connection request to:", userId)` (exposes user IDs)
- `components/venue/venue-team-communications-panel.tsx` — bare `console.error(e)` in a catch block

**Expected Outcomes**
- All identified `console.log` debug statements are removed
- `console.error` calls in catch blocks are replaced with proper error handling (either a toast notification or a structured error logger)
- No user data or internal payloads are logged to the browser console in production paths

**Todo List**
1. Remove `console.log('Updating venue with database fields:', dbUpdates)` from `useCurrentVenue.ts`
2. Remove `console.log("Sending connection request to:", userId)` from `user-card.tsx`
3. Replace bare `console.error(e)` in `venue-team-communications-panel.tsx` with a proper error toast or structured handling
4. Run a final grep for `console.log` across `app/venue/` and `hooks/use-venue.ts` to confirm no remaining debug logs

**Relevant Context**
- `app/venue/hooks/useCurrentVenue.ts` (line ~213)
- `components/user-card.tsx` (line ~36)
- `components/venue/venue-team-communications-panel.tsx` (line ~53)

---

## Priority Order

| # | Sub-Task | Impact | Effort |
|---|----------|--------|--------|
| 1 | Sub-Task 2 — Add Equipment Modal | High | Low |
| 2 | Sub-Task 3 — Finances Persistence | High | Medium |
| 3 | Sub-Task 1 — Avatar Upload | High | Low |
| 4 | Sub-Task 4 — Event Ops Tabs | High | Medium |
| 5 | Sub-Task 6 — Reviews + Gallery | Medium | Medium |
| 6 | Sub-Task 5 — Settings Audit | Medium | Medium |
| 7 | Sub-Task 7 — Debug Log Cleanup | Low | Low |

---

## Out of Scope

- Staff Training & Development module (intentionally unavailable, Phase 9+)
- Staff Performance Management (intentionally unavailable, Phase 9+)
- Staff Analytics stub (intentionally unavailable, Phase 9+)
- Social / music / EPK / feed routes (debt routes intentionally redirecting to dashboard)
- Advanced real-time analytics (data quality is a data ingestion problem, not a UI problem)
- Payment processor integration (requires separate payment provider work)
