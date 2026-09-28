# Venue decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## VENUE-D01 — Raw venue availability/reservations are service-role only; venue-scoped APIs are the read boundary

- Date: 2026-09-25
- Status: accepted
- Task: VENUE-005 (SIM-20260922-VENUE-001, SIM-20260922-DB-002)
- Decision: `public.venue_availability` and `public.venue_reservations` are no longer
  readable by any client role. Table-level `SELECT` is revoked from `anon`, `public`,
  and `authenticated`; the only surviving `SELECT` policy on each table is an explicit
  `TO service_role` policy. Venue operators read raw rows exclusively through
  `GET /api/venue/availability` and `GET /api/venue/reservations`, which authenticate,
  resolve the venue, require `canManageVenue(..., "manage_bookings")`, and only then
  construct a service-role client. The sanitized `public_venue_availability`
  projection stays the public surface. The venue write path is likewise reached only
  through `lib/venue/availability.ts` after a venue-scope gate — never by a direct
  client write.
- Evidence: `supabase/migrations/20260924120000_venue_availability_reservations_scope_rls.sql`;
  chain audit of `20250814123000_venue_core.sql:302` (`"Anyone can view venue
  availability"` `USING (true)`) and `20260823140000_reservation_conflict_engine.sql:81`
  (`venue_reservations_public_read` `USING (true)`, with `REVOKE` on
  `venue_availability` only from `anon`/`PUBLIC` at lines 287-288 and none at all on
  `venue_reservations`); `__tests__/venue/venue-calendar-raw-read-boundary.test.ts`
  (tree-wide scan now resolves exactly one raw-table reader, the server-only lib);
  `__tests__/venue/venue-availability-scope-migration.test.ts`.
- Consequences: RLS is treated as defense in depth, not as the authorization boundary —
  application-level venue-scope checks at the data edge are the real gate, and the
  migration only removes a leak the application code could already bypass. Both API
  routes must stay fail-closed: 401 unauthenticated, 400 unresolvable venue, 403 when
  `canManageVenue` denies, and 500 (never a partial/empty success) when the
  service-role read errors. Any future surface that needs these tables must go through
  the same gate.

## VENUE-D02 — The availability RLS closure revokes reads but deliberately leaves the write ACLs alone

- Date: 2026-09-25
- Status: accepted
- Task: VENUE-005
- Decision: The closure migration revokes only `SELECT`. It does not touch the insert/
  update/delete grants, does not drop `venue_reservations_operator` (`FOR ALL`,
  `venue_has_operator_access`) or `"Venue owners can manage their availability"`
  (`FOR ALL`), and does not disable RLS on either table. Revoking the write grants was
  considered and rejected: the booking and reservation engines reach these tables
  through `SECURITY DEFINER` functions and operator policies that this lane does not own,
  and an over-broad write revoke would break the pilot chain to close a read leak that
  is already closed.
- Evidence: `20260823140000_reservation_conflict_engine.sql:76-83` (operator + public
  read policies) and `:156-159` (`SECURITY DEFINER` reservation functions with
  `REVOKE ALL ... FROM PUBLIC` and `GRANT EXECUTE ... TO authenticated`); the
  contract test asserts both `FOR ALL` policies survive.
- Consequences: The raw read boundary is closed, but a future authenticated direct
  *write* to `venue_availability` remains theoretically possible through the owner
  policy. If VENUE-005 is ever reopened, closing the write path is a separate,
  database-owned change with its own migration and hosted evidence — not an
  amendment to this one.

## VENUE-D03 — Booking-event timestamps map to the UTC availability calendar day

- Date: 2026-09-25
- Status: accepted
- Task: VENUE-004 (receiving helper for SIM-20260922-VENUE-002)
- Decision: `venue_availability.date` is a calendar day, but booking requests carry an
  instant. `toAvailabilityCalendarDay` derives the day from the UTC date of the parsed
  instant, never the server's local day, so the answer does not depend on the deployment
  host's timezone. This matches the existing booking lane, which already parses the same
  `event_date` into an instant and compares `toISOString()` bounds. An unparseable event
  date returns `blocked = false` (fail open on malformed input) and issues no query.
