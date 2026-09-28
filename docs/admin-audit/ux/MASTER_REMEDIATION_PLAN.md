# Tourify Admin UX Audit — Master Remediation Plan

This is the execution plan for fixing every canonical Admin finding and every `ADMUX-*` UX task. It is a planning artifact, not a competing status tracker. Status, ownership, evidence attachment, and launch authority remain in `docs/admin-audit/registry/`.

Baseline: 79 canonical findings, 362 specification tasks, 20 workflows, 18 launch gates, 158 UX findings, 54 UX tasks, and 18 delivery waves.

## Operating rules

- Execute one canonical task at a time in dependency order; shared contracts land before consumers.
- Preserve the dirty worktree, acting-organization authorization, legacy deep links, and post-audit domain capabilities.
- Use additive database migrations only. Never reset, destructively reseed, directly restore an archived migration, or create mock production data.
- A task earns no completion credit until implementation, focused tests, failure injection, two-organization negatives, responsive/accessibility checks, and raw evidence satisfy its acceptance criteria.
- Failed, stale, degraded, denied, and unavailable data must remain visibly distinct from zero, empty, ready, or success.
- Keep legacy routes and components behind flags until parity, rollback, adoption, and independent verification evidence exist.
- PR waves are review boundaries. Commits, deployment, and legacy retirement require explicit authority.

## Definition of done

Every finding is complete only when its owning code path is changed, its canonical contract is tested, failure/recovery behavior is covered, tenant negatives pass, UI evidence passes where applicable, raw artifacts are hashed and attached to the existing registry receipt, and all dependent launch gates are green on the same reviewable state.

## Execution loop

1. Read the linked finding/task, current implementation, authorization boundary, dependencies, and existing evidence.
2. Run focused pre-change tests and classify the change as reusable, partial, conflicting, or unrelated.
3. Implement the smallest additive contract; preserve aliases and flags; make scope and acting organization explicit.
4. Add deterministic fixtures and focused tests before consuming the contract in another domain.
5. Run unit/component, fault-injection, URL/history, two-organization, responsive, accessibility, and task-specific acceptance checks.
6. Capture command output, screenshots/recording, network/console evidence, scope transitions, and recovery notes.
7. Run the wave gate, registry/workbook drift checks, and reviewer checks before advancing.

## Phase and wave plan

