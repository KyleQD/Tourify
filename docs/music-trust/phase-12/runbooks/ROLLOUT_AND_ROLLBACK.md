# Runbook: Rollout and Rollback

## Rollout (sandbox only)

1. Apply additive migrations `20260718080000`–`80300` after ops approval.
2. Keep all `creator_digital_commons_*` flags false until pilot package.
3. Enable readiness/steward/participation only for sandbox subjects.
4. Never enable hard-disabled flags.

## Rollback

1. Disable all Phase 12 flags via admin ops.
2. Stop outbox worker.
3. Leave schema in place; never reset DB.
4. Confirm Phase 1–11 UX restored.
