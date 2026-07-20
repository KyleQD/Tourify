# Current Standards and Legal Research Notes

Status checked: **July 17, 2026**.

This file records current external baselines. Codex must re-check them during implementation because standards, SDKs, laws, and service capabilities can change.

## DDEX

Use the current formal specifications listed by DDEX rather than older setup notes. Phase 2 should map its internal model to:

- Recording Information Notification (RIN) for creation/session/contributor metadata;
- Links between Resources and Musical Works (LRAW) for recording-to-work relationships;
- Musical Work Right Share Notification (MWN) for rights claims;
- Bulk Communication of Work and Recording Metadata (BWARM) for future bulk exchange.

DDEX currently lists BWARM 2.1 among current specifications and advises first-time implementers to use the latest standard version. Tourify should obtain the DDEX Implementation Licence and DPID before production partner exchange.

Sources:

- https://kb.ddex.net/reference-material/standards-specifications/
- https://kb.ddex.net/about-ddex-standards/ddex-standards/
- https://ddex.net/standards/

## C2PA

The current C2PA specifications index lists version 2.4. The 2.4 technical specification includes audio-container guidance and added OGG Vorbis support. Tourify must still validate the actual SDK/tooling format matrix before promising support for WAV, MP3, FLAC, or OGG.

Sources:

- https://spec.c2pa.org/specifications/
- https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html

## Verifiable Credentials

The W3C Verifiable Credentials 2.0 family became W3C Recommendations in 2025. Phase 2 should evaluate:

- Verifiable Credentials Data Model 2.0;
- a supported securing format/suite;
- Bitstring Status List 1.0 for suspension/revocation.

Sources:

- https://www.w3.org/TR/vc-data-model/
- https://www.w3.org/TR/vc-bitstring-status-list/
- https://www.w3.org/news/2025/the-verifiable-credentials-2-0-family-of-specifications-is-now-a-w3c-recommendation/

## Copyright and AI

The U.S. Copyright Office:

- released Part 2 on copyrightability on January 29, 2025;
- states that generative-AI output is protectable only where a human author determined sufficient expressive elements;
- released a pre-publication Part 3 on generative-AI training on May 9, 2025;
- still identifies the final Part 3 as forthcoming, while stating no substantive changes are expected.

Tourify should therefore treat AI-training law as evolving and avoid claiming that machine-readable reservation or technical protection guarantees a legal outcome.

Source:

- https://www.copyright.gov/ai/

## Agreements and identifiers

- 17 U.S.C. § 204 requires a signed writing for most copyright transfers.
- 15 U.S.C. § 7001 generally prevents denial of legal effect solely because a record or signature is electronic.
- ISRC identifies a sound recording, not its ownership.
- ISWC identifies a musical work regardless of copyright status or royalty agreements.

Sources:

- https://www.law.cornell.edu/uscode/text/17/204
- https://www.law.cornell.edu/uscode/text/15/7001
- https://isrc.ifpi.org/why-use-isrc/ownership
- https://www.iswc.org/cmos

## Smart-contract libraries

OpenZeppelin Contracts 5.x provides current access-control patterns, but Codex must pin the selected package version and review its changelog and compiler requirements before implementation.

Sources:

- https://docs.openzeppelin.com/contracts/5.x/access-control
- https://docs.openzeppelin.com/contracts/5.x/changelog
