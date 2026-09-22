# Ticketing, allocations, credentials, admissions, and guest lists

## Outcome

Converge the Admin ticketing experience on the newer event-ticketing foundation and provide a secure tour-wide view of show configuration, inventory, holds/allocations/comps, sales, campaigns/promos, credentials, guest lists, transfers, check-ins, refunds, and settlement data. Ticket state and revenue must be organization/event scoped and auditable.

## Current baseline and gaps

- Admin dashboard/types/sales/campaigns/promos/analytics exist, and the July 2026 migration adds a stronger foundation for configuration, grants, tickets, credentials, transfers, check-ins, allocations, reservations, analytics, and webhook isolation.
- The Admin UI still uses older tables/routes in places.
- Older ticket types, sales, campaigns, and promo codes retain blanket authenticated policies in audited migrations; adding restrictive policies without dropping permissive ones does not fix access.
- Tour ticketing is mostly aggregation, not a tour allocation/hold/comp/manifest and settlement workspace.
- Some setup silently defaults GA/VIP capacities during event creation.
- Missing a clear inventory ledger, oversell prevention, state machines, role separation for refunds/voids, provider reconciliation, and complete admissions offline behavior.

## Canonical ticketing principles

- The July 2026 event-ticketing model is the destination; legacy tables become read-only compatibility sources and are retired.
- Inventory changes use an append-only ledger/reservation model and transactional availability checks; dashboard totals are derived/read models.
- Ticket/credential identifiers are unguessable and signed/verified for scanning.
- Ticketing can integrate external providers, but imported provider state is distinct from Tourify-originated sales.
- No inventory/capacity is fabricated. Event setup creates an incomplete ticketing checklist until authorized users explicitly configure it.
- Refund, void, transfer, comp, and override actions require reason and separation of duties where configured.

## Functional scope

### Configuration and inventory

- Event sales configuration, currency/time zone, sales windows, fees/taxes policy, capacity source, delivery/scanning rules.
- Ticket/credential types, price tiers, quantities, channels, visibility, restrictions, and status/version.
- Holds/allocations by tour, promoter, venue, artist, sponsor, guest/comp, production, accessibility, and other approved categories.
- Inventory ledger for issued, reserved, sold, held, comped, transferred, voided, refunded, released, and scanned states.

### Orders, tickets, and guest lists

- Customer/order/payment references with protected-field policy.
- Ticket issuance, transfer/claim, resend, cancel/void, refund, and dispute/provider state.
- Guest-list entries, host/category, party size, plus-one policy, approval, notes/privacy, credential level, arrival/check-in.
- Tour-wide manifest for allocations and VIP/credential requirements across stops.

### Admissions

- Scanner/device registration, signed credential verification, offline event package, check-in/check-out/re-entry policy, duplicate/revoked/manual override, sync/reconciliation.
- Real-time authorized counts by gate/type/status with degraded/offline freshness.

## Detailed task plan

### Phase 0–1 — security and convergence design

| ID | Task | Acceptance criteria |
|---|---|---|
| TIX-001 | Approve canonical ticketing ADR | Destination tables, inventory ledger, external provider boundary, cutover, refunds, capacity source, and retention are decided. |
| TIX-002 | Inventory legacy/new data and consumers | Tables/routes/pages/jobs/webhooks/reports map to destination, compatibility period, reconciliation query, and retirement milestone. |
| TIX-101 | Drop permissive legacy policies | Explicit migration drops blanket policies; direct Org A/Org B tests prove parent and record-ID isolation before UI rollout. |
| TIX-102 | Harden new ticketing RLS/functions | Event/org/grant checks cover config, inventory, customer/order protected data, ticket, credential, transfer, check-in, allocation, reservation, webhook, and analytics records. |
| TIX-103 | Add canonical service/command layer | Per-command schemas, capability, parent state, idempotency, inventory transaction, reason, audit, and typed errors are mandatory. |
| TIX-104 | Feature-flag Admin read model | Admin can compare legacy/new totals per organization/event; mismatch dashboard blocks cutover and exposes causes. |
| TIX-105 | Remove default capacities | Event builder requires explicit ticket setup or “not ticketed”; no GA/VIP records/quantities are silently created. |

