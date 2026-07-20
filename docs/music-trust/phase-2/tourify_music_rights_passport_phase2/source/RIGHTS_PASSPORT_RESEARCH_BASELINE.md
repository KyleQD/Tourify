# Tourify Rights Passport — Phase 1 Implementation Plan

## 1. Phase 1 objective

Phase 1 should establish the **legal, technical, metadata, identity, and evidence foundation** for Tourify’s future tokenized music ecosystem.

The resulting system should allow an artist to:

1. Upload an original recording and supporting files.
2. Create separate records for the musical composition and sound recording.
3. Identify writers, performers, producers, publishers, labels, and other contributors.
4. Document ownership, administration, participation, and royalty-related claims.
5. Invite every contributor to review and approve the information.
6. Execute legally reviewable electronic agreements.
7. Generate a versioned, tamper-evident **Tourify Rights Passport**.
8. Anchor a privacy-safe fingerprint of that passport to a blockchain.
9. Update, dispute, suspend, or supersede the passport without destroying its history.
10. Export the metadata in formats that can later support distribution, royalty accounting, licensing, valuation, collectibles, and regulated royalty participation.

### Phase 1 must not include

Phase 1 should deliberately exclude:

* Tradable tokens.
* Fan investment offerings.
* Royalty-bearing securities.
* Catalog valuation.
* Automated royalty distributions.
* A secondary marketplace.
* Claims that Tourify has legally adjudicated copyright ownership.
* Public disclosure of private contracts or sensitive ownership information.

The product should work without cryptocurrency, wallets, or tokens. Blockchain anchoring should strengthen the audit trail rather than define the underlying rights.

---

# 2. Research findings that must shape the product

## 2.1 A song contains separate rights assets

The U.S. Copyright Office treats the underlying musical composition and the recorded performance as separate works. A composition can be written by songwriters and lyricists, while a sound recording may involve performers, producers, and sound engineers. Ownership of one does not automatically establish ownership of the other. 

Tourify must therefore create distinct but linked objects for:

* The musical work or composition.
* The sound recording.
* The release or commercial package.
* Each alternate recording, edit, remix, remaster, instrumental, clean version, and music video.

## 2.2 Blockchain is supporting evidence, not the government copyright record

Copyright protection generally begins when an original work is fixed in a tangible medium. Registration remains a separate government process. ([U.S. Copyright Office][1])

The joint Copyright Office and USPTO study on NFTs recognized that blockchain can help document authenticity, provenance, and transaction history, but also warned that immutable systems can preserve inaccurate or fraudulent information and that consumers frequently misunderstand which intellectual-property rights accompany a token. 

The Tourify interface must therefore say:

> The Rights Passport documents claims, agreements, evidence, contributor confirmations, and record history. It is not a substitute for government registration and does not independently adjudicate ownership.

## 2.3 A copyright transfer still needs a signed written instrument

Under 17 U.S.C. § 204, a copyright transfer generally requires a written instrument signed by the owner or authorized agent. ([Legal Information Institute][2])

The smart contract must not attempt to replace the underlying legal agreement. It should reference the cryptographic hash of a human-readable agreement containing the actual grant, assignment, license, or split terms.

## 2.4 Electronic signatures can support the agreement workflow

Federal electronic-signature law generally prevents a contract or signature from being denied legal effect solely because it is electronic, provided required records remain retainable and reproducible. ([Legal Information Institute][3])

Tourify must retain:

* The complete document the signer saw.
* The document and manifest hashes.
* The signer’s identity and authority.
* The exact consent text.
* Authentication evidence.
* Signature timestamp.
* IP address and device information.
* A downloadable copy for every signer.
* Every subsequent amendment.

## 2.5 Industry identifiers identify assets; they do not prove ownership

An ISRC identifies a particular sound recording or music video but does not establish rights ownership. ([ifpi-isrc][4])

An ISWC identifies a musical work. Allocation normally depends on the creators being identified. ([ISWC][5])

Tourify should store identifiers including:

* ISRC for recordings.
* ISWC for compositions.
* IPI/CAE for writers and publishers.
* ISNI for people and organizations.
* IPN for performers, where available.
* UPC, EAN, or GRid for releases.
* PRO or CMO affiliations.
* MLC Song Code.
* Distributor catalog identifiers.
* SoundExchange repertoire information.
* Internal Tourify identifiers.

The MLC specifically encourages organized song data containing creator identifiers, role codes, ISWC, ISRC, titles, contributors, writers, producers, and performers. ([MLC Blog][6])

## 2.6 Tourify should align with DDEX from the beginning

Tourify’s internal model should be compatible with:

* **RIN:** studio-session, recording, contribution, role, and creation metadata.
* **LRAW:** relationships between sound recordings and the musical works they embody.
* **MWN:** musical-work ownership and administration claims.
* **BWARM:** future bulk communication of works, recordings, parties, and right shares.

RIN is intended to capture recording and contributor information early in the creation process. LRAW communicates links between recordings and musical works. MWN supports detailed right-share claims, including territories, validity periods, and different rights-controller relationships. ([kb.ddex.net][7])

Tourify does not need to generate every DDEX message in the first release. It should use a DDEX-compatible internal vocabulary and later add import/export adapters.

Before using DDEX messages commercially in production, Tourify should obtain the free DDEX Implementation Licence and DDEX Party Identifier. ([kb.ddex.net][8])

---

# 3. Phase 1 product definition

## 3.1 Core product name

**Tourify Rights Passport**

A passport represents a versioned package containing:

* Asset identity.
* Recording and composition relationship.
* Credits.
* Rights claims.
* Contributor approvals.
* Supporting evidence.
* Registration identifiers.
* Legal agreements.
* Verification status.
* Passport history.
* Cryptographic signatures.
* Blockchain anchor.

## 3.2 Verification levels

Tourify should avoid a single ambiguous “verified” badge. Use clearly defined levels:

### Level 0 — Draft

The artist has entered information, but contributors have not approved it.

### Level 1 — Artist attested

