# Runbook: Rollout and Rollback

## Rollout (sandbox only)

1. Apply migrations `20260718100000`–`100200` after ops approval.
2. Keep all `creator_interop_*` flags false until approval package.
3. Never enable hard-disabled flags.

## Rollback

1. Disable all Phase 14 flags via admin ops.
2. Stop outbox worker.
3. Leave schema in place; never reset DB.
4. Confirm Phase 1–13 UX restored.
