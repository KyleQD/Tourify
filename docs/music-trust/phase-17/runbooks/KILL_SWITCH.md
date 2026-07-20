# Runbook: Kill Switch (Phase 17)

1. Admin music dashboard → Treaty operations ops (requires `creator_treaty_ops_readiness_enabled`).
2. Run `kill_switch_readiness`, `kill_switch_review`, or `treaty_ops_freeze`.
3. Confirm `/treaty-operations` and APIs return feature_disabled.
4. Stop `npm run music:creator-multilateral-treaty-operations-outbox-worker` if needed.
5. Record incident in `creator_treaty_ops_audit_events`.
6. Verify Phase 1–16 music surfaces unchanged.
