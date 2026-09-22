# QA Plan and Acceptance Criteria

## 1. Test Strategy

Testing must cover:

- Domain unit tests.
- Database constraint and RLS tests.
- API/server action integration tests.
- Payment provider sandbox and webhook replay tests.
- Browser end-to-end tests.
- Responsive visual checks.
- Accessibility checks.
- Security abuse cases.
- Regression tests for profiles, feed, tickets, music, account switching, auth, and notifications.
- Production migration dry run.

## 2. Account Entitlement Acceptance

### General

- Can create physical, fixed-price service, booking, quote, and external listings.
- Can configure and publish the profile Marketplace module.
- Cannot sell if account is unauthorized/suspended.

### Artist

- Can create merchandise, services, and external listings.
- Cannot create marketplace music products.
- Sees bridge to current music ecosystem.
- Authorized team member behavior matches existing artist permissions.

### Venue

- Can create merchandise, services, and external listings.
- Cannot create music.
- Booking/calendar integration respects current venue permissions.

### Organization

- Can feature/share only existing eligible ticket records.
- Cannot create physical goods, services, or arbitrary external goods.
- Ticket purchase uses existing inventory/order/QR logic.

All negative cases must be tested at the server layer, not only by missing UI.

## 3. Storefront and Listing Acceptance

- One storefront maps to one authoritative account identity.
- Draft store/listing is never public.
- Publishing requires all mandatory fields and entitlement.
- Pausing disables public transaction actions.
- Sold-out status updates consistently in hub, profile, feed, and detail.
- Suspension removes listing from discovery and preserves audit/history.
- Archiving does not break old orders or posts.
- Media access follows public/private state and owner permissions.
- Variants cannot create negative or inconsistent inventory.
- Concurrent final-stock checkouts cannot oversell.

## 4. External Listing Acceptance

- Only HTTPS URLs accepted.
- Private, loopback, link-local, metadata-service, and internal IP targets rejected.
- Redirect limits and response-size/time limits enforced.
- Unsafe schemes and malformed URLs rejected.
- Metadata is sanitized.
- Manual fallback works when metadata is unavailable.
- Seller sees external-checkout disclosure before publication.
- Buyer sees provider/domain disclosure.
- Redirect endpoint uses stored destination, not request-supplied URL.
- Tourify creates no native order/payment for external click.
- Outbound attribution records hub/profile/feed/store source.

## 5. Search and Public Data Acceptance

- Search handles keywords, type, category, account type, fulfillment, location, checkout type, and availability.
- URL preserves filter/sort state.
- Pagination is stable with no obvious duplicates.
- Logged-out users can browse eligible public records.
- Draft, paused, suspended, expired, and unauthorized data is absent.
- Private order, address, payment, quote, attachment, and moderation fields never appear in public payloads.
- Search injection and malformed filter input are rejected or normalized safely.

## 6. Profile and Feed Acceptance

- Owner can add/remove/reorder Marketplace module through existing profile editor.
- Non-owner cannot change the module.
- Quick view has focus trap, close behavior, focus restoration, and mobile sheet behavior.
- Listing cards resolve current status.
- Specific product/fixed-service share routes to listing-specific checkout/pre-checkout.
- Booking share routes to request booking.
- Quote share routes to request quote.
- External share routes through safe external redirect.
- Ticket share routes to current ticket checkout.
- Storefront share routes to storefront.
- Reshares preserve original seller attribution.
- Deleting a post does not alter the listing/store.
- Pausing a listing updates historical card state without deleting the post.

## 7. Native Goods Checkout Acceptance

- Guest and signed-in buyer can check out.
- Seller cannot buy their own item unless explicitly approved later.
- Server ignores manipulated client price, fee, seller, or stock.
- Listing/store/payout eligibility is rechecked at checkout.
- Checkout creates one pending order for one idempotency key.
- Expired checkout releases reserved inventory.
- Signed webhook confirms paid state.
- Browser success return without webhook does not falsely fulfill.
- Duplicate and out-of-order webhooks are safe.
- Payment failure retains coherent order/inventory state.
- Fee rule is snapshotted.
- Confirmation contains no sensitive authorization secret in analytics/logs.
- Guest link is opaque, expiring, and resistant to enumeration.
- Guest can claim after verifying matching email.
- Shipping address is restricted to buyer/seller roles that need it.
- Refunds reconcile payment, order, fee, inventory, and notifications.

