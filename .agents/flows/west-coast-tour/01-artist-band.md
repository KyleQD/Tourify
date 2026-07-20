# Agent 01 — Artists form Pacific Signal

## Actors

| Key | Env | Role |
|-----|-----|------|
| Artist1 | `QA_FLOW_ARTIST_1_*` | Creates band Pacific Signal |
| Artist2 | `QA_FLOW_ARTIST_2_*` | Joins roster |
| Artist3 | `QA_FLOW_ARTIST_3_*` | Joins roster |

Prefer seeded state from `npm run qa:seed:flow` (roster already `accepted`). This runbook verifies UI and notes UX gaps.

## Checklist

### Artist1

1. Login → `/dashboard`
2. Confirm artist persona exists (account switcher → Artist) or create via `/create?type=artist`
3. Open Band Hub: `/admin/dashboard/organization` (switch to Pacific Signal org if needed)
4. Confirm public page `/organization/pacific-signal` loads
5. Confirm Artists 2 & 3 appear on roster as accepted (Band Hub / artist members panel)

### Artist2 / Artist3

1. Login → `/dashboard` → switch to Artist
2. Open artist org invites panel if present; accept any pending Pacific Signal invite
3. Confirm membership visible on `/organization/pacific-signal`

## API fallbacks (if UI broken)

```http
POST /api/organization/artist-members
{ "organizerAccountId": "<band>", "artistProfileId": "<artist>" }

PATCH /api/organization/artist-members
{ "membershipId": "<id>", "status": "accepted" }
```

Service-role seed already upserts `organization_artist_members` with `status=accepted`.

## UX notes

Log to `docs/audits/flow-notes/01-artist-band.md` using the template in `05-ux-notes.md`.

Watch for:

- Band create vs generic org create clarity on `/create`
- Roster accept ≠ admin access messaging
- Account switcher latency / missing org after create
