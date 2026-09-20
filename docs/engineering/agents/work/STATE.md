# Work state

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b`
- Last reviewed at: 2026-09-09 (WORK-001 audit; generated maps at `a7193116c…`, 2026-09-09T01:05:02Z)
- Active task: WORK-004 (Work Mode overview and event workspace — completed 2026-09-11)
- Confidence: working — strong read-model/service/test evidence; live PII vault and worker check-in not verifiable until staged WS-1.1 migrations are applied

## Durable facts

- Mission: Own jobs, hiring, workforce, staffing, shifts, onboarding, and work mode.
- Default working set is recorded in `WORKING_SET.json`. **Boundary note:** the worker API that `app/work/**` consumes (`app/api/work-mode/**`, `hooks/use-work-mode.ts`, `types/hiring-roster-work-mode.ts`) sits outside the declared working set (GAPS R1); expand it or move the routes before the next implementation task.
- Employment assignment lifecycle: `employment_assignments` statuses `invited → confirmed → active` (plus decline/ended), with per-assignment capability permissions (`lib/work-mode/read-model.ts`, `types/hiring-roster-work-mode.ts`).
- Work Mode uses `/work/overview` as the canonical cross-assignment hub; legacy `/work/today` redirects preserve assignment context. Confirmed or active assignments open `/work/events/[eventId]`, which consolidates positions and exposes only published, audience-appropriate, permission-appropriate worker content.
- Work Mode reads are partial-source tolerant: assignment/task success remains visible if publications or communications fail. Explicit admin reminders reuse `team_communications` with `message_type = 'reminder'` and `remind_at`; worker communication mutations enforce recipient or confirmed-event-assignment ownership.
- Worker check-in/out + publication acknowledge are gated on `FEATURE_WORK_MODE_WORKER_ACTIONS=1` and the reviewed worker-actions SQL (`20260823170000_worker_checkin_contract.sql`), which is not yet applied.
- Hiring PII hardening (`20260823210000_harden_hiring_onboarding_pii.sql` — `staff_onboarding_sensitive_vault`, `can_view_hiring_pii`, applicant-own RLS rewrite) is STAGED, NOT applied (WS-1.1); `_hiring/onboarding/sensitive/[candidateId]` cannot be fully verified until it lands.
- Staged WS-1.1 set shared with database/venue agents: hiring PII hardening, venues/RBAC RLS baseline, webhook ledger, money-path transactional RPCs. All coordination must flow through the gated DB pipeline (handoff to database agent).
- Status/pipeline constants: `JOB_POSTING_STATUSES` (draft/published/paused/closed/filled/archived), `JOB_APPLICATION_STATUSES` (pending/reviewed/shortlisted/approved/accepted/rejected/withdrawn), `HIRING_PIPELINE_STAGES` (application_received → hired/rejected), `allowedApplicationTransitions` (`lib/hiring/states.ts`, `lib/hiring/application-transitions.ts`).
- PII handling: `SENSITIVE_FIELD_TYPES` = ssn/bank_info/tax_info/id_document + key-pattern detection, redaction and last-4 extraction (`lib/hiring/sensitive-field-utils.ts`).
- Staffing persona matrix is published in `docs/organization-personas.md`. It covers organization owner/admin, operations/workforce/finance managers, assigned worker, artist/venue staff, revoked/cross-organization, and unauthenticated personas. It is an evidence map to Supabase RLS/RBAC migrations, not a replacement for them.
- Event-zone bridge contract (WORK-003): `lib/zones/event-zones.ts` `resolveOrCreateEventZone(supabase, CreateEventZoneInput)` + `linkLegacyZone(supabase, 'site_map_zones'|'staff_zones', legacyZoneId, eventZoneId)` are the canonical helpers; `lib/site-map/zone-roster-sync.ts` `syncZoneOwnershipToRoster` keeps roster/staff_shifts aligned. The site-map zones POST route wires resolveOrCreateEventZone+linkLegacyZone after insert (scoped to `access.siteMap.event_v2_id`); the `[zoneId]` PUT restores syncZoneOwnershipToRoster when `event_zone_id || lead_user_id` is set. Both bridge failures are non-fatal (warning-only) so map writes never fail on canonical-zone drift.
- Worktree note (WORK-003): the working-tree `[zoneId]` route had dropped `syncZoneOwnershipToRoster` during a parallel `withAdminCapability` refactor (base SHA still had it); the site-map-ops-upgrade contract test asserts on working-tree content, so concurrent refactors of `app/api/admin/logistics/site-maps/[id]/zones/` must keep the bridge calls.
- Machine constraint (WORK-003): full-repo `npx tsc --noEmit` OOMs on this Mac (V8 heap, exit 134, even with 8GB heap and scoped project). Scoped typecheck recipe: extend repo `tsconfig.json` in a temp project with `files: [next-env.d.ts, <changed-files>]` and run with `NODE_OPTIONS=--max-old-space-size=8192`; large generated `lib/database.types.ts` (34k lines) makes even scoped checks slow (several minutes).

## Current focus

- WORK-004 shipped the worker-first Overview and assignment-owned event workspace. Next: apply the staged Work Mode communications/RLS migration through the gated database pipeline and run an authenticated browser smoke test against that migrated environment.

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
