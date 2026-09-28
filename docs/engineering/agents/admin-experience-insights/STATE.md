# Admin Experience and Insights state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `ADMVIEW-EXP-001` — blocked/queued_postlaunch; MAINTENANCE-DEBT
<!-- generated-agent-state:end -->

- Last reviewed SHA: `16fb834f1a03a70f165be470a5f98f389bf6100a`
- Last reviewed at: 2026-09-28
- Confidence: high for the Admin route-auth and registry-classification mechanics; they were read from source, re-measured from live derived sets, and re-confirmed by running the gates and three negative controls, not inferred. The `legacyRoutes` 51 / `legacyGuardDrift` 5 / `capabilityGapMethods` 32 figures are ADMIN-022's own measured output, not inherited from a prior session's notes.

## Durable facts

- Reports to `admin`; `admin` is the decision owner for child tasks.
- Mission: Own the Admin-facing integration for the Admin shell, navigation, search, dashboard home, communications, notifications, content and network monitoring, analytics, reporting, exports, accessibility, and responsive integration.
- Ownership is limited to the Admin-facing integration layer described by `WORKING_SET.json` and the central segment map.
- Canonical domain services, schema, RLS, shared design-system primitives, QA certification, and release operations remain with their existing top-level owners.

## Domain knowledge

### The admin capability catalog has no read capability for communications

`ADMIN_CAPABILITIES` in `lib/auth/admin-capabilities.ts` carries only `communications.send` and
`communications.broadcast`. There is no `communications.view`. Any admin read of communications is
therefore gated on the same authority as sending, and "who may read team communications" is not an
expressible product decision today without a catalog change. The role-bundle consequences are
concrete and were measured on the `communications` bundles in `ROLE_DEFAULT_CAPABILITIES`:
`finance`/`finance_manager` carry `logistics.view` but not `communications.send`, and
`ticketing`/`ticketing_manager` carry `communications.send` but not `logistics.view`, so moving a
communications read between `logistics.view` and `communications.send` silently transfers that read
between those two audiences. `viewer` loses a communications read under either. Every other bundle
carries both capabilities and is unaffected. A catalog change means editing the capability list and
every role bundle in the same commit; it is an RBAC product decision owned by `admin`, not something
a route lane should invent.

### The route registry proof is a segment-ownership boundary, not just a set of numbers

**UPDATE (ADMIN-022 completed under DOMAIN-040): the boundary is real but it was granted, not assumed.**
The mechanics below are unchanged and still load-bearing. What changed is the resolution: a
reclassification lane that must move a pinned figure can be granted the proof harness as a temporary
single-task `shared:` override plus an explicit `shared_working_set` lease. The grant is a
parent-level edit to `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml`, it is not self-issuing,
and it comes with a revert obligation. So the operational rule is now: **if a route task's
classification change moves a pinned figure, write the change and the figures together and route the
ownership question upward as a blocking call — do not split them and do not land an intentionally red
state.** The proof that this is tractable is that the whole six-edit change can be specified with its
observed results before the lease exists, so the grant is cheap to evaluate.

Two mechanics worth knowing before writing that change:

- `legacyRouteLimit` in `scripts/ci/admin-route-registry-baseline.json` is a **monotonic ceiling**
  (`legacyCount > legacyLimit` in `scripts/ci/check-admin-route-registry.mjs:305-312`), not an exact
  pin. Lowering it after a real debt payment is correct, but the exact figure is pinned by the proof
  test, not by the ceiling. Confirmed empirically and worth remembering because it is not obvious: with
  the ceiling deliberately lowered to 50 against a true 51, the proof test still passed 10/10, because
  the harness never reads the ceiling at all. Only the checker does. That is precisely why "re-verified
  exactly" is the proof test's job, and why a ceiling edit is legitimate when the true count was
  independently measured first and illegitimate when it is used to make a failure disappear.
