# Phase 6 — Finance & Commerce

> **Goal:** Deliver a complete financial management system — settlements, transaction CRUD, budget tracking — alongside a production-ready ticketing system (tier management, refunds, check-in/scanning), a working marketplace with orders index and Stripe payouts, store listing CRUD, and inventory management.

---

## 6.1 Finances: settlements & payouts

**Current state:** `app/admin/dashboard/finances/page.tsx` has transactions and budgets but no settlement or payout workflow.

**Tasks:**

1. **Settlement flow.** After an event ends, a settlement reconciles what was collected vs what is owed to artists, venue, etc.
   - Create `settlements` table migration:
     ```sql
     CREATE TABLE IF NOT EXISTS settlements (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       event_id uuid REFERENCES events_v2(id),
       tour_id uuid REFERENCES tours(id),
       org_id uuid NOT NULL,
       total_gross_revenue numeric NOT NULL DEFAULT 0,
       total_expenses numeric NOT NULL DEFAULT 0,
       net_profit numeric GENERATED ALWAYS AS (total_gross_revenue - total_expenses) STORED,
       artist_payout numeric DEFAULT 0,
       venue_payout numeric DEFAULT 0,
       promoter_payout numeric DEFAULT 0,
       deal_type text,           -- 'guarantee', 'vs_door', 'percentage'
       guarantee_amount numeric,
       door_percentage numeric,
       status text DEFAULT 'draft',  -- 'draft', 'finalized', 'paid'
       settled_by uuid REFERENCES profiles(id),
       settled_at timestamptz,
       notes text,
       created_at timestamptz DEFAULT now()
     );
     ```
   - Create `GET/POST/PATCH /api/admin/finances/settlements` routes.
2. **Settlement UI.** "Settlements" tab on the finances page:
   - List of events/tours pending settlement (status = `completed` but no settlement record)
   - "Create Settlement" button → opens settlement wizard:
     - Step 1: Review totals (gross revenue from ticket sales, expenses from transactions)
     - Step 2: Apply deal type (guarantee, vs-door, percentage split)
     - Step 3: Enter payout amounts per recipient
     - Step 4: Confirm & finalize
   - Once finalized, status = `finalized`; "Mark as Paid" sets `status = 'paid'`
3. **Payout records.** Each payout generates a `financial_transactions` row with `type = 'payout'`, `category = 'artist_payment'|'venue_payment'`, linked to the settlement ID.

**Done when:** Can create a settlement for a completed event, enter payout amounts, and mark as paid.

---

## 6.2 Finances: transaction CRUD + event/tour scoping

**Current state:** Transactions can be created but may lack edit/delete and proper scoping UI.

**Tasks:**

1. **Edit transaction.** Click any transaction row → edit dialog pre-populated with all fields. `PATCH /api/admin/finances` with `{ id, ...updates }`. The route should already support PATCH — verify.
2. **Delete transaction.** Per-row delete button → confirmation dialog → `DELETE /api/admin/finances?id=<txId>`. Add this to the route if missing.
3. **Event/tour scope selector.** Add a "Viewing:" dropdown at the top of the finances page: "All" / "Event: <name>" / "Tour: <name>". Changing it appends `?event_id=<id>` or `?tour_id=<id>` to all API calls.
4. **Receipt upload.** On the add/edit transaction dialog, add a file upload for `receipt_url`. Upload to Supabase Storage bucket `receipts`, get public URL, store in `financial_transactions.receipt_url`.
5. **Audit trail.** Every create/edit/delete writes an audit record: `INSERT INTO financial_audit_log (action, transaction_id, actor_id, diff_json, created_at)`. Create the table if it doesn't exist.

**Done when:** Transactions can be created, edited, deleted with receipts; scoped to event or tour.

---

## 6.3 Finances: budget create with required event/tour

**Problem:** Budget creation may allow creating a budget without a linked event or tour, leading to orphan budget records.

**Tasks:**

1. On the "Create Budget" dialog in `app/admin/dashboard/finances/page.tsx`, make the event/tour selector required (not optional).
2. Add form validation: `budget.event_id || budget.tour_id` must be truthy before submission.
3. Display budgets grouped by event/tour in the budget tab.
4. **Budget vs actual.** Each budget category shows: allocated amount vs sum of matching `financial_transactions.amount` for that category. Show as a progress bar with color (green = under, yellow = 80-100%, red = over).