### Phase 5 — ticket configuration and inventory

| ID | Task | Acceptance criteria |
|---|---|---|
| TIX-501 | Build event ticketing setup | Authorized user configures capacity source, currency, windows, tax/fee, ticket types/tiers/channels/limits and previews availability. |
| TIX-502 | Implement inventory ledger | Every inventory movement is atomic, balanced, attributable, idempotent, and reconstructs current availability; race tests prevent oversell. |
| TIX-503 | Build allocations/holds matrix | Tour × stop × allocation category shows requested/held/issued/released/used; deadlines and release rules are configurable/audited. |
| TIX-504 | Build comp/guest approval | Requests, approver threshold, recipient/host, credential, plus-one, notes, issuance, cancellation, and attendance are tracked. |
| TIX-505 | Rebuild campaigns/promos | Scope, eligibility, code generation/import, windows, limits, discount rule, budget/approval, redemption, fraud controls, and analytics use canonical data. |
| TIX-506 | Add order/ticket operations | Search is org/event scoped and rate-limited; resend/transfer/void/refund require allowed state/capability/reason and show financial impact. |
| TIX-507 | Add tour ticketing workspace | Authorized aggregate shows inventory/allocation/sales/refunds/comps/check-in and exceptions by stop with drilldown; provider freshness is explicit. |

### Phase 5 — admissions and provider integrations

| ID | Task | Acceptance criteria |
|---|---|---|
| TIX-508 | Harden credential generation | Signed/rotatable verification format avoids embedded sensitive data; revocation/key rotation and backward validity policy are tested. |
| TIX-509 | Build scanner/device management | Register/revoke devices/operators, event packages, gates, last sync, version, and permissions; lost device can be invalidated. |
| TIX-510 | Add offline scanning | Package is event/audience scoped and expiring; duplicate/revoked/manual cases are clear; queued scans reconcile idempotently with conflict resolution. |
| TIX-511 | Build admissions dashboard | Counts expose data freshness and offline devices; gate/type/time filters, anomaly alerts, and accessible manual fallback are supported. |
| TIX-512 | Build provider adapter/webhook boundary | Verify signature, replay/order/idempotency, map external identities/state, retain raw event securely, quarantine unmatched, and monitor lag/failure. |
| TIX-513 | Add ticket settlement handoff | Gross, fees, tax, refunds, chargebacks, comps, allocation, attendance and provider statements reconcile to finance/show settlement with variance. |

### Phase 6 — migration and release

| ID | Task | Acceptance criteria |
|---|---|---|
| TIX-601 | Migrate/reconcile legacy data | Per event/org counts and financial totals match approved tolerances; unresolved records are reviewed; legacy writes stop by feature flag. |
| TIX-602 | Ticketing security/load review | Tests cover oversell races, IDOR, promo abuse, scanner forgery/replay, offline duplication, refund privilege, webhook attack, and high-volume scan/sale load. |
| TIX-603 | Retire old routes/tables/policies | Usage is zero, historical reads are preserved as approved, permissive policies are absent, and Admin UI/jobs/reports use canonical model only. |

## Test requirements

- Inventory ledger/property/concurrency tests, price/fee/tax rounding, window/time-zone, promo limits, allocation release, ticket state, transfer/refund/void, and settlement math.
- Direct database multi-org and protected customer-field tests.
- Scanner signature/key rotation, device revocation, offline duplicate/conflict, and reconnect tests.
- Provider signature/replay/out-of-order/missing event and reconciliation tests.
- E2E: configure → allocate/hold → sell/comp → transfer/refund → scan offline/online → settlement.

## Deployment readiness

- Legacy permissive policies are dropped and verified against the deployed database.
- Admin and provider integrations use one canonical inventory/ticket/credential model.
- Inventory cannot oversell under concurrency; all movements and privileged operations are auditable.
- Offline admissions recover deterministically and disclose freshness.
- Event/tour/provider totals reconcile to finance before legacy retirement.
