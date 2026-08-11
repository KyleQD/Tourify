# Tourify Marketplace Development Plan and Engineering Handoff

Version: 1.0  
Prepared: July 27, 2026  
Status: Approved product direction; repository audit required before implementation

## Purpose

This package defines a production-ready marketplace for Tourify that lets supported account types publish native goods and services, attach third-party listings, surface storefronts on public profiles, promote listings through feed posts, and participate in a central discovery marketplace.

The documents are written for product, design, engineering, QA, and an implementation model. They intentionally separate confirmed product decisions from technical assumptions that must be resolved against the current Tourify repository and production database.

## Confirmed Decisions

| Decision | Approved direction |
| --- | --- |
| Marketplace discovery | Full searchable marketplace hub, profile storefronts, and feed posts |
| Third-party listings | Import a listing into Tourify, display it as an external listing, and send the buyer to the provider's checkout |
| Native inventory | Physical goods and seller-configurable services |
| Services | Fixed-price checkout, booking request, or quote request |
| Guest checkout | Allowed for native purchases |
| Platform revenue | Configurable percentage and/or fixed transaction fee |
| General accounts | May sell goods and services and place a marketplace module on their public profile |
| Artist accounts | May sell merchandise and services; music remains in Tourify's existing music player/distribution ecosystem |
| Venue accounts | May sell merchandise and services; no music listings |
| Organization accounts | Marketplace participation is limited to tickets |
| Feed sharing | A specific listing post routes to the transaction action; a storefront share routes to the seller's storefront |
| Database safety | Additive migrations only; never reset, wipe, truncate, or rebuild the production database |

## Important Interpretation

The phrase “marketplace modal on a profile” is implemented as:

1. A configurable **Marketplace profile module** visible on the public profile.
2. A **quick-view modal or drawer** opened from a product card.
3. A full storefront page for browsing all of the seller's listings.

This avoids hiding the entire storefront behind a dialog while preserving the requested modal interaction.

## Recommended Release Boundary

Version 1 should use single-seller checkout. A buyer can purchase one or more native physical items from one seller in a checkout, but cannot combine items from different sellers. External listings always use the external provider's checkout. Services use the transaction mode selected by the seller. Organization tickets reuse Tourify's existing ticketing transaction path rather than creating a duplicate ticket-order system.

Cross-seller carts, native digital downloads, auctions, subscriptions, wholesale ordering, music sales, and automated third-party inventory synchronization are deferred.

## Package Contents

| File | Intended reader | Purpose |
| --- | --- | --- |
| `01-product-requirements.md` | Product and engineering | Scope, rules, requirements, metrics, and non-goals |
| `02-roles-user-flows.md` | Product, design, QA | Account permissions and end-to-end user flows |
| `03-ui-ux-specification.md` | Product and design | Information architecture, responsive layouts, components, and interface states |
| `04-technical-architecture.md` | Engineering | System boundaries, payment abstraction, APIs, events, and integrations |
| `05-data-security-migrations.md` | Backend, database, security | Logical schema, RLS, storage, privacy, and additive migration policy |
| `06-implementation-roadmap.md` | Engineering and delivery | Phases, task order, dependencies, gates, and rollout |
| `07-qa-acceptance.md` | QA and engineering | Acceptance criteria, test matrix, and release gates |
| `08-ai-agent-handoff-prompt.md` | Implementation model | Ready-to-use implementation prompt with non-destructive constraints |
| `marketplace-implementation-tasks.json` | Implementation model and PM | Machine-readable execution plan and completion controls |

## Required Pre-Implementation Audit

Before writing application code or migrations, the implementation agent must map:

- Current profile, artist, venue, organization, and multi-account ownership tables.
- Existing account-switching and authorization helpers.
- Current payment processor, ticket checkout, refunds, webhooks, payout logic, and finance reporting.
- Current feed post and attachment model.
- Current profile-section/module configuration.
- Existing media buckets and upload policies.
- Existing notifications, messaging, calendar, availability, analytics, and moderation systems.
- Current route conventions across general, artist, venue, and organization dashboards.
- Existing feature-flag system and admin settings.

No table or route names in this package should be copied blindly when the repository already contains an authoritative equivalent.

## Definition of Done

The marketplace is complete only when:

- Every permitted account type can perform its approved listing and storefront flows.
- Every prohibited account/listing combination is rejected in both UI and server authorization.
- Native checkout, external redirect, fixed-price service, booking request, and quote request flows are verified.
- Guest order recovery works without exposing customer or order data.
- Profile and feed integrations use the marketplace as a shared source of truth.
- Fees, refunds, payouts, moderation, notifications, and analytics are operational.
- New tables and storage policies pass security review.
- The full existing test suite still passes.
- A production migration dry run shows only reviewed additive changes.
- The feature can be disabled without deleting data or rolling back unrelated systems.

