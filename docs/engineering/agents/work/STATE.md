# Work state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `WFC-005` — blocked/queued_postlaunch; POSTLAUNCH-WORKFORCE
- `WFC-006` — blocked/queued_postlaunch; POSTLAUNCH-WORKFORCE
- `WFC-012` — blocked/queued_postlaunch; POSTLAUNCH-WORKFORCE
- `WFC-014` — blocked/queued_postlaunch; POSTLAUNCH-WORKFORCE
- `WFC-019` — blocked/queued_postlaunch; POSTLAUNCH-WORKFORCE
- `WORK-006` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `WORK-010` — blocked/waiting_dependency; CORE-WEB-LAUNCH
<!-- generated-agent-state:end -->

- Last reviewed SHA: `d21769046d517898144ee09a1c7bb4a7d36b068f` (dirty working tree, 320 entries, 6 concurrent lanes)
- Last reviewed at: 2026-09-25 (Wave 34: WORK-005…009 re-verified; WORK-009 merge-mode ordering defect fixed; DB-008 code-drift cluster dispositioned)
- Historical active-task note (superseded by generated queue summary): WORK-005, WORK-006, WORK-007, WORK-008, WORK-009 — all active, all blocked on hosted evidence that does not exist; no local defect remains in work-owned code
- Confidence: working — strong read-model/service/test evidence; live PII vault and worker check-in not verifiable until staged WS-1.1 migrations are applied

## Durable facts

