# Promoter Reuse Decisions

**Phase:** P0-4, P0-6, P0-9  
**Audited:** 2026-08-17

## Decisions

| Existing object | Actual audited contract | Decision | Reason |
|---|---|---|---|
| `events_v2` | Current ticketing foundation and runtime target. | Reuse, subject to live FK confirmation. | Canonical event root; no parallel event model. |
| `event_ticketing_config` | One config row per `events_v2` event, including ownership and ticketing state. | Reuse. | Campaign API authorization and event eligibility anchor. |
| `ticket_types` | Current purchase product source. | Reuse. | Program eligibility must reference current purchasable tiers. |
| `event_ticket_types` | SEC-108 read-only legacy table. | Leave untouched. | Not an active product source. |
| `ticket_sales` / `tickets` | Pending order then issued tickets; verified webhook finalizes the transition. | Reuse as financial evidence. | No second checkout, order, or ticket source. |
| `ticket_stripe_webhook_events` | Stripe event ID primary key and duplicate claim in `claimWebhookEvent`. | Reuse idempotency pattern, not as commission key. | Promoter ledger needs its own unique key scoped to sale unit/membership/entry type. |
| `ticket_provider_events` | Current webhook route records verified-provider processing state. | Reuse as provider evidence. | Keep promoter finalization downstream of verified events. |
| `ticket_campaigns` | Mutable discount campaign with eligible ticket-type array and usage counters. | Leave untouched; optionally bridge for reporting only. | It cannot represent immutable promoter terms/membership/commission snapshots. |
| `promo_codes` | Active native discount-code resolution and paid-use consumption. | Reuse through additive promoter-code binding. | Checkout already resolves it; commission remains separate from discount. |
| `event_promo_codes` | Present but not used by active checkout path. | Leave untouched. | Avoid a duplicate code-resolution path. |
| `ticket_referrals` | Single-use referral code tied to referrer email and discount. | Leave untouched; do not use as promoter membership. | It exposes/depends on a referred email and has no campaign/version/commission semantics. |
| `ticket_shares` | Aggregate share record with user/platform/counters; checkout can create a record. | Read/compatibility adapter only. | It has no opaque token, session/touchpoint expiry, or immutable attribution decision. |
| `posts` / `post_shares` | `post_shares` records post/user/destination and is created through `/api/posts/[id]/shares`. | Reuse native share action as source evidence, with additive promoter metadata/touchpoint. | Do not create a competing social share table. |
| `promotion_posts` | Venue promotion content with optional event/tour, author, visibility and publish state. | Integrate through additive promoter attribution metadata. | It is content, not financial attribution. |
| `ticket_revenue_allocations` | Mutable event allocation configuration; existing route delete/reinserts entries. | Leave separate. | Cannot preserve per-sale append-only commission history. |
| `financial_transactions` / `financial_audit_log` | Current ticket finalizer writes ticket financial entries and the platform has audit infrastructure. | Reuse audit conventions; do not make it promoter SOT. | Promoter ledger needs promoter-specific evidence and reversal lineage. |
| `settlements` | Event/tour aggregate with a mutable promoter payout amount. | Future reporting/settlement adapter only. | No per-promoter allocation or anti-overpayment proof. |
| `marketplace_payout_ledger` | One mutable payout row per marketplace order. | Adapter candidate only. | Its foreign key and lifecycle are marketplace-specific. |
| Stripe Connect profile fields | User-level account/onboarding representation with V1 Express/V2 support. | Reuse readiness check in Phase 9 only. | P1–P8 must not automate payouts. |
| `feature_flags` + admin flag governance | Generic flag table and organization-assignment resolver. | Reuse governed organization rollout pattern. | Supports staged, reversible rollout. |

## RLS baseline relevant to P1

- `supabase/migrations/20260719230353_admin_ticketing_security.sql` scopes ticket campaigns, promo codes, shares, and referrals using event/org ticketing permissions.
- `supabase/migrations/20260720181000_tix102_harden_foundation_rls.sql` restricts financial ticket revenue allocations and denies authenticated access to `ticket_stripe_webhook_events`.
- `supabase/migrations/20260720075500_admin_legacy_ticketing_rls_sec108.sql` forces RLS and read-only access on `event_ticket_types`.

New promoter tables must be additive, RLS-enabled before exposure, and use explicit participant/organizer/financial-service policies. In particular, no normal client may insert, update, or delete commission ledger or sale-attribution records.

## Required Phase-1 schema shape

Create a promoter-owned domain rather than overloading old marketing tables:

- event promotion program + immutable version;
- eligible ticket-tier mapping;
- applications and memberships;
- opaque tracking link and normalized touchpoint;
- immutable sale-attribution snapshot;
- append-only commission ledger and future payout-allocation bridge;
- risk flag evidence.

All promoter event references remain blocked on the live-catalog verification recorded in `EVENT_IDENTITY_AUDIT.md`. No migration has been created in P0.

## Explicit Phase-0 answers

1. `ticket_campaigns`, `ticket_referrals`, and `ticket_shares` do not satisfy promoter-domain semantics; use adapters/read evidence only where appropriate.
2. Promo-code redemption is already active through `promo_codes` in native checkout.
3. Native post/share actions exist, but neither presently preserves promoter attribution; add only server-side promoter metadata and touchpoints in Phase 4.
4. Anonymous attribution/session persistence was not found in the audited checkout or share paths. Phase 4/5 needs a first-party, privacy-reviewed attribution context.
5. Stripe Connect exists at the profile level; no validated event-promoter payout contract exists. Payout automation remains out of scope until Phase 9.
