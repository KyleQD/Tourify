# ADR-011 — Security audit fail-closed / fail-open policy

## Status

Accepted (SEC-111)

## Context

Privileged Admin reads/exports and mutations must leave an append-only trail in `security_audit_events`. Audit infrastructure can fail (DB outage, RPC missing, grant errors). The product must choose whether the primary action proceeds.

## Decision

| Action class | Fail policy | Rationale |
|--------------|-------------|-----------|
| `mutation` | **fail_closed** | State changes without a security trail are unacceptable for finance/tour/ticket mutations. |
| `export` | **fail_closed** | Privileged data leaving the system must be attributable. |
| `privileged_read` | **fail_open** | Observe-mode / dashboard reads should degrade to available when audit is down; still log locally. |
| `authz_decision` | **fail_open** | Deny/allow decisions must not become unavailable if audit insert fails; log locally. |

Implementation: `lib/security/write-security-audit-event.ts` + `write_security_audit_event` RPC.

For shared non-transactional command handlers, fail-closed means a durable, organization-scoped authorized-intent event is written before the handler executes; an unavailable audit store returns `503` and the handler is not called. The post-handler outcome event is best-effort because the state change may already have committed. Finance, ticketing, publication, and other critical commands must write the state change and final audit/outbox outcome in the same database transaction.

## Consequences

- Mutation/export routes that call `writeSecurityAuditEvent` must catch `SecurityAuditWriteError` and return 503.
- `executeOrgCommand` fail-closes on the pre-handler mutation-intent audit and writes a best-effort outcome event afterward.
- Legacy `logAuditEvent` dual-writes to the new trail with fail_open so existing callers do not break before full cutover.
