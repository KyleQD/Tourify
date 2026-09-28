# Venue state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `VENUE-006` — blocked/waiting_dependency; CORE-WEB-LAUNCH
<!-- generated-agent-state:end -->

- Last reviewed SHA: `d21769046d517898144ee09a1c7bb4a7d36b068f` (task base_sha)
- Last reviewed at: 2026-09-25 (VENUE-004 / VENUE-005 wave 34: SEC-109 green, DB-008 venue code-drift cluster cleared)
- Historical active-task note (superseded by generated queue summary): VENUE-004 (availability write path) and VENUE-005 (availability/reservations raw-read boundary) — both implementation-complete in source, both with hosted gates still open
- Confidence: high for the availability/reservations boundary and for the SEC-109 classification; the code-drift cluster is closed for every file inside the venue grant, with 14 of 135 hits handed off

## Durable facts

- Mission: Own venue identity, public profiles, bookings, venue operations, and venue kit.
- Default working set is recorded in `WORKING_SET.json`.
- 70+ web routes, 45+ API handlers, 32 venue-prefixed DB tables, 30+ functions, 100+ components.
- Venue account lifecycle, ownership transfer, RBAC, and booking reservation RPCs exist in migrations (staged, not applied).
- Legacy specialist `.agents/venue-pages-builder/` completed 87/87 items + 16/16 audit modules (2026-07-28). External acceptance gates remain open.
- Component tree is split: `app/venue/components/` (canonical, 95+ files) and `components/venue/` (shared). Dedup needed.
- `app/venue/components/mobile-venue-nav.tsx` is now the canonical mobile-nav implementation; `components/venue/mobile-venue-nav.tsx` remains a compatibility re-export while the broader tree is consolidated incrementally.
- `app/venue/components/site-map-viewer.tsx` is now the canonical site-map viewer implementation; `components/venue/site-map-viewer.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/event-details/delete-event-dialog.tsx` is now the canonical event-delete implementation; `components/venue/venue/delete-event-dialog.tsx` remains a compatibility re-export for the legacy nested path.
- `app/venue/components/staff/venue-staff-scheduler-shell.tsx` is now the canonical scheduler-shell implementation; `components/venue/staff/venue-staff-scheduler-shell.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/shift-templates.tsx` is now the canonical shift-templates implementation; `components/venue/staff/shift-templates.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/shift-requests.tsx` is now the canonical shift-requests implementation; `components/venue/staff/shift-requests.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/venue-staff-shifts-panel.tsx` is now the canonical staff-shifts implementation; `components/venue/staff/venue-staff-shifts-panel.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/role-management.tsx` is now the canonical role-management implementation; `components/venue/staff/role-management.tsx` remains a compatibility re-export for the legacy path.
- `app/venue/components/staff/user-role-assignment.tsx` is now the canonical user-role-assignment implementation; `components/venue/staff/user-role-assignment.tsx` remains a compatibility re-export for the legacy path.
- The current import audit found no remaining `@/components/venue/*` imports under `app/venue/**`; remaining legacy consumers are non-venue shared surfaces and require separate caller/interface decisions.
- DESIGN-004 completed the shared compatibility handoff for `components/venue/ui/**`:
  26 files are keep, 23 are registered retire-later, and the byte-identical
  `use-toast.ts` hook is now explicitly registered as retire-later debt targeting
  `hooks/use-toast.ts`. Venue-owned consolidation is exhausted; global tree cleanup
  is represented by DESIGN-005 through DESIGN-027 and does not require venue behavior changes.
- 29 redirect/debt route files still present (cosmetic, not functional).
- Venue booking-request lifecycle coverage now exists under `__tests__/venue/booking-lifecycle.test.ts`; the canonical six-state contract is documented in `BOOKING_LIFECYCLE.md`. Hosted migration/RLS/backfill/grant/index evidence remains a separate release gate.
- Venue API routes use ~8 different authorization idioms; standardization needed.
- No React Query adoption on venue dashboards; no ISR on public profiles.
- DESIGN-031 (design-system) verified `hooks/venue/use-mobile.tsx` had zero consumers
  and converted it to a pure compatibility re-export of the canonical
  `hooks/use-mobile.ts` (2026-09-11); the path remains importable and the owning venue
  surface may decide final removal later. No venue behavior change.
- No Zod API contracts on venue routes; venue search has two paths.

## Current focus

- VENUE-001 audit complete. Produce follow-up task records for top-priority questions (Q1–Q3).
- VENUE-004 and VENUE-005 are implementation-complete in source. Both stay active only on
  hosted gates: the booking-lane receiving edit (handoff
  `HF-VENUE-004-BOOKING-RECEIVING`) and the DB-002/DB-008 isolated-staging apply plus
  denial probes. Do not re-open either locally; there is no remaining local work that
  would change behavior.
