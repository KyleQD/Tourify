# WORK-101 — Map existing person/assignment records

**Date:** 2026-07-20  
**Spec:** `06_Workforce_Hiring_Roster_and_Scheduling.md`

## Acceptance criteria

Each roster/team/participant/staff/employment/Work Mode field has canonical destination and identity-resolution rule; duplicate risk report is generated.

## Machine-readable map

`lib/admin/workforce-identity-map.ts` — `WORKFORCE_IDENTITY_MAPPINGS` + `WORKFORCE_DUPLICATE_RISK_REPORT`.

## Canonical destinations (target model)

`profiles` → `organization_people` → `tour_party_members` / `tour_role_assignments` → `work_shifts` / `shift_assignments` (+ `assignment_credentials`). Work Mode is an assignment overlay, not a separate person identity.

## Source → destination (summary)

| Source | Destination | Resolution | Risk |
|---|---|---|---|
| `profiles` | `profiles` | `user_id` root | low |
| `org_members` | org RBAC only | `(org_id, user_id)` | medium |
| `staff_members` | `organization_people` | employer + user_id / email | high |
| `employment_assignments` | `shift_assignments` | shift → staff_member → user window | high |
| `staff_shifts` | `work_shifts` | shift PK | medium |
| `staff_shift_assignments` | `shift_assignments` | shift_id or staff+event | high |
| `tour_team_members` | `tour_party_members` | tour + user_id / email | high |
| `event_participants` | event-scoped role | typed participant_id | high |
| `job_applications` | hiring pipeline → org person | applicant_id / email | high |
| `staff_onboarding_candidates` | onboarding stage | candidate → roster link | medium |
| `venue_team_members` | deprecated migrate | venue employer | high |
| `venue_crew_members` | org person + credentials | user_id / email@venue | high |
| `work_mode_publications` | publication only | audience from assignments | low |

## Duplicate risk report (top 5)

1. **Cross-surface user** — same `user_id` in roster, RBAC, tour party, participants without shared person key.  
2. **Roster ↔ Work Mode drift** — roster without employment, or employment with null `staff_member_id`.  
3. **Triple shift write** — `staff_shifts` + employment link + `staff_shift_assignments`.  
4. **Hiring email convert** — approve-by-email then later account link creates a second roster row.  
5. **Polymorphic / accountless party** — typed `participant_id` and accountless `tour_team_members` profile jsonb.

## Follow-ups

- `WORK-102` — org/assignment authority using this map.  
- `WORK-103` — canonical assignment service.  
- `WORK-105` — merge/reconciliation for high-risk patterns.  
