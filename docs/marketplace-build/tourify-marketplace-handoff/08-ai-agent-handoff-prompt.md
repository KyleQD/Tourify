# AI Implementation Handoff Prompt

Copy the prompt below into the implementation model after connecting it to the correct Tourify repository, branch, Supabase project, and approved payment sandbox.

---

You are implementing the Tourify Marketplace feature in the existing Tourify repository.

## Primary Objective

Build a production-ready, additive marketplace that supports:

- A searchable public marketplace hub.
- Storefronts attached to eligible Tourify accounts and visible through a public profile Marketplace module.
- Native physical goods.
- Native services with seller-selected fixed-price, booking-request, or quote-request flows.
- Imported third-party listings that clearly redirect to the external provider checkout.
- Artist merchandise/services while keeping all music sales/distribution in the existing music player ecosystem.
- Venue merchandise/services with no music listings.
- Organization marketplace access limited to existing ticket inventory and checkout.
- Specific listing and storefront shares in the existing feed.
- Guest checkout for native purchases.
- Configurable Tourify percentage/fixed marketplace fees.

Read every file in this handoff package before taking implementation action. Treat `marketplace-implementation-tasks.json` as the execution ledger, but update it after the repository audit with exact files, tables, routes, tests, dependencies, and evidence.

## Non-Destructive Rules

These constraints are absolute:

1. Never run a database reset against any linked, remote, staging, or production database.
2. Never drop or truncate existing tables, schemas, columns, functions, views, triggers, policies, buckets, or production data.
3. Never replace the current database or reinitialize Supabase.
4. Never rewrite already-applied migrations.
5. Never delete or overwrite unrelated user changes.
6. Use forward-only, reviewed, additive migrations.
7. Prefer new marketplace tables and join/reference tables over destructive changes.
8. Reuse existing systems for accounts, profiles, feed, tickets, music, payments, notifications, messaging, calendar, files, analytics, audit, and admin whenever they are authoritative.
9. Do not duplicate ticket inventory/orders/QR issuance or music commerce.
10. If the only apparent solution is destructive, stop and document the blocker. Do not proceed.

Local `supabase db reset` is allowed only against a confirmed disposable local database to verify the migration chain. Never use `--linked` for reset.

## Step 1 — Read-Only Audit

Before editing:

- Read repository instructions and relevant `AGENTS.md` files.
- Record current branch and dirty worktree; preserve unrelated changes.
- Map multi-account identity, membership, account switching, and authorization.
- Map general, artist, venue, and organization dashboard/profile routes.
- Map profile modules/layout configuration.
- Map feed posts, attachments, resharing, and share URLs.
- Map ticket records, checkout, QR issuance, refunds, and analytics.
- Map music player/distribution and preserve it.
- Map current payments, checkout, connected accounts/payouts, fees, refunds, webhooks, environment variables, and finance reporting.
- Map notifications, email, messaging, calendar, tasks, storage, analytics, moderation, and feature flags.
- Map Supabase migrations, RLS policies, grants, generated types, schema exposure settings, and deployment workflow.
- Confirm framework/package versions from the repository.

Produce:

- `docs/marketplace/marketplace-current-system-audit.md`
- `docs/marketplace/marketplace-integration-map.md`
- `docs/marketplace/marketplace-decision-log.md`
- Updated `docs/marketplace/marketplace-implementation-tasks.json`

For every proposed component/table/route, mark `reuse`, `extend`, or `new`, with exact evidence.

Do not implement until this map demonstrates there is no competing source of truth.

## Step 2 — Resolve Blocking Decisions

Confirm from code/config and document:

- Existing payment processor.
- Whether the processor already supports marketplace seller onboarding/payouts.
- Charge model and merchant-of-record responsibility.
- Tax, processor-fee, refund, dispute, and chargeback ownership.
- Supported launch countries/currencies.
- Seller-managed shipping/local-pickup scope.
- Relationship between services and existing jobs/staffing/venue-booking workflows.

If these cannot be resolved from authorized project context, implement non-payment foundations behind disabled flags and stop before payment enablement. Do not invent financial policy.

## Step 3 — Plan Exact Changes

Update the task JSON with:

- Exact file paths.
- Exact migration generated through the repository's existing Supabase workflow.
- Existing tables/functions/components being reused.
- New tables/policies/indexes/grants.
- Tests for each task.
- Dependencies and rollback/feature-disable behavior.
- Status and evidence fields.