The submitting artist has signed a declaration that the information is accurate to the best of their knowledge.

### Level 2 — Contributor confirmed

Every required contributor has confirmed their role and the relevant split or rights information.

### Level 3 — Document backed

Required agreements or supporting evidence have been uploaded and signed.

### Level 4 — Registry linked

External identifiers or registration records have been supplied and successfully matched.

### Level 5 — Tourify reviewed

A Tourify rights-operations reviewer has checked the submission against the platform’s review procedure.

The public badge must state the level rather than implying that Tourify guarantees ownership.

---

# 4. Legal and operational setup before development

## 4.1 Engage specialized counsel

Tourify should retain a music and technology attorney to review:

* Composition and master-rights terminology.
* Electronic split sheets.
* Copyright assignments and licenses.
* Producer agreements.
* Featured-artist agreements.
* Work-made-for-hire declarations.
* Sample and interpolation disclosures.
* Cover-song handling.
* Minor-contributor approvals.
* Organization signing authority.
* Public badge language.
* Dispute and correction procedures.
* International contributor implications.
* Electronic-signature consent.
* Privacy and retention practices.
* Future tokenization separation.

The attorney should not merely review the final interface. Legal requirements should determine the data model and workflow before development begins.

## 4.2 Create the Phase 1 legal document set

The following documents should be version controlled:

1. Rights Passport Terms of Use.
2. Artist submission and accuracy declaration.
3. Contributor participation agreement.
4. Electronic split-sheet agreement.
5. Composition ownership declaration.
6. Master ownership declaration.
7. Producer-points or income-participation addendum.
8. Publisher or administrator declaration.
9. Label or organization authority declaration.
10. Sample and interpolation disclosure.
11. Cover or derivative-work disclosure.
12. Work-made-for-hire evidence form.
13. AI-assisted creation disclosure.
14. Minor and guardian consent.
15. Electronic-signature consent.
16. Public-display authorization.
17. Rights dispute procedure.
18. Correction and amendment policy.
19. Fraud and misrepresentation policy.
20. Privacy and data-retention notice.
21. Copyright infringement and takedown policy.

Every agreement needs a stable template ID and version. A passport must always identify the exact template versions used.

## 4.3 Establish a Rights Operations function

Even a mostly automated system requires a small human review operation.

Rights Operations should be able to:

* Review suspicious or incomplete claims.
* Check external identifiers.
* Review document quality.
* Request corrections.
* Suspend public badges.
* Handle contributor disputes.
* Process legal notices.
* Record resolutions.
* Escalate complex cases to counsel.

Staff must never silently alter a signed ownership claim. They may request a correction or create a proposed amendment that requires new approval.

---

# 5. Domain and data model

Tourify should create a dedicated, non-destructive domain such as a new Postgres schema named `music_rights`.

Existing Tourify upload, artist, event, feed, and profile tables should remain intact during initial development.

## 5.1 Asset hierarchy

```text
Artist / Rights Organization
└── Music Project
    ├── Release
    │   └── Release Track
    ├── Musical Work
    ├── Sound Recording
    ├── Audio and Evidence Files
    ├── Parties and Contributions
    ├── Rights Claims
    ├── Agreements
    └── Rights Passport Versions
```

### Music project

A workspace for a single, EP, album, live recording, remix project, or catalog import.

### Musical work

The underlying composition and lyrics.

### Sound recording

A particular recorded performance.

### Release

The commercial package in which one or more recordings appear.

### Media asset

The actual WAV, FLAC, MP3, artwork, lyric document, stem, session file, agreement, or evidence file.

## 5.2 Recommended database tables

### Core assets

```text
rights_projects
musical_works
sound_recordings
releases
release_tracks
asset_relationships
media_assets
media_asset_versions
```

### Parties and identities

```text
rights_parties
party_profiles
party_identifiers
party_affiliations
party_authorized_representatives
```

### Contributions and credits

```text
contributions
contribution_roles
instruments
credit_display_preferences
```

### Rights

```text
rights_claims
rights_claim_scopes
rights_claim_territories
rights_claim_validity_periods
rights_controllers
rights_administrators
income_participations
```

### Agreements

```text
agreement_templates
rights_agreements
agreement_parties
signature_requests
signature_events
agreement_versions
```

### Verification and evidence

```text
evidence_documents
external_registrations
verification_checks
verification_results
```

### Passport and blockchain

```text
rights_passports
passport_versions
passport_manifest_items
credential_issuances
blockchain_anchors
anchor_transactions
```

### Operations

```text
rights_invitations
rights_disputes
dispute_evidence
dispute_resolutions
rights_audit_events
rights_notifications
rights_outbox_events
```

## 5.3 Stable internal identifiers

Every entity should receive a permanent Tourify identifier, preferably UUIDv7 or another time-sortable unique ID.

External identifiers must never become primary database keys because:

* They may not yet exist.
* Users may enter them incorrectly.
* Different systems may supply conflicting identifiers.
* A recording and a release use different identifier systems.
* Corrections must not change Tourify’s internal references.

## 5.4 Rights-claim model

Do not build one generic `split_percentage` field.

Each claim should identify:

```text
Subject:
  musical work | sound recording | release | income stream

Claimant:
  person | organization

Claim type:
  ownership | administration | collection | license |
  income participation | approval right

Rights category:
  composition | master | mechanical | performance |
  synchronization | reproduction | distribution |
  digital performance | neighboring rights

Share:
  numerator
  denominator
  normalized percentage
  original percentage
  original percentage scale

Territory:
  worldwide or explicit territory set

Validity:
  start date
  end date
  perpetual flag

Exclusivity:
  exclusive | non-exclusive | not applicable

Evidence:
  agreement or declaration reference

Status:
  proposed | accepted | rejected | disputed |
  superseded | terminated
```

This matters because music organizations do not always display percentages on the same scale. ASCAP commonly describes writer and publisher allocations as 50% each, while BMI represents the combined unit as 200%, with 100% assigned to writers and 100% to publishers. ([ASCAP][9])

