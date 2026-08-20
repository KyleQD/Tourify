# Executive Overview

## Current State

The current Admin commerce experience is centered on a route labeled **Marketplace** with three major tabs:

- Orders
- Moderation
- Payouts

The implementation contains real capabilities, including order listing, moderation pagination, seller and buyer relationships, order item details, platform-fee visibility, payout states, payout retry metadata, and a controlled admin route surface.

However, Tourify's commerce footprint is much broader than this page. Commercial activity exists across marketplace products, external listings, merchandise, services, ticketing, subscriptions, promotions, payment events, checkout attempts, fees, refunds, seller obligations, payouts, and settlement records.

## Principal Product Problems

### 1. The section name and navigation understate the scope

Administrators cannot easily determine where to find ticket revenue, refunds, subscriptions, seller balances, fees, fulfillment exceptions, webhook failures, or settlement issues.

### 2. Transaction sources are fragmented

Marketplace, ticketing, subscriptions, promotions, merchandise, and service bookings each have their own records. There is no unified transaction ledger or shared operational status model.

### 3. Financial safety is not yet expressed as a workflow

Actions such as payout retry require stronger provider-state verification, idempotency, reason capture, impact preview, audit, and role separation.

### 4. Money representation needs a canonical contract

Different routes display dollar symbols or fallback currency values. A production system must use currency-aware minor-unit arithmetic, transaction fee snapshots, and explicit mixed-currency behavior.

### 5. Orders are visible but not operationally complete

The current order list emphasizes payment status. Administrators also need fulfillment, refund, dispute, payout, risk, seller, customer, source, Event, and issue context.

### 6. Moderation is a generic queue

Listing reports, order disputes, seller complaints, fraud reviews, fulfillment issues, copyright claims, and payment exceptions require typed case workflows, ownership, SLA, evidence, and resolution categories.

### 7. There is no Commerce Command Center

The system does not yet answer:

- How much money moved today?
- What portion belongs to sellers?
- Which orders are unfulfilled?
- Which payouts failed?
- Which ticket purchases did not issue tickets?
- Which refunds are pending?
- Which provider events are unmatched?
- Which Events cannot settle?

## Target Outcome

Create a unified **Commerce Operations HQ** with these durable product areas:

1. Commerce Overview
2. Transactions
3. Orders
4. Products & Listings
5. Sellers
6. Customers
7. Fulfillment
8. Payments & Refunds
9. Payouts & Settlements
10. Moderation & Risk
11. Ticketing
12. Subscriptions & Fees
13. Settings & Audit

## Immediate P0 Priorities

1. Inventory all commerce sources and provider integrations.
2. Create one CommerceContext and permission model.
3. Replace broad role-string checks with explicit permissions.
4. Define canonical money, transaction, party, order, fee, refund, and payout contracts.
5. Trace payments through fulfillment and settlement.
6. Add idempotency and provider-state verification to financial actions.
7. Build cross-scope authorization and RLS tests.
8. Protect customer and seller PII.
9. Prevent API failures from appearing as empty data.
10. Establish financial reconciliation and immutable audit evidence.

## Expected Business Benefits

- Faster transaction support.
- Lower payout risk.
- Fewer unfulfilled paid orders.
- Better ticket-sale reconciliation.
- Clearer seller balances.
- Safer refunds.
- Faster dispute resolution.
- More reliable platform-fee reporting.
- Better subscription recovery.
- Reduced financial data fragmentation.
- Stronger internal controls and audit readiness.
