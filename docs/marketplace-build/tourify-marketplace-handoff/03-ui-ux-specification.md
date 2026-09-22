# UI/UX Specification

## 1. Experience Principles

1. **Commerce feels native to Tourify.** Marketplace cards should use the same profile identity, feed language, and account context as the rest of the platform.
2. **The seller is always clear.** Every listing and checkout identifies who is selling, who processes payment, and whether checkout is external.
3. **Action matches intent.** Goods say `Buy now`; booking services say `Request booking`; quote services say `Request quote`; external items say `Buy on [Provider]`.
4. **No dead-end storefronts.** Empty, paused, sold-out, or unavailable states always explain what the owner or buyer can do next.
5. **Mobile is not a compressed desktop.** Filters become a bottom sheet, management actions stay thumb-reachable, and profile quick views become full-height sheets.
6. **Avoid generic marketplace styling.** Use Tourify's existing visual system, restrained account-type accents, strong media, crisp typography, and information-rich cards rather than gradients or novelty icons.

## 2. Information Architecture

Final routes must follow the existing repository's routing conventions. The following routes describe intent, not mandatory literal paths.

### Public

| Surface | Suggested intent |
| --- | --- |
| Marketplace hub | `/marketplace` |
| Category/search state | `/marketplace?type=&category=&q=` |
| Storefront | `/marketplace/store/[store-slug]` |
| Listing detail | `/marketplace/listing/[listing-slug]` |
| Native checkout | `/marketplace/checkout/[listing-id]` |
| Booking request | `/marketplace/listing/[listing-id]/book` |
| Quote request | `/marketplace/listing/[listing-id]/quote` |
| Guest order confirmation | `/marketplace/order/[opaque-access-token]` |

### Seller

Integrate into each account's existing dashboard shell:

- Marketplace overview.
- Listings.
- Orders.
- Service requests.
- Storefront editor.
- Payouts and fees.
- Settings/policies.

Do not create four unrelated marketplace implementations. Build shared domain components and route adapters that receive the active account context and entitlements.

### Admin

- Marketplace overview and health.
- Storefront/listing review.
- Orders and payment investigation.
- Reports/moderation.
- Categories.
- Fee rules.
- External-domain controls.
- Feature flags and rollout.

## 3. Marketplace Hub

### Desktop Layout

1. Global Tourify navigation.
2. Marketplace header:
   - `Marketplace`
   - Search field.
   - Optional `Sell on Tourify` action for eligible authenticated users.
3. Compact category rail.
4. Filter sidebar and results header.
5. Responsive results grid.
6. Pagination or load-more control with URL-preserved state.

### Mobile Layout

- Sticky search bar.
- Horizontally scrollable type chips.
- `Filter` and `Sort` controls open accessible bottom sheets.
- Two-column cards when media and text remain legible; otherwise one column.
- Back navigation preserves filters and scroll position.

### Result Card Anatomy

- 4:3 or square media.
- Type badge: `Product`, `Service`, `Ticket`, or `External`.
- Listing title, seller avatar/name, price presentation.
- Availability/fulfillment line.
- External provider disclosure when applicable.
- Primary action accessible by keyboard and screen reader.
- Overflow actions: save if supported later, share, report.

Avoid putting several equally strong buttons on a card. The card has one primary action; secondary actions live in the overflow or detail view.

## 4. Storefront Page

### Header

- Seller identity and verified/account badges already supported by Tourify.
- Store name and description.
- Seller account-type label.
- Location/service area.
- `Follow`, `Message`, and `Share` actions using existing systems and permissions.
- External/native checkout policy summary.

### Body

- Featured collection.
- Type/category tabs.
- Listing grid.
- Policy drawer: shipping, returns, cancellations, external-checkout explanation.
- Music bridge for artists, linking to the existing music player.

### Owner View

- Private owner bar: `Edit storefront`, `Add listing`, `Preview as public`.
- Draft/unpublished counts never appear publicly.
- Payout or policy blockers appear as actionable notices.

## 5. Profile Marketplace Module

### Module States

| State | Public viewer | Profile owner |
| --- | --- | --- |
| Not configured | Hidden | Add Marketplace prompt |
| Draft store/no listing | Hidden | Setup checklist |
| Active | Featured listing row/grid | Same plus edit controls |
| Paused | Hidden or seller-selected message | Resume action |
| Suspended | Hidden | Reason and support action |

### Layout

- Header: `Marketplace` or seller-defined approved label.
- Three to six featured items depending on profile layout.
- One `View marketplace` action.
- Selecting an item opens a quick-view modal on desktop and bottom sheet on mobile.
- Quick view contains media, title, price, seller, availability, disclosure, and one transaction CTA.

The module must respect the current profile editor's section ordering, visibility, and preview behavior.

## 6. Listing Detail

### Primary Content

- Media gallery.
- Title, seller, type/category, price.
- Variant/options selector when applicable.
- Stock or availability status.
- Fulfillment/location/lead time.
- One sticky transaction action.
- Description and inclusions.
- Policies and seller information.
- Report action.

### External Listing Treatment

- Persistent `External checkout` badge near price and CTA.
- Provider name and domain.
- Disclosure immediately before redirect.
- CTA text `Continue to [Provider]`.
- Tourify does not display a Tourify cart or order language for external listings.

