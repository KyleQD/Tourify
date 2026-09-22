# Tour portfolio, lifecycle, and command center

## Outcome

Give organization teams one reliable place to find, create, govern, and operate every tour. The tour portfolio must support large catalogs, explicit lifecycle states, role-aware bulk actions, safe duplication/archive/deletion, and a command center that loads one consistent snapshot rather than many independent legacy APIs.

## Current baseline and gaps

- A useful Admin tour list, filters, headline statistics, central `/api/admin/tours`, builder handoff, and broad command-center tab structure already exist.
- Command-center panels use mixed new organization-scoped and legacy owner-scoped routes, producing empty/403 tabs for legitimate collaborators.
- Large client pages fan out multiple calls, obscure partial failures as empty data, and can show inconsistent snapshots.
- Lifecycle is largely a status field. Draft, ready, published, active, completed, settled, archived, and cancelled transitions do not have one enforced state machine.
- Duplicate copies basic metadata rather than a selectable graph; deletion/archiving consequences are not presented as an impact plan.
- Sharing copies a private Admin URL; publication is specified separately in document 04.

## User outcomes

### Portfolio

- Search by tour name, artist/project, market, venue, date, owner, team member, state, risk, and tag.
- Save personal and organization views; share a view without exposing unauthorized tours.
- See actionable health: readiness blockers, overdue advances, route conflicts, uncovered staffing, missing travel/lodging, contract risk, budget variance, and publication status.
- Perform authorized bulk assignment, tagging, archive, export, and status actions with preview and partial-failure reporting.

### Lifecycle

Recommended state model:

- `draft`: freely editable; not operationally distributed.
- `planning`: stops and resources being confirmed.
- `ready`: server-calculated mandatory readiness checks pass.
- `published`: a versioned plan has been distributed.
- `active`: first operational window has begun or an authorized user activates it.
- `completed`: all stops ended; closeout remains.
- `settled`: required financial/event settlements are approved.
- `cancelled`: work stopped with reason and downstream impact handling.
- `archived`: read-only retention state after completion/cancellation.

Transitions are commands with prerequisites, authorization, reason where needed, side effects through an outbox, and audit events. Direct arbitrary status updates are prohibited.

### Command center

- One shell establishes acting organization, tour, plan version, lifecycle, access, and data freshness.
- A server/BFF summary returns stable counts/statuses for overview, shows, people, logistics, staffing, advances, tickets, finance, vendors/contracts, calendar, publications, and risks.
- Each tab owns a bounded read model and command set; it must distinguish empty, loading, denied, unavailable, stale, and error states.
- Cross-domain issues link directly to the record and remediation action.

## Roles and capabilities

- `tour.view`: list/open permitted tours and non-sensitive overview.
- `tour.manage`: create/edit metadata, stops, team, settings, and planning state.
- `tour.publish`: approve readiness exceptions and publish/retract versions.
- `tour.archive`: archive/restore eligible tours.
- `tour.delete`: permanently delete only eligible unreferenced drafts under retention policy.
- Domain tabs additionally require their domain capability; tour access alone does not grant finance, personnel, ticketing, or contract details.

## Data and API design

### Tour record

Keep `tours` as the identity root. Add or standardize:

- non-null `org_id`, display name, project/artist relation, description, tags;
- lifecycle state and timestamps; cancellation/archive reason;
- current draft version and last published version;
- owner/lead assignment, base currency, default time zone policy;
- optimistic `row_version` and timestamps/actors;
- soft-delete/retention fields rather than destructive deletion for referenced records.

Related records: `tour_versions`, `tour_stops`, `tour_team_assignments`, `tour_tags`, `tour_saved_views`, `tour_change_sets`, and `publication_snapshots`.

### Commands

- `POST /api/admin/tours` — create draft with idempotency key.
- `GET /api/admin/tours` — cursor pagination and authorized filters.
- `GET /api/admin/tours/:id/summary` — command-center BFF/read model.
- `PATCH /api/admin/tours/:id` — allowed metadata with expected version.
- `POST /api/admin/tours/:id/transitions/:command` — ready, publish, activate, complete, settle, cancel, archive, restore.
- `POST /api/admin/tours/:id/duplicate-preview` and `/duplicate` — selectable clone plan.
- `POST /api/admin/tours/bulk-preview` and `/bulk` — validated bulk commands.
- `DELETE /api/admin/tours/:id` — hard delete only when eligibility service returns safe.

Every response includes tour ID, organization ID, current version/state, correlation ID, and typed blockers where relevant.

## Detailed task plan

### Phase 1 — canonical access and read model

