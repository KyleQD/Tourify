# Runbook — Rollout and Rollback

## Rollout (readiness-only)
1. Apply migrations `20260718050000`–`50300`.
2. Keep all Phase 9 flags off until entity/counsel/pilot approvals.
3. Enable readiness education → membership applications → contribution controls → internal research queue → policy observatory.
4. Leave benefits, external licensing, representation, tokenization, public policy submission off.
5. Collective readiness records must keep `production_authority=false`.

## Rollback
1. Disable all cooperative flags via admin ops.
2. Stop outbox worker.
3. Leave schema in place (additive; no DB reset).
4. Confirm Phase 1–8 surfaces unchanged.
