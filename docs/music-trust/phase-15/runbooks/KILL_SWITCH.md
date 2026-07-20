# Runbook: Kill Switch (Phase 15)

1. Admin music dashboard → Interop organization ops (requires `creator_interop_org_readiness_enabled`).
2. Run `kill_switch_readiness`, `kill_switch_governance`, or `organization_freeze`.
3. Confirm `/interop-organization` and APIs return feature_disabled.
4. Stop `npm run music:creator-interoperability-organization-outbox-worker` if processing sensitive events.
5. Record incident in `creator_interop_org_audit_events`.
6. Verify Phase 1–14 music surfaces unchanged.
