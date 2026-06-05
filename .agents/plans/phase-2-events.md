# Phase 2 — Core Events (Full Lifecycle)

> **Goal:** Complete the entire event workflow from creation through publishing, real-time management, analytics, and post-event wrap-up. Every action must persist to the DB and be recoverable.

---

## 2.1 Event Planner: draft save & resume

**Current state:** `app/admin/dashboard/events/planner/page.tsx` (4726 lines) has a full multi-step wizard UI (8 steps: Basic Info, Venue, Artists, Tickets, Schedule, Marketing, Staffing, Review & Publish) but draft saving may not persist between sessions.

**Tasks:**

1. **Auto-save on step change.** When the user advances to the next step, call `POST /api/events/planner` with `{ status: 'draft', ...currentFormData }`. If an event `id` already exists in local state, call `PATCH /api/events/planner?id=<id>` instead.
2. **Resume draft.** On planner mount, check URL for `?draft=<event_id>`. If present, call `GET /api/events/planner?id=<event_id>` and hydrate all form steps from the response.
3. **Draft list on planner entry.** Before the wizard starts, show a "Continue a draft" card if `GET /api/admin/events?status=draft` returns results. Each draft card shows title, last-modified date, progress percentage, and a "Continue" button that adds `?draft=<id>` to the URL.
4. **Progress bar wired to validation.** Each step has required fields. Calculate `progressPercentage` as `(stepsWithData / totalSteps) * 100`. Show per-step completion checkmarks in the step list.
5. **Fields that must persist** (verify all are written to `events_v2`):
   - Step 1: `title`, `description`, `category`, `org_id`, `tour_id`
   - Step 2: `venue_name`, `venue_address`, `venue_city`, `venue_state`, `venue_capacity`
   - Step 3: artist participants (write to `event_participants` table with `role = 'headliner'|'support'`)
   - Step 4: ticket tiers → `ticket_tiers` table with `event_id`, `name`, `price`, `quantity`, `tier_type`
   - Step 5: `start_date`, `end_date`, `doors_open_time`, `load_in_time`, `sound_check_time`
   - Step 6: marketing tags → `marketing_data` jsonb on `events_v2`
   - Step 7: staff assignments → `event_staff` table
   - Step 8: no additional data (review + publish trigger)

**Done when:** Starting a draft, closing the browser, reopening, clicking "Continue draft" shows all previously entered data.

---

## 2.2 Event Planner: venue picker

**Current state:** Venue step likely has a text input. We need a searchable picker that queries real venues.

**Tasks:**

1. Add a `VenuePicker` component inside the planner's venue step. On typing 2+ characters, call `GET /api/admin/venues?search=<query>` (ensure this route exists and queries the `venues` table).
2. Show results in a popover list: venue name, city, capacity. On selection, populate `venue_name`, `venue_address`, `venue_city`, `venue_state`, `venue_capacity`, `venue_id` fields.
3. Allow free-text entry for venues not yet in the system ("Add new venue" option that shows name/address inputs).
4. Selected venue displays as a card with a "Change venue" button.

**Done when:** Typing a venue name in the planner picker shows real DB results and auto-fills venue fields.

---

## 2.3 Event Planner: real artist booking

**Current state:** Artist step likely has a search/add UI but may not write to the `event_participants` table.

**Tasks:**

1. Wire artist search to `GET /api/admin/users/search?role=artist&q=<query>` or `GET /api/admin/artists?search=<query>`. Show artist name, genre, avatar.
2. On selecting an artist, write to `event_participants`: `{ event_id, user_id: artist.id, role: 'headliner'|'support', status: 'invited' }`. Do this immediately (not waiting for publish).
3. Show selected artists as cards with set time, stage, role selector, and remove button.
4. Add "Invite external artist" option: email invite that creates a pending `event_participants` row and sends notification.
5. On publish, change participant status from `invited` to `confirmed` for accepted artists.

**Done when:** Added artists appear in the event detail's Participants tab after saving.

