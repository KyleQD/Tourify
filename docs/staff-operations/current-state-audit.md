# Staff Operations Current-State Audit

Date: 2026-08-12  
Branch at kickoff: `codex/eslint-generated-ignores`  
Working tree at kickoff: clean  
Source suite: `/Users/kyledaley/Downloads/tourify_admin_staff_operations_plan_suite`

## Scope

This audit completes the non-mutating P0 discovery pass for the Staff Operations rebuild. It records active surfaces, write paths, schema/RLS evidence, tests, gaps, and the first implementation constraints. No schema, UI, or runtime behavior was changed by this audit.

## Active UI Surfaces

- Canonical Staff Operations entry: `app/admin/dashboard/staff/page.tsx`.
- Current Staff tabs: `components/hiring/staff-operations-tabs.tsx`, with `overview`, `scheduling`, `team`, and `analytics`.
- Staff overview/channels/analytics/team panels live under `components/hiring/`.
- Scheduling workspace is mounted from `components/admin/staff-scheduling-tab.tsx` and uses the sub-application under `components/admin/scheduling/`.
- Existing related dashboard routes include `/admin/dashboard/hiring`, `/admin/dashboard/applications`, `/admin/dashboard/candidates`, `/admin/dashboard/jobs`, `/admin/dashboard/onboarding`, and `/admin/dashboard/roster`.

Current mismatch with the suite: navigation is still implementation-driven and hiring/scheduling-heavy, not lifecycle-driven. The requested target navigation is Command Center, People, Hiring, Scheduling, Assignments, and Settings & Audit.

## Active API Surfaces

- Universal hiring APIs: `app/api/hiring/*`.
- Existing workforce APIs: `app/api/admin/workforce/*`.
- Scheduling/shift APIs: `app/api/admin/staffing/*`.
- Legacy/admin hiring and onboarding APIs: `app/api/admin/applications/*`, `app/api/admin/job-postings/*`, and `app/api/admin/onboarding/*`.
- Worker-facing Work Mode APIs: `app/api/work-mode/*`.
- Legacy venue/staff APIs still exist under `app/api/venue/*`, `app/api/staffing/*`, and `app/api/staff/ops/route.ts`.

Current mismatch with the suite: lifecycle writes and read models are split across route families. P1-P3 must canonicalize new work under `/api/admin/workforce/*` while preserving compatibility adapters.

## Active Services And Domain Helpers

- Hiring approval orchestration: `lib/services/hiring-application-approval.service.ts`.
- Hiring and onboarding service facade: `lib/services/hiring-onboarding.service.ts`.
- Roster and Work Mode assignment service: `lib/services/hiring-roster.service.ts`.
- Candidate assignment: `lib/services/hiring-candidate-assignment.service.ts`.
- Shift-to-employment sync and publish helper: `lib/services/staff-shift-assignment-sync.ts`.
- Existing workforce services/helpers: `lib/services/admin-workforce-people.service.ts`, `lib/admin/workforce-authority.service.ts`, `lib/admin/workforce-assignment.service.ts`, `lib/admin/workforce-conflict-resolution.ts`, `lib/admin/workforce-identity-map.ts`, and `lib/admin/workforce-identity-merge.service.ts`.
- Existing feature-flag resolver infrastructure: `lib/admin/feature-flags/*` and `supabase/migrations/20260721235608_admin_feature_flag_governance_rel008.sql`.

Current mismatch with the suite: there are useful services, but no single `WorkforceContext`, permission evaluator, lifecycle transition service, or complete issue/read-model service yet.

## Active Write Paths

