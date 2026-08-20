# Implementation Task Catalog

Total tasks: **234**

## P0 — Discovery and Financial Safety Baseline

- **COM-001** — Inventory every admin commerce route, redirect, and navigation entry.
- **COM-002** — Inventory marketplace, ticketing, subscription, promotion, merchandise, service, finance, and payout APIs.
- **COM-003** — Inventory all commerce-related Supabase tables, views, functions, triggers, policies, and storage buckets.
- **COM-004** — Identify all payment providers and environments.
- **COM-005** — Identify all payout providers and destinations.
- **COM-006** — Identify every checkout creation path.
- **COM-007** — Identify every payment capture path.
- **COM-008** — Identify every order creation path.
- **COM-009** — Identify every ticket issuance path.
- **COM-010** — Identify every refund path.
- **COM-011** — Identify every payout scheduling and retry path.
- **COM-012** — Identify every subscription renewal and entitlement path.
- **COM-013** — Identify every promotion payment and activation path.
- **COM-014** — Document current money units and currency handling.
- **COM-015** — Document current fee calculations and snapshots.
- **COM-016** — Document current seller balance derivation.
- **COM-017** — Document current webhook signature and replay protection.
- **COM-018** — Document current role and permission checks.
- **COM-019** — Create representative end-to-end transaction traces.
- **COM-020** — Create baseline reconciliation reports.
- **COM-021** — Create baseline cross-scope access tests.
- **COM-022** — Classify canonical, legacy, prototype, and unused commerce tables.

## P1 — Commerce Context, Permissions, and Money Contracts

- **COM-023** — Define CommerceContext TypeScript contract.
- **COM-024** — Implement server-side commerce context resolver.
- **COM-025** — Implement platform, organization, venue, artist, Event, and seller scope validation.
- **COM-026** — Define CommercePermissionSet.
- **COM-027** — Map existing roles to commerce permissions.
- **COM-028** — Replace broad profile role checks in commerce APIs.
- **COM-029** — Add high-risk action permission checks.
- **COM-030** — Add field-level PII permission checks.
- **COM-031** — Add structured commerce errors.
- **COM-032** — Define canonical Money type using minor units.
- **COM-033** — Add currency validation utilities.
- **COM-034** — Add safe money formatting utilities.
- **COM-035** — Audit and replace floating-point settlement calculations.
- **COM-036** — Add financial action reason requirements.
- **COM-037** — Add correlation IDs.
- **COM-038** — Add idempotency framework.
- **COM-039** — Add optimistic concurrency framework.
- **COM-040** — Add cross-scope API tests.
- **COM-041** — Add cross-scope RLS tests.

## P2 — Canonical Domain and Read Models

- **COM-042** — Define CommerceParty snapshot contract.
- **COM-043** — Define Product and Listing contracts.
- **COM-044** — Define CheckoutAttempt contract.
- **COM-045** — Define PaymentAttempt contract.
- **COM-046** — Define Order and OrderItem contracts.
- **COM-047** — Define FulfillmentObligation contract.
- **COM-048** — Define FeeSnapshot contract.
- **COM-049** — Define Refund contract.
- **COM-050** — Define SellerPayable contract.
- **COM-051** — Define Payout contract.
- **COM-052** — Define Settlement contract.
- **COM-053** — Define CommerceCase contract.
- **COM-054** — Define normalized status dictionaries.
- **COM-055** — Create transaction source adapter interface.
- **COM-056** — Implement marketplace transaction adapter.
- **COM-057** — Implement ticketing transaction adapter.
- **COM-058** — Implement subscription transaction adapter.
- **COM-059** — Implement promotion transaction adapter.
- **COM-060** — Implement service booking adapter.
- **COM-061** — Create secure party snapshot strategy.
- **COM-062** — Create fee snapshot strategy.
- **COM-063** — Create canonical read-model DTOs.

## P3 — Commerce Overview and Attention Engine

