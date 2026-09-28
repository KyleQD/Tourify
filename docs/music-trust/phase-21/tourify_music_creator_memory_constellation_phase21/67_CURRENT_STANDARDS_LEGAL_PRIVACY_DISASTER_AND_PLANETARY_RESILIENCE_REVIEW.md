# Current standards, legal, privacy, disaster and planetary-resilience review

## Purpose

Summarize current primary-source references relevant to archives, emergency cultural protection, disaster risk, trustworthy repositories and any remote or orbital research.

## Required design decisions

- Use sources as design references, not endorsements or automatic legal authority.
- Pin versions and review dates.
- Require jurisdiction-specific counsel and scientific review.
- Treat orbital concepts as research-only and terrestrial resilience as mandatory.

## Phase boundary

Phase 21 is a separate, future-only approval package. It cannot be activated by a Phase 20 feature flag, a historic deposit, an archive credential, a Tourify account, elapsed time, emergency custom, continued software operation or possession of a preservation copy.

`artist_music` remains the canonical catalog anchor. Private audio remains in the existing `artist-music` bucket and playback continues through `/api/music/stream`, `resolveMusicAccess`, the current `JukeboxProvider`/`useJukebox` flow and existing mobile paths. Rights Passports, licences, administration cases, royalty ledgers, Phase 20 trust records and official external sources remain authoritative in their domains. Phase 21 stores constellation agreements, trust-node qualifications, mutual-aid requests, risk and capacity maps, temporary custody records, portable restriction profiles, emergency preservation events and approved public projections; it never rewrites those sources.

## Design position

The memory constellation is a cooperative network of legally and operationally independent cultural-memory trusts. It is not one world archive, a global rights registry, a compulsory deposit system, a universal identity provider, a cultural adjudicator, a global representative or a central authority over creators, communities, Indigenous Peoples, local organizations, national institutions or participating trusts.

Preservation and disclosure are separate. Mutual aid and permanent custody are separate. A portable restriction profile carries constraints; it does not create authority. Emergency action does not erase consent, privacy, cultural protocols, rights-holder interests, local law or community reserved powers.

## Primary records

- `future_phase21_approval_packages`
- constellation charter, participation and withdrawal records
- trust-node qualification, recognition and suspension records
- cultural-authority and local reserved-power schedules
- cross-trust mutual-aid, transfer, custody and return instruments
- risk, climate, conflict and preservation-capacity assessments
- portable restriction, privacy and permitted-purpose profiles
- emergency preservation packages, manifests and reconciliation events
- mutual-aid funding, procurement, operator and conflict disclosures
- restricted evidence objects and purpose-specific public projections
- append-only audit, incident and outbox events

## State model

`draft → proposed → under_review → approved → effective → active | standby | assistance_requested | assistance_authorized | executing | reconciliation_due → completed | partially_completed | suspended | disputed | revoked | withdrawn | expired | superseded | terminated | rejected → archived`

Every transition is actor-scoped, evidence-backed, idempotent, policy-versioned, schema-versioned and time-bounded where applicable. Historical records retain the exact authority, restrictions, jurisdiction and rules that applied when the action occurred.

## Standard workflow

1. Resolve the current actor, trust node, creator, community, cultural authority, source custodian, receiving custodian, jurisdiction and exact requested scope.
2. Load current authoritative participation, custody, restriction, privacy, legal-hold, dispute, suspension, revocation, expiry and emergency records.
3. Verify immutable source and preservation manifests, provenance, fixity, package profile and policy versions.
4. Evaluate legal, cultural, privacy, security, archival, accessibility, climate, conflict, funding, competition, environmental, space-law and continuity stop conditions.
5. Create a versioned proposal or assistance request using a unique idempotency key.
6. Obtain the required creator, community, source custodian, receiving custodian, counsel, privacy, security, governing-body, scientific, public-notice or dual-control approval.
7. Execute through an approved route or outbox-backed worker with signed messages, replay protection and reconciliation.
8. Reconcile the result, publish only the approved projection and preserve correction, return, deletion, rollback or compensating action.

## Authorization and source-of-truth rules

- Public identifiers, credentials, registry entries, capacity maps and finding aids support discovery only.
- High-impact actions reload current authoritative source, custody, cultural-authority and restriction records at execution time.
- Constellation membership does not authorize collection transfer, disclosure, research, AI use, repatriation, licensing, ownership, payment, enforcement or representation.
- No receiving trust obtains broader rights than the source trust can lawfully delegate.
- Restriction conflicts default to deny or the stricter compatible rule until authorized authorities resolve them.
- Temporary emergency custody expires, returns, deletes or converts only through an explicit approved transition.
- Successor trusts, governments, institutions, operators and officeholders do not inherit authority automatically.
- Conflicts are preserved and escalated; Tourify and the constellation do not adjudicate copyright, title, cultural identity or historical truth.

## Public and restricted data

Public responses contain only purpose-approved fields and identify source, trust node, custodian, version, jurisdiction, effective period, freshness, confidence, sensitivity, restriction, dispute, suspension and revocation status. Public and verifier-facing routes read approved projection tables or security-invoker views, never confidential operational tables.

Restricted evidence, precise facility locations, private identity, contracts, unreleased audio, tax, payment, legal correspondence, security plans, community secrets and rights-conflict material remain in restricted storage with short-lived signed access, access logs, purpose checks and review.

## Non-destructive engineering integration

