# Tourify Engineering Decisions

This log stores durable decisions that future agents should reference instead of rediscovering. New entries should be short, dated, and linked to evidence or baseline records.

## ENG-001 — Structured execution is canonical

**Date:** 2026-09-03  
**Status:** Accepted

`docs/engineering/execution/*.json` is the canonical implementation-status source. Existing roadmaps, audit reports, expanded task indexes, and completion reports remain reference material rather than competing progress ledgers.

## ENG-002 — Separate Discovery Mode from Execution Mode

**Date:** 2026-09-03  
**Status:** Accepted

Full forensic audits run when establishing or materially refreshing a domain baseline. Normal implementation uses targeted phase audits and drift checks. A new task does not justify re-reading or re-auditing the entire platform by default.

## ENG-003 — Reference builds are indexed once

**Date:** 2026-09-03  
**Status:** Accepted

The branch `backup/pre-reconcile-local-work-2026-08-20` is a verified Work reference build. Reusable paths and behaviors are recorded in `reference-maps/work-reference-map.json`. Execution sessions should open only the relevant indexed reference files rather than repeatedly searching the whole reference branch.

## WORK-001 — Work Mode remains an operational context

**Date:** 2026-09-03  
**Status:** Accepted for current reconciliation

Work Mode is treated as a transient operational context on a user's general account rather than a separate account type.

## WORK-002 — `employment_assignments` is the Work assignment anchor

**Date:** 2026-09-03  
**Status:** Accepted for current reconciliation

`employment_assignments` is the canonical post-hire worker assignment relationship for the Work reconciliation unless a later verified architecture decision explicitly supersedes it. Do not create another generic worker-assignment model in parallel.

## WORK-003 — Reconcile the reference Work Hub; do not copy it wholesale

**Date:** 2026-09-03  
**Status:** Accepted

The reference Work Hub contains valuable mature behaviors. Reconcile those behaviors against current routes, services, schema, RLS, and components. Prefer adapters, extraction, and composition over branch-level copying.

## WORK-004 — Server-authorized Work read model is approved

**Date:** 2026-09-05  
**Status:** Accepted

The P00 live schema/RLS audit confirms that a server-authorized `GET /api/work-mode/assignments` boundary is the preferred reconciliation pattern. It must scope reads to the authenticated worker through `employment_assignments`; browser-side aggregation must not become the authorization boundary.

## WORK-005 — Historical Work table proposal warning

**Date:** 2026-09-03  
**Status:** Superseded by WORK-008 on 2026-09-05

The initial baseline treated `staff_shift_plans`, `workflow_task_assignments`, `tour_member_event_scopes`, and `work_mode_worker_actions` as historical/unverified proposals pending live inspection.

## WORK-006 — Preserve reference worker task semantics without duplicating the backend

**Date:** 2026-09-03  
**Status:** Accepted

Preserve useful worker task semantics where they match product intent, but use the live `workflow_task_assignments` worker authorization overlay rather than creating a parallel task backend. `workflow_tasks` alone is not Work authorization truth.

## WORK-007 — Attendance writes require live server confirmation

**Date:** 2026-09-03  
**Status:** Accepted as a safety constraint

Do not represent check-in/check-out as successful based solely on local state or an offline queue. Attendance mutations must receive server confirmation and remain scoped to the authenticated worker and assignment.

## WORK-008 — Previously proposed Work primitives already exist live

**Date:** 2026-09-05  
**Status:** Accepted

The active connected Supabase project contains `staff_shift_plans`, `workflow_task_assignments`, `tour_member_event_scopes`, and `work_mode_worker_actions`, with RLS enabled. Reuse them. Do not author migrations that recreate them. This audit identifies the connected project as `Tourify Demo` (`auqddrodjezjlypkzfpi`); repository evidence did not prove that project is the production deployment, so production identity must not be inferred from the label alone.

## WORK-009 — Modern attendance uses event/action tables, not legacy shift RPCs

**Date:** 2026-09-05  
**Status:** Accepted

`worker_shift_check_in` and `worker_shift_check_out` are stale against the live `staff_shifts` schema: they reference removed check-in/out columns and a status outside the current constraint. Do not reuse them. Modern attendance should use `work_mode_check_in_events` and `work_mode_worker_actions` with live server authorization.

## WORK-010 — Assignment response primitive remains reusable

**Date:** 2026-09-05  
**Status:** Accepted

`respond_to_work_assignment` remains a valid assignment-bound primitive and is already used by `app/api/work-mode/assignments/[id]/respond/route.ts`. Preserve this route/RPC behavior while adding the read-model boundary.

## WORK-011 — `event_participants` is not a Work canonical dependency

**Date:** 2026-09-05  
**Status:** Accepted

No `public.event_participants` table exists in the audited live schema, and previously recorded `app/api/event-participants` paths are not present on current `main`. Event and tour visibility for Work must derive from canonical employment assignment scope plus verified event/tour tables and `tour_member_event_scopes`, not from the stale `event_participants` assumption.

## WORK-012 — Shared subsystems are dependencies, not Work authorization owners

**Date:** 2026-09-05  
**Status:** Accepted

Messaging, notifications, storage/files, events, tours, jobs/hiring, staffing, workflows, and site maps already have current API surfaces. Work should adapt to these systems after assignment/event/tour authorization is established; it must not introduce parallel messaging, notification, document, event, job, or staffing backends.
