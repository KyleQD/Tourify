# Codex Master Implementation Prompt — Phase 2

Place this package at `docs/music-trust/phase-2/`, then run this prompt from the Tourify repository root.

---

You are implementing **Tourify Music Rights Passport — Phase 2** inside the existing Tourify repository.

Phase 1 established safe artist upload, rights and AI declarations, source-integrity/origin records, certification requests, trust labels, and review foundations. Phase 2 builds the complete rights graph, contributor agreements, Human-Origin review, Rights Passport, provenance/protection, disputes, and optional testnet attestation.

## Canonical architecture

Read:

1. `docs/music-trust/phase-2/source/MUSIC_ECOSYSTEM_INTEGRATION_GUIDE.md`
2. every numbered Phase 2 document in order;
3. `CURRENT_STATE_AUDIT_TEMPLATE.md`;
4. `phase-2-execution-plan.schema.json`;
5. `phase-2-execution-plan.template.json`;
6. reference code and SQL templates.

The repository and active database are the source of truth. Reference files are not blind-copy targets.

## Product objective

Allow an artist to select or import an existing `artist_music` track and:

- create linked sound-recording and musical-work records;
- add parties, identifiers, credits, and rights claims;
- invite contributors and authorized representatives;
- validate splits by right, territory, and term;
- generate and sign immutable agreement versions;
- complete evidence-based Human-Origin review;
- issue a versioned Rights Passport and public credential;
- generate C2PA-enabled protected derivatives;
- express AI-training reservation and optional watermarking;
- optionally anchor privacy-safe commitments to a testnet registry;
- dispute, suspend, amend, supersede, and revoke records without deleting history.

## Hard architecture rules

1. Never reset the database.
2. Keep `artist_music` as the canonical playable/upload catalog row.
3. Do not create another web player, stream route, entitlement engine, or public audio bucket.
4. Keep playback through `/api/music/stream` and `resolveMusicAccess`.
5. Keep web listening on `JukeboxProvider`; mobile uses the current mobile provider and APIs.
6. Extend current route, Supabase, notification, team, moderation, and job conventions.
7. Route handlers remain under `app/api/**` with colocated Zod.
8. Use existing `requireApiUser` and `jsonError`.
9. Prefer additive migrations and feature flags.
10. Do not infer ownership from ISRC, ISWC, account identity, credit, or possession of a file.
11. Never place PII, private shares, agreements, evidence, or signatures on-chain.
12. Do not require wallets.
13. Do not add royalty payouts, valuation, financial tokens, custody, or secondary trading.
14. Do not make detector-only AI decisions.
15. Do not deploy adversarial unlearnable-audio processing in production.
16. Do not auto-certify legacy music.
17. Do not silently mutate signed agreements, accepted claims, or issued passport versions.
18. Never expose service-role, issuer, C2PA, or blockchain private keys to clients.
19. Initialize external SDKs lazily/runtime-safely; do not break `next build`.
20. Keep public claims precise: Tourify records and reviews evidence; it does not legally adjudicate copyright.

## Mandatory Phase 0 audit

Do not edit production code or create migrations until the audit is complete.

Create:

```text
docs/music-trust/phase-2/CURRENT_STATE_AUDIT_RESULTS.md
```

Audit:

- branch, base commit, dependencies, scripts, versions;
- every canonical music upload, stream, access, player, marketplace, preview, share, EPK, profile, admin, and mobile path;
- Phase 1 actual implementation, flags, tables, routes, jobs, states, and gaps;
- `artist_music` ID type and schema;
- existing team/organization authority;
- invitations and notifications;
- document/e-sign code;
- jobs/outbox;
- feature flags;
- admin capability functions;
- DMCA/disputes;
- public IDs;
- storage and RLS;
- security-definer functions and grants;
- generated types;
- baseline install/lint/typecheck/test/build/migration/advisor results.

Record architecture decisions for schema, cardinality, e-sign, credential suite, C2PA formats, watermark adapter, chain/testnet, KMS, retention, and DDEX targets.

## Mandatory execution JSON

After the audit, create:

```text
docs/music-trust/phase-2/phase-2-execution-plan.json
```

It must validate against the included schema. Replace every template assumption with actual repository findings.

Update after every task. A task is not complete without:

- files changed;
- database objects;
- feature flag;
- acceptance evidence;
- commands and test results;
- migration and rollback/compensating evidence;
- screenshots/route responses when useful;
- residual risks.

## Implementation sequence

### P2-A — Audit and architecture

Complete the audit and ADRs. If Phase 1 dependencies are missing, add compatibility tasks and leave dependent flags disabled.

### P2-B — Rights graph

Create additive works, recordings, parties, contributions, claims, identifiers, territories, validity, and special-case relationships. Link to `artist_music`; do not replace it.

### P2-C — Catalog import and collaboration

Import metadata only from approved sources, match explainably, preserve dates, invite contributors, verify authority, and support counter/dispute actions.

### P2-D — Agreements and signatures

Create versioned templates, deterministic documents, claim snapshots, signing ceremony, downloadable copies, restricted evidence, amendments, and re-signing.

### P2-E — Human-Origin review

Implement evidence storage, automated objective checks, capability-gated review, appeals, re-review, and precise public certification language. No detector-only outcomes.

### P2-F — Passport and credential

Create deterministic public/private manifests, version chain, issuer signature, VC-compatible credential, status, public verification, and redaction.

### P2-G — Protection and provenance

Keep clean masters untouched. Generate protected derivatives asynchronously. Integrate C2PA for approved formats, training-reservation policy, opt-in watermark beta, monitoring adapters, and evidence reports.

### P2-H — Testnet attestation

Implement the minimal nonfinancial registry, OpenZeppelin access controls, multisig, outbox, confirmation handling, source verification, and status transitions. Testnet only unless a later explicit approval exists.

### P2-I — Operations and disputes

Extend current admin moderation and dispute systems. Implement suspension, resolution, amendment, reissue, appeals, and runbooks.

### P2-J — Legacy and regression

Support retrospective catalog workflows without changing DSP distribution. Preserve original release/import/certification dates. Test every existing music surface and mobile semantics.

### P2-K — Hardening and pilot

Complete security/legal review, load tests, backup/restore, key rotation, pilot, metrics, residual-risk report, and staged rollout.

## Supabase requirements

- Read the current Supabase skill/docs and changelog before implementing.
- Discover CLI commands with `--help`.
- Create actual migrations with `supabase migration new` after audit.
- Enable RLS on every exposed table.
- `TO authenticated` is not sufficient authorization.
- UPDATE policies require `USING` and `WITH CHECK`.
- Views must not bypass RLS.
- Do not authorize using user-editable metadata.
- Do not add SECURITY DEFINER to bypass access errors.
- Confirm Data API grants.
- Regenerate database types.
- Run advisors and record results.

## Completion behavior

Continue until all P0/P1 tasks are complete or honestly blocked with exact evidence, safe state, owner, and unblocking condition.

Do not claim Phase 2 is finished because schema/UI scaffolding exists. Phase 2 is finished only when `21_DEFINITION_OF_DONE.md` is evidenced and the execution JSON final gates pass.

Begin with the read-only audit.
