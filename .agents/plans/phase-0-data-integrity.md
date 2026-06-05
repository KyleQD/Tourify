# Phase 0 — Data Integrity & Blocker Fixes

> **Goal:** Make every existing surface trustworthy, reachable, and secure before any feature work begins.
> Complete this phase fully before moving to Phase 1.

---

## 0.1 Unify the events schema (`events` → `events_v2`)

**Problem:** `app/api/events/planner/route.ts` writes to the legacy `events` table, while all admin list/detail pages read from `events_v2`. Saves appear to disappear.

**Tasks:**

1. Open `app/api/events/planner/route.ts`. Change every `supabase.from('events')` write to `supabase.from('events_v2')`. Map column names: `events_v2` uses `title` (not `name`), `start_date`/`end_date` instead of `event_date`, `organizer_id` instead of `user_id`. Confirm with `supabase/migrations/20240416000000_create_events.sql` and the `events_v2` migration.
2. Search all `/api/admin/**` routes for any remaining reads from `events` (not `events_v2`) — migrate them. Use: `rg "from\('events'\)" app/api/` to find them.
3. Search admin page components for any remaining `events` table references.
4. Verify the `events_v2` table has all required columns that the planner writes: `title`, `description`, `start_date`, `end_date`, `venue_name`, `venue_address`, `capacity`, `ticket_price`, `org_id`, `tour_id`, `status`, `cover_image_url`, `marketing_data` (jsonb), `ticket_types` (jsonb).
5. If columns are missing, write a migration: `supabase/migrations/YYYYMMDDHHMMSS_events_v2_planner_columns.sql`.

**Done when:** Creating an event in the planner and then navigating to the events list shows the new record.

---

## 0.2 Create the missing planner publish route

**Problem:** `app/admin/dashboard/events/planner/page.tsx` calls `POST /api/events/planner/publish` which does not exist → 404 on publish.

**Tasks:**

1. Check `app/api/_disabled/` for a backup publish route. If found, restore it to `app/api/events/planner/publish/route.ts`.
2. If not found, create `app/api/events/planner/publish/route.ts`:
   - Accept `{ event_id: string }` body
   - Use `withAdminAuth` (same pattern as `app/api/admin/finances/route.ts`)
   - Fetch the draft event from `events_v2` where `id = event_id` and `status = 'draft'`
   - Validate required fields: `title`, `start_date`, `venue_name`, `capacity`
   - Set `status = 'published'`, `published_at = now()`
   - Return the updated event
3. Wire validation errors back to the planner UI's `progressPercentage` bar — show which step is incomplete when validation fails.

**Done when:** Clicking "Publish" in the planner transitions event status from `draft` to `published` and redirects to the event detail page.

---

## 0.3 Fix finances org-context resolution

**Problem:** `app/api/admin/finances/route.ts` queries `profiles.current_entity_id` but the actual primary-key column on `profiles` is `id` (not `user_id`). This causes the org lookup to silently return `null`, so all finance queries run without org scoping.

**Tasks:**

1. Read `app/api/admin/finances/route.ts` lines 35–41. The query is:
   ```ts
   .from('profiles').select('current_entity_id').eq('user_id', user.id)
   ```
   Fix to use the correct PK. Check the `profiles` table schema in `supabase/migrations/20240415000000_create_profiles.sql`. The correct query should be `.eq('id', user.id)` if `profiles.id` is the auth UID, or confirm the actual column name.
2. If `current_entity_id` column does not exist on `profiles`, determine the correct org ID source. Look at how other routes (e.g. `app/api/admin/events/route.ts`) resolve the org. Standardize on that pattern.
3. Add a guard: if `orgId` resolves to `null` for an authenticated admin, return a 400 with a clear message rather than silently returning all records across all orgs.
4. Update the GET overview, transactions, and budgets queries to use the fixed `orgId`.

**Done when:** Finance page loads data scoped to the logged-in organizer's entity; creating a transaction persists with the correct `org_id`.

---

## 0.4 Resolve ticketing schema drift

**Problem:** The canonical tables are `ticket_types` and `ticket_sales` (defined in `supabase/migrations/20260328130000_ticketing_v2.sql`). However, purchase APIs write `customer_email`/`customer_name`/`order_number` while the migration defines `buyer_email`/`buyer_name`/`payment_reference`. The webhook sets `payment_status = 'paid'` while the DB check constraint only allows `'pending'|'completed'|'refunded'|'failed'|'cancelled'`. And `quantity_sold` on `ticket_types` is **never incremented** — no trigger or webhook update exists. Tables like `ticket_shares`, `ticket_referrals`, `ticket_analytics` are only in `supabase/migrations_backup/` and do not exist in the active DB.

**Tasks:**

