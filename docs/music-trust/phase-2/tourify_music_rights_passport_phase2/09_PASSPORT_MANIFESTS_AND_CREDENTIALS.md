# Passport Manifests and Credentials

## Passport structure

A Rights Passport is a versioned package, not one mutable row.

### Private manifest

Contains:

- track and sound-recording identity;
- linked musical works;
- source hashes and fingerprints;
- parties and private identities;
- contributions;
- claims and territories;
- agreement and signature hashes;
- evidence references;
- external identifiers and verification results;
- certification decision;
- dispute state;
- schema version;
- nonce;
- prior-version hash.

### Public manifest

Contains only authorized fields:

- public ID;
- artist and title;
- sound-recording/work relationship;
- public credits;
- selected identifiers;
- verification levels;
- issue and update dates;
- current status;
- certification-standard version;
- public manifest hash;
- credential reference;
- C2PA/anchor status;
- disclaimer.

Never include email, private shares, agreement content, signatures, tax data, IDs, evidence paths, internal review notes, or detector scores.

## Deterministic encoding

Use a canonical JSON procedure before hashing. Record:

- canonicalization version;
- schema version;
- hash algorithm;
- manifest hash;
- source snapshot timestamp.

## Version chain

Each version points to the previous version hash. Status changes and material amendments must not overwrite the prior manifest.

## Credential envelope

Use W3C Verifiable Credentials Data Model 2.0-compatible structure or another standards-based envelope selected through an ADR.

Credential claims should mean:

> Tourify issued this record after the named participants supplied or approved the stated information and Tourify completed the listed review procedure.

They must not mean:

> Tourify has conclusively adjudicated legal ownership.

## Status

Support:

- active;
- suspended;
- revoked;
- superseded.

A status-list mechanism should be privacy preserving and independently verifiable. W3C Bitstring Status List 1.0 is a current Recommendation suitable for evaluation.

## Public verification endpoint

The endpoint should:

- accept only public ID;
- return narrow public manifest;
- show current status;
- verify issuer signature;
- show superseded version history;
- show blockchain/C2PA checks when enabled;
- apply rate limits;
- avoid existence leaks for private drafts.


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
