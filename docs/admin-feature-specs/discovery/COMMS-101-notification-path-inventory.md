# COMMS-101 — Inventory notification/message paths

**Date:** 2026-07-20  
**Spec:** `12_Calendar_Communications_and_Notifications.md`

## Acceptance criteria

Every in-app/email/SMS/push/Work Mode/chat path has source, audience, dedupe/retry behavior, privacy class, owner, and convergence plan.

## What shipped

Machine-readable inventory:

- `lib/admin/comms-path-inventory.ts` — `COMMS_DELIVERY_PATHS` + coverage assert
- `__tests__/admin/comms-path-inventory.test.ts`

~42 paths covering in-app, email, SMS, push, Work Mode, and chat.

### Canonical pipes

| ID | Role |
|---|---|
| `PIPE-ONS` | In-app writer (+ fanout) |
| `PIPE-OUTBOUND` | Resend / Twilio / Expo |
| `PIPE-WEBHOOK` | Duplicate outbound on INSERT — retire |
| `PIPE-PUB-OUTBOX` | Durable outbox (target hub) |
| `PIPE-PUB-CHANNELS` | Channel adapters |

### Priority convergence gaps

1. Dual outbound (`PIPE-ONS` + `PIPE-WEBHOOK`)
2. Double fanout on `ADMIN-COMMS-TEAM` (API + SQL trigger)
3. Decorative idempotency keys (ticketing/logistics metadata)
4. Work Mode publications without durable notify
5. Parallel `notifications` vs `notifications_v2`
6. Admin broadcast lacks signed org audience
7. Safety-critical travel SMS without retry

## Follow-ups

- `COMMS-401` channel/audience model
- `COMMS-403` route domain notifications through outbox
- `COMMS-405` escalation/acknowledgement
- `COMMS-601` delivery observability