- Audit actual repository paths and deployed Supabase objects before implementation.
- Prefer `app/api/creator-memory-constellation/**` and `lib/music/creator-memory-constellation/**` only when the audit confirms compatibility.
- Use Next.js App Router route handlers, colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and receive-object/return-object helpers.
- Use additive migrations, explicit backfills, default-deny RLS, restricted storage, short-lived signed URLs, immutable manifests and append-only audit/outbox records.
- Consume approved projections or event outboxes; never expose or mutate confidential Phase 1–20 operational tables.
- Preserve upload, playback, entitlement, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights-administration behavior.

## Stop conditions

Stop rather than degrade when legal structure, trust-node authority, cultural authority, consent, custody, restriction compatibility, source lineage, privacy basis, legal hold, preservation capability, capacity, safety, scientific review, format understanding, cryptographic verification, funding, staffing, provider contract, security, accessibility, environmental approval, launch or space-law approval, independent review or public approval is missing, disputed, expired or stale.

No workflow may create universal identity, compulsory deposit, centralized cultural authority, global representation, coordinated pricing, collective bargaining, collective licensing, ownership conclusions, automated legal advice, perpetual authority, unrestricted public access or unapproved orbital deployment.

## Testing and completion evidence

Required evidence includes repository paths, deployed objects, migrations, generated types, RLS matrices, route and worker tests, preservation-package validation, fixity checks, restriction-propagation tests, trust-isolation tests, mutual-aid activation and denial, temporary-custody return, archive restore, provider replacement, climate and conflict drills, emergency-fund controls, technology migration, dissolution and Tourify-unavailable regression results.

Codex records files changed, commands run, test output, external assumptions, approvals, operational owners, monitoring, rollback instructions and unresolved blockers in `phase-21-execution-plan.json` before marking work complete.

## Domain-specific implementation sequence

1. Use sources as design references, not endorsements or automatic legal authority.
2. Pin versions and review dates.
3. Require jurisdiction-specific counsel and scientific review.
4. Treat orbital concepts as research-only and terrestrial resilience as mandatory.

## Evidence required for this area

- A named operational owner and independent reviewer.
- Current authority, charter, agreement, custody, restriction and policy records.
- Audited repository and deployed-schema paths.
- Test evidence for allow, deny, expiry, suspension, dispute, partition and rollback paths.
- Monitoring, incident response, public communication, export and decommissioning instructions.
- A recorded decision explaining why the implementation does not create unintended ownership, access, authority, centralization or disclosure.


## Current primary-source reference set

### Documentary heritage and trustworthy repositories

- UNESCO Memory of the World Programme and the 2015 Recommendation concerning preservation of and access to documentary heritage, including in digital form. These emphasize preservation, access, memory-institution independence, professional capacity and legitimate access restrictions.
  - https://www.unesco.org/en/memory-world/about
  - https://www.unesco.org/en/legal-affairs/recommendation-concerning-preservation-and-access-documentary-heritage-including-digital-form
- ISO 14721:2025, Open Archival Information System reference model.
  - https://www.iso.org/standard/87471.html
- ISO 16363:2025, audit and certification of trustworthy digital repositories.
  - https://www.iso.org/standard/87472.html

### Disaster, conflict and cultural emergency response

- UNDRR Sendai Framework for Disaster Risk Reduction 2015–2030: understand risk, strengthen governance, invest in resilience and improve preparedness and recovery.
  - https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030
- UNESCO culture-in-emergencies and Heritage Emergency Fund materials.
  - https://www.unesco.org/en/emergencies
  - https://www.unesco.org/en/culture-emergencies/heritage-emergency-fund
- ICCROM First Aid and Resilience for Cultural Heritage in Times of Crisis.
  - https://www.iccrom.org/programmes/first-aid-and-resilience-times-crisis-far
- 1954 Hague Convention and 1999 Second Protocol. Applicability and protection depend on treaty status, domestic implementation, the nature of the property and the conflict; Phase 21 does not claim protected status by software.
  - https://www.unesco.org/en/heritage-armed-conflicts/convention-and-protocols/1954-convention
  - https://www.unesco.org/en/legal-affairs/second-protocol-hague-convention-1954-protection-cultural-property-event-armed-conflict

### Remote and orbital research boundary

- The Outer Space Treaty places international responsibility on states for national space activities, including nongovernmental activities, and addresses liability and harmful contamination.
  - https://www.unoosa.org/oosa/SpaceLaw/outerspt.html
- UNOOSA identifies the Registration Convention, Liability Convention and other space-law instruments, and maintains the UN Register of Objects Launched into Outer Space.
  - https://www.unoosa.org/oosa/SpaceLaw/treaties.html
  - https://www.unoosa.org/oosa/en/treatyimplementation/
- COPUOS Long-term Sustainability Guidelines address national regulation and supervision, registration, orbital information, debris, conjunction assessment, reentry risk, capacity building and sustainability.
  - https://lts.unoosa.org/unoosa_lts/en/resources/guidelines/publication.html

## Research conclusions

1. Terrestrial multi-site resilience remains mandatory; remote or orbital research cannot replace basic, independently restorable terrestrial preservation.
2. Mutual-aid coordination must preserve source authority, community restrictions, privacy and local law.
3. Cultural emergency response should integrate preparedness, risk reduction, trained responders, temporary custody, return and recovery.
4. Orbital activity would require state authorization and supervision, launch and payload approvals, registration, liability allocation, debris and reentry controls, export review, insurance, retrieval and decommissioning.
5. Standards alignment and certification are evidence inputs, not substitutes for legal authority, cultural legitimacy or actual restoration tests.

## Review requirement

Revalidate all standards, treaty status, government requirements, provider assumptions and scientific claims at implementation time. Missing launch authority, test environments, trust anchors, custodial agreements or scientific evidence are blockers, not implementation TODOs.