Tourify should normalize calculations internally while preserving the original source scale and terminology.

## 5.5 Rights validation rules

The system should enforce:

* Claims cannot overlap in a way that exceeds the allowed total for the same rights scope, territory, and validity period.
* Unknown shares must be marked unknown, not entered as zero.
* Administration and ownership must not be treated as the same claim.
* Producer points must not be entered as master ownership unless the agreement expressly grants ownership.
* Credits do not automatically create ownership.
* A composition split does not control the master.
* A master split does not control the composition.
* A pending or disputed share prevents the highest verification status.
* Any material amendment invalidates earlier approvals for the affected scope.

DDEX similarly distinguishes unknown shares from zero-value claims and supports rights data with territories and validity periods. ([kb.ddex.net][10])

---

# 6. Upload and media-processing system

## 6.1 Accepted files

Initial support should include:

* WAV.
* FLAC.
* AIFF.
* MP3 for reference only.
* M4A or AAC for reference.
* PDF agreements.
* PNG, JPEG, or WebP artwork.
* TXT, DOCX, or PDF lyrics.
* ZIP session packages only after strict security review.

Tourify should identify one file as the authoritative master and label everything else as a source, alternate, preview, derivative, or evidence file.

## 6.2 Upload flow

1. Client requests a signed upload session.
2. Server checks account permissions and project quota.
3. File is uploaded directly into a private storage bucket.
4. Upload record is created in a quarantined state.
5. A processing worker validates format and size.
6. Malware and file-safety checks run.
7. Technical audio metadata is extracted.
8. Exact-file and acoustic fingerprints are generated.
9. Duplicate and similarity checks run.
10. File is moved to its permanent versioned location.
11. The original object is never overwritten.
12. An audit event records each processing step.

Supabase Storage can use Postgres Row Level Security and private signed URLs for fine-grained access. Public buckets bypass retrieval access controls, so original recordings and contracts should remain private. ([Supabase][11])

File processing should follow allowlists, file-size limits, content validation, safe filenames, isolated processing, and malware controls. ([OWASP Cheat Sheet Series][12])

## 6.3 Three fingerprint types

### Binary hash

Generate a SHA-256 digest for every exact file. SHA-256 can be used to detect whether data has changed after the digest was generated. ([NIST Computer Security Resource Center][13])

This proves that a later file is byte-for-byte identical to the originally processed file.

### Acoustic fingerprint

Generate a Chromaprint or comparable acoustic fingerprint to identify near-identical recordings despite differences in encoding or container format. Chromaprint is designed for full-file identification and duplicate detection, but should not be represented as legal proof of authorship. ([AcoustID][14])

### Manifest hash

Create a deterministic JSON manifest and canonicalize it before hashing. RFC 8785 describes deterministic JSON serialization suitable for cryptographic hashing. ([RFC Editor][15])

## 6.4 Duplicate detection

Tourify should flag:

* Exact duplicate binary.
* Likely transcoded duplicate.
* Same recording under a different title.
* Same ISRC attached to materially different audio.
* Different ISRCs attached to near-identical audio.
* A previously submitted recording claimed by another user.

A match should create a review alert, not an automatic infringement ruling.

---

# 7. Contributor and identity workflow

## 7.1 Party types

Support:

* Individual.
* Band or informal group.
* Legal business entity.
* Label.
* Publisher.
* Rights administrator.
* Estate.
* Trust.
* Authorized representative.

A stage name and legal identity must be stored separately.

## 7.2 Identity assurance levels

### Basic account

Verified email.

### Confirmed contributor

Verified email, phone, reauthentication before signing, and legal-name declaration.

### Enhanced identity

Optional third-party identity verification for artists seeking higher verification status.

### Organization verification

Business name, jurisdiction, entity information, and authorized signer.

Phase 1 should not require every musician to own a cryptocurrency wallet.

## 7.3 Contributor invitation

The artist enters:

* Contributor name.
* Email or Tourify account.
* Role.
* Contribution.
* Proposed rights or income share.
* Whether the contributor must sign.
* Whether the credit may be publicly displayed.

The contributor receives:

1. Email and Tourify notification.
2. Plain-language summary.
3. Access to the relevant project.
4. Ability to accept their identity and role.
5. Ability to accept or contest the proposed share.
6. Ability to provide identifiers and affiliations.
7. Ability to upload evidence.
8. Ability to sign after every required issue is resolved.

## 7.4 Contributor response options

A contributor can:

* Accept.
* Accept credit but reject the proposed share.
* Propose a corrected role.
* Propose a corrected percentage.
* Identify a publisher, label, or representative.
* State that the share is unknown.
* State that another contributor is missing.
* Open a formal dispute.
* Decline public display while remaining part of the private record.

---

# 8. Rights questionnaires

The artist should not be presented with one overwhelming legal form. Use a conditional wizard.

## 8.1 Composition questions

* Who wrote the music?
* Who wrote the lyrics?
* Was any portion based on a preexisting work?
* Is it a cover?
* Is it a translation or adaptation?
* Is there a publisher?
* Is there a publishing administrator?
* What are the writer ownership shares?
* Are the shares final?
* Is an ISWC available?
* Are the writers registered with a PRO or CMO?
* Is the work registered with The MLC?

## 8.2 Master questions

* Who performed on the recording?
* Who produced it?
* Who financed the recording?
* Who owns the master?
* Is a label involved?
* Was anyone hired under a written agreement?
* Does a producer receive points or income participation?
* Is the artist under an exclusive recording agreement?
* Is the master pledged, assigned, or subject to recoupment?
* Does the recording have an ISRC?
* Has it been submitted to SoundExchange?

## 8.3 Samples and derivative content

* Does the track contain a sample?
* Does it contain an interpolation?
* Does it use a leased beat?
* Was a sample pack used?
* Was the source royalty-free or subject to conditions?
* Is there written clearance?
* Are there territorial or platform restrictions?
* Is the recording a remix?
* Does it contain an existing master?
* Is it derived from another Tourify asset?

## 8.4 AI-assisted content

