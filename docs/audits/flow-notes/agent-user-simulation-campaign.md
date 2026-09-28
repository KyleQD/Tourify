# Agent user simulation campaign

## Campaign summary

| Field | Value |
| --- | --- |
| Owning task | `QA-004` |
| Runbook | `docs/engineering/agent-user-simulation-runbook.md` |
| Environment | Isolated staging |
| Base URL | Pending |
| Deployed commit | Pending |
| Staging deployment ID / Supabase project ref | Pending; must differ from production |
| Isolation evidence | Pending; RELEASE-007 |
| Schema ledger / denial evidence | Pending; DB-008 / DB-002 |
| iOS / Android preview build IDs | Pending; QA-006 |
| Protected actor secret references | Pending; no secret values in this file |
| Campaign ID | Pending |
| Started at | 2026-09-22 |
| Payment mode | Test mode only |
| Fixture mode | Additive, campaign-owned records only |

### Release and QA gate checkpoint — 2026-09-22

Local gates now require a manual exact-SHA staging deployment, a Vercel-generated deployment ID observed on both the deployment URL and `demo.tourify.live`, a separate Supabase origin, and Stripe test mode. Production deployment now requires a protected manual dispatch tied to successful same-SHA CI, E2E, security, staging, and launch-certification runs. QA-005 refuses actor creation if either staging or production health lacks the independently recorded deployment/database identity; QA-006 requires separate Vercel deployment IDs for mobile evidence. These are local contract results only. All 718 candidate rows remain unclassified and unrun. The live campaign remains blocked until hosted isolation, protected actors, DB-008/DB-002 evidence, and iOS/Android preview builds are recorded.

### Unblock sprint dispatch — 2026-09-22

The release-readiness unblock sprint is active. Four lanes own the next phase: release isolation and exact-SHA evidence (`RELEASE-007` / `QA-003`), database hosted proof (`DB-010` / `DB-002` / `DB-008`), QA actor and mobile preview readiness (`QA-005` / `QA-006`), and the thin pilot-chain rerun gate (`QA-004`). The first three lanes may prepare packets and run local/read-only validation immediately. The pilot chain cannot create actors, mutate staged records, run payments, or mark rows passed until the release and database lanes attach verified isolated-staging evidence, Stripe test mode, protected actor inputs, and mobile preview build IDs.

Operator packet: `docs/audits/flow-notes/release-readiness-unblock-sprint.md`.

Current execution checkpoint:

- Vercel CLI has an authenticated user, but this workspace has no `.vercel/project.json`, so no local Vercel project identity is linked.
- Supabase CLI is linked to `Tourify Demo` project `auqddrodjezjlypkzfpi`; this is the same Supabase origin advertised by both public demo and production health responses, so it is not safe to treat as isolated staging.
- Public health responses from demo and production still omit the release SHA, deployment ID, Supabase-origin header, and Stripe-mode header required by QA-005.
- Hosted database apply, actor provisioning, mobile preview gate, and the pilot chain remain blocked.

| Lane | Queued task reference | Required output before pilot |
| --- | --- | --- |
| Release isolation | `RELEASE-007` / `QA-003` | Staging URL, deployed SHA, Vercel deployment ID, separate Supabase origin, Stripe test mode, production-difference proof |
| Database hosted proof | `DB-008` / `DB-002` / `DB-010` | CP-051 apply packet, DB-010 hosted contract result, DB-002 denial probes, DB-008 ledger/schema parity |
| QA actors and mobile | `QA-005` / `QA-006` | Protected actor secret packet, non-secret manifest path, iOS/Android preview IDs, mobile gate observation packet |
| QA pilot rerun gate | `ORCH-002` / `QA-004` | Execute only after the three packets above are present on the same recorded deployment SHA |

### Release operator hosted inspection — 2026-09-22

Read-only Vercel inspection maps both `demo.tourify.live` and `tourify.live` to production deployment `dpl_3tW7rRYa6chWxG7U7FDdLi7ZLngK` in the same `tourify-beta-k2` project. Both `/api/health` responses are 200 but omit the exact release SHA, deployment ID, Supabase origin, and Stripe mode headers. Both CSPs advertise `https://auqddrodjezjlypkzfpi.supabase.co`; the checked-in demo and production env templates also use that origin. GitHub staging/production environments have no variables, secrets, or protection rules, and main is unprotected. The [RELEASE-007 staging packet](release-staging-isolation-packet-2026-09-22.md) records the missing items and operator checklist. No actor, database, payment, or device action occurred; all 718 candidate rows remain unpassed.

### QA-004 pilot operator checkpoint — 2026-09-22

Status: **not run**. The 25-row web-first pilot subset is staged in [the pilot row sheet](agent-user-simulation-pilot-rows.csv) and [the eight-step script](../../engineering/qa004-thin-pilot.md). The master CSV has 522 web, 98 iOS, and 98 Android candidate rows; all 718 remain `not_run` and `needs_ui_confirmation`. No product actor, payment, worker action, or event close was attempted. No new product finding was opened from this preflight.

The release packet shows demo and production aliases on the same Vercel deployment; neither health response supplies exact SHA, deployment, Supabase origin, or Stripe mode. DB-008 hosted ledger, DB-002 denials, DB-010 hosted worker-action postflight and denials, QA-005 protected actors, and QA-006 preview build observations are also pending. The pilot must begin on a new isolated staging deployment after these proofs are attached; local HEAD does not substitute for the deployed SHA. MKT-004 and TICKET-005 still require independent hosted Stripe test-mode transaction certification beyond this merch-and-shift pilot.

## Guardrail confirmation

- [ ] Staging is isolated from production.
- [ ] Staging deployment, Supabase project, and secret scopes are independently verified against production; hostname alone is not proof.
- [ ] Hosted migration ledger and critical authorization denial probes match the deployed SHA.
- [ ] Deployed commit is recorded.
- [ ] Synthetic credentials are stored outside committed reports.
- [ ] Payment provider is in test mode.
- [ ] Fixture behavior is additive and campaign-owned.
- [ ] No database reset, destructive cleanup, or production payment action is planned or executed.
- [ ] Platform admin and organization or venue manager are separate actors.
- [ ] Engineering service identities are not treated as app users unless the route explicitly supports agent authentication.
- [ ] iOS and Android preview builds target the same recorded staging release.

## Actor roster

| Actor key | Email or secret reference | User ID | Profile or account IDs | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `sim-worker-01` | Pending | Pending | Pending | Pending | Primary worker path |
| `sim-worker-02` | Pending | Pending | Pending | Pending | Retry and edge paths |
| `sim-artist-01` | Pending | Pending | Pending | Pending | Primary artist owner |
| `sim-artist-02` | Pending | Pending | Pending | Pending | Collaborator path |
| `sim-venue-manager-01` | Pending | Pending | Pending | Pending | Venue manager |
| `sim-org-manager-01` | Pending | Pending | Pending | Pending | Organization manager |
| `sim-platform-admin-01` | Pending | Pending | Pending | Pending | Tourify platform admin |
| `sim-customer-01` | Pending | Pending | Pending | Pending | Primary customer |
| `sim-customer-02` | Pending | Pending | Pending | Pending | Cancellation and retry paths |
| `sim-door-staff-01` | Pending | Pending | Pending | Pending | Event-scoped scan and guest list; not a platform admin |
| `sim-foreign-org-manager-01` | Pending | Pending | Pending | Pending | Separate campaign tenant for denial probes |
| `sim-foreign-venue-manager-01` | Pending | Pending | Pending | Pending | Separate campaign venue for booking-denial probes |

## Coverage inventory

The [row-level coverage ledger](agent-user-simulation-coverage.csv) contains 58 web candidate goals and the 16-journey native preview catalog expanded to 718 persona × goal × platform × scenario rows. Its route hints are static entry points, not evidence that a capability is shipped. Before a live run, inspect current web navigation and iOS/Android preview builds, classify each candidate as shipped, disabled, or unavailable, and add any newly visible core action. Keep `not_run` until an actor actually attempts the row; record why a row is `not_applicable`. No `bypassed` row can count toward completion.

| Platform | Build or SHA | Visible entry points reviewed | Shipped rows | Passed | Blocked | Bypassed | Not run | Evidence |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Web | Pending | No | 0 | 0 | 0 | 0 | 522 | Pending |
| iOS preview | Pending | No | 0 | 0 | 0 | 0 | 98 | Pending |
| Android preview | Pending | No | 0 | 0 | 0 | 0 | 98 | Pending |

## Pilot chain

| Step | Actor | Route or surface | Expected result | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Artist publishes brand, EPK, music, tickets, and merch | `sim-artist-01` | Pending | Customer and manager can discover it | Not run | Pending |
| Customer follows, messages, and buys test-mode item | `sim-customer-01` | Pending | Artist can see order, ticket, or engagement | Not run | Pending |
| Organization or venue books artist or creates event | `sim-org-manager-01` / `sim-venue-manager-01` | Pending | Artist receives or sees booking context | Not run | Pending |
| Manager posts work | `sim-org-manager-01` / `sim-venue-manager-01` | Pending | Worker can discover job | Not run | Pending |
| Worker applies and completes onboarding | `sim-worker-01` | Pending | Manager can review applicant and onboarding state | Not run | Pending |
| Manager hires and schedules worker | `sim-org-manager-01` / `sim-venue-manager-01` | Pending | Worker sees schedule | Not run | Pending |
| Worker confirms and completes shift | `sim-worker-01` | Pending | Manager sees completed shift and worker sees work history | Not run | Pending |
| Manager verifies attendance and closes event | `sim-org-manager-01` / `sim-venue-manager-01` | Pending | Worker and artist see final event state after reload | Not run | Pending |

## Single-event production

Use one campaign-owned event. Record each created object ID, the UI action, receiving actor, before/after state, and evidence link in the per-run note. A fixture or API bypass does not make a row pass.

| Stage | Origin → receiver | Required proof | Status | Event/object IDs | Evidence or finding |
| --- | --- | --- | --- | --- | --- |
| Create and plan | Organizer → artist and venue | Event, date, availability, booking, team, budget, and logistics persist | Not run | Pending | Pending |
| Publish and sell | Organizer/artist → customer | Public event, ticket/merch test purchase, buyer receipt, seller inventory and notification agree | Not run | Pending | Pending |
| Staff and prepare | Manager → worker | Job, application, hire, onboarding, canonical staff row, and schedule agree | Not run | Pending | Pending |
| Execute | Worker/door → manager/customer | Check-in/out, admission, guest list, incident/change, and status agree | Not run | Pending | Pending |
| Close | Manager → all participants | Completion, work history, supported refund/cancellation, reporting, and reconciliation agree | Not run | Pending | Pending |

## Multi-stop tour production

Use a new campaign-owned tour with at least three stops. Complete the first, middle, and final stops end to end; inspect schedule, booking, staffing, ticketing, and completion on every stop. Exercise one date or venue revision and one cancellation or failed action, then verify later stops are intact.

| Stage | Required proof | Status | Tour/stop IDs | Evidence or finding |
| --- | --- | --- | --- | --- |
| Create tour and stops | Owner, ordering, dates, and collaboration persist | Not run | Pending | Pending |
| First stop | Booking, sale, staffing, admission, completion, and receiving-side state | Not run | Pending | Pending |
| Middle stop | Booking, sale, staffing, admission, completion, and receiving-side state | Not run | Pending | Pending |
| Final stop | Booking, sale, staffing, admission, completion, and receiving-side state | Not run | Pending | Pending |
| All-stop inspection | Every stop has coherent schedule, booking, staffing, ticketing, and completion state | Not run | Pending | Pending |
| Revision and recovery | Changed date/venue and cancelled/failed action do not corrupt later stops | Not run | Pending | Pending |

## Full matrix status

| Actor | Success | Empty | Validation | Cancel/retry | Notification | Mobile | Accessibility | Unauthorized | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Worker | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Pending |
| Artist | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Pending |
| Venue manager | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Pending |
| Organization manager | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Pending |
| Platform admin | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Pending |
| Customer/general user | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Pending |

## Learning ledger

Update this ledger after every run so each agent starts from the latest failure and rerun context instead of rediscovering the same blockers.