| Phase | Waves | Implementation outcome | Exit evidence |
| --- | --- | --- | --- |
| 00 — Reconciliation, architecture freeze, fixtures | W00 | Provenance, baseline hashes, ten ADRs, AUX→ADMUX crosswalk, deterministic fixtures, partial-work classification, and the ADM-B01 prerequisite are reconciled. | Registry/workbook clean; fixture fingerprint repeatable; fresh migration, type/build, and baseline evidence recorded. |
| 01 — Navigation, URL, scope | W01–W02 | Six-domain IA, mobile drawer, organization switcher, canonical URL keys, legacy aliases, and workspace ownership matrix. | Refresh/share/back-forward, incompatible-child-scope, bookmark, and destination reachability tests. |
| 02 — Shared UI/state platform | W03–W04 | Shared header, panel, metric, table, data-state, skeleton, attention, navigation, icon-action, and critical-action contracts. | Explicit state fixtures, one-main-landmark check, sibling-failure isolation, 375px dense-table, keyboard, focus, touch-target, and reduced-motion evidence. |
| 03 — Scalable collections | W05–W06 | Server-backed Tours, Events, Ticketing, and Finance collections with pagination, search, sorting, saved views, summaries, and exports. | 115th Event/Tour and 200th Finance record discoverable; totals/exports reconcile; failed metrics never display zero. |
| 04 — Dashboard command center | W07 | Exception-first dashboard, normalized attention queue, truthful realtime status, explicit task failures, and working View All/calendar affordances. | Five-second operator test plus disconnect, partial, and task-failure recovery evidence. |
| 05 — Event and Tour workspaces | W08–W09 | Hierarchical workspace navigation, shared record shell, independent domain loading, corrected duplication/consequence previews, and scoped People/Logistics launchers. | Legacy tab mappings, lazy-loading preservation, sibling failure isolation, and predictable return URLs. |
| 06 — Workforce, Hiring, governance | W10 | Conflict-first Staff, employer-scoped Hiring funnel, governance IA, locked-capability explanation, and safe denial/no-organization recovery. | Owner, workforce-manager, and member persona evidence. |
| 07 — Logistics and communications | W11–W12 | One editor per logistics entity, complete scope path, unread-first responsive inbox, realtime metadata, voice-note review/cancel, and private attachments. | 30+ conversation mobile journey, editor ownership, freshness, and unauthorized attachment rejection. |
| 08 — Ticketing, Finance, vendors | W13 | Ticketing domain IA/lazy loading, canonical ledger, exception-led Finance, meaningful settlement context, and one vendor identity. | Lookup/refund/export, budget/settlement/export, scope, and child-failure evidence. |
| 09 — Analytics/data trust | W14 | Freshness/data-state contracts for metrics, charts, exports, and realtime bound to acting organization. | Failure-never-zero and cross-organization export/realtime negatives. |
| 10 — Mobile/accessibility closure | W15 | Launch-critical routes pass phone/tablet/desktop, 200% zoom, reduced motion, keyboard, focus, landmark, dialog, screen-reader, contrast, touch-target, and table checks. | No critical/serious axe findings; documented desktop-primary rationale for Finance and Organization/System. |
| 11 — Runtime verification and rollout | W16–W17 | Authenticated persona journeys, cross-org/revocation checks, pilot flags, telemetry, rollback, and legacy retirement. | Independent verification, product/security GO, flag-off rollback, and bookmark continuity. |

## Wave task ledger

| Wave | Objective | Task IDs | Dependencies | Canonical batches |
| --- | --- | --- | --- | --- |
| W00 | Architecture + fixtures | ADMUX-0001, ADMUX-0002 | — | ADM-B00, ADM-B01 |
| W01 | Admin IA + scope switch | ADMUX-0101–ADMUX-0103 | W00 | ADM-B13 |
| W02 | URL/deep-link foundation | ADMUX-0104–ADMUX-0111 | W00, W01 | ADM-B13 |
| W03 | Shared header/state/attention | ADMUX-0201–ADMUX-0203 | W00–W02 | ADM-B13 |
| W04 | Shell/design-system/a11y primitives | ADMUX-0204–ADMUX-0210 | W03 | ADM-B13 |
| W05 | Collections: Tours + Events | ADMUX-0301–ADMUX-0304 | W02–W04 | ADM-B04, ADM-B05 |
| W06 | Collections: Ticket orders + Finance + KPI contracts | ADMUX-0305–ADMUX-0307 | W02–W04 | ADM-B11, ADM-B12, ADM-B13 |
| W07 | Dashboard command center | ADMUX-0401–ADMUX-0403 | W03–W06 | ADM-B13 |
| W08 | Workspace navigation + Tour/Event shells | ADMUX-0501–ADMUX-0503 | W02–W04 | ADM-B04, ADM-B05, ADM-B13 |
| W09 | Event domain state/actions/People/Logistics | ADMUX-0504–ADMUX-0506 | W08 | ADM-B04 |
| W10 | Workforce/Hiring/Organization governance | ADMUX-0601–ADMUX-0603 | W04, W08 | ADM-B06, ADM-B07, ADM-B10 |
| W11 | Logistics command center | ADMUX-0701–ADMUX-0703 | W03, W04, W08, W09 | ADM-B09 |
| W12 | Communications responsive/privacy | ADMUX-0704–ADMUX-0705 | W02–W04 | ADM-B08 |
| W13 | Ticketing + Finance + Vendor migrations | ADMUX-0801–ADMUX-0803 | W06, W08 | ADM-B11, ADM-B12 |
| W14 | Analytics/data trust | ADMUX-0901 | W03, W06 | ADM-B13 |
| W15 | Mobile/a11y closure | ADMUX-1001 | W08–W14 | ADM-B13 |
| W16 | Authenticated runtime UX verification | ADMUX-1101 | W05–W15 | ADM-B14 |
| W17 | Feature-flag rollout + legacy retirement | ADMUX-1102 | W16 | ADM-B14 |