---

## 2.4 Event Planner: working publish with validation

**Tasks:**

1. Implement the `POST /api/events/planner/publish` route from Phase 0.2 (if not already done).
2. In the Review & Publish step, show a checklist:
   - [ ] Title set
   - [ ] Venue selected
   - [ ] At least one ticket tier created
   - [ ] Start date in the future
   - [ ] Capacity > 0
3. "Publish" button is disabled if any required item is unchecked.
4. On successful publish, redirect to `/admin/dashboard/events/<id>` with a success toast.
5. Add `?published=1` to the redirect URL so the event detail can show a "Your event is live!" banner.

**Done when:** Attempting to publish an incomplete event shows validation errors; completing it redirects to the event detail.

---

## 2.4b Event Detail: fix ticket display table names

**Note:** The canonical ticketing tables are `ticket_types` (not `ticket_tiers`) and `ticket_sales` (not `ticket_purchases`). Any reference in the event detail UI to `ticket_tiers` or `ticket_purchases` must be updated to `ticket_types` and `ticket_sales` respectively. Check `app/admin/dashboard/events/[id]/page.tsx` for any inline table/column references and the API route `app/api/admin/events/[id]/**` routes.

---

## 2.5 Event Detail: Analytics tab

**Current state:** `app/admin/dashboard/events/[id]/page.tsx` has an Analytics tab that currently shows placeholder charts.

**Tasks:**

1. Create `GET /api/admin/events/[id]/analytics/route.ts` returning:
   ```json
   {
     "ticketSalesOverTime": [{ "date": "2026-06-01", "count": 12, "revenue": 480 }],
     "salesByTier": [{ "tier": "General", "sold": 150, "revenue": 6000 }],
     "revenueVsExpenses": { "revenue": 8000, "expenses": 3200, "net": 4800 },
     "attendanceForecast": 320,
     "pageViews": 1240,
     "conversionRate": 0.24
   }
   ```
   Source: join `ticket_purchases` + `ticket_tiers` for sales data; `financial_transactions` for expenses; pull from `events_v2` for capacity.
2. Replace the placeholder charts with real `recharts` AreaChart (sales over time), BarChart (by tier), and stat cards using `AdminStatCard`.
3. Add date range filter (last 7d / 30d / 90d / all time) that re-fetches.

**Done when:** Analytics tab shows real ticket sale counts and revenue for any event with ticket purchases.

---

## 2.6 Event Detail: real export (PDF / Excel / iCal)

**Current state:** Export dialogs exist cosmetically but do nothing.

**Tasks:**

1. **PDF export:** Create `GET /api/admin/events/[id]/export?format=pdf`. Use a server-side HTML template (inline styles, no external CSS) rendered to PDF via `@vercel/og` or a simple HTML-to-PDF approach. Include: event name, date, venue, headcount, revenue summary, staff list, task list.
2. **Excel/CSV export:** `GET /api/admin/events/[id]/export?format=csv`. Return ticket purchases as CSV: name, email, tier, quantity, amount, status, purchased_at.
3. **iCal export:** `GET /api/admin/events/[id]/export?format=ical`. Return RFC 5545 VCALENDAR with VEVENT for the event (plus load-in, sound check, doors-open as additional VEVENTs).
4. Wire each format to the export dialog buttons. Use `window.location.href = url` to trigger download.

**Done when:** Clicking PDF/CSV/iCal export in the event detail downloads the correct file.

---

## 2.7 Event Detail: ticket management tab

**Current state:** Ticket tab exists but may only show a list without CRUD.

**Tasks:**

