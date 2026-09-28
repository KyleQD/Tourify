# Marketplace questions for the product owner (MKT-001)

## Owner direction — 2026-09-10

The Marketplace schema gap is a documented additive-reconciliation dependency,
not permission to enable the archive-only feature set. Entitlement checks must
combine account type with acting context and resource ownership. Preserve the
guest-checkout exception only where the existing contract explicitly allows it.

Prioritized P1-first. Each question is answerable as build / fix / drop with sequencing. Answers become follow-up task records owned by the marketplace agent.

## P1 (blocking — answer before any build work)

### Q1 — The marketplace schema in the app code is ~14 tables ahead of the active migration chain. How do we land it?
**Context:** `app/api/marketplace/**` and `lib/marketplace/**` reference 14 tables (`marketplace_checkout_attempts`, `marketplace_payment_events`, `marketplace_service_requests`/`offers`/`bookings`, `marketplace_external_listings`/`clicks`, `marketplace_post_attachments`, `marketplace_fee_rules`, `marketplace_ticket_collections`, `marketplace_integration_products`/`sync_runs`, `marketplace_provider_webhook_events`, `marketplace_fulfillment_requests`) plus columns (`listing_kind`, `service_mode`, guest-checkout columns, moderation columns, FTS vector). None exist in `supabase/migrations/` — all DDL sits in `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/` flagged `local_only_unapplied`.
**Options:**
- (a) **Fix — re-issue the archived migrations additively** into the active chain after review. Unlocks idempotency, services, external listings, feed commerce, fee rules, FTS in one coherent pass (also closes WS-1.1, WS-3.2).
- (b) **Drop — remove the code paths/schema references** that depend on unapplied schema until product confirms phases earlier than P2/P6 should ship.
**Ask:** Do you want the full archived pack landed now (a), and in what phase order? Which features are confirmed in scope for the first launch vs. deferred?

### Q2 — Where does Stripe webhook idempotency live: marketplace-dedicated ledger or the platform ledger?
**Context:** `app/api/marketplace/webhook/route.ts` has no dedup claim. Proposed `marketplace_payment_events`/`marketplace_n` table is in the unapplied pack; ticketing uses `ticket_stripe_webhook_events`; an existing `platform_webhook_events` ledger covers subscriptions.
**Ask:** Build `marketplace_payment_events` (mirror ticketing pattern, WS-1.2), or fold marketplace into `platform_webhook_events`? This decides M2 + the dedup contract before any other checkout work.

### Q3 — Seller identity: RESOLVED — per-persona storefronts
**Decision:** Use `seller_entity_id` + `seller_entity_type` for the verified acting artist, venue, or organization persona; general accounts use the user entity. `seller_user_id` remains a compatibility field until additive schema reconciliation. The migration-free contract is `lib/marketplace/storefront-identity.ts`.
**Boundary:** Do not enable archive-only schema or adopt runtime writes/queries for the persona columns in this task. Entitlement checks still require server-resolved account type, acting-context ownership, and resource ownership; native guest checkout remains the only explicit guest exception.

### Q4 — Route-level entitlement enforcement: which routes gate by account type now?
**Context:** `requireMarketplaceEnabledForAccount` exists but the audit couldn't confirm every route enforces it (some use `requireApiUser()` only).
**Ask:** Confirm the config of entitlements per route for the launch (goods/services/external for General/Artist/Venue; tickets for Organization). Do you want the full per-route wiring pass as one task (fix) or per-surface (build)?

### Q5 — Cart scope for v1: seller-scoped (current) or multi-artist split checkout?
**Context:** `lib/marketplace/cart.ts` groups by seller, explicitly MVP. Multi-artist checkout is planned (P5, `02-roles-user-flows`).
**Ask:** Lock the v1 cart boundary now (seller-scoped checkout + notice when cart spans sellers) or invest in split checkout before launch?

## P2 (after P1 answers)

### Q6 — Admin marketplace surface: what's in scope for the admin remediation stream?
**Context:** Admin APIs exist (moderation, orders, payouts/retry, fee-rules, overview, webhook-events) and 3 admin pages exist (`/admin/dashboard/marketplace*`), but plan P7 (categories, fee-rule admin UI, domain controls) is not built. WS-1.1 migration reconciliation interacts here.
**Ask:** Which admin surfaces ship before launch, and do they fold into the existing admin-audit remediation stream or get built by marketplace?

### Q7 — Services UX: build buyer-facing booking/quote pages or keep storefront-only?
**Context:** Full service state machine + APIs exist (`service-state-machine.ts`, `service-requests/**`, `service-offers`, `service-orders/[orderItemId]`, `delivery/[orderItemId]`); only storefront/listing surfaces exist, no dedicated buyer service pages.
**Ask:** Are services launch-scope? If yes, which buyer flows (booking form, quote request, counterflow, delivery/tracking pages) are must-build for v1?

### Q8 — FTS: land the quarantined search vector decision (WS-3.2) in the same pass as Q1?
**Ask:** Do we land `marketplace_listings_fts`/search_vector with the archived pack re-issue (probably yes) or defer structured search to a later phase?

### Q9 — Payout E2E coverage: add a payout test harness now or post-launch?
**Ask:** Seller-payout readiness is code-only; do we spin up a Staging Stripe Connect sandbox test before launch or accept manual verification?

## P3 (non-blocking)

### Q10 — Plan-docs drift: update `docs/marketplace-build/marketplace-implementation-plan.md` to current reality, or freeze it as a historical P0 audit?
**Context:** Plan claims the feature-flag suite "doesn't exist" and omits many built modules.
**Ask:** Who owns keeping the marketplace build docs current — marketplace agent (I'd take it) or a docs task in the remediation stream?

---

**Ordering logic:** M1 (schema reconciliation) gates everything — Q1 decides it. Q2 (webhook dedup) and Q3 (identity) are security/architecture locks on checkout and storefront respectively. Q5 (cart boundary) is a product lock. Everything else flows from those four. No current item is blocked on unanswered questions — answers convert directly into follow-up task records.
