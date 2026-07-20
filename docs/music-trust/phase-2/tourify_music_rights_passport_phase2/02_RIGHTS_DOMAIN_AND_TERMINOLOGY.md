# Rights Domain and Terminology

## Core entities

### `artist_music`

The canonical Tourify playable track and upload row. It remains the source for playback, access, social, commerce, and artist-facing catalog references.

### Sound recording

A particular recorded performance. One sound recording may appear on multiple releases. It may have an ISRC, but ISRC identifies the recording rather than its current owner.

### Musical work

The underlying composition and lyrics. It may have an ISWC and writer/publisher identifiers.

### Release

A commercial grouping such as a single, EP, album, or mixtape. Phase 2 should create release entities only when the existing `artist_music.type` and metadata cannot represent the rights/distribution relationship. Do not create a second playable catalog.

### Party

A person or organization participating in creation, ownership, administration, licensing, review, or representation.

### Contribution

A factual creative or technical role, such as writer, vocalist, producer, instrumentalist, mixer, or mastering engineer. A contribution does not automatically create ownership.

### Rights claim

A party's asserted ownership, administration, collection, license, approval, or income-participation interest in a defined subject, right category, territory, and time period.

### Agreement

The human-readable document governing claims, authorizations, obligations, or signatures. The smart contract or manifest references its hash; it does not replace it.

## Required separation

- composition and sound recording;
- credit and ownership;
- ownership and administration;
- ownership and income participation;
- release and recording;
- public identity and legal identity;
- account membership and signing authority;
- original master and protected derivative;
- external identifier and proof of ownership;
- artist statement and Tourify review conclusion.

## Rights categories

At minimum:

- composition ownership;
- master ownership;
- mechanical;
- public performance;
- synchronization;
- reproduction;
- distribution;
- digital performance;
- neighboring rights;
- administration;
- collection;
- approval rights;
- direct sales;
- license-specific participation.

## Territory and validity

Every substantive claim must support:

- worldwide or explicit ISO territory sets;
- effective date;
- expiration date or perpetual flag;
- exclusivity;
- source agreement;
- current status;
- supersession link.

## Percentage representation

Use exact numerator and denominator or a fixed-precision numeric representation suitable for deterministic validation. Preserve:

- original entered percentage;
- original scale;
- normalized share;
- unknown flag;
- disputed flag.

Do not use floating-point arithmetic for rights totals.

## Identifier policy

Store identifiers as versioned attributes with source and verification state:

- ISRC for sound recordings;
- ISWC for musical works;
- IPI/CAE for writers and publishers;
- ISNI for people and organizations;
- IPN for performers where available;
- UPC/EAN/GRid for releases;
- PRO/CMO membership;
- MLC song code;
- SoundExchange or distributor repertoire identifiers;
- Tourify stable internal IDs.

External identifiers are never primary database keys and never independently prove rights.


## Primary references

- DDEX standards and current specifications: https://kb.ddex.net/reference-material/standards-specifications/
- DDEX standards overview: https://ddex.net/standards/
- C2PA Technical Specification 2.4: https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html
- W3C Verifiable Credentials Data Model 2.0: https://www.w3.org/TR/vc-data-model/
- W3C Bitstring Status List 1.0: https://www.w3.org/TR/vc-bitstring-status-list/
- U.S. Copyright Office AI initiative and reports: https://www.copyright.gov/ai/
- 17 U.S.C. § 204, signed writing for copyright transfers: https://www.law.cornell.edu/uscode/text/17/204
- 15 U.S.C. § 7001, electronic records and signatures: https://www.law.cornell.edu/uscode/text/15/7001
- IFPI ISRC guidance: https://isrc.ifpi.org/
- ISWC official service: https://www.iswc.org/iswc
- OpenZeppelin Contracts access control: https://docs.openzeppelin.com/contracts/5.x/access-control
