# Phase 3 — Tours + Advancing Workspace + Day Sheets + Calendar Sync

> **Goal:** Complete the tour management workflow, then add the three industry-standard pro features that event/tour managers rely on daily: an advancing workspace (per-show riders and tech specs), auto-generated day sheets/itineraries, and calendar sync (iCal/Google/Outlook subscriptions).

---

## 3.1 Tour Planner: draft save & resume

**Current state:** `app/admin/dashboard/tours/planner/page.tsx` — publish works but there is no draft save/resume. The planner has steps: Tour Initiation, Routing & Dates, Artists & Crew, Events, Review & Publish.

**Tasks:**

1. Add `status: 'draft'` writes to `POST /api/admin/tours` on each step advance (same pattern as Phase 2.1 for events).
2. On planner mount, check URL `?draft=<tour_id>`. If present, call `GET /api/admin/tours/<id>` and hydrate all form steps.
3. Add a "drafts" banner on the tours list page: "You have N drafts in progress" → links to `/admin/dashboard/tours/planner?draft=<id>`.
4. Persist all planner fields to the `tours` table:
   - Tour Initiation step: `name`, `description`, `genre`, `org_id`, `cover_image_url`, `status: 'draft'`
   - Routing & Dates step: `start_date`, `end_date`, `routing` (jsonb array of cities/venues)
   - Artists & Crew step: write to `tour_team_members` with `role`, `user_id`
   - Events step: write to `tour_events` linking `tour_id` + `event_id`
   - Review: no additional data

**Done when:** Partial tour draft survives a page refresh and can be resumed from the tours list.

---

## 3.2 Tour Planner: cover image upload

**Current state:** Cover image upload may use a URL input. Needs to upload to Supabase Storage.

**Tasks:**

1. Add a file input to the Tour Initiation step for cover image.
2. On file select: upload to Supabase Storage bucket `tour-covers` using the admin client. Get the public URL.
3. Store the URL in `tours.cover_image_url`.
4. Show image preview with a "Change" button.
5. Accepted formats: JPEG, PNG, WebP. Max size: 10MB. Show error for oversized files.

**Done when:** Uploading a cover image in the planner shows a preview and the tours list/detail shows the image.

---

## 3.3 Tour Planner: interactive route map

**Current state:** `app/admin/dashboard/tours/planner/components/routing-dates-step.tsx` has a placeholder route map.

**Tasks:**

1. Replace the placeholder with a sortable list of tour stops (drag-to-reorder using `@dnd-kit/sortable`). Each stop: city, venue name, event date, load-in time.
2. For each stop, the venue name links to a venue picker (same component from Phase 2.2).
3. Each stop can be linked to an existing `events_v2` record via an event search picker.
4. The stop list writes to `tours.routing` as a jsonb array: `[{ order: 1, city: "Austin", venue: "Stubb's", event_date: "2026-08-15", event_id: "uuid" }]`.
5. Show a static map image using Mapbox Static Images API (or Google Maps Static API) showing the route pins. Use `NEXT_PUBLIC_MAPBOX_TOKEN` env var. If no token, show a simple ordered list instead (graceful degradation).

**Done when:** Tour stops can be added, reordered, and saved; map pins show the route.

---

## 3.4 Tour Detail: PDF export

**Current state:** `app/admin/dashboard/tours/[id]/page.tsx` has a PDF export button that is a stub.

**Tasks:**

1. Create `GET /api/admin/tours/[id]/export?format=pdf`.
2. Build an HTML template including: tour name, date range, artist(s), all shows (date, venue, city), contact sheet for each venue, financial summary, team roster.
3. Return as `application/pdf` using `@vercel/og` or a Node.js PDF library.
4. Wire the export button to trigger download.

**Done when:** Clicking "Export PDF" on a tour with at least 3 shows downloads a readable PDF.

---

## 3.5 Tour Detail: ticket-type management

**Current state:** Tour may not have per-tour ticket tier management.

**Tasks:**

1. Add a "Ticket Types" tab to the tour detail page.
2. Show ticket tiers that are linked to this tour (via `ticket_tiers.tour_id`).
3. Allow creating/editing/deleting tour-level ticket tiers (these propagate to all events in the tour as defaults).
4. Show aggregate ticket sales across all tour events: total sold, total revenue, per-show breakdown.

**Done when:** Tour ticket tiers can be managed; aggregate sales displayed.

---

## 3.6 NEW: Advancing Workspace (per-show riders & tech specs)