- The venue/design-system compatibility boundary is handed off; keep VENUE-002 blocked
  unless a follow-up task identifies an approved venue consumer migration.
- Baseline, gaps, and questions delivered to `docs/engineering/agents/venue/`.

## Known risks

- Staged RLS migration (`venues_rbac_rls_baseline.sql`) is security-critical and must land before any venue auth work.
- Venue booking lifecycle has no test evidence; manual SQL acceptance gate still open.
- Mobile has zero venue surfaces; web-only for operators may be intentional but unconfirmed.
- Working tree is dirty (386+ entries); only venue domain and task record were modified.
- Until `20260924120000` is applied on a hosted environment, the raw
  `venue_availability`/`venue_reservations` `USING (true)` read leak is still live in that
  environment even though the app no longer reads those tables with a client role. Treat
  the migration as security-critical and unapplied, not as done.
- `lib/venue/staff-management.service.ts` did not typecheck: it referenced
  `venue_crew_members`, `venue_team_contractors`, and `get_staff_dashboard_stats`, which
  exist in no migration and no generated type. **RESOLVED 2026-09-25 (Wave 34):** the file
  was deleted after a whole-tree zero-importer proof (see the code-drift section below). The
  database lane's investigation is no longer a blocker for venue. The byte-level twin at
  `lib/services/staff-management.service.ts` is `lib/services/**` and remains open in
  `HF-DB008-TYPECHECK-VENUE-SHARED-LIB-SURFACE`.
- ~~`check:migration-validation` and `check:migration-ledger` fail in the current dirty tree
  for reasons outside venue~~ **RESOLVED 2026-09-25 (Wave 34):** both exit 0. The drift was a
  concurrently modified migration's baseline checksum and a DB-008-owned ledger snapshot;
  those lanes fixed them. The venue lane edited neither.
- `app/api/venues/**` is unowned by path: the venue `WORKING_SET.json` lists `app/venues/**`
  and `app/api/venue/**` but not `app/api/venues/**`, even though the charter names public
  profiles as venue work. `app/api/venues/[id]/route.ts` is the last consumer of two
  DB-008 code-drift objects.

Update this file only when a task establishes a durable fact future work needs.

## Production launch graph — 2026-09-16

- VENUE-002 remains blocked/P2 at the existing ownership boundary and is not a core launch blocker unless QA-003 identifies a live venue caller that depends on the legacy component tree.
- Venue-facing core journeys remain subject to DB-002 authorization, DB-006 events_v2, and QA-003 staging certification.

## Preserved venue-feature lineage — 2026-09-22 (CP-056)

- `origin/codex/admin-workflow-completion` (HEAD `521a206d`) preserves the beta-era venue
  feature family not present in master: app/venue (120 files, incl. bookings, create-event
  wizard, document management, EPK), components/venue (46), styles/venue, context/venue,
  hooks/use-mobile.tsx, and app/providers.tsx. Port candidate islands additively behind the
  venue-pages-builder skill into release/clean-snapshot; do not merge the branch wholesale.

## Venue integrations are encrypted-vault only — 2026-09-22 (INTG-007)

- `app/api/venue/integrations/route.ts` reads token material exclusively through the
  encrypted token vault (`readVenueIntegrationSecrets`/`writeVenueIntegrationSecrets`).
  The retired `venue_social_integrations.access_token/refresh_token` plaintext columns
  are never selected, read, or written by venue-domain code (HF-INTG-007-VENUE consumed;
  migration 20260921000000 nulls the legacy venue plaintext columns once applied).
- POST refresh fails closed with an intentional 400 when the vault holds no refresh grant
  (no legacy column fallback); disconnect clears the vault and toggles `is_connected` only.
- GET health semantics are vault-derived: disconnected / needs_reauth / connected from row
  connection state plus vault `accessToken` presence. Coverage: `__tests__/venue/venue-integrations-api.test.ts`
  (9 tests).

## Venue availability/reservations are a venue-scoped, service-role boundary — 2026-09-25 (VENUE-004 / VENUE-005)

- Canonical surfaces: `lib/venue/availability.ts` is the only file in `app/`, `lib/`, or
  `components/` that touches `venue_availability` or `venue_reservations` raw. It is
  `import "server-only"` and every helper is reached only after a
  `canManageVenue(..., "manage_bookings")` check. A tree-wide static scan asserts this
  (`__tests__/venue/venue-calendar-raw-read-boundary.test.ts`); add a venue table to that
  scan when a new raw read appears.