1. **Fix column name mismatches.** The purchase APIs write fields that don't match the migration. Write a migration:
   ```sql
   -- ticket_sales column aliases / missing columns
   ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS customer_email text 
     GENERATED ALWAYS AS (buyer_email) STORED;
   ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS customer_name text 
     GENERATED ALWAYS AS (buyer_name) STORED;
   ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS order_number text
     DEFAULT 'ORD-' || substr(md5(random()::text), 1, 8);
   ALTER TABLE ticket_sales ADD COLUMN IF NOT EXISTS transaction_id text;
   -- OR alternatively: update API routes to write buyer_email/buyer_name directly
   ```
   The cleaner fix is to update `app/api/ticketing/route.ts` and `app/api/ticketing/enhanced/route.ts` to use `buyer_email`, `buyer_name`, `payment_reference` matching the migration schema.
2. **Fix payment_status mismatch.** The webhook sets `payment_status = 'paid'` but the constraint only allows `'completed'`. Update `app/api/ticketing/webhook/route.ts` line in the `checkout.session.completed` handler: change `payment_status: 'paid'` → `payment_status: 'completed'`.
3. **Add `quantity_sold` increment to webhook.** In `app/api/ticketing/webhook/route.ts`, the `checkout.session.completed` handler currently only updates `ticket_sales`. Add:
   ```ts
   // After updating ticket_sales payment_status
   await supabase
     .from('ticket_types')
     .update({ quantity_sold: supabase.raw('quantity_sold + ?', [quantity]) })
     .eq('id', ticketTypeId)
   ```
   Also switch from `createClient()` (user context) to `createServiceRoleClient()` so the update bypasses RLS — this is a trusted webhook, matching the marketplace webhook pattern.
4. **Apply missing tables from backup.** Copy `ticket_shares`, `ticket_referrals`, `ticket_analytics`, `social_media_performance` CREATE TABLE statements from `supabase/migrations_backup/` into a new active migration: `supabase/migrations/YYYYMMDD_ticketing_extended_tables.sql`. Also copy the `update_ticket_type_sold_count_trigger` trigger from backup.
5. Verify `app/api/admin/ticketing/enhanced/route.ts` returns valid data by testing against the seeded DB.

**Done when:** Completing a Stripe checkout increments `quantity_sold`; the ticketing page renders without schema errors; payment_status is `'completed'` in DB.

---

## 0.5 Normalize notification columns

**Problem:** Code references both `is_read`/`content` and `read`/`message` column names on the `notifications` table, causing silent null renders and broken mark-as-read.

**Tasks:**

1. Run `rg "\.read\b\|\.message\b\|is_read\|\.content\b" app/api/admin/notifications/ components/notifications/` to find all references.
2. Check `supabase/migrations/20250131000003_fix_notifications_schema.sql` to confirm canonical column names.
3. The canonical standard is: `is_read` (boolean) and `content` (text). Update all reads/writes that use `read` → `is_read`, and `message` → `content`.
4. Update `app/api/admin/notifications/route.ts` PATCH handler to `UPDATE notifications SET is_read = true`.
5. Update `components/notifications/enhanced-notification-center.tsx` to read `notification.is_read` and `notification.content`.
6. Update any task-messages fanout that inserts notifications to use `is_read: false` and `content: <message>`.

**Done when:** Notifications render their text content; marking as read persists correctly.

---

## 0.6 Fix site-map data integrity risks

**Problem:** `components/admin/logistics/site-map-builder/simcity-site-map-viewer.tsx` injects demo elements when data load fails or returns empty — this can corrupt production site maps. The site-map duplicate action does not copy elements.

**Tasks:**

1. Open `simcity-site-map-viewer.tsx`. Find the demo-element injection block (likely in the `useEffect` or error handler). Replace with a proper `AdminEmptyState` component showing "No elements yet — drag from the panel to add."
2. In `components/admin/logistics/site-map/site-map-manager.tsx`, find the duplicate site map action. After duplicating the parent record in `site_maps`, also copy all `site_map_elements` rows: `INSERT INTO site_map_elements SELECT gen_random_uuid(), new_map_id, ... FROM site_map_elements WHERE site_map_id = source_id`.
3. Add error boundary around the site map viewer so a failed load shows an error card, not demo data.

**Done when:** An empty site map shows an empty state; duplicating a map copies all its elements.

---

## 0.7 Secure the onboarding-templates API

**Problem:** `app/api/onboarding-templates/**` routes have no authentication, allowing any unauthenticated request to read/write onboarding templates.

**Tasks:**

1. Open each route file in `app/api/onboarding-templates/`. Wrap every handler with `withAdminAuth` (import from `@/lib/auth/api-auth`).
2. Add org scoping: filter `onboarding_templates` by `org_id` matching the authenticated user's org.
3. Verify the routes still function for legitimate admin requests.

**Done when:** An unauthenticated `GET /api/onboarding-templates` returns 401.

---

## 0.8 Remove mock fallback data from staff service

**Problem:** `lib/services/admin-onboarding-staff.service.ts` falls back to hardcoded mock data when DB queries fail. This masks database misconfigurations and shows fake data in production.

**Tasks:**

