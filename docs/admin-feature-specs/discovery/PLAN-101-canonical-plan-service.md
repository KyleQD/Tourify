# PLAN-101 — Canonical plan read/write service

## Acceptance criteria

Builder no longer writes route JSON and links independently; command validates org, capability, plan version, and full plan schema.

## Decision

| Surface | Role |
|---|---|
| `GET/PUT /api/admin/tours/:id/plan` | Canonical plan R/W |
| `lib/admin/tour-plan.service.ts` | Schema + access + version + derive `settings.route` |
| `tours.plan_version` | Optimistic draft version (PLAN-102 expands conflict UX) |
| Builder persist | Create shell via POST `/api/admin/tours`, then PUT `/plan` |

Independent top-level `routing` on plan writes is rejected. Route projection is derived from reconciled `tour_events` / stops after write.

## Verify

`__tests__/admin/tour-plan.service.test.ts`