- Evidence: `app/api/booking-requests/route.ts:105-124` (existing `new
  Date(input.eventDate)` / `toISOString()` comparison); `__tests__/venue/venue-availability-lib.test.ts`
  cases for late-evening instants, unparseable values, and the no-query path.
- Consequences: A venue's "block the 15th" is evaluated against the UTC day. If venue
  operators in far-west or far-east timezones report off-by-one conflicts, the fix is a
  venue-timezone column on the read path, not a change here — `venue_availability` has
  no timezone today and adding one is a database-owned migration.

## VENUE-D04 — The hosted contract test refuses to report a pass it could not actually prove

- Date: 2026-09-25
- Status: accepted
- Task: VENUE-005
- Decision: `supabase/tests/venue005_availability_reservations_scope_contract.sql` gained
  executable runtime denial probes: for each raw table and for `anon` and `authenticated`,
  it switches role and requires the read to raise `insufficient_privilege`. A successful
  read raises a contract violation; any other error raises a distinct "probe
  inconclusive" failure. A `pg_has_role` precondition refuses to start unless the runner
  is a `MEMBER` of both client roles, with an explicit "do not report this as a pass"
  message. The manifest's three environment evidence slots are asserted `null` by the fast
  tier so no hosted artifact can be filled without an apply.
- Evidence: `supabase/tests/venue005_availability_reservations_scope_contract.sql`;
  `__tests__/venue/venue-availability-scope-migration.test.ts` (probe presence, precondition
  presence, manifest digest match, evidence slots null).
- Consequences: A migration-validation or CI lane cannot accidentally record a green
  denial probe it never ran. On Supabase the runner must be `authenticator` or a
  superuser, because `postgres` is not a member of `anon`/`authenticated`; the error
  message says so. DB-002/DB-008 own that hosted run.

## VENUE-D05 — The venue availability/reservations service-role client is registered as classified debt, not refactored onto `executeServiceRoleJob`

- Date: 2026-09-25
- Status: accepted
- Task: VENUE-004, VENUE-005 (Wave 34)
- Decision: `app/api/venue/availability/route.ts` and `app/api/venue/reservations/route.ts`
  keep their bare `createServiceRoleClient` import and are registered in
  `lib/supabase/service-role-legacy-imports.json` — the registry the SEC-109 check
  itself names in its failure message. `executeServiceRoleJob` is rejected as a fit for
  this boundary, for three independent reasons, any one of which is disqualifying.
- Evidence:
  1. **The scope key does not match.** `executeServiceRoleJob` requires a verified
     `orgId` that must resolve in `organizations`, and throws `org_not_found` otherwise
     (`lib/supabase/service-role-job.ts:55-62`). The venue availability boundary is keyed
     on `venue_profiles.id`. `venue_profiles` has no `organization_id` column; the only org
     link is the optional `settings.operational_org_id` that
     `ensureVenueOperationalContext` (`lib/venue/venue-access.ts:347-395`) lazily
     *provisions* on first call. A venue account that has never run that provisioning has
     no orgId, so the refactor would 500 the entire availability editor for a legitimate
     venue owner. Its `target` block can only revalidate `eventId`/`tourId`/`saleId` — there
     is no venue target, so the org revalidation would not re-assert venue scope either.
  2. **No allowlisted module exists.** `SERVICE_ROLE_MODULES`
     (`lib/supabase/service-role-allowlist.ts:6-40`) has 33 ids and none is a venue
     availability or reservation surface. Adding one means editing a security allowlist
     file that is outside venue ownership, and the check would still fail on
     `module_not_allowed` until it did.
  3. **The client role cannot do this work.** After VENUE-005's authored migration
     `20260924120000`, raw `venue_availability`/`venue_reservations` SELECT is revoked from
     `anon`/`public`/`authenticated` and retained only for `service_role`. The import is
     load-bearing, not incidental; a privileged client is required, not avoidable.
