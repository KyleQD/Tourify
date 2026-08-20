# COM-018 Role and Permission Checks Inventory

Date: 2026-08-12

Source task: COM-018 - Document current role and permission checks.

## Scope

This inventory records the current role, permission, acting-context, and owner-scope checks used by commerce-adjacent routes before Commerce Operations capabilities are added.

The target suite requires:

- server-trusted `CommerceContext`,
- explicit scope validation,
- commerce-specific permissions,
- field-level PII permissioning,
- high-risk financial action permissioning,
- scoped exports,
- audit requirements,
- provider-state requirements for sensitive mutations.

No authorization behavior, route behavior, schema, or role mapping was changed for this task.

## Target Commerce Permission Set

The suite proposes commerce permissions including:

- `commerce.view`
- `commerce.view_customers`
- `commerce.view_seller_pii`
- `commerce.manage_orders`
- `commerce.manage_fulfillment`
- `commerce.manage_listings`
- `commerce.manage_sellers`
- `commerce.manage_cases`
- `commerce.issue_refunds`
- `commerce.manage_disputes`
- `commerce.view_financials`
- `commerce.retry_payouts`
- `commerce.manage_payouts`
- `commerce.manage_settlements`
- `commerce.manage_fees`
- `commerce.manage_subscriptions`
- `commerce.export`
- `commerce.view_audit`
- `ticketing.view_financials`
- `ticketing.manage_refunds`

Current code does not yet define any `commerce.*` capabilities.

## Existing Admin Capability System

Paths:

- `lib/auth/admin-capabilities.ts`
- `lib/auth/admin-context.ts`
- `lib/auth/api-auth.ts`
- `lib/auth/org-command.ts`

Current admin capabilities include:

- organization settings,
- audit,
- tour,
- event,
- routing,
- advance,
- logistics,
- workforce,
- hiring,
- vendor,
- contract,
- finance,
- ticketing,
- site map,
- communications,
- content.

Current capability helpers:

- `withAdminCapability(capability, handler)`
- `withOrgCommand(options)`
- `resolveActingAdminContext`
- `requireAdminCapability`
- `executeOrgCommand`

Current context strength:

- resolves an acting organization profile,
- validates organization membership,
- loads configured role permissions,
- includes correlation ids,
- enforces organization or tour-collaborator scope,
- can assert entity access for tours and events,
- returns structured errors for command wrappers.

Current gap:

- the admin capability catalog has no Commerce Operations capabilities.
- marketplace commerce APIs are not yet migrated to `withAdminCapability` or `withOrgCommand`.

## Broad Admin Surface Gate

Paths:

- `lib/auth/admin.ts`
- `lib/auth/admin-profile-gates.ts`
- `lib/auth/api-auth.ts`

`userHasAdminSurfaceAccess` currently grants broad admin-surface access from several signals:

- `profiles.is_admin`,
- `profiles.role === "admin"`,
- `profiles.account_type` of `admin`, `organizer`, or `organization`,
- organizer account presence,
- organization membership in roles `owner`, `admin`, `tour_manager`, `production`,
- confirmed active tour collaboration,
- legacy account relationship rows.

`withAdminAuth` uses this broad surface gate through `checkAdminPermissions`.

This is useful for legacy admin access but is not sufficient for Commerce Operations because it does not identify:

- commerce permission,
- financial permission,
- field-level PII permission,
- export permission,
- high-risk action approval,
- provider-state requirement,
- seller or event child-scope validation.

## Marketplace Admin Routes

### Current `/api/marketplace/admin/*`

Paths:

- `app/api/marketplace/admin/overview/route.ts`
- `app/api/marketplace/admin/moderation/route.ts`
- `app/api/marketplace/admin/fee-rules/route.ts`
- `app/api/marketplace/admin/webhook-events/route.ts`

Current guard:

```text
authenticateApiRequest
-> userHasAdminSurfaceAccess
-> createServiceRoleClient for reads/writes
```

Current permissions:

- all routes require broad admin-surface access,
- no route requires commerce-specific permission,
- no route requires finance-specific permission for fee rules,
- no route requires audit-specific permission for webhook event access,
- no route requires seller/listing scope beyond service-role target lookups.

Important route-specific notes:

