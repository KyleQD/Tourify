# CAL-103 — Remove direct heterogeneous inserts

**Date:** 2026-07-20  
**Spec:** `12_Calendar_Communications_and_Notifications.md`

## Acceptance criteria

Calendar create/edit routes invoke event/task/staffing/hold/obligation commands with complete required context; partial placeholder rows cannot be created.

## What shipped

### Command bridge

`lib/admin/calendar-command.service.ts`

| Calendar type | Behavior |
|---|---|
| `task` | `executeLogisticsCommand(create_task)` — requires `event_id` or `tour_id` |
| `shift` / `logistics` | Staffing create with parent validation — requires `event_id` + staff member |
| `event` / `tour` / `production` / `hold` / `obligation` | `422 use_domain_command` with deep-link `href` |

### Route

`POST /api/admin/calendar` — acting org required; no direct multi-table insert switch.

### UI

Day sheet disables shift submit until event + assignee are present.

### Tests

`__tests__/admin/calendar-command.test.ts`

## Follow-ups

- Hold/obligation domain commands when CAL-401 sources land
- Prefer dedicated `/api/admin/staffing/shifts` HTTP from UI once calendar day sheet can call it with full employer context
