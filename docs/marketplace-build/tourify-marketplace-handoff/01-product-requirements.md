# Product Requirements Document

## 1. Product Summary

Tourify Marketplace is a commerce layer attached to Tourify's existing identity, profile, feed, ticketing, music, messaging, analytics, and account-management systems.

It provides three connected surfaces:

1. **Marketplace hub:** centralized search and discovery across eligible public listings.
2. **Profile storefront:** a configurable marketplace module on a seller's public profile and a dedicated storefront page.
3. **Feed commerce:** shareable listing and storefront cards that route buyers directly to the appropriate transaction action.

The marketplace must distinguish between:

- **Native physical listings:** managed and purchased through Tourify.
- **Native service listings:** fixed-price, booking-request, or quote-request transactions managed through Tourify.
- **External listings:** imported presentation data with an explicit redirect to the external provider's checkout.
- **Tickets:** owned by Tourify's existing ticketing system and surfaced in the marketplace without duplicating ticket inventory or order logic.
- **Music:** excluded from marketplace transactions and retained in the existing music player/distribution ecosystem.

## 2. Product Goals

- Let Tourify users monetize the goods and professional services already represented by their profiles.
- Give artists and venues a polished storefront without requiring a separate commerce website.
- Make commerce native to discovery by connecting listings to public profiles, marketplace search, and feed distribution.
- Preserve third-party seller relationships by supporting external listing links without pretending Tourify controls their stock or fulfillment.
- Give organizations a marketplace surface for tickets while retaining one authoritative ticketing system.
- Create a configurable transaction-fee revenue stream for Tourify.
- Build additively so existing profile, feed, ticketing, music, and payment behavior remains intact.

## 3. Success Metrics

### Adoption

- Percentage of eligible active accounts that activate a storefront.
- Percentage of activated storefronts with at least one published listing.
- Listing creation completion rate by account type.
- Third-party import completion rate.

### Discovery

- Marketplace search-to-listing click-through rate.
- Profile marketplace module engagement.
- Feed listing-card click-through rate.
- Storefront share versus specific-item share performance.

### Conversion

- Native listing checkout conversion rate.
- External listing outbound-click rate.
- Service inquiry-to-acceptance and inquiry-to-payment conversion.
- Guest-checkout completion and post-purchase account-claim rate.

### Reliability

- Checkout-session creation success rate.
- Payment-webhook processing success and duplicate-event suppression.
- Order confirmation delivery rate.
- Listing publication and media-upload error rates.

### Trust

- Refund, dispute, report, and moderation rates.
- Seller response time for booking and quote requests.
- Percentage of orders shipped or completed within the stated handling time.

## 4. Account Entitlements

| Capability | General | Artist | Venue | Organization |
| --- | ---: | ---: | ---: | ---: |
| Activate profile storefront | Yes | Yes | Yes | Ticket storefront only |
| Native physical goods | Yes | Yes | Yes | No |
| Native services | Yes | Yes | Yes | No |
| External goods/services | Yes | Yes | Yes | No |
| Native/external tickets | No, unless already authorized by ticketing | No, unless already authorized by ticketing | No, unless already authorized by ticketing | Yes |
| Music listings | No | No; route to music player | No | No |
| Share listing to feed | Yes | Yes | Yes | Yes, tickets only |
| Share entire storefront | Yes | Yes | Yes | Yes |
| Native seller payout onboarding | When native selling is activated | When native selling is activated | When native selling is activated | Reuse ticketing payout rules |
| Team members manage store | Not initially | According to existing artist role permissions | According to existing venue role permissions | According to existing organization/ticket permissions |

All entitlements must be enforced on the server. Hiding a UI control is not authorization.

## 5. Listing Types

### Native Physical Goods

Required:

- Title, description, category, condition, price, currency, images, quantity/availability, fulfillment method, handling time, return policy, and publication state.
- Optional variants such as size, color, edition, or bundle.
- Seller-managed shipping and local pickup in version 1.
- Inventory reservation while checkout is active, with automatic release on expiration or payment failure.

Examples:

