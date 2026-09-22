# PLAN-105 — Remove implicit operational seeding

## Acceptance criteria

Builder records setup intent only; staff shifts/ticket inventory require explicit reviewed provisioning commands with visible results.

## Behavior

| Path | Before | After |
|---|---|---|
| Event create/update from builder | Inserted `staff_shifts` + invented GA/VIP ticket qty | Writes `settings.setup_intent` only |
| Soft party invites | Artist/crew participants | Unchanged (invites, not inventory) |
| Provision | n/a | `POST /api/admin/events/:id/provision` with `reviewed: true` |

## Provision response

Returns `staffShiftsCreated`, `ticketTypesCreated`, `skipped`, and a human message for UI.

## Verify

`__tests__/admin/event-ops-provision.test.ts`
