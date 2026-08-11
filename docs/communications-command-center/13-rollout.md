# 13 - Rollout

## Phases

1. Audit and docs.
2. Command-center read shell in Logistics -> Comms.
3. Additive normalized event/relay schema with strict RLS.
4. Native relay + acknowledgement workflow.
5. Communication-to-task workflow.
6. Email adapter in read-only mode.
7. Weather adapter in read-only mode, then configured broadcasts.
8. WhatsApp adapter after provider/security setup.
9. Search, automation, escalation hardening.
10. Regression, RLS, and production readiness verification.

## Feature Control

Provider integrations should remain disabled until env vars, webhook secrets, RLS tests, and operational runbooks are present.

## Rollback

Because changes are additive, rollback should disable the UI/provider feature flags and leave existing messaging systems intact.
