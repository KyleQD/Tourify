# Ticketing gaps — TICKET-001 audit

Triage: **missing** (does not exist), **incomplete** (exists but partial/non-canonical), **improve** (works, needs hardening/evidence). Every item carries evidence + location. Cross-references: `docs/admin-feature-specs/09_Ticketing_Admissions_and_Guest_Lists.md` (TIX task IDs), `docs/admin-feature-specs/discovery/TIX-002-ticketing-consumer-inventory.md`, `docs/AUDIT_FINDINGS_2026-08-23.md`, `docs/DEVELOPMENT_BACKLOG.md`, `.agents/organization-ticketing/INVENTORY.md`.

Counts: 18 missing, 16 incomplete, 9 improve (43 total).

## Missing (build)

| # | Gap | Evidence / location | Target |
|---|---|---|---|
| M1 | Canonical inventory ledger — all movements atomic/balanced/idempotent; current counters are read-model fields, not authority | `lib/ticketing/ledger.ts` (advisory), `lib/ticketing/inventory.ts` (`finalizeInventory`; `reserve_ticket_inventory` RPC not consistently used per audit main findings), `__tests__/ticketing/sale-states.test.ts` | TIX-502 |
| M2 | Canonical command/state-machine layer (per-command schema, capability, parent state, idempotency, reason, audit, typed errors) | `app/api/admin/ticketing/commands/route.ts` is "mixed bridge/canonical command service" (TIX-002), accepts mixed paths | TIX-103 |
| M3 | Ticket setup workspace (capacity source explicit, currency/windows/tax/ticket-type channels/limits) | `app/api/admin/ticketing/setup/route.ts` exists but TIX-501 acceptance criteria not evidenced; TIX-105 "remove default capacities" not landed (event builder silently defaults GA/VIP capacities — `docs/admin-feature-specs/09_...md` baseline section) | TIX-501, TIX-105 |
| M4 | Allocations/holds matrix with deadlines + release rules + audit (tour × stop × category) | `components/admin/ticketing/allocation-matrix-panel.tsx` is a panel; allocation release rules config not evidenced | TIX-503 |
| M5 | Tour-wide ticketing workspace (inventory/allocation/sales/refunds/comps/check-in by stop; provider freshness explicit) | Not present; `ticketing-financials-step.tsx` is aggregate-only (TIX-002 flags "no zero fallback") | TIX-507 |
| M6 | Canonical comp/guest approval workflow (approver threshold, plus-one, notes/privacy, credential issuance, cancellation, attendance) | `app/api/admin/ticketing/guest-approvals/route.ts` + `components/admin/ticketing/guest-approvals-panel.tsx` exist; separate legacy guest-list path still live (`app/api/events/[id]/guestlist/route.ts`, artist `guestlist-manager.tsx`) | TIX-504 |
| M7 | Canonical campaigns/promos governance (scope, eligibility, code gen/import, limits, budget/approval, redemption, fraud, analytics) | Live promo infra is legacy/bridge (`ticket_campaigns`, `promo_codes`, `ticket_referrals`, `ticket_shares`) served by `components/ticketing/campaign-manager.tsx` + `enhanced/route.ts` promo/referral actions; canonical schema absent | TIX-505 |
| M8 | Signed/rotatable credential verification format (key version, rotation, revocation, backward validity) | `lib/ticketing/credentials.ts` stores opaque tokens; TIX-002: "Plain opaque token storage is not final security approval." QR issuance is client-adjacent (WS-1.2 server-side move pending) | TIX-508 |
| M9 | Scanner/device management (register/revoke devices/operators, event packages, gates, last sync, version, permissions) | Admission surfaces exist (`lib/admin/check-in.ts`, `components/ticketing/door-check-in.tsx`, `admissions-devices-panel.tsx`) but device registration/revocation contract not evidenced | TIX-509 |
| M10 | Offline event package (audience-scoped, expiring) — current offline is client queue + `client_scan_id` reconcile; no server-pushed package or expiry | `lib/venue/door-check-in-state.ts`, `components/ticketing/door-check-in.tsx`, `supabase/migrations/20260825020000_door_operations.sql` | TIX-510 |
| M11 | Admissions dashboard with freshness/offline-device state, gate/type/time filters, anomaly alerts, manual fallback | `app/api/ticketing/reports/route.ts` + `event-ticketing-workspace.tsx` metrics are aggregate snapshots; no freshness metadata | TIX-511 |
| M12 | Provider adapter/webhook boundary (signed inbox, raw evidence retention, quarantine unmapped, ordered/replay-safe processing) | `app/api/ticketing/webhook/route.ts` is Stripe-specific bridge updates + idempotency row; no generalized inbox/quarantine or provider account isolation | TIX-512 |
| M13 | Versioned settlement handoff to finance (gross/fees/tax/refunds/chargebacks/comps/allocations/attendance vs provider statements with variance) | `app/api/ticketing/settlements/route.ts` mutates active allocations via delete/reinsert (TIX-002); no finance handoff contract | TIX-513 |
| M14 | Per-organization canonical-mode flag + persisted cutover evidence (`admin_ticketing_canonical_v1` with reconciliation before consumer authority change) | Dual-read exists (`app/api/admin/ticketing/read-model/route.ts`) but no per-org persisted decision/rollout found | TIX-601/603 |
| M15 | Legacy data migration/reconciliation job (per event/org counts + financial totals vs approved tolerances; unresolved-review queue) | `supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql` reconciles schema; no migration job | TIX-601 |
| M16 | Security/load review suite (oversell races, IDOR, promo abuse, scanner forgery/replay, offline duplication, refund privilege, webhook attack, high-volume scan/sale) | `__tests__/ticketing/` covers logic units only; `docs/DEVELOPMENT_WORKFLOW.md` tiers not met for E2E/load | TIX-602 |
| M17 | Legacy consumer retirement (zero usage, permissive policies absent, canonical-only reads) | `event_ticket_types` dormant compatibility (SEC-108 read-only); legacy enhanced reads live in admin shell | TIX-603 |
| M18 | Tour allocation/hold/comp/manifest workspace data model | Not present (aggregation only today) | TIX-507 + TIX-503 |

