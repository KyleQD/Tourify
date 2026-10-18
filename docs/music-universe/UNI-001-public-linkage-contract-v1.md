# UNI-001 — Music Universe × News × Work / Werk: Public Linkage Contract v1

**Decision status:** Draft implementation, October 18, 2026. **No production API, database, or account changes.**

## Canonical direction

Flow is the umbrella. Tourify is the current operating product and the first adopter. The `packages/api-contracts` package already supplies cross-surface runtime contracts, so this v1 is developed there rather than introducing a competing identity service or a second jobs database.

**News owns reporting. Work/Werk owns opportunity eligibility and professional profile privacy. Music Universe owns public entity links.** No system inherits another system's authorization simply because its entity IDs match.

### Ownership matrix

| Domain | Owner / existing feature | Public linkage allowed | Never imported |
| --- | --- | --- | --- |
| Stories and publisher reporting | News index (draft #19, #21) | Published, approved public article DTO with source provenance | RSS staging records, withheld items, tips, unpublished drafts |
| Hiring and collaboration | Work 2.0 (draft #20) | Post-policy, public, unexpired opportunity DTO only | Applications, applicant identities, employer review evidence, private contact info, recruiter seats, Stripe state |
| Employment and career credits | Werk linked professional profile (planned) | Explicitly opted-in public attested credit only | Payroll, personnel evaluations, private certificates, staff shifts, private credentials |
| Artist/release/recording | Music / DreamStream | Public catalog identity and authorized playback link | Unpublished files, private licensing records, rights secrets |
| Events and venues | Tourify / 54 / Heat | Public published-event and venue references | Advance documents, attendee identity, access credentials, internal crew details |
| Editorial/publisher authority | Prez / News | Clearly attributed public author/source | Sensitive informant data, unverified claims presented as fact |

## Shared v1 contract

- `packages/api-contracts/src/music-universe.ts`: Zod runtime contracts and types for public entity references, public source attribution, evidence labels, safe navigation and per-link disclosure.
- `lib/music-universe/public-projections.ts`: typed, **pure** one-way bridges from the proposed News indexed DTO and Work 2.0 public DTO; intentionally no database reads, no account mutations, no API, no invented link matching.
- `__tests__/music-universe/public-projections.test.ts`: visibility, consent, expiry, contextual feed opt-in, safe links and private-field exclusion.

`schemaVersion: 1` must be maintained independently of underlying schema and UI versions. Never expose arbitrary raw database rows or silently interpret a publisher badge as factual verification.

### Example intended user journey

1. A trusted indexed News article is associated (through independently reviewed entity mapping) with a canonical artist.
2. A reader chooses the artist card and sees the article, released tracks and public performance links.
3. Within the **Work** surface, a user may browse and apply for a public opportunity associated with the artist or venue. A genuine unpaid artist collaboration remains labeled collaboration; paid work goes through independently verified employer and paid plan publishing rules.
4. **Home** may surface work recommendations only after the general-account user explicitly opts in to this type of discovery.
5. After an event, a professional may **opt in to public credit disclosure** backed by accepted attestation; private shift and payroll data remain within Work/Tourify.

No new logins: General account owns linked artist/venue/Werk profiles under the existing account architecture. Do not rewrite those login or role controls.

## Evidence and privacy rules

- `source_reported`: attributed journalism or a published job statement; **not fact-checked**.
- `self_claimed`: self-submitted work collaboration or personal claim; **not employer attestation**.
- `employer_attested`: verified by a legitimate employer/assignment confirmation through a future authority service.
- `editorial_reviewed` and `independently_corrob`: require documented evidence workflows before use.
- `disputed`: do not present as verified; use contextual caveat or withhold where appropriate.

Public professional/person references and credited-on relationships require server-established opt-in consent. Consent must be specific to the credit / intended disclosure, revocable, and checked anew after any public projection is invalidated. This schema does not grant legal consent on behalf of a user.

Public `kind/id` references must be stable *public-facing keys*. Do not blindly use `auth.users.id` or private worker profile IDs as public identifiers. Maintain a protected resolver between real account records, source records, and the canonical public entity catalog. Exact name matching, social badges, AI guesses and approximate titles cannot establish an authoritative identity.

Never auto-convert an accepted shift into a public CV credit; independent worker consent and an appropriate attestor are required. No covert recruiter profiling.

## Feature flags and no-go areas

- This PR deliberately defines no deployable feature flags or API endpoints. It has no effect on current Home, Work, News or artist pages until owning route integrations are reviewed.
- M1 News `NEWS_PUBLIC_ACCESS_ENABLED` and M2 `NEWS_INDEXED_READ_ENABLED` remain disabled by default.
- Work `WORK_DISCOVERY_V1_ENABLED`, `WORK_EMPLOYER_REVIEW_V1_ENABLED`, and `WORK_HIRING_BILLING_V1_ENABLED` remain disabled by default.
- An invalid, expired, withdrawn or unconsented link must be omitted. The owning source must invalidate caches and consumer projections immediately upon correction/retraction, job closure, consent withdrawal or role revocation.
- Source-based association is not employer verification, and Work professional identity does not grant News editorial permissions.

## Integration sequence: agent assignments

| ID | Owner | Acceptance criterion |
| --- | --- | --- |
| UNI-001A | Contracts agent | Run shared schema/unit tests; review v1 naming and compatibility with current mobile consumers |
| UNI-001B | Data/identity agent | Specify stable public IDs, source-entity map, alias resolution, duplicate-merge audit, source and claimant challenges; **no SQL until canonical environment established** |
| UNI-002A | News agent | Consume **only** approved indexed News reads after News PRs #18 → #19 → #21 are green; attribute publisher and require reviewed entity associations |
| UNI-003A | Work agent | Integrate after Work #20 policy/verification is enforced at create/edit/repost and public DTO layer; do not read raw applicant/staff tables |
| UNI-003B | Werk privacy agent | Implement separately stored professional visibility consent, credit attestations, withdrawal and access logs; no inferred professional disclosures |
| UNI-004A | Frontend agent | Artist, venue, event, article and Work contextual cards; Home work recommendation controls default OFF |
| UNI-004B | Search agent | Share entity references across Music Universe without mixing privileged/search-private payloads |
| UNI-006A | Security agent | Test anon/owner/follower/unrelated-user access, raw record injection, adversarial URLs, cache retraction, ID enumeration, and consent changes |
| UNI-008A | QA/release agent | Test against representative staging, avoid live-only assumptions, confirm previews and full CI; require signed-off privacy review |

## Required release gates

1. Finish Node 24 + package-lock/peer-dependency and CI fixes (infrastructure draft #22).
2. Fix legacy `posts` and `events` overly broad public RLS/policies before public News release.
3. Reconcile connected Demo/Staging schema divergence; use reviewed Supabase migrations, never paste draft SQL into production.
4. Approve News source/rights review, Work employer authority, subscription/plan entitlement, atomic listing quotas.
5. Build real canonical entity resolution and source-specific association table before UI linking to actual people.
6. Design authoritative, revocable individual consent on professional/person links, and remove projections on withdrawal.
7. Run positive/negative tests, preview, security and accessibility checks; only then promote.

### Branch relationship

- [News public access #18](https://github.com/KyleQD/Tourify/pull/18)
- [News index #19](https://github.com/KyleQD/Tourify/pull/19)
- [Work protected foundation #20](https://github.com/KyleQD/Tourify/pull/20)
- [News ingestion/editorial #21](https://github.com/KyleQD/Tourify/pull/21)
- [Node 24 runtime #22](https://github.com/KyleQD/Tourify/pull/22)

**Integration rule:** This isolated PR is based on `main`; it does not merge Work or News branches or bypass their release gates. After v1 contract review, downstream branches may import this package from a rebased or merged target and must run parity tests. Flow's long-term platform governance owns the cross-app standard, not a second copy of Work or News data.
