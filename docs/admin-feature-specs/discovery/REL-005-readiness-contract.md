# REL-005 — Event readiness product contract

**Status:** Complete  
**Decision date:** 2026-07-21

## Product decision

The shared `ADMIN_READINESS_RULES` catalog is authoritative for the event builder, persisted readiness endpoint, and server publish command.

| Rule | Severity | Publish behavior | Evidence authority |
|---|---|---|---|
| Event title/basics | Blocker | Cannot override | Persisted `events_v2` row |
| Schedule | Blocker | Cannot override | Persisted event start/date |
| Venue identity | Blocker | Cannot override | Persisted venue FK or draft venue label |
| Venue profile | Warning | `event.publish` plus a non-empty reason | Referenced `venue_profiles` row must exist; a JSON id alone is not evidence |
| Staffing | Warning | `event.publish` plus a non-empty reason | Non-cancelled, event- and organization-scoped `staff_shifts`; setup JSON is not an assignment |

Venue profile and staffing remain warnings because an organization may intentionally publish a routing hold or announce a show before account linking and day-of scheduling are complete. Product can elevate either rule later only by changing the shared catalog and its parity tests; migration SQL must not invent a separate severity table.

## Parity and recovery

- The builder sends actual selected-crew count as `staff_count`; artists/vendors do not satisfy the staffing rule.
- Persisted evaluation verifies the venue-profile reference and counts canonical active shifts. Missing or unavailable evidence fails to the warning state rather than falsely reporting ready.
- Publish reloads the persisted event and evidence through the same engine. UI state cannot bypass blockers.
- Warning overrides require the publish capability and a reason. The publication payload and API audit record both preserve rule IDs and reason.
- Remediation URLs and stable rule IDs come only from `readiness-contract.ts`.

## Migration boundary

No event database function independently decides readiness today. That is intentional: the server command is the single evaluator and migrations define storage/security only. If a transactional event-publish RPC is later added, it must consume versioned server evidence or an equivalent generated contract and reject mismatched versions; it must not duplicate rule severities by hand.
