# Runbook: Kill Switch (Phase 11)

1. Open admin music dashboard → Creator public infrastructure ops (requires `creator_public_infrastructure_admin_ops_enabled`).
2. Disable the affected surface (`kill_switch_*`).
3. For broad incident: run `trust_compromise_stop` or `identifier_abuse_stop`.
4. Confirm `/public-infrastructure` and APIs return feature_disabled.
5. Stop `npm run music:creator-public-infrastructure-outbox-worker` if processing sensitive events.
6. Record incident in `creator_public_incidents` / audit events.
7. Verify Phase 1–10 music surfaces unchanged.