### Service Treatment

- Transaction mode stated above the fold.
- Fixed-price: options, scope, lead time, checkout.
- Booking: availability/request form summary and `Request booking`.
- Quote: requirements summary and `Request quote`.

## 7. Listing Editor

Use a guided single-page editor with sections or a short stepper:

1. Listing type and transaction mode.
2. Basic details.
3. Media.
4. Price or quote/booking settings.
5. Availability, inventory, or service area.
6. Fulfillment and policies.
7. Marketplace/profile/feed preview.
8. Publish.

### Editor Behavior

- Draft autosave with visible status.
- Inline validation on blur and complete validation on preview/publish.
- Unsaved-upload protection.
- Reordering for media and variants.
- Duplicate listing action.
- Preview modes for hub card, profile module, listing page, and feed card.
- Entitlement changes never discard a draft; they block publication with an explanation.

## 8. External Listing Import UX

1. URL field with provider examples but no claim of official integration.
2. Loading state: `Importing listing details`.
3. Review state with imported fields highlighted.
4. Warning if price/availability cannot be verified.
5. Destination preview showing exact provider domain.
6. Manual fallback when metadata cannot be retrieved.
7. Publish validation includes a fresh redirect safety check.

## 9. Checkout UX

### Pre-Checkout

Feed item actions may enter a listing-specific checkout page directly, as requested. That page still shows:

- Product/service summary.
- Seller.
- Selected options and quantity.
- Fulfillment choice.
- Policy acknowledgement.
- Price breakdown.
- Email field for guests.

This preserves direct conversion without creating a blind purchase.

### Payment

- Prefer a proven hosted or embedded provider UI after the payment-stack audit.
- Tourify never builds or stores raw card fields.
- Loading prevents duplicate submission.
- Errors preserve non-sensitive checkout selections.
- Back navigation does not create duplicate orders or reserve inventory indefinitely.

### Confirmation

- Clear paid/pending/failed state based on server verification.
- Order number safe for display but not authorization.
- Seller, items, delivery/service next steps, contact email, and support action.
- Guest prompt: `Create an account to track this order`, after the purchase—not before it.

## 10. Service Request Workspace

The seller and buyer see the same core timeline with role-specific actions.

### Timeline Events

- Request created.
- Message or clarification.
- Seller counterproposal.
- Quote version issued.
- Buyer accepted/declined.
- Payment requested/paid/failed/refunded.
- Booking confirmed/changed/canceled.
- Service marked in progress/completed.

Reuse existing Tourify messaging, notifications, calendar, tasks, and file systems where their permissions fit. The marketplace timeline should reference those records instead of copying them.

## 11. Seller Dashboard

### Overview

- Store status.
- Setup checklist.
- Revenue and order summary.
- Open service requests.
- Listing health: draft, active, sold out, paused, flagged.
- Payout onboarding/status.
- Recent activity.

### Listings Table/Grid

- Search, filters, status, type, inventory, price, views, clicks, sales/inquiries.
- Bulk pause and publish only if existing patterns safely support bulk actions.
- No bulk delete.

### Orders

- Order number, date, buyer display, fulfillment, payment, total, seller proceeds.
- Customer address revealed only when required and authorized.
- Refund and support actions follow policy and permissions.

### Storefront Editor

- Live preview.
- Featured listing ordering.
- Profile module visibility.
- Policies.
- Store pause/resume.

## 12. Admin UX

- Health dashboard with payment/webhook errors, order exceptions, reports, unsafe links, and restricted sellers.
- Search across seller, listing, order, provider event ID, and public order number.
- Side-panel inspection preserves list context.
- Suspension requires a reason and confirmation.
- Financial adjustments require elevated permission and audit notes.
- Admin never uses destructive delete as the normal moderation action.

## 13. Loading, Empty, and Error States

Every major surface needs:

- Skeleton that resembles the final layout.
- Empty state with one relevant next action.
- Permission-denied state.
- Feature-disabled state.
- Network retry state.
- Listing unavailable/sold-out/expired state.
- Payout-blocked seller state.
- Payment pending state that polls/revalidates safely.
- External provider unavailable state.

Do not use blank screens, indefinite spinners, or generic `Something went wrong` messaging without a recovery action and trace/reference ID.

## 14. Accessibility

- WCAG 2.2 AA color contrast.
- Visible focus state.
- Logical heading hierarchy.
- Full keyboard access to filters, media, modal/drawer, variants, and checkout.
- Dialog focus trapping and focus restoration.
- Status changes announced through live regions.
- Form errors associated with fields and summarized on submit.
- Product images require useful alt text; decorative imagery uses empty alt.
- Price and availability are text, not color-only signals.
- Touch targets at least 44 by 44 CSS pixels where practical.

## 15. Content Standards

- `Marketplace`, not ambiguous `Shop`, in primary navigation unless future usability testing supports a label change.
- `Native checkout` does not need a badge; external checkout always does.
- Avoid claims such as `In stock` for external listings; use `Check availability on [Provider]`.
- Show specific, calm recovery instructions.
- Never imply Tourify refunds or fulfills an external purchase.

