# Codex Master Implementation Prompt

## Mandate

Implement Phase 16 only as an evidence-gated, non-destructive extension of the audited Tourify repository. Read every Phase 16 document, the Phase 15 handoff and the canonical integration guide. Produce `CURRENT_STATE_AUDIT_RESULTS.md`, copy the template to `phase-16-execution-plan.json`, and update evidence continuously.

## Hard rules

- Preserve `artist_music` as the canonical upload/catalog row and preserve private `artist-music` storage, signed streaming, `resolveMusicAccess`, Jukebox, mobile, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database; use additive migrations, explicit backfills, versioned records, feature flags, append-only audit/outbox events and compensating actions.
- Tourify remains an optional technical provider. No institution, treaty system, registry, service, program or public record may depend on Tourify remaining available.
- A private convention, software deployment, identifier, credential or registry entry cannot create treaty capacity, international legal personality, privileges, immunities, diplomatic status or public regulatory power.
- No state, international organization, public authority, creator, cooperative or local organization becomes a participant, member, beneficiary or represented person by inference.
- Identifiers and credentials are references and signed statements; they do not create copyright ownership or licensing, administration, collection, payment, enforcement, diplomatic or representation authority.
- Local creator and organization sovereignty, withdrawal, reserved powers and provider portability remain protected.
- Public projections expose only approved minimal data and are never the sole authorization source for a high-impact action.
- The current constitutive instrument, participant authority, membership status, governing-body decision, protocol, host agreement, privilege schedule, budget appropriation, authoritative rights source and jurisdiction module control each action.
- Treaty registration, depositary functions, specialized-agency relationships, privileges and assessed contributions remain disabled until the exact external legal prerequisites are effective.
- No coordinated pricing, collective bargaining, collective licensing, representation, enforcement or market allocation is created through Phase 16.
- Every durable action records policy version, schema version, jurisdiction, effective period, source manifest, actor authority, idempotency key and append-only audit event.
- Missing constitutive authority, governmental approval, relationship agreement, host arrangement, provider contract, funding, oversight, staff justice, privacy, security, accessibility, procurement or competition approval is a blocker.

## Required workflow

1. Pin the current commit and deployment environment.
2. Audit Phases 1–15, the deployed schema, RLS, storage, routes, workers, feature flags and provider contracts.
3. Map every proposed Phase 16 record to an existing authoritative source or a new additive record.
4. Replace all `AUDIT_REQUIRED` assumptions with verified repository facts or explicit blockers.
5. Implement stages in dependency order and preserve task-level evidence.
6. Use `app/api/creator-interoperability-institution/**`, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and receive-object/return-object helpers unless the audit proves a different established repository convention.
7. Use outbox-backed, signed, replay-safe external writes and reconciliation.
8. Run all canonical music and prior-phase regressions after each material stage.
9. Do not enable any public-law service without the separate activation gate.

## Blockers

Missing governmental authority, effective constitutive or protocol instruments, host arrangements, privilege schedules, relationship agreements, funding approval, independent oversight, staff justice, trust anchors, provider contracts, test environments or public approval are blockers—not TODOs.

## Evidence contract

For every completed task record files, deployed objects, commands, results, tests, reviews, decisions, monitoring, owners, rollback and unresolved blockers. Do not mark work complete based on prose alone.