- Reclassifying a route out of `legacy_pending_migration` does not only move `legacyRoutes` and
  `legacyGuardDrift`. Any method whose source class is weaker than the new route class has to be
  recorded in `authClassByMethod`, which **adds** it to `adminCapabilityGapMethods` — that function
  returns false for every legacy route and otherwise counts every method named in `authClassByMethod`
  (`lib/admin/api-route-registry.ts:337-345`). So the count moves in both directions and the full set
  is: `legacyRoutes` down, `legacyGuardDrift` down by the drifted method count, `capabilityGapMethods`
  **up** by the weaker-method count. Measure all three before editing a baseline. A rising figure is
  usually the honest outcome; suppressing it hides the debt that is still open.

### A reclassification that relabels debt must name the debt in the same change

The most transferable lesson from ADMIN-022, and it generalises past this registry. Moving a route
from `legacy_pending_migration` to `capability_gated` because its methods really are capability gated
is a truthful relabel — but it stops the route being *called* a pending migration, and the weaker
method it still owes has to be named explicitly, in the registry and in the harness, or the change
converts a visible pending item into an invisible one. ADMIN-022 named `PATCH: 'read_only_compat'` and
`POST: 'read_only_compat'` in `authClassByMethod` and moved the named divergence pin to assert exactly
that, **strengthening** it at the same time: the old pin used `expect.arrayContaining` over 6 of 9
drift methods, which tolerated three unnamed members, and the new one uses an exact `toEqual` over all
5 survivors. When you re-point a pin because a claim became true, ask whether the assertion got weaker,
and record the answer.

Corollary: a reclassification task will usually falsify an assertion in its own evidence file. That
file is in the working set and the fix is yours, not a handoff — but fix it by *adding* the
newly-visible debt, not by deleting the assertion that caught it.

### `legacy_pending_migration` was the honest label while a write was uncapability-gated; check the label before repeating the finding

ADMIN-022's earlier finding was that `PATCH /api/admin/communications` did a service-role update on
`team_communications` keyed only on a caller-supplied message id, with no organization predicate.
**ADMIN-027 fixed that** and the finding is no longer true: PATCH now resolves a verified acting
organization and every `team_communications` query carries the org predicate. Two durable lessons:

- A recorded finding is a snapshot, not a property. Re-verify the *code* before repeating a finding,
  especially when a sibling task in the same chain may have landed between sessions. The way to notice
  is to hash the file your record names: ADMIN-022's route hash did not match its own record on
  arrival, which is what surfaced the drift, and it did so in seconds rather than through a failing
  test.
- ADMIN-027's PATCH change was **classification-neutral**, confirmed by measurement, which is the
  prediction in the section below working as a real tool and not a hunch. If you inherit a reclassification
  task, check whether a sibling lane has changed the route's imports and handlers since the figures
  were measured; `withAdminAuth` returning early in `guardClassFor` is what made it free.

### `withAdminAuth` gives a handler no admin context, so a legacy route cannot read an org

The auth wrapper taxonomy in `lib/auth/api-auth.ts` decides whether an organization is even
available inside a handler. `withAuth` and `withAdminAuth` pass only `{ user, supabase }`.
`withAdminCapability` and `withOrgCommand` additionally pass `admin: ActingAdminContext`, which is
the only thing carrying `orgId`. So a route still on `withAdminAuth` has no organization to scope
with, no matter how carefully the handler is written. A legacy route that must be tenant-scoped has
exactly two options: migrate it to `withAdminCapability` (which moves pinned registry figures, see
below) or call `resolveActingAdminContext(request, auth)` itself and pass the resulting
`NextResponse` through on failure. ADMIN-027 took the second route for
`PATCH /api/admin/communications`, and it fails closed at 409/403 rather than falling back to an
unscoped write.

### `withAdminAuth` gives a handler no admin context, so a legacy route cannot read an org

The auth wrapper taxonomy in `lib/auth/api-auth.ts` decides whether an organization is even
available inside a handler. `withAuth` and `withAdminAuth` pass only `{ user, supabase }`.
`withAdminCapability` and `withOrgCommand` additionally pass `admin: ActingAdminContext`, which is
the only thing carrying `orgId`. So a route still on `withAdminAuth` has no organization to scope
with, no matter how carefully the handler is written. A legacy route that must be tenant-scoped has
exactly two options: migrate it to `withAdminCapability` (which moves pinned registry figures, see
below) or call `resolveActingAdminContext(request, auth)` itself and pass the resulting
`NextResponse` through on failure. ADMIN-027 took the second route for
`PATCH /api/admin/communications`, and it fails closed at 409/403 rather than falling back to an
unscoped write.

