# Runbook: Kill Switch (Phase 16)

1. Admin music dashboard → Interop institution ops (requires `creator_interop_institution_readiness_enabled`).
2. Run `kill_switch_readiness`, `kill_switch_services`, or `institution_freeze`.
3. Confirm `/interop-institution` and APIs return feature_disabled.
4. Stop `npm run music:creator-interoperability-institution-outbox-worker` if needed.
5. Record incident in `creator_interop_institution_audit_events`.
6. Verify Phase 1–15 music surfaces unchanged.