| Actor journey | Last blocked step | Fixes shipped since last run | Rerun first | New scenarios unlocked | Repeated failures | Regressions | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Worker | Check-in/out action endpoint is feature-gated and current work state says required SQL is not applied; 111 focused worker tests green headless | None (DB-010 migration reviewed but unapplied; WORK-006 flag off) | Staff member creation, schedule visibility, check-in/out, work history, deep job paging | None yet | `SIM-20260922-WORK-001`, `SIM-20260922-WORK-002`, `SIM-20260922-WORK-003`; new `WORK-004` (no work-history surface), `WORK-005` (jobs merge pagination truncation) | None known | Low |
| Artist | Live publish/discovery/sales chain not run; 59 artist tests green | None | Brand/EPK publish, discovery, booking, sales visibility | None yet | Staging packet missing; new `ARTIST-001` (visibility selector does not gate public profile), `ARTIST-002` (band page never surfaces music/storefront) | None known | Low |
| Venue manager | Venue/org boundary and booking/staffing chain not run; 34 venue focused tests green | None | Venue profile, availability block editor, staff need, worker schedule | None yet | `SIM-20260922-ADMIN-002` dependency; new `VENUE-001` (raw availability/reservations read by any authenticated user), `VENUE-002` (no availability write path), `VENUE-003` (dead mock components) | None known | Low |
| Organization manager | Hiring/onboarding/scheduling chain not run; 63 org/event/job focused tests green | None | Event/tour create+publish, job posting, applicant review, scheduling | None yet | Staging packet missing; new `ORG-001` (no org event publish UI), `ORG-002` (event PATCH creator-only), `ORG-003` (org jobs labeled venue / null org name) | None known | Low |
| Platform admin | Admin boundary evidence blocked; 28 admin tests + 54/54 registry exact | ADMIN-003 local fixes hold (team-member PATCH, venues detail) | Team-member PATCH denial, venue detail scope, music-ops platform-only cleanup, platform-only workflows | None yet | `SIM-20260922-ADMIN-001`, `SIM-20260922-ADMIN-002`; new `ADMIN-003` (music-marketplace/ops non-canonical guard), `ADMIN-004` (four music content/royalties routes same drift) | None known | Low |
| Customer/general user | Authenticated marketplace success redirect points at guest-token order page; follow endpoints were split | MKT-001 and SOC-001 local fixes pass focused suites (order-access/success-url 7/7; follow 16/16) | Discovery, follow, message, authenticated purchase redirect, buyer order dashboard, guest order claim | None yet | `SIM-20260922-MKT-001`, `SIM-20260922-SOC-001`; new `USER-001` (guest claim CTAs link to dead `/auth/*` routes) | None known | Low |
| Marketplace/ticketing | Authenticated checkout success URL could not load order confirmation; 26 commerce tests green headless | MKT-001 local fix verified (order UUID + session binding; wrong-buyer denial) | Checkout both branches, guest order claim, buyer cancel, seller refund, download, test-mode purchase | None yet | `SIM-20260922-TIX-001`, `SIM-20260922-MKT-001`; new `MKT-002` (claim UI dead end), `MKT-003` (no cancel/refund UI), `MKT-004` (checkout idempotency burns keys), `MKT-005` (download renders JSON; non-atomic count) | None known | Low |
| Music/social/content | Music publish tests pass locally; follow surface has duplicate endpoints | FOLLOW-route contract suites pass 16/16 | Follow write/read consolidation, playback persistence read-back, outsider denial on interactions-stats | Music route focused tests remain green | `SIM-20260922-SOC-001`; new `SOC-003` (interaction-stats GET service-role leak), `MUS-001` (play route unconditional success) | None known | Low |
| Auth/database boundary | Hosted schema/security reconciliation incomplete; provisioner 8/8 green; migration-ledger digest now FAILS in dirty tree | None (DB-010 staged SQL reviewed; revoke still unapplied) | RLS denial probes (incl. new venue availability/reservations), campaign actor isolation, ledger re-digest | None yet | `SIM-20260922-DB-001`; new `DB-002` (venue RLS authenticated/anon leak — validates+extends VENUE-001), `DB-003` (migration-ledger digest drift) | None known | Low |

## Findings

Use the format from the runbook. Keep confirmed defects, missing capabilities, design ideas, and harness gaps separate.

### Finding-to-fix template

Copy this template for every new blocked or failed step.

```markdown
#### SIM-YYYYMMDD-### — Title

- Type:
- Severity:
- Status: new | routed | fixing | ready for rerun | verified | duplicate | deferred
- Actor and goal:
- Scenario type:
- Failure point:
- Expected optimal outcome:
- Actual result:
- User impact:
- Evidence:
- Suspected cause:
- Necessary fix:
- Primary owner:
- Secondary collaborators:
- Existing task or new task recommendation:
- Acceptance criteria:
- Rerun scenario:
```

### Confirmed defects

#### SIM-20260922-ADMIN-001 — Admin team-member PATCH lacks scoped admin gate

- Type: Confirmed static defect
- Severity: P0
- Status: ready for rerun (ADMIN-003 local fix; isolated-staging actor evidence pending)
- Actor and goal: Platform admin / venue or organization manager boundary
- Scenario type: Unauthorized actor / admin capability boundary
- Failure point: `/api/admin/team-members` `PATCH`
- Expected optimal outcome: Only a properly scoped platform admin or workforce manager can update team-member role, permission, or status, and the mutation is bound to the resolved venue, organization, event, or tour scope.
- Environment and commit: Local repository inspection at `623b576b7963d4a2eccb2fbf83f24f2011842a83`; live staging not run
- Starting state: QA-004 agent simulation launch with no isolated staging packet available
- Exact steps: Inspect `app/api/admin/team-members/route.ts`
- Expected result: Mutations to `venue_team_members` require a platform admin or a scoped admin capability plus a venue, organization, event, or tour resource boundary.
- Actual result: Local repair now places `PATCH` behind `withAdminCapability('workforce.manage')`, resolves the target member, verifies the venue's `venue_identity_bridges.operational_org_id` matches the acting admin organization, and updates with both `id` and `venue_id` predicates. Original static failure remains the pre-fix evidence until deployed actor rerun.
- Evidence: `app/api/admin/team-members/route.ts`; `__tests__/admin/admin-team-members-scope.test.ts`; `__tests__/admin/admin-route-capability-matrix.test.ts`; `ADMIN-003` checkpoint `2026-09-22T15:56:00Z`
- Affected route or API: `/api/admin/team-members` `PATCH`
- User impact: A signed-in user may be able to attempt team-member role, permission, or status changes without the intended admin boundary if database policy permits the write.
- Suspected cause: Legacy route migration left method-level mutations unevenly gated.
- Necessary fix: Local fix complete; deploy to isolated staging, then rerun the originating and wrong-scope actors on the exact deployed SHA.
- Primary owner: `admin`
- Secondary collaborators: `work`, `venue`, `database`
- Linked existing or new task: Existing `ADMIN-003` for admin guard convergence; add a bounded follow-up if not already covered.
- Acceptance criteria: Local tests cover wrong-scope denial and allowed id-plus-venue scoped update. Campaign pass still requires non-admin, wrong-scope, scoped manager, and platform-admin actor evidence on isolated staging.
- Rerun scenario: Platform admin slice attempts team-member mutation as platform admin, scoped manager, unrelated signed-in user, and wrong-scope manager.

#### SIM-20260922-ADMIN-002 — Venue admin detail route has unclear venue/org boundary

- Type: Confirmed static defect
- Severity: P1
- Status: ready for rerun (ADMIN-003 local fix; isolated-staging actor evidence pending)
- Actor and goal: Platform admin / venue manager separation
- Scenario type: Unauthorized actor / admin capability boundary
- Failure point: `/api/admin/venues/[id]` `GET` and `PATCH`
- Expected optimal outcome: Venue details are visible and mutable only through a clear platform-admin or venue/org-scoped capability contract.
- Environment and commit: Local repository inspection at `623b576b7963d4a2eccb2fbf83f24f2011842a83`; live staging not run
- Starting state: QA-004 agent simulation launch with no isolated staging packet available
- Exact steps: Inspect `app/api/admin/venues/[id]/route.ts`
- Expected result: Venue detail reads and mutations use either a platform admin gate or a venue/org-scoped capability with an explicit venue ownership boundary.
- Actual result: Local repair classifies `GET` and `PATCH` as platform-admin only with `withPlatformAdmin`. `GET` no longer reads `events_v2` by `venue_name` text matching; it loads venue events only through `venue_identity_bridges.venues_v2_id` when a bridge exists. Original static failure remains the pre-fix evidence until deployed actor rerun.
- Evidence: `app/api/admin/venues/[id]/route.ts`; `__tests__/admin/admin-team-members-scope.test.ts`; `__tests__/admin/admin-route-capability-matrix.test.ts`; `ADMIN-003` checkpoint `2026-09-22T15:56:00Z`
- Affected route or API: `/api/admin/venues/[id]`
- User impact: Platform-admin and venue-manager capabilities are hard to verify in simulation because the route does not expose a clear scoped authorization contract.
- Suspected cause: Shared venue directory lacks canonical venue-to-organization linkage.
- Necessary fix: Local fix complete by platform-only classification and bridged event lookup; deploy to isolated staging, then rerun platform admin, venue manager, and wrong-scope attempts.
- Primary owner: `venue`
- Secondary collaborators: `admin`, `database`
- Linked existing or new task: Existing `ADMIN-003` and the venue/database precondition notes for venue-to-org linkage.
- Acceptance criteria: Local tests cover platform-only registry contract and bridged event lookup without `ilike`. Campaign pass still requires live denial and allowed platform-admin evidence on isolated staging.
- Rerun scenario: Venue manager slice reads/updates own venue, tries another venue, and platform admin performs legitimate oversight.

#### SIM-20260922-MKT-001 — Authenticated marketplace checkout success URL cannot load order confirmation

- Type: Confirmed static defect
- Severity: P1
- Status: ready for rerun (local fix; hosted test-mode proof pending)
- Actor and goal: Customer/general user buys merchandise while signed in and expects order confirmation
- Scenario type: Success path / persistence / payment return
- Failure point: `/api/marketplace/checkout` builds the Stripe success URL with `{CHECKOUT_SESSION_ID}` for authenticated buyers, while `/marketplace/order/[token]` loads only by `guest_access_token`.
- Expected optimal outcome: After a signed-in customer completes Stripe checkout, Tourify returns them to a confirmation surface that can load their paid order and offers account order navigation.
- Actual result: The success URL becomes `/marketplace/order/{CHECKOUT_SESSION_ID}?checkout=success` for authenticated buyers. The order page queries `marketplace_orders.guest_access_token = token`, so a Stripe session id cannot resolve an authenticated buyer order.
- User impact: Signed-in customers can complete checkout but land on "Order not found" instead of a receipt, creating a severe trust/support issue for purchases.
- Evidence: `app/api/marketplace/checkout/route.ts:452`; `app/marketplace/order/[token]/page.tsx:29`; `app/marketplace/order/[token]/page.tsx:61`
- Suspected cause: Guest-order token confirmation flow was reused for authenticated buyers without a separate authenticated order lookup or redirect.
- Necessary fix: Route authenticated checkout success to an authenticated order confirmation/dashboard URL keyed by `order.id` or `order_number` plus session verification, while keeping opaque guest tokens for guest checkout.
- Primary owner: `marketplace`
- Secondary collaborators: `qa`, `integrations`
- Existing task or new task recommendation: `MKT-005`, linked to transaction lifecycle `MKT-004`.
- Local fix evidence: Authenticated return now uses order UUID plus Stripe session verification; buyer-only order access and purchase-history link are implemented. Three focused Jest suites passed (19 tests). No hosted checkout is claimed.
- Acceptance criteria: Authenticated buyer success redirect loads the paid order; guest success redirect still uses opaque guest token; wrong signed-in user cannot load another buyer's order; focused test covers both URL branches.
- Rerun scenario: Signed-in `sim-customer-01` buys a test-mode merch item, returns from Stripe, sees confirmation, reloads `/marketplace/purchases`, and seller sees the order.

#### SIM-20260922-SOC-001 — Follow actions have duplicate endpoint contracts

- Type: Confirmed static defect
- Severity: P2
- Status: ready for rerun (SOCIAL-005 local fix; cross-actor staging evidence pending)
- Actor and goal: Customer/general user follows artist or creator and expects consistent social state
- Scenario type: Success path / retry / notification
- Failure point: `/api/social/follow` and `/api/follow` both mutate `follows` with different request shapes and duplicate-follow behavior.
- Expected optimal outcome: All follow buttons use one canonical follow contract with idempotent retry behavior, consistent achievement/notification side effects, and one documented response shape.
- Actual result: `/api/social/follow` expects `followingId` and returns 400 for an already-followed user; `/api/follow` expects `following_id`, treats duplicate insert as success, and records an achievement metric. Current tests only assert major UI surfaces do not call raw `/api/follow`.
- User impact: Different customer surfaces can disagree on retry behavior and side effects, causing follow buttons to show errors after a successful first click or miss analytics/notification effects.
- Evidence: `app/api/social/follow/route.ts:15`; `app/api/social/follow/route.ts:40`; `app/api/follow/route.ts:18`; `app/api/follow/route.ts:48`; `__tests__/social/follow-friend-ecosystem.test.ts`
- Suspected cause: Legacy follow route remained after newer social follow and follow-request flows were introduced.
- Necessary fix: Choose `/api/social/follow` or the relationship/follow-request route as canonical, make follow/unfollow idempotent, move required achievement/notification side effects there, and deprecate or shim the legacy endpoint.
- Primary owner: `social`
- Secondary collaborators: `general-user`, `qa`
- Existing task or new task recommendation: `SOCIAL-005`.
- Local fix evidence: The canonical profile follow route now handles repeated follow/unfollow requests consistently; two legacy HTTP routes delegate to it, and mobile plus visible artist network clients use it. Focused route/client tests and lint passed. Live follower counts and notifications are unverified.
- Acceptance criteria: Follow and unfollow have one documented client contract; double follow returns success/idempotent state; achievement or notification behavior is consistent; tests cover both current public-profile and feed button clients.
- Rerun scenario: `sim-customer-01` follows `sim-artist-01` from profile and feed surfaces, retries the click, reloads following lists, verifies artist follower count or event, then unfollows cleanly.

