# Runbook — Treaty Legacy Rollout and Rollback

## Rollout (sandbox)

1. Apply migrations `20260720220000`–`220300` only with ops approval.
2. Leave all flags false.
3. Verify `/treaty-legacy` returns feature-disabled when readiness off.
4. Never enable public activation / perpetual authority / century-scale launch / phase20 ship in first slice.

## Rollback

1. Disable readiness + freeze via admin ops.
2. Stop outbox worker.
3. Keep additive schema; do not DROP.
4. Confirm music SoT and Phase 18 tables untouched.