- Re-verify of the Wave 32 gating claim (must still hold in the current bytes, and it
  does): every method in both routes calls `authenticateApiRequest` first, then resolves a
  venue (query param, request body, or `getCurrentVenueContext`), then
  `canManageVenue(auth.supabase, user.id, venueId, "manage_bookings")`, and only then
  constructs the client. PATCH and DELETE-by-id resolve scope from the row's own
  `venue_id`, so holding a foreign row id grants nothing. `__tests__/venue/venue-availability-api.test.ts`
  asserts `expect(mockedServiceClient).not.toHaveBeenCalled()` on the 401 and 403 paths
  and `expect(mockedUpsert|UpdateById|ClearByDate).not.toHaveBeenCalled()` on the denial
  paths; 16 availability + 10 reservations gate tests pass.
- Consequences: SEC-109 exits 0 across the whole tree
  (`✓ service-role imports classified (195 production files: 182 historical, 31 reviewed
  remediation debt, 1 low-level factories)`), which also satisfies CP-062's rule that debt
  is never deleted to satisfy the gate — the import stays visible and classified. The
  entries carry no disposition, owner, rationale, or review date, because
  `service-role-legacy-imports.json` is a flat path array with no field for them; those
  live in `lib/supabase/service-role-import-review.json`, which is **not** in the venue
  file grant and is currently carrying a concurrent marketplace lane's uncommitted edits.
  Owner, rationale (`venue-operations`; the boundary is venue-scoped and RLS-enforced
  service-role-only, so it is not expressible as an org job or as a user-RLS read), and
  review date are recorded here and in the VENUE-005 task record instead, and the registry
  move is routed to the SEC owner in `HF-VENUE-SEC109-DISPOSITION-REGISTRY`. If a future
  wave decides this boundary should be an org job, the prerequisite is an
  `operational_org_id` that every venue provably has — a database-owned decision, not an
  app refactor.

## VENUE-D06 — An archived object with a canonical replacement is repointed; one with neither is deleted when nothing calls it

- Date: 2026-09-25
- Status: accepted
- Task: VENUE-005 (Wave 34, DB-008 code-drift cluster "venue")
- Decision: For each of the seven objects in the DB-008 `venue` cluster, the disposition is
  chosen by three questions in order: (1) does the active chain create a canonical object
  whose columns can carry this call? repoint. (2) is there no such object? then is the
  consumer entry-reachable? if not, delete. (3) if it is reachable and there is no
  canonical object, hand off — do not resurrect the object with a migration. A name match
  in the inventory's `tscFiles` list is not a consumer; the reference is re-derived from
  the current bytes, because CP-066 recorded that inventory list as a hypothesis.
