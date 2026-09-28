# Implementation Roadmap

## Delivery Strategy

Build vertically behind feature flags, starting with repository/schema mapping and ending with controlled cohort rollout. Each phase has an explicit gate. A phase is not complete because screens render; authorization, error states, analytics, tests, and migrations are part of the same phase.

## Phase 0 — Audit and Integration Contract

### Tasks

- Map repository architecture and current account routes.
- Map multi-account identity, membership, and authorization.
- Inventory profile modules and feed attachment types.
- Inventory ticket, music, payment, payout, webhook, refund, finance, and analytics paths.
- Inventory notifications, messaging, calendar, storage, admin, and moderation.
- Inspect Supabase migration style, remote/local drift process, grants, RLS, generated types, and current Node/runtime versions.
- Produce a written “reuse versus add” matrix.
- Confirm payment processor and merchant-of-record decision.
- Confirm shipping/tax/refund/dispute policies and supported launch countries/currencies.

### Deliverables

- `marketplace-current-system-audit.md`
- `marketplace-integration-map.md`
- Updated task JSON with exact files/tables/routes.
- Risk register and decision log.

### Gate

No implementation or migration until ownership, payments, feed, profile, tickets, and schema integration points are approved.

## Phase 1 — Domain Foundation and Feature Flags

### Tasks

- Add marketplace feature flags defaulted off.
- Create shared entitlement resolver by account type and membership.
- Add logical storefront/listing foundation using additive migrations.
- Enable RLS, minimum grants, indexes, constraints, and audit integration.
- Regenerate database types using the repository's current method.
- Add server validation schemas and domain service boundaries.
- Add test factories for each account type.

### Gate

- Migration chain passes locally.
- No existing test regressions.
- RLS allow/deny tests pass.
- Disabled flags produce no public route/nav changes.

## Phase 2 — Storefront and Listing Management

### Tasks

- Seller dashboard shell shared across account contexts.
- Storefront creation and settings.
- Native physical listing drafts, media, variants, inventory, fulfillment, and policies.
- Native service listing drafts and mode selection.
- External listing import, validation, manual fallback, and safe redirect.
- Listing preview, publish, pause, restock, archive, and suspension states.
- Owner/team authorization.
- Payout status placeholder/integration state without enabling payments prematurely.

### Gate

- General, artist, and venue create permitted listing types.
- Organization cannot create goods/services.
- Artist cannot create marketplace music.
- Draft/published/suspended visibility tests pass.
- Unsafe URL/SSRF tests pass.

## Phase 3 — Public Storefront, Profiles, and Marketplace Hub

### Tasks

- Public storefront routes and SEO metadata.
- Profile Marketplace module and quick-view modal/drawer.
- Marketplace hub, search, filters, pagination, responsive cards.
- Public projections and search indexes.
- Artist music bridge.
- Organization ticket collection using current ticket adapter.
- Loading, empty, error, unavailable, and feature-disabled states.
- Accessibility pass.

### Gate

- Anonymous users only see eligible public data.
- Storefront/profile/hub render the same current listing source.
- Ticket checkout remains authoritative.
- Search returns no drafts, suspended items, private service data, or customer data.
- Performance budget and accessibility checks pass.

## Phase 4 — Feed Commerce and Sharing

### Tasks

- Typed listing/storefront post attachment.
- Composer integration.
- Feed card renderers with current status and correct CTA.
- Stable public URLs and Open Graph metadata.
- Reshare attribution.
- Source attribution analytics.
- Unavailable/suspended listing behavior in historical posts.

### Gate

- Specific item routes to checkout/booking/quote/external/ticket action.
- Store share routes to storefront.
- Post deletion never deletes marketplace data.
- Listing pause never deletes historical posts.
- Feed privacy rules remain unchanged.

## Phase 5 — Native Goods Checkout

### Tasks

- Confirm and implement current provider marketplace/payout path.
- Seller payout onboarding and capability checks.
- Server-authoritative order/line-item/fee calculations.
- Inventory reservation.
- Guest and authenticated checkout.
- Configurable fee rules with historical snapshots.
- Signed webhook endpoint and replay-safe event processing.
- Order confirmation, guest access, email, account claim.
- Seller order management, fulfillment, refund/support hooks.
- Finance/analytics integration.

