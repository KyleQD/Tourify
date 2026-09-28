# Architecture and Source of Truth

Status: working specification; runtime adoption is gated by the manifest.

## Authority

- `events_v2` is the canonical ticketing parent.
- The authoritative ticketing tenant is the verified `ops_org_id` supplied as `org` in the route and revalidated against the selected organizer account and active membership on the server.
- Missing `org` may be populated only from the verified active organizer account. A mismatch fails closed.
- Finance remains authoritative for accounting entries, settlement approval, and payout state.
- Existing tickets, credentials, transfers, check-ins, allocations, reservations, promotion network, and notification records are preserved.

## Runtime boundaries

Customer-facing code consumes typed ticketing services and repositories. Direct table selection, schema fallback, comparison data, and migration telemetry live only in internal compatibility or observability modules.

Canonical routes:

- `/admin/dashboard/ticketing?org=<ops-org-id>`
- `/admin/dashboard/ticketing/events/[eventId]?org=<ops-org-id>&tab=<tab>`
- `/admin/dashboard/ticketing/enhanced` redirects while preserving parameters.

Canonical API resources:

- organization dashboard
- event workspace and settings
- inventory, orders, attendees, admissions, promotions, and analytics
- one event command endpoint with capability, parentage, state, version, reason, audit, and idempotency enforcement

## Metric truthfulness

An available zero is data. Missing, denied, failed, or stale data is state. UI and API layers must preserve that distinction and must not coerce unavailable metrics to `0`.

## Compatibility strategy

Legacy identifiers are resolved to authorized `events_v2` records. Legacy readers remain behind repositories until consumer telemetry reaches zero. There is no dual-write mode. Before canonical writes, an organization may return to legacy reads; after canonical writes begin, remediation is forward-only with paused operations and compensating evidence.

## Accepted inputs

- `docs/architecture/adr/ADR-007-ticketing.md`
- `docs/admin-feature-specs/adr/TIX-001-canonical-ticketing.md`
- `docs/admin-feature-specs/discovery/TIX-002-ticketing-consumer-inventory.md`