## Wave-by-wave action checklist

### W00 — Architecture + fixtures

- Reconcile the dirty worktree and classify overlapping changes.
- Keep the canonical registry as the sole status/launch authority.
- Keep all ten UX ADRs accepted and traceable.
- Maintain the AUX→ADMUX→canonical batch/evidence crosswalk.
- Keep two organizations, all required personas, 125+ Tours/Events, deep ticket/finance ledgers, unread communications, stale/degraded APIs, and mobile/zoom fixtures deterministic and idempotent.
- Resolve ADM-B01’s fresh-migration blocker through a reviewed additive strategy before downstream consumers rely on the database contract.

### W01 — Admin IA + scope switch

- Replace the feature-inventory sidebar with Home, Operations, Workforce, Commerce, Network, and Organization & System.
- Add an accessible mobile drawer, labeled collapsed navigation, direct search results, SPA-native links, badges, and one organization switcher.
- Reject incompatible child scope when switching organizations and preserve the resolved acting organization in server requests.

### W02 — URL/deep-link foundation

- Make canonical URL keys authoritative for Dashboard, Tours, Event editing, Calendar, Staff/Hiring, Ticketing, Finance, Contracts, Communications, and Analytics.
- Preserve legacy aliases for reads while emitting only canonical URLs.
- Test refresh, share, Back, Forward, selected records, filters, sort, pagination, and query restoration.
- Publish the workspace ownership matrix for Tasks, Staff, Hiring, Logistics, Communications, Ticketing, Finance, Vendors/Contracts, and Calendar.

### W03 — Shared header/state/attention

- Finish the canonical Admin header, panels, metrics, explicit data states, empty states, skeletons, attention queue, and workspace navigation.
- Normalize live/updated/stale/partial/offline status semantics.
- Keep action failure and child-panel failure visible without collapsing healthy page data.

### W04 — Shell/design-system/a11y primitives

- Finish `AdminDataTable`, icon actions, critical-action dialogs, touch-target rules, accessible names, focus behavior, tooltips, and reduced-motion behavior.
- Remove nested main landmarks and define one predictable scroll owner.
- Converge Workforce/scheduling primitives only after consumer parity; deprecate nothing prematurely.

### W05 — Tours + Events collections

- Replace prompt-based saved views with governed UI and URL state.
- Add server-backed pagination, search, sort, density, saved views, summaries, and exports.
- Make records beyond the first 100 discoverable and keep page metrics separate from organization totals.
- Repair Event attention, draft discovery, and export failure behavior.

### W06 — Ticket orders + Finance + KPI contracts

- Consolidate Ticketing into one searchable order/refund ledger.
- Build the canonical Finance ledger and authoritative time-series/export flow.
- Publish the KPI catalog: source, scope, coverage, freshness, state, and failure behavior for every Admin metric.

### W07 — Dashboard command center

- Reorder Dashboard around urgent exceptions, today’s work, next actions, authoritative KPIs, and secondary trends.
- Aggregate normalized attention items from domain owners without duplicating source-of-truth workflows.
- Make View All cross-domain, task failures explicit, and calendar affordances functional.

### W08 — Workspace navigation + Tour/Event shells

- Introduce hierarchical primary/secondary workspace navigation with no more than five primary mobile destinations.
- Refactor Tour and Event mega-pages around a shared record shell while preserving Tour lazy loading.
- Isolate Tasks, Staff, Vendors, Finance, Notifications, and Analytics states.

