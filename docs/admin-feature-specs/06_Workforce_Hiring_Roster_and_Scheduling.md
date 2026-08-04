# Workforce, hiring, onboarding, tour party, and scheduling

## Outcome

Connect organization workforce records, hiring, onboarding, tour-party roles, event assignments, credentials, availability, shifts, Work Mode identities, and labor cost into one coherent workflow. Managers must be able to staff an entire tour—including travel, rehearsal, warehouse, and rest/work days—without venue-dependent hacks or demo-derived availability.

## Current baseline and gaps

- Jobs, applications, onboarding, roster, audit, live shifts, assignments, publish/notify, conflict derivation, and Work Mode synchronization are substantial existing assets.
- Organization roster, tour team members, event participants, staff members, employment assignments, and Work Mode assignments overlap without one canonical assignment identity.
- Shift creation/scheduling is often venue-centric; tour travel and non-venue work are awkward.
- Availability/templates include hard-coded or derived behavior that must not control live schedules.
- Qualifications, credentials, time off, labor/rest rules, cost forecast, payroll export, and tour-wide bulk scheduling are incomplete.
- Broad Admin authorization and calendar direct inserts can bypass domain invariants.

## Canonical people and assignment model

Separate identity from engagement and assignment:

- `profiles/users`: person identity and account connection.
- `organization_people`: organization-specific worker/contact record, employment/contractor category, status, protected details.
- `tour_party_members`: person participating in a tour, dates, home/base, emergency/accessibility/dietary data with restricted access.
- `tour_role_assignments`: person or open position, role/department, tour/event/stop/leg scope, start/end, manager, status, cost/rate reference.
- `assignment_credentials`: required/issued/verified/expired credential, certification, permit, or access level.
- `availability_intervals` and `time_off_requests`: source, status, recurrence/time zone.
- `work_shifts`: organization/tour/event/stop/leg, start/end/zone, role, location, breaks, headcount, status/version.
- `shift_assignments`: person, response/acknowledgement, attendance, actual time, exception.

Employment, tax, payroll, and sensitive personal fields should be isolated from operational roster views and governed by explicit capabilities/retention.

## Target workflows

### Hiring and onboarding

1. Define position/headcount, scope, location/travel, dates, skills, rate range, employment category, and approval.
2. Publish internally/externally; collect applications with consent and retention.
3. Review using structured criteria and documented decisions.
4. Offer/contract through appropriate commercial workflow.
5. Onboard assigned forms/documents, credentials, profile, payment/payroll handoff, emergency details, and policy acknowledgement.
6. Convert to organization person and tour role without duplicate identities.

### Tour staffing

1. Define tour roles and headcount template by department.
2. Assign people/open positions across tour date ranges and selected stops.
3. Validate availability, overlap, travel feasibility, qualifications, credentials, labor/rest, and budget.
4. Generate draft work shifts/calls from approved templates and operational milestones.
5. Review exceptions and publish schedules; workers accept/decline/acknowledge.
6. Track attendance/actuals and export approved time/cost data.

## Roles and field access

- `hiring.manage`: requisitions/applications/decisions; protected application data follows least privilege.
- `workforce.view/manage`: organization people, tour roles, availability, credentials, and staffing.
- `workforce.publish`: publish schedules/assignments and required changes.
- Finance/payroll rates and personal documentation require additional `finance`/HR-like protected capability.
- Department managers see their scoped roles/shifts; workers see their own assignments and permitted contacts only.

## Detailed task plan

### Phase 1–2 — model convergence and safe access

| ID | Task | Acceptance criteria |
|---|---|---|
| WORK-101 | Map existing person/assignment records | Each roster/team/participant/staff/employment/Work Mode field has canonical destination and identity-resolution rule; duplicate risk report is generated. |
| WORK-102 | Add organization and assignment authority | All workforce records have org scope; server commands validate tour/event/role parents; protected fields use field-level projections. |
| WORK-103 | Create canonical assignment service | Tour/event panels, scheduling, hiring conversion, calendar, and Work Mode use the same person/role/assignment identity and status transitions. |
| WORK-104 | Remove demo availability/templates from live mode | Live organizations use persisted records only; demo fixtures are isolated by environment/account and visibly labeled. |
| WORK-105 | Add identity merge/reconciliation | Authorized workflow identifies likely duplicates, previews references, merges safely, retains audit/aliases, and never auto-merges on weak signals. |

### Phase 4 — tour party and staffing matrix

