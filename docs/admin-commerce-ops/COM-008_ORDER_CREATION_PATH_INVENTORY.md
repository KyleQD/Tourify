# COM-008 — Order Creation Path Inventory

Date: 2026-08-12

## Source Task

- Task: `COM-008`
- Phase: `P0 — Discovery and Financial Safety Baseline`
- Requirement: identify every order creation path.

## Definition Used

For this inventory, an order creation path is any path that creates a commerce order, sale, purchase, or partner order receipt. Adjacent records such as subscriptions, booking requests, milestones, and fulfillment records are listed separately when they are order-like but not direct buyer-payment orders.

## Confirmed Commerce Order Creation Paths

| Path | Created record | Source / actor | Initial state | Payment relationship |
| --- | --- | --- | --- | --- |
| `POST /api/marketplace/checkout` | `marketplace_orders`, `marketplace_order_items`, `marketplace_payout_ledger`, optional `marketplace_checkout_attempts`. | Buyer or guest checkout. | Order `status = "pending"`, `payment_status = "processing"`. | Creates Stripe Checkout after local order rows. |
| `createPendingOrder` via `POST /api/ticketing/enhanced` | `ticket_sales` plus optional `ticket_inventory_reservations`. | Public ticket buyer. | `payment_status = "pending"`, `payment_method = "stripe"`, `issuance_status = "pending"` when v2. | Creates Stripe Checkout for non-free orders; free orders complete locally. |
| `createPendingOrder` via `POST /api/ticketing/box-office` | `ticket_sales` plus optional reservation. | Box-office operator. | Pending order first; comp/cash/card branch later. | Card creates Stripe Checkout; cash/comp complete locally. |
| `createPendingOrder` via `POST /api/ticketing/allocations` | `ticket_sales` plus optional reservation. | Ticketing operator issuing from allocation. | Pending order then immediately completed as complimentary. | No provider payment. |
| `POST /api/photos/purchase` | `photo_purchases`. | Authenticated photo buyer. | `payment_status = "pending"`, `payment_method = "stripe"`. | Creates Stripe Checkout after purchase row. |
| Client `app/bookings/page.tsx` legacy flow | `bookings`. | Authenticated user in legacy bookings page. | Client-selected `status = "pending"`. | Calls `/api/payment` after insert; later GET `/api/payment` confirms booking from Stripe session. |
| `POST /api/music-marketplace/orders` | `music_marketplace_partner_orders`. | Authenticated music marketplace investor. | `status = "submitted_to_partner"`. | Partner ATS order receipt; no Tourify matching engine. |
| `POST /api/partners/finance/offerings/[id]/orders` | `music_finance_offering_orders`. | Authenticated partner finance investor/order submitter. | `accepted` or `rejected` based on offering gate. | Records an order attempt even when rejected; not a Stripe Checkout order. |

## Marketplace Checkout Order Creation

`app/api/marketplace/checkout/route.ts` creates the most complete local order bundle before contacting Stripe:

- validates auth or guest email,
- validates listing existence/status, single seller, self-purchase, external listing exclusion, currency consistency, and inventory,
- calculates fee snapshot,
- verifies seller payout readiness,
- inserts `marketplace_orders`,
- inserts `marketplace_order_items`,
- inserts `marketplace_payout_ledger`,
- upserts `marketplace_checkout_attempts` when an idempotency key is supplied,
- deletes the created local rows if order items, payout ledger, or Stripe session creation fails.

Order numbers are assigned by the database trigger `marketplace_orders_set_order_number`.

## Ticketing Order Creation

Ticketing uses a shared helper, `lib/ticketing/orders.ts#createPendingOrder`.

Callers:

- `app/api/ticketing/enhanced/route.ts`
- `app/api/ticketing/box-office/route.ts`
- `app/api/ticketing/allocations/route.ts`

The helper:

- loads event ticketing config,
- calculates ticket fees,
- reserves inventory when ticketing v2 is enabled,
- inserts `ticket_sales`,
- writes order number/fee/reservation fields when v2 is enabled,
- releases the reservation on insert failure,
- links the reservation back to the order.

Important nuance: card, cash, free, comp, and allocation flows all create the same `ticket_sales` order shape before diverging into payment or issuance behavior.

## Photo Purchase Order Creation

`app/api/photos/purchase/route.ts` creates `photo_purchases` before Stripe Checkout. This is an order-like purchase record, but it is separate from `marketplace_orders` and `marketplace_payout_ledger`.

Known gaps:

- no explicit idempotency key,
- no checkout-attempt table,
- no shared order number,
- no rollback was observed if Stripe Checkout session creation fails after `photo_purchases` insert.

