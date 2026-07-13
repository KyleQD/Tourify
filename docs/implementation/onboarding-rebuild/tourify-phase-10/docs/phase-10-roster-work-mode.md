# Phase 10 — Roster and Work Mode Completion

## Scope

Phase 10 adds the real-data roster and Work Mode layer for the Tourify universal hiring/onboarding rebuild.

This phase does **not** create mock staff, fake assignments, or local dashboard records. It reads from and writes to real Supabase tables:

- `staff_members`
- `employment_assignments`
- `staff_documents`
- `staff_shift_assignments` when present
- `hiring_audit_events`

## Added files

```txt
types/hiring-roster-work-mode.ts
lib/hiring/work-mode-permissions.ts
lib/hiring/roster-schema.ts
lib/services/hiring-roster.service.ts
components/hiring/team-roster-panel.tsx
components/hiring/roster-filters.tsx
components/hiring/roster-member-detail-drawer.tsx
components/hiring/roster-assignment-dialog.tsx
components/hiring/work-mode-permissions-card.tsx
app/api/hiring/roster/route.ts
app/api/hiring/roster/[memberId]/route.ts
app/api/hiring/roster/[memberId]/assignment/route.ts
app/api/hiring/roster/export/route.ts
app/admin/dashboard/roster/page.tsx
```

## Core behavior

### Roster list

`GET /api/hiring/roster?entity_type=&entity_id=` returns real roster members scoped by `HiringEntity`.

Optional filters:

```txt
status
compliance_status
department
search
limit
offset
```

### Roster detail

`GET /api/hiring/roster/[memberId]` returns one scoped roster member, document summaries, and Work Mode assignment.

### Status update

`PATCH /api/hiring/roster/[memberId]` updates the staff member status after permission checks.

### Shift / zone assignment

`POST /api/hiring/roster/[memberId]/assignment` assigns a member to a zone, shift, event, or manager. The service writes an audit event and updates the roster row.

### CSV export

`GET /api/hiring/roster/export` exports the currently filtered roster as CSV.

## Work Mode permissions

`lib/hiring/work-mode-permissions.ts` provides a fallback permission resolver based on position and department:

- Security gets limited run sheet access.
- Managers and leads get staff management, document review, zone assignment, and export access.
- FOH/audio/lighting/production get full run sheet access but not staff management by default.
- Merch and general staff get schedule, check-in/out, and own-doc access.

If the repo already has a canonical `role_templates` permission resolver, merge this fallback into that system instead of creating a competing source of truth.

## Integration with onboarding completion

`HiringRosterService.upsertRosterFromCompletedOnboarding()` is the backend-only bridge for:

```txt
completed staff_onboarding_candidate
→ staff_members
→ employment_assignments
→ hiring_audit_events
```

Client components must never create `staff_members` or `employment_assignments` directly.

## Schema notes

Cursor should verify the following columns exist before applying the files unchanged:

```txt
staff_members.employer_entity_type
staff_members.employer_entity_id
staff_members.user_id
staff_members.position
staff_members.department
staff_members.status
staff_members.compliance_status
staff_members.onboarding_candidate_id
employment_assignments.employer_entity_type
employment_assignments.employer_entity_id
employment_assignments.user_id
employment_assignments.permissions
employment_assignments.status
```

If `staff_shift_assignments` does not exist yet, keep the zone update on `staff_members` and defer shift-specific inserts to the scheduling module.