#### SIM-20260922-VENUE-001 — Raw venue availability and reservations readable by any authenticated user

- Type: Confirmed static defect (data-boundary / RLS)
- Severity: P1 (P0 if live exposure is proven by DB-002 denial probes)
- Status: new
- Actor and goal: `sim-venue-manager-01` and `sim-foreign-venue-manager-01`; unauthorized-scenario verification for venue availability
- Scenario type: Unauthorized actor / data boundary
- Failure point: RLS on `public.venue_availability` and `public.venue_reservations`
- Expected optimal outcome: Raw availability rows (incl. `blocked_reason`, `notes`, `booking_id`, `event_id`) and reservation rows (incl. `source_id`, `created_by`) are readable only by venue operators or service-scope; public reads route through the sanitized `public_venue_availability` view.
- Actual result: `venue_core.sql` leaves `"Anyone can view venue availability" FOR SELECT USING (true)`; the reservation-conflict migration revokes SELECT on `venue_availability` only from anon/PUBLIC, and `venue_reservations` keeps `USING (true)` with no REVOKE. The venue calendar hook reads raw tables client-side. The auth/database slice validated and extended this in `SIM-20260922-DB-002` (P0): anon was never revoked on `venue_reservations`, and `source_id`/`created_by` leak, contradicting the "existence/timing only" comment.
- User impact: A signed-in customer or foreign venue manager can enumerate any venue's blocked dates, internal block reasons, and reservation negotiation state; FOREIGN-01 row cannot pass while this boundary is open.
- Evidence: `supabase/migrations/20250814123000_venue_core.sql:108-120,298-304`; `supabase/migrations/20260823140000_reservation_conflict_engine.sql:74-83,286-302`; `app/venue/hooks/use-venue-calendar-data.ts:80-100`
- Suspected cause: The sanitized view was added but the raw-table policy was never tightened and the calendar client was never migrated.
- Necessary fix: Additive forward migration revoking SELECT on both raw tables from anon/PUBLIC/authenticated (keeping service_role), replacing `venue_reservations_public_read` with a scope-restricted or sanitized surface, and pointing venue calendar reads at the sanitized projection. Regenerate `lib/database.types.ts` (CP-016) after apply.
- Primary owner: `venue`
- Secondary collaborators: `database`, `qa`
- Existing task or new task recommendation: New bounded venue task (venue availability data-boundary hardening); hosted denial proof belongs to `DB-002`/`DB-008`.
- Acceptance criteria: On isolated staging, anon/customer/foreign-venue-manager receive 0 rows from both raw tables; `public_venue_availability` still serves sanitized rows; venue operator and service paths still function.
- Rerun scenario: `sim-venue-manager-01` reads own calendar; `sim-foreign-venue-manager-01`, `sim-customer-01`, and anon are denied on raw tables; public venue page shows only dates.

#### SIM-20260922-ADMIN-003 — /api/admin/music-marketplace/ops uses non-canonical inline admin guard and a false capability registry claim

- Type: Confirmed static defect (registry/code drift; harness cannot detect it)
- Severity: P1
- Status: new
- Actor and goal: Platform admin oversees global kill switches / compliance holds
- Scenario type: Unauthorized actor / admin capability boundary
- Failure point: `/api/admin/music-marketplace/ops` GET and POST
- Expected optimal outcome: Platform-global ops on the canonical `withPlatformAdmin` family standard, with registry entry `platform_admin`.
- Actual result: Guard is `requireApiUser` + inline `assertAdmin` (`profiles.is_admin === true` OR `Number(admin_level) >= 1`), which also grants `is_admin=true` at any admin_level; the registry claims `capability_gated (content.view)` + `audit: true`. No focused test exists (`rg music-marketplace` → none in `__tests__/admin`). Writes `music_marketplace_admin_actions` audit rows.
- User impact: Audits and capability-matrix convergence treat an org capability as authorization; the global kill-switch surface is invisible to canonical-guard verification.
- Evidence: `app/api/admin/music-marketplace/ops/route.ts:25-35,49,93`; `lib/admin/api-route-registry.ts:1404-1411`; `scripts/ci/check-admin-route-registry.mjs` (checks only the legacy ceiling, not `capability_gated` claims)
- Suspected cause: Music-family platform routes predate the canonical wrapper and were never in the platform-ops migration batches (they are `capability_gated`, not `legacy_pending_migration`).
- Necessary fix: Migrate to `withPlatformAdmin` (preserve feature gate, killMap caps, hold/alert predicates, action attribution); set registry `platform_admin` + `auditMethods: ['POST']`; add focused denial/allow tests + matrix convergence entry.
- Primary owner: `admin`
- Secondary collaborators: `music`, `qa`
- Existing task or new task recommendation: New bounded task or extend `ADMIN-003` batch list.
- Acceptance criteria: Platform-only denial test; org-admin with content.view denied; kill switch writes key-scoped; registry exact.
- Rerun scenario: Platform admin vs scoped org admin vs unrelated user on `/api/admin/music-marketplace/ops`.

#### SIM-20260922-ADMIN-004 — Four music content/royalties admin routes carry the same guard/registry drift

- Type: Confirmed static defect (registry/code drift)
- Severity: P2
- Status: new
- Actor and goal: Platform admin / RBAC music reviewer performs content-review and royalty-import oversight
- Scenario type: Unauthorized actor / admin capability boundary
- Failure point: `/api/admin/content/music/certifications` (GET/PATCH), `/api/admin/content/music/rights/disputes` (GET/PATCH/POST), `/api/admin/content/music/rights/review` (GET/PATCH), `/api/admin/music/royalties/imports` (GET)
- Expected optimal outcome: Registry `capability_gated (content.view)` matches the routed guard, or the route moves to the canonical platform guard.
- Actual result: All use `requireApiUser` + music-domain helpers (`userCanReviewMusicCertification` / `userCanAdminRoyaltiesOps` — platform `is_admin=true` AND admin_level ∈ {moderator,super} OR RBAC permission). Same drift class as earlier resolved families, never recorded.
- User impact: Contract integrity; capability matrix cannot detect the mismatch.
- Evidence: route files listed above; `lib/admin/api-route-registry.ts`
- Necessary fix: (a) move onto canonical platform guard with scope decision, or (b) align the registry to the actual permission contract with a documented `rbac_permission`-keyed authClass. One focused contract test per route.
- Primary owner: `admin`
- Secondary collaborators: `music`, `database`
- Existing task or new task recommendation: Extend `ADMIN-003` batch list.
- Acceptance criteria: Registry-to-code parity verified per route; focused denial/allow tests.
- Rerun scenario: Platform admin (moderator/super), numeric-admin_level user, RBAC-granted reviewer, unrelated user.

#### SIM-20260922-ORG-002 — Event PATCH authorizes by creator only, no org capability

- Type: Confirmed static defect (authorization)
- Severity: P2
- Status: new
- Actor and goal: Any org member updates an event
- Scenario type: Unauthorized actor / data boundary
- Failure point: `PATCH /api/events/[id]` uses `existing.created_by === user.id` (creator-only); GET does any-org-member limit-1 lookup. No UI currently PATCHes this route (only the venue delete dialog DELETEs).
- Expected optimal outcome: Org-scoped `event.manage` check at the data boundary (ORG-006/H8 invariant).
- Actual result: Creator-only mutation with no org/capability/RBAC check; denies other `event.manage` members and allows a creator outside org roles.
- User impact: Latent privilege/availability risk if any UI adopts this route.
- Evidence: `app/api/events/[id]/route.ts`; `app/venue/components/event-details/delete-event-dialog.tsx:25` (only consumer = DELETE)
- Necessary fix: Align with `withAdminCapability`/`withOrgCommand` (org + capability) or remove/deprecate the route.
- Primary owner: `organization`
- Secondary collaborators: `admin`
- Existing task or new task recommendation: Fold into `ORG-006`.
- Acceptance criteria: PATCH requires owning-org + `event.manage`; non-creator manager can update.
- Rerun scenario: Non-creator org manager updates a campaign event; foreign tenant is denied.

#### SIM-20260922-ORG-003 — Org-published jobs are labeled "Venue staffing" with a null organization name

- Type: Confirmed static defect (display/filtering)
- Severity: P3
- Status: new
- Actor and goal: Worker identifies an org-published job employer (ORG-07)
- Scenario type: Success path / empty state
- Failure point: `GET /api/jobs` unified board (merge=1) maps ALL `job_posting_templates` rows via `mapVenueTemplateToUnified`, hardcoding `source:'venue'` and deriving `organization_name` from `row.venue?.name`.
- Expected optimal outcome: Org postings (`employer_entity_type='organization'`) show the org name and a correct source badge; `venue_id` filter does not drop them.
- Actual result: Org postings show "Venue staffing" badge + `organization_name: null`; excluded when a `venue_id` filter applies.
- User impact: Worker trust issue and ORG-07 discovery attenuation.
- Evidence: `lib/rebuild/unified-jobs-list.ts:80-98`; `app/api/jobs/route.ts:116-145`
- Necessary fix: Branch the mapper on `employer_entity_type` and resolve the org display name (`organizer_accounts`), or add a separate org mapper.
- Primary owner: `organization`
- Secondary collaborators: `work`, `admin`
- Existing task or new task recommendation: New/recommended — fold into the org jobs task.
- Acceptance criteria: Org-published jobs show org name + correct source badge; rerun ORG-07.
- Rerun scenario: `sim-org-manager-01` publishes a job; `sim-worker-01` finds it with the org identity on the board.

#### SIM-20260922-USER-001 — Guest order-claim CTAs link to non-existent auth routes

- Type: Confirmed static defect (navigation dead end)
- Severity: P2
- Status: new
- Actor and goal: Guest buyer claims a paid order after sign-up/sign-in (GEN-07 / GEN-01)
- Scenario type: Success path / navigation entry
- Failure point: `app/marketplace/order/[token]/page.tsx:282` (`/auth/sign-up?redirect=...`) and `:287` (`/auth/sign-in?redirect=...`)
- Expected optimal outcome: Both CTAs land on the unified portal `/login?tab=signup|signin` and return to the order after auth.
- Actual result: `app/auth/` has no `sign-in`/`sign-up` route; middleware redirects only unhyphenated legacy names; the hyphenated URLs 404. The `redirect=` param itself is honored.
- User impact: Guest buyers who just paid cannot claim the order; broken primary CTA on a confirmation page, avoidable support load and lost conversion.
- Evidence: page.tsx:282,287; `middleware.ts:189-206`; `components/auth/tourify-auth-portal.tsx:99-111`; contrast `/marketplace/purchases/page.tsx:44`
- Necessary fix: Change both CTAs to `/login?tab=signup&redirect=...` and `/login?tab=signin&redirect=...`, or add middleware handling for the hyphenated names; add a link-contract test.
- Primary owner: `marketplace`
- Secondary collaborators: `general-user`, `qa`
- Existing task or new task recommendation: Fold into `MKT-005` or a small USER settings task.
- Acceptance criteria: Both CTAs resolve to a live auth route; after auth the order appears in `/marketplace/purchases`.
- Rerun scenario: `sim-customer-02` (guest) buys test merch, clicks both CTAs, signs up, verifies the claimed order in purchases.

#### SIM-20260922-MKT-004 — Checkout idempotency burns attempt keys and strands abandoned orders

