# Dark archives, break-glass access and emergency disclosure

## Purpose

Defines sealed preservation, emergency authority, dual control and after-action review.

## Required design decisions

- Limit emergency access to enumerated threats and exact records.
- Require dual approval, short-lived credentials and immutable audit.
- Do not permit public curiosity or administrative convenience as emergency grounds.
- Notify affected authorities when lawful and safe.


## Phase boundary

Phase 20 is a separate, future-only approval package. It cannot be activated by a Phase 19 feature flag, an old archive deposit, historic consent, a Tourify account, a public identifier, a credential, a finding aid, elapsed time, continued software operation or archive possession.

`artist_music` remains the canonical catalog anchor. Private audio remains in the existing `artist-music` bucket and playback continues through `/api/music/stream`, `resolveMusicAccess`, the current `JukeboxProvider`/`useJukebox` flow and existing mobile paths. Rights Passports, licences, administration cases, royalty ledgers and official external sources remain authoritative in their domains. Phase 20 stores references, preservation packages, custody instruments, cultural-authority records, restrictions, access decisions and approved public projections; it never rewrites those sources.

## Design position

The cultural-memory trust is a plural stewardship system, not one world archive and not a rights registry. Preservation must survive operator, provider, institution and legal-order change while respecting creator choice, community authority, local sovereignty, privacy, cultural protocols, lawful destruction, access restrictions, repatriation, correction and withdrawal.

Preservation and disclosure are separate. Custody and ownership are separate. Discovery and authorization are separate. Age alone does not make a record public, reusable, licensable or available for AI training.

## Primary records

- `future_phase20_approval_packages`
- trust entity, charter and amendment versions
- participation, deposit, withdrawal and restriction records
- cultural-authority and reserved-power schedules
- custodian qualification, custody and transfer records
- preservation profiles, packages, manifests and events
- access, disclosure, reuse, repatriation and remediation decisions
- restricted evidence objects and purpose-specific public projections
- append-only audit, preservation and outbox events

## State model

`draft → proposed → under_review → approved → effective → active | preservation_due | restricted → suspended | disputed | revoked | withdrawn | expired | superseded | transferred | terminated | rejected → archived`

Every transition is actor-scoped, evidence-backed, idempotent, policy-versioned, schema-versioned and time-bounded where applicable. Historical records retain the exact rules and authority that applied when the action occurred.

## Standard workflow

1. Resolve the current actor, participant class, creator, community, organization, custodian, jurisdiction and exact requested scope.
2. Load the current authoritative source, custody, cultural-authority, restriction, privacy, legal-hold, dispute, suspension, revocation and expiry records.
3. Verify immutable source and preservation manifests, provenance, fixity and policy versions.
4. Evaluate legal, cultural, privacy, security, archival, accessibility, funding, competition, environmental and continuity stop conditions.
5. Create a versioned proposal using a unique idempotency key.
6. Obtain the required creator, community, archivist, counsel, privacy, security, governing-body, public-notice or dual-control approval.
7. Execute through an approved route or outbox-backed worker.
8. Reconcile the result, publish only the approved projection and preserve correction, rollback or compensating action.

## Authorization and source-of-truth rules

- Public identifiers, credentials, registry entries and finding aids support discovery only.
- High-impact actions reload current authoritative records at execution time.
- Archive possession does not create ownership, licensing, collection, payment, enforcement, representation or public-law authority.
- Cultural authority is exact-scope, evidenced, revisitable and may be overlapping or contested.
- Successor custodians, governments, institutions, officeholders and operators do not inherit authority automatically.
- Conflicts are preserved and escalated; Tourify and the trust do not adjudicate copyright ownership or historical truth.

## Public and restricted data

Public responses contain only purpose-approved fields and identify source, custodian, version, jurisdiction, effective period, freshness, confidence, sensitivity, restriction, dispute, suspension and revocation status. Public and verifier-facing routes read approved projection tables or security-invoker views, never confidential operational tables.

Restricted evidence, private identity, contracts, unreleased audio, tax, payment, legal correspondence, community secrets and rights-conflict material remain in restricted storage with short-lived signed access, access logs, purpose checks and review.

## Non-destructive engineering integration

- Audit actual repository paths and deployed Supabase objects before implementation.
- Prefer `app/api/creator-cultural-memory-trust/**` and `lib/music/creator-cultural-memory-trust/**` only when the audit confirms compatibility.
- Use Next.js App Router route handlers, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and receive-object/return-object helpers.
- Use additive migrations, explicit backfills, default-deny RLS, restricted storage, short-lived signed URLs, immutable manifests and append-only audit/outbox records.
- Consume approved projections or event outboxes; never expose or mutate confidential Phase 1–19 operational tables.
- Preserve upload, playback, entitlement, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights-administration behavior.

## Stop conditions

Stop rather than degrade when legal structure, authority, consent, deposit licence, source lineage, cultural restriction, privacy basis, custody, legal hold, preservation capability, format understanding, cryptographic verification, funding, staffing, provider contract, security, accessibility, independent review or public approval is missing, disputed, expired or stale.

No workflow may create compulsory identity, compulsory deposit, global representation, coordinated pricing, collective bargaining, collective licensing, ownership conclusions, automated legal advice, perpetual authority or unrestricted public access.

## Testing and completion evidence

Required evidence includes repository paths, deployed objects, migrations, generated types, RLS matrices, route and worker tests, preservation-package validation, fixity checks, restriction-propagation tests, cultural-authority tests, access-leakage tests, custodian transfer, archive restore, provider replacement, technology migration, repatriation, dissolution and Tourify-unavailable regression results.

Codex records files changed, commands run, test output, external assumptions, approvals, operational owners, monitoring, rollback instructions and unresolved blockers in `phase-20-execution-plan.json` before marking work complete.

## Domain-specific implementation sequence

1. Limit emergency access to enumerated threats and exact records.
2. Require dual approval, short-lived credentials and immutable audit.
3. Do not permit public curiosity or administrative convenience as emergency grounds.
4. Notify affected authorities when lawful and safe.

## Evidence required for this area

- A named owner and independent reviewer.
- Current authority and policy records.
- Audited repository and deployed-schema paths.
- Test evidence for allow, deny, expiry, suspension, dispute and rollback paths.
- Monitoring, incident response, public communication and decommissioning instructions.
- A recorded decision explaining why the implementation does not create unintended rights, authority or disclosure.