- Mission: Own jobs, hiring, workforce, staffing, shifts, onboarding, and work mode.
- Default working set is recorded in `WORKING_SET.json`. **Boundary note:** the worker API that `app/work/**` consumes (`app/api/work-mode/**`, `hooks/use-work-mode.ts`, `types/hiring-roster-work-mode.ts`) sits outside the declared working set (GAPS R1); expand it or move the routes before the next implementation task.
- Employment assignment lifecycle: `employment_assignments` statuses `invited → confirmed → active` (plus decline/ended), with per-assignment capability permissions (`lib/work-mode/read-model.ts`, `types/hiring-roster-work-mode.ts`).
- Work Mode uses `/work/overview` as the canonical cross-assignment hub; legacy `/work/today` redirects preserve assignment context. Confirmed or active assignments open `/work/events/[eventId]`, which consolidates positions and exposes only published, audience-appropriate, permission-appropriate worker content.
- Work Mode reads are partial-source tolerant: assignment/task success remains visible if publications or communications fail. Explicit admin reminders reuse `team_communications` with `message_type = 'reminder'` and `remind_at`; worker communication mutations enforce recipient or confirmed-event-assignment ownership.
- Worker check-in/out + publication acknowledge are gated on `FEATURE_WORK_MODE_WORKER_ACTIONS=1` and the reviewed worker-actions SQL (`20260823170000_worker_checkin_contract.sql`), which is not yet applied.
- Work-history surface (WORK-008): `getWorkModeHistory` in `lib/work-mode/read-model.ts` exposes ALL `employment_assignments` statuses (active `invited/confirmed/active` + terminal `completed/cancelled/declined`) through `GET /api/work-mode/history` and the Work Mode "History" view. It reuses canonical `staff_shifts` + `staff_performance_metrics` (event-scoped metric preferred, most recent staff-wide fallback); timed check-in/out counts come only from `work_mode_check_in_events` when `FEATURE_WORK_MODE_WORKER_ACTIONS=1` (DB-010 not applied hosted), otherwise attendance degrades to shift status. Venue context is event-derived — assignments usually carry the venue on the event, not the row — and org ids load in a follow-up pass after events load.
- Hiring PII hardening (`20260823210000_harden_hiring_onboarding_pii.sql` — `staff_onboarding_sensitive_vault`, `can_view_hiring_pii`, applicant-own RLS rewrite) is STAGED, NOT applied (WS-1.1); `_hiring/onboarding/sensitive/[candidateId]` cannot be fully verified until it lands.
- Staged WS-1.1 set shared with database/venue agents: hiring PII hardening, venues/RBAC RLS baseline, webhook ledger, money-path transactional RPCs. All coordination must flow through the gated DB pipeline (handoff to database agent).
- Status/pipeline constants: `JOB_POSTING_STATUSES` (draft/published/paused/closed/filled/archived), `JOB_APPLICATION_STATUSES` (pending/reviewed/shortlisted/approved/accepted/rejected/withdrawn), `HIRING_PIPELINE_STAGES` (application_received → hired/rejected), `allowedApplicationTransitions` (`lib/hiring/states.ts`, `lib/hiring/application-transitions.ts`).
- PII handling: `SENSITIVE_FIELD_TYPES` = ssn/bank_info/tax_info/id_document + key-pattern detection, redaction and last-4 extraction (`lib/hiring/sensitive-field-utils.ts`).
- Staffing persona matrix is published in `docs/organization-personas.md`. It covers organization owner/admin, operations/workforce/finance managers, assigned worker, artist/venue staff, revoked/cross-organization, and unauthenticated personas. It is an evidence map to Supabase RLS/RBAC migrations, not a replacement for them.
- Event-zone bridge contract (WORK-003): `lib/zones/event-zones.ts` `resolveOrCreateEventZone(supabase, CreateEventZoneInput)` + `linkLegacyZone(supabase, 'site_map_zones'|'staff_zones', legacyZoneId, eventZoneId)` are the canonical helpers; `lib/site-map/zone-roster-sync.ts` `syncZoneOwnershipToRoster` keeps roster/staff_shifts aligned. The site-map zones POST route wires resolveOrCreateEventZone+linkLegacyZone after insert (scoped to `access.siteMap.event_v2_id`); the `[zoneId]` PUT restores syncZoneOwnershipToRoster when `event_zone_id || lead_user_id` is set. Both bridge failures are non-fatal (warning-only) so map writes never fail on canonical-zone drift.
- Worktree note (WORK-003): the working-tree `[zoneId]` route had dropped `syncZoneOwnershipToRoster` during a parallel `withAdminCapability` refactor (base SHA still had it); the site-map-ops-upgrade contract test asserts on working-tree content, so concurrent refactors of `app/api/admin/logistics/site-maps/[id]/zones/` must keep the bridge calls.
- Machine constraint (WORK-003): full-repo `npx tsc --noEmit` OOMs on this Mac (V8 heap, exit 134, even with 8GB heap and scoped project). Scoped typecheck recipe: extend repo `tsconfig.json` in a temp project with `files: [next-env.d.ts, <changed-files>]` and run with `NODE_OPTIONS=--max-old-space-size=8192`; large generated `lib/database.types.ts` (34k lines) makes even scoped checks slow (several minutes).
- Unified jobs merge contract (WORK-009, DOMAIN-014): `GET /api/jobs?merge=1` orders **both** sources by `created_at DESC` + `id` tiebreak, because `mergeUnifiedJobsByDate` (`lib/rebuild/unified-jobs-list.ts`) is the unified sort key and a per-source window of `page * perPage` only covers the unified slice when the source order matches it. `sort_by`/`sort_order` still order the non-merged `artist_jobs` list. The `id` tiebreak exists because a shared `created_at` otherwise lets the page-1/page-2 window boundary reorder between requests. `job_posting_templates.id/title` and `artist_jobs.id/title` are non-nullable in the generated contract, so the route's self-heal filter can only drop empty-string titles — the previously recorded `unified_total` overcount is effectively unreachable.
- Retired workforce surface (DOMAIN-015): `staff_applications`, `staff_jobs`, `get_staff_dashboard_stats` and `calculate_ai_match_score` exist only in archived/backup SQL and must never be migrated forward. Canonical destinations: `staff_members` (`20260823070000_staff_members_canonical_roster.sql`), `organization_people` (crew/contractors), `job_board_postings` / `organization_job_postings` (postings). Zero-importer evidence re-derived in Wave 34 and handed off; `job_board_postings` / `organization_job_postings` / `increment` still have entry-reachable consumers and need an owner repoint decision, not a deletion.
- `work_mode_check_in_events` and `work_mode_publication_acknowledgements` are created by the active chain (`20260922155356_worker_actions_scope_reconciliation.sql`) but absent from `lib/database.types.ts` — the only two chain-created relations missing from the generated contract in the whole DB-008 inventory. Consumers reach them through documented local `any`-escapes (`lib/work-mode/read-model.ts:806-812`, `app/api/work-mode/assignments/[id]/actions/route.ts:41-43`, `app/api/admin/events/[id]/work-mode/attendance/route.ts:42-44`). Only a database-lane regeneration clears it; never hand-edit the types.
- Worker action security posture (WORK-006, re-verified 2026-09-25): the `FEATURE_WORK_MODE_WORKER_ACTIONS` gate is the first statement in both handlers, so the flag-off path returns 503 `unavailable` without constructing a Supabase client; the worker action route uses the request-scoped `createClient()` only and never a service-role client, so worker writes stay inside RLS; authorization (assignment-in-own-read-model → 404, `permissions.check_in_out` → 403) precedes every insert.
- Wave grant vs `WORKING_SET.json` (DOMAIN-016): a wave's file grant overrides `WORKING_SET.json` for that round. Wave 34's work grant withheld `app/api/hiring/**`, `lib/hiring/**`, `lib/work-mode/**`, `app/staffing/**` and `components/hiring/**`, all of which `WORKING_SET.json` lists. `lib/work/**` and `lib/worker/**` do **not** match `lib/work-mode/**` — do not read a grant glob as coverage of the worker's primary data path (GAPS R1).

