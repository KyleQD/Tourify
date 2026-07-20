# Runbook: Emergency Sunset

1. Trigger `emergency_sunset` — readiness, membership, amendments, limited production off.
2. Confirm `creator_protocol_emergency_override_enabled` remains hard-disabled (resolver forces false).
3. Any emergency-class amendment without expiry is rejected by `evaluateFundamentalRights`.
4. Log public incident summary; schedule retrospective review.
5. Do not re-enable without dual approval and sunset clock.
