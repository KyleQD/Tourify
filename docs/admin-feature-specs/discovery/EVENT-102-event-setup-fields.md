# EVENT-102 — Normalize event setup fields

**Date:** 2026-07-20  
**Spec:** `05_Event_Advancing_Day_Sheets_and_Live_Ops.md`

## Acceptance criteria

Venue relation, promoter/contact, local times, capacities, age/curfew, production windows, and ownership have typed destinations and validation.

## Destinations

| Concern | Typed destination |
|---|---|
| Venue relation | `events_v2.venue_id` + `settings.setup.venue` (`venues_v2_id`, `venue_account_id`, label/address/room/contacts) |
| Promoter/contact | `settings.promoter_contact` + `settings.setup.promoter_contact` |
| Local times / timezone | `events_v2.timezone` + `settings.setup.production_windows` (`HH:mm`) |
| Capacity | `events_v2.capacity` |
| Age restriction | `events_v2.age_restrictions` |
| Curfew / production windows | `settings.setup.production_windows` (+ flat settings keys for compat) |
| Ownership | `events_v2.created_by` + `settings.setup.ownership` (`ops_owner_user_id`, `department_owner`) |

## Validation

- Local times must be `HH:mm` (24h); invalid values throw (no silent drop).
- Promoter/venue emails validated when present.
- `normalizeEventSetupFields` is applied on create/update in `AdminTourEventOperationsService`.
- Presented events expose `timezone`, `age_restrictions`, `promoter_contact`, and `setup`.
