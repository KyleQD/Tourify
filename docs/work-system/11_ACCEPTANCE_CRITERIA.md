# Acceptance Criteria

Every interactive worker control has real data, loading/empty/error states, persisted behavior, server authorization, responsive accessible interaction, and critical-path tests. No action reports success before its server mutation succeeds.

The controlled launch can advance only when the P0 security migration is applied in a production-like project, its RLS persona tests pass, worker actions remain off until those checks pass, and the following worker journey completes without manual database intervention: discover work → apply/accept → complete required acknowledgement → open schedule/packet/map → check in → check out → review history.

Realtime is optional for launch correctness: it may be enabled only after its publication migration is verified. Focus refresh, manual refresh, and the read-only cached snapshot are the fallback path.
