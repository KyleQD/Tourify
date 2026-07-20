# Agent 02 — Org creates tour + grants band tour admins

## Actor

Org admin — `QA_FLOW_ORG_*` (West Coast Touring Co)

Read `docs/audits/qa-flow-scenario.json` for `tourId`, `teamId`, `urls.tourHub`.

## Checklist

1. Login → `/dashboard` → switch to Organization / Admin
2. Confirm org: `/admin/dashboard/organization`
3. Open tour hub: `/admin/dashboard/tours/{tourId}` (or builder URL from scenario)
4. Confirm tour name **Pacific Signal — West Coast Run** and 10 stops (Seattle → Las Vegas)
5. Confirm tour team **Core Production** includes Artists 1–3 with role `admin`
6. If missing, add via Admin UI or:

```http
POST /api/admin/tours/teams
{ "tour_id": "<tourId>", "name": "Core Production", "team_type": "core" }

POST /api/admin/tours/team-members
{ "team_id": "<teamId>", "user_id": "<artistUserId>", "role": "admin", "profile": { "name": "..." } }
```

7. Optionally grant `org_members.role = tour_manager` for artists on the ops org so Admin Work Mode works

## Important product rules

- Band roster membership does **not** grant tour edit rights
- Prefer `/api/admin/tours/team-members` over legacy `/api/tours/[id]/team`

## UX notes

Log to `docs/audits/flow-notes/02-org-tour-admins.md`.

Watch for:

- No one-click “add band members as tour admins”
- Dual team APIs / confusing empty states
- Tours list hitting wrong API (`/api/tours` vs `/api/admin/tours`)
