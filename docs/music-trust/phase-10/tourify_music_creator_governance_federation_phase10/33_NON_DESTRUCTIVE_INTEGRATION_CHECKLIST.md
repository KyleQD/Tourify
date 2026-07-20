# Phase 10 Non-Destructive Integration Checklist

## Repository and architecture

- [ ] Read the canonical music integration guide and Phase 9 handoff.
- [ ] Confirm `artist_music` remains the canonical catalog row.
- [ ] Confirm the private `artist-music` bucket, stream route, `resolveMusicAccess`, Jukebox and mobile player are unchanged.
- [ ] Record the repository commit, branch, deployed Supabase project and migration head.
- [ ] Inventory existing Phase 1–9 flags, tables, routes, workers, storage buckets and provider contracts.

## Database and security

- [ ] Create migrations with the installed Supabase CLI; never invent production migration ordering.
- [ ] Use additive tables, columns, policies, indexes and functions only.
- [ ] Enable RLS and explicit ownership/capability predicates on every exposed table.
- [ ] Confirm update policies have `USING` and `WITH CHECK`.
- [ ] Keep service-role and signing keys server-only.
- [ ] Use restricted storage and short-lived signed URLs.
- [ ] Add idempotency, append-only audit and outbox records.
- [ ] Run Supabase advisors and regenerate types.

## Federation boundaries

- [ ] Separate Tourify, federation and member-organization records and branding.
- [ ] Require a separately executed federation membership agreement.
- [ ] Define reserved powers and default local sovereignty.
- [ ] Prevent a federation decision from modifying a local creator record.
- [ ] Prevent credential possession from expanding underlying authority.
- [ ] Require exact-scope mandate and current status checks.
- [ ] Require new permission and transfer review before cross-entity data movement.
- [ ] Keep collective licensing, bargaining, representation and tokenized membership disabled.

## Credentials and interoperability

- [ ] Version credential schemas, issuer trust, proof suites and protocol profiles.
- [ ] Implement expiry, suspension, revocation, replacement and key rotation.
- [ ] Test selective disclosure and correlation minimization.
- [ ] Maintain online source-record checks for high-risk actions.
- [ ] Publish conformance claims only after passing the approved test suite.

## Rollout and rollback

- [ ] Start with audit-only mode.
- [ ] Pilot bilateral interoperability before multi-organization federation.
- [ ] Document jurisdiction and entity readiness for every enabled service.
- [ ] Define stop authority, monitoring thresholds and compensating actions.
- [ ] Prove existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics and mobile tests remain green.