### Adding a capability check to a legacy method is a registry-costly change, not free hardening

This is the non-obvious constraint behind leaving `PATCH` uncapability-gated in ADMIN-027, and it
is worth knowing before planning any such change. In
`__tests__/admin/support/admin-route-guard-proof.ts`, `guardClassFor` promotes a handler to
`capability_gated` when it sees `withAdminCapability`, `withOrgCommand`, **or any call to
`hasAdminCapability` / `requireAdminCapability`** (the `CAPABILITY_PRIMITIVES` list). It returns
`read_only_compat` at the `withAdminAuth` branch, which is checked *before* the `AUTH_PRIMITIVES`
branch containing `resolveActingAdminContext`. Two consequences:

- Calling `resolveActingAdminContext` inside a `withAdminAuth` handler is classification-neutral. It
  buys the verified acting organization at zero registry cost.
- Calling `requireAdminCapability`/`hasAdminCapability` in the same body is **not** neutral. The
  method becomes `capability_gated` in the analyzer, and because a `legacy_pending_migration` route
  with no entry for that method in `authClassByMethod` then fails
  `proveAdminRouteEntry` with "legacy_pending_migration but the source already enforces
  capability_gated", while `legacyRoutes`, `legacyGuardDrift` and `capabilityGapMethods` all move.

So a capability gate on a legacy method is a coordinated registry change, not a one-line
hardening. Two of the three figures live in `__tests__/admin/admin-registry-guard-proof.test.ts`.
The org predicate is free; the capability gate is not. `PATCH /api/admin/communications` still has no
capability gate for exactly this reason, and neither does `POST /api/admin/notifications`. ADMIN-022
is now **completed**, so the ownership question that was blocking this is settled in principle:
DOMAIN-040 shows the proof harness can be granted as a temporary single-task lease. That does not
open the gate itself — whoever adds it still has to land the gate and all three figures in one
change, and the figures to expect are `capabilityGapMethods` **falling** from 32 as the named gap
methods become gated, with `legacyRoutes` and `legacyGuardDrift` unmoved because both routes are no
longer legacy. The measured current values are 51 / 5 / 32.

### `resolveAuthorizedOrgLogisticsScope` is sufficient to tenant-scope an admin write

Good news for any other legacy admin route in this segment that writes without an organization
predicate: `lib/admin/resolve-authorized-org.ts` (admin-governance owned) already expresses what
such a handler needs, so the fix never requires a lease on that file. It returns a **verified**
`orgId` plus the service client, re-checks membership and ownership, throws
`AdminActingContextRequiredError` (409) / `AdminOrganizationAccessDeniedError` (403), and exports
`authorizedOrgScopeErrorResponse` so a route can surface those real statuses instead of collapsing
them into a 500. It also takes `allowedTourIds`, already verified by the acting-context layer for
tour collaborators — pass it, or a legitimate collaborator with no active membership in the acting
organization gets denied. Use the resolver's returned `scope.orgId`, not the requested value. The
service client is unavoidable on this path (it is how membership is verified at all); what matters
is that the handler does not construct its own and that every query carries the org predicate.

### A gate double must delegate to the real gate, and a security test must assert state first

Two harness lessons from ADMIN-027, both of which cost a real defect before being fixed.

`withAdminAuth` cannot be exercised through the real `withAuth` in a unit test — the internal
`authenticateApiRequest` call is a module-internal binding, so overriding the mocked export does not
change it. Mock the wrapper, but delegate the *decision* to the real function it wraps:
`userHasAdminSurfaceAccess` from `lib/auth/admin.ts` is reachable and is exactly what production
`withAdminAuth` → `checkAdminPermissions` calls. My first double compared the probe's result
against a state flag with an inverted condition, so the gate never denied and the test was silently
reading a 403 produced by the acting-context layer instead — a passing test that asserted nothing
about the gate. Assert that the gate *ran* (e.g. its probe table order) so it cannot be skipped.

