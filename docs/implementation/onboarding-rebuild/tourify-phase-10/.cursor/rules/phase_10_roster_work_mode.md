---
description: Phase 10 roster and Work Mode rules for Tourify universal onboarding.
globs: ["app/api/hiring/roster/**", "components/hiring/**", "lib/services/hiring-roster.service.ts", "lib/hiring/**", "types/**"]
alwaysApply: false
---

# Phase 10 — Roster and Work Mode Rules

- Do not use mock roster data.
- Do not create fake staff activity.
- Do not create `staff_members` or `employment_assignments` from client components.
- All roster reads and writes must be scoped by `employer_entity_type` and `employer_entity_id`.
- Keep legacy `venue_id` only as compatibility data, not the primary scope.
- Use `HiringEntity` for Venue, Organization, and Artist hiring accounts.
- Use backend services for roster completion, status updates, shift/zone assignment, and audit logging.
- If the repo has a canonical role template permission resolver, use that before fallback position-based permission mapping.
- Verify permissions with `canManageHiring()` or `canAssignWorkMode()` before mutating roster state.
- Do not begin Phase 11 file upload/PII work in this phase.
