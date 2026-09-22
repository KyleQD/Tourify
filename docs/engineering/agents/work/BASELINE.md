# Work baseline (WORK-001 audit)

- Audited SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b` (task base_sha; worktree dirty, 386 entries)
- Map evidence: `docs/engineering/generated/` (routes/api-routes/components/database-objects/permissions/integrations), generated 2026-09-09T01:05:02Z at SHA `a7193116c5a677b1c2939aa4a66e9415dac6eed1`
- Type: read-only audit; no production code or migration files changed
- Domain boundary: jobs, hiring, workforce, staffing, shifts, onboarding, work mode
- Declared working set: `docs/engineering/agents/work/WORKING_SET.json`

## What the area is trying to build

The area implements the full worker lifecycle on Tourify:

1. **Employment assignment model** — `employment_assignments` with statuses `invited → confirmed → active` (plus decline/ended), per-assignment capability permissions (e.g. `check_in_out`), and event/tour/venue/org scoping (`lib/work-mode/read-model.ts`, `types/hiring-roster-work-mode.ts`, migration `20260609000200_employment_assignments.sql`, RLS hardening `20260823072000_shift_rls_hardening.sql`).
2. **Hiring pipelines** — polymorphic employer (org/venue) hiring with job postings, applications, candidates, onboarding response collection, PII vault, roster management, and audit events (`app/api/hiring/**`, `lib/hiring/**`, `20260625000000_polymorphic_hiring_entity.sql`, `20260823180000_hiring_lifecycle.sql`, `20260821180438_job_posting_scopes_and_organization_seats.sql`).
3. **Staffing / shifts** — staff members, shifts, zones, shift assignments, performance metrics, overview cache/RPC, and alerts (`app/api/admin/staffing/**`, `app/api/admin/workforce/**`, `20250818120000_admin_staffing_core.sql`, `20260714015225_hiring_hub_roster_management_compat.sql`, `20260409133000_staffing_overview_rpc.sql`).
4. **Onboarding** — candidate-facing onboarding upload/compliance/sensitive endpoints, admin onboarding workflows/templates/role-packs, worker onboarding profiles, and the staged PII vault (`app/api/hiring/onboarding/**`, `app/api/admin/onboarding/**`, `20260625020000_staff_onboarding_storage_compliance.sql`, `20260709210901_worker_onboarding_profiles.sql`, staged `20260823210000_harden_hiring_onboarding_pii.sql`).
5. **Work Mode (worker surface)** — worker-facing hub at `/work/{today,schedule,tasks,updates,maps,day-sheet,documents,travel,pay,contacts,check-in}` with assignment accept/decline, published work packets (site maps, day sheets, itineraries, pay statements), task lists, and gated check-in/out worker actions (`app/work/**`, `components/work-mode/work-mode-workspace.tsx`, `hooks/use-work-mode.ts`, `app/api/work-mode/**`, `lib/work-mode/*`, `20260630211500_operations_work_mode_publications.sql`, `20260819205907_connected_worker_work_hub.sql`, `20260823170000_worker_checkin_contract.sql`).
6. **Job board** — public jobs listing and artist collaboration jobs (`app/jobs/**`, `components/artist-jobs/**`, `20241220000000_artist_jobs_system.sql`, `20250120000000_extend_artist_jobs_for_collaborations.sql`).

### Intended direction (cited)

- **WS-1.1 Database foundation** (`docs/DEVELOPMENT_BACKLOG.md` §WS-1.1): complete migration reconciliation; apply staged security migrations through the gated pipeline including the **hiring onboarding PII hardening** migration; accept criteria require a **persona matrix covering staffing personas** and a clean linter report on the new baseline.
- **WS-1.7 Systematic internal-guard sweep** (§WS-1.7): classify the hiring/staffing mutation routes (verified: zero genuinely unguarded mutations; ~8 guard idioms in use), then codify ONE standard wrapper.
- **WS-0.9 Private storage for sensitive docs**: sensitive onboarding docs moved to `private-docs` with signed URLs; backfill migration pending DB pipeline approval.
- Work packet `docs/work-packets/TA-PH0.md`: presenter contract must explicitly include lifecycle and tour/event scope fields; hiring/tour verification under five-city release checks.
- PII hardening migration manifest `docs/engineering/migration-validation/20260823210000_harden_hiring_onboarding_pii.json`: adds `staff_onboarding_sensitive_vault`, `can_view_hiring_pii`, replaces permissive hiring policies with applicant-own reads and `onboarding_responses_employer_manage`; **staged, not applied**; postflight requires "no policy on hiring tables grants authenticated-wide SELECT", "vault readable only via can_view_hiring_pii", "applicant self-read intact".

## Routes (pages)

| Path | Purpose | Evidence |
| --- | --- | --- |
| `/work` | Redirect to `/work/today` | `app/work/page.tsx` |
| `/work/[view]` | Work Mode workspace; 11 views (today, schedule, tasks, updates, maps, day-sheet, documents, travel, pay, contacts, check-in); `notFound()` on invalid view | `app/work/[view]/page.tsx`, `lib/work-mode/navigation.ts` |
| `/work/site-maps/[id]` | Worker-facing published site map | `app/work/site-maps/[id]/page.tsx` |
| `/work/loading`, `/work/error` | Suspense fallbacks | `app/work/loading.tsx`, `app/work/error.tsx` |
| `/jobs` | Public job board | `app/jobs/page.tsx` |
| `/jobs/[id]` | Job detail + quick apply | `app/jobs/[id]/page.tsx`, `app/jobs/[id]/layout.tsx` |
| `/jobs/my-applications` | Applicant's submitted applications | `app/jobs/my-applications/page.tsx` |
| `/staffing/invite/[token]` | Staffing invite acceptance | `app/staffing/invite/[token]/page.tsx` |

## API routes (working set)

### `/api/hiring/**` (22 routes — org/venue polymorphic hiring)
| Route | Methods | Permission stamp (`docs/engineering/generated/permissions.md`) |
| --- | --- | --- |
| `applications` | GET, POST | manual review required |
| `applications/[id]` | PATCH | manual review required |
| `applications/[id]/star` | PATCH | manual review required |
| `applications/document` | GET | session/auth, service role |
| `applications/upload` | POST | session/auth |
| `apply/profile-preview` | GET | session/auth |
| `candidates/[id]/approve` | POST | entity/RBAC |
| `candidates/[id]/assignment` | PATCH | entity/RBAC |
| `candidates/[id]/onboarding` | PATCH | entity/RBAC |
| `dashboard` | GET | manual review required |
| `invite` | POST | manual review required |
| `job-postings` | GET, POST | manual review required |
| `job-postings/[id]` | DELETE, GET, PATCH | manual review required |
| `job-postings/[id]/repost` | POST | manual review required |
| `job-postings/options` | GET | manual review required |
| `onboarding/compliance/[candidateId]` | GET | session/auth |
| `onboarding/sensitive/[candidateId]` | GET | manual review required |
| `onboarding/upload` | POST | session/auth |
| `roster` | GET, POST | entity/RBAC |
| `roster/[memberId]` | GET, PATCH | entity/RBAC |
| `roster/[memberId]/assignment` | POST | entity/RBAC |
| `roster/export` | GET | entity/RBAC |

### `/api/job-applications/**`
| Route | Methods | Permission stamp |
| --- | --- | --- |
| `job-applications` | GET, POST | session/auth, service role |

## Supporting API routes outside the declared working set (consumed by this area)

Worker surface:
- `app/api/work-mode/assignments` (GET, POST), `assignments/[id]` (GET, PATCH), `assignments/[id]/respond`, `assignments/[id]/actions` — worker accept/decline, check-in/out, acknowledge (entity/RBAC per map).

Shared/overlapping surfaces (owned by admin/venue/artist agents, directly implementing work-domain data):
- `app/api/admin/workforce/**` — people, payroll-exports, conflicts, health, identity-merge, conversions, attendance.
- `app/api/admin/staffing/**` — shifts, shifts/[id], shifts/publish, zones, performance, job-postings.
- `app/api/admin/onboarding/**` — ~19 routes: review, templates/[id], templates, templates/clone, templates/role-packs, invite-new-user, enhanced-invite, dashboard, update-status, workflows, workflows/advance, workflows/analytics, add-existing-user, initialize-templates, candidates, candidates/[id], candidates/[id]/credentials, documents/[documentId]/review.
- `app/api/admin/job-postings/**` — route, [id].
- `app/api/admin/applications/**` — route, [id], [id]/audit.
- `app/api/venue/hiring/**` — hiring, applications, applications/[id], audit, job-postings, job-postings/[id].
- `app/api/me/applications` — applicant timeline.
- `app/api/artist-jobs/**` — applications, [id]/applications.
- `app/api/onboarding/**`, `app/api/onboarding-templates/**`, `app/api/migrations/create-onboarding` — legacy universal onboarding stack.

## Components

### Work Mode (worker surface)
- `components/work-mode/work-mode-workspace.tsx` — single client workspace: assignment picker, 11-view nav, accept/decline, check-in/out, publication acknowledge, UX telemetry via `lib/ux/client-telemetry`; consumes `hooks/use-work-mode.ts`.

### Hiring surface (`components/hiring/`, ~56 files)
- Shells/panels: `hiring-dashboard-shell.tsx`, `hiring-dashboard.tsx`, `hiring-applications-panel.tsx`, `hiring-jobs-panel.tsx`, `hiring-roster-panel.tsx`, `hiring-onboarding-panel.tsx`, `hiring-overview-panel.tsx`, `hiring-audit-panel.tsx`, `hiring-state-card.tsx`, `hiring-missing-scope.tsx`, `index.ts` (barrel).
- Application review: `application-review-panel.tsx`, `application-review-actions.tsx`, `application-review-filters.tsx`, `application-review-empty-state.tsx`, `application-detail-drawer.tsx`, `application-responses-list.tsx`, `application-applicant-summary.tsx`, `application-job-summary.tsx`, `application-status-badge.tsx`, `application-rating.tsx`, `application-insights-badges.tsx`, `application-star-toggle.tsx`, `bulk-application-actions.tsx`, `applicant-profile-snapshot-view.tsx`, `apply-screening-fields-form.tsx`, `apply-profile-preview-card.tsx`.
- Job posting: `admin-job-posting-wizard.tsx`, `job-posting-builder.tsx`, `job-posting-array-field.tsx`, `job-posting-lifecycle-actions.tsx`, `approve-onboarding-template-dialog.tsx`.
- Candidates/roster/staff: `candidate-card/*`, `candidate-detail-drawer.tsx`, `candidate-document-review.tsx`, `roster-add-staff-dialog.tsx`, `roster-assignment-dialog.tsx`, `roster-filters.tsx`, `roster-member-detail-drawer.tsx`, `roster-task-assignment-dialog.tsx`, `team-roster-panel.tsx`, `workforce-ui.tsx`, `work-mode-permissions-card.tsx`.
- Onboarding: `onboarding-kanban.tsx`, `onboarding-kanban-filters.tsx`, `onboarding-module/*`, `compliance-status-card.tsx`, `template-manager.tsx`, `template-library.tsx`, `template-builder/*`, `workflow-timeline.tsx`.
- Staff operations: `staff-operations-overview.tsx`, `staff-operations-kpi-bar.tsx`, `staff-operations-tabs.tsx`, `staff-operations-analytics.tsx`, `staff-operations-channels-dialog.tsx`.
- Other: `quick-apply-modal.tsx`, `venue-hiring-kanban.tsx`.

### Job posting / artist jobs (cross-surface)
- `components/job-posting/artist-job-posting-wizard.tsx`, `components/job-posting/job-posting-wizard-shell.tsx`.
- `components/artist-jobs/` — `job-card.tsx`, `job-filters.tsx`, `job-posting-modal.tsx`.
- `components/jobs/my-staffing-applications.tsx`, `components/forms/application-form.tsx`.

## Services / lib

### `lib/hiring/` (~30 modules — central domain service layer)
- State/transitions: `states.ts` (JOB_POSTING_STATUSES: draft/published/paused/closed/filled/archived; JOB_APPLICATION_STATUSES: pending/reviewed/shortlisted/approved/accepted/rejected/withdrawn; ARTIST_BOARD_APPLICATION_STATUSES; HIRING_PIPELINE_STAGES: application_received → hired/rejected), `application-transitions.ts` (allowedApplicationTransitions).
- Workflow/schema: `candidate-workflow-schema.ts`, `candidate-workflow-utils.ts`, `application-review-schema.ts`, `job-posting-builder-schema.ts`, `hiring-compliance-schema.ts`, `roster-schema.ts`, `quick-apply-fields.ts`, `template-builder-utils.ts`, `template-snapshot.ts`, `default-onboarding-templates.ts`, `onboarding-step-groups.ts`, `onboarding-response-display.ts`, `role-packs.ts`.
- Permissions/resolution: `work-mode-permissions.ts`, `job-seat-permissions.ts`, `job-posting-lifecycle.ts`, `employer-search-params.ts`, `resolve-employer-from-application.ts`, `resolve-scheduling-org-id.ts`, `resolve-admin-workforce-employer.ts`, `hiring-entity-id.ts`, `hiring-entity-from-account.ts`.
- Data/presenters: `api-presenters.ts`, `audit-activity-presenter.ts`, `hiring-dashboard-utils.ts`, `hiring-file-validation.ts`.
- PII: `sensitive-field-utils.ts` (ssn/bank_info/tax_info/id_document detection, redaction, last-4 extraction).

### `lib/work-mode/`
- `navigation.ts` — WORK_MODE_VIEWS (11 views) + `isWorkModeView` guard.
- `read-model.ts` — `getWorkModeAssignments(supabase, userId)`: reads `employment_assignments` (invited/confirmed/active), joins `staff_shifts`, reads `work_mode_publications` (published, event/tour scoped), reads `tasks` + onboarding-invite `notifications` joined to `staff_onboarding_candidates` progress; returns assignments/publications/tasks; `workerActionsAvailable` gated on `FEATURE_WORK_MODE_WORKER_ACTIONS === "1"`.

### Supporting (outside declared working set)
- `hooks/use-work-mode.ts` — client state/fetch for the workspace; `hooks/use-hiring-dashboard-fetch.ts`, `hooks/use-hiring-entity.tsx`.
- `types/hiring-roster-work-mode.ts` — WorkModeAssignmentListItem / WorkModePublication / WorkModeTaskItem / EmploymentAssignmentStatus contracts.
- `lib/supabase/hiring-service-client.ts` (per permissions map); `lib/auth/hiring-permissions.ts`, `lib/auth/hiring-entity-resolver.ts`.

## Database objects (from `docs/engineering/generated/database-objects.md`)

### Work tables
| Table | Source |
| --- | --- |
| `employment_assignments` + `set_employment_assignments_updated_at` | `20260609000200_employment_assignments.sql` |
| `job_applications` (+ applicant-in-own policies) | `20260823210000_harden_hiring_onboarding_pii.sql`, `20260625000000_polymorphic_hiring_entity.sql` |
| `job_posting_templates` | `20250818120000_admin_staffing_core.sql` |
| `staff_members`, `staff_shifts`, `staff_zones`, `staff_onboarding_candidates`, `staff_performance_metrics`, `venues` | `20250818120000_admin_staffing_core.sql` |
| `staff_shift_assignments` + `staff_shift_assignments_employer_manage_hiring` | `20260714015225_hiring_hub_roster_management_compat.sql` |
| `staff_documents` | `20260625020000_staff_onboarding_storage_compliance.sql` |
| `staff_onboarding`, `staff_onboarding_steps`, `staff_onboarding_templates`, `staff_schedules`, `staff_contracts`, `onboarding_flows`, `onboarding_templates`, `venue_permissions`, `venue_roles`, `venue_role_permissions`, `venue_shifts`, `venue_shift_assignments`, `venue_recurring_shifts` | `20260413200000_port_missing_tables.sql` |
| `staff_onboarding_sensitive_vault`, `onboarding_responses` (+ `can_view_hiring_pii`) | `20260823210000_harden_hiring_onboarding_pii.sql` (STAGED, not applied) |
| `staff_invitations` | `20250813123000_create_staff_invitations_if_missing.sql` |
| `staff_messages`, `team_communications` | `20250818120000_admin_staffing_core.sql`, `20250818121500_notifications_and_staff_messages.sql` |
| `worker_onboarding_profiles` | `20260709210901_worker_onboarding_profiles.sql` |
| `work_mode_publications`, `day_sheet_receipts` | `20260630211500_operations_work_mode_publications.sql` |
| `work_mode_publication_audiences`, `workforce_channel_links`, view `work_hub_integrity_issues` | `20260819205907_connected_worker_work_hub.sql` |
| `staffing_overview_cache` (+ `staffing_overview_counts`, `refresh_staffing_overview_cache`) | `20260409133000_staffing_overview_rpc.sql`, `20260409134500_staffing_overview_cache.sql`, `20260414140000_fix_security_linter_views_and_rls.sql` |
| `staffing_alert_events`, `staffing_api_telemetry` | `20260409142000_staffing_alert_events.sql`, `20260409140000_staffing_api_telemetry.sql` |
| `hiring_audit_events` | `20260330120000_hiring_audit_events.sql` |
| `hiring_eligibility_snapshots` | `20260409183000_hiring_eligibility_gate.sql` |
| `event_crew_assignments`, `staff_reviews`, `staff_member_skills` | `archive/enhanced_staff_management_schema.sql` |
| `staff_applications`, `staff_jobs` | `archive/critical_missing_tables.sql` |
| view `unified_staff_roster` | `20260602120000_unified_staff_roster.sql` |

### Artist jobs family (public job board)
`artist_jobs`, `artist_job_applications`, `artist_job_categories`, `artist_job_saves`, `artist_job_views`, `collaboration_applications` (`20241220000000_artist_jobs_system.sql`, `20250120000000_extend_artist_jobs_for_collaborations.sql`); public read `20260714000825_allow_public_read_open_jobs.sql`; `increment_job_posting_views`, `update_job_application_count`, `update_job_view_count`, `update_artist_jobs_updated_at` functions.

### Work RPCs / functions (highest-leverage)
- `can_manage_hiring` (`20260625000000_polymorphic_hiring_entity.sql`)
- `can_view_hiring_pii` (`20260823210000_harden_hiring_onboarding_pii.sql` — staged)
- `canonical_application_status`, `hire_venue_candidate` (`20260823180000_hiring_lifecycle.sql`)
- `enforce_job_application_approval_gate` (`20260701024346_relax_hiring_approval_gate.sql`)
- `has_perm`, `is_org_member` (`20260821180438_job_posting_scopes_and_organization_seats.sql`)
- `worker_shift_check_in`, `worker_shift_check_out` (`20260823170000_worker_checkin_contract.sql`)
- `legacy_assignment_belongs_to_caller`, `legacy_venue_workforce_manager` (`20260823072000_shift_rls_hardening.sql`)
- `ensure_workforce_coordinator_channel`, `sync_workforce_coordinator_channel_from_roster` (`20260819205907_connected_worker_work_hub.sql`)
- `hire_from_job_board` (`archive/enhanced_staff_management_schema.sql`)

## Tests

| Area | Files | Evidence |
| --- | --- | --- |
| Hiring (32 files) | `__tests__/hiring/` — incl. `hiring-pii-permissions.test.ts`, `onboarding-upload-token.test.ts`, `id-document-compliance.test.ts`, `approve-roster-and-workforce.test.ts`, `worker-ops.service.test.ts`, `shift-assignment-notification.test.ts`, `roster-added-notification.test.ts`, `org-admin-scheduling-scope.test.ts`, `org-scoped-shifts-without-venue.test.ts`, `job-posting-lifecycle.test.ts`, `job-posting-scope-seats.test.ts`, `candidate-workflow-derivation.test.ts`, `candidate-list-normalization.test.ts`, `hiring-roster.service.test.ts`, `workforce-presenters.test.ts`, `event-tour-staffing-repair.test.ts`, `staff-shift-assignment-sync.test.ts`, `worker-onboarding-profile-reuse.test.ts`, `onboarding-approve-roster.test.ts`, `onboarding-response-display.test.ts`, `onboarding-step-groups.test.ts`, `template-snapshot-and-publish.test.ts`, `phase-13-real-data.test.ts`, `scheduling-demo-live-mode.test.ts`, `hiring-applicant-comms.test.ts`, `application-approval-notification.test.ts`, `audit-activity-presenter.test.ts`, `profile-snapshot.test.ts`, `staff-dashboard-route.test.ts`, `hiring-client.test.ts`, `hiring-onboarding-assignment.test.ts`, `hiring-permissions.test.ts` | `__tests__/hiring/` |
| Jobs | `job-posting-standardization.test.ts`, `jobs-flow.test.ts` | `__tests__/jobs/` |
| Work Mode | `work-mode-api.test.ts`, `ux-telemetry-api.test.ts` | `__tests__/work-mode/` |
| lib-level | additional unit coverage under `lib/hiring/__tests__/` | `lib/hiring/__tests__/` |

## Integration / environment facts

- Worker check-in/out and publication acknowledge are behind `FEATURE_WORK_MODE_WORKER_ACTIONS=1`; the workspace copy states the worker-actions SQL must be applied before check-in is enabled (`components/work-mode/work-mode-workspace.tsx`).
- Work Mode UX events flow through `lib/ux/client-telemetry` (`trackUxEvent`); flows: `work_mode`, `work_mode_assignment_response` (covered by `__tests__/work-mode/ux-telemetry-api.test.ts`).
- Staged, not-applied work migrations (from WS-1.1): hiring onboarding PII hardening `20260823210000_harden_hiring_onboarding_pii.sql`, venues/RBAC RLS baseline `20260823210100_venues_rbac_rls_baseline.sql`, webhook ledger `20260823200000_platform_webhook_events.sql`, money-path transactional RPC `20260823220001_money_path_transactional_rpcs.sql` — all awaiting the gated DB pipeline.

## What was intentionally not deep-dived (bounded)

- `app/api/admin/{workforce,staffing,onboarding,job-postings,applications}/**`, `app/api/venue/hiring/**`, `app/api/artist-jobs/**`, legacy `app/api/onboarding/**` — these implement work-domain data but sit in other agents' working sets; listed here as overlap evidence only.
- The four staged WS-1.1 migrations' SQL bodies (content recorded in migration-validation manifests).