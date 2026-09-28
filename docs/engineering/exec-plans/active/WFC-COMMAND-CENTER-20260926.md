# Execution plan: WFC-COMMAND-CENTER-20260926 — Workforce Command Center

- Owner: orchestrator
- Base SHA: `16fb834f1a03a70f165be470a5f98f389bf6100a`
- Status: active
- Related tasks: WFC-001 through WFC-023

## Outcome

Tourify Admin provides a department-first Workforce Command Center where organization administrators and department managers can plan, staff, communicate, monitor attendance and live workforce state, resolve accountable work, and reconcile costs through secure, auditable workflows.

## Fixed product and architecture contract

- The organization workforce is the default context. Events, tours, venues, and dates are filters or work scopes rather than the root navigation hierarchy.
- Every worker has one active primary department and may have secondary department memberships.
- Every department has one accountable manager. Department managers are resource-scoped; organization administrators retain organization-wide authority.
- Vendor teams are departments with canonical company/contact metadata and an accountable internal manager.
- Operational presence is manager-controlled and append-only. Worker check-ins are evidence and do not overwrite manager state.
- Published schedules are immutable versions. Planned time, operational status, attendance evidence, approved actual time, and payroll time remain distinct.
- Existing task domains remain authoritative. Workforce exposes a normalized source-backed projection instead of copying tasks.
- New canonical workforce models coexist with legacy workforce tables through explicit links, reconciliation, and feature-flagged compatibility services until parity is proven.
- Optional source failures are represented as stale or unavailable, never as authoritative zeroes.

## Scope and constraints

- In: Admin workforce navigation, departments, people, scheduling, actions, communications, attendance, requests, costs, reports, supporting services/data, verification, rollout, and legacy retirement.
- Out: a redesign of worker-facing Work Mode. Its check-ins, responses, and acknowledgments remain inputs and compatibility obligations.
- Preserve: current active task ownership, unrelated worktree changes, existing audit history, legacy routes during the compatibility window, and CP-051 manual/additive migration policy.
- Feature gate: all new user-facing behavior remains behind `admin_workforce_command_v2` until WFC-021 certification and WFC-022 rollout gates pass.
- Concurrency: one active WFC implementation task per owner unless the orchestrator records disjoint working sets and explicit handoffs.

## Public interface contract

- Organization navigation: Departments, People, Schedule, Action Center, Attendance, Requests, Communications, Costs & Payroll, Reports, Settings.
- Department navigation: Overview, Staff, Schedule, Timeline, Action Items, Communications, Attendance, Costs, Settings.
- URL state: `tab`, `departmentId`, `view`, `eventId`, `date`, `q`, `status`, `sort`, `selected`.
- Manager status vocabulary: `expected`, `contacted`, `en_route`, `on_site`, `working`, `on_break`, `released`, `absent`, `excused`.
- Action status vocabulary: `backlog`, `planned`, `in_progress`, `blocked`, `ready_for_review`, `complete`, `cancelled`.
- Source state vocabulary: `fresh`, `stale`, `unavailable`, `not_authorized`, with timestamps and retryability.
- Primary read interfaces: `GET /api/admin/workforce/command` and `GET /api/admin/workforce/departments/[id]/workspace`.
- Security: every route resolves acting organization server-side, applies the capability gate, then enforces organization and department resource scope. Financial fields require independent finance capabilities.

## Dependency order

1. WFC-001 establishes the control plane and freezes shared contracts.
2. WFC-002 captures the authenticated baseline when an isolated target exists; WFC-003 and WFC-007 may begin after WFC-001.
3. WFC-003 feeds WFC-004; WFC-004 feeds the workforce service, scheduling, action, communication, and extended-schema lanes.
4. WFC-005 and WFC-006 establish department commands and read models before WFC-008 through WFC-010 build the command shell.
5. After WFC-010, scheduling (WFC-011–013), actions/live operations (WFC-014–015), communications (WFC-016–017), and the extended suite (WFC-018–020) may proceed in parallel when working sets are disjoint.
6. WFC-021 certifies the integrated product; WFC-022 owns staged rollout; WFC-023 retires legacy code only after the observation gates pass.

## Required handoffs

- Organization → Database: tenant, manager, and vendor identity contract.
- Database → Work: applied schema, constraints, RLS, generated types, migration evidence, and reconciliation queries.
- Work → Admin: stable API/types, failure semantics, capabilities, and fixtures limited to tests.
- Design System → Admin: shared components, tokens, responsive behavior, and accessibility contract.
- Social → Admin: communication audience, receipt, retry, and authorization contract.
- Implementation agents → QA: exact SHA, seed/actor assumptions, verification evidence, and known degraded paths.
- QA → Release: signed certification result, failures, performance measurements, and rollout recommendation.

## Verification gates

- Every task: focused tests plus its recorded verification tier and `npm run agents:validate`.
- Database: migration-chain, migration-validation, generated-type, constraint, replay, and live RLS evidence; never a destructive reset.
- Admin/design: URL state, responsive visual regression, keyboard/focus, contrast, reduced motion, and all canonical data states.
- Security: admin, department manager, finance, worker, vendor, revoked, unauthenticated, cross-department, and cross-organization personas.
- Scale: 25 departments, 2,000 workers, and 10,000 shifts/actions with bounded queries and usable rendering.
- Rollout: isolated staging, 24-hour soak, internal pilot, external pilot, percentage ramp, seven-day elevated monitoring, and rehearsed flag-off rollback.

## Rollback or recovery

- Disable `admin_workforce_command_v2` per organization or globally and route users to the legacy Staff Operations surface.
- Preserve canonical records and append-only audit history; correct defects through additive forward fixes.
- Stop downstream work on authorization, migration, parity, or financial discrepancies. Never recover with a database reset, blanket replay, guessed ownership, or destructive legacy cleanup.