- `job_applications`: written by `HiringOnboardingService`, `approveStaffApplication`, legacy admin applications routes, public job application routes, and venue-hiring routes.
- `staff_onboarding_candidates`: written by `HiringOnboardingService`, onboarding upload/review flows, legacy admin onboarding routes, enhanced onboarding services, direct invite, and candidate assignment flows.
- `staff_members`: written by `HiringRosterService`, `HiringOnboardingService`, `admin-onboarding-staff.service`, legacy admin/venue staff APIs, worker ops, and identity merge.
- `employment_assignments`: written by `HiringRosterService`, `HiringOnboardingService`, `hiring-candidate-assignment.service`, `staff-shift-assignment-sync.ts`, and workforce assignment helpers.
- `staff_shifts`: written by `app/api/admin/staffing/shifts/*`, venue shift routes, event staff routes, admin staff route, and site-map zone sync.
- `staff_shift_assignments`: written by `HiringRosterService` assignment paths.
- `work_mode_publications`: written by existing admin event/logistics/tour publication flows.
- `attendance_entries`: read/written by `app/api/admin/workforce/attendance/route.ts`.

Current mismatch with the suite: shift publication is currently a direct sync over `staff_shifts` through `publishStaffShifts`, not a versioned publication model with recipients, acknowledgement versioning, change diff, and rollback.

## Employer Context And Authorization

- Staff page resolves employer with `resolveAdminWorkforceEmployer`.
- Hiring APIs resolve actor with `resolveHiringActorFromRequest`.
- Acting account resolution exists in `lib/auth/acting-context.ts`.
- Scheduling still hydrates employer from client account when server scope is missing.
- Workforce authority helpers validate org/parent access for some assignment and scheduling paths.

Current mismatch with the suite: there is no one trusted `WorkforceContext` contract. URL query values still carry `display_name`, and scheduling can fall back to client-derived context. P1 must derive display data and permissions on the server and reject invalid child scopes.

## Schema, RLS, And Storage Evidence

Known workforce-related schema migrations include:

- `20260625000000_polymorphic_hiring_entity.sql`: employer columns, indexes, RLS policies for hiring tables, staff, and employment assignments.
- `20260625020000_staff_onboarding_storage_compliance.sql`: private staff document storage and compliance metadata.
- `20260630211500_operations_work_mode_publications.sql`: Work Mode publications and RLS.
- `20260715011112_account_scoped_admin_data.sql`: account/org scoping for staff and shifts.
- `20260804003756_staff_shifts_soft_delete.sql`, `20260804093000_staff_shift_assignments_tour_id.sql`, and `20260804102000_backfill_roster_assignments_from_audit.sql`: recent shift/assignment evolution.
- `20260721235608_admin_feature_flag_governance_rel008.sql`: governed organization-scoped admin feature flags.

Supabase guidance checked on 2026-08-12:

- Supabase database migrations docs say schema changes should be captured in migration files and remote schema changes should go through migrations, not direct dashboard edits.
- Supabase CLI docs define `supabase migration new <migration name>` as the local migration creation path.
- Supabase RLS docs note views bypass RLS by default and recommend `security_invoker = true` for Postgres 15+ views used by `anon` or `authenticated`.
- Supabase RLS docs note `raw_user_meta_data` is user-updatable and should not be used for authorization; `raw_app_meta_data` is the safer authorization metadata source.

P1-P3 database work must use additive CLI migrations, avoid database reset, test RLS, and keep read models security-invoker or unexposed.

## Baseline Integrity Counts

Baseline evidence provided on 2026-08-12 is stored at `docs/staff-operations/integrity-counts-2026-08-12.csv`.

Key results:

- Employer scope is present for `job_applications`, `staff_onboarding_candidates`, `staff_members`, and `employment_assignments` (`0` missing-scope rows for each).
- `approved_applications_without_candidate` is `21`; this should become a P2/P6 repair report and explicit recovery workflow before application approval is considered fully reliable.
- `staff_members_without_employment_assignment` is `4`; this should become a P2 repair report and activation/lifecycle consistency check.
- `attendance_entries` is missing; P9 attendance work must add the table additively or adapt the attendance API to the canonical attendance storage chosen in the schema audit.
- Cross-employer staff/employment links, orphaned employment assignments, inactive-staff future shifts, and shifts without staff-member rows are all `0`.
- `staff_documents` currently reports `4` approved and `3` uploaded documents.

