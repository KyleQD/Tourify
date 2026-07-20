# West Coast tour flow — UX notes summary

**Generated:** 2026-07-18  
**Cast:** `docs/audits/qa-flow-accounts.json`  
**Scenario:** `docs/audits/qa-flow-scenario.json`  
**Commands:** `npm run qa:seed:flow` → `npm run qa:seed:flow:scenario` → `npm run qa:flow:clickthrough`  
**Playwright:** **10/10** stages passed (`qa:flow:clickthrough`)  
**Profile fill agents:** all 7 accounts filled via UI + each posted — see [platform-fill-agents.md](./platform-fill-agents.md)

## Pass / fail snapshot

| Stage | Status | Notes |
|-------|--------|-------|
| Seed 7 accounts | Pass | Artists + band + org + workers via create-path |
| Band roster | Pass | Service-role accepted memberships |
| Tour create (10 cities) | Pass | Builder path; `artist_id` left unset (legacy FK) |
| Tour admins | Pass | `tour_team_members` + `org_members.tour_manager` |
| 3 jobs / 3 templates | Pass | General Staff, Security Guard, Bartender |
| Hire tokens | Pass | Workers open `/onboarding/hire/{token}` |
| Tour settings logistics | Pass | lodging, band_schedule, crew_shifts in `tours.settings` |
| `staff_shifts` table rows | Partial | Live schema requires `staff_member_id`; using settings until roster→staff_members link exists |
| Tour detail hub UI | P1 | Slow / timeout under turbopack; builder works |
| Hiring hub without query | P1 | Needs entity_type/entity_id or active org persona |

## Finding counts

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 4 |
| P2 | 4 |

### Stage notes
- [01-artist-band.md](./01-artist-band.md)
- [02-org-tour-admins.md](./02-org-tour-admins.md)
- [03-org-jobs-hire.md](./03-org-jobs-hire.md)
- [04-org-tour-plan.md](./04-org-tour-plan.md)

See per-stage notes in this folder.

## Automations

Drafts ready in [`.agents/flows/west-coast-tour/AUTOMATIONS.md`](../../../.agents/flows/west-coast-tour/AUTOMATIONS.md) — finish in Agents Window.