### W09 — Event domain state/actions/People/Logistics

- Correct duplication duration, coordinator labels, and consequence previews.
- Convert embedded People and Logistics panels into scoped modes or launchers.
- Ensure each domain loads and fails independently and returns to the originating canonical URL.

### W10 — Workforce/Hiring/Organization governance

- Make Staff navigation compact and prioritize uncovered shifts/conflicts.
- Present Hiring as Overview, Jobs, Applications, Onboarding, Roster, then Templates/Audit.
- Reorganize Organization into Overview, People & Access, Operations Defaults, Commerce, and Data & System.
- Explain locked capabilities, provide a corrective no-organization CTA, and normalize unauthorized deep links.

### W11 — Logistics command center

- Normalize Logistics vocabulary and lazy-load only the active domain.
- Show organization→tour→event→leg scope and the actionable next movement.
- Consolidate duplicate transport, travel, Event logistics, and logistics-communications editors.

### W12 — Communications responsive/privacy

- Implement unread-first desktop split view and mobile master-detail navigation.
- Update conversation metadata in realtime without opening threads.
- Add cancel/review-before-send voice-note behavior and private, authorized attachment delivery.

### W13 — Ticketing + Finance + Vendor migrations

- Reorganize Ticketing into Overview, Inventory, Sales & Service, Admissions, Marketing, and overflow destinations.
- Lazy-load ticketing domains and expose child failures independently.
- Prevent synthetic event-specific sharing behavior from “All Events”.
- Make Finance exception-led with one canonical budget workflow and meaningful Event/Tour settlement context.
- Establish one vendor identity across creation, assignment, contracts, and obligations.

### W14 — Analytics/data trust

- Apply explicit state/freshness contracts to metrics, charts, exports, and realtime feeds.
- Bind exports and subscriptions to the resolved acting organization.
- Expose coverage and partial datasets and preserve actionable export errors.

### W15 — Mobile/a11y closure

- Test Dashboard, Event day-of, Staff scheduling, Communications, Calendar, Logistics, Ticketing admissions/order lookup, and critical actions at phone/tablet/desktop, 200% zoom, and reduced motion.
- Complete keyboard, focus, landmark, dialog, screen-reader, touch-target, contrast, and responsive-table repairs.
- Keep Finance reporting and Organization/System desktop-primary while preserving accessible review/approval actions.

### W16 — Authenticated runtime UX verification

- Run Organization Owner, Operations Manager, Workforce Manager, Finance Manager, Member, Worker, Artist, cross-organization, revoked, and unauthenticated scenarios.
- Verify Admin→Worker, Admin→Artist, Event, Tour, Ticketing, Finance, Communications, vendor/contract, scope-switch, and Back-navigation journeys.
- Record persona, starting URL, scope transitions, expected/actual result, visual/network/console/accessibility evidence, and finding IDs.

### W17 — Feature-flag rollout + legacy retirement

- Roll high-risk navigation/workspace changes to internal/test organizations first.
- Monitor task success, legacy-route use, scope errors, degraded-state frequency, export parity, page errors, and mobile/desktop differences.
- Prove flag-off rollback and preserve legacy bookmarks during migration.
- Retire legacy UI only after parity, adoption, rollback, and independent product/security verification.

## Canonical batch plan and complete finding coverage

Each row below is an exhaustive ownership map for the 79 canonical findings. The registry owns the detailed finding title, acceptance criteria, and status; the batch supplies the remediation boundary and exit test.