**Done when:** Creating a budget without an event/tour shows a validation error; budget categories show % spent.

---

## 6.4 Ticketing: ticket type CRUD

**Note on naming:** The canonical tables (from `supabase/migrations/20260328130000_ticketing_v2.sql`) are `ticket_types` (not `ticket_tiers`) and `ticket_sales` (not `ticket_purchases`). All UI and API references should use these names.

**Current state:** `app/admin/dashboard/ticketing/page.tsx` displays `ticket_types` data via `GET /api/admin/ticketing/enhanced?type=ticket_types` but does not allow creating new types from this admin view.

**Tasks:**

1. **Type list.** Table showing all `ticket_types` across all events: event name, type name, price, quantity, `quantity_sold`, available (`quantity - quantity_sold`), `is_active` status. Link type name to its event.
2. **Create type.** "Add Ticket Type" button → dialog: event picker (`GET /api/admin/events`), type name, `ticket_type` (general/vip/backstage/earlybird), price, quantity, `sale_start_date`, `sale_end_date`, description, `is_active`. `POST /api/admin/ticketing/enhanced` with `action: 'create_ticket_type'` (route already supports this).
3. **Edit type.** Click row → edit dialog → `PATCH /api/admin/ticketing/enhanced` with updated fields.
4. **Pause/resume.** Toggle `is_active`. Paused types block purchases.
5. **Delete type.** Only allowed if `quantity_sold = 0`. Return error if sales exist.
6. **Settings tab.** Wire the currently-inert "Configure" buttons on the settings tab to real handlers for: payment gateway config, refund policy, transfer policy.
7. **Promo codes.** "Promo Codes" sub-tab: list from `promo_codes` table, create (code, discount_type: flat/percent, discount_amount, uses_limit, expires_at), disable.

**Done when:** Ticket types can be created/edited/paused/deleted; promo codes can be created.

---

## 6.5 Ticketing: refund processing

**Current state:** Refund UI may not exist or not be wired to Stripe.

**Tasks:**

1. Create `POST /api/admin/ticketing/refund/route.ts`:
   - Accept `{ purchase_id: string, reason?: string, partial_amount?: number }`
   - Fetch the purchase's `stripe_payment_intent_id` from `ticket_purchases`
   - Call Stripe's `stripe.refunds.create({ payment_intent: <id>, amount: <cents> })`
   - On success: update `ticket_sales.payment_status = 'refunded'` (table is `ticket_sales`, not `ticket_purchases`)
   - Decrement `ticket_types.quantity_sold` by the refunded quantity
   - Write a `financial_transactions` row: `type: 'expense'`, `category: 'refund'`, `amount: -<amount>`
2. In the tickets tab on the event detail (Phase 2.7): add per-row "Refund" button → dialog: buyer name/email, amount paid, "Full refund" / "Partial refund" (amount input). Confirm → call refund route.
3. In the ticketing page: add a "Refunds" tab showing all `ticket_sales` where `payment_status = 'refunded'`: buyer, event, type name, original amount, refunded_at.

**Done when:** Clicking "Refund" triggers a real Stripe refund; `quantity_sold` decrements; sale status shows `refunded`.

---

## 6.6 Ticketing: check-in / scanning

> **Industry context:** Event day check-in is critical. Staff with a phone/tablet need to scan tickets at the gate. This requires a check-in API and a simple scan interface.

**Tasks:**

1. Create `POST /api/ticketing/check-in/route.ts`:
   - Accept `{ qr_code: string }` or `{ sale_id: string }` (table is `ticket_sales`)
   - `ticket_sales` already has `checked_in boolean` and `checked_in_at timestamptz` per `ticketing_v2.sql` — add `checked_in_by uuid` column if missing
   - Add `qr_code uuid DEFAULT gen_random_uuid()` to `ticket_sales` if missing (use as scannable token)
   - Check: valid sale, event date matches today, `payment_status = 'completed'`, not already checked in
   - If valid: `UPDATE ticket_sales SET checked_in = true, checked_in_at = now(), checked_in_by = <user_id> WHERE id = <id>`
   - Return: `{ success: true, buyer_name, type_name, message: 'Welcome!' }` or error with reason
