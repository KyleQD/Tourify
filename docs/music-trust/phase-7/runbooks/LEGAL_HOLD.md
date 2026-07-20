# Runbook — Legal Holds

## Scope

Evidence, legal documents, and case history under litigation or regulatory hold.

## Steps

1. Mark affected cases/observations with hold metadata; use `music-rights-admin-holds` bucket.
2. Legal hold overrides routine deletion/retention jobs.
3. Do not purge `music_rights_admin_audit_events`, partner events, or external-record supersessions.
4. Exports for counsel use short-lived signed URLs and audit logging.
5. Litigation escalation remains gated by `music_rights_admin_litigation_enabled`.
