# Runbook — Member Withdrawal

## When
Member withdraws or is expelled; contribution licences must stop.

## Actions
1. Confirm membership `status=withdrawn` via DELETE `/api/creator-cooperative/membership?id=...`.
2. Revoke active contribution licences for that member.
3. Drain outbox (`membership.withdrawn`, `contribution.revoked`).
4. Exclude withdrawn member from future research cohorts and benefit readiness calculations.
5. Preserve non-retaliation: no ranking/punishment based on withdrawal.
