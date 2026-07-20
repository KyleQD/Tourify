# Runbook: Operator Failover

1. Trigger `operator_failover_stop`.
2. Suspend compromised `creator_commons_operators` rows.
3. Expire related conformance results.
4. Freeze public API sandbox.
5. Resume only after second independent operator accreditation package.
