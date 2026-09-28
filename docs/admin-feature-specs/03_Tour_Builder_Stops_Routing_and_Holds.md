# Tour builder, stops, routing, travel days, and holds

## Outcome

Turn the existing modern builder into an authoritative, versioned tour-planning workspace. Users must be able to create, attach, reorder, detach, and compare stops; model travel/rest days and venue holds; calculate feasible route legs; resolve conflicts; and publish a reproducible plan without JSON/relational drift.

## Current baseline and gaps

- The builder has autosave, readiness UI, ordered stops, markets/dates, existing-event attachment, and a good handoff to the command center.
- `tours`, `events_v2`, and `tour_events` are a credible core, but submitted updates are additive: omitted stops are not detached.
- Route settings/JSON and relational stop links can disagree.
- There is no normalized route-leg/travel-day model, distance/duration, time-zone/border/ferry context, driver-hours/rest validation, or scenario comparison.
- Holds/options, competing dates, expiration, confirmation history, and venue availability are not modeled.
- Current duplicate-ordinal readiness logic tests loop indices rather than stored ordinals and cannot detect the stated conflict.
- Builder settings can silently seed invented shifts and ticket capacities; operational provisioning must be explicit.

## Core concepts

### Tour plan and versions

- A tour has one mutable draft version and zero or more immutable published snapshots.
- Draft edits carry `expectedVersion`; conflicts return changed entities/fields.
- Significant edits after publication create a change set with impact classification and optional approval.
- Version diff covers stops, dates/times, venue, route, party requirements, travel, lodging, schedules, advance, budget, and publications.

### Stop identity

A `tour_stop` is the tour-specific placement of an event or non-show operational day. It holds ordinal, type, planning status, local date/time window, market, venue relation, notes, and current event relation. An `event` remains the operational show identity. Removing a stop detaches/archives the tour relation according to policy; it does not silently delete a shared or published event.

Supported stop types should include show, rehearsal, promo, festival, travel, rest, load/warehouse, and other. The UI may use one timeline but business rules vary by type.

### Route leg

A route leg connects two ordered stops or a base/depot and contains:

- origin/destination and time zones;
- departure/arrival windows and chosen times;
- transport mode and provider estimate source;
- distance, drive/flight/rail duration, buffers, breaks, ferry/border/customs time;
- driver/vehicle assumptions and hours-of-service/rest calculations;
- manual override value, reason, actor, and timestamp;
- risk/conflict status and downstream travel segment links.

### Hold/option

A hold records venue, proposed event/date/time, priority/option number, status, expiration, contact, competing hold notes, terms, and history. Confirmation converts/links it to the stop/event through an explicit command; expiration/cancellation never silently deletes planning history.

## APIs and commands

- `GET/PUT /api/admin/tours/:id/plan` with plan version and exact set semantics.
- Stop commands: create, attach event, update, reorder, detach, archive, confirm hold, convert type.
- `POST /plan/reconcile-preview` returns additions, modifications, reorders, detachments, protected conflicts, and downstream impact.
- `POST /route/calculate` uses provider abstraction and caches request/input/output/provider version.
- `POST /route/scenarios`, `/compare`, `/adopt` supports alternatives without modifying the active draft until adopted.
- `POST /readiness/evaluate` evaluates persisted draft server-side; publish re-evaluates inside its transaction.
- `GET /plan/diff?from=&to=` produces machine-readable and human-readable changes.

## Detailed task plan

### Phase 0–1 — contracts and safety

| ID | Task | Acceptance criteria |
|---|---|---|
| PLAN-001 | Approve stop/event identity ADR | Rules cover new event, existing event, shared event, non-show day, detach, cancellation, archive, delete, and settlement protection. |
| PLAN-002 | Inventory route JSON/settings | Every current field has canonical destination, migration/default rule, compatibility read period, and retirement owner. |
| PLAN-003 | Fix readiness contract decision | Product decides venue-profile and staffing requirements; UI/server/tests use the same blockers/warnings and explain remediation. |
| PLAN-101 | Build canonical plan read/write service | Builder no longer writes route JSON and links independently; command validates org, capability, plan version, and full plan schema. |
| PLAN-102 | Add optimistic plan version | Every mutation returns new version; stale edits return `409 version_conflict` with safe diff; autosave never silently overwrites. |
| PLAN-103 | Add exact stop reconciliation | Submitted set supports add/update/reorder/detach; omitted links are handled according to explicit mode; event identity is retained unless separately eligible for deletion. |
| PLAN-104 | Add reconciliation preview | UI displays exact relational and downstream consequences before destructive detach/reorder/date/venue changes. |
| PLAN-105 | Remove implicit operational seeding | Builder records setup intent only; staff shifts/ticket inventory require explicit reviewed provisioning commands with visible results. |

### Phase 2 — authoritative planner

