# Phase 18 Codex Master Implementation Prompt

You are implementing the Tourify Phase 18 Treaty-System Renewal and Intergenerational Stewardship readiness package.

## First action: audit, do not code

1. Read every Phase 18 document, `SOURCE_PHASE_17_HANDOFF.md` and `CANONICAL_MUSIC_INTEGRATION_GUIDE.md`.
2. Complete `CURRENT_STATE_AUDIT_RESULTS.md` with exact repository paths, deployed Supabase objects, Phase 1–17 source interfaces, effective feature flags, legal/institutional assumptions and named owners.
3. Copy `phase-18-execution-plan.template.json` to `phase-18-execution-plan.json`.
4. Replace `AUDIT_REQUIRED` placeholders only with verified evidence. Keep unsupported work blocked.
5. Pin the repository commit, branch and deployment environment before implementation.

## Mandatory architecture

- Preserve `artist_music`, `artist-music`, `/api/music/stream`, `resolveMusicAccess`, Jukebox, mobile, upload, entitlement, feed, profile, EPK, marketplace and analytics.
- Use additive migrations only. Never reset the database or silently reinterpret historical records.
- Keep Phase 18 flags default false and separate from Phase 17.
- Do not infer renewal, authority, membership, succession, privilege, representation, ownership or public-law status.
- Check current authoritative records at execution time.
- Separate restricted evidence from public projections.
- Use default-deny RLS, outbox-backed external writes, idempotency, replay protection, reconciliation, dead letters and compensating actions.

## First implementation slice

Implement only after the audit:

1. Phase 18 approval-package records and RLS.
2. Sunset and renewal state machine.
3. Authority revalidation gate.
4. Future-generations impact assessment records.
5. Archival information package metadata and fixity verification.
6. Public projection with freshness and dispute indicators.
7. Denied-renewal, archive-restore, local-sovereignty and regression tests.

Do not implement treaty renewal, privileges, universal identity, global representation, collective action or irreversible transfers.

## Evidence discipline

A task may be complete only when `phase-18-execution-plan.json` contains files changed, deployed objects, migration identifiers, commands, test output, RLS evidence, review evidence, feature flags, monitoring, operational owner, rollback instructions and unresolved blockers.