## 8. Services Acceptance

### Fixed Price

- Scope/options and current price validated on server.
- Paid service creates visible buyer/seller timeline.

### Booking

- Buyer can propose date/timezone/location/scope.
- Seller can accept, counter, decline.
- Counter requires buyer review.
- Confirmation occurs only after defined acceptance/payment conditions.
- Holds and requests expire.
- Calendar record is linked, not duplicated, and only created in confirmed state.

### Quote

- Seller can issue versioned quote.
- Prior revisions remain readable but cannot be paid after superseded.
- Quote expiration enforced.
- Accepted version is snapshotted on order.

### Privacy

- Only participants/authorized admins see request details and attachments.
- Notifications reveal no sensitive scope to unrelated recipients.

## 9. RLS and Authorization Matrix Tests

Run each relevant operation as:

- `anon`.
- Authenticated unrelated user.
- Authenticated buyer.
- General owner.
- Artist owner and each team role.
- Venue owner and each team role.
- Organization member with and without ticket permission.
- Marketplace moderator.
- Finance admin.
- Server webhook context.

Test select, insert, update, and archive/delete behavior separately. Update tests must verify ownership cannot be reassigned.

## 10. Payment and Webhook Failure Tests

- Invalid signature.
- Valid duplicate event.
- Out-of-order events.
- Provider timeout after internal pending order.
- Internal timeout after provider session creation.
- Webhook delivery delay.
- Refund event before local request completes.
- Partial refund if supported.
- Dispute/chargeback event.
- Seller payout account becomes restricted.
- Currency/amount mismatch.
- Event references unknown order.

Every case produces a recoverable state, support-visible log, and no duplicate fulfillment.

## 11. Accessibility Acceptance

- Automated checks plus manual keyboard and screen-reader review.
- WCAG 2.2 AA contrast.
- Visible focus.
- Semantic controls and headings.
- Modal/drawer focus management.
- Error summary and field association.
- Live status announcements.
- Touch target sizing.
- Non-color status cues.
- Reduced-motion behavior follows platform preference.

## 12. Performance Acceptance

Define exact targets from Tourify's current budgets during Phase 0. At minimum:

- Hub/search uses indexed, bounded queries.
- No unbounded listing/order loads.
- Cards do not trigger N+1 seller/media queries.
- Images are sized and lazy-loaded appropriately.
- Profile marketplace module does not block unrelated profile content.
- Feed attachments batch-load public projections.
- Checkout and webhook endpoints meet operational latency/error thresholds.

## 13. Migration Acceptance

- Only new reviewed migrations.
- No drop/truncate/reset statements.
- No unintended seed data.
- Existing production rows unaffected.
- Local disposable reset replays complete history successfully.
- Production dry run shows expected pending migrations only.
- Generated types compile.
- Data API grants are intentional and minimal.
- RLS enabled for exposed tables.
- Security/performance advisors reviewed.
- Application works with flags off before and after migration.

## 14. Regression Checklist

- Sign-up/login/session refresh.
- General, artist, venue, organization account switching.
- Existing public profile rendering/editing.
- Existing feed creation, reading, resharing, and moderation.
- Existing music player/upload/distribution.
- Existing ticket creation, checkout, QR issuance, refund, and analytics.
- Existing notifications and email.
- Existing messaging/calendar/files.
- Existing finance/admin reporting.
- Production build, lint, typecheck, unit, integration, and E2E suite.

## 15. Release Gates

Release is blocked by:

- Any critical/high authorization or payment vulnerability.
- Any database-destructive migration.
- Unverified webhook signatures or non-idempotent fulfillment.
- Guest order enumeration.
- Cross-account seller management access.
- External-link SSRF/open redirect vulnerability.
- Duplicate ticket inventory/order logic.
- Published private service/address/payment data.
- Native checkout enabled for payout-ineligible sellers.
- Missing refund/support owner.
- Failure to disable the feature without deleting data.