- Evidence per object:
  - `venue_crew_members` (54 hits), `venue_team_contractors` (38), `get_staff_dashboard_stats`
    (12) — **deleted** with `lib/venue/staff-management.service.ts`. Repointing was
    available (`organization_people` per `lib/admin/workforce-identity-map.ts`,
    `duplicateRisk: high`; `staff_members` per `20260823070000_staff_members_canonical_roster.sql`
    with VEN-103 marking `venue_team_members` LEGACY) but pointless: the class had **zero
    importers**, proven by a whole-tree `rg` for the `@/` and relative specifiers, for the
    exported symbols, and for `import()`/`require()`. The only surviving mentions are in
    `docs/`. A repointed dead class still ships 104 diagnostics' worth of drift and would
    have to be kept correct forever.
  - `event_team_messages` (10 hits) — **deleted** with `app/venue/components/chat-tab.tsx`,
    `app/venue/actions/chat-actions.ts`, `app/venue/types/chat.ts`. Repointing is provably
    wrong, not merely undesirable: the only chain-created event chat message table is
    `event_group_messages` (`20260413210000_event_communications_system.sql:49`), and its
    sole policy is `"Service role full access on event_group_messages"` — no client-role
    policy at all. The deleted surface read and wrote it through a **user session** server
    action (`createClient()` from `@/lib/supabase/server`), so repointing would have
    converted a missing-relation error into an RLS denial while looking like a fix. The
    subtree was also dead: `chat-tab.tsx` had zero importers, so the only importer of
    `chat-actions.ts` was itself unreachable.
  - `venue_shift_templates` (7 hits) — **repointed** in
    `app/venue/components/staff/shift-templates.tsx` to `venue_recurring_shifts`. The
    inventory recorded `canonicalReplacement: null`, but the chain does have one:
    `20260413200000_port_missing_tables.sql:158` creates `venue_recurring_shifts` and
    `lib/database.types.ts:21442` declares it with a column superset of the archived table
    — the archived template-name column becomes `shift_title`; `department`, `start_time`,
    `end_time` and `staff_needed` carry over unchanged. The repo's own
    `VenueSchedulingService` already targets `venue_recurring_shifts` in the adjacent
    `createRecurringShift` method, so this is the surface the scheduling service was
    already heading toward. `venue_recurring_templates` was rejected: it is a *booking*
    recurrence (genre, weekday, capacity, `venue_booking_slots`), not a shift blueprint.
    Measured: 2 `tsc` errors (TS2589 + TS2769) on the HEAD bytes, 0 after.
  - `venue_profile_views` (10) and `track_venue_profile_view` (4) — **handed off**, not
    edited. Their only real consumer is `app/api/venues/[id]/route.ts`, which the Wave 34
    venue file grant withholds (and which the venue `WORKING_SET.json` does not list
    either — it has `app/venues/**` and `app/api/venue/**`, singular only). Both call sites
    are already fail-soft, so this is a type-surface defect, not a live data or security
    defect. `HF-DB008-TYPECHECK-VENUE-PUBLIC-PROFILE-VIEWS` carries the exact lines and the
    dispose-or-repoint decision.
  - `lib/services/staff-management.service.ts`, `lib/services/staff-job-board.service.ts`,
    `lib/services/venue-scheduling.service.ts` — **handed off** to the `lib/services/**`
    owner. `HF-DB008-TYPECHECK-VENUE-SHARED-LIB-SURFACE` carries the re-derived zero-importer
    evidence and the column mapping so they are not re-derived.
- Consequences: `__tests__/venue/venue-code-drift-cluster.test.ts` (29 tests) machine-locks
  all of it. It asserts each object is never **created** by an active migration using a
  DDL-shaped regex rather than a substring — a bare `includes` would be satisfied by
  `20260414223233_rls_lint_0008_service_role_and_rbac_reads.sql:100`, which lists
  `event_team_messages` in a "all other linted tables" array under a `to_regclass` guard and
  creates nothing. It also asserts no archived venue object has a reader, writer, or rpc
  call left under `app/venue`, `app/api/venue`, or `lib/venue`. Negative control verified:
  a known-present routine (`refresh_forum_mviews`) matches the same declaration pattern, so
  the "absent from the generated contract" assertions are not vacuous. The repointed
  component keeps its browser session client, so `venue_recurring_shifts_owner`
  (`venue_profiles.user_id = auth.uid()`) still applies and a delegated team manager now
  sees zero rows instead of an error — strictly better, and widening that policy to venue
  RBAC is a DB-002 decision, not an app-code one.

## VENUE-D07 — A block read error fails OPEN at the booking-request boundary; a narrowing check and a permission gate are different kinds of check and do not share one posture

