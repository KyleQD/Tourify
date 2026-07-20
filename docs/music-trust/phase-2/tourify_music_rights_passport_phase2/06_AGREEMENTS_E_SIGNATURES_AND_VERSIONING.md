# Agreements, Electronic Signatures, and Versioning

## Legal boundary

A Tourify smart contract or database record does not replace the underlying human-readable agreement. Copyright transfers generally require a signed writing. Electronic records and signatures can have legal effect, but counsel must approve the specific templates and consent process.

## Template registry

Every template has:

- stable template ID;
- semantic version;
- jurisdiction/territory applicability;
- document purpose;
- required fields;
- required signers;
- counsel approval status;
- effective and retired dates;
- hash of the source template.

Initial templates may include:

- contributor participation;
- electronic split sheet;
- composition ownership declaration;
- master ownership declaration;
- producer-points addendum;
- publisher/administrator declaration;
- label authority declaration;
- sample/interpolation disclosure;
- cover/derivative disclosure;
- work-made-for-hire evidence form;
- AI-assistance disclosure;
- minor/guardian consent;
- public-display authorization;
- amendment;
- dispute settlement.

## Agreement version

Freeze:

- rendered document;
- structured claim snapshot;
- party snapshot;
- applicable template version;
- governing law and dispute provisions;
- manifest hash;
- document SHA-256;
- creation timestamp.

## Signing ceremony

1. Reauthenticate.
2. Confirm identity and authority.
3. Provide electronic-record consent.
4. Present the full document.
5. Present a concise summary that does not replace the document.
6. Confirm affected claims.
7. Capture signature.
8. seal the document and evidence record;
9. provide each signer a downloadable copy;
10. emit an append-only signature event.

## Signature evidence

Store:

- agreement and version;
- signer party and user;
- signer authority;
- authentication method;
- consent-text version;
- document hash;
- claims snapshot hash;
- signed timestamp;
- IP and user agent in a restricted audit store;
- provider reference when using an external e-sign vendor;
- revocation or invalidation reason.

## Amendments

A material amendment must:

- create a new agreement version;
- preserve the prior version;
- identify changed terms;
- invalidate affected approvals;
- require affected parties to sign again;
- supersede derived claims and passport versions.

No admin may silently edit a signed document.

## Build-versus-partner decision

Codex should create an ADR comparing:

- internal typed/drawn signing;
- established e-sign provider;
- hybrid approach.

Criteria:

- evidence quality;
- signer experience;
- API/webhook reliability;
- document retention;
- international support;
- cost;
- data processing terms;
- reauthentication;
- audit export;
- legal review.


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