## Current focus

- All five open work tasks are blocked on the same absent thing: an isolated staging deployment with campaign actors. No local defect remains in work-owned code, so the next productive step is receiving-side evidence, not more implementation.
- The single highest-yield type fix available to this domain is a database-lane regeneration that declares `work_mode_check_in_events` and `work_mode_publication_acknowledgements` (`HF-WORK-034-WORKER-ACTIONS-TYPE-SURFACE`). It is blocked behind DB-008's recorded finding that the generated contract is not reproducible from the chain.
- Reconcile the wave grant with `WORKING_SET.json` before the next implementation task, and rename the declared paths to `lib/work-mode/**` and `app/api/work-mode/**` so a glob like `lib/work/**` cannot be mistaken for coverage.

## Known risks

- Worktree dirty (386 entries); generated maps predate the task base SHA — refresh with `npm run agents:generate` before relying on map rows for implementation tasks.
- Three employer-facing hiring route families (`/api/hiring/**`, `/api/admin/**`, `/api/venue/hiring/**`) + legacy `/api/job-applications` overlap; building on the wrong one is the top implementation hazard (GAPS I1).
- Three onboarding stacks (candidate `/api/hiring/onboarding/**`, admin `/api/admin/onboarding/**`, legacy `/api/onboarding/**`) with overlapping tables (GAPS I3) — do not add new onboarding tables until the owner answers Q4.
- `.agents/` legacy ledgers for this area do not exist; `docs/work-packets/TA-PH0.md` is the only bounded work packet and remains all-unchecked.

Update this file only when a task establishes a durable fact future work needs.

## Owner direction — 2026-09-10

Hiring surfaces remain separate where their responsibilities differ until a parity
contract is evidenced. Staffing table selection remains provisional pending
Database reconciliation; assignment tables cover shift placement, while employment,
onboarding, applications, and job postings converge through documented bridges.

## Workforce Command Center assignment — 2026-09-26

- Goal: own WFC services, APIs, scheduling behavior, manager-controlled status, action projection, attendance, actual time, costs, and payroll logic.
- Queued tasks: `WFC-005`, `WFC-006`, `WFC-012`, `WFC-014`, and `WFC-019`; each remains blocked on the recorded Database or upstream service contract and does not displace WORK-005 through WORK-009.
- Required handoff: provide Admin with stable typed APIs, authorization behavior, partial-source semantics, audit behavior, and focused contract evidence; never emulate missing schema in production code.
- Governing plan: `docs/engineering/exec-plans/active/WFC-COMMAND-CENTER-20260926.md`.