## Status And Lifecycle Evidence

Current code uses overlapping status vocabularies:

- Application statuses include pending/reviewed/shortlisted/waitlisted/approved/rejected/withdrawn style flows.
- Candidate/onboarding statuses include pending/in_progress/completed/rejected plus stage/progress fields.
- Roster statuses normalize pending/active/inactive/suspended/offboarded and map on_leave/terminated.
- Employment assignment statuses include invited/confirmed/active and shift-derived states.
- Shift statuses include scheduled/confirmed/completed/cancelled plus UI-derived open/pending/published/declined.
- Attendance uses `attendance_entries.entry_type` and needs a canonical attendance status model.

Current mismatch with the suite: statuses are mixed across lifecycle dimensions. P2 must introduce separate canonical hiring, onboarding, employment, compliance, assignment, schedule, publication, and attendance status types before broad UI changes.

## Existing Tests

Relevant current suites include:

- Hiring: `__tests__/hiring/*.test.ts`.
- Work Mode: `__tests__/work-mode/*.test.ts`.
- Workforce/admin domain helpers: `__tests__/admin/workforce-*.test.ts`, `__tests__/admin/schedule-publication.test.ts`, `__tests__/admin/staff-operations.test.ts`, and `__tests__/admin/staffing-matrix.test.ts`.
- Real-data hiring smoke: `__tests__/hiring/phase-13-real-data.test.ts`, `tests/hiring/phase-13-real-data.spec.ts`, and `supabase/tests/phase_13_hiring_real_data_checks.sql`.
- E2E staff flow: `tests/e2e/03-hire-staff-shift.spec.ts`.

Current mismatch with the suite: tests exist, but P0 still needs a dedicated baseline cross-tenant matrix for the new `WorkforceContext` and canonical workforce APIs before marking P1 security complete.

## Feature Flags

Feature flag infrastructure exists, but the requested workforce flags do not yet appear as implemented keys:

- `workforce_context_v2`
- `staff_command_center`
- `staff_people_directory`
- `staff_schedule_v2`
- `staff_publications`
- `staff_day_of`
- `staff_attention_engine`

P11 includes broad rollout, but the flags must be introduced earlier as off-by-default gates before replacing active behavior.

## Baseline Commands Run

- `git status --short --branch`
- `find app/admin/dashboard/staff app/api/hiring app/api/admin/workforce app/api/admin/staffing app/api/staff app/api/workforce components/hiring components/admin/scheduling components/admin/workforce -maxdepth 4 -type f`
- `find lib -maxdepth 4 -type f | rg '(hiring|workforce|staff-shift|onboarding|schedule)'`
- `rg` searches for active writes to `staff_members`, `employment_assignments`, `job_applications`, `staff_onboarding_candidates`, `staff_shifts`, `staff_shift_assignments`, `work_mode_publications`, `attendance_entries`, `staff_documents`, and `staff_invitations`
- `find __tests__ lib tests supabase/tests -type f | rg '(hiring|work-mode|workforce|staff|schedule|attendance|rls|phase_13)'`
- `find app/api -maxdepth 5 -type f | rg '(hiring|staff|staffing|workforce|onboarding|applications|job-postings|work-mode|attendance)'`
- `npm run test:unit -- __tests__/admin/workforce-authority.test.ts __tests__/hiring/hiring-permissions.test.ts __tests__/hiring/staff-dashboard-route.test.ts`

## P0 Blockers And Required Next Evidence

- Baseline database counts were provided on 2026-08-12 and stored as `docs/staff-operations/integrity-counts-2026-08-12.csv`; the exact Supabase target name was not included in the provided output.
- Existing authority/permission/dashboard tests pass, but a new baseline `WorkforceContext` isolation test has not been added yet.
- Full lint/typecheck/build were not run because this pass changed documentation only. They are required once implementation code changes begin.

## Next Implementation Step

Continue with the first blocked P0 item in `progress-checklist.json`: add a baseline cross-tenant test harness for `WorkforceContext` and workforce API scoping.