- General: photography prints, custom cases, production tools, handmade goods.
- Artist: shirts, posters, vinyl, accessories, tour merchandise.
- Venue: branded merchandise, reusable cups, venue posters, rental accessories if sold as goods.

### Native Services

Shared required fields:

- Title, description, category, service area or remote status, media, pricing presentation, turnaround/lead time, cancellation terms, and transaction mode.

Seller-selected transaction modes:

1. **Fixed price:** buyer chooses options and pays immediately.
2. **Booking request:** buyer proposes time, date, location, scope, and notes; seller accepts, declines, or proposes changes. Payment timing is configurable as deposit, full payment after acceptance, or manual invoice if supported by the current payment system.
3. **Quote request:** buyer sends requirements; seller responds with a versioned quote; buyer accepts and pays through a generated checkout.

Examples:

- General: photography, videography, stagehand work, design, marketing, dance, AV support.
- Artist: appearances, workshops, features outside the music-player sale flow, merchandise customization.
- Venue: room rental, rehearsal space, production packages, equipment rental, hospitality add-ons.

The implementation must check whether these service types overlap existing Tourify jobs, staffing, venue-booking, or event-service workflows. Reuse existing records and messaging where appropriate; do not create a second hiring system.

### External Listings

Required:

- Seller pastes a valid HTTPS URL.
- Server fetches safe metadata when permitted: title, image, description, displayed price, currency, and provider name.
- Seller reviews and may correct presentation metadata before publishing.
- Tourify stores the canonical external URL and a metadata snapshot.
- Listing is visibly labeled “External checkout” or “Sold on [Provider].”
- Price and availability include a “May differ on provider” disclosure unless a verified sync exists later.
- CTA records an outbound click and opens the provider checkout/listing.

Tourify must not collect payment, reserve inventory, promise availability, or create an order for an external listing.

### Tickets

- Marketplace ticket cards read from the authoritative existing ticket/event/ticket-type records.
- Native tickets route to the existing native ticket checkout.
- Approved external ticket listings route to their provider.
- Organization storefront configuration may feature, reorder, hide, or share eligible tickets but may not create a parallel ticket record.
- Existing ticket limits, sales windows, fees, QR issuance, refunds, and analytics remain authoritative.

### Music

- Marketplace forms must not offer “music” as a product category.
- Artist storefronts may display a “Listen or buy music” bridge module that links to the existing Tourify music player/distribution surface.
- Feed shares created from the music ecosystem remain music posts, not marketplace listings.

## 6. Storefront Requirements

Each eligible seller has zero or one active storefront per authoritative Tourify account identity.

Storefront configuration includes:

- Store name and unique slug.
- Short description and optional policy summary.
- Hero/cover media using the current profile's visual system.
- Featured listings and manual ordering.
- Category filters derived from published listings.
- Fulfillment/service area summary.
- Contact or message action using Tourify's current messaging permissions.
- Profile module visibility and placement.
- Draft, active, paused, or suspended status.

The public profile module includes:

- Marketplace/store name.
- Up to six featured listings.
- “View marketplace” action.
- Compact empty state visible only to the owner.
- Optional quick-view modal or mobile bottom sheet.

## 7. Marketplace Hub Requirements

### Search and Filters

- Keyword search across title, seller, category, tags, and location/service area.
- Type: goods, services, tickets, external.
- Category.
- Native versus external checkout.
- Price range and currency where comparable.
- Location, remote availability, shipping/pickup options.
- Seller/account type.
- Availability and publication date.
- Sort: relevance, newest, price, and optionally popularity after analytics are reliable.

### Results

- Server-filtered, paginated results.
- Cards clearly show seller identity, listing type, price presentation, fulfillment/location, and external-checkout status.
- Suspended, expired, sold-out, unpublished, or unauthorized listings must not appear.
- Search indexes only public, eligible listing data.

### Merchandising

- Featured categories and editorial collections managed through admin configuration.
- No pay-to-rank behavior until promoted-listing rules and disclosure are explicitly approved.
- Logged-out users may browse public listings.

## 8. Feed Commerce Requirements

The existing post system remains authoritative. Marketplace content is attached through a typed post attachment or join record.

### Specific Listing Share

