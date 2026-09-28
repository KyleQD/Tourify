# Event producer, advancing, day sheets, and live operations

## Outcome

Create a continuous event-operations workflow from initial event setup through venue advance, approved run of show, worker day sheet, on-site incident/task management, check-in, and closeout. Tour-level teams must see every stop's progress while each event retains local ownership and detail.

## Current baseline and gaps

- Event builder/producer, readiness, venue/artist/crew/vendor discovery, advancing document/status/share/export, day sheet, HQ/command center, incidents, check-in, group chats, analytics, and secure uploads provide significant depth.
- Builder fields are partially free text/JSON and can be best-effort seeded into operational tables.
- Advancing is not yet a tour-wide matrix with section ownership, deadlines, versions, approvals, and acknowledgements.
- Day sheet/run-of-show/live-ops surfaces overlap and do not share one immutable published version.
- Event communications and real-time state need consistent org/event permissions, durable delivery, and offline behavior.
- Readiness and direct publication contracts differ.

## Target workflow

1. **Event setup:** create/attach event, venue, promoter/contacts, local time zone, production windows, ticketing/finance context, and required advance template.
2. **Advance request:** assign internal and external owners, due dates, requested fields/documents, and secure external response link.
3. **Advance completion:** collect typed answers, files, comments, and changes by section; validate required values and reconcile with tour standards.
4. **Approval:** department owners approve sections; production manager resolves exceptions and freezes a version.
5. **Run of show/day sheet:** build operational timeline, calls, locations, contacts, meals, transport, safety, credentials, tasks, and maps from canonical data.
6. **Publication:** distribute versioned recipient-specific day sheet/run of show and capture acknowledgement.
7. **Live operations:** track tasks, incidents, check-ins, timeline variance, announcements, and updates on scoped realtime channels.
8. **Closeout:** record actual timings, incidents/resolutions, attendance/check-in summary, missing assets, notes, and handoff to settlement/reporting.

## Domain model

- `advance_templates` and versioned sections/fields owned by organization.
- `event_advances`, `advance_sections`, field responses, comments, attachments, owners, due dates, approval/version history.
- `run_of_show_versions`, timeline items, dependencies, locations, responsible roles, planned/actual times.
- `day_sheet_versions` referencing run of show plus travel/lodging/meals/contacts/maps/safety projections.
- `event_operational_tasks` or canonical shared task relation with event/category/owner/deadline/status.
- `incidents`, participants, severity, privacy class, response, resolution, follow-up, attachments.
- `check_in_sessions`, eligible credential/assignment source, scans/manual entries, exceptions, device/operator.
- Publication entities are defined in document 04; site maps in document 08.

## Roles and permissions

- `event.manage`: event setup and non-live operational data.
- `advance.manage`: template, request, responses, section ownership, approve where configured.
- `event.publish`: publish approved advance/day sheet/run-of-show versions.
- `event.live_ops`: update live timeline/tasks/check-in and send operational notices.
- Incident access is narrower by severity/privacy; medical/personnel-sensitive notes require explicitly authorized roles.
- External venue/vendor respondents can access only assigned advance sections and uploads through an expiring grant.

## Detailed task plan

### Phase 1–2 — event foundation and explicit provisioning

| ID | Task | Acceptance criteria |
|---|---|---|
| EVENT-101 | Converge event access and APIs | Builder, command center, advance, check-in, files, and live operations use the same org/event capability service and child-record checks. |
| EVENT-102 | Normalize event setup fields | Venue relation, promoter/contact, local times, capacities, age/curfew, production windows, and ownership have typed destinations and validation. |
| EVENT-103 | Replace best-effort seeds | Event creation returns explicit setup checklist for staffing, ticketing, advance, logistics, and finance; provisioning commands show exact changes/failures and never invent capacity/shift data. |
| EVENT-104 | Add event version/conflict handling | Concurrent changes and tour-plan changes surface version conflict or approved reconciliation; no silent overwrite. |
| EVENT-201 | Unify readiness rules | Event readiness has stable rule IDs/severity/evidence/remediation and is used by builder, command center, and server publication. |
| EVENT-202 | Add event setup completeness view | Each required domain shows not started/in progress/blocked/ready with owner and direct action; dependency failure is shown as unknown. |

### Phase 4 — advancing

