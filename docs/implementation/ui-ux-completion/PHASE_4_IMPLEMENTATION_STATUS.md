# Phase 4 Implementation Status

Source of truth: 2026-07-27 UI/UX audit  
Baseline: current working tree  
Database rule: manual additive SQL only; no restore, reset, push, or remote execution

## Current gate

Phase 4 implementation is complete against the current Venue baseline. It is not
release-accepted. The booking-lifecycle SQL and concurrent index were reported
successfully applied by the operator on 2026-07-28; Codex did not execute them.
Backfill, constraint validation, read-only postflight, persona isolation, and
feature-flag evidence remain open. The application must remain behind
`FEATURE_VENUE_BOOKING_LIFECYCLE` until those checks pass.

## Audit reconciliation

| Module | Implementation evidence | Remaining release gate |
| --- | --- | --- |
| VEN-01 Shell | Venue operations owns its chrome; global nav/player are suppressed under `/venue`; legacy twins redirect. | Mobile/desktop keyboard and screen-reader journey evidence. |
| VEN-02 Dashboard | Real booking, event, staffing, hiring, and site-map signals drive next actions with load/error/empty states. | Moderated priority comprehension and recovery evidence. |
| VEN-03 Profile/directory | Strict update DTO, shared public sanitizer, owner checks, real detail/editor saves, canonical public URLs. | Public/editor parity screenshots and supported-viewport evidence. |
| VEN-04 Bookings | Canonical lifecycle, legal transitions, revision conflicts, idempotency, compatibility statuses, timeline, and explicit unavailable state. | Apply/validate manual SQL; two-sided negotiation journey. |
| VEN-05 Calendar/events | One active event list/calendar and `/venue/events/[id]` operations hub; aliases redirect. | Cross-surface propagation journey. |
| VEN-06 Event day | Scanner writes and totals are event-authorized; attendee contact is capability-gated; offline scans pause without storing raw credentials. | Safe offline admission remains unavailable; field recovery test required. |
| VEN-07 Ticketing | Event-scoped ticket types, credentials, scans, reversals, contact permissions, reconciliation, and settlement contracts are retained. | Sale-to-refund-to-settlement Venue persona journey. |
| VEN-08 Finance | Real ledger/ticket sources, scoped timeframe/currency surfaces, and separate view/manage finance capabilities. | Payout/reconciliation persona and source-row comparison. |
| VEN-09 Analytics | Canonical verified booking/ticket sources; legacy analytics route redirects; unsupported synthetic totals remain removed. | Chart source/range/export and empty-state evidence. |
| VEN-10 Hiring | Canonical staff hub links openings, applicants, onboarding, roster, scheduling, and assignment-backed Work Mode. | Moderated job-to-shift journey. |
| VEN-11 Scheduling | Server-authenticated current Venue and persisted shift/request APIs remain canonical. | Availability/conflict/swap/publish persona matrix. |
| VEN-12 Permissions | Central owner/team/staff/assignment capability resolution now includes finance and door permissions. | Role-preview, dangerous-action, and audit-history evidence. |
| VEN-13 Docs/equipment | Canonical scoped vault/registry routes retained; dashboard twins redirect away from duplicate component trees. | Version, custody, maintenance, reservation, and recovery journey. |
| VEN-14 Site maps | Shared scoped/versioned map workspace and worker field/list consumption path retained. | Keyboard alternative and mobile field usability evidence. |
| VEN-15 Communications | Canonical Venue inbox and operational deep links retained; legacy mock social/team routes excluded from production navigation. | Attachments, read state, escalation, and context-return journey. |
| VEN-16 Settings | Canonical settings save/public-link path retained; legacy integration mock entry redirects away from production. | Settings decomposition and live provider-health/disconnect evidence. |

All 32 Phase 4 implementation/journey rows remain `needs remediation` in the
master audit ledger until the audit's full evidence bundle is attached. This is
intentional: implementation completion is not the same as release acceptance.

## Material Phase 4 remediations

- removed double application chrome from Venue operations;
- replaced simulated multi-venue detail/editor data and saves with authenticated
  contracts;
- stripped private Venue settings and ownership/contact data from public reads;
- added tenant-scoped finance authorization before service-role access;
- added the canonical booking lifecycle with revision conflict and idempotency
  handling;
- made confirmation-to-event creation idempotent;
- removed raw offline ticket credential persistence and false-positive offline
  admission;
- restricted door totals and attendee contact to explicit capabilities;
- preserved canonical routes and compatibility adapters without deleting legacy
  data or routes.

## Manual SQL package

Codex generated but did not execute:

- `supabase/migrations/20260728195837_venue_booking_lifecycle.sql`
- `supabase/sql/20260728195837_venue_booking_lifecycle_concurrent_index.sql`
- `supabase/sql/20260728195837_venue_booking_lifecycle_postflight.sql`
- `docs/engineering/migration-validation/20260728195837_venue_booking_lifecycle.json`
- `docs/implementation/ui-ux-completion/MANUAL_SQL_VENUE_BOOKING_LIFECYCLE.md`

The package expands nullable fields, adds an append-only lifecycle timeline,
provides an explicit venue-scoped resumable backfill, adds `NOT VALID`
constraints, applies RLS/grants, and provides a revision/idempotency-checked
transition function. No restore, reset, truncate, ownership inference, or legacy
deletion is included.

## Automated evidence

- 95 relevant tests across 13 files pass across shell ownership, profile
  DTO/privacy, booking lifecycle, finance tenant isolation, offline door
  behavior, ticketing, hiring/scheduling, and site-map versioning;
- touched-file lint reports zero errors;
- focused Venue contract TypeScript compilation passes;
- migration validation passes with the planned manifest;
- production-debug artifact check passes;
- legacy route inventory check passes;
- scoped whitespace validation passes.

The repository-wide TypeScript check produced no diagnostics but did not finish
within a 90-second bounded run, so it is not recorded as passed.

## External release gates

- operator confirms target Supabase project and hosted migration history;
- operator records the Venue booking lifecycle backfill and postflight output;
- operator enables `FEATURE_VENUE_BOOKING_LIFECYCLE=1` only after postflight;
- Venue owner, manager, door staff, and worker journeys pass on supported
  viewports and recovery conditions;
- keyboard, screen reader, reduced motion, touch, and 200%/400% zoom checks pass;
- safe offline check-in is either cryptographically implemented and field-tested
  or remains explicitly unavailable;
- LCP, INP, CLS, action feedback, and search/filter performance thresholds pass;
- moderated completion and rollout/rollback evidence are attached.
