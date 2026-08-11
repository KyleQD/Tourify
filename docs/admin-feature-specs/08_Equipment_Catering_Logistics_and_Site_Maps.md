# Shared logistics, equipment, rentals, catering, hospitality, and site maps

## Outcome

Retain Tourify’s useful generic logistics task layer while adding structured operational models for equipment movements, rentals, custody, meal services, hospitality requirements, and site maps. Managers must be able to produce complete manifests/checklists, identify capacity/timing/ownership gaps, and publish the correct operational view to each stop and audience.

## Current baseline and gaps

- Generic logistics tasks support type, status, priority, and equipment attachment and are useful as cross-domain work tracking.
- Rentals/equipment include agreements, items, utilization, returns, and damage fields but are not a tour-wide pack/movement/custody system.
- Catering/hospitality is mostly generic tasks plus rider/advance fields.
- Site maps are one of the strongest domains: storage, collaborators, public tokens, notes, tasks, notifications, and an event-task bridge.
- Site-map access is creator/collaborator/public oriented rather than inherited from organization/tour/event capabilities.
- Logistics has event selection but inconsistent tour-level scope/navigation; metrics average overlapping task categories rather than structured outcomes.
- Sensitive logistics domains inherit tenant/RLS risks described in document 01.

## Shared logistics task model

Generic tasks should track work, not replace domain records. A task has org, tour/event/stop/leg, domain/category, title/description, owner/assignees, priority, due window/time zone, status, blocker/dependency, source entity/version, checklist, attachments, and audit. Domain records may create or link tasks but remain authoritative for inventory, capacity, booking, meal, or map state.

Statuses: `backlog`, `planned`, `in_progress`, `blocked`, `ready_for_review`, `complete`, `cancelled`. Completion may require a domain validator. Metrics count unique tasks and domain outcomes, not overlapping category labels.

## Equipment and rentals model

- `equipment_catalog_items`: organization asset/type, manufacturer/model, serial/asset tag, ownership/vendor, value, dimensions/weight, status, maintenance requirement.
- `equipment_cases`: scannable case/kit and contents version.
- `equipment_manifests`: tour/version/department, required quantity, source, responsible role, status.
- `equipment_movements`: item/case, route leg/event movement, origin/destination, vehicle/transport, custody owner, planned/actual time.
- `custody_events`: scan/manual transfer/load/unload/check, actor/device/location/time/condition.
- `equipment_service_events` and `damage_loss_reports`.
- `rental_agreements`, items, dates, pickup/return, deposits/terms, vendor/contract/PO/invoice links.

## Catering and hospitality model

- `hospitality_requirements`: tour/party/role/group requirement, source/rider version, dietary/accessibility privacy class.
- `meal_services`: stop/event/date, meal type, service/delivery window, location, provider, menu/version, headcount snapshot, per-head/flat cost, status, owner.
- `meal_headcounts`: source population/group and included/excluded counts; individual exception only when necessary.
- `hospitality_deliveries`: dressing rooms, bus stock, water, towels, rider items, quantity, provider, window, acceptance/variance.

Dietary/accessibility data must be minimized: operational aggregates are preferred; identifiable details are available only to authorized coordinators when necessary.

## Site-map model and access

Preserve current map, collaborator, notes, task, public token, and notification primitives. Add non-null `org_id`, tour/event/stop relations, map version/status, floor/area metadata, publication reference, and access inheritance:

- Base view/edit/share comes from org + event/tour capabilities.
- Explicit collaborators may add narrower external access; they never reduce owner/master invariant.
- Public/external tokens remain independently scoped, expiring, revocable, and logged.
- Published day sheets reference a frozen map version; later edits do not silently alter that version.

## Detailed task plan

### Phase 1 — tenancy and shared task cleanup

| ID | Task | Acceptance criteria |
|---|---|---|
| LOG-101 | Add/verify org scope across logistics | Tasks, attachments, equipment, rentals, catering, maps, notes, collaborators, and child records pass direct-client multi-org tests. |
| LOG-102 | Define task taxonomy and authority | Domain/category values are non-overlapping; generic task versus structured entity responsibility is documented and enforced. |
| LOG-103 | Build canonical logistics command service | Per-action schemas, parent access, allowed transitions, idempotency, audit, and typed errors replace arbitrary record updates. |
| LOG-104 | Add tour-first scope/navigation | Logistics page supports organization → tour → stop/event/leg filters, preserves scope in URLs, and never defaults to a different org/tour silently. |
| MAP-101 | Add organization inheritance to maps | Authorized tour/event users discover maps by capability; external collaborator/token behavior remains scoped and tested. |

### Phase 3 — shared tasks and equipment operations

