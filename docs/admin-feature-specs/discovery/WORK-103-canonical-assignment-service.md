# WORK-103 — Canonical assignment service

**Date:** 2026-07-20  
**Spec:** `06_Workforce_Hiring_Roster_and_Scheduling.md`

## Acceptance criteria

Tour/event panels, scheduling, hiring conversion, calendar, and Work Mode use the same person/role/assignment identity and status transitions.

## What shipped

### Status lifecycle (canonical = `employment_assignments.status`)

`lib/admin/workforce-assignment-status.ts`

- Graph: `invited → confirmed|cancelled` → `active|cancelled` → `completed|cancelled` (terminals)
- Maps: roster ↔ assignment ↔ shift ↔ tour team

### Identity service

`lib/admin/workforce-assignment.service.ts`

- `resolveAssignmentIdentity` — from employment / staff / shift keys
- `transitionAssignmentStatus` — enforced edges + optional shift mirror
- `upsertShiftLinkedAssignment` — scheduling ↔ Work Mode entry
- `enrichShiftMetaWithAssignment` / `presentTourMemberAssignmentStatus` — panel/calendar bridge

### Wired surfaces

| Surface | Integration |
|---|---|
| Work Mode respond | `assertAssignmentTransition` + shift mirror via status maps |
| Shift sync | `mapShiftStatusToAssignment` |
| Hiring roster approval | shared roster→assignment map; org_id stamp for org employers |
| Admin staffing shifts | `upsertShiftLinkedAssignment` |
| Tour team-members | `assignment_status` on projected rows |
| Admin calendar shifts | meta: `userId`, `employmentAssignmentId`, `assignmentStatus`, `roleTitle` |

## Out of scope (later)

- WORK-401 tour party / role assignment tables
- WORK-409 full draft/offered/accepted workflow
- WORK-105 identity merge

## Follow-ups

- `WORK-104` — remove demo availability from live mode  
- Deeper hire conversion extraction into `upsertOrgPersonFromHire` when WORK-401 lands
