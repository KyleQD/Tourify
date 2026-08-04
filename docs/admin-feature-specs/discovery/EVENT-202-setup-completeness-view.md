# EVENT-202 — Event setup completeness view (implemented)

**Status:** Complete  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/05_Event_Advancing_Day_Sheets_and_Live_Ops.md` — EVENT-202

## Acceptance criteria

Each required domain shows not started / in progress / blocked / ready with owner and direct action; dependency failure is shown as unknown.

## What shipped

| Piece | Behavior |
|-------|----------|
| Checklist items | `owner` (role + userId + label), `directAction` (href/label), `dependsOn` |
| Statuses | `not_started` \| `in_progress` \| `blocked` \| `ready` \| `unknown` |
| Blocked | Hard deps unmet after successful evaluation (`schedule` for staffing/ticketing, `venue` for advance/logistics) |
| Unknown | Count query failure or dependency evaluation failure |
| Live API | `GET /api/admin/events/[id]/setup-completeness` |
| UI | `EventSetupCompletenessPanel` on event overview + command center |

## Domain owners

Default roles: Staffing / Ticketing / Advance / Logistics / Finance lead. Label prefers `settings.setup.ownership.department_owner`, then ops owner assignment, else Unassigned.

## Direct actions

| Domain | Href |
|--------|------|
| staffing | `?tab=people` |
| ticketing | `?tab=tickets` |
| advance | `/advancing` |
| logistics | `?tab=logistics` |
| finance | `?tab=money` |

## Files

- `lib/admin/event-setup-checklist.ts`
- `lib/admin/event-setup-completeness.service.ts`
- `app/api/admin/events/[id]/setup-completeness/route.ts`
- `components/admin/event-setup-completeness-panel.tsx`
- `app/admin/dashboard/events/[id]/page.tsx`
- `app/admin/dashboard/events/[id]/command-center/page.tsx`
- `lib/admin/api-route-registry.ts`
- `__tests__/admin/event-setup-checklist.test.ts`

## Verify

`npx vitest run __tests__/admin/event-setup-checklist.test.ts __tests__/admin/event-ticketing-setup.test.ts`
