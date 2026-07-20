# Runbook: Identifier Abuse

1. Trigger `identifier_abuse_stop` via admin ops.
2. Suspend/deactivate abused `creator_public_identifiers` rows (status `suspended`/`revoked`).
3. Revoke related credentials if issued.
4. Queue outbox events for partner notification when counsel-approved.
5. Do not treat identifier revocation as ownership or rights adjudication.
