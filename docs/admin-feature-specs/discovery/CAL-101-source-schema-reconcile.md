# CAL-101 — Reconcile calendar source schemas

**Date:** 2026-07-20  
**Spec:** `12_Calendar_Communications_and_Notifications.md`

## Acceptance criteria

Calendar source fields/tenant keys match deployed migrations and canonical models; missing/failed sources appear as degraded, not empty.

## What shipped

### Source health contract

`AdminCalendarSourceHealth` + `sources` / `isDegraded` on aggregate + GET `/api/admin/calendar`.

Statuses: `ok` | `empty` | `degraded`.

### Tenant keys

When `orgId` is set, filter `org_id` on:

- `catering_services`
- `ground_transportation_coordination`
- `flight_coordination`
- `lodging_bookings`

### Hiring schema alignment

`job_applications` select uses only deployed columns; interview/offer dates from `offer_details` / `form_responses` JSON.

`organization_job_postings` no longer invents `application_deadline` / `closes_at`.

### Client

`useAdminCalendar` exposes `sources` / `isDegraded` and surfaces a degraded warning without treating partial success as a total empty calendar failure message-only path.

### Tests

`__tests__/admin/calendar-aggregate.test.ts` — degraded ≠ empty; org_id on travel/catering; hiring JSON dates.

## Follow-ups

- `CAL-102` acting context / capabilities / protected projection
- `CAL-103` remove heterogeneous calendar POST inserts
- `CAL-401` holds/obligations/rest-day sources
