# Runbook: Trust Compromise

1. Trigger `trust_compromise_stop`.
2. Mark compromised `creator_public_trust_registry_entries` as `revoked`/`suspended`.
3. Suspend credentials issued from those entries.
4. Freeze rights-resolver and directory flags.
5. Engage security counsel before re-enablement.
