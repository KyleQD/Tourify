# PUB-002 — Publishable section and field classification

**Status:** Revalidated  
**Date:** 2026-07-21  
**Parent:** ADR-005 / PUB-001  
**Runtime contract:** `lib/admin/publication-field-policy.ts`

## Closed classification set

Every included publication payload leaf resolves to one of:

`internal` | `worker` | `department` | `vendor` | `public` | `financial` | `personnel` | `sensitive_traveler`

Classification is fail closed:

1. A built-in section receives the default below.
2. Every nested leaf inherits that default.
3. Protected-field rules raise individual leaves and the stored section access classification; they never lower it.
4. A custom section key is rejected with `422` unless it supplies an explicit audience class.
5. Callers may raise a built-in section or field class but cannot downgrade the canonical policy.
6. The resolved section class, effective access class, and normalized field-path map are written into the immutable snapshot manifest and section source reference.

## Section inventory

| Section / field family | Default class | Field treatment |
|---|---|---|
| Overview (tour/event name, dates, markets) | `worker` | Public delivery requires a separately approved `public` projection; internal notes remain elevated. |
| Itinerary, stops, route | `worker` | Local dates/times and venue labels inherit worker; traveler identity/contact paths elevate. |
| Contacts | `personnel` | Personal phone/email elevate to `sensitive_traveler`. |
| Travel / travel brief | `sensitive_traveler` | Passenger identity, documents, movement, and assignments remain sensitive. |
| Lodging | `sensitive_traveler` | Property aggregates may be separately projected; room/person assignment remains sensitive. |
| Schedule(s), run of show, day sheet | `worker` | Pay/cost fields elevate to `financial`; incident/internal notes elevate to `internal`. |
| Advance | `department` | Request sent to a scoped counterparty uses `vendor`; financial riders elevate to `financial`. |
| Advance request | `vendor` | Only fields deliberately assembled for the named vendor are eligible. |
| Advance response | `department` | Owning department sees response; commercial fields elevate. |
| Map(s) / site map | `worker` | Restricted access or offline token fields elevate to `internal`. |
| Hospitality | `department` | Individual dietary/accessibility/medical fields elevate to `sensitive_traveler`; cost elevates to `financial`. |
| Equipment | `department` | Custody/access secrets elevate to `internal`; costs elevate to `financial`. |
| Tickets / credentials | `department` | Guest contact fields elevate to `personnel`; credential secrets elevate to `internal`; amounts elevate to `financial`. |
| Emergency / emergency notice | `worker` | Medical notes and personal contact details elevate to `sensitive_traveler`; internal incident details elevate to `internal`. |
| Change notice | `worker` | Each before/after leaf is reclassified; a change notice cannot lower the source field class. |
| Financials / contracts | `financial` | Never public; a counterparty receives only a separately assembled, scoped vendor projection. |
| Personnel | `personnel` | Identity, contact, accessibility, and compensation subclasses retain higher protection. |
| Public | `public` | Only explicitly approved public content; there is no automatic worker-to-public downgrade. |

## Publication-type coverage

| Publication type | Canonical section families |
|---|---|
| `tour_book` | overview, itinerary/stops/route, contacts, travel, lodging, schedules, advance, maps, hospitality, equipment, tickets_credentials, emergency |
| `itinerary` | overview, itinerary/stops/route, contacts, travel, lodging |
| `advance_request` | overview, advance_request, contacts, maps, hospitality, equipment |
| `advance_response` | overview, advance_response, contacts, maps, hospitality, equipment, financials |
| `day_sheet` | overview/day_sheet, run_of_show, travel, lodging, schedule, contacts, hospitality, maps, emergency |
| `run_of_show` | overview, run_of_show, contacts, maps, emergency |
| `schedule` | overview, schedule/schedules, contacts |
| `site_map` | overview, site_map/maps |
| `contact_sheet` | overview, contacts, emergency |
| `travel_brief` | overview, travel_brief/travel, lodging, contacts, emergency |
| `change_notice` | overview, change_notice plus the affected source section keys |
| `emergency_notice` | overview, emergency_notice/emergency, contacts, maps |

## Protected field rules

The runtime registry recognizes exact normalized paths and protected leaf names. Array indexes normalize to `[]`, so `travelers[0].passport_number` and `travelers[8].passport_number` share one deterministic policy key.

- `sensitive_traveler`: passport/government ID/date of birth/known-traveler number, medical/dietary/accessibility/allergen notes, assigned room, personal phone/email.
- `financial`: pay/hourly rate, cost, amount, and settlement fields.
- `personnel`: guest contact and employee identifiers.
- `internal`: incident/internal notes, credential codes, and offline access tokens.

Projection policy version is stored on each publication snapshot. `PUB-302` owns recipient-specific field removal; this task guarantees that the input to that projection has no unclassified included field.