| Batch | Scope | Finding IDs | Required fix/evidence |
| --- | --- | --- | --- |
| ADM-B00 | Execution control plane | AOA-001, AOA-002, AOA-004, AOA-005, AOA-006, AOA-008, AOA-009, AOA-010, AOA-011, AOA-014 | Single registry, provenance, dependency, phase-exit, crosswalk, and generated-view controls pass. |
| ADM-B01 | Reproducible baseline and migration chain | ADM-M-001, ADM-M-010, ADM-M-013, ADM-M-058, ADM-M-061, AOA-003, AOA-012, AOA-015 | Fresh database and representative upgrade, typecheck/build, migration validation, route/service-role gates, and internally consistent evidence. |
| ADM-B02 | Identity, tenant isolation, privileged execution | ADM-M-002, ADM-M-003, ADM-M-006, ADM-M-012, ADM-M-016, ADM-M-017, ADM-M-018, ADM-M-019, ADM-M-021, ADM-M-047, ADM-M-051–ADM-M-057 | Trusted server actor binding, capability vocabulary, RLS/RPC isolation, durable idempotency, centralized audit logging, and Org A/B/revoked/unauthenticated negatives. |
| ADM-B03 | Site-map zone recovery | — | Scope, ownership, idempotency, audit, migration, direct-RLS, retry, and recovery evidence for the site-map zone bridge. |
| ADM-B04 | Canonical events and ingestion | ADM-M-004, ADM-M-009, ADM-M-036 | Canonical `events_v2` identity, provider ingestion, publish/provision/assignment commands, UI reachability, and reconciliation. |
| ADM-B05 | Tours and Artist delivery | ADM-M-005, ADM-M-022–ADM-M-028 | Linked rosters, reliable autosave, complete duplication, quarantine resolution, ghost-stop cleanup, timezone-safe dates, hold expiry, calendar aggregation, and recovery tests. |
| ADM-B06 | Hiring and onboarding | ADM-M-014, ADM-M-015, ADM-M-062 | Employer-scoped server lifecycle, ordered transitions, email delivery, client-state rejection, replay/expiry, and worker provisioning evidence. |
| ADM-B07 | Workforce roster and check-in | ADM-M-029 | Venue-employed staff conflicts, persisted conflict decisions, assignment/check-in negatives, and notification recovery. |
| ADM-B08 | Messaging, private storage, delivery workers | ADM-M-011, ADM-M-020, ADM-M-030, ADM-M-031, ADM-M-064 | Private storage, API-mediated writes, unread/group threads, durable broadcast/reminder delivery, six outbox workers, replay, monitoring, and recipient evidence. |
| ADM-B09 | Operational logistics delivery | — | Canonical event/stop/leg/org/recipient identity, one editor per entity, DST, partial failure, retry, reversal, and recipient acknowledgement. |
| ADM-B10 | Organization, Artist, Venue administration | ADM-M-007, ADM-M-008, ADM-M-045, ADM-M-046 | Scoped APIs, safe upsert/delete, venue organization linkage, import error detail, authoritative metrics, and no browser-anon writes to phantom tables. |
| ADM-B11 | Ticketing and admissions | — | Canonical ticketing model, inventory/allocation/order/refund/admission workflows, provider idempotency, offline scanning, reconciliation, and isolation. |
| ADM-B12 | Commercial/provider administration | ADM-M-032, ADM-M-033, ADM-M-060, ADM-M-063 | Exception-led Finance, truthful money movement, scoped contract actions, obsolete-route retirement, vendor obligations, notifications, and recovery. |
| ADM-B13 | Navigation, accessibility, responsiveness, reliability | ADM-M-034, ADM-M-035, ADM-M-037–ADM-M-044, ADM-M-048–ADM-M-050, ADM-M-059 | Canonical IA/URL migration, shared primitives, bounded collections, keyboard/focus/mobile/a11y repairs, observability, offline state, and dead-surface retirement behind flags. |
| ADM-B14 | Independent verification and release | AOA-007, AOA-013 | Runtime persona kit, provenance, independent verification, product/security approval, rollback, and restricted-pilot evidence. |

## Shared contracts to implement first

### URL and scope

Canonical keys are `account`, `orgId`, `tourId`, `eventId`, `legId`, `employerType`, `employerId`, `tab`, `view`, `q`, `status`, `sort`, `page`, and `selected`. Server resolution owns the acting organization. Incompatible child scope is rejected. Legacy aliases remain readable, while emitted URLs are canonical.