- Type: Confirmed static defect
- Severity: P2
- Status: new
- Actor and goal: Customer retries checkout after a transient Stripe session-init failure or abandons payment
- Scenario type: Cancellation or retry / idempotency
- Failure point: `app/api/marketplace/checkout/route.ts:395-409,482-488` and `lib/marketplace/webhook-processor.ts` (no attempt terminal transition; no `checkout.session.expired` case)
- Expected optimal outcome: A retryable `stripe_checkout_init_failed` error can retry with the same idempotency key; abandoned/expired sessions reconcile to cancelled.
- Actual result: On session-create failure the route deletes ledger/order items/order but not `marketplace_checkout_attempts` (stays `pending` pointing at the deleted order); same-key retry then hits non-retryable 409 `checkout_session_unavailable`; nothing ever writes attempt `completed`; `checkout.session.expired` is treated as skipped.
- User impact: Retry friction after transient outages; orphaned pending orders/attempts accumulate; refreshed-key duplicate-session risk.
- Evidence: `route.ts`; `lib/marketplace/checkout-idempotency.ts:39-45`; `webhook-processor.ts:88,121-189,365-378,420`
- Necessary fix: Mark attempts completed on paid webhook; transition attempts to failed/expired on init failure; add `checkout.session.expired` reconciliation; make resume treat a missing order as stale and allow re-create; add focused tests.
- Primary owner: `marketplace`
- Secondary collaborators: `integrations`, `database`, `qa`
- Existing task or new task recommendation: Extend `MKT-004`/`MKT-005`.
- Acceptance criteria: Same-key retry after init failure succeeds; completed-key reuse returns non-retryable 409; expired sessions cancel orders and free inventory/attempts.
- Rerun scenario: Simulate Stripe init failure → retry same key → success; paid → second checkout same key → 409; abandon a test checkout → expires → cancelled and resumable.

#### SIM-20260922-MKT-005 — Digital delivery "Download" renders JSON and entitlement increments are non-atomic

- Type: Confirmed static defect (UI) + harness gap
- Severity: P2
- Status: new
- Actor and goal: Buyer downloads a digital purchase from `/marketplace/purchases`
- Scenario type: Success path / persistence
- Failure point: `app/marketplace/purchases/page.tsx:116` links to `/api/marketplace/delivery/[orderItemId]`, which returns `NextResponse.json({data})`; the route increments `download_count` via read-then-write.
- Expected optimal outcome: Download yields the asset file client-side and increments the count atomically.
- Actual result: A plain `<Link>` navigates to a JSON API response; two concurrent hits can both pass `hasReachedDownloadLimit` and both write `download_count + 1`.
- User impact: Digital buyers cannot actually download from the UI; entitlement limit can be exceeded under race.
- Evidence: `purchases/page.tsx:114-118`; `delivery/[orderItemId]/route.ts:44-99`
- Necessary fix: Add a client download handler (fetch signed URL, set `window.location`/anchor download or redirect); replace read-modify-write with an atomic/conditional update; add a delivery focused test (guest denial + limit race).
- Primary owner: `marketplace`
- Secondary collaborators: `general-user`, `qa`
- Existing task or new task recommendation: Extend `MKT-005`.
- Acceptance criteria: Download yields the asset; count never exceeds max under concurrent hits; unauthorized user denied.
- Rerun scenario: Buyer downloads a paid digital item twice sequentially and twice concurrently; downloads stop at the limit; wrong user denied.

#### SIM-20260922-SOC-003 — Notification/social interaction-stats GET reads any post or user via service role without visibility gates

- Type: Confirmed static defect (authorization gap on a read path)
- Severity: P1
- Status: new
- Actor and goal: Outsider reads interaction metadata on `followers`/`private` posts
- Scenario type: Unauthorized actor / data boundary
- Failure point: `app/api/notifications/social/route.ts` GET (lines 200-317) — service-role `postId` stats (+ names via `profiles!...fkey`) and arbitrary `userId` aggregate stats; Bearer auth only, no post-visibility, no profile privacy, no ownership check.
- Expected optimal outcome: Interaction stats honor the same visibility model as the feed and are denied to non-entitled viewers; auth model matches the POST.
- Actual result: Any authenticated bearer user can request `?postId=<any>` or `?userId=<any>` and receive likes/comments/shares lists and counts through the RLS-bypassing service client.
- User impact: Follower-only/private post engagement leaks to outsiders; per-user engagement stats readable for anyone.
- Evidence: `app/api/notifications/social/route.ts:200-317`; contrast `app/api/feed/posts/route.ts:616-626`; `posts.visibility` CHECK in `20241220000010_enhance_feed_system.sql:97`; `__tests__/social/legacy-notification-follow-route.test.ts:71-90` codifies the unowned GET.
- Necessary fix: Gate `postId` reads on the post's visibility + author profile privacy + ownership/follow context (or remove the dormant endpoint); add `userId` ownership check; unify auth with `checkAuth`/`authenticateApiRequest`.
- Primary owner: `social`
- Secondary collaborators: `database`, `qa`
- Existing task or new task recommendation: Extend `SOCIAL-005` or a bounded `SOCIAL-006`-style follow-up.
- Acceptance criteria: Follower-only/private post interaction stats return 403/empty to non-entitled users; author sees own stats; per-user stats require self or verified permission; cookie-auth parity.
- Rerun scenario: `sim-customer-01` (outsider) and `sim-artist-01` (owner) call GET on the artist's followers-only post; outsider denied, owner sees stats.

#### SIM-20260922-MUS-001 — Music play route returns unconditional success and can silently drop persistence

- Type: Confirmed static defect (misleading success contract / silent telemetry loss)
- Severity: P2
- Status: new
- Actor and goal: Artist and customer; music publishing/playback persistence evidence
- Scenario type: Success path / persistence
- Failure point: `app/api/music/play/route.ts` — outer `catch` returns `{success:true}` for every thrown error; `music_plays` insert error only logged; `recordMusicEvent`/`syncMusicStats`/achievement failures swallowed.
- Expected optimal outcome: Play endpoint confirms the persisted play/event or returns a failure the client can retry without duplicating `music_plays`.
- Actual result: Response always `"Play recorded successfully"` even when the insert/event/sync failed; the route contract cannot serve as persistence evidence.
- User impact: QA-004 playback "success" cannot be evidenced from the API; silent stat drift; retry/duplication risk.
- Evidence: `app/api/music/play/route.ts:59-75,159-169`; `lib/music/music-access.ts:124-134,170-181`
- Necessary fix: Return 5xx when the primary `music_plays` insert fails while keeping side-effect failures non-fatal; expose a non-200 contract or idempotency key.
- Primary owner: `music`
- Secondary collaborators: `qa`, `database`
- Existing task or new task recommendation: Bounded follow-up on top of `MUSIC-004`/`MUSIC-005`.
- Acceptance criteria: Failed `music_plays` insert returns an error status; successful insert returns success and one row; retry duplicates nothing.
- Rerun scenario: `sim-customer-01` plays the campaign track; route + DB read-back of `music_plays`/`music_engagement_events` agree on exactly one play; repeat with forced insert failure.

#### SIM-20260922-WORK-005 — Unified /api/jobs pagination silently truncates deep results

- Type: Confirmed static defect
- Severity: P3
- Status: new
- Actor and goal: Worker finds and filters jobs (deep paging)
- Scenario type: Success path / empty state
- Failure point: `app/api/jobs/route.ts` — `fetchWindow = Math.min(400, page * perPage * 3)` per source, but `unified_total` is the uncapped DB count and `unified = merged.slice(from, to+1)` runs over window-limited rows only.
- Expected optimal outcome: Pagination consistent with reported totals.
- Actual result: Rows beyond the 400-row window can never appear; page 1 can be skewed when one source's top items fall outside its 60-row window; `has_next`/total still promise more.
- User impact: Job search/filter silently incomplete; misleading total/page counts.
- Evidence: `app/api/jobs/route.ts:104,148,159,172-173`
- Necessary fix: Compute pagination against a unified window derived from `unified_total` (or keyset by date), or cap reported totals to window coverage; add a multi-page merge test.
- Primary owner: `work`
- Secondary collaborators: None
- Existing task or new task recommendation: New/recommended (fold into the jobs search task).
- Acceptance criteria: merge=1 pages fully cover reported totals with no dropped rows under skewed distributions.
- Rerun scenario: Job search deep-paging.

### Missing capabilities

#### SIM-20260922-WORK-001 — Shift scheduling cannot be credited from existing evidence

- Type: Missing observed capability evidence
- Severity: P1
- Status: ready for rerun (WORK-005 local shift bridge; WORK-006 attendance dependency remains)
- Actor and goal: Worker confirms, changes, checks in/out, completes shift, and sees work history
- Scenario type: Success path / persistence
- Failure point: Worker shift lifecycle evidence falls back to `tours.settings.crew_shifts`
- Expected optimal outcome: A hired worker sees a persisted shift in their schedule, checks in/out through the product, and both worker history and manager operations reflect completion.
- Environment and commit: Local repository and prior flow-note inspection; live staging not run
- Starting state: Existing West Coast flow notes and scenario script
- Exact steps: Review prior `docs/audits/flow-notes/SUMMARY.md` and `scripts/qa/seed-tour-flow-scenario.ts`
- Expected result: The campaign can prove `staff_shifts` persistence and worker-visible schedule/history from UI actions.
- Actual result: Existing notes record `staff_shifts` as partial; the scenario script may skip `staff_shifts` rows when no `staff_members` row exists and stores `crew_shifts` in `tours.settings` as a QA fallback.
- Evidence: `docs/audits/flow-notes/SUMMARY.md`; `scripts/qa/seed-tour-flow-scenario.ts`
- Affected route or API: Worker scheduling, staff shifts, onboarding/hire path
- User impact: A worker can appear hired in the scenario without proving the real shift lifecycle that workers and managers need.
- Suspected cause: Roster, staff member, and shift schemas are not fully bridged in the current QA flow.
- Necessary fix: Add a campaign-safe staffing fixture that creates the canonical staff member relationship, then run the UI shift lifecycle from manager and worker accounts.
- Primary owner: `work`
- Secondary collaborators: `database`, `qa`
- Linked existing or new task: `WORK-005`.
- Local fix evidence: Event shifts now use schema-supported `confirmed` status, and completed onboarding links persisted shifts to worker assignments. Twenty-five focused hiring tests passed. Manager/worker reload and attendance still need staging proof.
- Acceptance criteria: Canonical staff member row exists, `staff_shifts` row persists, worker schedule and manager schedule show the same shift, check-in/out changes persisted state, work history updates after completion.
- Rerun scenario: Worker slice runs hire, schedule, check-in/out, completion, reload, and cross-actor manager verification.

#### SIM-20260922-WORK-002 — Worker check-in/out remains feature-gated until reviewed SQL is applied

- Type: Missing capability / environment blocker
- Severity: P1
- Status: ready for hosted apply and denial probes (DB-010 local migration reviewed; WORK-006 flag remains disabled)
- Actor and goal: Worker checks in/out and acknowledges published work packets
- Scenario type: Success path / persistence
- Failure point: `/api/work-mode/assignments/[id]/actions` returns unavailable unless `FEATURE_WORK_MODE_WORKER_ACTIONS=1`; work domain state says the required SQL is not yet applied.
- Expected optimal outcome: A confirmed worker assignment with `check_in_out` permission can append idempotent check-in and check-out events and see those events reflected in work history and manager operations.
- Actual result: The endpoint intentionally returns 503 when the feature flag is off. DB-010 now has a reviewed active migration and contract test locally, but the migration is not applied to isolated staging and the flag remains disabled.
- User impact: Worker shift completion cannot pass the QA-004 pilot chain even if hiring and scheduling succeed.
- Evidence: `app/api/work-mode/assignments/[id]/actions/route.ts`; `supabase/migrations/20260922155356_worker_actions_scope_reconciliation.sql`; `supabase/tests/db010_worker_actions_scope_contract.sql`; `docs/engineering/tasks/active/DB-010.json`; `docs/implementation/ui-ux-completion/MANUAL_SQL_WORK_MODE_WORKER_ACTIONS.md`; `__tests__/work-mode/work-mode-api.test.ts`
- Suspected cause: Manual additive SQL package and staging feature flag have not completed release validation.
- Necessary fix: Apply and verify the reviewed active worker-actions migration through the manual additive process, then enable `FEATURE_WORK_MODE_WORKER_ACTIONS=1` in isolated staging and rerun persona checks.
- Primary owner: `work`
- Secondary collaborators: `database`, `release`, `qa`
- Existing task or new task recommendation: `WORK-006` for worker enablement and `DB-010` for reviewed active SQL and authorization; hosted enablement remains behind DB-008 and release proof.
- New local evidence: The former worker-actions SQL is absent from active migrations and its archived manifest marks it `local_only_unapplied`. The old operator report does not establish the isolated-staging project or hosted schema state. Keep the feature flag disabled until database review and denial probes complete.
- DB-010 source checkpoint (2026-09-22): active forward migration `20260922155356_worker_actions_scope_reconciliation.sql` is authored at SHA-256 `bb85462919f773131e89280e73c4fe4c30feeb00d743982cff38999de8c5530c`; focused migration and chain checks pass. The catalog postflight is authored, but SQL execution, hosted schema parity, distinct-worker denial probes, and the enabled-flag rerun have **not** happened. This finding stays open.
- Acceptance criteria: Feature flag is enabled only after postflight checks; check-in/out and acknowledge events persist idempotently; unauthorized or unassigned workers are denied; worker and manager surfaces show the result.
- Rerun scenario: `sim-worker-01` accepts a scheduled assignment, checks in, checks out, acknowledges a packet, reloads work mode, and manager verifies attendance.