1. Open `lib/services/admin-onboarding-staff.service.ts`. Find every `catch` block or fallback that returns hardcoded arrays/objects instead of re-throwing.
2. Replace fallback returns with proper error throws: `throw new Error('Failed to load staff data: ' + err.message)`.
3. In the calling UI components (primarily `app/admin/dashboard/staff/page.tsx`), the `AdminPageSkeleton` and `AdminEmptyState` components already handle loading/empty states — make sure errors surface via `AdminErrorCard`.
4. Delete `lib/services/enhanced-staff-management.service.ts` if it is entirely superseded. Check for imports first: `rg "enhanced-staff-management"` — if found, redirect imports to the correct service.

**Done when:** When the DB is unreachable, the staff page shows an error card, not fake data.

---

## 0.9 Fix or gate the broken feed page

**Problem:** `app/admin/dashboard/feed/page.tsx` (server component) has three specific bugs causing it to always call `notFound()`:

1. **Invalid embed:** `.select('*, user:user_id(name, avatar_url)')` — the `posts.user_id` column references `auth.users` (per `20240430000000_create_posts.sql`), not `profiles`. The embed `user:user_id(name, avatar_url)` fails because profiles uses `full_name` not `name`, and the FK is to `auth.users`.
2. **Array shape assumption:** UI uses `post.user[0]` but Supabase many-to-one returns an object (or null), not an array.
3. **Harsh error handling:** Any query error → `notFound()` (404) instead of showing an error card.

**Tasks:**

1. Open `app/admin/dashboard/feed/page.tsx`. Fix the query:
   ```ts
   // Before (broken):
   .select('id, user_id, content, created_at, user:user_id(name, avatar_url)')
   
   // After (fixed):
   .select('id, user_id, content, created_at')
   // Then separately join profiles:
   const userIds = posts.map(p => p.user_id)
   const { data: profiles } = await supabase
     .from('profiles')
     .select('id, full_name, avatar_url')
     .in('id', userIds)
   ```
2. Replace `if (error) return notFound()` with a graceful error state (same pattern as `app/admin/dashboard/content/page.tsx` which shows "Limited access" on error).
3. The feed should show posts scoped to the organizer's events or org — add a join to filter by events where `org_id` matches the authenticated user's org.
4. Add working Like/Comment/Delete handlers (or remove the buttons and replace with "Full feed management coming in Phase 8").

**Done when:** Navigating to `/admin/dashboard/feed` shows real posts or a clean error state — never a 404.

---

## 0.10 Apply all pending migrations

**Problem:** Several migrations in `supabase/migrations/` may not have been applied locally or in the production environment.

**Tasks:**

1. Run `supabase db push` locally and check for any unapplied migrations.
2. Pay special attention to:
   - `20260520224000_group_threads_model.sql` — group threads
   - `20260520222000_dm_trust_model.sql` — DM trust
   - `20260529103000_site_map_task_assignments_v2.sql` — site map tasks
   - `20260526100000_profiles_role_column.sql` — profiles role
   - `20260415235824_notification_ecosystem_prefs_rls_outbound.sql` — notifications
3. If any migration fails, investigate the conflict, resolve it, and re-apply.
4. After applying, run `supabase gen types typescript --local > types/supabase.ts` to regenerate TypeScript types.

**Done when:** `supabase db push` exits cleanly with no unapplied migrations.

---

## 0.10b Fix event detail owner-only restriction

**Problem (newly discovered):** `GET /api/events/[id]/route.ts` restricts access to `created_by = user.id` — meaning an admin viewing an event created by someone else gets a 404 on the detail page, even though the event appears in the admin list.

**Tasks:**

1. Open `app/api/events/[id]/route.ts`. Find the ownership check (`created_by === user.id` or equivalent WHERE clause).
2. Add an admin bypass: if `withAdminAuth` is being used, or if the user has an organizer account in the same org, allow the read. Pattern:
   ```ts
   let query = supabase.from('events_v2').select('*').eq('id', id)
   // Admin can see all org events, not just their own
   if (!isAdmin) {
     query = query.eq('created_by', user.id)
   }
   ```
3. Apply the same fix to `app/api/events/[id]/hq/route.ts` where non-participant admins get 403.

**Done when:** An admin can view and navigate to any event detail page regardless of who created it.

---

## Phase 0 Exit Criteria

- [ ] Creating an event in the planner and refreshing the list shows the new record
- [ ] Publishing an event transitions status to `published`
- [ ] Finance page loads scoped data without console errors
- [ ] Ticketing page loads without schema errors; `quantity_sold` increments on purchase
- [ ] `payment_status` stored as `'completed'` (not `'paid'`)
- [ ] Notifications display text and mark-as-read persists
- [ ] Site map empty state shows empty state UI, not demo elements
- [ ] `GET /api/onboarding-templates` returns 401 without auth
- [ ] Staff page shows error card (not mock data) when DB fails
- [ ] Feed page navigable without crashing
- [ ] Admin can view event detail for events they did not create
- [ ] `supabase db push` exits clean
- [ ] `npm run build` passes
