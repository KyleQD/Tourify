# Runbook — Federation Kill Switch

1. Open Admin → Music → Creator federation ops.
2. Prefer module kills (credentials, mandates, membership, directory).
3. Use `federation_partition_stop` for broad freeze.
4. Confirm flags disabled; verify `/federation` returns feature_disabled.
5. Record audit event. Flags are never legal authority.