#### SIM-20260922-WORK-003 — Attendance events have no worker/manager read-back path

- Type: Confirmed static product gap; live staging not run
- Severity: P1
- Status: local read-back implemented; staging rerun pending (WORK-006)
- Actor and goal: Worker checks in/out and manager verifies attendance after reload
- Scenario type: Success path / persistence / cross-actor handoff
- Failure point: The worker action API appends `work_mode_check_in_events`, while the current Work Mode and manager attendance views do not read those rows.
- Expected optimal outcome: The worker sees persisted check-in/out history and the scoped manager sees the same attendance state after reload.
- Actual result: Code inspection found the event inserts and retry reads in the action route, but no receiving UI read model; the manager view uses a separate attendance source.
- User impact: A successful append can leave both actors unable to verify the action in the product.
- Evidence: `app/api/work-mode/assignments/[id]/actions/route.ts`; WORK-006 local review; no hosted actor run claimed.
- Suspected cause: Append-only worker action storage was added without an authorized read projection for worker and manager surfaces.
- Necessary fix: Add worker-assignment and resource-scoped manager reads for the appended events, render their latest state and history, and test cross-tenant denial. Keep the feature flag off until the reviewed schema and RLS exist in isolated staging.
- Primary owner: `work`
- Secondary collaborators: `database`, `admin`, `qa`
- Existing task or new task recommendation: `WORK-006`; the database authorization dependency is `DB-010`.
- Local fix evidence: The worker action route now reads only the signed-in worker's owned assignment events, and Work Mode renders persisted history after reload. The event command center now shows the same event-scoped attendance through a `workforce.view` route that revalidates organization and event scope before its privileged read. Focused work-mode tests passed locally; the feature remains disabled until reviewed SQL, RLS, and hosted denial probes are complete.
- Acceptance criteria: Worker and manager see the same ordered check-in/out events after reload; wrong worker and wrong tenant are denied; a retry does not duplicate attendance; staging UI evidence is attached to one deployed SHA.
- Rerun scenario: `sim-worker-01` checks in/out once and retries; `sim-org-manager-01` opens the same assignment after reload, while `sim-foreign-org-manager-01` is denied.

#### SIM-20260922-TIX-001 — Ticketing and marketplace purchases lack QA-004 test-mode evidence

- Type: Missing observed capability evidence
- Severity: P1
- Status: routed
- Actor and goal: Customer buys test-mode tickets or merchandise; artist/manager sees resulting order, ticket, or analytics
- Scenario type: Success path / persistence / payment test mode
- Failure point: Ticketing and marketplace purchase path lacks QA-004 test-mode evidence
- Expected optimal outcome: Customer completes a test-mode purchase and sees order/ticket state; receiving artist or manager sees the resulting sale, ticket, order, or analytics.
- Environment and commit: Local repository and QA state inspection; live staging not run
- Starting state: QA-004 campaign launch without test payment confirmation
- Exact steps: Review QA state, QA-003, and marketplace/ticketing harness references
- Expected result: Campaign records a full test-mode purchase path, persisted order/ticket, and receiving actor visibility.
- Actual result: Existing QA state says money-flow E2E remains incomplete or not freshly observed for this campaign.
- Evidence: `docs/engineering/agents/qa/state.md`; `docs/engineering/tasks/active/QA-003.json`
- Affected route or API: Ticketing, marketplace checkout, orders, wallet, analytics
- User impact: Artist and customer goals around sales, tickets, and merchandise cannot be marked passed.
- Suspected cause: Protected staging fixtures and payment test secrets are not present for QA-004.
- Necessary fix: Provision test-mode checkout fixtures and add one cross-actor purchase scenario to the pilot chain before expanding.
- Primary owner: `qa`
- Secondary collaborators: `ticketing`, `marketplace`, `release`
- Linked existing or new task: Existing `QA-003`, `TICKET-005`, `MKT-004` where applicable.
- Acceptance criteria: Test-mode payment is confirmed, customer order/ticket persists, seller/artist/manager sees the transaction, webhook replay/idempotency remains safe, no production payment key is used.
- Rerun scenario: Customer slice buys a ticket or merch item in test mode, reloads account orders, and receiving actor verifies sale visibility.

#### SIM-20260922-ARTIST-001 — Profile visibility selector does not gate the public profile

- Type: Confirmed static defect (misleading visibility control / privacy failure)
- Severity: P1
- Status: new
- Actor and goal: `sim-artist-01` chooses "Private — invite only" or "Verified users only" and expects the public page and search to honor it
- Scenario type: Unauthorized/privacy + publish-state success path
- Failure point: `contexts/artist-context.tsx` `updateDetailedProfile` persists the selector as `settings.preferences.privacy_settings`; the public read gate `lib/public-artist/get-public-artist-profile.ts:479` and search gate `lib/search/global-search-service.ts:236` only honor `settings.public_profile !== false`. No code writes `public_profile: false` (`grep "public_profile:\s*false"` → none).
- Expected optimal outcome: Changing visibility actually changes public read/no-read behavior; the owner-only private-preview banner is reachable; Private hides the page from non-owners.
- Actual result: Public/Verified/Private options persist into an inert model; `settings.public_profile` stays true; the private-preview banner can never appear through the UI; "Verified users only" is a second dead option.
- User impact: Privacy expectation failure — a private-marked profile stays publicly visible/discoverable.
- Evidence: `app/artist/profile/page.tsx:839-853`; `contexts/artist-context.tsx:842-889`; `lib/public-artist/get-public-artist-profile.ts:475-486`; `lib/search/global-search-service.ts:236`
- Suspected cause: Two visibility models drifted — legacy `privacy_settings` string vs canonical `artist_profiles.settings.public_profile` boolean — and the UI was wired to the inert model.
- Necessary fix: Map the selector to `settings.public_profile` (public→true, private→false; verify or remove the Verified option), add save→reload→public-read parity tests, keep the DB-005 creator-search-projection gate in sync.
- Primary owner: `artist`
- Secondary collaborators: `general-user`, `database`
- Existing task or new task recommendation: New `ARTIST-005`; answers pending handoff `HF-DB-005-ARTIST-CREATOR-FIELDS` assumption 1.
- Acceptance criteria: Setting Private makes `getPublicArtistProfileDTO` return null to a non-owner and shows the private-preview banner to the owner; search projection excludes the profile; focused test covers public/private/verified round-trips.
- Rerun scenario: `sim-artist-01` sets Private, saves, reloads `/artist/[slug]` as owner and logged-out, verifies search discoverability, returns to Public.

#### SIM-20260922-ARTIST-002 — Band public profile can never surface music or storefront

- Type: Missing capability
- Severity: P2
- Status: new
- Actor and goal: `sim-artist-02` (band/collaborator) promotes band music and merch from the canonical band page
- Scenario type: Success path / empty state
- Failure point: `getPublicBandProfileDTO` (`lib/public-artist/get-public-artist-profile.ts:296-383`) hardcodes empty `tracks`/`products`/`media`; `components/public-artist/public-artist-page.tsx:141-147,248` skips storefront loading for `isBand`.
- Expected optimal outcome: A band with accepted members who publish public music/merch shows those on the band public page.
- Actual result: Band pages always render zero music, zero storefront, zero media regardless of member content.
- User impact: Band actors cannot promote music/merch from their canonical surface; band brand goal stalls.
- Evidence: `lib/public-artist/get-public-artist-profile.ts:332-346`; `components/public-artist/public-artist-page.tsx:246-265`
- Suspected cause: Band modeled via `organizer_accounts` + `organization_artist_members`, but content read paths were built only for the single-artist model; no aggregation layer for band pages.
- Necessary fix: Add member-aggregated music/merch to the band DTO respecting `is_public`/`moderation_status`/`rights_confirmed` filters, or explicitly scope band pages; coordinate with music/marketplace ownership.
- Primary owner: `artist`
- Secondary collaborators: `music`, `marketplace`
- Existing task or new task recommendation: New `ARTIST-006`.
- Acceptance criteria: A band with ≥1 accepted member with public approved music renders a playable section; storefront matches member listings; coherent empty state.
- Rerun scenario: `sim-artist-02` publishes a public track as a band member; `sim-customer-01` opens the band page and confirms visibility.

#### SIM-20260922-VENUE-002 — Venue "manage availability" has no shipped write path

- Type: Missing capability (blocks a core goal)
- Severity: P1
- Status: new
- Actor and goal: `sim-venue-manager-01` blocks dates / sets availability (VEN-02), a pilot-chain prerequisite
- Scenario type: Success path / persistence / validation
- Failure point: No `app/api/venue/**` availability route exists; the only `venue_availability` app/lib reference is a client SELECT in `use-venue-calendar-data.ts`; `booking-calendar.tsx` renders hardcoded mock dates with inert buttons; calendar blocked-day cards deep-link to settings with no block manager.
- Expected optimal outcome: A venue manager marks dates unavailable (reason/notes), edits/clears them, sees blocks in the calendar, and `validateVenueAvailability` rejects conflict requests on blocked dates.
- Actual result: Nothing in the tree writes `venue_availability` except the RLS `FOR ALL` operator policy and the booking/reservation engines; blocks can only exist via DB operator or fixture insert.
- User impact: The venue side of the pilot chain (availability) cannot be exercised through the UI; booking validation against manager-created blocks is impossible; VEN-02 rows stay blocked.
- Evidence: `app/venue/hooks/use-venue-calendar-data.ts:93-99`; `app/venue/components/booking-calendar.tsx:18-20,157-169` (zero consumers); `app/venue/dashboard/calendar/page.tsx:67-75`; `app/api/booking-requests/route.ts:342-348`
- Necessary fix: Add a venue-scoped availability API (`POST/PATCH/DELETE /api/venue/availability`) gated by `canManageVenue` and the operator RLS policy; wire a block editor into the dashboard calendar; retire the mock component; add focused tests.
- Primary owner: `venue`
- Secondary collaborators: `database`, `qa`
- Existing task or new task recommendation: New venue availability block-editor task (e.g., `VENUE-004`).
- Acceptance criteria: Manager creates/edits/clears blocks from the UI; blocks persist after reload; org-side booking validation rejects blocked dates; wrong-scope writes denied.
- Rerun scenario: `sim-venue-manager-01` blocks two dates and reloads; `sim-org-manager-01` submits a request for a blocked date and receives a conflict; `sim-foreign-venue-manager-01` is denied writes.

#### SIM-20260922-VENUE-003 — Legacy mock/dead venue components remain in tree with zero consumers

- Type: Design idea / polish debt (duplicate-risk marker)
- Severity: P3
- Status: new
- Actor and goal: Venue manager uses settings and booking surfaces without confusing/inert controls
- Scenario type: Empty state / polish
- Failure point: `app/venue/components/booking-calendar.tsx` and `app/venue/components/settings-view.tsx` (plus legacy twins under `components/venue/`) ship mock data and inert buttons with zero consumers.
- Expected optimal outcome: Dead mock components are removed or wired so QA cannot be misled by decorative UI.
- Actual result: Zero imports of either component; shipped surfaces use `EnhancedSettingsLayout`/server-only `toPublicVenueProfile`; the mock files remain as misleading debt.
- User impact: Static review precedence risk; a rerunner may mistake mock controls for shipped capability.
- Evidence: `app/venue/components/booking-calendar.tsx`; `app/venue/components/settings-view.tsx:181-241`
- Necessary fix: Retire both component files and legacy twins, or wire them to real APIs if still intended.
- Primary owner: `venue`
- Secondary collaborators: `design-system`
- Existing task or new task recommendation: Fold into the recorded venue component-dedup debt or the new venue availability task.
- Acceptance criteria: No mock-data component or button-without-handler remains; build tree has no dangling imports.
- Rerun scenario: Venue settings/calendar static click-through shows only functional controls.

#### SIM-20260922-ORG-001 — Organization event publish/completion has no production UI surface

- Type: Missing capability / dead surface
- Severity: P1 (pilot)
- Status: new
- Actor and goal: `sim-org-manager-01` creates and advances an event (ORG-01/ORG-06/ORG-10)
- Scenario type: Success path / persistence
- Failure point: `app/events/create/page.tsx` → `createEventAction` creates `events_v2` with `status='inquiry'` and redirects to `/events`; `updateEventStatusAction` has zero production UI/service callers (test-only); `isEventsV2PubliclyListable` requires `confirmed|advancing|onsite`.
- Expected optimal outcome: Event becomes publicly listed after a publish step on the org surface.
- Actual result: No publish/completion UI exists on the org surface; events stay `inquiry` and invisible. The admin dashboard surface (org-scoped) works on the same table, richer than `/events/create`.
- User impact: Org manager following the coverage-route hint cannot publish or close an event; ORG-01/06/10 rows blocked.
- Evidence: `app/events/create/page.tsx:20,30-34`; `app/events/_actions/event-actions.ts:110,129`; `app/api/admin/events/[id]/publish/route.ts:17`; `admin/dashboard/events/[id]/page.tsx:1205-1216`
- Necessary fix: Wire `updateEventStatusAction` into the create flow (publish/completion step) or repoint pilot coverage rows off `/events/create`; align CRM status enum with public gating.
- Primary owner: `organization`
- Secondary collaborators: `admin`
- Existing task or new task recommendation: `ORG-006`/`ORG-007` alignment; coverage rows ORG-01/06/10.
- Acceptance criteria: Org-manager event reaches `confirmed` via a production UI path; rerun ORG-01 after env unblocked.
- Rerun scenario: `sim-org-manager-01` creates and publishes a campaign event; customer sees it publicly.

