# Runbook — DMCA Deadlines

## Scope

Inbound service-provider notices and outbound rightsholder enforcement remain separate workflows.

## Steps

1. Monitor `music_rights_deadlines` for `counter_notice_restore_earliest` / related types.
2. On counter-notice receipt, compute restoration window (business days) and open deadlines.
3. Do not restore content before earliest window; escalate counsel on court-action holds.
4. Confirm designated-agent registration/renewal is current before production enablement (blocked until ops/legal).
5. Kill `music_rights_admin_dmca_enabled` if SLA/deadline tooling fails.