Tourify should ask:

* Was generative AI used?
* Which elements were generated?
* Which elements were created or substantially modified by humans?
* Was a human voice or likeness synthetically replicated?
* What tool and terms applied?
* Are training, output, or commercial-use restrictions known?

The Copyright Office has stated that copyright protection for AI-assisted output depends on sufficient human-authored expression and not merely prompting. ([U.S. Copyright Office][16])

The passport should preserve these disclosures for registration and licensing use later.

---

# 9. Electronic agreement and signature system

## 9.1 Agreement generation

Once the parties and claims are resolved, Tourify generates a human-readable agreement that includes:

* Asset title and Tourify ID.
* Composition and recording IDs.
* Parties and legal names.
* Roles and contributions.
* Rights categories.
* Ownership or administration shares.
* Territory and term.
* Income-participation terms.
* Sample or derivative disclosures.
* Representations and warranties.
* Amendment procedure.
* Governing law and dispute provisions.
* Document version.
* Manifest hash.

## 9.2 Signing requirements

Before signing, a contributor must:

1. Reauthenticate.
2. Confirm legal name.
3. Confirm authority to sign.
4. Consent to electronic records and signatures.
5. View the complete agreement.
6. Confirm the specific claims being accepted.
7. Sign using typed name, drawn signature, or integrated signature provider.
8. Receive a downloadable copy.

## 9.3 Signature evidence

Store an immutable signature event containing:

```text
signature_event_id
user_id
party_id
agreement_id
agreement_version
document_sha256
passport_draft_hash
signer_name
signer_authority
authentication_method
consent_text_version
signed_at
ip_address
user_agent
device/session identifier
signature_provider_reference
```

Any change to a signed material term should:

* Create a new agreement version.
* Mark the old agreement as superseded, not deleted.
* Invalidate affected approvals.
* Require affected parties to sign again.

## 9.4 Optional wallet signatures

Wallet signatures should be optional in Phase 1.

Where used, structure them with EIP-712 so the signer can see typed data rather than an opaque byte string. EIP-712 does not itself provide replay protection, so the payload must include a unique nonce, expiration, domain, chain ID, and intended verifying contract. ([Ethereum Improvement Proposals][17])

Future smart-account signatures should support ERC-1271 validation. ([Ethereum Improvement Proposals][18])

---

# 10. Rights Passport creation

## 10.1 Private passport manifest

The full private manifest should contain:

* All assets and file hashes.
* All parties.
* Private rights shares.
* Agreements.
* Evidence references.
* Signature-event hashes.
* Registration records.
* Verification checks.
* Dispute status.
* Schema version.
* Random manifest nonce.
* Previous passport-version hash.

## 10.2 Public passport manifest

The public version should contain only authorized information:

* Artist and title.
* Recording and composition relationship.
* ISRC and ISWC, where available.
* Public credits.
* Verification level.
* Issue date and version.
* Registration status without private documents.
* Passport hash.
* Current status.
* Blockchain anchor.
* Tourify issuer signature.
* Clear legal disclaimer.

No email addresses, addresses, signatures, contracts, tax information, identification documents, or private percentages should be placed on-chain.

## 10.3 Version chain

Every passport version should point to the prior version:

```text
Passport V1
  previous_version: null

Passport V2
  previous_version_hash: hash(V1)

Passport V3
  previous_version_hash: hash(V2)
```

This creates a complete amendment history without pretending that the initial information can never be corrected.

## 10.4 Portable credential

Tourify should issue the passport in a W3C Verifiable Credential-compatible envelope.

The W3C Verifiable Credentials model provides a standard structure for an issuer to make tamper-evident claims that a holder can present to a verifier. ([W3C][19])

The credential should represent claims such as:

> Tourify confirms that these identified parties supplied and approved this version of the listed information.

It should not state:

> Tourify has legally determined that these parties own the copyright.

Use a credential status mechanism so a credential can be suspended or revoked after fraud, dispute, or supersession. The W3C Bitstring Status List standard supports status purposes such as suspension and revocation. ([W3C][20])

---

# 11. Smart-contract architecture

## 11.1 Contract purpose

The Phase 1 smart contract should be a minimal **attestation registry**, not an NFT or royalty contract.

Suggested name:

```text
TourifyRightsRegistryV1
```

## 11.2 Information stored on-chain

Store only:

```text
passport_id
passport_version
public_manifest_hash
private_manifest_commitment
credential_hash
schema_version
issuer_address
issued_timestamp
status
superseded_by_version
reason_hash
```

Do not store:

* Audio.
* Lyrics.
* Legal names unless already public.
* Private percentages.
* Agreements.
* Personal data.
* Contact information.
* Government identifiers.
* Direct private-document URLs.

## 11.3 Contract functions

```solidity
anchorPassport(...)
supersedePassport(...)
suspendPassport(...)
reactivatePassport(...)
registerIssuer(...)
revokeIssuer(...)
getPassportStatus(...)
getLatestVersion(...)
```

## 11.4 Contract events

```solidity
PassportAnchored
PassportSuperseded
PassportSuspended
PassportReactivated
IssuerRegistered
IssuerRevoked
```

## 11.5 Permissions

Use role-based access controls for:

* Registry administration.
* Passport issuance.
* Suspension.
* Emergency pause.

Access control is one of the most important smart-contract security boundaries. ([OpenZeppelin Docs][21])

Critical administrative actions should require a multisignature account rather than a single employee wallet.

## 11.6 Upgrade strategy

Keep the first contract extremely small.

A safer Phase 1 approach is:

* Deploy an immutable V1 registry.
* Include a schema version in every anchor.
* Deploy a new registry contract for major changes.
* Keep a Tourify registry directory identifying current supported versions.
* Never alter historical anchors.

Smart-contract upgrades introduce additional complexity and trust assumptions. Ethereum security guidance recommends minimizing on-chain computation and recognizes that upgrades require careful authorization and testing. ([ethereum.org][22])

## 11.7 Chain selection process

Do not hard-code the entire Tourify application to one chain.

