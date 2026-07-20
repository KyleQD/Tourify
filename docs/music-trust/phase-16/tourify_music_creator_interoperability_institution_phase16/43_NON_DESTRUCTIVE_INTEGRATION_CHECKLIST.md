# Phase 16 — Non-Destructive Integration Checklist

## Before coding

- [ ] Read the complete Phase 16 package and Phase 15 handoff.
- [ ] Produce `CURRENT_STATE_AUDIT_RESULTS.md` against the actual repository and deployed Supabase schema.
- [ ] Confirm `artist_music`, private storage, signed stream, Jukebox, mobile, marketplace, feed, profile, EPK and analytics anchors.
- [ ] Inventory Phase 1–15 feature flags, RLS, events, external adapters and immutable source records.
- [ ] Confirm that every Phase 16 flag is false by default and cannot be enabled by Phase 15 flags.

## Database

- [ ] Use additive timestamped migrations only.
- [ ] Never rename, drop or repurpose existing columns, tables, buckets, routes or enums.
- [ ] Create explicit foreign-key references to authoritative source records rather than copying them.
- [ ] Separate restricted evidence, internal operational records and public projections.
- [ ] Add RLS and grants before exposing routes.
- [ ] Backfill only through versioned, restartable jobs with dry-run, checkpoints and compensating records.
- [ ] Regenerate Supabase types and run database advisors.

## Authorization and legal character

- [ ] Reload current constitutive, authority, membership, protocol, host, privilege, budget and mandate records at execution time.
- [ ] Never authorize from a cached credential or public projection alone.
- [ ] Keep treaty, UN, specialized-agency, immunity, diplomatic and assessed-contribution claims disabled until externally effective.
- [ ] Preserve local reserved powers and participant withdrawal.

## External operations

- [ ] Use signed, replay-safe requests and webhooks where supported.
- [ ] Persist intent before external execution through an outbox.
- [ ] Reconcile all external results and preserve prior versions.
- [ ] Define retry, dead-letter, manual-repair and compensating-action paths.

## Regression and rollout

- [ ] Run upload, streaming, entitlement, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalty and rights-administration regressions.
- [ ] Test cross-organization isolation, RLS, expiry, suspension, revocation and local sovereignty.
- [ ] Complete independent operator, provider replacement and Tourify-unavailable drills.
- [ ] Attach monitoring, ownership, public communications and rollback evidence.
- [ ] Do not activate production service with any unresolved critical blocker.