- `app/api/venue/availability` (GET/POST/PATCH/DELETE) and `app/api/venue/reservations`
  (GET) are the only app surfaces for these tables. PATCH and DELETE-by-id resolve the
  venue from the row's own `venue_id` before gating, so holding a foreign row id grants
  nothing. The service-role client is constructed only after the gate.
- The venue calendar hook `app/venue/hooks/use-venue-calendar-data.ts` no longer imports
  `@/lib/supabase/client` at all; `loadVenueCalendarLayers` fetches both layers through
  the two APIs and throws on any non-2xx so the calendar fails closed.
- RLS closure is authored but UNAPPLIED (CP-051): migration
  `20260924120000_venue_availability_reservations_scope_rls.sql` revokes table-level
  SELECT on both raw tables from `anon`/`public`/`authenticated`, keeps `service_role`
  SELECT, and replaces the two permissive `USING (true)` client read policies with
  `TO service_role` policies. The two venue-scoped `FOR ALL` write policies are
  deliberately untouched (see VENUE-D02). The sanitized `public_venue_availability`
  projection keeps its `anon`/`authenticated` grant and still resolves after the revoke
  because it is `security_barrier`, not `security_invoker` (VENUE-D01 / VENUE-D04 in
  `docs/engineering/agents/venue/DECISIONS.md`).
- Availability blocks are calendar days (`yyyy-MM-dd`). Booking requests carry instants;
  `toAvailabilityCalendarDay` maps an instant to its UTC day so block checks never depend
  on the host timezone. `isVenueEventDateBlocked` is the one-call receiving helper.
- Open cross-lane item: `app/api/booking-requests/route.ts`
  `validateVenueAvailability` still does not consult blocks, so org-side booking
  requests are not yet rejected against manager-created blocks. Handoff
  `docs/engineering/handoffs/pending/HF-VENUE-004-BOOKING-RECEIVING.json` carries the
  exact one-line change and current line references.
- Verification posture: `npm run check:migration-chain`, `check:db002-security-contract`,
  and a per-file migration-validation scan of the new migration/manifest are green;
  `check:migration-validation` and `check:migration-ledger` fail for reasons outside the
  venue lane (concurrent-lane baseline drift; DB-008-owned ledger snapshot). Hosted
  denial probes are DB-002/DB-008's to run; no hosted evidence is claimed.

## SEC-109 is green; the venue availability service-role import is classified, not refactored — 2026-09-25 (VENUE-004 / VENUE-005, Wave 34)

- `app/api/venue/availability/route.ts` and `app/api/venue/reservations/route.ts` keep
  their bare `createServiceRoleClient` import and are registered in
  `lib/supabase/service-role-legacy-imports.json` — the registry the SEC-109 check itself
  names in its failure message. `npm run check:service-role-allowlist` exits 0:
  `195 production files: 182 historical, 31 reviewed remediation debt, 1 low-level factories`.
- `executeServiceRoleJob` is a **worse** fit here, on three independent grounds (VENUE-D05 /
  CP-067): (1) it throws `org_not_found` unless a verified `organizations` row exists, and
  `venue_profiles` has no `organization_id` — the only org link is
  `settings.operational_org_id`, lazily *provisioned* by `ensureVenueOperationalContext`, so
  the refactor would 500 the availability editor for a venue that has not provisioned; its
  `target` block revalidates only eventId/tourId/saleId, so it could not re-assert venue
  scope even on success. (2) `SERVICE_ROLE_MODULES` has 33 ids and none covers venue
  availability or reservations; adding one means editing a security allowlist outside venue
  ownership. (3) The client role genuinely cannot do the work — migration `20260924120000`
  revokes client SELECT on both raw tables.
- Durable rule: **`executeServiceRoleJob` fits a call only when the caller can supply a
  real, existing `orgId`, an allowlisted module id, and an operation the org/RLS boundary
  can express.** A route scoped by a different key keeps its bare client and is registered.
- The flat `service-role-legacy-imports.json` array has **no** field for a disposition,
  owner, rationale, or review date. Those live in
  `lib/supabase/service-role-import-review.json`, which is outside the venue file grant and
  was carrying a concurrent marketplace lane's uncommitted edits. Owner `venue-operations`
  and the rationale are therefore recorded in VENUE-D05, and the registry move is routed in
  `HF-VENUE-SEC109-DISPOSITION-REGISTRY`. Remember that reviewed-debt entries are
  staleness-checked by the same script, so a future refactor must remove its entry in the
  same change.