Create a formal architecture decision record comparing:

* EVM compatibility.
* Transaction costs.
* Finality.
* Uptime.
* Explorer and indexing quality.
* Multisig support.
* Contract-verification support.
* Ecosystem longevity.
* Data availability.
* Privacy implications.
* Ability to migrate.
* Legal and vendor risks.

The database should support multiple anchors per passport and include:

```text
chain_namespace
chain_id
contract_address
transaction_hash
block_number
confirmation_status
confirmed_at
```

## 11.8 Anchor worker

Blockchain writes should never happen directly inside the user’s page request.

Use an asynchronous outbox:

1. Passport is issued in Postgres.
2. An `anchor.requested` event is created.
3. Worker reads the event.
4. Worker sends the transaction.
5. Transaction is monitored.
6. Confirmation is saved.
7. User is notified.
8. Failed writes retry idempotently.
9. The passport remains valid as an off-chain signed credential while the anchor is pending.

---

# 12. Tourify user experience

## 12.1 Artist navigation

Add a new Artist Dashboard section:

```text
Music & Rights
├── Catalog
├── Upload Music
├── Rights Passports
├── Contributors
├── Agreements
├── Registrations
├── Claims & Disputes
└── Rights Settings
```

## 12.2 Catalog page

Display:

* Artwork.
* Track title.
* Release.
* ISRC.
* Composition status.
* Master status.
* Contributor completion.
* Verification level.
* Passport version.
* Dispute warnings.
* Registration status.
* Last updated.

## 12.3 Track workspace

Tabs:

```text
Overview
Audio & Versions
Composition
Master Rights
Credits
Splits & Claims
Agreements
Registrations
Passport
History
```

## 12.4 Completion checklist

The interface should show a progress checklist:

```text
✓ Master uploaded
✓ Composition created
✓ Recording linked to composition
✓ Writers entered
✓ Performers and producers entered
✓ Master owner declared
! Two contributor invitations pending
! Sample disclosure incomplete
○ Agreement not generated
○ Passport not issued
```

## 12.5 Contributor portal

Contributors should see only the project data necessary to review their participation, plus the complete split summary where required for informed approval.

They should not automatically receive:

* Private contact details.
* Identity documents.
* Unrelated contracts.
* Tax information.
* Internal Tourify review notes.

## 12.6 Public verification page

Suggested route:

```text
/rights/passport/[public-id]
```

Display:

* Current passport status.
* Artist and release.
* Composition and recording identifiers.
* Public credits.
* Verification level.
* Issue and update dates.
* Blockchain confirmation.
* Tourify credential verification.
* Superseded-version history.
* Disclaimer explaining what the passport proves.

Include a QR code that points to this page, but do not make the QR code itself the authoritative record.

---

# 13. Special-case workflows

## 13.1 Cover recording

The system should:

* Create a new sound recording.
* Link it to the preexisting musical work.
* Record the original writers and work identifier.
* Prevent the artist from claiming composition ownership without evidence.
* Capture mechanical-licensing status.

## 13.2 Remix

Capture:

* Original sound recording.
* Original composition.
* Remix creator.
* Master-use authorization.
* Derivative-work authorization.
* New ISRC where applicable.
* New master ownership.
* Continuing rights in the source recording.

## 13.3 Sample or interpolation

Require:

* Source title.
* Source recording.
* Source composition.
* Rights owners or administrators.
* Clearance status.
* Agreement.
* Share or fee information.
* Territory and term.
* Restrictions.

Uncleared content should not receive the highest verification level.

## 13.4 Leased beat

Separate:

* Beat creator credit.
* Composition share.
* Master rights.
* License type.
* Usage limits.
* Streaming or sales caps.
* Exclusivity.
* Upgrade rights.
* Content ID restrictions.

## 13.5 Producer points

Producer points must be recorded as an income participation unless the agreement also grants master ownership.

Store:

* Percentage.
* Gross or net basis.
* Permitted deductions.
* Recoupment position.
* Revenue categories.
* Payment term.
* Audit rights.
* Territory.
* Duration.

## 13.6 Minor contributor

Require:

* Minor status declaration.
* Guardian identity.
* Guardian authority.
* Guardian approval.
* Additional counsel review for transfers or long-term grants.

Avoid exposing birth dates in the public passport.

## 13.7 Work made for hire

Require a written agreement and a specific declaration rather than a checkbox that automatically decides legal status. Whether a commissioned work qualifies as a work made for hire can involve requirements beyond merely labeling it that way. ([U.S. Copyright Office][23])

---

# 14. Disputes, corrections, and suspension

## 14.1 Dispute initiation

A named party can dispute:

* Identity.
* Credit.
* Role.
* Composition share.
* Master ownership.
* Administrative authority.
* Sample clearance.
* Signature validity.
* Public display.
* External identifier.
* Organization authority.

## 14.2 Dispute effect

Depending on severity:

* Mark the relevant claim disputed.
* Prevent new passport issuance.
* Suspend the public verification badge.
* Place an alert on the public passport.
* Preserve all previous records.
* Freeze later tokenization or royalty activation.

## 14.3 Resolution methods

A dispute can be resolved by:

* Unanimous amendment.
* Replacement agreement.
* Rights-administrator confirmation.
* Registry correction.
* Court or arbitration order.
* Withdrawal of a claim.
* Tourify administrative correction that does not alter substantive ownership.

## 14.4 Correction principles

Tourify must never delete history to make a dispute disappear.

Use:

* Append-only events.
* Superseded records.
* Reason codes.
* Evidence references.
* New signatures.
* New passport versions.

---

# 15. Security and privacy

## 15.1 Authorization

Use Supabase RLS on every new rights table. Supabase describes RLS as a Postgres defense-in-depth mechanism that can operate with authenticated user identity. ([Supabase][24])

Test policies for:

* Artist owners.
* Artist team members.
* Invited contributors.
* Authorized representatives.
* Rights Operations.
* Legal administrators.
* Public viewers.
* Background workers.

