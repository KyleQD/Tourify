# Runbook — Rights Admin Partner Outage

## Scope

Registry, MLC/CMO, platform fingerprint, notice/takedown, or counsel partner unavailable.

## Steps

1. Disable affected modules via kill switches (registration/claims/partners/dmca).
2. Leave in-flight cases in `submitted` / `pending` — do not invent official acceptance.
3. Partner events remain in `music_rights_admin_partner_events` / outbox for replay.
4. Official-source mirrors use superseding records — never silent overwrite on recovery.
5. Escalate counsel if any outbound claim/takedown was mid-flight.