In a cross-tenant test, assert the stored state **before** the response status. The security claim
is "the other tenant's row is unchanged"; a status assertion that fires first hides exactly the
evidence a reviewer needs. With the state assertion first, removing the org predicate produced
`expected [ Array(1) ] to deeply equal []` showing the attacker's id inside the victim's `read_by`,
instead of a bare "expected 200 to be 404". The fake Supabase client must also honour `eq`/`in`
against a mutable store, or a missing predicate cannot be demonstrated at all — and it should throw
rather than approximate for verbs it does not model, so a future `or()` cannot pass silently.

## Current focus

- ADMIN-022 is completed. `GET /api/admin/communications` is gated on `communications.send` instead
  of `logistics.view`, and `/api/admin/communications` and `/api/admin/notifications` are reclassified
  from `legacy_pending_migration` to `capability_gated` with their weaker method named in
  `authClassByMethod`. Measured: `legacyRoutes` 53 → 51, `legacyGuardDrift` 9 → 5, and
  `capabilityGapMethods` 30 → 32 — the third figure **rises**, correctly, because naming the weaker
  method is what puts it into the gap set. `legacyRouteLimit` 53 → 51 and the checker reports an exact
  51/51. All three negative controls re-run and observed red.
- **One obligation is outstanding and it is not this lane's to discharge.** The DOMAIN-040
  `shared:` override on `__tests__/admin/admin-registry-guard-proof.test.ts` must be removed from
  `docs/engineering/agents/admin/SEGMENT_OWNERSHIP.yaml:322-324` and the path returned to
  `admin-governance`. Recorded in `HF-ADMIN-022-DOMAIN040-LEASE-REVERT` for `ADMIN-025`. It is a
  **second, separate** obligation from the DOMAIN-039 one in `HF-ADMIN-021-DOMAIN039-LEASE-REVERT`:
  two overrides, two reversions, and neither handoff discharges the other.
- Still open and not owned by ADMIN-022: `PATCH /api/admin/communications` and
  `POST /api/admin/notifications` owe a capability gate. Adding one moves the pinned counts, so the
  gate and the figures must land in one change.
- Known inconsistency left in place: GET turns the resolver's `organization_access_denied` into a
  500 rather than a 403, while PATCH returns the real status. Pre-existing, but it is now a
  difference between two handlers in one file and worth a bounded follow-up.
- Product decision still open for `admin`: there is no communications read capability in the catalog,
  so read and send are currently the same authority.
- Await a bounded, dependency-ready task dispatched by `admin`.

## Known risks

- Prefixes in the default working set guide discovery; a task lease must still name exact files.
- Cross-segment changes can collide unless the parent Admin agent records shared ownership and handoffs.
- An acceptance criterion that asks a route lane to move a pinned registry figure requires a
  parent-level ownership grant. Check the segment owner before planning the change, not after — and
  if the grant is refused, **do not split the change**. Land the change and the figures it moves
  together, or not at all.
- Reclassifying a route out of a legacy class can falsify an assertion in your own evidence file. That
  is your file to fix, and you should fix it by naming the newly-visible debt rather than by deleting
  the assertion that caught the problem.
- Do not pass prose containing shell metacharacters (backticks, `$`, `!`) as a shell argument that
  will be recorded in a task record. In this segment's ADMIN-022 session a backtick pair in a
  checkpoint argument was command-substituted by zsh and ran `npm run generate:admin-audit`, writing
  17 files outside the working set. It was reverted, and the record discloses it; do not repeat it.
  The mechanical habits that prevent it: write files with the file-write tool rather than a shell
  heredoc, and apply destructive negative controls by copying byte-exact snapshots taken before any
  edit rather than by generating patch text in a shell.
- **In a shared dirty worktree, hash the files your own record names before you touch anything.** In
  this segment's second ADMIN-022 session the route file's hash did not match the value the record
  stated, because a sibling task had landed in between. That check is cheap and it is what caught a
  stale finding before it was written into a new record.