| ID | Task | Acceptance criteria |
|---|---|---|
| LOG-301 | Upgrade task dependencies/checklists | Task supports blockers, dependencies, repeated checklist, source entity/version, completion validation, and explicit failed/unknown state. |
| LOG-302 | Build tour logistics board | Views by tour, stop, leg, department, owner, due, blocker, and domain; bulk changes preview eligibility and report partial failures. |
| EQUIP-301 | Create organization equipment catalog | Asset/type, serial/tag, ownership/vendor, dimensions/weight/value, current state, service due, and restricted financial fields are modeled. |
| EQUIP-302 | Build cases/kits and manifest versions | Managers compose department manifests, quantities, alternates, cases/contents, source, responsible role, and approval; published version is immutable. |
| EQUIP-303 | Connect equipment to route movements | Every required item/case has explicit location/movement/vehicle/owner state for relevant legs/stops; gaps and capacity issues are reported. |
| EQUIP-304 | Implement scan/custody workflow | QR/barcode/manual fallback records load, transfer, unload, check, condition, actor/device/time/location; offline queue is idempotent. |
| EQUIP-305 | Add load-in/load-out checklists | Templates derive from manifest and venue advance; exceptions require reason/photo/assignment and remain open through closeout. |
| EQUIP-306 | Add damage/loss/service workflow | Report, secure evidence, custody chain, severity, owner, vendor/insurance/finance link, resolution, replacement, and service history are complete. |
| RENT-301 | Normalize rental agreements | Vendor, items/quantity, dates/locations, terms/deposit, pickup/return, condition, contract/PO/invoice and status transitions are linked. |
| RENT-302 | Add rental conflict/return alerts | Detect date/quantity/source conflict, missing pickup/return owner, overdue return, damage, and cost variance with escalation. |

### Phase 3–4 — catering and hospitality

| ID | Task | Acceptance criteria |
|---|---|---|
| CATER-301 | Normalize hospitality requirements | Approved rider/advance and party needs map to structured quantities/notes; source/version and local variance are visible. |
| CATER-302 | Build meal-service planner | Breakfast/lunch/dinner/snack/buyout/other includes window/location/provider/menu/headcount/cost/status/owner and event timeline conflicts. |
| CATER-303 | Generate privacy-safe headcounts | Headcount snapshot traces included groups and aggregates dietary/accessibility needs; identifiable exceptions require capability and purpose. |
| CATER-304 | Add menu/delivery approval | Provider proposal, internal approval/change, delivery acceptance, shortage/quality issue, and actual headcount/cost are tracked. |
| CATER-305 | Build hospitality delivery checklist | Rider items by room/location/window/quantity/provider are accepted with variance and linked to advance/site map/task. |
| CATER-306 | Publish crew/vendor views | Crew receives meal/service details; vendor receives only authorized quantities/windows/contacts/dietary aggregates and versioned changes. |

### Phase 3–4 — site-map production use

| ID | Task | Acceptance criteria |
|---|---|---|
| MAP-301 | Add map versions and lifecycle | Draft/review/approved/published/superseded/archived with immutable published versions, thumbnails/checksum, source file, owner, and audit. |
| MAP-302 | Link operational objects | Notes/tasks/markers can link locations to run-of-show, equipment, entrances, credentials, vendors, incidents, and checklist items. |
| MAP-303 | Harden file/token access | Original/derived assets require org/grant/token checks, signed short-lived URLs, scan/type/size validation, expiry/revocation, and access logs. |
| MAP-304 | Add review/approval workflow | Internal/external collaborator comments, requested changes, resolved threads, approver, and approved version are visible. |
| MAP-305 | Publish map projections | Day sheet/tour book references exact approved map version; worker/vendor/public variants hide restricted layers and remain accessible offline as permitted. |

### Phase 6 — metrics and release

| ID | Task | Acceptance criteria |
|---|---|---|
| LOG-601 | Replace weak logistics metrics | Metrics have definitions and show unresolved critical tasks, late/blocked work, manifest completeness, scan exceptions, meal/room/equipment capacity, and freshness. |
| LOG-602 | Add operational alerts | Upcoming missing/late equipment, unreturned rentals, meal headcount deadline, unresolved map approval, and failed publication notify responsible owner. |
| LOG-603 | Complete migration/retirement | Generic task records that represented domain facts are linked/migrated without history loss; duplicate categories and old writes are retired. |

## Test requirements

- Org/parent/child/file/token authorization tests.
- Manifest quantity, movement continuity, offline scan dedupe/order, custody, rental dates/returns, and damage workflow tests.
- Meal headcount source, dietary privacy projection, deadline/change, and cost tests.
- Map version, collaborator inheritance, token expiry/revocation, restricted-layer rendering, and publication-version tests.
- E2E: build manifest/meal/map → approve/publish → operate scans/deliveries/tasks → close exceptions.

## Deployment readiness

- Generic tasks track work but do not replace equipment, rental, meal, hospitality, or map truth.
- Every required equipment item and service has accountable owner, location/time, status, and exception path.
- Sensitive dietary/accessibility and map layers are least-privilege and audience-filtered.
- Published maps/manifests/checklists are immutable versions linked to day-of publications.
- Upcoming gaps, scan exceptions, overdue returns, and failed deliveries are observable and actionable.