## Legacy Booking Order Creation

`app/bookings/page.tsx` directly inserts `bookings` from the browser using the public Supabase client and then calls `/api/payment` to create a Stripe Checkout session.

Known gaps:

- order creation is client-side rather than behind a server command,
- no local checkout attempt table,
- no shared finance/order contract,
- provider confirmation later mutates `bookings.status = "confirmed"` through `GET /api/payment`.

## Music Marketplace and Finance Partner Orders

`app/api/music-marketplace/orders/route.ts` creates `music_marketplace_partner_orders` after submitting to a sandbox ATS adapter. The route states that Tourify does not operate a matching engine and records partner order receipts only.

`app/api/partners/finance/offerings/[id]/orders/route.ts` creates `music_finance_offering_orders` for partner finance offerings. It always persists the attempt and marks it `accepted` or `rejected` based on counsel/partner/live-offering gates.

These should become separate transaction-source adapters later, not be folded into marketplace buyer orders without source labels.

## Adjacent Records Not Counted as Direct Order Creation

| Path / table | Classification |
| --- | --- |
| `music_marketplace_subscriptions` | Subscription/order-adjacent investment flow; covered more directly by COM-012 unless transaction adapter scope pulls it in. |
| `booking_requests` and `venue_booking_requests` | Service/venue booking request creation, not a paid order at creation time. They are commerce-adjacent and should feed service-booking adapters later. |
| `marketplace_service_milestones` | Fulfillment/detail records for service order items, not order creation. |
| `marketplace_service_bookings` | Migration-defined service booking table; no active insert path was found in this pass. |
| `subscriptions` | Subscription entitlement state, created/updated by Stripe subscription webhook; covered by COM-012. |

## Gaps for Later Phases

- There is no shared order command wrapper or canonical `Order` contract across marketplace, ticketing, photo purchases, legacy bookings, and partner orders.
- Order ID, order number, idempotency, source, customer, seller, currency, fee snapshot, payment state, fulfillment state, and provider references are inconsistent across sources.
- Client-side legacy `bookings` creation is a significant outlier from the safer server-side command model.
- Photo purchases and legacy bookings do not share marketplace order numbering, payout ledger, or checkout-attempt protections.
- `marketplace_service_bookings` exists in schema but no creation path was confirmed.

## Evidence Commands

- `rg -n "from\\(['\\\"]marketplace_orders['\\\"]\\)|from\\(['\\\"]marketplace_order_items['\\\"]\\)|from\\(['\\\"]ticket_sales['\\\"]\\)|from\\(['\\\"]photo_purchases['\\\"]\\)|from\\(['\\\"]music_marketplace_partner_orders['\\\"]\\)|from\\(['\\\"]marketplace_service_bookings['\\\"]\\)|from\\(['\\\"]bookings['\\\"]\\)|from\\(['\\\"]subscriptions['\\\"]\\)" app lib scripts -g '*.ts' -g '*.tsx'`
- `rg -n "\\.insert\\(|\\.upsert\\(" app/api lib scripts -g '*.ts' -g '*.tsx' | rg "marketplace_orders|marketplace_order_items|ticket_sales|photo_purchases|music_marketplace_partner_orders|marketplace_service_bookings|bookings|subscriptions|order|purchase|booking"`
- `rg -n "createPendingOrder\\(" app lib -g '*.ts' -g '*.tsx'`
- `rg -n "create table.*orders|create table.*order|marketplace_orders|ticket_sales|photo_purchases|music_marketplace_partner_orders|service_bookings|bookings" supabase/migrations -g '*.sql'`
- `sed -n '250,335p' app/api/marketplace/checkout/route.ts`
- `sed -n '1,260p' lib/ticketing/orders.ts`
- `sed -n '420,500p' app/api/ticketing/enhanced/route.ts`
- `sed -n '80,185p' app/api/ticketing/box-office/route.ts`
- `sed -n '130,170p' app/api/ticketing/allocations/route.ts`
- `sed -n '1,130p' app/api/photos/purchase/route.ts`
- `sed -n '120,205p' app/bookings/page.tsx`
- `sed -n '1,120p' app/api/music-marketplace/orders/route.ts`
- `sed -n '50,85p' 'app/api/partners/finance/offerings/[id]/orders/route.ts'`
- `rg -n "from\\(['\\\"]marketplace_service_bookings['\\\"]\\)|marketplace_service_bookings.*insert|service_bookings" app lib -g '*.ts' -g '*.tsx'`
- `sed -n '70,155p' 'app/api/marketplace/service-orders/[orderItemId]/route.ts'`
