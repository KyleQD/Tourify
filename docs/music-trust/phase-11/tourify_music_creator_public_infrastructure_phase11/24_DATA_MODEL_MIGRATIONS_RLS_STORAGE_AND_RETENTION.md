# Data Model, Migrations, RLS, Storage and Retention

## Purpose

Define additive Supabase structures and explicit authorization for participation, identifiers, trust registries, rights references, services and governance.

## Phase boundary

- Preserve artist_music as the canonical upload/catalog row and preserve private artist-music storage, signed stream route, resolveMusicAccess, Jukebox, mobile, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database; use additive migrations, explicit backfills, versioned records, feature flags, audit events and compensating actions.
- Tourify remains an optional implementation and service provider; public-interest infrastructure must not depend on Tourify remaining available.
- No universal creator identifier, credential, wallet, registry enrollment, data contribution, representation mandate or service authorization may be inferred from a Tourify account or prior-phase participation.
- Identifiers are references and credentials are signed statements; neither creates copyright ownership, administration authority, licensing authority, collection authority, payment authority or legal representation.
- artist_music, Rights Passports, licences, administration cases, royalty ledgers and official external records remain authoritative in their own domains and are referenced rather than rewritten.
- Public registries expose only approved, minimal and non-sensitive data; private identity, contracts, evidence, tax, payment and rights-conflict records remain restricted.
- Every resolver response identifies the source, issuer, version, jurisdiction, effective period, freshness, confidence and revocation or dispute status.

## Primary records

- `public_infrastructure_* tables`
- `restricted public-infrastructure-evidence bucket`
- `projection views`
- `audit and outbox events`

## Primary workflows

1. Audit existing schemas.
2. Create migrations with Supabase CLI.
3. Apply RLS and grants.
4. Backfill explicit references and verify.

## Canonical source-of-truth rules

- `artist_music` remains the canonical catalog anchor and is referenced, never duplicated or replaced.
- Rights Passports, licences, administration cases, royalty ledgers, federation decisions and official external records remain authoritative within their own domains.
- Public infrastructure records express participation, identifiers, credentials, trust, references, services and governance; they do not rewrite underlying rights or member records.
- Every derived record points to a versioned source, issuer, policy, jurisdiction, effective period and immutable audit event.

## Required controls

- Never reset database.
- Views use security_invoker.
- No service role in clients.
- Retention and legal holds documented.

## Detailed implementation requirements

- Define an explicit state machine with allowed transitions, actor permissions, required evidence, idempotency keys, expiry behavior, suspension, revocation and compensating rollback.
- Record policy and schema versions on every durable record so a later rules change never silently changes the meaning of historical actions.
- Separate public projections from restricted evidence. Public responses must contain only fields approved for the exact purpose and must include freshness and dispute indicators.
- Use exact-scope authorization based on the current source record. Never authorize a high-impact action from a cached credential or public identifier document alone.
- Create operational queues, escalation paths, response targets, incident ownership and public communication duties before enabling production traffic.
- Document external-provider and standards assumptions. Missing contracts, test environments, trust anchors or legal approvals are blockers rather than TODOs hidden in code.

## Existing-system integration

- Use a dedicated namespace such as `app/api/creator-public-infrastructure/**` and shared helpers under `lib/music/creator-public-infrastructure/`.
- Use route handlers, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and RORO helpers.
- Use additive Supabase migrations, explicit RLS, restricted storage, short-lived signed URLs and append-only audit/outbox records.
- Consume approved projections or event outboxes; never expose confidential operational tables to public or verifier-facing routes.
- Preserve upload, playback, access, marketplace, feed, profile, EPK, analytics, mobile, licensing, royalty and rights-administration regression behavior.

## Security, privacy and governance tests

- Default-deny RLS and API authorization for every participant, organization, issuer, verifier, reviewer, administrator and worker role.
- Cross-organization isolation, jurisdiction, expiry, suspension, revocation and local-sovereignty tests.
- Idempotent retries, duplicate webhook delivery, outbox replay, provider reconciliation and compensating-action tests.
- Data-minimization, public-projection leakage, re-identification, accessibility and low-bandwidth tests.
- Key rotation, compromised issuer, registry poisoning, malicious resolver response and network-partition exercises.
- Complete regression coverage for upload, streaming, access, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights administration.

## Stop conditions

- No coordinated pricing, collective bargaining, licensing, representation, enforcement or policy advocacy authority is created through the public infrastructure layer.
- No automated legal, tax, investment, ownership or licensing conclusion may be produced from a resolver, identifier, credential, fingerprint, metadata match or AI confidence score.
- Cross-border transfers require explicit purpose, authority, minimization, transfer mechanism, localization review, onward-transfer controls and deletion or retention policy.
- High-impact identity or rights actions require accessible notice, human review, appeal, correction, suspension and remedy.
- Critical operator powers use separation of duties, hardware-backed keys, short-lived credentials, append-only audit, emergency suspension and independent oversight.
- Stop work when entity, authority, consent, identifier policy, standards profile, jurisdiction, funding, procurement, provider contract, privacy, security, accessibility or governance approval is unclear.

## Completion evidence

Codex may mark this area complete only after it records:

1. audited repository paths, deployed database objects and current provider or standards assumptions;
2. approved entity, governance, privacy, security, accessibility, jurisdiction and public-interest decisions;
3. migrations, generated types, RLS tests, route tests, worker tests and regression results;
4. feature flags, stop conditions, monitoring, service ownership and rollback instructions; and
5. task-level files changed, commands run, evidence produced and unresolved blockers in `phase-11-execution-plan.json`.