- `marketplace/admin/overview` exposes platform-wide counts for moderation, failed webhooks, stuck orders, active listings, and fee rules.
- `marketplace/admin/moderation` can suspend or restore listings/storefronts with a reason and writes moderation rows.
- `marketplace/admin/fee-rules` creates, lists, and toggles fee rules with service role.
- `marketplace/admin/webhook-events` lists failed marketplace payment events and can reset failed events to `received` or `ignored`.

Gaps:

- these routes should map to `commerce.view`, `commerce.manage_listings`, `commerce.manage_sellers`, `commerce.manage_fees`, and `commerce.view_audit` or equivalent future permissions.
- service-role use is guarded only by broad admin access.
- there is no CommerceContext or organization/seller scope in the response contract.

### Current `/api/admin/marketplace/*`

Paths:

- `app/api/admin/marketplace/orders/route.ts`
- `app/api/admin/marketplace/orders/[id]/route.ts`
- `app/api/admin/marketplace/moderation/route.ts`
- `app/api/admin/marketplace/payouts/[id]/retry/route.ts`

Current guard patterns:

- `orders/route.ts` uses `withAdminAuth`.
- order detail, moderation, and payout retry manually check `profiles.role === "admin"`.

Current PII behavior:

- `orders/route.ts` resolves buyer profile `full_name`, `username`, and `email`.
- This is exposed behind `withAdminAuth`, not a field-level PII permission.

High-risk payout retry:

- `payouts/[id]/retry` uses `profiles.role === "admin"`.
- It does not require `commerce.manage_payouts` or `commerce.retry_payouts`.
- It does not require a reason.
- It does not require an idempotency key.
- It does not re-fetch provider payout state.
- It does not detect an existing successful or processing provider payout.
- It updates the payout row directly through the authenticated Supabase client.

Gaps:

- broad/manual admin checks should be replaced with commerce capabilities.
- buyer PII projection should require explicit `commerce.view_customers` or field-level permission.
- payout retry should be hardened before broader payout tooling ships.

## Marketplace Seller and Buyer Routes

Paths:

- `app/api/marketplace/orders/route.ts`
- `app/api/marketplace/payouts/route.ts`
- `app/api/marketplace/listings/[id]/route.ts`
- `app/api/marketplace/service-requests/route.ts`
- `app/api/marketplace/service-orders/[orderItemId]/route.ts`
- `app/api/subscriptions/tiers/sync/route.ts`

Current owner-scoped patterns:

- buyer order lists filter `buyer_user_id = auth.user.id`.
- seller order lists filter `seller_user_id = auth.user.id`.
- seller payout lists filter `seller_user_id = auth.user.id`.
- listing updates/deletes require `seller_user_id === user.id`.
- service request seller views join through listings owned by the seller.
- service milestones require buyer or seller ownership; creation is seller-only.
- subscription tier sync requires `artist_subscription_tiers.user_id = auth.user.id`.

Strengths:

- these routes generally validate authenticated user identity and owner scope.
- they do not rely on client-provided seller IDs for seller-owned mutations.

Gaps:

- these are not Commerce Operations admin routes and do not provide admin override capability.
- owner checks are route-local and not normalized through CommerceContext.
- seller PII, customer contact data, and financial fields are not consistently projected through typed permission-aware DTOs.

## Ticketing Permission System

Paths:

- `lib/ticketing/permissions.ts`
- `app/api/ticketing/reports/route.ts`
- `app/api/ticketing/config/route.ts`
- `app/api/ticketing/settlements/route.ts`
- `app/api/ticketing/box-office/route.ts`
- `app/api/ticketing/check-in/route.ts`

Current ticketing permissions include:

- `view_overview`
- `manage_ticket_types`
- `publish_sales`
- `view_attendees`
- `view_attendee_contact`
- `view_orders`
- `view_full_financials`
- `view_assigned_share`
- `issue_comps`
- `manage_guestlist`
- `transfer_reassign`
- `process_refunds`
- `operate_box_office`
- `scan_tickets`
- `reverse_checkin`
- `export_attendees`
- `export_financials`
- `manage_grants`

Current grant rules:

