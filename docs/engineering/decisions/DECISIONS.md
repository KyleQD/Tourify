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

Work Mode is treated as a transient operational context on a user's general account rather than a separate account type. The current and reference `use-work-mode` implementations both support this model.

## WORK-002 — `employment_assignments` is the Work assignment anchor

**Date:** 2026-09-03  
**Status:** Accepted for current reconciliation

`employment_assignments` is the canonical post-hire worker assignment relationship for the Work reconciliation unless a later verified architecture decision explicitly supersedes it. Do not create another generic worker-assignment model in parallel.

## WORK-003 — Reconcile the reference Work Hub; do not copy it wholesale

**Date:** 2026-09-03  
**Status:** Accepted

The reference `components/work-mode/work-hub-dashboard.tsx`, `types/work-hub.ts`, `types/hiring-roster-work-mode.ts`, and `hooks/use-work-mode.ts` contain valuable mature behaviors. They must be reconciled against current routes, services, schema, RLS, and components. Prefer adapters, extraction, and composition over branch-level copying.

## WORK-004 — Server-authorized Work read model is the preferred reference pattern

**Date:** 2026-09-03  
**Status:** Candidate pending P00 schema/API audit

The reference branch's `/api/work-mode/assignments` boundary, typed payload, authenticated snapshot, and revalidation pattern is preferable to assembling the entire Work read model client-side. It is not approved for direct implementation until the current API, schema, and RLS audit in `WORK-P00` confirms the appropriate integration path.

## WORK-005 — Historical Work table proposals are not facts

**Date:** 2026-09-03  
**Status:** Accepted

Names such as `staff_shift_plans`, `workflow_task_assignments`, `tour_member_event_scopes`, and `work_mode_worker_actions` remain historical/unverified proposals in the current baseline. No migration should be authored for them until current schema/RLS inspection proves a capability gap and no canonical equivalent exists.

## WORK-006 — Preserve reference worker task semantics without duplicating the backend

**Date:** 2026-09-03  
**Status:** Accepted

The verified reference Work Hub supports task actions `acknowledge`, `start`, `complete`, and `block` across states `assigned`, `acknowledged`, `doing`, `blocked`, `done`, and `cancelled`. Preserve these useful semantics where they match product intent, but first locate the current canonical task service/API and authorization boundary.

## WORK-007 — Attendance writes require live server confirmation

**Date:** 2026-09-03  
**Status:** Accepted as a safety constraint

Do not represent check-in/check-out as successful based solely on local state or an offline queue. If the reference worker-action pattern is reused, attendance mutations must receive server confirmation and remain scoped to the authenticated worker and assignment.