Never expose the Supabase service-role key to browser code.

## 15.2 Data classification

### Public

* Public credits.
* Public identifiers.
* Passport status.
* Public artwork.
* Public verification level.

### Confidential

* Splits.
* Agreements.
* Registration evidence.
* Internal review notes.
* Contact information.

### Highly restricted

* Identity documents.
* Government identifiers.
* Signatures.
* Tax information.
* Legal notices.
* Minor information.

## 15.3 Encryption and key management

* Encrypt storage and database backups.
* Keep issuer signing keys in a managed key system.
* Separate credential-signing keys from blockchain transaction keys.
* Use a multisig for contract administration.
* Rotate keys under a documented procedure.
* Publish current and retired public verification keys.
* Record every key rotation.
* Maintain an emergency compromise procedure.

## 15.4 Audit logging

Log:

* Uploads and downloads.
* Metadata edits.
* Invitations.
* Rights proposals.
* Acceptances and rejections.
* Signatures.
* Admin access.
* Document views.
* Passport issuance.
* Blockchain anchoring.
* Suspensions.
* Dispute actions.
* Exports.

Audit logs should be append-only and stored separately from ordinary editable product records.

## 15.5 Secure development process

Use NIST SSDF and OWASP ASVS as security baselines for:

* Threat modeling.
* Dependency controls.
* Code review.
* Secret management.
* Build protection.
* Authentication testing.
* Authorization testing.
* Upload testing.
* API testing.
* Incident response.
* Release verification.

NIST SSDF is intended to integrate secure development practices into the software lifecycle, while OWASP ASVS provides a basis for testing web-application security controls. ([NIST Computer Security Resource Center][25])

---

# 16. API and event architecture

## 16.1 Versioned APIs

Suggested routes:

```text
POST   /api/v1/rights/projects
POST   /api/v1/rights/projects/:id/uploads
POST   /api/v1/rights/projects/:id/works
POST   /api/v1/rights/projects/:id/recordings
POST   /api/v1/rights/projects/:id/contributors
POST   /api/v1/rights/claims
PATCH  /api/v1/rights/claims/:id
POST   /api/v1/rights/agreements/generate
POST   /api/v1/rights/signatures
POST   /api/v1/rights/passports/issue
GET    /api/v1/rights/passports/:id
GET    /api/v1/rights/passports/:id/verify
POST   /api/v1/rights/disputes
POST   /api/v1/rights/exports/ddex
```

Every mutation should require:

* Authorization.
* Input schema validation.
* Idempotency key.
* Audit event.
* Domain validation.
* Version check to prevent overwriting another user’s changes.

## 16.2 Domain events

Publish events including:

```text
music.project.created
music.asset.uploaded
music.asset.processed
music.asset.duplicate_detected
rights.party.invited
rights.contribution.confirmed
rights.claim.proposed
rights.claim.accepted
rights.claim.disputed
rights.agreement.generated
rights.agreement.signed
rights.passport.issued
rights.passport.superseded
rights.passport.suspended
rights.anchor.requested
rights.anchor.confirmed
```

Future systems should consume these events rather than reading undocumented tables directly.

Phase 2 royalty accounting can later subscribe to `rights.passport.issued`, while valuation can subscribe to verified catalog and revenue events.

---

# 17. Non-destructive Tourify integration strategy

## 17.1 Initial audit

Before creating migrations, the development team should inventory:

* Existing music-upload tables.
* Existing audio-storage buckets.
* Artist-account ownership logic.
* Organization and team permissions.
* Existing document-signature components.
* Notification infrastructure.
* Activity feeds.
* Audit logging.
* Existing blockchain or wallet code.
* Existing media-processing jobs.
* Current RLS policies.
* Existing identifiers and metadata.

## 17.2 Isolation

Build Phase 1 behind:

* A dedicated database schema.
* New private storage buckets.
* Versioned API routes.
* Feature flags.
* Dedicated components.
* Dedicated worker queues.

## 17.3 Legacy adapter

Existing Tourify uploads should not automatically become verified assets.

Create a migration assistant that:

1. Finds an existing upload.
2. Creates a draft rights project.
3. References the legacy asset.
4. Runs hashing and fingerprinting.
5. Requires the artist to complete missing rights information.
6. Issues no passport until the new workflow is complete.

## 17.4 Rollback

Every migration must include:

* Forward migration.
* Rollback or compensating procedure.
* Data validation query.
* RLS tests.
* Backfill status.
* Feature-flag control.

The current Tourify music experience should remain available if the Rights Passport feature is disabled.

---

# 18. Implementation schedule

A capable product team should expect approximately **16–20 weeks** for a production-quality Phase 1 beta. Legal review, security review, and pilot feedback may extend the schedule.

## Stage 0 — Discovery and legal architecture

**Weeks 1–2**

Deliverables:

* Current Tourify system audit.
* Rights terminology dictionary.
* Legal-document requirements.
* DDEX standards mapping.
* Threat model.
* Data classification.
* Architecture decision records.
* Phase 1 boundaries.
* Pilot-artist criteria.

Exit gate:

* Product, engineering, security, music-rights counsel, and operations approve the domain model.

## Stage 1 — Data and permissions foundation

**Weeks 3–4**

Deliverables:

* New `music_rights` schema.
* Asset hierarchy.
* Party and contribution model.
* Rights-claim model.
* Audit-event system.
* RLS policies.
* Feature flags.
* API skeleton.
* Seeded rights and role vocabularies.

Exit gate:

* No unauthorized cross-account data access in automated RLS tests.

## Stage 2 — Upload and fingerprint pipeline

**Weeks 5–6**

Deliverables:

* Private upload buckets.
* Signed upload sessions.
* Media-processing worker.
* SHA-256 hashing.
* Technical audio extraction.
* Acoustic fingerprinting.
* Duplicate alerts.
* File versioning.
* Quarantine and validation.

Exit gate:

* Original file can be uploaded, processed, rehashed, and independently verified.

## Stage 3 — Works, recordings, credits, and identifiers

