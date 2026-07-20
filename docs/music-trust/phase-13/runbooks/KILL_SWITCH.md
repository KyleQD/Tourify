# Runbook: Kill Switch (Phase 13)

1. Open admin music dashboard → Protocol constitution ops (requires `creator_protocol_constitution_readiness_enabled`).
2. Disable the affected surface (`kill_switch_*`).
3. For broad incident: run `fundamental_provision_freeze`, `succession_crisis_stop`, or `emergency_sunset`.
4. Confirm `/protocol-constitution` and APIs return feature_disabled.
5. Stop `npm run music:creator-protocol-constitution-outbox-worker` if processing sensitive events.
6. Record incident in `creator_protocol_incidents` / audit events.
7. Verify Phase 1–12 music surfaces unchanged.
