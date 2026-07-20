# Agent 04 — 10-city West Coast tour planning

## Actor

Org admin — `QA_FLOW_ORG_*`

Tour: **Pacific Signal — West Coast Run** (`tourId` in `qa-flow-scenario.json`)

## Route (north → south)

1. Seattle — Climate Pledge Arena  
2. Portland — Moda Center  
3. Sacramento — Golden 1 Center  
4. San Francisco — Chase Center  
5. Oakland — Fox Theater  
6. Santa Barbara — Santa Barbara Bowl  
7. Los Angeles — Greek Theatre  
8. Anaheim — House of Blues Anaheim  
9. San Diego — Cal Coast Open Air Theatre  
10. Las Vegas — Brooklyn Bowl Las Vegas  

## Checklist

1. Open `/admin/dashboard/tours/builder?draft={tourId}` and/or tour hub
2. Verify all 10 stops, dates, markets, capacities
3. Lodging: confirm per-city hotel notes (builder lodging field and/or `/admin/dashboard/logistics`)
4. Budget: tour budget ~$450k; review `/admin/dashboard/finances` if linked
5. Transportation notes present (bus + van)
6. Worker shifts: `/admin/dashboard/staff?tab=scheduling` — seeded shifts for first 3 markets; extend if UI allows
7. Band schedule: verify `settings.band_schedule` load-in / soundcheck / doors / show / load-out per city (no dedicated band calendar — document gap)
8. Tour team admins (Artists 1–3) can open tour hub without redirect to `/dashboard`

## Completion definition

- Route + lodging + budget + at least one shift per hired worker + band day sheet times for all 10 cities are stored and visible somewhere in Admin UI

## UX notes

Log to `docs/audits/flow-notes/04-org-tour-plan.md`.

Watch for:

- No dedicated band schedule surface
- Calendar stub / empty logistics tabs
- Lodging as free text only (no booking flow)
- Shift scheduling not linked to tour stops
