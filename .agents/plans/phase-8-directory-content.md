# Phase 8 — Directory, Content & Insights

> **Goal:** Turn the Network directory (artists, venues, agencies) from a read-only monitor with fake metrics into a fully functional CRM with real data, working detail/edit pages, and import. Upgrade content moderation from passive lists to actionable tools. Make analytics genuinely useful with exports, filtering, and real-time feeds.

---

## 8.1 Artists: real metrics + working list

**Current state:** `app/admin/dashboard/artists/page.tsx` shows artist cards with fake metrics (events, followers, bookings). "Edit" links go to non-existent `artists/[id]` routes.

**Tasks:**

1. **Real metrics per artist.** Add computed columns or views to the artist data:
   - `event_count`: `COUNT(*) FROM event_participants WHERE user_id = artist.id`
   - `upcoming_event_count`: count where event `start_date > now()`
   - `total_bookings`: count of confirmed `event_participants` rows
   - Join these in `GET /api/admin/artists?include=metrics` (add `?include=metrics` param to the route)
2. **Artist list.** Columns: avatar, name, genre(s), event_count, upcoming_event_count, last_active, status. Searchable. Filterable by genre, status.
3. **Import artists.** "Import" button → CSV upload with fields: name, email, genre, website. Creates `profiles` rows with `account_type = 'artist'` and corresponding `artist_profiles` rows.
4. **Add artist manually.** "Add Artist" button → form: name, email, genre, bio. Creates user + artist profile.

**Done when:** Artist list shows real event counts; import creates artist profiles.

---

## 8.2 Artists: working detail/edit page

**Current state:** `app/admin/dashboard/artists/[id]/page.tsx` was a stub from Phase 1.6.

**Tasks:**

1. Build the full detail page with tabs:
   - **Profile:** display name, bio, genres, profile image, website, social links (editable inline).  `PATCH /api/admin/artists/[id]`
   - **Events:** list of `event_participants` where `user_id = id`. Columns: event name, date, venue, role, status. Link to event detail.
   - **Bookings:** pending booking requests for this artist. Can approve/decline from here.
   - **Analytics:** total events, total audience, revenue generated (sum of ticket revenue for events they headlined).
   - **Documents:** EPK, rider, press photos. Links to `artist_profiles.epk_*` fields.
2. **Edit artist.** Inline editing (click to edit field, save on blur) or an "Edit" modal. Calls `PATCH /api/admin/artists/[id]`.
3. **Booking request.** "Book Artist" button on the detail page → opens a dialog: select event, proposed dates, offer amount. Creates an `event_participants` row with `status = 'invited'` and sends notification to artist.

**Done when:** Artist detail page shows real events; editing saves; booking request creates a pending participant.

---

## 8.3 Venues: real metrics + working detail/edit

**Current state:** Same issues as artists — fake metrics, dead edit links.

**Tasks:**

1. **Real venue metrics:**
   - `hosted_events_count`: events where `venue_name LIKE <venue.name>` or linked via `venue_id`
   - `upcoming_events_count`: future events at this venue
   - `total_capacity_used`: sum of `tickets_sold` across events at this venue
2. **Venue detail page** (`venues/[id]/page.tsx` — stub from Phase 1.6). Tabs:
   - **Overview:** name, address, city, state, capacity, amenities, contact info
   - **Events:** all events hosted at this venue. Link to event detail.
   - **Site Maps:** site maps linked to this venue. Link to site map editor.
   - **Contacts:** venue contacts (from `advancing_documents` or a `venue_contacts` table)
   - **Notes:** free text notes field
3. **Edit venue.** Same inline-edit pattern. `PATCH /api/admin/venues/[id]`.
4. **Add venue.** "Add Venue" form: name, address, city, state, zip, country, capacity, website, contact_name, contact_email, contact_phone.

**Done when:** Venue list shows real event counts; detail page shows hosted events; edit saves.

---

## 8.4 Agencies: fix artist/user picker + permission gating

**Current state:** `app/admin/dashboard/agencies/page.tsx` — the agency artist picker may fail due to `artist_profiles.id` type mismatch (UUID vs integer).

**Tasks:**

1. Open `agencies/page.tsx` and the agency-related API routes. Find the artist ID type issue.
2. Run: `SELECT id, pg_typeof(id) FROM artist_profiles LIMIT 1;` — if `id` is integer, but code expects UUID, add a `uuid` column: `ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS uuid_id uuid DEFAULT gen_random_uuid();` and update all references.
3. **Artist picker.** Wire to `GET /api/admin/artists?search=<q>`. Results show name + genre. On select, adds artist to the agency's roster via `POST /api/admin/agencies/[id]/artists`.
4. **User/staff picker for agency admin role.** Wire to `GET /api/admin/users/search`. On select, assigns the user as an agency admin.
5. **Permission gating.** Agency management features should only be visible to users with `role = 'agency_admin'` or org admins. Add guard: if user doesn't have agency permission, show a locked overlay.

**Done when:** Agency artist picker works; adding an artist to an agency persists.

---

## 8.5 Network: connections management

**Tasks:**

