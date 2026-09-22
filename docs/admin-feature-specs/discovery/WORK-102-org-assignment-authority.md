# WORK-102 — Organization and assignment authority

**Date:** 2026-07-20  
**Spec:** `06_Workforce_Hiring_Roster_and_Scheduling.md`

## Acceptance criteria

All workforce records have org scope; server commands validate tour/event/role parents; protected fields use field-level projections.

## What shipped

### App authority

`lib/admin/workforce-authority.service.ts`

- `requireWorkforceOrgAccess` — acting org membership required (never invent `org_id`)
- `validateTourParent` / `validateEventParent` / `validateTeamParent` / `validateStaffMemberParent`
- `validateWorkforceAssignmentParents` — combined parent check for assignment-style writes

### Field projections

`lib/admin/workforce-field-projections.ts`

| Class | Capability gate |
|---|---|
| operational | always (with workforce access) |
| contact | `workforce.view` (or manage) |
| personnel_sensitive | `workforce.manage` / `hiring.manage` |
| financial | `finance.view` / `finance.manage` |
| sensitive_personal | `finance.manage` only |

### Schema

Migration `20260720173000_admin_workforce_authority_work102.sql`

- `can_workforce(uid, oid, perm)` helper (membership + `has_perm`)
- `tour_team_members.org_id` + backfill from `tours.org_id` when known

### Wired surfaces

- `GET/POST/PATCH/DELETE /api/admin/tours/team-members` — parent validation + projections; writes stamp `org_id`
- `POST/GET /api/admin/staffing/shifts` — org-scoped creates validate event/staff parents; list responses project fields

## Follow-ups

- `WORK-103` — canonical assignment service using this authority + WORK-101 identity map
- Future RLS replace of blanket `staff_*` policies using `can_workforce` (Phase 6 / SEC-style pass)