### Gate

- Webhook—not redirect—confirms payment.
- Duplicate checkout/webhook tests create no duplicate paid orders.
- Price manipulation fails.
- Guest order access cannot be enumerated.
- Refund, fee, inventory, and payout reconciliation pass sandbox tests.
- Seller without payout capability cannot accept native payment.

## Phase 6 — Services: Fixed, Booking, and Quote

### Tasks

- Fixed-price service checkout.
- Booking request, counter, accept/decline, expiration, payment/deposit.
- Quote request, immutable revisions, accept/decline/expire, payment.
- Shared timeline and current messaging integration.
- Calendar integration after confirmation.
- Private attachments through current file system.
- Cancellation/refund and service completion states.

### Gate

- State transition and concurrency tests pass.
- A proposed booking never appears confirmed before acceptance/payment rules.
- An expired or superseded quote cannot be purchased.
- Participants only can see private request details.
- Notifications are delivered once per domain event.

## Phase 7 — Admin, Trust, and Operations

### Tasks

- Store/listing/order/service search.
- Moderation reports, suspension, restoration, and audit reasons.
- External-domain review and health checks.
- Category and fee-rule management.
- Payment/webhook exception queue.
- Refund/dispute operational flow.
- Metrics, dashboards, alerts, retention controls, and support timeline.

### Gate

- Moderator cannot perform finance actions without permission.
- Suspension removes transactions quickly without data deletion.
- Fee changes affect only new eligible checkouts.
- Audit history is complete for sensitive actions.

## Phase 8 — Hardening and Controlled Launch

### Tasks

- End-to-end tests across all account and buyer types.
- Browser/mobile/accessibility validation.
- Load/performance tests for hub/search/listing/checkout.
- Security review: RLS, SSRF, IDOR/BOLA, mass assignment, webhook signatures, secrets, rate limits.
- Production migration dry run and review.
- Runbook, support scripts, monitoring, incident response, and rollback rehearsal.
- Internal cohort → trusted beta sellers → account-type cohorts → public discovery.

### Gate

- All release gates in `07-qa-acceptance.md` pass.
- No open critical/high security findings.
- Webhook/checkout/support owners are assigned.
- Feature-disable rollback is rehearsed without data deletion.

## Dependencies and Decisions

| Dependency | Needed by | Blocking condition |
| --- | --- | --- |
| Existing payment processor and marketplace support | Phase 5 | Unknown processor or payout model |
| Merchant-of-record/tax/dispute policy | Phase 5 | No accountable business owner |
| Authoritative multi-account model | Phase 1 | Ownership cannot be resolved safely |
| Current ticket API/model | Phase 3 | Marketplace would duplicate ticket data |
| Feed attachment model | Phase 4 | No stable typed association |
| Messaging/calendar permissions | Phase 6 | Private service data could leak |
| Storage policy | Phases 2 and 6 | Media/private attachments not isolated |

## Suggested Team Workstreams

- Product/design.
- Marketplace domain/full-stack.
- Payments/finance.
- Database/security.
- Feed/profile/ticket integrations.
- QA/release operations.

Parallel work begins only after Phase 0 defines stable contracts.

## Release Policy

- No direct production-first development.
- No enabling all accounts immediately.
- No database reset or cleanup migration.
- No silent fallback from native checkout to external checkout.
- No launch without refund/support ownership.
- No launch metric based only on page views; payment and service-state reliability are first-class.

## Rough Effort Shape

Effort depends heavily on current payment, ticket, account, feed, and profile maturity. Treat these as relative, not calendar commitments:

| Phase | Relative effort |
| --- | --- |
| 0. Audit | Medium |
| 1. Foundation | Medium |
| 2. Seller/listings | Large |
| 3. Public discovery/profile | Large |
| 4. Feed sharing | Medium |
| 5. Native checkout | Very large/high risk |
| 6. Services | Very large/high state complexity |
| 7. Admin/operations | Large |
| 8. Hardening/launch | Large |