- **COM-064** — Design Commerce Overview information architecture.
- **COM-065** — Implement sales KPI service.
- **COM-066** — Implement platform revenue KPI service.
- **COM-067** — Implement liability KPI service.
- **COM-068** — Implement operations KPI service.
- **COM-069** — Create commerce issue persistence strategy.
- **COM-070** — Implement payment integrity rules.
- **COM-071** — Implement fulfillment SLA rules.
- **COM-072** — Implement refund reconciliation rules.
- **COM-073** — Implement payout failure rules.
- **COM-074** — Implement seller readiness rules.
- **COM-075** — Implement ticket issuance rules.
- **COM-076** — Implement subscription entitlement rules.
- **COM-077** — Implement webhook integrity rules.
- **COM-078** — Implement issue ranking.
- **COM-079** — Implement issue ownership.
- **COM-080** — Implement resolve, waive, assign, snooze, and escalate actions.
- **COM-081** — Add amount-at-risk calculation.
- **COM-082** — Add Overview drill-down links.
- **COM-083** — Add loading, empty, error, forbidden, stale, and partial states.

## P4 — Unified Transaction Ledger

- **COM-084** — Create transaction ledger route.
- **COM-085** — Implement unified transaction read service.
- **COM-086** — Add source filters.
- **COM-087** — Add date-range filters.
- **COM-088** — Add seller filters.
- **COM-089** — Add customer filters with permission.
- **COM-090** — Add Event filters.
- **COM-091** — Add currency filters.
- **COM-092** — Add payment-state filters.
- **COM-093** — Add fulfillment-state filters.
- **COM-094** — Add refund-state filters.
- **COM-095** — Add payout-state filters.
- **COM-096** — Add risk filters.
- **COM-097** — Add amount filters.
- **COM-098** — Implement global transaction search.
- **COM-099** — Implement server-side pagination.
- **COM-100** — Implement sorting.
- **COM-101** — Implement saved views.
- **COM-102** — Implement column selection.
- **COM-103** — Implement permission-aware export.
- **COM-104** — Add transaction detail drill-down.

## P5 — Orders and Fulfillment

- **COM-105** — Redesign order list route and DTO.
- **COM-106** — Add visible pagination.
- **COM-107** — Add order number and source.
- **COM-108** — Add seller and customer context.
- **COM-109** — Add line count and total quantity.
- **COM-110** — Add payment, fulfillment, refund, payout, and risk columns.
- **COM-111** — Add order issue count.
- **COM-112** — Add order timeline.
- **COM-113** — Add immutable party snapshots.
- **COM-114** — Add payment detail tab.
- **COM-115** — Add fee detail tab.
- **COM-116** — Add payout detail tab.
- **COM-117** — Add cases and notes tab.
- **COM-118** — Create fulfillment obligation model.
- **COM-119** — Implement physical fulfillment states.
- **COM-120** — Implement digital fulfillment states.
- **COM-121** — Implement ticket fulfillment states.
- **COM-122** — Implement service booking fulfillment states.
- **COM-123** — Implement external checkout states.
- **COM-124** — Create fulfillment queue.
- **COM-125** — Add fulfillment SLA calculations.
- **COM-126** — Add delivery evidence.
- **COM-127** — Add customer and seller communication actions.
- **COM-128** — Prevent API errors from rendering as empty order lists.

## P6 — Payments, Refunds, Disputes, and Chargebacks

- **COM-129** — Create payment attempts route.
- **COM-130** — Create provider event timeline.
- **COM-131** — Add provider failure codes and messages.
- **COM-132** — Add unmatched event queue.
- **COM-133** — Add duplicate provider event detection.
- **COM-134** — Create refund eligibility service.
- **COM-135** — Create full refund workflow.
- **COM-136** — Create partial refund workflow.
- **COM-137** — Add item-level refund allocation.
- **COM-138** — Add seller balance impact preview.
- **COM-139** — Add platform fee treatment preview.
- **COM-140** — Add ticket or access revocation preview.
- **COM-141** — Add refund approval thresholds.
- **COM-142** — Add refund idempotency.
- **COM-143** — Add refund audit.
- **COM-144** — Create dispute queue.
- **COM-145** — Create chargeback queue.
- **COM-146** — Add evidence collection.
- **COM-147** — Add response deadlines.
- **COM-148** — Add payout holds for disputes.
- **COM-149** — Add duplicate charge support flow.

## P7 — Seller Balances, Payouts, and Settlement