| ID | Task | Acceptance criteria |
|---|---|---|
| WORK-401 | Create tour party model | Members have scoped dates, role/department, assignment status, traveler attributes, Work Mode link, and restricted personal-field access. |
| WORK-402 | Build tour-wide staffing matrix | Rows/columns support roles, people, stops/days, coverage, open positions, conflicts, and filters; travel/non-venue days are first-class. |
| WORK-403 | Add role/headcount templates | Organization-owned versioned templates define required roles/counts by event type/scale and can be applied with preview, not silent creation. |
| WORK-404 | Add availability and time-off | Workers/managers enter intervals/recurrence with time zone and approval/source; scheduling conflict engine uses persisted truth. |
| WORK-405 | Add skills and credentials | Roles declare requirements; worker credentials have issuer/expiry/verification/files; missing/expiring requirements block or warn by policy. |
| WORK-406 | Add labor/rest rule profiles | Configurable jurisdiction/contract templates detect turnaround, meal/rest, consecutive days, overlap, and travel-work conflicts with documented assumptions. |
| WORK-407 | Add schedule templates | Versioned templates derive calls from event milestones or fixed local times; preview shows shifts, unresolved roles, conflicts, and estimated cost. |
| WORK-408 | Generate shifts transactionally | Bulk generation is idempotent, supports event/travel/rehearsal/warehouse/other days, respects locked edits, and returns complete item-level result. |
| WORK-409 | Add assignment workflow | Draft/offered/accepted/declined/confirmed/released/cancelled states, reason, deadlines, reminders, replacement workflow, and audit are implemented. |
| WORK-410 | Add conflict resolution UI | Conflict explains rule/evidence/severity/affected assignments and supports authorized override with reason or direct remediation. |
| WORK-411 | Add labor cost forecast | Rate card, overtime/premium assumptions, travel/per diem, estimated hours, currency, and committed/actual forecast feed budget without exposing rates broadly. |
| WORK-412 | Publish schedules through publication service | Recipient receives exact version/diff, local times, locations/calls, and acknowledgement; failure/retry state is visible. |

### Phase 4–5 — hiring and onboarding completion

| ID | Task | Acceptance criteria |
|---|---|---|
| HIRE-401 | Standardize requisition workflow | Draft/approval/open/paused/closed states; tour/event/role/dates/headcount/rate/skills/travel and owner are required as configured. |
| HIRE-402 | Harden application pipeline | Stage transitions, notes, interview tasks, decision reasons, consent/retention, duplicate applicant handling, and role-aware exports are complete. |
| HIRE-403 | Build offer/engagement handoff | Approved candidate creates contract/offer and contingent assignment; failed/declined/expired outcomes reconcile headcount. |
| HIRE-404 | Version onboarding templates | Organization owns task/document/acknowledgement templates by role/employment type; changes do not mutate active onboarding. |
| HIRE-405 | Track onboarding dependencies | Identity/account invite, documents, credentials, policy, payment/payroll handoff, emergency/travel profile, and equipment issuance have owners/due/status. |
| HIRE-406 | Convert without duplicate identity | Completion activates organization person/tour role/Work Mode access in one idempotent workflow; rollback/retry cannot duplicate rows. |

### Phase 6 — attendance, payroll handoff, and reliability

| ID | Task | Acceptance criteria |
|---|---|---|
| WORK-601 | Capture attendance and actual time | Check-in/out/manual correction with reason/approval, offline recovery, and audit; planned shifts remain versioned. |
| WORK-602 | Add payroll/time export | Authorized, approved period exports stable worker/shift/rate/cost identifiers and adjustments; reruns are versioned and reconcile totals. |
| WORK-603 | Workforce SLO/alerts | Monitor uncovered critical roles, expiring credentials, overdue responses/onboarding, notification failure, conflict backlog, and identity sync failure. |
| WORK-604 | Complete migration and retire duplicates | Canonical assignments reconcile to legacy counts/references; old writes stop; compatibility views then code/tables are retired by approved retention plan. |

## Test requirements

- Identity merge, assignment state, availability recurrence, DST, labor/rest, credential expiry, schedule generation idempotency, cost calculations, and protected-field tests.
- Multi-org and department-scope tests for applicants, personal details, rates, credentials, assignments, shifts, exports, and Work Mode.
- E2E: requisition → applicant → offer/onboarding → tour role → shifts → publish/ack → attendance → approved export.
- Scale test with representative tour size, bulk generation, conflicts, and worker notification fanout.

## Deployment readiness

- One person/role/assignment graph powers roster, tour, event, schedule, calendar, and Work Mode.
- Travel and non-venue work are schedulable without fake venue data.
- No hard-coded/demo availability or templates affect live decisions.
- Conflict, credential, cost, publication, and attendance behavior is role-aware, tested, and observable.
- Sensitive applicant/person/rate data is isolated and included in retention/access review.