**Weeks 7–8**

Deliverables:

* Composition workflow.
* Sound-recording workflow.
* Release relationships.
* Contributor roles.
* ISRC, ISWC, IPI, ISNI, IPN, UPC, and PRO fields.
* DDEX-aligned role vocabulary.
* Cover, remix, sample, and AI disclosures.

Exit gate:

* A recording can be linked correctly to one or more musical works without conflating rights.

## Stage 4 — Claims and contributor collaboration

**Weeks 9–10**

Deliverables:

* Contributor invitations.
* Claim proposals.
* Share validation.
* Unknown-share support.
* Counterproposals.
* Notifications.
* Conflict detection.
* Permission-limited contributor portal.

Exit gate:

* Multiple contributors can negotiate and approve one consistent rights configuration.

## Stage 5 — Agreements and electronic signatures

**Weeks 11–12**

Deliverables:

* Template engine.
* Agreement generation.
* Electronic-signature consent.
* Reauthentication.
* Signature evidence.
* Downloadable signed documents.
* Amendment and supersession.
* Organization-authority workflow.

Exit gate:

* A signed agreement can be reproduced exactly and tied to the approved claims and manifest.

## Stage 6 — Passport and credential issuance

**Weeks 13–14**

Deliverables:

* Canonical manifests.
* Public and private passport versions.
* Manifest hashing.
* Credential signing.
* Public verification endpoint.
* QR link.
* Version history.
* Suspension and revocation.

Exit gate:

* An independent verifier can validate the Tourify signature and current passport status.

## Stage 7 — Blockchain anchoring

**Weeks 15–16**

Deliverables:

* Chain decision record.
* Registry contract.
* Contract tests.
* Multisig controls.
* Testnet deployment.
* Anchor outbox worker.
* Transaction monitor.
* Explorer links.
* Failure retries.
* Contract source verification.

Exit gate:

* Passport hashes can be anchored and independently matched without exposing private information.

## Stage 8 — Rights Operations and disputes

**Weeks 17–18**

Deliverables:

* Review queue.
* Duplicate-claim alerts.
* Dispute intake.
* Evidence upload.
* Badge suspension.
* Resolution workflow.
* Legal-notice handling.
* Operations audit trail.

Exit gate:

* A disputed passport can be safely suspended, corrected, superseded, and reissued.

## Stage 9 — Pilot and production hardening

**Weeks 19–20**

Deliverables:

* Pilot catalog migration.
* Security review.
* Accessibility review.
* Performance testing.
* Backup and restore test.
* Legal-language review.
* User documentation.
* Operations manual.
* Incident runbook.
* Production launch checklist.

---

# 19. Required team

A realistic Phase 1 team should include:

* Product lead.
* Music-rights domain specialist.
* Music and technology attorney.
* Product designer.
* Frontend engineer.
* Backend or Supabase engineer.
* Media-processing engineer.
* Smart-contract engineer.
* Security or DevOps engineer.
* QA automation engineer.
* Rights Operations reviewer.
* Technical writer or user-education owner.

The smart-contract developer may be part-time until the anchoring stage. Counsel and the rights specialist must participate from the beginning.

---

# 20. Testing strategy

## 20.1 Unit tests

Test:

* Percentage normalization.
* Territory overlaps.
* Validity-period overlaps.
* Claim-total validation.
* Manifest canonicalization.
* Hash generation.
* Passport version chaining.
* Signature invalidation after amendment.
* Status transitions.
* Permission decisions.

## 20.2 Integration tests

Test:

* Upload through permanent storage.
* Contributor invitation through approval.
* Agreement generation through signature.
* Passport issuance through blockchain confirmation.
* Dispute through suspension and reissue.
* Export of a DDEX-aligned record.

## 20.3 Security tests

Test:

* Cross-artist data access.
* Contributor privilege escalation.
* Signed-URL expiration.
* Malicious document upload.
* Oversized and malformed audio.
* ZIP bomb protection.
* API replay.
* Signature replay.
* Admin-role misuse.
* Contract access control.
* Compromised anchor-worker credentials.

## 20.4 Smart-contract tests

Include:

* Unauthorized issuer attempts.
* Duplicate anchors.
* Incorrect version ordering.
* Invalid status transitions.
* Pausing.
* Multisig ownership.
* Event accuracy.
* Fuzz tests.
* Gas bounds.
* Chain-reorganization handling.
* Transaction retry idempotency.

## 20.5 Legal workflow tests

Use scenario-based testing:

* Solo artist owning composition and master.
* Two writers with equal shares.
* Writer with publisher.
* Producer with points but no ownership.
* Label-owned master.
* Cover recording.
* Sampled track awaiting clearance.
* Minor performer.
* Disputed writer.
* Organization representative.
* AI-assisted composition.
* Remixed recording.
* Existing copyright registration.
* Missing ISWC or ISRC.

---

# 21. Pilot program

Start with approximately:

* 10–20 artists.
* 50–100 recordings.
* Solo and collaborative works.
* At least two publisher-administered works.
* At least two label-owned masters.
* One cover.
* One remix.
* One sampled work.
* One genuine split dispute.
* One legacy Tourify upload migration.

Pilot participants should agree that the product is testing documentation and workflow, not providing legal representation.

## Pilot metrics

Measure:

* Time to create a draft.
* Time to complete contributor approvals.
* Percentage of projects with missing contributors.
* Percentage with split conflicts.
* Agreement completion rate.
* Passport issuance rate.
* Metadata completeness.
* External identifier match rate.
* Number of support interventions.
* Dispute rate.
* Anchor success rate.
* User understanding of what the passport does and does not prove.

---

# 22. Major risks and controls

## False ownership claims

**Control:** contributor confirmation, evidence requirements, public status language, duplicate alerts, suspension, and dispute workflow.

## Conflation of credits and ownership

**Control:** separate contribution and rights-claim tables.

## Conflation of composition and master rights

**Control:** separate asset and agreement workflows.

## Incorrect split calculations

**Control:** rights scopes, percentage bases, territories, validity periods, and source-scale preservation.

