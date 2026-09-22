# SEC-111 — Immutable security audit

## Acceptance criteria

Privileged reads/exports and every mutation write an append-only result event; audit failures follow an approved fail-closed/fail-open policy by action class.

## Implementation

| Piece | Path |
|-------|------|
| Table + RPC | `supabase/migrations/20260720153600_security_audit_events_sec111.sql` |
| Writer | `lib/security/write-security-audit-event.ts` |
| Fail policy ADR | `docs/architecture/adr/ADR-011-security-audit-fail-policy.md` |
| Org commands | `executeOrgCommand` writes mutation / authz_decision events |
| Dual-write | `logAuditEvent` → `security_audit_events` (fail_open) |

### Immutability

- UPDATE/DELETE triggers raise `42501`
- No authenticated insert/update/delete grants; append via `write_security_audit_event` SECURITY DEFINER
- FORCE RLS; select requires `audit.view` / `finance.view` / `org.manage`

### Fail policy

See ADR-011. Mutations/exports fail closed (503); privileged reads and authz decisions fail open.
