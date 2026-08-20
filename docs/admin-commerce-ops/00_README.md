# Tourify Admin Commerce Operations — Development Plan Suite

## Purpose

This suite converts the read-only audit of Tourify's Admin Commerce ecosystem into a detailed, phased, non-destructive implementation plan.

The goal is not simply to improve `/admin/dashboard/marketplace`. The goal is to create a production-ready **Commerce Operations HQ** that can trace and manage commercial activity across:

- marketplace listings,
- native products,
- physical merchandise,
- digital products,
- services and bookings,
- external listings and checkout links,
- Event ticketing,
- subscriptions,
- promotions,
- payment attempts,
- orders,
- fulfillment,
- refunds,
- disputes,
- platform fees,
- seller balances,
- payouts,
- settlements,
- reconciliation,
- moderation,
- financial audit,
- and operational analytics.

## Governing Product Principle

> Monitor every transaction, seller, product, payment, fee, payout, refund, fulfillment obligation, and financial exception from one trusted operational workspace.

## Required Implementation Order

The build agent must not begin with visual redesign.

1. Map all commerce sources and money movement.
2. Stabilize commerce scope, authorization, and financial controls.
3. Establish canonical transaction, money, party, and status contracts.
4. Build secure read models and reconciliation.
5. Build Commerce Overview and Needs Attention.
6. Consolidate transactions, orders, fulfillment, payments, payouts, and risk.
7. Integrate ticketing, subscriptions, promotions, sellers, and listings.
8. Roll out behind feature flags with measurable parity and rollback.

## Non-Negotiable Constraints

- Do not reset Supabase.
- Do not delete or rename active tables without an approved compatibility plan.
- Do not replace payment, ticketing, payout, or refund flows in one destructive step.
- Preserve existing orders, listings, tickets, subscriptions, payment events, fee records, and payout records.
- Use additive migrations.
- Treat all monetary values as currency-aware and avoid floating-point settlement logic.
- Verify provider state before retries, refunds, or payout actions.
- Require idempotency for money-moving operations.
- Require server-side authorization and RLS.
- Never expose payment-provider secrets or full payment credentials.
- Restrict buyer and seller PII.
- Audit every high-risk financial mutation.
- Keep existing workflows available until parity and reconciliation tests pass.
- Record progress and evidence in `progress-checklist.json`.

## File Index

- `01_EXECUTIVE_OVERVIEW.md`
- `02_AUDIT_BASELINE.md`
- `03_TARGET_PRODUCT_AND_OPERATING_MODEL.md`
- `04_INFORMATION_ARCHITECTURE_AND_UX_SYSTEM.md`
- `05_COMMERCE_CONTEXT_AUTHORIZATION_AND_RLS.md`
- `06_CANONICAL_COMMERCE_DOMAIN_MODEL.md`
- `07_COMMERCE_OVERVIEW_AND_ATTENTION_ENGINE.md`
- `08_UNIFIED_TRANSACTION_LEDGER.md`
- `09_ORDERS_AND_ORDER_DETAILS.md`
- `10_PRODUCTS_LISTINGS_AND_CATALOG.md`
- `11_SELLERS_STOREFRONTS_AND_BALANCES.md`
- `12_CUSTOMERS_SUPPORT_AND_CASE_HISTORY.md`
- `13_FULFILLMENT_DELIVERY_AND_BOOKINGS.md`
- `14_PAYMENTS_REFUNDS_DISPUTES_AND_CHARGEBACKS.md`
- `15_PAYOUTS_SETTLEMENTS_AND_RECONCILIATION.md`
- `16_MODERATION_RISK_AND_POLICY_ENFORCEMENT.md`
- `17_TICKETING_COMMERCE_INTEGRATION.md`
- `18_SUBSCRIPTIONS_FEES_AND_PROMOTIONS.md`
- `19_SUPABASE_DATA_MODEL_AND_MIGRATIONS.md`
- `20_BACKEND_APIS_SERVICES_EVENTS_AND_WEBHOOKS.md`
- `21_SECURITY_PRIVACY_ACCESSIBILITY_AND_PERFORMANCE.md`
- `22_TESTING_STRATEGY.md`
- `23_ROLLOUT_MIGRATION_AND_ROLLBACK.md`
- `24_MASTER_IMPLEMENTATION_ROADMAP.md`
- `25_IMPLEMENTATION_TASK_CATALOG.md`
- `26_DEFINITION_OF_DONE.md`
- `27_BUILD_AGENT_PROMPT.md`
- `progress-checklist.json`

## How the Build Agent Must Work

1. Audit current routes, APIs, schema, policies, provider integrations, and feature flags.
2. Trace representative transactions end to end.
3. Create a canonical commerce map before editing.
4. Update the progress checklist with exact targets and dependencies.
5. Execute one bounded phase at a time.
6. Verify database, provider, and UI outcomes after every change.
7. Record commands, test results, screenshots, reconciliation evidence, and limitations.
8. Stop any destructive or financially ambiguous operation.