#### SIM-20260922-MKT-002 — Guest order claim is a UI dead end; guest digital downloads unreachable

- Type: Missing capability
- Severity: P1
- Status: new
- Actor and goal: Guest buyer links a paid order to an account and accesses digital downloads
- Scenario type: Success path / persistence / order claim
- Failure point: `app/marketplace/order/[token]/page.tsx:270-293` has no wiring to `app/api/marketplace/order/[token]/claim/route.ts`; `/api/marketplace/delivery/[orderItemId]` denies guests by design.
- Expected optimal outcome: A guest who signs into an account from the "Save your order" prompt has the order linked, sees it in purchases, and can download digital entitlements.
- Actual result: The claim API exists but no UI or auth flow calls it; after sign-in the user returns to the same guest-token page (`isGuest` stays true), the order never appears in purchases, and it is unreachable after the 72h token expiry. Guest entitlements have `buyer_user_id = null`, so delivery can never serve them.
- User impact: Advertised "link your order" promise broken; guests permanently lose receipts and digital goods; support load.
- Evidence: `app/marketplace/order/[token]/page.tsx:270-293`; `app/api/marketplace/order/[token]/claim/route.ts`; `app/api/marketplace/delivery/[orderItemId]/route.ts:32-34`; `webhook-processor.ts:393-416`; `checkout-p6.test.ts:9` (imports but never tests claim)
- Necessary fix: Add a claim trigger (client button or post-login claim when redirect is `/marketplace/order/<token>`), re-query the order after claim so the CTA disappears, resolve guest entitlements to the claimed user, cover claim + claimed-order access + download in tests.
- Primary owner: `marketplace`
- Secondary collaborators: `general-user`, `qa`
- Existing task or new task recommendation: Extend `MKT-005` or new `MKT-006`.
- Acceptance criteria: Guest order is claimable from the UI by a matching-email signed-in user; claimed order appears in purchases and survives token expiry; wrong-email/different-user denied; downloads work after claim.
- Rerun scenario: Guest checkout → receipt → "Save your order" → sign up → order linked and visible in purchases → download works; different-email sign-in is denied.

#### SIM-20260922-MKT-003 — No marketplace UI for buyer cancellation or seller refund

- Type: Missing capability
- Severity: P1
- Status: new
- Actor and goal: Buyer cancels a pending order; seller refunds a paid order
- Scenario type: Cancellation or retry / refund / persistence
- Failure point: Cancel and refund routes exist with correct scoping, but no product surface calls them; the seller store dashboard renders orders read-only.
- Expected optimal outcome: Buyer can cancel pending/abandoned orders and seller can refund from the UI with idempotent retry.
- Actual result: Grep for the cancel/refund routes finds only Jest suites; `/marketplace` `checkout=cancelled` banner does not cancel the created pending order; `/marketplace/purchases` has no cancel/refund affordance. Cancel/refund requires a direct API call — a runbook-forbidden bypass.
- User impact: Refund/cancel scenarios cannot pass through the UI; abandoned checkouts leave visible "Awaiting payment" orders forever.
- Evidence: `app/api/marketplace/orders/[id]/cancel` and `.../refund` routes; `components/marketplace/seller-store-dashboard.tsx:1675-1732`; `app/marketplace/page.tsx:324-326`; `app/marketplace/purchases/page.tsx`
- Necessary fix: Add buyer cancel button (pending orders) and seller refund action (paid orders), wiring the existing idempotent routes; include empty/disabled states.
- Primary owner: `marketplace`
- Secondary collaborators: `general-user`, `qa`
- Existing task or new task recommendation: Fold into `MKT-005` or new `MKT-007`.
- Acceptance criteria: Buyer cancels a pending order and sees cancelled state + payout hold; seller refunds with idempotency and sees audit entries; retry does not double-cancel/refund.
- Rerun scenario: `sim-customer-01` cancels an abandoned order; `sim-artist-01` refunds a paid order; both reload to verify persistence.

#### SIM-20260922-WORK-004 — Worker has no work-history surface

- Type: Missing capability (feature gap)
- Severity: P2
- Status: new
- Actor and goal: Worker views completed/cancelled/declined work after a shift
- Scenario type: Success path / persistence
- Failure point: `getWorkModeAssignments` filters `.in("status", ["invited","confirmed","active"])` (`lib/work-mode/read-model.ts`); `EmploymentAssignmentStatus` includes `completed|cancelled|declined`, but no worker-facing surface lists terminal assignments; events workspace and assignment detail vanish once status leaves the active set.
- Expected optimal outcome: Completed assignments visible in a work history (dates, role, org, earnings/attendance summary).
- Actual result: The moment a shift/assignment completes it is invisible to the worker — no history exists.
- User impact: Work-journey claim unmet; completed-work record unavailable; achievements "work history" has no confirmed data source.
- Evidence: `lib/work-mode/read-model.ts`; `types/hiring-roster-work-mode.ts`; absence of any history surface in the work-mode views
- Necessary fix: Add a worker history read (status param or separate endpoint with the same scope guards), a Work Mode "history" view, and a completed-assignment test case.
- Primary owner: `work`
- Secondary collaborators: None
- Existing task or new task recommendation: Attach to `WORK-007` area or new task.
- Acceptance criteria: Worker with a completed assignment sees it under a work history section with role/org/date/status; API returns terminal-status rows only to the owning user.
- Rerun scenario: Worker complete-shift → history.

### Design ideas

None recorded yet.

### Harness or fixture gaps

#### SIM-20260922-QA-001 — Live simulation blocked by missing isolated-staging packet

- Type: Harness or fixture gap
- Severity: P0
- Status: routed (RELEASE-007, QA-003, QA-004)
- Actor and goal: All actors
- Scenario type: Environment setup
- Failure point: Campaign header lacks isolated staging URL, deployed commit, actor secret references, and test payment confirmation
- Expected optimal outcome: Agents can run live UI journeys against a known isolated staging deployment with campaign-owned actors and test payment mode.
- Environment and commit: Local repository at `623b576b7963d4a2eccb2fbf83f24f2011842a83`
- Starting state: User requested all simulation agents launch
- Exact steps: Checked QA-004 runbook/evidence, environment references, QA-003, and existing QA scripts
- Expected result: Base URL, deployed commit, campaign ID, protected actor secret references, synthetic IDs, and test payment mode are recorded before agents run live UI journeys.
- Actual result: These fields remain pending, so agents cannot safely mutate data or claim live journey results.
- Evidence: This campaign file; `docs/engineering/agent-user-simulation-runbook.md`; `docs/engineering/tasks/active/QA-004.json`
- Affected route or API: All simulation journeys
- User impact: No worker, artist, venue, organization, admin, or customer journey can be marked passed yet.
- Suspected cause: Campaign scaffolding exists, but the isolated staging packet has not been provisioned.
- Necessary fix: Release/QA should fill the campaign header with staging URL, exact deployed SHA, protected secret references, test payment confirmation, and campaign ID.
- Primary owner: `release`
- Secondary collaborators: `qa`
- Linked existing or new task: `QA-004`, `QA-003`, release staging tasks
- Acceptance criteria: Campaign header is complete, credentials are referenced only by protected secret names, `/api/health` or approved equivalent identifies deployed commit, payment mode is verified as test mode.
- Rerun scenario: Orchestrator reruns readiness and launches the pilot chain without environment blocker.

#### SIM-20260922-QA-002 — Existing seed scripts are unsafe as first campaign provisioners

- Type: Harness or fixture gap
- Severity: P0
- Status: ready for rerun (QA-005 local provisioner; isolated staging pending)
- Actor and goal: All actors
- Scenario type: Fixture/provisioning
- Failure point: Existing seed scripts can adopt or modify matching users
- Expected optimal outcome: Campaign actor provisioning creates or verifies only campaign-owned identities and refuses ambiguous existing accounts.
- Environment and commit: Local repository inspection
- Starting state: Candidate reuse of West Coast and multi-persona QA scripts
- Exact steps: Inspect `scripts/qa/seed-tour-flow-cast.ts` and existing QA account matrix warnings
- Expected result: Provisioning touches only campaign-owned identities and never updates unrelated users.
- Actual result: The West Coast cast seed updates password and metadata for a matching email. Existing QA docs warn older seed adoption may remap real Demo-project user emails.
- Evidence: `scripts/qa/seed-tour-flow-cast.ts`; `docs/qa-account-matrix.md`
- Affected route or API: Synthetic identity provisioning
- User impact: Running the seed blindly could modify a non-campaign account.
- Suspected cause: Older QA scripts were built for controlled demos, not the stricter QA-004 campaign rules.
- Necessary fix: Create an additive campaign provisioner that refuses existing non-campaign users, requires a campaign prefix/run ID, and writes a non-secret actor manifest.
- Primary owner: `qa`
- Secondary collaborators: `database`
- Linked existing or new task: `QA-005`.
- Local fix evidence: Campaign Auth provisioner refuses untagged collisions, requires distinct staging targets and exact release/deployment headers, creates no privileges, and writes a non-secret manifest. Five focused Vitest tests passed. No hosted Auth action was made.
- Acceptance criteria: Provisioner refuses untagged existing users, never resets passwords for non-campaign identities, writes non-secret actor IDs, and labels all fixture bypasses.
- Rerun scenario: QA slice provisions a fresh campaign actor roster and verifies rerun does not mutate non-campaign users.

#### SIM-20260922-DB-001 — Hosted security and schema reconciliation blockers prevent authoritative simulation results

- Type: Harness or fixture gap
- Severity: P0
- Status: routed
- Actor and goal: All actors, especially commerce, hiring, admin boundary, and RLS denial checks
- Scenario type: Environment setup / data boundary
- Failure point: Hosted migration ledger and critical security probes remain unresolved
- Expected optimal outcome: Simulation runs against a reconciled hosted schema with known migration history and verified authorization boundaries.
- Environment and commit: Existing task record inspection
- Starting state: QA-004 live run requested before hosted DB tasks are closed
- Exact steps: Review `DB-002` and `DB-008`
- Expected result: Hosted staging schema, migration ledger, and critical authorization fixes are reconciled before campaign results are treated as authoritative.
- Actual result: `DB-002` remains active with hosted application/probes outstanding; `DB-008` records 287 unclassified migrations and unverified environment history.
- Evidence: `docs/engineering/tasks/active/DB-002.json`; `docs/engineering/tasks/active/DB-008.json`
- Affected route or API: Database-backed simulations across hiring, scheduling, commerce, admin, and RLS checks
- User impact: Agents can find risks, but a pass/fail result may not represent the intended release schema.
- Suspected cause: Hosted migration history and schema ledger are still being reconciled under CP-051.
- Necessary fix: Finish the additive hosted ledger and security-denial probes before treating QA-004 as release-quality evidence.
- Primary owner: `database`
- Secondary collaborators: `release`, `qa`
- Linked existing or new task: Existing `DB-002`, `DB-008`, `QA-003`
- Acceptance criteria: Hosted ledger is reconciled, critical SECURITY DEFINER exposure is denied to anon/PUBLIC as intended, generated types match the staged schema, and release/QA can cite exact evidence.
- Rerun scenario: Auth/database boundary slice runs denial probes and schema parity checks before product actor journeys.

#### SIM-20260922-DB-003 — Working-tree migration edits invalidate DB-008 ledger digest