| ID | Task | Acceptance criteria |
|---|---|---|
| TOUR-101 | Define lifecycle state machine | States, transitions, required capabilities, blockers, side effects, cancellation/archive behavior, and invalid-transition errors are approved and tested. |
| TOUR-102 | Build canonical tour access service | All panels resolve the same org/tour authority; collaborator and entity-grant behavior is consistent; legacy endpoints delegate to it. |
| TOUR-103 | Inventory and classify legacy routes | Every `/api/tours/*` consumer has owner, replacement, data source, flag, and retirement milestone; no undocumented write path remains. |
| TOUR-104 | Build portfolio query contract | Cursor pagination, filter grammar, sort allowlist, stable counts, search normalization, and authorization are contract-tested on representative scale. |
| TOUR-105 | Add explicit error/degraded states | Portfolio and command-center tabs distinguish permission, unavailable dependency, stale snapshot, no records, and system error with retry/correlation support. |
| TOUR-106 | Instrument tour access and latency | Metrics capture list/summary latency, denied/failed calls, stale read models, legacy-route usage, and client request fanout. |

### Phase 2 — lifecycle, editing, duplication, and command center

| ID | Task | Acceptance criteria |
|---|---|---|
| TOUR-201 | Implement version-aware metadata edits | `expectedVersion` prevents silent overwrite; user sees conflicting fields and can reload or intentionally reapply changes. |
| TOUR-202 | Implement transition commands | Status cannot be patched directly; commands enforce readiness/state/capability and write transaction + audit + outbox event. |
| TOUR-203 | Build command-center summary BFF | One initial request returns identity, lifecycle, current/published versions, counts, risks, freshness, and domain access; p95 target is defined and measured. |
| TOUR-204 | Split command-center route bundles | Tabs load independently with stable typed contracts; opening overview does not download every editor or trigger duplicate calls. |
| TOUR-205 | Create deep-duplicate preview | User selects metadata, stops/events, team roles, vendors, templates, budgets, documents, logistics skeletons, and permissions; preview lists copies, links, exclusions, and conflicts. |
| TOUR-206 | Execute idempotent duplication job | Large copies run as a resumable job, preserve source IDs in audit metadata, generate new tokens/identities, and report per-domain completion/failure. |
| TOUR-207 | Implement archive/restore | Impact preview identifies shares/jobs/upcoming work; archive makes tour read-only, revokes eligible shares, and preserves legal/financial records. |
| TOUR-208 | Implement safe draft deletion | Eligibility blocks deletion when published, ticketed, contracted, paid, staffed, or referenced; authorized deletion is transactional and audited. |
| TOUR-209 | Add tags, owners, and organization saved views | Views store validated filters/columns, respect changing permissions, and cannot expose counts/names for unauthorized tours. |
| TOUR-210 | Add bulk command preview/execution | Bulk operations show eligible/ineligible items before confirmation, require idempotency, and return item-level results without hiding partial failure. |

### Phase 3–5 — domain health and lifecycle completion

| ID | Task | Acceptance criteria |
|---|---|---|
| TOUR-301 | Define health/risk aggregation | Each signal has source, severity, threshold, owner, freshness, and remediation URL; unknown/dependency failure is not scored as healthy. |
| TOUR-302 | Integrate route/logistics health | Conflicts, missing segments/rooms/seats/equipment/meals, and unresolved traveler data roll into summary. |
| TOUR-401 | Integrate workforce/advance/live health | Coverage, credentials, labor/rest conflicts, overdue advance sections, unacknowledged day sheets, and incidents appear by stop and tour. |
| TOUR-501 | Integrate commercial closeout | Ticketing, budget, contract, invoice, and settlement readiness controls complete/settled transitions. |
| TOUR-502 | Add cancellation impact workflow | Cancellation previews notifications, reservations, vendor/contract obligations, ticket refunds, staff work, publications, and budget effects; follow-ups are assigned and tracked. |

### Phase 6 — performance and release

| ID | Task | Acceptance criteria |
|---|---|---|
| TOUR-601 | Materialize/cache summary read model | Event-driven updates meet freshness SLO; fallback rebuild exists; cache keys include org, tour, access class, and version. |
| TOUR-602 | Establish portfolio performance budget | Representative 500/5,000-tour organization tests meet agreed query, render, interaction, and bundle targets. |
| TOUR-603 | Complete lifecycle E2E suite | Create through settled/archive passes for role variants, concurrent editors, failed dependencies, cancellation, and rollback scenarios. |
| TOUR-604 | Retire legacy tour UI/API paths | Usage telemetry is zero, compatibility reads are reconciled, flags removed, policies/routes/code deleted, and migration report approved. |

## UX requirements

- Persistent acting-organization and tour identity; never rely on ambiguous breadcrumb context.
- Lifecycle badge opens a history and explains prerequisites for the next transition.
- Destructive/large commands always show impact preview and require appropriate confirmation.
- Autosave indicates saving, saved version/time, offline/pending, conflict, and failure.
- Tables support keyboard navigation, accessible names, responsive column prioritization, and downloadable authorized views.
- Summary cards link to filtered remediation lists and show freshness; a zero never represents a failed request.

## Deployment readiness

- Every command-center tab uses canonical org/entity authorization and no legacy owner-only write.
- State transitions are the only lifecycle mutation path and have server-side tests.
- Duplicate, archive, cancellation, and delete are idempotent, auditable, and impact-aware.
- Portfolio and summary meet scale/performance budgets and distinguish degraded states.
- Critical lifecycle E2E passes for multiple roles and organizations.