> **Industry context:** "Advancing" is the process of collecting and sharing logistical requirements for each show — tech riders, hospitality riders, stage plots, contacts. Tools like Master Tour dedicate an entire section to this. Each show in a tour needs a structured advancing document.

**Database:** Create migration `supabase/migrations/YYYYMMDD_advancing_workspace.sql`:
```sql
CREATE TABLE IF NOT EXISTS advancing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events_v2(id) ON DELETE CASCADE,
  tour_id uuid REFERENCES tours(id) ON DELETE SET NULL,
  org_id uuid NOT NULL,
  -- Tech rider
  stage_width_ft numeric,
  stage_depth_ft numeric,
  stage_height_ft numeric,
  backline_provided boolean DEFAULT false,
  backline_notes text,
  sound_system_type text,        -- e.g. 'L-Acoustics K2', 'Meyer Sound'
  monitor_type text,
  monitor_mixes_count int,
  foh_console text,
  mon_console text,
  power_requirements text,
  -- Hospitality rider
  dressing_rooms_count int,
  catering_notes text,
  meal_count int,
  dietary_restrictions text[],
  towels_count int,
  parking_passes_count int,
  comps_count int,
  -- Contacts
  venue_contact_name text,
  venue_contact_phone text,
  venue_contact_email text,
  production_manager_name text,
  production_manager_phone text,
  local_promoter_name text,
  local_promoter_phone text,
  -- Settlement
  deal_type text,                -- 'guarantee', 'vs_door', 'percentage'
  guarantee_amount numeric,
  door_percentage numeric,
  vs_expenses bool,
  estimated_expenses numeric,
  settlement_contact text,
  -- Meta
  notes text,
  status text DEFAULT 'pending', -- 'pending', 'sent', 'confirmed'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**API routes:**
- `GET /api/admin/events/[id]/advancing` — fetch advancing doc for event
- `POST /api/admin/events/[id]/advancing` — create
- `PATCH /api/admin/events/[id]/advancing` — update

**UI:** Create `app/admin/dashboard/events/[id]/advancing/page.tsx`:
1. Full-page form organized into 4 accordion sections: **Tech Rider**, **Hospitality Rider**, **Contacts**, **Settlement**.
2. Each section has structured inputs (not free text blobs) matching the DB schema above.
3. **Auto-fill from tour defaults:** If event is part of a tour with a `tour_advancing_template`, pre-populate fields.
4. **Status badge:** Pending / Sent to Venue / Confirmed. "Mark as Sent" button emails the venue contact.
5. **Share link:** Generate a read-only share link to a public page `/advance/[token]` that the venue can view.
6. **Print/PDF button:** Generate a clean advancing document PDF via `GET /api/admin/events/[id]/advancing/export`.
7. Add "Advancing" as a tab on the event detail page (`app/admin/dashboard/events/[id]/page.tsx`).
8. Add "Advancing" as a sub-item under each tour event in the tour detail.

**Done when:** Can fill in tech/hospitality/contacts/settlement for a show, save, and generate a shareable PDF.

---

## 3.7 NEW: Day Sheets / Itineraries

> **Industry context:** A day sheet is a one-page call-sheet distributed to all crew the day of a show. It contains the day's schedule (load-in, sound check, doors, showtime, curfew), contacts, parking, catering, and any show-specific notes. Master Tour auto-generates these from tour data.

**Database:** Create migration for `day_sheets` table:
```sql
CREATE TABLE IF NOT EXISTS day_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events_v2(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  -- Schedule (all times local to venue)
  load_in_time time,
  production_advance_time time,
  sound_check_time time,
  doors_open_time time,
  support_set_time time,
  headliner_set_time time,
  curfew_time time,
  -- Venue info (auto-filled from event)
  venue_name text,
  venue_address text,
  venue_city text,
  venue_phone text,
  parking_notes text,
  -- Catering
  catering_location text,
  catering_notes text,
  -- Notes
  general_notes text,
  -- Distribution
  distributed_at timestamptz,
  recipients text[],  -- email addresses
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**API routes:**
- `GET /api/admin/events/[id]/day-sheet` — fetch or auto-generate
- `POST /api/admin/events/[id]/day-sheet` — create/update
- `POST /api/admin/events/[id]/day-sheet/distribute` — email to crew

**Auto-generation logic:** When `GET /api/admin/events/[id]/day-sheet` is called and no day sheet exists, auto-generate one by pulling:
- Schedule times from `events_v2` (`load_in_time`, `sound_check_time`, `doors_open`, `start_date`)
- Venue info from the event's venue fields
- Catering from `advancing_documents.catering_notes` if available

**UI:** Create `app/admin/dashboard/events/[id]/day-sheet/page.tsx`:
1. Show the day sheet in a print-friendly two-column layout: left column = schedule timeline, right column = contacts + venue + catering.
2. All fields are editable inline with auto-save debounce (500ms).
3. "Distribute" button: opens a dialog with a crew member picker (shows all event staff). Sends an email with the day sheet as a PDF attachment + an inline HTML version.
4. "Print" button: triggers `window.print()` with a print-specific CSS that hides nav/buttons.
5. "Download PDF" button: `GET /api/admin/events/[id]/day-sheet/export`.
6. Add "Day Sheet" tab on the event detail page.

**Done when:** Navigating to a show's Day Sheet page shows an auto-populated schedule; editing saves; distributing emails the crew.

---

## 3.8 NEW: Calendar Sync (iCal / Google / Outlook)

> **Industry context:** Tour managers and crew need events to appear in their personal calendars. iCal subscription feeds (RFC 5545) allow a calendar app to subscribe to a URL and auto-update when events change. Google and Outlook both support this.

**Tasks:**

1. **Per-tour iCal feed.** Create `GET /api/calendar/tours/[id].ics?token=<secret>`:
   - Returns RFC 5545 VCALENDAR
   - One VEVENT per show in the tour, with DTSTART/DTEND, SUMMARY (tour name + venue), LOCATION (venue address), DESCRIPTION (headliner, set time, load-in), and a UID
   - Secured by a per-tour `calendar_token` (random UUID stored on the tour row). Add `calendar_token` column: `ALTER TABLE tours ADD COLUMN IF NOT EXISTS calendar_token uuid DEFAULT gen_random_uuid()`.
   - Cache header: `Cache-Control: public, max-age=3600` so calendar apps poll every hour
2. **Per-event iCal.** Create `GET /api/calendar/events/[id].ics?token=<secret>` for a single event with multiple VEVENTs (load-in, sound check, doors, show).
3. **Personal org calendar feed.** Create `GET /api/calendar/org.ics?token=<secret>` returning all upcoming events for the org.
4. **Calendar sync UI.** Add a "Calendar Sync" section to:
   - Tour detail page: shows the tour's iCal URL, "Copy link" button, and "Subscribe in Google Calendar" / "Subscribe in Outlook" / "Download .ics" buttons
   - Event detail page: same for the single-event feed
   - Settings page: org-wide calendar feed URL with option to regenerate the token
5. **Google Calendar deep link.** Construct `https://calendar.google.com/calendar/r?cid=<encoded_ical_url>` and open in new tab.
6. **Outlook deep link.** Construct `https://outlook.live.com/calendar/0/addfromweb?url=<encoded_ical_url>`.
7. **Day sheet as calendar event.** Include load-in, sound check, doors, and show as separate VEVENTs inside the event's iCal feed.

**Done when:** Clicking "Subscribe in Google Calendar" on a tour opens Google Calendar with the feed; changes to the tour (new show added) appear on next calendar refresh.

---

## 3.9 Tour Detail: strengthen finance UI

**Tasks:**

1. Add a Finance tab to the tour detail showing:
   - Total tour budget vs actual spend (from `budgets` + `financial_transactions` filtered by `tour_id`)
   - Per-show P&L: each event's revenue (tickets sold × price) minus expenses
   - Settlement status per show: Not settled / Settled / Dispute
2. "Add settlement" action per show that records the final settlement amount and who was paid.
3. Export tour finances as CSV: one row per transaction across all shows.

**Done when:** Tour finance tab shows real P&L; per-show settlement status visible.

---

## Phase 3 Exit Criteria

- [ ] Tour draft saves and resumes from URL param
- [ ] Cover image uploads to Storage and shows in tour list
- [ ] Tour stops are sortable and link to events
- [ ] PDF export downloads a readable multi-show document
- [ ] Advancing workspace: tech/hospitality/contacts/settlement form saves
- [ ] Advancing doc generates a shareable PDF
- [ ] Day sheet auto-populates from event data; distribute emails crew
- [ ] iCal feed URL for a tour returns valid RFC 5545 calendar data
- [ ] Google Calendar / Outlook subscribe buttons work
- [ ] `npm run build` passes
