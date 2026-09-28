# Venue booking-request lifecycle

Status: canonical implementation and regression coverage are in place under `lib/venue/booking-lifecycle.ts` and `__tests__/venue/booking-lifecycle.test.ts`.

## Purpose and boundary

This state machine describes a venue booking request from initial inquiry through a confirmed reservation. It does not describe the event-day lifecycle after confirmation; event operations owns that separate lifecycle.

The database RPC `transition_venue_booking_lifecycle` is the write authority. The TypeScript matrix is the shared client/API contract for rendering actions and validating compatibility behavior. The two must remain identical.

## States and transitions

| State | Meaning | Allowed next states |
| --- | --- | --- |
| `inquiry` | New request awaiting venue action | `hold`, `offer`, `cancelled` |
| `hold` | Provisional hold while availability or terms are worked through | `inquiry`, `offer`, `cancelled` |
| `offer` | Venue has sent an offer and is awaiting contract progression | `hold`, `contract`, `cancelled` |
| `contract` | Contract or final terms are in progress | `offer`, `confirmed`, `cancelled` |
| `confirmed` | Venue booking is accepted and can converge to an event workspace | `cancelled` |
| `cancelled` | Rejected, withdrawn, or cancelled request; terminal | none |

The normal forward path is:

```text
inquiry → hold → offer → contract → confirmed
```

The intermediate states intentionally support returning to the previous negotiation stage. Any live state may be cancelled. There is no `completed` or `archived` booking-request state: completion belongs to event operations, and cancelled requests are the archived terminal view.

## Compatibility and persistence contract

- Legacy `status=pending` and unknown/null legacy values resolve to `inquiry`.
- Legacy `status=approved` resolves to `confirmed`.
- Legacy `status=rejected` or `cancelled` resolves to `cancelled`.
- When lifecycle writes are enabled, the database mirrors `confirmed` to legacy `status=approved`, `cancelled` to `status=cancelled`, and all other lifecycle states to `status=pending`.
- Lifecycle writes require the feature gate, the current `lifecycle_revision`, and a UUID `clientRequestId`. The RPC locks the request, checks the transition and venue operator authorization, increments the revision, and appends history/timeline evidence.
- Retrying the same client request is idempotent. Reusing a client request ID for a different transition, or writing against a stale revision, is a conflict and must not silently overwrite the newer state.

## Verification expectations

The focused suite covers the legacy mapping, canonical-value precedence, invalid-value fallback, every allowed and denied matrix edge, the forward path, cancellation from every live state, and terminal behavior. Hosted acceptance still separately owns migration/RLS/grant/index/backfill evidence; those checks are not reproducible in this unit suite.