1. `app/admin/dashboard/network/page.tsx` — if this route doesn't exist, create it.
2. Show: pending connection requests (incoming + outgoing), accepted connections, blocked users.
3. Admin can approve/decline incoming requests.
4. Admin can revoke connections.
5. Data: query `follow_requests` or `connections` table (whichever the codebase uses from the `complete_follow_friend_system` migration).

**Done when:** Network page shows real connection data; admin can approve/decline requests.

---

## 8.6 Content Library: moderation actions

**Current state:** `app/admin/dashboard/content/page.tsx` is a read-only monitor.

**Tasks:**

1. Add moderation actions per content item:
   - **Approve:** Set `moderation_status = 'approved'`
   - **Remove:** Set `moderation_status = 'removed'`, `is_visible = false`
   - **Flag for review:** Set `moderation_status = 'flagged'`
   - **Restore:** Set `is_visible = true`, `moderation_status = 'approved'`
2. Filter by `moderation_status`: All / Pending / Approved / Flagged / Removed.
3. **User name resolution.** Content items should show the author's display name (resolve from `profiles` via the `user_id`). Fix any `user_id` joins that are returning null.
4. Routes: `PATCH /api/admin/content/[id]` with `{ moderation_status, is_visible }`.

**Done when:** Each content item has working approve/remove/flag buttons; author names visible.

---

## 8.7 Feed: fix and add moderation

**Current state:** `app/admin/dashboard/feed/page.tsx` — fixed in Phase 0.9 to not crash.

**Tasks:**

1. (Assumes Phase 0.9 fix is done.) Show the feed in a list format: avatar, author name, content preview, post date, like count, comment count.
2. Add per-post moderation actions: Pin (set `is_pinned = true`), Remove, Flag.
3. Add "Compose announcement" button: creates a `posts` row visible to all org followers.
4. Filter: All Posts / Flagged / Pinned.

**Done when:** Feed shows real posts with moderation actions.

---

## 8.8 Music, EPK, Website: turn monitors into tools

**Current state:** `music/page.tsx`, `epk/page.tsx`, `website/page.tsx` are read-only.

**Tasks:**

1. **Music page.** Add actions per track: Set as featured (updates `is_featured = true`), Remove from admin view, Link to event. Show: track name, artist, plays, upload date.
2. **EPK page.** Allow admin to review and approve/reject EPK submissions. Show: artist name, submission date, bio snippet, "View full EPK" link, Approve/Reject buttons.
3. **Website page.** If this is a website builder monitor, show: domain, last published, page views. Add "Manage content" link that goes to a CMS editor (or links to a stub).

**Done when:** Music and EPK pages have actionable moderation buttons.

---

## 8.9 Analytics: export + date range + period comparison

**Current state:** `app/admin/dashboard/analytics/page.tsx` may have stubs for export and date range.

**Tasks:**

1. **Date range picker.** Add `<DateRangePicker>` at the top (use `shadcn/ui` date-range component). On change, re-fetch all analytics with `?from=<date>&to=<date>`.
2. **Period comparison.** Toggle: "Compare to previous period". When on, fetch the same metrics for the prior equivalent period and show +/- delta on each stat card.
3. **Export.** "Export" button → dropdown: CSV (all raw metrics), PDF (formatted report). CSV calls `GET /api/admin/analytics/export?from=&to=&format=csv`. PDF generates a report with charts.
4. **Real-time event feed.** Show a live-updating "Recent activity" panel: new ticket purchases, new staff sign-ups, new follows — via Supabase realtime subscriptions on the relevant tables.
5. **Top performers.** Real data: top events by revenue (from `financial_transactions`), top events by attendance (from `ticket_purchases`), top artists by bookings (from `event_participants`).

**Done when:** Date range filtering works; export downloads real CSV; period comparison shows deltas.

---

## 8.10 Features: real feature flags + rollout controls

**Current state:** `app/admin/dashboard/features/page.tsx` — may use hardcoded flags.

**Tasks:**

1. Create a `feature_flags` table if not present:
   ```sql
   CREATE TABLE IF NOT EXISTS feature_flags (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     key text UNIQUE NOT NULL,
     name text NOT NULL,
     description text,
     enabled boolean DEFAULT false,
     rollout_percentage int DEFAULT 0,    -- 0-100
     target_org_ids uuid[],              -- null = all orgs
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   ```
2. `GET /api/admin/features` returns all flags. `PATCH /api/admin/features/[key]` toggles or updates rollout.
3. UI: table of flags with: name, key, toggle switch, rollout slider (0-100%), "Specific orgs" button.
4. Each flag has an "Audit log" link showing who changed it and when.
5. Wire `NEXT_PUBLIC_FEATURE_*` env vars to read from this table so runtime flags work without a deploy.

**Done when:** Toggling a feature flag in the UI enables/disables the feature immediately.

---

## Phase 8 Exit Criteria

- [ ] Artist list shows real event counts; no fake metrics
- [ ] Artist detail page has working tabs (Profile, Events, Analytics)
- [ ] Booking request for an artist creates a pending event participant
- [ ] Venue list shows real hosted-event counts
- [ ] Agency artist picker works; adding artist to agency persists
- [ ] Content items have working approve/remove/flag buttons
- [ ] Feed shows real posts; moderation actions work
- [ ] Analytics date range picker re-fetches data; export downloads CSV
- [ ] Feature flags read from and write to DB table
- [ ] `npm run build` passes
