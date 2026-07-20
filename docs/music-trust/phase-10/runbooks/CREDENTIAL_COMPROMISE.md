# Runbook — Credential Compromise

1. Execute `credential_compromise_stop`.
2. Revoke affected credentials via DELETE `/api/creator-federation/credentials?id=...`.
3. Revoke related mandates; drain outbox worker.
4. Rotate issuer status to suspended; preserve audit evidence.
5. Dual-control approval before re-enable.