- `check:migration-chain`, `check:migration-validation`, `check:migration-ledger`, and
  `check:db002-security-contract` all exit 0 as of this date. The two Wave 32 external
  failures were other lanes' files; this lane did not edit either.

## The DB-008 code-drift objects are archived, not stale types — venue share cleared 2026-09-25 (VENUE-005, Wave 34)

- The database lane proved by ordered CREATE/DROP/RENAME replay that these objects are
  absent from **both** the active chain and `lib/database.types.ts`. Regeneration can never
  satisfy them, and no migration may resurrect them.
- **Deleted for zero importers** (whole-tree import + symbol + `import()`/`require()` scan;
  only `docs/` mentions survive):
  - `lib/venue/staff-management.service.ts` — `venue_crew_members` (54 hits),
    `venue_team_contractors` (38), `get_staff_dashboard_stats` (12). A repoint was available
    (`organization_people` per `lib/admin/workforce-identity-map.ts`; `staff_members` per
    `20260823070000_staff_members_canonical_roster.sql`) but pointless for a class nothing
    calls.
  - `app/venue/components/chat-tab.tsx`, `app/venue/actions/chat-actions.ts`,
    `app/venue/types/chat.ts` — `event_team_messages`. `chat-tab.tsx` had 0 importers, so
    the subtree was unreachable. Repointing is *provably wrong*, not merely undesirable:
    `event_group_messages` (`20260413210000`) has only a `service_role` policy, so moving a
    **user-session** server action onto it converts a missing-relation error into an RLS
    denial while looking like a fix.
- **Repointed**: `app/venue/components/staff/shift-templates.tsx` now reads
  `venue_recurring_shifts` (`20260413200000_port_missing_tables.sql:158`, declared at
  `lib/database.types.ts:21442`) instead of the archived `venue_shift_templates`. Column
  mapping: `shift_title` replaces the archived name column; `department`, `start_time`,
  `end_time`, `staff_needed` unchanged. Measured 2 `tsc` errors before, 0 after. The
  inventory had recorded `canonicalReplacement: null` — **that field is a hypothesis**;
  re-derive it from the chain. `venue_recurring_templates` is the wrong destination (a
  booking recurrence, not a shift blueprint). The read stays on the browser session client,
  so `venue_recurring_shifts_owner` applies and a delegated team manager now sees zero rows
  instead of an error; widening that policy to venue RBAC is a DB-002 decision.
- **Handed off, not edited** (outside the grant): `lib/services/staff-management.service.ts`,
  `lib/services/staff-job-board.service.ts`, `lib/services/venue-scheduling.service.ts` →
  `HF-DB008-TYPECHECK-VENUE-SHARED-LIB-SURFACE`; `app/api/venues/[id]/route.ts`
  (`venue_profile_views`, `track_venue_profile_view`) →
  `HF-DB008-TYPECHECK-VENUE-PUBLIC-PROFILE-VIEWS`. 14 of the cluster's 135 hits remain
  outside the venue grant.
- **Standing path gap**: the venue `WORKING_SET.json` lists `app/venues/**` and
  `app/api/venue/**` but **not** `app/api/venues/**`, so the public venue profile route is
  unowned by path even though the charter names public profiles as venue work. Resolve
  before the next venue task needs that route.
- Locked by `__tests__/venue/venue-code-drift-cluster.test.ts` (29 tests). Its absence
  assertion is **DDL-shaped, not a substring**: `20260414223233` lists
  `event_team_messages` as a bare string inside a `to_regclass`-guarded lint array, so a
  substring check would have been vacuous. Negative control verified against a
  known-present routine.
- Durable rule (VENUE-D06 / CP-068): repoint if the chain has an object that can carry the
  call; otherwise delete if the consumer is not entry-reachable; otherwise hand off. Never
  author a migration to resurrect an archived object.
- Venue suite: **15 files / 131 tests** (was 14 / 102). `npm run typecheck` was **not** run
  (68m18s on CI, 1,384 errors across 197 files, OOMs on this 8GB box), so the cluster's
  contribution to the baseline is measured per-file, not against a re-run.

## The booking-request availability read-error posture is settled: fail OPEN and log — 2026-09-28 (VENUE-007, VENUE-D07)

- **Ratified:** a venue availability block *read error* at the booking-request boundary
  does not reject the request. The events lane's `EVENTS-002-D1` implementation is correct
  as written and stands unchanged (`app/api/booking-requests/route.ts:115-117` logs and
  proceeds). VENUE-007 decided this; it did not re-implement the boundary.