| ID | Task | Acceptance criteria |
|---|---|---|
| PLAN-201 | Create `tour_versions` and `tour_stops` | Backfill is deterministic; route/order data reconciles with `tour_events`; unresolved conflicts are quarantined and reviewed. |
| PLAN-202 | Build stop editor | Supports all stop types, local time zone, windows, venue relation/free-text draft, contacts, notes, status, and validation without raw IDs. |
| PLAN-203 | Build reorder/timeline interaction | Keyboard and pointer reorder update real ordinals; duplicate/missing ordinals are prevented by constraint/transaction and tested. |
| PLAN-204 | Implement stop protection rules | Published, ticketed, contracted, staffed, or settled stops require impact workflow; errors list blocking records and authorized next action. |
| PLAN-205 | Implement holds/options | Create/update/expire/confirm/release with reminders and history; competing holds and confirmation conversion are visible. |
| PLAN-206 | Add server readiness engine | Rules consume persisted normalized data and return stable IDs, severity, scope, evidence, remediation URL, and override policy. |
| PLAN-207 | Add change sets and diff | Post-publication edits generate categorized diffs and identify affected publications, people, bookings, schedules, tickets, vendors, and budgets. |
| PLAN-208 | Add selectable deep-copy support | Planner exposes which stops/holds/templates/settings are copied, linked, or excluded and validates dates/time zones for shifted schedules. |

### Phase 3 — route intelligence and scenarios

| ID | Task | Acceptance criteria |
|---|---|---|
| ROUTE-301 | Create normalized route legs | Legs regenerate deterministically from stop ordering while preserving approved overrides/linked bookings; constraints prevent orphan legs. |
| ROUTE-302 | Implement provider abstraction | Distance/duration calculation supports one provider plus manual fallback; requests are cached, rate-limited, observable, and provider-neutral. |
| ROUTE-303 | Add time-zone and DST handling | Times store UTC plus location zone; UI shows local zones; DST transition tests and ambiguous/nonexistent local-time UX are complete. |
| ROUTE-304 | Add route constraint engine | Detect same-day overlaps, insufficient travel/buffer/rest, excessive drive, curfew conflict, border/ferry risk, missing location, and impossible arrival. |
| ROUTE-305 | Add driver/rest policy profiles | Organization selects policy template and may override with reason/capability; engine reports assumptions rather than presenting legal advice as certainty. |
| ROUTE-306 | Add travel/rest-day generation | User can insert suggested travel/rest days; adoption is explicit and creates versioned stops/legs. |
| ROUTE-307 | Build scenario workspace | Branch draft scenarios, compare distance/time/cost/risk/date conflicts, name/share internally, and adopt selected scenario with impact preview. |
| ROUTE-308 | Add route visualization | Map/timeline clearly distinguish confirmed, held, tentative, travel, and conflict states; accessible list provides equivalent information. |
| ROUTE-309 | Connect route legs to logistics | Each travel segment, vehicle movement, room night, equipment move, and passenger assignment references canonical stop/leg context. |

### Phase 4–6 — collaboration, optimization, and release

| ID | Task | Acceptance criteria |
|---|---|---|
| PLAN-401 | Add section ownership/approvals | Route/stop changes can require owner/department approval; pending changes are visible and do not alter published operations prematurely. |
| PLAN-402 | Add presence and conflict-safe collaboration | Active editor/presence is optional; version conflicts and comments resolve without data loss; notification noise is controlled. |
| ROUTE-601 | Add route metrics and alerting | Track calculation errors, provider latency/cost, override rate, unresolved conflicts, stale legs, and last successful recompute. |
| PLAN-602 | Complete migration reconciliation | JSON, `tour_events`, and normalized plan match for all migrated tours; comparison job reports zero unexplained differences before old writes stop. |
| PLAN-603 | Retire old planner components/write paths | Telemetry shows no use, feature flags removed, dead components deleted, and only canonical plan commands remain. |

## Test requirements

- Unit tests for ordinal/set reconciliation, lifecycle protection, time zones/DST, route constraints, hold transitions, and diff classification.
- Property tests for arbitrary stop reorder/add/remove sequences preserving unique ordinals and valid leg graph.
- Integration tests for existing/shared events, published protection, concurrent autosave, failed provider, and transaction rollback.
- Multi-org tests for plan, hold, provider-cache, and route-leg child IDs.
- E2E: create tour, add/attach/reorder/detach stops, resolve conflict, compare route scenario, pass readiness, and hand off to publication.

## Deployment readiness

- `tour_stops`/normalized plan is authoritative; JSON is compatibility-only or retired.
- Stop removal, reorder, and event retention are deterministic and transaction-tested.
- Server readiness and UI readiness produce the same rule IDs/results.
- Route calculations disclose provider/manual assumptions and all blockers have actionable remediation.
- Concurrent editing and post-publication changes cannot silently overwrite or bypass impact review.