- Seller selects “Share to feed” from listing management or the public listing.
- Composer contains an immutable marketplace card plus an editable caption.
- Card data renders from the current listing record, not a copied title/price stored permanently in the post.
- Native physical or fixed-price service CTA: `Buy now` leading to the listing-specific checkout/pre-checkout page.
- Booking service CTA: `Request booking`.
- Quote service CTA: `Request quote`.
- External listing CTA: `Buy on [Provider]`.
- Ticket CTA: reuse the existing ticket action.
- If a listing becomes unavailable, the historical post remains but the card displays its current unavailable state and disables or changes the CTA.

### Storefront Share

- Seller may share the storefront rather than an individual listing.
- CTA is `View marketplace`.
- Storefront shares do not force checkout.

### General Sharing

- Public listing/store URLs have stable Open Graph metadata.
- Native share action supports copying a URL and the existing Tourify sharing channels.
- Attribution preserves the original seller even when another user shares the listing.

## 9. Native Checkout Requirements

- Guest and authenticated checkout.
- Single seller per checkout.
- Server-authoritative price, fee, tax, inventory, seller eligibility, and listing status validation.
- No trusted totals from the browser.
- Contact email required; shipping address required only when applicable.
- Optional billing/shipping collection delegated to the approved payment UI.
- Clear seller identity, return/cancellation terms, external/native status, subtotal, shipping, taxes, platform/service fees where legally required, and total.
- Webhook-confirmed fulfillment; browser redirects are not proof of payment.
- Idempotent order creation and webhook processing.
- Guest receives confirmation email and an expiring order-access/claim flow.
- Guest may create or sign into an account after purchase and claim the order after email verification.

## 10. Platform Fees

Admin-configurable rules may include:

- Percentage of eligible subtotal.
- Fixed amount per transaction.
- Minimum or maximum fee.
- Account-type, listing-type, plan, promotion, or campaign overrides.
- Effective date and version.

Fee rules must be snapshotted on each order and must not retroactively change historical accounting.

Before implementation, legal/finance must confirm:

- Merchant-of-record responsibility.
- Whether platform or seller pays processor fees.
- Tax collection responsibility.
- Refund treatment of Tourify fees.
- Dispute/chargeback allocation.
- Restricted products and prohibited-service policy.
- Seller identity/KYC requirements.

## 11. Admin and Trust Requirements

- Search and inspect storefronts, listings, orders, service requests, fees, payment status, outbound links, and moderation reports.
- Suspend a listing or storefront without deleting it.
- Record reason, actor, time, and restoration history.
- Configure category taxonomy, fee rules, prohibited content, and feature flags.
- Review risky external domains and disable unsafe redirects.
- Maintain audit history for pricing, payout configuration, refunds, and moderation.
- Never expose payment secrets, private addresses, customer emails, or service-request attachments to public search.

## 12. Notifications

Use Tourify's current notification and email systems.

Required events:

- Listing published/rejected/suspended.
- Native order paid, failed, refunded, canceled, shipped, delivered/completed.
- Booking or quote request received.
- Service request accepted, declined, changed, expired, or canceled.
- Quote sent, revised, accepted, declined, or expired.
- Seller payout onboarding incomplete or restricted.
- External listing link becomes invalid or unsafe.

## 13. Non-Functional Requirements

- Mobile-first and responsive.
- WCAG 2.2 AA target.
- Core listing pages indexable with canonical URLs and structured metadata where appropriate.
- Public page performance compatible with Tourify's existing performance budget.
- Media optimized through existing image tooling.
- Rate limiting for import, checkout, quote, booking, report, and guest-order endpoints.
- Structured logs, traceable request IDs, webhook event history, and alerting.
- Feature flags at global, account-type, and individual-account level.

## 14. Non-Goals for Version 1

- Native music sales or distribution changes.
- Multi-vendor cart or split checkout.
- Automated Shopify/Etsy/etc. catalog synchronization.
- Marketplace subscription products.
- Native digital-download fulfillment.
- Auction/bidding system.
- Buyer/seller public review system.
- Automated shipping-label purchasing.
- Cross-border launch before legal, tax, currency, and payout review.

