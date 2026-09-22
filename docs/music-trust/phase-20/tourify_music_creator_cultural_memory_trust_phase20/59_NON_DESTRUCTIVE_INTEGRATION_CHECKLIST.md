# Phase 20 non-destructive integration checklist

## Before editing

- [ ] Copy `phase-20-execution-plan.template.json` to `phase-20-execution-plan.json`.
- [ ] Record the repository commit, branch, deployment environment and Supabase project.
- [ ] Read the Phase 19 handoff, canonical integration guide, current-state audit and every Phase 20 document relevant to the selected stage.
- [ ] Map the exact existing upload, catalog, storage, streaming, access, Jukebox, mobile, feed, profile, EPK, marketplace, analytics, licensing, royalty and administration paths.
- [ ] Map deployed database objects and compare them with repository migrations.
- [ ] Record baseline typecheck, lint, unit, route, database, RLS, E2E and mobile regression results.
- [ ] Identify legal, cultural, privacy, archival, security, accessibility, funding and provider assumptions.

## Architecture protection

- [ ] Keep `artist_music` as the catalog anchor.
- [ ] Keep private audio in `artist-music`.
- [ ] Keep playback through `/api/music/stream`, `resolveMusicAccess` and the current Jukebox/mobile flows.
- [ ] Do not add a second catalog, upload service, player, entitlement engine, royalty ledger or rights source.
- [ ] Consume source records through approved references, projections or outboxes.
- [ ] Never write preservation or trust decisions back into canonical rights, licence, royalty, payment, administration or enforcement records.

## Database and storage

- [ ] Use a new additive migration generated after auditing the deployed schema.
- [ ] Do not run database reset, destructive rename, drop, truncate or unreviewed type replacement.
- [ ] Make every backfill explicit, resumable, idempotent and reversible.
- [ ] Store policy, schema, profile, jurisdiction, effective period, actor authority, source manifest, idempotency key and audit event on durable actions.
- [ ] Enable RLS on every new table before production use.
- [ ] Use default-deny policies for creators, communities, councils, custodians, researchers, public users, operators, administrators and workers.
- [ ] Keep restricted evidence in restricted storage with short-lived signed URLs and access logs.
- [ ] Keep public finding aids in approved projection tables or security-invoker views.

## Governance and authority

- [ ] Do not infer trust membership, deposit, cultural authority, access or reuse from a Tourify account or prior-phase record.
- [ ] Reload current authority, restrictions, privacy, legal holds, disputes, suspensions, revocations and expiry for high-impact actions.
- [ ] Treat overlapping or disputed authority as a stop condition.
- [ ] Separate creator consent, community authority, custody, access, disclosure, reuse, rights ownership and legal authority.
- [ ] Require human review and a compensating action for custody changes, disclosure changes, repatriation, destructive actions and emergency access.

## External operations

- [ ] Use signed, idempotent, replay-safe outbox workers for external writes.
- [ ] Reconcile external results against the requested source and package manifest.
- [ ] Maintain dead-letter, retry, cancellation and compensating-action paths.
- [ ] Treat missing provider contracts, test environments, trust anchors, escrow terms and archival agreements as blockers.
- [ ] Test export and restore in a materially independent implementation.

## Testing and release

- [ ] Test every state transition and denied transition.
- [ ] Test cross-organization and cross-community isolation.
- [ ] Test restricted-field leakage and public-projection minimization.
- [ ] Test stale source, disputed source, expired authority, revoked deposit and legal hold.
- [ ] Test AI-reuse denial, mediated access, appeal, repatriation and restriction propagation.
- [ ] Test custodian failure, key rotation, provider replacement, archive restore, network partition, dissolution and Tourify-unavailable operation.
- [ ] Re-run all canonical Tourify music, rights and mobile regressions.
- [ ] Document monitoring, operational owner, public communication, rollback and decommissioning.
- [ ] Leave every unresolved blocker visible in `phase-20-execution-plan.json`.