## Incomplete (fix toward canonical)

| # | Gap | Evidence / location | Fix |
|---|---|---|---|
| F1 | False-zero fallbacks in read surfaces ("unavailable is never zero" violated) | `app/admin/dashboard/ticketing/page.tsx` (`mapApiSocialPerformanceToUi` `?? 0`), `components/ticketing/event-ticketing-workspace.tsx` / `lib/ticketing/guest-list.ts` metrics `?? 0`/`?? 0`, `ticketing-financials-step.tsx` | Replace null-coalescing with explicit freshness/denied/error states (route + UI) |
| F2 | Admin ticketing shell still sources legacy enhanced API | `app/admin/dashboard/ticketing/page.tsx` imports legacy `@/types/ticketing` + enhanced aggregates while embedding canonical panels; TIX-002: replace enhanced-source dependency, show source state/freshness, block commands on mismatch | Migrate shell to canonical read-model with fail-closed mismatch |
| F3 | Settlement mutates active allocations (delete/reinsert) | `app/api/ticketing/settlements/route.ts`, `lib/ticketing/settlements.ts`; TIX-002: retires at TIX-513 | Make settlement versioned/append-only before finance handoff |
| F4 | Feature-flag-dependent purchase auth: `isTicketingV2Enabled()` toggles whether purchase requires login | `lib/ticketing/feature-flag.ts`, `app/api/ticketing/enhanced/route.ts` (audit main-findings: "flag-dependent auth requirements") | Decide GA behavior; purchase always authenticated |
| F5 | Endpoint sprawl: `/api/ticketing` is a literal re-export proxy of `enhanced`; dual schema probing at runtime | `app/api/ticketing/route.ts` (proxy), `app/api/ticketing/enhanced/route.ts`; audit M22 | Consolidate to typed services; remove proxy chain |
| F6 | Admin endpoints referencing undeployed tables or incompatible columns (verified drift) | `.agents/organization-ticketing/INVENTORY.md` drift findings; `supabase/migrations/20260720020254_admin_ticketing_security.sql` is marker-only and asserts `get_admin_ticketing_overview(uuid,uuid)` — object-creation migration not in active chain | Locate/migrate object chain or fix queries to deployed schema; verify per-route |
| F7 | `verify` endpoint exposes buyer PII publicly by design (service role + session-param lookup) | `app/api/ticketing/verify/route.ts` | Gate behind authenticated wallet read or short-lived signed token |
| F8 | Purchase quantity locked effectively to 1 in places; availability advisory pre-check | Audit main-findings ("Quantity locked to 1"), `app/api/ticketing/enhanced/route.ts` `purchaseTicketSchema.quantity`; reservation RPC not consistently used | Route through reservation ledger with transactional check |
| F9 | Referral/promo usage counters updated best-effort on free path; discount clamp is an arbitrary $10 server-side cap | `app/api/ticketing/enhanced/route.ts` (C4 fix), `docs/AUDIT_FINDINGS_2026-08-23.md` C4 | Canonical promo governance (build canonical or disable self-service) |
| F10 | `event_ticketing_config` capacity defaults silently applied during event creation | `docs/admin-feature-specs/09_...md` baseline; TIX-105 | Event builder requires explicit ticket setup or "not ticketed" |
| F11 | Guest-list dual paths: canonical (unified guest list) + legacy (`app/api/events/[id]/guestlist/route.ts`, artist guestlist-manager) | TIX-002 consumer matrix | Route through cannonical comp/guest approval; retire legacy after reconciliation |
| F12 | Check-in limiter fallback is an in-process Map (per-serverless-instance) when Redis absent | `app/api/ticketing/check-in/route.ts`; audit H9 "decorative at scale" | Define fail-closed/degrated semantics at scale (RATE_LIMIT_ENFORCE) and document |
| F13 | Wallet is present but QR proof not signed/rotatable; no transfer-in/claim evidence beyond transfers route | `app/tickets/my-tickets/page.tsx`, `app/api/ticketing/wallet/route.ts`, `lib/ticketing/credentials.ts` | Follow TIX-508 credential format |
| F14 | TIX-104 dual-read panels exist but per-org canonical flag not wired; commands not blocked on mismatch | `components/admin/ticketing/ticketing-read-model-panel.tsx`, `app/api/admin/ticketing/read-model/route.ts` | Wire mismatch block + per-org evidence persistence |
| F15 | Legacy marketing analytics tables treated as canonical reporting inputs | TIX-002: `ticket_shares`/`ticket_referrals`/`ticket_analytics`/`social_media_performance`; `components/ticketing/campaign-manager.tsx` reads them | Route attribution through canonical `ticket_analytics_events` read models |
| F16 | Admin stats/analytics/export/impact consumers still read legacy `ticket_sales`/`ticket_types` | `app/api/admin/dashboard/stats/route.ts`, `app/api/admin/events/[id]/analytics/route.ts`, `app/api/admin/events/[id]/export/route.ts`, `app/api/admin/tours/[id]/stops/impact/route.ts` | Replace at REP-20x / TIX-507/513; no zero fallback |

