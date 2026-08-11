# Runbook: Kill Switch (Phase 18)

1. Admin music dashboard → Treaty renewal ops (requires `creator_treaty_renewal_readiness_enabled`).
2. Run `kill_switch_readiness`, `kill_switch_sunset`, or `renewal_freeze`.
3. Confirm `/treaty-renewal` and APIs return feature_disabled.
4. Stop `npm run music:creator-treaty-system-renewal-outbox-worker` if needed.
5. Record incident in `creator_treaty_renewal_audit_events`.
6. Verify Phase 1–17 music surfaces unchanged.
