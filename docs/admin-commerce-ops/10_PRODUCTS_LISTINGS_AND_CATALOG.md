# Products, Listings, and Catalog

## Objective

Provide a complete administrative view of what is being sold, by whom, through which checkout, and with what operational risk.

## Product Types

- Physical product.
- Digital product.
- Service.
- Booking request.
- Quote request.
- Ticket.
- Music-related offer.
- External listing.
- Subscription plan.
- Promotion package.

## Product versus Listing

### Product

Canonical sellable definition.

### Listing

Seller-specific commercial offer including:

- price,
- currency,
- inventory,
- availability,
- fulfillment method,
- visibility,
- moderation,
- external destination.

## Listing Lifecycle

- Draft.
- Incomplete.
- Pending review.
- Approved.
- Published.
- Hidden.
- Rejected.
- Suspended.
- Out of stock.
- Archived.

## List Columns

- Listing.
- Seller.
- Type.
- Native or external.
- Price.
- Currency.
- Inventory.
- Visibility.
- Moderation state.
- Sales.
- Refund rate.
- Fulfillment SLA.
- External link health.
- Last update.
- Issues.

## Moderation Readiness

Before publishing:

- Seller valid.
- Payout readiness known.
- Required content complete.
- Price and currency valid.
- Inventory valid.
- Fulfillment method configured.
- Prohibited category checks.
- External URL health.
- Policy acceptance.

## External Listings

Track:

- destination URL,
- seller ownership,
- last health check,
- HTTP state,
- redirect chain,
- HTTPS,
- broken checkout,
- source provider,
- click tracking,
- confirmation import support.

## Inventory

Support:

- available,
- reserved,
- sold,
- returned,
- damaged,
- unlimited,
- external unknown.

Ticket inventory must remain Event-aware.

## Bulk Actions

- Hide.
- Publish approved.
- Assign moderator.
- Recheck external links.
- Export.
- Apply policy category.

Do not bulk-change prices or fee rules without preview and audit.
