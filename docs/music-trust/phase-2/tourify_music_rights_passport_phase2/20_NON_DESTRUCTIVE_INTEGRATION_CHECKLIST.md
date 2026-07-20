# Non-Destructive Integration Checklist

## Before code changes

- [ ] Read the canonical integration guide.
- [ ] Audit current branch and baseline failures.
- [ ] Verify `artist_music` schema and ID type.
- [ ] Verify current rights/trust Phase 1 implementation.
- [ ] Verify Jukebox and mobile playback paths.
- [ ] Verify RLS, views, storage, and admin capabilities.
- [ ] Verify job/outbox infrastructure.
- [ ] Verify feature flags.
- [ ] Verify existing moderation, DMCA, and disputes.
- [ ] Create repository-specific execution JSON.

## Database

- [ ] Additive migrations only.
- [ ] No reset or destructive rename.
- [ ] No legacy NOT NULL without safe backfill.
- [ ] RLS enabled and tested.
- [ ] Views use security-invoker or are protected.
- [ ] Data API grants reviewed.
- [ ] UPDATE has SELECT + USING + WITH CHECK.
- [ ] No authorization from user metadata.
- [ ] No casual SECURITY DEFINER.
- [ ] Generated types updated.
- [ ] Advisors run.
- [ ] Rollback/compensating plan documented.

## Upload and playback

- [ ] Existing uploader extended, not replaced.
- [ ] `artist-music` remains private.
- [ ] Stream route remains thin.
- [ ] `resolveMusicAccess` remains the entitlement authority.
- [ ] Jukebox remains the web player.
- [ ] Mobile uses existing provider/API.
- [ ] Marketplace, preview, sharing, and library regressions pass.

## Rights

- [ ] Composition/master separation.
- [ ] Credits/claims separation.
- [ ] Authority is explicit.
- [ ] Unknown share is supported.
- [ ] Conflict does not silently overwrite.
- [ ] Agreements are immutable versions.
- [ ] Material changes require re-signing.
- [ ] Public data is separately authorized.

## Certification and provenance

- [ ] Named standard version.
- [ ] No detector-only decision.
- [ ] Private evidence redacted.
- [ ] Credential status works.
- [ ] C2PA failure is safe.
- [ ] Clean master is untouched.
- [ ] Watermarking is opt-in and tested.
- [ ] Unlearnable audio remains research-only.

## Blockchain

- [ ] Testnet first.
- [ ] No PII.
- [ ] No financial logic.
- [ ] Multisig admin.
- [ ] Idempotent outbox.
- [ ] Off-chain passport remains valid when pending.
- [ ] Suspend/revoke/supersede supported.

## Launch

- [ ] Security review complete.
- [ ] Legal copy approved.
- [ ] Operations runbooks complete.
- [ ] Backup/restore tested.
- [ ] Pilot metrics reviewed.
- [ ] Flags off rollback tested.
- [ ] No critical unresolved issue.