## Improve (harden / prove)

| # | Gap | Evidence / location | Action |
|---|---|---|---|
| I1 | Test tier coverage: no deployed-schema, RLS multi-org, E2E, real offline, or load tests | `__tests__/ticketing/` (10 mocked unit/contract suites); TIX-602 test requirements | Add tier-2/3 suites per `docs/DEVELOPMENT_WORKFLOW.md` |
| I2 | Direct multi-org DB tests for all canonical ticketing RLS/policies | TIX-101/102 acceptance; no SQL-level tests found in `__tests__/ticketing/` | Add Supabase-local DB tests (org A/org B + protected fields) |
| I3 | Grant/policy hygiene: security-definer functions + overlapping policies need reconciliation audit | `supabase/migrations/20260823060000_ticketing_grant_collapse_fix.sql` (VEN-147), `.agents/organization-ticketing/INVENTORY.md` | Structured review of definer functions and policy matrix |
| I4 | Freshness/observability on counts (dashboard totals derived/read-model; freshness + version surfaced) | `app/api/ticketing/reports/route.ts`, `components/ticketing/event-ticketing-workspace.tsx`; TIX-511/601 | Emit freshness/version metadata; monitor drift |
| I5 | Offline reconcile evidence: `client_scan_id` idempotency needs reconnect/conflict tests at DB level | `door-offline-queue.test.ts` (mocked), `supabase/migrations/20260825020000_door_operations.sql` | Real offline→reconnect E2E + duplicate-resolution tests |
| I6 | Webhook replay/out-of-order/missing-event handling proven at boundary | `integrity.test.ts` (mocked insert), `app/api/ticketing/webhook/route.ts` | Boundary tests per TIX-512 acceptance |
| I7 | Migration reconciliation: `ticketing_migration_issues` queue processed/reviewed; disputes resolved | `supabase/migrations/20260821025543_unified_guest_list_admissions.sql` | Operational runbook + unresolved-review evidence |
| I8 | Provider statement reconciliation absent (settlement vs Stripe payout statements) | TIX-002 settlements row ("current provider-statement job is absent") | Payout/statement import + variance reporting |
| I9 | Cron invite-expiry is the only automation; delivery resend/expiry/revocation loops unverified | `app/api/cron/ticket-invite-expiry/route.ts`, `lib/ticketing/guest-list.server.ts` | Add coverage for resend/expire/revoke + failure paths |

## Priority ordering (suggested sequencing)

1. **F1/F2/F6** — truthfulness of admin reads (false-zero, enhanced-source shell, undeployed-table drift) blocks every canonical cutover decision.
2. **F3/M13** — settlement delete/reinsert is a money-integrity exposure; version before finance handoff.
3. **F4/F8/F9** — purchase auth/availability/discounts are revenue+abuse surfaces.
4. **M8/M9/M10/M11** — admissions integrity for deployed door surfaces.
5. **M14/M15/M16/M17** — cutover + security/load evidence before GA.