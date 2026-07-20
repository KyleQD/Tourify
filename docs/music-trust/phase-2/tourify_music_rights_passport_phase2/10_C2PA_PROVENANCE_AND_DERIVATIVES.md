# C2PA Provenance and Protected Derivatives

## Objective

Bind Tourify-issued provenance to public derivatives without modifying the archival master.

## File separation

```text
archival clean master
└── immutable/private
    ├── streaming derivative
    ├── downloadable derivative
    ├── promotional derivative
    └── licensing delivery derivative
```

Every derivative points back to the source asset and processing recipe.

## C2PA manifest assertions

Evaluate inclusion of:

- Tourify public passport ID;
- artist public identity;
- recording identifier;
- source asset commitment;
- origin/certification status;
- AI-use disclosure category;
- issuer;
- creation and processing actions;
- derivative type;
- rights-reservation URL;
- public verification URL;
- C2PA specification version.

## Supported formats

C2PA 2.4 includes audio-container support, including WAV/RIFF and ID3-compatible audio, and added OGG Vorbis support. Codex must verify actual SDK/tooling support before committing to a production format matrix.

## Processing pipeline

1. Load source only in a trusted worker.
2. Create derivative using pinned tools.
3. apply optional watermark;
4. calculate hash;
5. generate C2PA assertions;
6. sign manifest using managed key;
7. validate embedded/sidecar credential;
8. transcode round-trip test;
9. store derivative privately;
10. expose through existing stream/download access controls.

## Failure behavior

A C2PA failure must not corrupt or replace the clean master. The derivative remains unpublished or falls back to an explicitly uncredentialed state based on feature policy.

## Key management

Separate:

- C2PA signing key;
- VC issuer key;
- blockchain transaction key;
- contract admin multisig.

Each key requires rotation and compromise procedures.

## Verification UI

Show:

- valid signature;
- unsupported;
- manifest missing;
- modified after signing;
- issuer unknown;
- revoked/suspended passport.

Do not display “fake” solely because a manifest is missing.


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