- **COM-150** — Create seller balance read model.
- **COM-151** — Create pending, available, held, paid, disputed, and negative balance calculations.
- **COM-152** — Create payout readiness service.
- **COM-153** — Add payout destination status.
- **COM-154** — Add verification status.
- **COM-155** — Add currency support checks.
- **COM-156** — Add payout minimum threshold checks.
- **COM-157** — Add dispute and hold checks.
- **COM-158** — Create safe payout retry preview.
- **COM-159** — Re-fetch provider state before payout actions.
- **COM-160** — Detect existing successful or processing payouts.
- **COM-161** — Require payout action reason.
- **COM-162** — Add payout idempotency.
- **COM-163** — Add payout audit.
- **COM-164** — Create payout holds.
- **COM-165** — Create hold release workflow.
- **COM-166** — Create settlement model.
- **COM-167** — Create settlement reconciliation service.
- **COM-168** — Create seller statements.
- **COM-169** — Create Event ticket settlement reports.
- **COM-170** — Create platform fee reports.
- **COM-171** — Create reconciliation exception queue.

## P8 — Products, Listings, Sellers, and Moderation

- **COM-172** — Create catalog administration route.
- **COM-173** — Define product versus listing ownership.
- **COM-174** — Implement listing lifecycle states.
- **COM-175** — Add listing search, filters, pagination, and sort.
- **COM-176** — Add inventory states.
- **COM-177** — Add listing moderation readiness.
- **COM-178** — Create external listing health checks.
- **COM-179** — Add redirect and HTTPS validation.
- **COM-180** — Add broken checkout issue rules.
- **COM-181** — Create seller operations route.
- **COM-182** — Create seller profile and storefront tabs.
- **COM-183** — Add seller performance metrics.
- **COM-184** — Add seller readiness states.
- **COM-185** — Add seller restriction workflows.
- **COM-186** — Create typed commerce case model.
- **COM-187** — Add case type, priority, owner, SLA, and amount at risk.
- **COM-188** — Add global queue facets.
- **COM-189** — Replace current-page moderation KPI counts.
- **COM-190** — Add safe search handling.
- **COM-191** — Add resolution categories and outcomes.
- **COM-192** — Add case comments and evidence.

## P9 — Ticketing, Subscriptions, Fees, and Promotions

- **COM-193** — Create cross-Event ticket finance route.
- **COM-194** — Create ticket transaction read model.
- **COM-195** — Add paid-versus-issued reconciliation.
- **COM-196** — Add refund-versus-void reconciliation.
- **COM-197** — Add ticket inventory reservation reconciliation.
- **COM-198** — Create Event settlement view.
- **COM-199** — Integrate external ticketing providers.
- **COM-200** — Create subscription operations route.
- **COM-201** — Add subscription state filters.
- **COM-202** — Add renewal failure workflows.
- **COM-203** — Add entitlement reconciliation.
- **COM-204** — Add cancellation and grace-period workflows.
- **COM-205** — Create fee-rule administration route.
- **COM-206** — Add fee rule versioning.
- **COM-207** — Add fixed, percentage, minimum, and maximum fees.
- **COM-208** — Add scoped overrides.
- **COM-209** — Create transaction fee snapshots.
- **COM-210** — Create promotion commerce read model.
- **COM-211** — Add promotion payment-to-activation reconciliation.
- **COM-212** — Add promotion refund and credit workflows.

## P10 — Security, Quality, Rollout, and Legacy Retirement

- **COM-213** — Complete webhook signature audit.
- **COM-214** — Complete replay protection audit.
- **COM-215** — Complete provider secret audit.
- **COM-216** — Complete PII field audit.
- **COM-217** — Complete export audit.
- **COM-218** — Complete financial action separation-of-duties review.
- **COM-219** — Complete WCAG 2.2 AA audit.
- **COM-220** — Run large-data performance tests.
- **COM-221** — Optimize indexes and read models.
- **COM-222** — Create commerce feature flags.
- **COM-223** — Run shadow read-model comparisons.
- **COM-224** — Create amount mismatch dashboard.
- **COM-225** — Enable internal finance pilot.
- **COM-226** — Enable selected seller and Event pilot.
- **COM-227** — Document commerce support runbook.
- **COM-228** — Document provider outage runbook.
- **COM-229** — Document refund repair runbook.
- **COM-230** — Document payout repair runbook.
- **COM-231** — Document settlement repair runbook.
- **COM-232** — Expand beta after release gates.
- **COM-233** — Make Commerce Operations default behind rollback flag.
- **COM-234** — Create approved legacy retirement plan.