| ID | Task | Acceptance criteria |
|---|---|---|
| ADV-401 | Create versioned organization templates | Template sections/fields, conditional requirements, default owners/due offsets, file types, validation, and version history are configurable without changing active advances. |
| ADV-402 | Build tour-wide advance matrix | Rows are stops and columns/filters are sections/status/owner/due date; bulk assign/remind/template actions preserve per-event differences. |
| ADV-403 | Add secure external request flow | Recipient receives expiring section-scoped link, verifies identity as configured, saves drafts, uploads safely, and cannot enumerate other events/sections. |
| ADV-404 | Add typed response and file validation | Values have units/time zones, contact structure, revision history, malware-scanned storage, file limits, and clear missing/invalid state. |
| ADV-405 | Add section ownership and approval | Owner, contributor, reviewer, due date, state, comments, change request, approval, and reopen reason are audited. |
| ADV-406 | Add reminder/escalation policy | Scheduled reminders are deduplicated, respect time zones/preferences, escalate overdue critical sections, and appear in delivery history. |
| ADV-407 | Add tour-standard variance detection | Compare local responses with rider/production standards, staffing, route, equipment, hospitality, curfew, and budget; assign exceptions for resolution. |
| ADV-408 | Freeze/export approved advance | Immutable version renders authorized web/PDF package and feeds run-of-show/day-sheet generation; later changes create a new version/diff. |

### Phase 4 — run of show and day sheet

| ID | Task | Acceptance criteria |
|---|---|---|
| LIVE-401 | Create versioned run-of-show timeline | Items support local/UTC time, duration, dependency, location, owner/role, public/private notes, template source, and actual time. |
| LIVE-402 | Add timeline validation | Detect overlap, dependency inversion, missing location/owner, travel/load timing conflict, curfew breach, and unstaffed critical item. |
| LIVE-403 | Build day-sheet composer | Pulls canonical travel, lodging, calls/shifts, meals, advance, maps, contacts, weather placeholder/source, and emergency information with field-class policy. |
| LIVE-404 | Publish recipient-specific day sheets | Uses publication service, version/diff/acknowledgement, and worker offline access; sensitive contacts/travel are audience-filtered. |
| LIVE-405 | Add day-sheet correction workflow | Critical changes generate impact-based re-publication and acknowledgement; old version visibly superseded. |

### Phase 4–6 — live operations and closeout

| ID | Task | Acceptance criteria |
|---|---|---|
| LIVE-406 | Establish scoped realtime channel | Authorization is rechecked at subscribe and relevant permission changes; messages/events carry sequence and support reconnect/catch-up. |
| LIVE-407 | Unify live tasks | Tasks link timeline/map/equipment/person/vendor, support priority/status/owner/due/blocked reason, and preserve audit without duplicating logistics categories. |
| LIVE-408 | Implement incident workflow | Severity, privacy, reporter, participants, response owner, escalation, resolution, follow-up, files, and restricted audit are complete; emergency copy is reviewed. |
| LIVE-409 | Harden check-in | Eligibility derives from credential/assignment; duplicate/offline/manual/denied/revoked cases are handled; operator/device and reason are audited. |
| LIVE-410 | Capture planned versus actual | Authorized operators mark actual start/end/delay and reason; downstream timeline/notifications update without mutating the published planned version. |
| LIVE-411 | Create event closeout | Checklist covers incidents, lost/damaged equipment, staff exceptions, attendance, vendor issues, actual timings, documents, and handoff to finance/settlement. |
| LIVE-601 | Add operational observability | Alert on realtime failures, stale clients, notification backlog, overdue critical tasks, missing acknowledgements, check-in anomalies, and unresolved high-severity incidents. |

## UX and accessibility requirements

- Tour matrix and event views share terminology/status colors and support keyboard/table alternatives.
- Local time zone is always shown where ambiguity exists; relative times never replace exact operational time.
- Mobile live view prioritizes current/next timeline items, critical notices, offline freshness, check-in, tasks, and emergency contacts.
- External advance forms autosave, communicate expiry, validate before submit, and permit accessible upload/review.
- Incident creation is fast but never pre-fills sensitive conclusions; access classification is explicit.

## Test requirements

- Template versioning, conditional field, approval/reopen, reminder dedupe, external token, and upload security tests.
- Run-of-show time-zone/DST, overlap, dependency, curfew, and post-publication diff tests.
- Realtime reconnect/order/authorization revocation and offline check-in synchronization tests.
- E2E from event setup through advance, approved day sheet, live update, incident/check-in, and closeout for multiple roles.

## Deployment readiness

- No event builder action silently fabricates operational data or hides partial provisioning.
- Every advance/day sheet/run of show has an owner, version, status history, approval, and publication record.
- External and live channels cannot cross organization/event scope.
- Critical changes reach and can be acknowledged by the correct audience.
- Check-in and incident paths support offline/error recovery and immutable operator audit.
