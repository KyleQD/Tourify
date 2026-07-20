# Runbook — Rollout and Rollback

## Rollout (sandbox only)
1. Apply migrations `20260718060000`–`60300`.
2. Keep all `creator_federation_*` flags off until entity/counsel/pilot approvals.
3. Enable readiness → entity registry → membership → sovereignty → sandbox credentials → directory-admin mandates → private directory.
4. Leave representation, collective licensing/bargaining, finance, public API, tokenization off.

## Rollback
1. Disable all federation flags; stop outbox worker.
2. Leave schema in place; never reset DB.
3. Confirm Phase 1–9 surfaces unchanged.