## Permanent publication of incorrect information

**Control:** store only commitments on-chain; preserve correction and supersession mechanisms.

## Sensitive data exposure

**Control:** private buckets, RLS, data classification, short-lived signed URLs, and no PII on-chain.

## Lost blockchain keys

**Control:** multisig, managed keys, role separation, rotation, and emergency issuer revocation.

## Smart-contract vulnerability

**Control:** minimal contract, established libraries, automated testing, independent review, and delayed mainnet deployment.

## User confusion

**Control:** plain-language disclosures and clearly labeled verification levels.

## Future regulatory contamination

**Control:** keep the Rights Passport separate from future tokens, financing, royalty payouts, and marketplaces.

---

# 23. Phase 1 definition of done

Phase 1 is complete only when:

1. Composition and sound-recording records are separate.
2. Recordings can link to their underlying works.
3. Original files are privately stored and versioned.
4. Every file has a reproducible SHA-256 hash.
5. Audio has a similarity fingerprint.
6. Contributors can be invited without already having Tourify accounts.
7. Credits and rights claims are distinct.
8. Rights claims support territory and time.
9. Unknown and disputed shares are supported.
10. Agreements are linked to the precise claims they govern.
11. Electronic-signature evidence is reproducible.
12. Material amendments require new approvals.
13. Passport manifests are deterministic and versioned.
14. Tourify cryptographically signs each issued passport.
15. Public and private passport views are separate.
16. No personal or confidential information is placed on-chain.
17. The registry contract has tested role controls.
18. Anchoring is asynchronous and retryable.
19. Previous passport versions remain verifiable.
20. Passports can be suspended, superseded, and reissued.
21. RLS tests prevent cross-account access.
22. Disputes can be documented and resolved.
23. Existing Tourify uploads are not destructively modified.
24. DDEX-aligned exports can be generated or validated from the internal model.
25. Legal counsel approves the agreements, disclosures, and public claims.
26. Security review finds no critical unresolved issue.
27. Backup and restoration are successfully tested.
28. Pilot artists complete end-to-end issuance.
29. Rights Operations has a documented manual.
30. Phase 2 can consume issued-passport events without redesigning Phase 1.

The central architectural principle is:

> **The legal agreements establish the parties’ rights. Tourify records, verifies, versions, and communicates the evidence. The blockchain anchors the integrity and history of that evidence.**

[1]: https://www.copyright.gov/what-is-copyright/?utm_source=chatgpt.com "What is Copyright? | U.S. Copyright Office"
[2]: https://www.law.cornell.edu/uscode/text/17/204?utm_source=chatgpt.com "17 U.S. Code § 204 - Execution of transfers of copyright ..."
[3]: https://www.law.cornell.edu/uscode/text/15/7001?utm_source=chatgpt.com "15 U.S. Code § 7001 - General rule of validity - Law.Cornell.Edu"
[4]: https://isrc.ifpi.org/?utm_source=chatgpt.com "ISRC - IFPI"
[5]: https://www.iswc.org/home?utm_source=chatgpt.com "ISWC: Home"
[6]: https://blog.themlc.com/resources/know-your-identifiers?utm_source=chatgpt.com "Know Your Identifiers"
[7]: https://kb.ddex.net/implementing-each-standard/recording-information-notification-%28rin%29/rin-explained/purpose-of-rin?utm_source=chatgpt.com "Purpose of RIN"
[8]: https://kb.ddex.net/general-implementation-guidance/licensing-the-standards/?utm_source=chatgpt.com "Licensing the standards"
[9]: https://www.ascap.com/help/registering-your-music/Splitsville?utm_source=chatgpt.com "What Co-Writers Need to Know About Songwriting Splits"
[10]: https://kb.ddex.net/implementing-each-standard/musical-work-data-and-rights-communication-%28mwdr%29/musical-work-right-share-notification-standard-%28mwn%29/mwn-samples/mwn-response-providing-a-claim?utm_source=chatgpt.com "MWN Response Providing a Claim"
[11]: https://supabase.com/docs/guides/storage/security/access-control?utm_source=chatgpt.com "Storage Access Control | Supabase Docs"
[12]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html?utm_source=chatgpt.com "File Upload - OWASP Cheat Sheet Series"
[13]: https://csrc.nist.gov/pubs/fips/180-4/upd1/final?utm_source=chatgpt.com "FIPS 180-4, Secure Hash Standard (SHS) - NIST CSRC"
[14]: https://acoustid.org/chromaprint?utm_source=chatgpt.com "Chromaprint"
[15]: https://www.rfc-editor.org/info/rfc8785/?utm_source=chatgpt.com "RFC 8785: JSON Canonicalization Scheme (JCS)"
[16]: https://www.copyright.gov/newsnet/2025/1060.html?utm_source=chatgpt.com "NewsNet Issue 1060 | U.S. Copyright Office"
[17]: https://eips.ethereum.org/EIPS/eip-712?utm_source=chatgpt.com "EIP-712: Typed structured data hashing and signing"
[18]: https://eips.ethereum.org/EIPS/eip-1271?utm_source=chatgpt.com "ERC-1271: Standard Signature Validation Method for ..."
[19]: https://www.w3.org/TR/vc-data-model-2.0/?utm_source=chatgpt.com "Verifiable Credentials Data Model v2.0"
[20]: https://www.w3.org/TR/vc-bitstring-status-list/?utm_source=chatgpt.com "Bitstring Status List v1.0"
[21]: https://docs.openzeppelin.com/contracts/5.x/access-control?utm_source=chatgpt.com "Access Control"
[22]: https://ethereum.org/developers/docs/smart-contracts/security/?utm_source=chatgpt.com "Smart contract security"
[23]: https://www.copyright.gov/docs/regstat52500.html?utm_source=chatgpt.com "Sound Recordings as Works Made for Hire"
[24]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
[25]: https://csrc.nist.gov/projects/ssdf?utm_source=chatgpt.com "Secure Software Development Framework | CSRC"