1. **Tier list:** Show all `ticket_tiers` for the event: name, price, quantity, quantity_sold, status. 
2. **Add/edit tier:** Dialog with fields: name, description, price, quantity, sale_start, sale_end, tier_type (general/vip/backstage). Calls `POST /PATCH /api/admin/ticketing/enhanced` scoped to `event_id`.
3. **Purchasers list:** Paginated table of `ticket_purchases` for this event: buyer name/email, tier, quantity, amount, status, purchased_at. Add search by name/email.
4. **Refund action:** Per-row "Refund" button that calls `POST /api/admin/ticketing/refund` with `{ purchase_id }` → triggers Stripe refund and updates `payment_status = 'refunded'` and decrements `quantity_sold`.
5. **Bulk export:** "Export attendees" button → CSV download of all purchasers.

**Done when:** Ticket tiers can be created/edited; purchaser list paginates; individual refunds work.

---

## 2.8 Event Detail: finance transactions tab

**Current state:** Finance tab may exist but transactions may not be editable.

**Tasks:**

1. **Transaction list:** Show `financial_transactions` scoped to `event_id`. Columns: date, type (income/expense), category, description, vendor, amount, status.
2. **Add transaction:** Dialog using the same schema as `POST /api/admin/finances`: type, category, amount, description, vendor, payment_status, due_date.
3. **Edit transaction:** Click row → edit dialog → `PATCH /api/admin/finances?id=<txId>`.
4. **Delete transaction:** Per-row delete with confirmation → `DELETE /api/admin/finances?id=<txId>`.
5. **Budget tracking:** Show budget allocations vs actual spend per category as a progress bar row.

**Done when:** Can add, edit, and delete transactions on an event; budget bars update.

---

## 2.9 Event HQ: task creation & document vault

**Current state:** `app/admin/dashboard/events/[id]/hq/page.tsx` — the HQ/command center. `EventTaskManager` component likely exists; document vault tab may be stub.

**Tasks:**

1. **Task creation in HQ:** Confirm `EventTaskManager` calls `POST /api/admin/tasks` with `{ event_id, title, description, assigned_to, due_date, priority, category }`. If not, wire it.
2. **Task assignment picker:** When creating a task, search for staff members assigned to this event via `GET /api/admin/events/[id]/participants`. Show name + role in picker.
3. **Task status transitions:** Inline status select: not_started → in_progress → completed → cancelled. Calls `PATCH /api/admin/tasks/:id`.
4. **Document vault tab:** Show `event_documents` (from `app/api/admin/events/[id]/documents/route.ts`). Allow uploading via `POST /api/admin/events/[id]/secure-uploads` (route already exists). Display: file name, type, uploader, uploaded_at, download link.
5. **Realtime task updates:** Subscribe to `supabase.channel('event-tasks').on('postgres_changes', { table: 'tasks', filter: 'event_id=eq.<id>' })`. Merge incoming changes into the task list without full re-fetch.

**Done when:** Tasks created in HQ appear in the task list in real-time; documents can be uploaded and downloaded.

---

## 2.10 Event Detail: notifications panel

**Current state:** Notification bell/panel in event detail may be cosmetic.

**Tasks:**

1. The event detail has a Notifications section (or tab). Wire it to `GET /api/admin/notifications?event_id=<id>`.
2. Show: notification text (`content`), sender avatar, timestamp, read/unread state.
3. Mark-all-read button: `PATCH /api/admin/notifications?event_id=<id>&markAllRead=true`.
4. "Send announcement" button: calls `POST /api/admin/events/[id]/communications` with `{ message, recipient_type: 'all_staff'|'all_ticket_holders' }`.

**Done when:** Event-scoped notifications list loads; announcements can be sent to staff.

---

## Phase 2 Exit Criteria

- [ ] Event draft auto-saves; closing and reopening resumes with all data
- [ ] Venue picker queries real venues DB
- [ ] Artists added in planner appear in event Participants tab
- [ ] Publishing validates required fields and transitions to `published`
- [ ] Analytics tab shows real ticket sale charts
- [ ] PDF/CSV/iCal export downloads correct files
- [ ] Ticket tiers can be created/edited; purchaser list visible
- [ ] Transactions can be added/edited/deleted
- [ ] Tasks created in HQ appear via realtime; documents uploadable
- [ ] `npm run build` passes
