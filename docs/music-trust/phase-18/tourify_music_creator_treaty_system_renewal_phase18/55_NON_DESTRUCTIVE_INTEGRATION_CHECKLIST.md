# Phase 18 Non-Destructive Integration Checklist

## Canonical product paths

- [ ] `artist_music` remains canonical.
- [ ] `artist-music` remains private.
- [ ] `/api/music/stream` and `resolveMusicAccess` remain the playback authorization path.
- [ ] Jukebox and mobile playback remain unchanged.
- [ ] Upload, entitlement, marketplace, feed, profile, EPK and analytics regressions pass.

## Database and storage

- [ ] No reset, destructive migration or silent historical rewrite.
- [ ] New objects use additive migrations and explicit backfills.
- [ ] RLS is enabled and default deny.
- [ ] Restricted evidence is separated from public projections.
- [ ] Storage is restricted with short-lived signed URLs and access logs.
- [ ] Audit and outbox records are append only.

## Renewal and authority

- [ ] Phase 18 flags are distinct from Phase 17 and default false.
- [ ] Renewal requires affirmative current authority.
- [ ] Expiry denies new high-impact actions.
- [ ] Historic membership and credentials do not create current authority.
- [ ] Local reserved powers and exit are enforced.
- [ ] Every high-impact action has notice, human review, appeal and remedy.

## Long-term continuity

- [ ] Archive packages have provenance, fixity, representation information and restore tests.
- [ ] Old schemas and test vectors can be replayed.
- [ ] Technology and cryptographic migrations preserve historical verification.
- [ ] Provider replacement and Tourify-unavailable tests pass.
- [ ] Sunset, dissolution and asset-lock workflows preserve archives and essential services.

## Completion evidence

- [ ] Exact files, objects, commands, tests, reviews, owners, monitoring and rollback are recorded in `phase-18-execution-plan.json`.
