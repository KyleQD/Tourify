# PLAN-202 → PUB-203 batch

## Tasks

| ID | AC summary | Shipped |
|----|------------|---------|
| PLAN-202 | Stop editor: types, TZ, windows, venue, contacts, notes, status | Extended `tourPlanStopSchema` + `RouteStopTable` editor fields; migration columns |
| PLAN-203 | Keyboard/pointer reorder; unique ordinals | `tour-stop-ordinals.ts` + builder DnD/↑↓ |
| PLAN-204 | Protected stop impact workflow | `tour-stop-protection.ts` + `POST .../stops/impact` |
| PLAN-205 | Holds/options lifecycle | `tour_stop_holds` migration + service + `.../holds` API |
| PLAN-206 | Server readiness on persisted plan | `tour-readiness-engine.ts` + `.../readiness` API |
| PLAN-207 | Change sets / categorized diffs | `tour-plan-changeset.ts` |
| PLAN-208 | Selectable deep-copy + date/TZ validation | `tour-planner-deepcopy.ts` |
| PUB-201 | Publish reloads plan + readiness in path | `publishTour` uses readiness engine + overrides |
| PUB-202 | Deterministic snapshot renderer | `publication-snapshot-renderer.ts` |
| PUB-203 | Audience preview | `publication-audience-preview.ts` + API |

## Verify

```bash
npx vitest run __tests__/admin/plan-202-through-pub-203.test.ts
```

## Migrations

- `20260720195000_tour_stops_holds_plan202_205.sql`