- event creator is allowed,
- ticketing owner from event config is allowed,
- org roles `owner`, `admin`, `production`, and `tour_manager` are allowed,
- org `finance` role can view financial overview/orders/share,
- explicit `event_ticketing_grants` can grant event-level permissions,
- employment assignments can grant scan or reverse check-in permission.

Strengths:

- ticketing routes use event-scoped permission checks.
- contact visibility is separated through `view_attendee_contact`.
- financial reports can hide finance data when the caller lacks `view_full_financials`.

Gaps:

- this system is separate from admin `AdminCapability`.
- Commerce Operations needs a bridge between `ticketing.*`/event grants and `commerce.*` permissions.
- some ticketing admin APIs use `withAdminCapability('ticketing.*')` while event-facing APIs use `hasTicketingPermission`, so policy is split between two systems.

## Admin Ticketing and Finance Routes

Paths:

- `app/api/admin/ticketing/refund/route.ts`
- `app/api/admin/ticketing/enhanced/route.ts`
- `app/api/admin/ticketing/read-model/route.ts`
- `app/api/admin/finances/route.ts`
- `app/api/admin/finances/settlements/route.ts`
- `app/api/admin/finances/commitments/route.ts`
- `app/api/admin/finances/expenses/route.ts`
- `app/api/admin/finances/reconciliation/route.ts`

Current guards:

- newer admin ticketing and finance routes use `withAdminCapability`.
- finance routes use `finance.view` or `finance.manage`.
- ticketing routes use `ticketing.view`, `ticketing.manage`, or `ticketing.refund`.
- some command routes use `withOrgCommand`.

High-risk refund route:

- `app/api/admin/ticketing/refund/route.ts` requires `ticketing.refund`.
- reason is required.
- sale org scope is verified through `assertOrgEntityReferences`.
- service-role work is wrapped through `executeServiceRoleJob`.
- Stripe refund uses an idempotency key.
- refund eligibility checks sale status and amount.
- audit logging is present through existing finance/ticketing helpers.

This is the closest current pattern to the Commerce Operations target for financial actions.

Gap:

- Commerce refund/payout APIs should either reuse these patterns or map commerce capabilities onto them. Marketplace payout retry does not yet follow this standard.

## Subscription Routes

Paths:

- `app/api/subscriptions/checkout/route.ts`
- `app/api/subscriptions/portal/route.ts`
- `app/api/subscriptions/tiers/sync/route.ts`
- `app/api/subscriptions/webhook/route.ts`

Current guards:

- checkout and portal require authenticated user.
- tier sync requires the authenticated artist to own the tier.
- webhook uses service role after Stripe signature verification.

Gaps:

- no admin subscription management capability exists.
- no `commerce.manage_subscriptions` permission exists.
- no admin read model or field-level permission is present for subscription state.

## Photo Purchase Routes

Paths:

- `app/api/photos/purchase/route.ts`
- `app/api/photos/purchase/webhook/route.ts`

Current guards:

- purchase creation requires authenticated buyer.
- duplicate purchase is checked for the same buyer and photo.
- webhook uses Stripe signature verification and then updates purchase rows.

Gaps:

- no admin commerce permission layer exists.
- no provider event claim exists.
- no admin refund or dispute permission was found for photo purchases.

## PII and Export Baseline

Current PII handling:

- marketplace admin order list returns buyer name and email behind `withAdminAuth`.
- ticketing has `view_attendee_contact` for attendee contact visibility.
- ticketing reports conditionally include finance data through `view_full_financials`.
- Commerce-specific customer PII permissions do not exist yet.

Current export handling:

- admin exports exist for tours, analytics, publication deliveries, calendar feeds, workforce payroll, etc.
- Commerce-specific export permission `commerce.export` does not exist yet.
- Marketplace order export behavior was not found in this inventory.

Gaps:

- no unified `commerce.view_customers` permission.
- no unified field-level `commerce.view_seller_pii` permission.
- no commerce export permission or audit rule.
- no standardized PII projection DTO for Commerce Operations.

## Current Gaps Against Suite Model

Missing canonical artifacts:

- `CommerceContext`.
- `CommercePermissionSet`.
- `commerce.*` capabilities in `lib/auth/admin-capabilities.ts`.
- commerce role-to-permission mapping.
- commerce route wrapper or adapter over existing `withAdminCapability`.
- field-level commerce PII projection policy.
- high-risk commerce action wrapper for refunds, payouts, fee changes, and provider settings.