Keep no more than one implementation task `in_progress` at a time.

## Step 4 — Implement in Gated Phases

Follow `06-implementation-roadmap.md`:

1. Foundation and feature flags.
2. Seller storefront/listings.
3. Public storefront/profile/hub.
4. Feed commerce.
5. Native goods checkout.
6. Fixed/booking/quote services.
7. Admin/trust/operations.
8. Hardening and controlled launch.

At the end of every phase:

- Run relevant tests.
- Run lint/typecheck/build when applicable.
- Run RLS allow/deny tests.
- Update task JSON status and evidence.
- Record unresolved risks.
- Do not advance past a failed gate.

## Required Product Rules

- General: physical goods, services, external listings.
- Artist: merchandise, services, external listings; no marketplace music.
- Venue: merchandise, services, external listings; no music.
- Organization: existing tickets only.
- External listing: stored approved URL, explicit external disclosure, outbound redirect; no Tourify order/payment.
- Specific feed item:
  - Native good/fixed service → direct listing checkout/pre-checkout.
  - Booking → request booking.
  - Quote → request quote.
  - External → provider redirect.
  - Ticket → existing ticket checkout.
- Storefront share → storefront.
- Guest checkout supported for native transactions.
- Single-seller checkout in version 1.
- Fee rule version/snapshot stored on order.
- Payment webhooks are authoritative and idempotent.

## Security Requirements

- Enable RLS on every new table in an exposed schema.
- Add minimum explicit Data API grants when the current Supabase project requires them.
- Test grants separately from RLS.
- Use authoritative ownership/membership checks.
- Never use editable `user_metadata` for authorization.
- Update policies require `USING`, `WITH CHECK`, and corresponding select policy.
- Protect all customer addresses, emails, private service requests, attachments, payment IDs, moderation details, and fee internals.
- Never expose service-role/secret keys to the client.
- Verify webhook signatures using the provider's official library.
- Use idempotency for checkout, webhook events, order transitions, and notifications.
- Prevent IDOR/BOLA, mass assignment, overselling, price manipulation, SSRF, and open redirects.
- External imports must enforce HTTPS, network/IP blocks, redirect limits, content limits, timeouts, sanitization, and approved stored redirect targets.
- Public views must not bypass RLS.

## UI/UX Requirements

- Use existing Tourify design tokens/components and account dashboard shells.
- One shared marketplace system with account-aware entitlements; do not clone it four times.
- Responsive and WCAG 2.2 AA.
- Complete loading, empty, denied, disabled, error, unavailable, pending-payment, and suspended states.
- Profile uses a Marketplace module plus quick-view modal/ mobile bottom sheet.
- Public cards clearly label external checkout.
- Checkout shows seller, items/options, fulfillment, policies, fees/total, and guest email.
- No generic gradients, novelty icons, or UI inconsistent with Tourify.

## Data/Migration Requirements

- Treat table names in the handoff as logical until mapped to the current schema.
- Store money in integer minor units with currency.
- Snapshot order items and applied fee rules.
- Version booking/quote terms.
- Add indexes for ownership/RLS, status/search, orders, unique provider events, idempotency keys, and workflow state.
- Use feature-disable and forward corrective migrations for rollback; do not drop production marketplace data.
- Preview production migration changes before application.

## Verification

Use `07-qa-acceptance.md` as the minimum matrix. In addition:

- Run all existing tests related to accounts, profiles, feed, tickets, music, payments, notifications, messaging, calendar, files, admin, and finance.
- Test as anon, unrelated user, buyer, every seller account type/team role, moderator, finance admin, and webhook/system context.
- Test duplicate/out-of-order webhooks and inventory concurrency.
- Verify guest order URLs cannot be enumerated.
- Verify external redirect cannot be used as an open redirect.
- Run Supabase security/performance advisors when available.
- Run production build.

## Output and Handoff

At completion, provide:

- Summary by phase.
- Exact changed files.
- Migration names and additive change summary.
- New environment variables with configuration instructions, but no secrets.
- Test/build/security evidence.
- Manual QA script.
- Feature-flag rollout steps.
- Monitoring and support runbook.
- Known limitations and deferred scope.
- Current task JSON with every completed item and evidence.

Do not claim completion when tests are skipped because credentials, payment sandbox, or environment variables are missing. Mark the blocked gate and state exactly what is needed.

---