- Date: 2026-09-28
- Status: accepted
- Task: VENUE-007 (ratifying EVENTS-002-D1; overruling the fail-closed instruction in HF-VENUE-004-BOOKING-RECEIVING)
- Decision owner: venue, as contract owner of `isVenueEventDateBlocked`
- Decision:
  1. **RATIFIED — fail OPEN and log.** A venue availability block *read error* at the
     booking-request boundary does not reject the request. The events lane's
     `EVENTS-002-D1` implementation is correct as written and **stands unchanged**:
     `app/api/booking-requests/route.ts:115-117` logs via `console.error` and proceeds.
     This task ratifies it; it does not re-implement it.
  2. **OVERRULED — the standing fail-closed order.**
     `HF-VENUE-004-BOOKING-RECEIVING` `next_steps[1]` ("treat a truthy `error` from the
     helper as fail-closed") is **withdrawn as a general order** for this boundary. It
     was a correct statement of the venue lane's instinct and a wrong instruction for
     this surface. The handoff is annotated, so the next lane sees one position.
  3. **The dividing line, which is the reusable part of this decision:** at this
     boundary a check that can only *narrow* what is admitted (block, approved-booking
     conflict) and a check that is a **permission gate** (`allow_bookings`, capacity)
     are different classes and get **different** postures. A narrowing check may fail
     open: its failure admits a request for human review and grants no access. A
     permission gate must fail closed: its failure silently inverts an operator's
     expressed intent. The block check is a narrowing filter.
  4. **The debt this creates is named, not waved at:** fail-open here is acceptable
     *because the request is not the promise*. There is currently no machine check at
     the promise point. See the re-evaluation triggers.
- Evidence (line references are current bytes at base SHA
  `16fb834f1a03a70f165be470a5f98f389bf6100a`; every read below was measured, not
  inferred from a task title):
  1. **The events lane's decisive factual claim is CORRECT and is not disputed here.**
     All three checks in `validateVenueAvailability` fail open on a read error: the
     block check (`route.ts:99-118`) proceeds and logs; the capacity read (`:120-126`)
     destructures only `{ data: venue }` and discards `error`, so a failed read yields
     `venue === null`, `capacity` computes to `0`, and `capacity > 0` (`:127`) is false
     — no rejection; the approved-booking read (`:142-150`) destructures only
     `{ count }`, so a failed read yields `count === null` and `count || 0` is `0` — no
     rejection. The lane is right that flipping only the new check closed would reject
     requests the other two would have allowed.
  2. **A FOURTH fail-open read, in the permissive direction, that the events lane did
     not name — and it is worse than either read it did name.** The venue *policy* read
     at `route.ts:327-332` also destructures only `{ data: venueRow }`, and
     `readVenueBookingPolicies` computes `allowBookings: s.allow_bookings !== false`
     (`:78`). On a read error `venueRow` is `null`, so `allowBookings` becomes
     **`true`**: a transient read error silently inverts the venue's explicit "I am not
     accepting booking requests" switch (`:334-339`) and admits a request the operator
     refused. That is a permission gate failing open toward permissive.
  3. **Therefore the "consistency" argument is answered, not accepted as a precedent.**
     Two accidental violations are not a rule, and the neighbours are not equivalent to
     the check being decided: the approved-booking count is *more* dangerous to fail
     open than the block check (it misses a conflict with an already-promised booking),
     and the policy read fails open on an explicit gate. The inconsistency is the defect
     to fix; the fix is to classify the checks (Decision point 3), not to freeze the
     worst behaviour in place.
  4. **The events lane's severity argument is weaker than stated, in two measurable
     places.** (a) "The venue manager still reviews and approves it" is **false** for a
     venue with `booking_policies.auto_approve = "all"`: `route.ts:365` sets
     `initialStatus = "approved"` at request time with no human in the loop, so there the
     fail-open residual is not "a request the venue can decline" but a block silently
     overridden. (b) "VENUE-005's reservation conflict engine is the actual double-booking
     guard" does not hold on this path: that engine constrains `venue_reservations` via
     `EXCLUDE USING gist` over `reserved_range`
     (`20260823140000_reservation_conflict_engine.sql:92-99`) — a **different table**
     from `venue_availability` — this lane's own state records those RPCs as
     staged/not applied, and `app/api/venue/booking-requests/route.ts:118-128` gates its
     lifecycle transition behind `isVenueBookingLifecycleEnabled()` with a 503 "until
     its database checks pass". Neither mitigation is live on this boundary today.
  5. **Measured: there is no second machine check between the request and the promise.**
     The venue-side approval path `app/api/venue/booking-requests/route.ts:106-203` reads
     only `venue_booking_requests` and calls `transition_venue_booking_lifecycle`
     (`:159-166`). It never consults `venue_availability`. The request-time block check is
     therefore currently the *only* place the canonical block contract is enforced
     anywhere in the product.
  6. **The fail-closed principle is granted; its application here is refused, for one
     reason.** The venue lane accepts all three propositions: a block is a promise to the
     artist; a check that disappears on a read error is not a check; and "we could not
     read the calendar" is materially different from "the date is open." What it does not
     accept is the conclusion, because **this boundary is where the request is formed,
     not where the promise is kept.** The promise is kept when a request becomes an
     approved booking, on a different surface (evidence 5), which today checks nothing.
     Failing closed at request time would leave that gap exactly as wide while charging
     the whole price to artists.
  7. **One placement fact settles the residue.** The block check runs *first*
     (`route.ts:99`), ahead of the capacity read, so a blocked date cannot be shadowed by
     a capacity rejection. That same ordering makes the fail-closed failure mode a
     *confident false business fact*: the artist receives 409 `The venue is not available
     on 2026-10-15` for a date the venue never blocked. The 409 vocabulary is a
     business-fact vocabulary and has no way to say "we could not confirm." A posture that
     must misstate a fact in its own response to be enforced is the wrong posture for a
     check that can be enforced later, cheaply, and truthfully.
- Blast radius — the cost of each posture, named (AC-3):
  - **Fail CLOSED at this boundary.** One transient `venue_availability` read error denies
    **100% of venue-targeted booking requests** for the duration: every venue, every date,
    no discrimination, because this is the highest-fan-out read in the function and it runs
    first. The denial is **revenue-visible and misattributed** — the artist is told a
    specific date is unavailable at a named venue, which is false and suppresses the
    venue's own book; artists re-date or abandon and the venue never learns a sale was
    lost to an infrastructure error. It is **invisible in the response**: a 409 is
    indistinguishable from a genuine conflict, so no client can detect it, no retry
    affordance exists, and nothing alerts on the 409 path. It is **not self-healing for
    the artist** — a retry on the same date returns a different answer, so the same input
    yields contradictory facts and the artist's model of the venue's calendar is corrupted,
    not merely delayed. It cannot be scoped down: a second `venueId` does not help while
    the read is failing. What it buys is an advisory pre-filter turned into a guarantee —
    and the guarantee is held *by an outage* and released by recovery, which is backwards.
  - **Fail OPEN at this boundary.** A manager's block can be ignored for the duration of
    the read failure, and the resulting request carries **no signal** to the venue that the
    date was blocked — the request's own record asserts the date is open. The harm is
    **concentrated in the auto-approve case** (evidence 4a), where fail-open is not a
    request the venue can decline but a block silently overridden. It is **recoverable and
    attributable**: the error is logged (`:116`), the request lands in a human queue, the
    venue can decline it, and the artist's request is not lost. It is **not
    security-relevant**: the check is service-role scoped to `input.venueId` and is not an
    authorization gate, so failing open admits a request for review and grants no access —
    the opposite of VENUE-D01, where a fail-closed rule was required precisely because that
    surface *is* the authorization gate. What it buys is that the boundary never asserts
    "the date is open" on the artist's behalf when the system does not know.
  - **The asymmetry that decides it:** the fail-closed failure mode is invisible to *both*
    parties and attributes an infrastructure fault to a business fact; the fail-open failure
    mode is visible to the operator, logged, and correctable by the human already in the
    loop. Neither cost is neutral. The failure mode invisible to every party is the one to
    avoid at a boundary whose check is advisory.
- Re-evaluation triggers — fail-closed becomes correct, and this decision must be
  re-opened, if ANY of these becomes true (AC-4). A decision with a trigger, not a
  permanent preference:
  - **R1 — a block check exists at the promise point.** If the venue-side approval path
    (`app/api/venue/booking-requests/route.ts` PATCH and/or the
    `transition_venue_booking_lifecycle` RPC) consults `isVenueEventDateBlocked`, or the
    reservation engine is applied and writes a `venue_reservations` row for a confirmed
    booking, then the request-time check is a pure UX pre-filter and fail-open here is
    unconditionally correct. **This is the near-term trigger and the debt this decision
    creates; it should be opened regardless of which posture holds.**
  - **R2 — the read is characterised, not assumed.** What would have to be true about read
    reliability: this specific query (`venue_availability .eq(venue_id).eq(date).
    .eq(is_available,false).maybeSingle()`, `lib/venue/availability.ts:129-135`) must have
    a **measured** error rate on a hosted environment, and the expected number of
    falsely-denied artist requests per unit time must be lower than the expected number of
    block overrides per unit time. No such measurement exists in this repository and no
    hosted evidence is claimed, so this trigger cannot be evaluated today.
  - **R3 — the response can carry the truth.** Fail-closed is only defensible if the
    rejection does not assert a false business fact. A flipped posture must return a
    **retryable** infrastructure error (e.g. 503 with a `RETRY` code) saying the date could
    not be confirmed, and must **not** reuse the 409 "venue is not available on &lt;date&gt;"
    vocabulary. If that 409 vocabulary is the only one available, fail-closed is not a
    posture, it is a lie with a status code.
  - **R4 — the human-review mitigation is universal.** Fail-open is justified partly by
    "the venue still reviews it." That is false for `auto_approve = "all"` (`:365`). If
    auto-approve is reachable in production, or any other path can move a request to
    `approved` without a human, the mitigation is void and the weight shifts to R1/R3
    immediately.
  - **R5 — the permission-gate reads are fixed first.** The `allow_bookings` and capacity
    reads fail open in the permissive direction today (evidence 1-2). Until they are
    fail-closed the boundary is not coherent enough for a stricter advisory posture to buy
    anything, and a strict advisory check sitting behind an open permission gate is the
    worst of both worlds.
- Consequences:
  - `app/api/booking-requests/route.ts` is **unchanged by this decision**. The events
    lane's implementation is the reference implementation of the ratified posture.
  - `HF-VENUE-004-BOOKING-RECEIVING` is annotated with the ratified posture; its
    fail-closed instruction no longer reads as a standing order.
  - **Two findings routed, not fixed here.** Both alter behaviour no acceptance criterion
    covers, and the window/gate semantics were deliberately not changed inside a decision
    task:
    1. **FIND-1 (raised by EVENTS-002):** the canonical block check uses the UTC calendar
       day (`toAvailabilityCalendarDay`, VENUE-D03) while the pre-existing approved-booking
       check uses `[start, start+1day)` (`route.ts:137-150`), so an approved booking
       **earlier the same UTC day** is missed. A real correctness gap. The decision it
       needs is whether booking-request conflict detection is a calendar-day question or an
       interval question. Owner: events, with venue consulted because the venue lane owns
       the canonical day definition. Candidate for the orchestrator to open; not created
       here, because a new venue task record is outside this task's `working_set` grant
       and would collide on the venue `verification` WIP slot.
    2. **Raised by this decision:** the `allow_bookings` and capacity reads fail open in
       the permissive direction (evidence 1-2). Under the narrowing-filter /
       permission-gate rule established above, **these** must fail closed. This is a
       fail-closed task, and it is the *opposite* task from the one the original handoff
       asked for — which is the point of ratifying a posture instead of leaving it
       ambiguous.
  - Durable rule for future lanes at any availability-consulting boundary: **decide the
    posture by asking whether the check narrows or gates, not by asking which posture the
    neighbouring checks happen to use.**
