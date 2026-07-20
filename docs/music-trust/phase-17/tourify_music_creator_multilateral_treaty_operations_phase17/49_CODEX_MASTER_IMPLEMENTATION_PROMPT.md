# Codex Master Implementation Prompt

## Mandate

Implement Phase 17 only as an evidence-gated, non-destructive extension of the audited Tourify repository. Read every Phase 17 document, the Phase 16 handoff and the canonical integration guide. Produce `CURRENT_STATE_AUDIT_RESULTS.md`, copy the template to `phase-17-execution-plan.json`, and update task evidence continuously.

## Hard rules

- Preserve `artist_music` as the canonical upload/catalog row and preserve private `artist-music` storage, signed streaming, `resolveMusicAccess`, Jukebox, mobile, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database; use additive migrations, explicit backfills, versioned records, feature flags, append-only audit/outbox events and compensating actions.
- Tourify remains an optional technical provider. Treaty operations, review conferences, public services, archives and continuity must remain independently operable.
- No Phase 17 capability ships under Phase 16 flags and no Phase 17 record is inferred from Phase 16 participation.
- A review conference, implementation practice, administrative decision, credential, registry entry or software configuration cannot enlarge institutional competence.
- No state, international organization, public authority, creator, cooperative or local organization becomes a member, party, beneficiary or represented person by inference.
- Identifiers and credentials are references and signed statements; they do not create copyright ownership or licensing, administration, collection, payment, enforcement, diplomatic or representation authority.
- Local creator and organization sovereignty, withdrawal, reserved powers and provider portability remain protected.
- Public projections expose only approved minimal data and are never the sole authorization source for a high-impact action.
- The current constitutive instrument, protocol, participant authority, membership status, governing-body decision, reservation status, host agreement, privilege schedule, budget appropriation, authoritative rights source and jurisdiction module control each action.
- Treaty registration, depositary functions, privileges, assessed contributions and external relationship claims remain disabled until exact legal prerequisites are effective.
- No coordinated pricing, collective bargaining, collective licensing, representation, enforcement, boycott or market allocation is created through Phase 17.
- Periodic review is an evidence and reform process, not an automatic competence-expansion mechanism.
- Every durable action records policy version, schema version, jurisdiction, effective period, source manifest, actor authority, idempotency key and append-only audit event.
- Missing legal authority, multi-year evidence, host arrangement, provider contract, funding, oversight, staff justice, privacy, security, accessibility, procurement, competition or public approval is a blocker.

## Required workflow

1. Pin the current commit, deployment environment and Supabase project.
2. Audit Phases 1–16, the deployed schema, RLS, storage, routes, workers, feature flags, instruments, participants, host arrangements and provider contracts.
3. Map every proposed Phase 17 record to a current authoritative source or a new additive record.
4. Replace all `AUDIT_REQUIRED` assumptions with verified repository facts or explicit blockers.
5. Implement stages in dependency order and preserve task-level evidence.
6. Use `app/api/creator-multilateral-treaty-operations/**`, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and receive-object/return-object helpers unless the audit proves a compatible established convention.
7. Use outbox-backed, signed, replay-safe external writes and reconciliation.
8. Run canonical music and prior-phase regressions after each material stage.
9. Do not activate any mature treaty operation or public service without the separate Phase 17 activation gate.

## Blockers

Missing multi-year evidence, competent authority, effective instrument, review mandate, amendment authority, host arrangement, privilege schedule, relationship agreement, funding, independent oversight, staff justice, trust anchor, provider contract, test environment or public approval is a blocker—not a TODO.

## Evidence contract

For every completed task record files, deployed objects, commands, results, tests, reviews, decisions, monitoring, owners, rollback and unresolved blockers. Do not mark work complete based on prose, mock records or elapsed timestamps alone.