### Data states

Every dataset exposes `loading`, `ready`, `true-empty`, `filtered-empty`, `stale`, `degraded`, `denied`, or `unavailable`, plus freshness, scope, and recovery metadata. A child failure never clears healthy sibling data. Metrics and exports never infer organization totals from a visible page.

### Collections

Tours, Events, Ticketing, Finance, Communications, and other dense surfaces use server pagination, search, sort, density, saved views, authoritative summaries, responsive column priority, accessible selection-only bulk actions, and server exports.

### Workspace navigation

Tasks, Staff, Hiring, Logistics, Communications, Ticketing, Finance, Vendors/Contracts, and Calendar each have one canonical owner workspace. Embedded panels become scoped modes or launchers with a predictable return URL rather than competing CRUD surfaces.

### Critical actions

Reversible, lifecycle, destructive, financial, and legal actions share a dialog contract showing scope, consequences, blockers, affected records, confirmation, success, and recovery. Idempotency and audit records are server-enforced.

## Verification package

For every task, attach a receipt containing task/finding IDs, environment, commit or working-tree identity, command, raw artifact hash, expected/actual result, scope transitions, screenshots or recording where visual, network/console evidence, accessibility notes, and rollback result.

Required test families:

- Unit/component/contract tests for shared primitives and domain controllers.
- URL refresh/share/back-forward and legacy alias tests.
- Organization A/B, revoked, unauthenticated, incompatible scope, direct API, and direct-data-access negatives.
- Fault injection for degraded APIs, stale data, failed actions, failed exports, partial child panels, dropped realtime, offline state, and retries.
- Responsive/a11y checks at 375px, tablet, desktop, 200% zoom, reduced motion, keyboard, focus, dialogs, landmarks, touch targets, contrast, and screen-reader-oriented journeys.
- Scale checks beyond 100 visible rows, including the 115th Event/Tour and 200th Finance record.
- Runtime journeys for Organization Owner, Operations Manager, Workforce Manager, Finance Manager, Member, Worker, Artist, cross-organization, revoked, and unauthenticated personas.

## Rollout and rollback

1. Land shared contracts behind flags and preserve legacy reads/bookmarks.
2. Pilot in internal/test organizations with telemetry for task success, scope errors, degraded-state frequency, export parity, page errors, legacy-route use, and mobile/desktop differences.
3. Compare old/new totals and workflow outcomes before increasing exposure.
4. Prove flag-off rollback with canonical URLs, data, audit records, and in-flight recovery preserved.
5. Obtain independent verification and product/security approval.
6. Retire legacy UI/routes only after approved usage, parity, rollback, bookmark, and security evidence.

## Current execution boundary

The canonical selector currently stops at `ADM-B01`. The historical CI-pinned fresh migration rehearsal first failed because `20260821025543_unified_guest_list_admissions.sql` referenced `public.ticket_allocations`, while the only repository creation was in an archived `local_only_unapplied` migration. The active chain now contains additive reconciliations for the ticketing foundation (`20260821000000_reconcile_ticketing_foundation.sql`) and legacy attendance shape (`20260821010000_reconcile_event_attendance_shape.sql`). The exact pinned fresh apply, production-schema review, and staging verification remain required before W01 and later UX work may bypass this gate.

Supporting evidence: `docs/admin-audit/evidence/2026/EVD-B01-FRESH-MIGRATION-LOCAL-FAIL.md`, `docs/admin-audit/evidence/2026/EVD-B01-TICKETING-FOUNDATION-RECONCILIATION.md`, `docs/admin-audit/evidence/2026/EVD-B01-FRESH-MIGRATION-ATTENDANCE-SHAPE-FAIL.md`, `docs/admin-audit/evidence/2026/EVD-B01-TYPECHECK-LOCAL-INTERRUPTED.json`, and the generated canonical workbook.
