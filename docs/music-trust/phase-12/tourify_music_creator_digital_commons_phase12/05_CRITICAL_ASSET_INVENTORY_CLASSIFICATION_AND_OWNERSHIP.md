# Critical Asset Inventory, Classification and Ownership

## Purpose

Identify the assets required for independent operation and distinguish ownership, licence, custody and operational control.

## Phase boundary

- Preserve `artist_music` as the canonical upload/catalog row and preserve private `artist-music` storage, the signed stream route, `resolveMusicAccess`, Jukebox, mobile, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database; use additive migrations, explicit backfills, versioned records, feature flags, append-only audit events and compensating actions.
- Tourify remains an optional implementation and service provider; the creator digital commons must remain operable if Tourify exits, fails, changes ownership or stops providing services.
- No universal creator identifier, credential, wallet, registry enrollment, data contribution, representation mandate or service authorization may be inferred from a Tourify account or prior-phase participation.
- Identifiers are references and credentials are signed statements; neither creates copyright ownership, administration authority, licensing authority, collection authority, payment authority or legal representation.
- `artist_music`, Rights Passports, licences, administration cases, royalty ledgers, federation decisions and official external records remain authoritative within their own domains and are referenced rather than rewritten.
- Public registries expose only approved, minimal and non-sensitive data; private identity, contracts, evidence, tax, payment, source files and rights-conflict records remain restricted.
- Every resolver or registry response identifies source, issuer, version, jurisdiction, effective period, freshness, confidence, suspension, revocation and dispute status.
- Local creator and member-organization sovereignty remains protected; no commons steward, operator, funder, federation or Tourify administrator may override a lawful local decision.
- Phase 12 cannot launch from Phase 11 feature flags; production requires a separate approval package, independent stewardship and validated multi-operator continuity.

## Primary records

- `commons_assets`
- `asset_versions`
- `asset_ownership_claims`
- `asset_dependencies`
- `asset_risk_reviews`

## Primary workflows

1. Discover domains, trademarks, repositories, package names, schemas, keys, accounts, datasets and documentation.
2. Classify criticality and transferability.
3. Verify chain of title and third-party restrictions.
4. Approve stewardship treatment.

## Canonical source-of-truth rules

- `artist_music` remains the canonical catalog anchor and is referenced, never duplicated or replaced.
- Rights Passports, licences, administration cases, royalty ledgers, federation decisions and official external records remain authoritative within their own domains.
- Commons records express participation, asset stewardship, protocol governance, trust, references, services, conformance and public governance; they do not rewrite underlying rights or member records.
- Every derived record points to a versioned source, issuer, policy, jurisdiction, effective period, immutable input manifest and append-only audit event.
- Official registries, courts, CMOs, administrators, standards bodies and government authorities remain authoritative for their own filings, recognitions and decisions.
- Public projections are purpose-specific and revocable; a public projection is never used as the sole authorization source for a high-impact rights or identity action.

## Required controls

- No asset marked transferable without evidence.
- Creator rights and private data are never commons assets by inference.
- Vendor licences and contributor agreements reviewed.
- Asset register is public where safe.

## Detailed implementation requirements

- Define explicit state machines with allowed transitions, actor permissions, required evidence, idempotency keys, expiry, suspension, revocation, appeal and compensating rollback.
- Record policy, protocol and schema versions on every durable record so later rule changes never silently change the meaning of historical actions.
- Separate public projections from restricted evidence. Public responses contain only purpose-approved fields and include freshness and dispute indicators.
- Use exact-scope authorization based on current authoritative records. Never authorize high-impact action from a cached credential, identifier document or public registry entry alone.
- Create operational queues, escalation paths, response targets, incident ownership and public communication duties before production traffic.
- Document external-provider, escrow-agent, registry, foundation, standards and legal assumptions. Missing contracts, test environments, trust anchors or approvals are blockers, not hidden TODOs.
- Design every critical component for export, independent reimplementation, operator replacement and documented decommissioning.

## Domain design notes

- Classes include public protocol assets, operational secrets, licensed dependencies, personal data, creator-controlled rights data and nontransferable third-party services.
- Every critical asset needs a named owner, custodian, operator, backup, renewal date and failure plan.

## Existing-system integration

- Use dedicated namespaces such as `app/api/creator-digital-commons/**` and shared helpers under `lib/music/creator-digital-commons/`.
- Use Next.js App Router route handlers, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and RORO helpers.
- Use additive Supabase migrations, explicit RLS, restricted storage, short-lived signed URLs, immutable manifests and append-only audit/outbox records.
- Consume approved projections or event outboxes; never expose confidential Phase 1–11 operational tables to public, registry, verifier or researcher-facing routes.
- Keep all Phase 12 flags disabled by default and require steward, jurisdiction, funding, operator and public-approval readiness before activation.
- Preserve upload, playback, access, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalty and rights-administration regression behavior.

## Security, privacy and governance tests

- Default-deny RLS and API authorization for every participant, steward, local organization, operator, issuer, verifier, reviewer, administrator, auditor and worker role.
- Cross-organization isolation, local-sovereignty, jurisdiction, expiry, suspension, revocation, operator-replacement and provider-portability tests.
- Idempotent retries, duplicate webhook delivery, outbox replay, registry reconciliation, asset-transfer rollback and compensating-action tests.
- Data-minimization, public-projection leakage, re-identification, accessibility, assisted-service and low-bandwidth tests.
- Key rotation, compromised operator, poisoned registry, malicious resolver, funder capture, domain loss, repository takeover and network-partition exercises.
- Complete regression coverage for upload, streaming, access, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights administration.

## Stop conditions

- No coordinated pricing, collective bargaining, licensing, representation, enforcement or policy-advocacy authority is created through the commons layer.
- No automated legal, tax, investment, ownership or licensing conclusion may be produced from a resolver, identifier, credential, fingerprint, metadata match or AI confidence score.
- No irreversible asset transfer occurs without an approved asset schedule, authority chain, public notice, conflict review, rollback or replacement plan, and required public or governing-body approval.
- Cross-border transfers require explicit purpose, authority, minimization, transfer mechanism, localization review, onward-transfer controls and deletion or retention policy.
- High-impact identity, registry, protocol or rights actions require accessible notice, human review, appeal, correction, suspension and remedy.
- Critical operator powers require separation of duties, hardware-backed keys, short-lived credentials, append-only audit, emergency suspension and independent oversight.
- Stop work when entity, authority, consent, standards profile, asset ownership, jurisdiction, funding, procurement, provider contract, privacy, security, accessibility or governance approval is unclear.

## Completion evidence

Codex may mark this area complete only after it records:

1. audited repository paths, deployed database objects and current provider, custodian or standards assumptions;
2. approved entity, governance, asset, funding, privacy, security, accessibility, jurisdiction and public-interest decisions;
3. migrations, generated types, RLS tests, route tests, worker tests, transition tests and complete regression results;
4. feature flags, stop conditions, monitoring, service ownership and rollback instructions; and
5. task-level files changed, commands run, evidence produced and unresolved blockers in `phase-12-execution-plan.json`.