- Type: Test harness gap / schema-source drift
- Severity: P2 (local)
- Status: new
- Actor and goal: All actors; DB-008 schema-parity evidence quality
- Scenario type: Persistence / schema parity (harness)
- Failure point: `docs/engineering/migration-validation/hosted-history-ledger.json` `sourceSnapshot.digestSha256` vs the active chain
- Expected optimal outcome: `npm run check:migration-ledger` matches the current tree, and ledger/type evidence always names the tree state it was computed from.
- Actual result: Three active migrations were edited in the uncommitted worktree (`20260701021033_job_application_profile_snapshot.sql`, `20260717194541_harden_security_audit_remediation.sql`, `20260825130000_phase3_message_attachments_bucket_private.sql`, +83/−29); `check:migration-ledger` now exits non-zero on digest mismatch (was green at DB-008's 16:18:55Z checkpoint). `check:database-types` is Docker-blocked so type drift cannot be re-proven locally.
- User impact: Risk of stale or contradictory local ledger evidence; the storage-policy edits must be attributed and committed before any type-regeneration/apply claim.
- Evidence: `git diff --stat supabase/migrations/` (3 files); per-file SHA-256 working-tree vs HEAD; ledger `digestSha256 ba0ecbbb…` with `capturedAt 2026-09-22T15:57:33Z`
- Suspected cause: Concurrent admin/logistics hardening wave edited active migrations without refreshing the ledger digest.
- Necessary fix: Commit/attribute the storage-policy hardening wave (reviewed: no RLS loosening), then refresh the ledger digest and re-run DB-008 local checks; keep `check:database-types` gated on an available Docker target.
- Primary owner: `database`
- Secondary collaborators: `qa`, `release`
- Existing task or new task recommendation: `DB-008` ledger refresh (note drift in checkpoints).
- Acceptance criteria: `check:migration-ledger` green in a clean tree at a recorded SHA; no hosted apply claim precedes ledger refresh.
- Rerun scenario: Re-run ledger + chain checks after the wave is committed on the next recorded SHA.

## Bypasses

| Bypass ID | Scenario | Why bypass was used | User-facing step not tested | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| None | | | | | |

## Follow-up tasks

| Finding ID | Task ID | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| `SIM-20260922-ADMIN-001` | `ADMIN-003` | `admin`, `work`, `venue`, `database` | Existing active | Add method-specific follow-up if not already covered by ADMIN-003. |
| `SIM-20260922-ADMIN-002` | `ADMIN-003` | `admin`, `venue`, `database` | Existing active | Depends on venue-to-org linkage decision. |
| `SIM-20260922-WORK-001` | `WORK-005` | `work`, `database`, `qa` | Active | Canonical staff member plus shift lifecycle; live cross-actor proof pending. |
| `SIM-20260922-WORK-002` | `DB-010` → `WORK-006` | `database`, `work`, `release`, `qa` | Active | Review/add active worker-actions migration, then enable staging flag after postflight. |
| `SIM-20260922-WORK-003` | `WORK-006` / `DB-010` | `work`, `database`, `admin`, `qa` | Active | Local read-back exists; database scope and exact-SHA actor proof pending. |
| `SIM-20260922-TIX-001` | `QA-003`, `TICKET-005`, `MKT-004` | `ticketing`, `marketplace`, `qa` | Existing active | Needs test-mode purchase evidence. |
| `SIM-20260922-MKT-001` | `MKT-005` / `MKT-004` | `marketplace`, `qa`, `integrations` | Active | Fix authenticated checkout success redirect and add branch coverage. |
| `SIM-20260922-SOC-001` | `SOCIAL-005` | `social`, `general-user`, `qa` | Active | Consolidate follow endpoint contract and idempotent retry behavior. |
| `SIM-20260922-QA-001` | `QA-004`, `QA-003` | `qa`, `release` | Existing active | Fill isolated-staging packet. |
| `SIM-20260922-QA-002` | `QA-005` | `qa`, `database` | Active | Build campaign-safe additive provisioner. |
| `SIM-20260922-DB-001` | `DB-002`, `DB-008` | `database`, `release`, `qa` | Existing active | Needed before authoritative hosted pass results. |
| `SIM-20260922-VENUE-001` | `VENUE-005` + `DB-002`/`DB-008` | `venue`, `database`, `qa` | Active | Additive RLS fix (anon/authenticated raw reads) + hosted denial probes. Cross-audited as `SIM-20260922-DB-002`. |
| `SIM-20260922-VENUE-002` | `VENUE-004` (availability) | `venue`, `database`, `qa` | Active | No availability write path; build venue-scoped block editor. |
| `SIM-20260922-VENUE-003` | Venue component-dedup debt | `venue`, `design-system` | Recommended | Retire mock/dead venue components. |
| `SIM-20260922-ARTIST-001` | `ARTIST-005` | `artist`, `general-user`, `database` | Active | Map visibility selector to `settings.public_profile`; answers `HF-DB-005` assumption 1. |
| `SIM-20260922-ARTIST-002` | `ARTIST-006` | `artist`, `music`, `marketplace` | Active | Band page music/storefront aggregation. |
| `SIM-20260922-ORG-001` | `ORG-006`/`ORG-007` | `organization`, `admin` | Active | Org event publish/completion UI. |
| `SIM-20260922-ORG-002` | `ORG-006` | `organization`, `admin` | Active | Event PATCH should use org + capability. |
| `SIM-20260922-ORG-003` | `ORG-008` | `organization`, `work`, `admin` | Active | Org job postings show org name/badge. |
| `SIM-20260922-ADMIN-003` | Extend `ADMIN-003` | `admin`, `music`, `qa` | Active | music-marketplace/ops → `withPlatformAdmin`; fix registry drift. |
| `SIM-20260922-ADMIN-004` | Extend `ADMIN-003` | `admin`, `music`, `database` | Active | Four music content/royalties routes same drift class. |
| `SIM-20260922-USER-001` | `MKT-006` | `marketplace`, `general-user`, `qa` | Active | Fix guest claim CTAs to `/login?tab=...`. |
| `SIM-20260922-MKT-002` | `MKT-006` | `marketplace`, `general-user`, `qa` | Active | Wire guest order claim + guest entitlement resolution. |
| `SIM-20260922-MKT-003` | `MKT-007` | `marketplace`, `general-user`, `qa` | Active | Buyer cancel + seller refund UI. |
| `SIM-20260922-MKT-004` | `MKT-004`/`MKT-005` | `marketplace`, `integrations`, `database`, `qa` | Active | Checkout idempotency attempt lifecycle + session-expired reconciliation. |
| `SIM-20260922-MKT-005` | `MKT-008` (+ `MKT-005`) | `marketplace`, `general-user`, `qa` | Active | Digital download client + atomic count. |
| `SIM-20260922-SOC-003` | `SOCIAL-007` | `social`, `database`, `qa` | Active | Interaction-stats GET visibility/ownership gates. |
| `SIM-20260922-MUS-001` | `MUSIC-006` | `music`, `qa`, `database` | Active | Play route fail-closed persistence contract. |
| `SIM-20260922-WORK-004` | `WORK-008` | `work` | Active | Worker work-history surface. |
| `SIM-20260922-WORK-005` | `WORK-009` | `work` | Active | Unified /api/jobs pagination truncation. |
| `SIM-20260922-DB-003` | `DB-008` | `database`, `qa`, `release` | Existing active | Refresh ledger digest after storage-policy wave commits. |
| Mobile coverage and preview gate | `QA-006` | `qa`, `release`, product domains | Active | Run shipped iOS/Android journeys on preview builds targeting the recorded staging SHA. |

### Read-only hosted readiness probe — 2026-09-22

`GET /api/health` returned 200 on both `demo.tourify.live` and `tourify.live`, but neither response included `x-tourify-release-sha`. Both responses advertised the same Supabase origin in their public `Content-Security-Policy` connection list. This is not isolation evidence; it reinforces the RELEASE-007 and QA-003 blockers. No authenticated request, fixture, database mutation, or payment action was made. Do not provision actors or run live simulation against either domain until separate deployment, database, and credential proof is recorded.

## Dependency and fix queue

The orchestrator owns ordering and one primary domain owner per task. Domain task checkpoints hold implementation evidence; QA-004 holds actor evidence and rerun decisions.

| Order | Task(s) | Gate to unlock next step | Current evidence |
| --- | --- | --- | --- |
| 1 | `RELEASE-007`, `DB-008`, `DB-002`, `QA-003` release identity | Separate deployment/DB/secrets, reconciled ledger, denied anonymous critical RPCs, exact SHA, test payments | Hosted proof pending; do not run live personas |
| 2 | `QA-005`, `QA-006` | Campaign-owned actors plus iOS/Android preview contract and non-secret manifests | Local provisioner and mobile gate implemented; hosted run pending |
| 3 | `ADMIN-003`, `MKT-005`/`MKT-004`, `TICKET-005`, `WORK-005`, `DB-010` → `WORK-006` | Scoped admin, buyer return, transactions, canonical shifts, worker actions | Admin scope, buyer return, shift bridge, worker-action migration, and attendance read-back fixed locally; staging apply and reruns pending |
| 4 | `SOCIAL-005` and later P2/P3 findings | Consistent follow retry and other owned improvements | Follow contract fixed locally; staging rerun pending |
| 5 | `QA-004`, `QA-003`, `QA-006`, `RELEASE-005` | All shipped core rows and both productions pass on recorded release; no P0/P1 | Not eligible yet |

## Completion decision

`QA-004` stays active until all shipped core web, iOS, and Android rows are attempted and pass applicable scenarios; single-event and multi-stop productions pass through both sides of each handoff; no bypass is credited; all P0/P1 findings are verified; and every P2/P3 improvement has an owned task. `QA-003` certifies the exact-SHA web release, `QA-006` supplies mobile preview evidence, and `RELEASE-005` alone controls production promotion.

## Run reports

### Initial setup record

- Date: 2026-09-22
- Status: Not run
- Summary: Campaign task, runbook, and evidence template were created. Live staging execution is pending isolated staging URL, deployed commit, protected synthetic credentials, test payment configuration, and campaign-safe fixture provisioning.

### Agent launch attempt — 2026-09-22

- Status: Blocked before live UI mutation
- Agents launched: Artist/customer, worker/organization/venue, and platform-admin/QA slices
- Guardrails honored: no database reset, no deletion, no seed run, no Supabase mutation, no payment action, no credential publication
- Summary: Agents ran the safe phase of QA-004: readiness checks plus static route, task, and harness inspection. All slices agreed that live journeys cannot be credited until the isolated-staging packet, protected synthetic actor credentials, test payment configuration, and campaign-safe fixture provisioning exist.
- Blocked actor goals: worker hiring/onboarding/shift lifecycle; artist publish/discovery/sales; venue and organization booking/scheduling; platform-admin oversight; customer follow/message/purchase/settings; ticketing and marketplace test purchases; music/social notification paths.
- New findings recorded: `SIM-20260922-ADMIN-001`, `SIM-20260922-ADMIN-002`, `SIM-20260922-WORK-001`, `SIM-20260922-TIX-001`, `SIM-20260922-QA-001`, `SIM-20260922-QA-002`, `SIM-20260922-DB-001`.

### Safe simulation/debug launch — 2026-09-22

- Status: Static/debug simulation completed; live staging mutation still blocked by missing staging packet.
- Agents covered: Worker, artist, venue manager, organization manager, platform admin, customer/general user, marketplace/ticketing, music/social/content, auth/database boundary.
- Guardrails honored: no database reset, no destructive cleanup, no seed run, no Supabase mutation, no payment action, no credential publication.
- Checks run: `npx vitest run __tests__/work-mode/work-mode-api.test.ts lib/marketplace/__tests__/checkout-p6.test.ts __tests__/social/follow-friend-ecosystem.test.ts __tests__/artist/artist-music-surface.test.ts __tests__/ticketing/permissions.test.ts` passed with 4 files and 18 tests. One requested test path did not match a collected test file, but the command exited successfully.
- New findings recorded: `SIM-20260922-MKT-001`, `SIM-20260922-SOC-001`, `SIM-20260922-WORK-002`.
- Duplicates reinforced: `SIM-20260922-QA-001`, `SIM-20260922-QA-002`, `SIM-20260922-DB-001`, and `SIM-20260922-TIX-001` remain blockers for live UI proof.
- Next rerun order: fix isolated staging packet and safe provisioning, fix authenticated marketplace success redirect, enable verified worker actions, then run customer purchase plus worker shift completion through the UI.

### Local implementation wave — 2026-09-22

- Status: Local code and documentation implemented; no live persona journey or hosted transaction passed.
- Coverage: 718 candidate persona × goal × platform × scenario rows remain unrun until visible shipping classification and isolated-staging actors exist.
- Local repairs: campaign-safe actor provisioner, mobile evidence gate, authenticated buyer checkout return, canonical hire-to-shift bridge, worker/manager attendance read-back, and idempotent follow contract.
- Verification: focused fixture, mobile, marketplace, staffing, work-mode, and social tests passed; control-plane and coverage inventory validation passed. Each domain task holds the command details and limitations.
- Read-only deployment check: both public health endpoints lacked a release SHA and advertised the same Supabase origin. The worker-actions SQL is absent from active migrations and marked `local_only_unapplied` in the archive. The feature flag stays off.
- Next: prove distinct staging deployment, Supabase project and secrets; reconcile hosted schema and authorization; supply protected actor secrets and preview builds; provision campaign actors; classify shipped actions; run pilot, event, and tour chains with receiving-side evidence on one deployed SHA.

### Orchestrator completion dispatch — 2026-09-22

- Status: Four bounded Codex task lanes launched from the user's orchestrator request; live simulation remains blocked until their release, database, QA, and product gates provide proof.
- Lanes launched:
  - Release staging gate: `client-new-thread:4d7e1926-a341-4411-8b8d-b70d0d282c36`
  - DB/security campaign gate: `client-new-thread:2e3baaf8-2249-4b14-a73e-218689c89bae`
  - QA simulation campaign gate: `client-new-thread:4dde52b5-6f44-4db5-8d03-f529d2207627`
  - Product repair validation: `client-new-thread:0ef1fefa-4428-463e-9c07-ead2660fb188`
- Guardrails: agents were instructed to preserve unrelated changes, update task records, avoid hosted mutation without isolated staging proof, and avoid claiming any live persona pass without exact deployed SHA, separate staging database, Stripe test mode, protected actors, and mobile preview evidence.
- Current central validation: `npm run qa:simulation:coverage` reports 718 valid rows, 0 shipped, 0 passed, and 718 awaiting UI classification.
- Next: collect lane outputs, reconcile accepted patches through the owning task records, then run the campaign provisioner and pilot only after `RELEASE-007`, `DB-008`, `DB-002`, `QA-003`, `QA-005`, and `QA-006` gates are satisfied.

### Product repair local rerun — 2026-09-22

- Status: Local contracts pass in the dirty shared worktree at HEAD `623b576b7963d4a2eccb2fbf83f24f2011842a83`; no deployed SHA or actor journey is credited.
- Marketplace: all checkout Jest suites passed (3 files, 11 tests), covering authenticated and guest return branches and buyer access. Focused checkout/order lint passed.
- Staffing and Work Mode: four hiring suites passed (22 tests); the broader Work Mode and staffing selection passed (9 files, 47 tests). The two worker action and manager attendance suites passed independently (15 tests). Focused route and shift-sync lint passed.
- Social: canonical and legacy follow route plus artist feed/network client suites passed (4 files, 16 tests). Focused follow-route lint passed.
- Ticketing: all 15 focused ticketing files passed (120 tests), including refund replay and request-scoped purchase idempotency. Scoped diff whitespace check passed.
- Local review found no additional bounded code repair that removes the current event/tour gate. Distributed first-request ticket purchase idempotency remains owned by `DB-005`; worker-actions SQL review by `DB-010`; hosted schema/RLS, isolated staging, protected actors, and Stripe test-mode evidence remain open. All campaign coverage rows remain unrun.
- Coverage validator: `npm run qa:simulation:coverage` passed with 718 valid rows, 0 shipped, 0 passed, and 718 awaiting UI classification. `npm run agents:validate` passed with 17 agents, 122 tasks, 0 warnings, and 0 errors.

### QA-004 product repair validation rerun (2026-09-22)

- Base commit: `623b576b7963d4a2eccb2fbf83f24f2011842a83`; product changes are uncommitted in the shared working tree. This is local verification, not an exact deployed SHA.
- Checkout and buyer order access: Jest 3 suites / 11 tests passed. Marketplace lifecycle: Vitest 15 files / 147 tests passed.
- Canonical hire/shift bridge: Vitest 4 files / 23 tests passed. Worker action and attendance read-back: Vitest 2 files / 15 tests passed.
- Follow route and visible clients: Vitest 4 files / 16 tests passed. Ticketing lifecycle: Vitest 15 files / 120 tests passed. Focused `git diff --check` passed.
- Local fix findings `SIM-20260922-MKT-001`, `SOC-001`, `WORK-001`, and `WORK-003` remain ready for staging rerun; `WORK-002` and `TIX-001` remain blocked. No campaign coverage row is marked passed.
- Next rerun gate: prove RELEASE-007 staging isolation and exact deployed SHA; DB-008 schema ledger plus DB-002 denial probes; DB-010 reviewed additive worker-actions migration and postflight; protected QA-005 actors and Stripe test mode. Then enable the worker flag and run customer/buyer/seller, worker/manager/foreign-tenant, and customer/artist follow flows through the UI on that SHA.

#### SIM-20260922-SOC-002 — Follow count trigger chain may multiply updates

- Type: Confirmed static migration-chain defect; hosted manifestation unverified.
- Severity: P1 until hosted trigger inventory and count probes establish actual behavior.
- Status: routed to `SOCIAL-005` with Database review required.
- Actor and goal: Customer follows an artist once; both accounts see accurate persisted follower and following counts after reload.
- Failure point: Active migrations declare `follow_counts_trigger`, `trigger_follows_insert`, `trigger_follows_delete`, `trigger_follows_count_update`, and `trigger_update_follower_counts` on `follows`. Each later migration drops only its own trigger name.
- Evidence: `supabase/migrations/20241220000010_enhance_feed_system.sql`, `20250131000004_friend_suggestions_system.sql`, `20250210000000_complete_follow_friend_system.sql`, and `20250211000000_production_schema_optimization.sql`.
- Expected outcome: One inserted or deleted relationship changes each corresponding profile count once; duplicate follow retry changes neither count nor side effects.
- Necessary fix: Database owner inventories hosted triggers and reconciles the active chain with a reviewed additive migration; repair any observed counter drift using a bounded, reviewed procedure.
- Rerun: On isolated staging and the exact deployed SHA, capture before/after counts for one follow, duplicate retry, and unfollow from two actors, then reload both views. Do not credit the count portion of `SOCIAL-005` from mocked route tests.

### Thin pilot preflight — 2026-09-22 16:16 UTC

- Status: **not run**. The [eight-step pilot and evidence checklist](../../engineering/qa004-thin-pilot.md) are prepared for one campaign-owned web event and test-mode merch purchase; all actor and receiving-side UI results remain uncredited.
- Read-only GET `/api/health` on both `demo.tourify.live` and `tourify.live` returned 200. Neither response supplied `x-tourify-release-sha`, `x-tourify-deployment-id`, `x-tourify-supabase-origin`, or `x-tourify-stripe-mode`; both advertised the same Supabase origin in Content-Security-Policy. This cannot establish separate staging deployment, database, or Stripe mode. No authenticated request or hosted mutation was made.
- Existing blockers remain linked: `SIM-20260922-QA-001` (`RELEASE-007`, `QA-003`), `SIM-20260922-DB-001` (`DB-008`, `DB-002`), `SIM-20260922-QA-002` (`QA-005`), `SIM-20260922-WORK-002` (`DB-010`, `WORK-006`), and `SIM-20260922-TIX-001` (`TICKET-005`). The local admin, checkout, shift, and follow repairs still need exact-SHA actor reruns. No new domain defect is claimed by this preflight.
- Local coverage inventory: 718 valid rows, 0 shipped classifications, 0 passed, 718 awaiting UI classification. The final coverage gate fails as expected on unclassified rows. Mobile preview builds and device observations are absent; `QA-006` remains blocked for mobile and the full matrix.
- Focused local checks: QA-005 actor provisioner 8/8 tests and QA-006 mobile gate 7/7 tests passed; control-plane validation passed with 17 agents and 122 tasks. These validate guards only, not hosted actors or devices.
- Exact next rerun: attach independent `RELEASE-007` deployment/DB/secret-scope proof and full SHA; reconcile `DB-008` and run `DB-002` denial probes; apply and prove `DB-010` before enabling `WORK-006`; confirm Stripe test mode; run `QA-005` provisioning for a fresh campaign ID; then execute steps 1–8 from the pilot document on that deployment, recording both sides of each handoff.

### QA-005 / QA-006 operator readiness — 2026-09-22

- [Actor and mobile operator packet](qa005-actor-provisioning-packet-2026-09-22.md) lists all eleven protected `QA_CAMPAIGN_*` inputs, the twelve Auth-only manifest actors, the preview evidence shape, and the web pilot order. Every input is absent in this runner. No manifest or protected evidence directory has been created.
- Read-only GET health probes returned 200 from demo and production, with no release SHA, deployment ID, Supabase-origin, or Stripe-mode headers. Both CSPs still advertise the same Supabase origin. The prior RELEASE-007 Vercel inspection maps both aliases to one deployment. Actor provisioning and the pilot remain stopped.
- Focused local validation: actor provisioner 8/8 tests, mobile gate 7/7 tests, launch fixture contract passed, mobile typecheck passed, coverage inventory 718 valid rows with 0 shipped and 0 passed, and `agents:validate` passed with 17 agents and 122 tasks. The final coverage gate remains red on unclassified rows as designed. No Auth, database, payment, preview build, device, or live UI action occurred.
- Next order: RELEASE-007 isolated staging and exact-SHA packet; DB-008 ledger/schema plus DB-002 denial proof; protected Stripe test mode and QA-005 inputs; fresh campaign Auth manifest; DB-010 hosted worker-action postflight and denial proof before WORK-006 flag; then the eight-step web pilot with receiving-side evidence. QA-006 iOS/Android preview evidence is required before mobile rows or the full matrix can pass.

### Agent user simulation launch round — 2026-09-23

- Status: Safe/static phase completed across all nine journey slices; live UI mutation still blocked by the unchanged environment gates. Reads reflect HEAD `d2176904` (the QA simulation campaign staging-gates commit) plus the dirty working tree.
- Agents launched (all read-only, per runbook journey ownership): worker, artist, venue, organization, platform admin, customer/general user, marketplace/ticketing, music/social/content, auth/database boundary.
- Guardrails honored: no database reset/delete/truncate/seed/provision, no migration apply, no payment action, no Supabase mutation, no credential publication, no file edits by agents (findings returned to the orchestrator for consolidation).
- Environment blockers re-confirmed: `SIM-20260922-QA-001` (RELEASE-007 packet: `demo.tourify.live` == production deployment `dpl_3tW7rRYa6chWxG7U7FDdLi7ZLngK`; `/api/health` omits all four `x-tourify-*` identity headers), `SIM-20260922-QA-002` (QA-005 provisioner implemented, 8/8 tests, but not run — all eleven `QA_CAMPAIGN_*` inputs absent), `SIM-20260922-DB-001` (DB-002/DB-008 hosted proof pending; anon/PUBLIC EXECUTE on the four SECURITY DEFINER functions still un-revoked), `SIM-20260922-TIX-001` (no Stripe test-mode proof).
- Focused verification totals across slices: worker 111 tests, artist 59, venue 34, organization 63, platform admin 28 (+ admin-route registry 54/54 exact), customer 23, marketplace/ticketing 26, music/social/content 16+ follow suites, database provisioner 8/8 (`check:migration-ledger` now fails on a digest drift — see `SIM-20260922-DB-003`). No failing product test was observed.
- New findings recorded (20): confirmed defects `VENUE-001`, `ADMIN-003`, `ADMIN-004`, `ORG-002`, `ORG-003`, `USER-001`, `MKT-004`, `MKT-005`, `SOC-003`, `MUS-001`, `WORK-005`; missing capabilities `ARTIST-001`, `ARTIST-002`, `VENUE-002`, `VENUE-003`, `ORG-001`, `MKT-002`, `MKT-003`, `WORK-004`; harness gap `DB-003`. The database slice additionally cross-audited the venue RLS boundary as `DB-002` (P0, validates and extends `VENUE-001`).
- Task routing created: twelve bounded tasks now own the new findings — `VENUE-004` (availability write path) and `VENUE-005` (availability/reservations RLS boundary) for venue; `ARTIST-005` (visibility selector gate) and `ARTIST-006` (band public profile aggregation); `ORG-008` (org job postings surface); `WORK-008` (work-history surface) and `WORK-009` (jobs pagination truncation); `MKT-006` (guest order claim / dead CTAs), `MKT-007` (buyer cancel / seller refund), `MKT-008` (digital delivery); `SOCIAL-007` (interaction-stats service-role leak); `MUSIC-006` (play route fail-closed). Findings already covered by active tasks were linked in-place: `ADMIN-003`, `ORG-006`, `MKT-004`/`MKT-005`, `DB-002`, `DB-008`, and `VENUE-003`→`VENUE-002` component-tree debt.
- Existing findings advanced to ready-for-rerun with local fixes: `MKT-001` (order UUID + session binding; order-access/success-url 7/7 and checkout Jest suites green) and `SOC-001` (canonical follow route; net-new read-contract portions folded in). `WORK-001/002/003` remain staging-gated behind `DB-010`/`WORK-006`.
- Cover-to-pass: 718 candidate rows still 0 shipped / 0 passed and awaiting UI classification. No live persona journey was credited.
- Next rerun order: close RELEASE-007 isolation + exact SHA, DB-008 ledger + DB-002 denial probes (incl. new venue availability/reservations boundary), Stripe test mode, QA-005 provisioning, and DB-010 worker-action postflight; then rerun the thin-web pilot with the highest-priority product gates (`ARTIST-001` visibility, `VENUE-002` availability write path, `ORG-001` event publish, `MKT-002` order claim) fixed before the first credited chain.