Routes requiring migration from broad/manual checks:

- `app/api/marketplace/admin/overview/route.ts`
- `app/api/marketplace/admin/moderation/route.ts`
- `app/api/marketplace/admin/fee-rules/route.ts`
- `app/api/marketplace/admin/webhook-events/route.ts`
- `app/api/admin/marketplace/orders/route.ts`
- `app/api/admin/marketplace/orders/[id]/route.ts`
- `app/api/admin/marketplace/moderation/route.ts`
- `app/api/admin/marketplace/payouts/[id]/retry/route.ts`

Recommended mapping starting point:

- marketplace overview/order list/detail: `commerce.view`
- buyer contact fields: `commerce.view_customers`
- marketplace moderation/listing restore/suspend: `commerce.manage_listings` or `commerce.manage_sellers`
- fee rules: `commerce.manage_fees`
- webhook exception view: `commerce.view_audit`
- webhook exception retry/dismiss: `commerce.view_audit` plus high-risk action audit
- payout retry: `commerce.retry_payouts` or `commerce.manage_payouts`
- ticketing refunds: bridge `ticketing.refund` to `commerce.issue_refunds`
- finance settlements: bridge `finance.manage` to `commerce.manage_settlements`

## Verification

Commands run:

- `rg -n "capabil|permission|role|admin|commerce\\.view|withAdminCapability|profile\\.role|organization|org-scoped|PII|export" docs/admin-commerce-ops/05_COMMERCE_CONTEXT_AUTHORIZATION_AND_RLS.md docs/admin-commerce-ops/14_PAYMENTS_REFUNDS_DISPUTES_AND_CHARGEBACKS.md docs/admin-commerce-ops/20_BACKEND_APIS_SERVICES_EVENTS_AND_WEBHOOKS.md docs/admin-commerce-ops/21_SECURITY_PRIVACY_ACCESSIBILITY_AND_PERFORMANCE.md docs/admin-commerce-ops/25_IMPLEMENTATION_TASK_CATALOG.md docs/admin-commerce-ops/02_AUDIT_BASELINE.md`
- `sed -n '1,260p' lib/auth/admin-capabilities.ts`
- `sed -n '1,260p' lib/auth/admin-context.ts`
- `sed -n '1,420p' lib/auth/api-auth.ts`
- `sed -n '1,260p' lib/auth/org-command.ts`
- `sed -n '1,180p' lib/ticketing/permissions.ts`
- `rg -n "profile\\?\\.role !== \\\"admin\\\"|profile\\.role !== 'admin'|profile\\?\\.role !== 'admin'|profile\\.role !== \\\"admin\\\"" app/api/marketplace app/api/admin/marketplace app/api/photos app/api/subscriptions app/api/ticketing -g '*.{ts,tsx}'`
- `rg -n "withAdminCapability\\(|withOrgCommand\\(|withAdminAuth\\(" app/api/admin app/api/marketplace app/api/ticketing app/api/subscriptions -g '*.{ts,tsx}'`
- `rg -n "commerce\\.view|commerce\\.manage|commerce\\.issue|commerce\\.export|commerce\\.view_audit|manage_payout|retry_payout|view_customers" app lib components docs -g '*.{ts,tsx,md,json}'`
- `sed -n '1,160p' app/api/marketplace/admin/moderation/route.ts`
- `sed -n '1,150p' app/api/marketplace/admin/fee-rules/route.ts`
- `sed -n '1,120p' app/api/admin/marketplace/orders/[id]/route.ts`
- `sed -n '1,120p' app/api/admin/marketplace/payouts/[id]/retry/route.ts`
- `sed -n '1,150p' app/api/admin/marketplace/orders/route.ts`
- `sed -n '1,140p' app/api/admin/marketplace/moderation/route.ts`
- `sed -n '1,240p' app/api/admin/ticketing/refund/route.ts`
- `sed -n '1,140p' app/api/ticketing/reports/route.ts`
- `sed -n '1,120p' app/api/ticketing/config/route.ts`

Tests:

- Not run. COM-018 is documentation-only inventory.