2. Use service role client in this route (webhook-style) to ensure RLS doesn't block the update.
3. Create `app/admin/dashboard/events/[id]/check-in/page.tsx`:
   - Mobile-optimized full-screen check-in interface
   - Camera QR scanner using `@zxing/browser` or `html5-qrcode` library
   - Manual entry fallback: input box for ticket code
   - Large success/error feedback (green ✓ / red ✗) with buyer name and tier
   - Running count: "Checked in: 142 / 500" updating in real-time via Supabase subscription
4. Add "Check-In" button on event detail → opens check-in page in new tab.
5. Admins can also check in from the purchaser list (per-row checkbox).

**Done when:** Scanning a valid ticket QR code marks it as checked in; scanning twice shows "Already checked in."

---

## 6.7 Marketplace: orders index page

**Problem:** `app/admin/dashboard/marketplace/page.tsx` exists but the orders list index may be missing or the nav links 404.

**Tasks:**

1. Check `app/admin/dashboard/marketplace/page.tsx` — if it renders the orders list, ensure it calls `GET /api/admin/marketplace/orders`.
2. If the orders index is missing, create `app/admin/dashboard/marketplace/orders/page.tsx` (separate from `orders/[id]`):
   - List all marketplace orders: buyer, item(s), amount, status (pending/shipped/delivered/refunded), created_at
   - Filter by status and date range
   - Click row → `marketplace/orders/[id]`
3. **Order detail** (`marketplace/orders/[id]/page.tsx` — already exists): Ensure it shows: order items, buyer info, shipping address, payment status, fulfillment status.
4. **Moderation.** Tab on the marketplace page: flag/unflag listings (calls `POST /api/admin/marketplace/moderation`), approve/reject listed items.
5. **Stripe Connect payouts retry.** On the marketplace payout tab: show failed payouts with "Retry" button that calls `POST /api/admin/marketplace/payouts/[id]/retry` (route already exists).

**Done when:** Orders list loads with real data; moderation actions work; payout retry fires.

---

## 6.8 Store: listing CRUD + merch inventory

**Current state:** `app/admin/dashboard/store/page.tsx` is read-only.

**Tasks:**

1. **Create listing.** "Add Product" button → dialog: title, description, price, category (merch/digital/bundle), images (upload to Storage), variants (size/color options with separate prices/quantities). `POST /api/admin/store` if route exists, else create it.
2. **Edit listing.** Click listing → edit dialog → `PATCH /api/admin/store/[id]`.
3. **Delete listing.** Soft-delete: set `is_active = false`. Hard-delete only if no orders reference it.
4. **Inventory tracking.** Each product variant has `inventory_count`. Show low-stock warning (< 10 units). "Restock" action: enter new quantity.
5. **Order management.** Tab: unfulfilled store orders. Per-order: mark as shipped (enter tracking number), mark as delivered.
6. **Bulk import.** CSV import for bulk product creation: name, price, quantity, category.

**Done when:** Products can be created with images and variants; orders can be marked as shipped.

---

## 6.9 Inventory: in-page CRUD

**Current state:** `app/admin/dashboard/inventory/page.tsx` is read-only or not fully wired.

**Tasks:**

1. Add "Add Item" button → dialog: name, category (equipment/merch/supplies), quantity, unit, location (which event/venue/warehouse), condition, notes. Saves to `logistics_items` or a dedicated `inventory_items` table.
2. Edit/delete per row.
3. **Clarify scope.** If `logistics_items` = production equipment and `store` = merch, show two tabs: "Equipment" (logistics) + "Merch" (from store). Or keep them unified if that makes more sense for the org.
4. **Check out / check in.** "Check out" button assigns an item to a staff member or event. "Return" checks it back in. Track history in `inventory_movements` table.
5. **Import from CSV.** Bulk-add inventory items.

**Done when:** Inventory items can be added, edited, and assigned to events.

---

## Phase 6 Exit Criteria

- [ ] Settlement can be created for a completed event; payout amounts saved
- [ ] Transactions can be edited and deleted; receipts uploadable
- [ ] Budget creation requires event/tour; shows % spent per category
- [ ] Ticket tiers can be created, edited, paused, deleted (0-sold only)
- [ ] Promo codes can be created
- [ ] Refund button triggers real Stripe refund; quantity_sold decremented
- [ ] Check-in page scans QR codes; duplicate scan shows error
- [ ] Marketplace orders index loads real order list
- [ ] Store products can be created with images and variants
- [ ] Inventory items support check-out/check-in
- [ ] `npm run build` passes