- **The venue lane's own fail-closed instruction is withdrawn.**
  `HF-VENUE-004-BOOKING-RECEIVING` `next_steps[1]` was the source of the divergence and is
  now annotated `DO NOT FOLLOW`, with the original text quoted for history and the ratified
  position stated in its place. The handoff no longer reads as a standing fail-closed order.
  Its stale line references were corrected at the same time — they still claimed
  `validateVenueAvailability` "does not consult venue_availability", which EVENTS-002 made
  false. Current bytes: `:86-160`, block check `:99-118`, capacity `:120-127`,
  approved-booking window `:137-157`, policy read `:327-332`, `readVenueBookingPolicies`
  `:70-84`, auto-approve `:365`, call site `:310-317`.
- **The reusable rule (this is the part future lanes need):** decide an availability check's
  read-error posture by asking **whether the check narrows or gates** — not by asking which
  posture the neighbouring checks happen to use. A *narrowing* check (block, approved-booking
  conflict) may fail open: its failure admits a request for human review and grants no
  access. A *permission gate* (`allow_bookings`, capacity) must fail closed: its failure
  silently inverts an operator's expressed intent. The block check is a narrowing filter.
- **All three checks at this boundary were measured, and all three fail open.** Capacity
  read `:120-126` destructures only `{ data: venue }` (a failed read → `capacity` 0 →
  `capacity > 0` false). Approved-booking read `:142-150` destructures only `{ count }`
  (a failed read → `count || 0` → 0). A **fourth** read fails open in the *permissive*
  direction and was not previously named by either lane: the venue policy read `:327-332`
  discards `error`, and `readVenueBookingPolicies` computes `allowBookings:
  s.allow_bookings !== false` at `:78`, so a transient read error sets `allowBookings` to
  **true** and inverts the venue's explicit "not accepting booking requests" switch
  (`:334-339`). Those two are permission gates and are routed as a fail-closed task.
- **Why the events lane's consistency argument is not a precedent:** two accidental
  violations are not a rule, the approved-booking count is *more* dangerous to fail open
  than the block check (it misses a conflict with an already-promised booking), and the
  policy read fails open on an explicit gate. Why its severity argument is weaker than
  stated: `booking_policies.auto_approve = "all"` sets `initialStatus = "approved"` at
  request time (`:365`) with no human in the loop, and the reservation conflict engine
  constrains `venue_reservations` (a *different* table, per
  `20260823140000_reservation_conflict_engine.sql:92-99`), is recorded as staged/not
  applied, and is 503-gated behind `isVenueBookingLifecycleEnabled()`.
- **The named debt (trigger R1):** this boundary is where the request is *formed*, not where
  the promise is *kept*, and `app/api/venue/booking-requests/route.ts:106-203` never consults
  `venue_availability` — it reads only `venue_booking_requests` and calls
  `transition_venue_booking_lifecycle`. So the request-time block check is currently the
  **only** place the canonical block contract is enforced anywhere in the product, and a
  block can still be silently overridden by an auto-approved request. Fail-open is ratified
  *because* of this gap, not in spite of it; closing it is routed and should be opened
  regardless of which posture holds.
- **Why fail-closed would be worse here specifically:** the block check runs *first* (`:99`,
  ahead of capacity), so its failure mode is a confident 409 — `The venue is not available
  on <date>` for a date the venue never blocked. The 409 vocabulary is a business-fact
  vocabulary with no way to say "we could not confirm", so a fail-closed rejection would
  misstate a fact to a paying artist and suppress the venue's own book, invisibly, with no
  retry affordance and no alert on the 409 path.
- **Five falsification-grade re-evaluation triggers** (R1 block check at the promise point;
  R2 a *measured* read error rate for this query, which does not exist and is not claimed;
  R3 a retryable non-409 error vocabulary; R4 auto-approve not universally reachable;
  R5 the permission-gate reads fixed first). Full argument, both blast radii, and all
  triggers: `docs/engineering/agents/venue/DECISIONS.md` VENUE-D07.
- **Coverage gap, recorded not hidden:** no test in `__tests__/venue/` asserts the ratified
  fail-open policy, because the test that pins it (EVENTS-002's
  `__tests__/events/booking-request-availability.test.ts`) is outside the venue grant. Venue
  suite green at 15 files / 131 tests; `npm run agents:validate -- --strict` 0 warnings /
  0 errors. No hosted evidence is claimed; no migration authored or applied (CP-051).
- **FIND-1 routed, not fixed:** the canonical block check uses the UTC calendar day
  (VENUE-D03) while the pre-existing approved-booking check uses `[start, start+1day)`, so
  an approved booking *earlier the same UTC day* is missed. The window semantics were not
  changed here — that decision is not covered by any acceptance criterion and needs its own
  task. Owner: events, venue consulted on the canonical day definition.
