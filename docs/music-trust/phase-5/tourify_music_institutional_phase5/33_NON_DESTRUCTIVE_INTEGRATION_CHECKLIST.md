# Non-Destructive Integration Checklist

## Existing music stack

- [ ] `artist_music` remains canonical.
- [ ] Private `artist-music` storage remains intact.
- [ ] `/api/music/stream` and `resolveMusicAccess` remain the playback gate.
- [ ] JukeboxProvider and mobile player behavior are unchanged.
- [ ] Preview jobs, library, playlists, marketplace downloads, feeds, profiles, EPK, and analytics regressions pass.

## Phase 2–4 dependencies

- [ ] Rights Passport versions are referenced, not copied into mutable Phase 5 rows.
- [ ] Phase 3 royalty and valuation records remain source-linked and immutable.
- [ ] Phase 4 official positions, transfer restrictions, and partner records remain authoritative.
- [ ] Direct asset transactions are separated from securities/fund workflows.

## Database

- [ ] Additive migrations only.
- [ ] Supabase CLI command/version audited.
- [ ] No database reset or destructive backfill.
- [ ] RLS and explicit grants reviewed for every exposed object.
- [ ] UPDATE policies include `USING` and `WITH CHECK`.
- [ ] Views use `security_invoker` where supported.
- [ ] Rollback/compensating plan exists.

## Security and partners

- [ ] No service-role, partner, payment, wallet, or signing secret reaches the client.
- [ ] Private documents use restricted storage and short-lived URLs.
- [ ] Webhooks are verified, idempotent, stored raw, and reconciled.
- [ ] Official provider outage produces a degraded state, not silent internal substitution.
- [ ] Feature flags and kill switches are tested per workflow.

## Financial/legal boundaries

- [ ] Tourify does not hold cash or securities.
- [ ] Tourify does not make recommendations or exercise investment discretion.
- [ ] Tourify does not operate an unapproved matching engine.
- [ ] Legal classification and responsible parties are approved before launch.
- [ ] Tokenization cannot override official ownership or transfer controls.
