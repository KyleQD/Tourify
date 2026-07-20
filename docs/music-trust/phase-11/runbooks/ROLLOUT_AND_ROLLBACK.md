# Runbook: Rollout and Rollback

## Rollout (sandbox only)

1. Apply additive migrations `20260718070000`–`70300` after ops approval.
2. Keep all `creator_public_infrastructure_*` flags false until pilot package.
3. Enable readiness/entity/participation only for sandbox subjects.
4. Never enable hard-disabled flags.

## Rollback

1. Disable all Phase 11 flags via admin ops.
2. Stop outbox worker.
3. Leave schema in place; never reset DB.
4. Confirm Phase 1–10 UX restored.
