# EVENT-103 — Replace best-effort seeds

**Date:** 2026-07-20  
**Spec:** `05_Event_Advancing_Day_Sheets_and_Live_Ops.md`

## Acceptance criteria

Event creation returns explicit setup checklist for staffing, ticketing, advance, logistics, and finance; provisioning commands show exact changes/failures and never invent capacity/shift data.

## What shipped

| Piece | Behavior |
|---|---|
| `buildEventSetupChecklist` | Five domains; `inventsData: false` always |
| `POST /api/admin/events` | Returns `setupChecklist` alongside `event` |
| Persist | `settings.setup_checklist_status` |
| Create path | Soft participant invites + `setup_intent` only — **no** `ticket_types` / `staff_shifts` / vendor request inserts |
| `POST .../provision` | Returns `changes[]`, `failures[]`, refreshed checklist |

## Domains

- **staffing** — intent vs reviewed shifts  
- **ticketing** — price intent vs explicit quantity ticket types  
- **advance** — advancing document presence (not auto-seeded on create)  
- **logistics** — venue/travel intent vs logistics tasks  
- **finance** — budget intent vs finance records  
