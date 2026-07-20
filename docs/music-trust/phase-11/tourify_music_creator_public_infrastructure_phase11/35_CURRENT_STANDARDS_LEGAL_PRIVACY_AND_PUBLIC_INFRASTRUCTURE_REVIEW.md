# Current Standards, Legal, Privacy and Public-Infrastructure Review

## Review date

July 17, 2026. Re-verify every source before production implementation.

## Digital public infrastructure safeguards

The United Nations Development Programme describes digital public infrastructure as shared foundational systems that require governance, funding and clear institutional responsibilities in addition to software. The Universal DPI Safeguards Framework was released in September 2024 and updated in 2025. UNDP describes the framework as a rights-based lifecycle approach with principles addressing safety, inclusion and structural vulnerabilities.

- UNDP DPI overview: https://www.undp.org/digital/digital-public-infrastructure
- Universal DPI Safeguards release: https://www.undp.org/press-releases/un-releases-universal-dpi-safeguards-framework-promote-safe-and-inclusive-digital-public-infrastructure
- 2025 safeguards update discussion: https://www.undp.org/digital/blog/how-dpg-standard-and-universal-dpi-safeguards-framework-are-charting-safe-and-inclusive-digital-future
- DPI Approach Playbook: https://www.undp.org/publications/dpi-approach-playbook

Phase 11 should use these materials as governance and risk references, not as certification or UN endorsement of Tourify.

## Digital public goods and open infrastructure

The Digital Public Goods Standard evaluates software, data, AI systems and content against indicators including open licensing, clear ownership, platform independence, documentation, non-PII extraction, privacy, open standards, security and content safeguards.

- DPG Standard: https://www.digitalpublicgoods.net/standard

A future Tourify reference implementation may seek DPG recognition only after its ownership, licensing, documentation, privacy, security and platform-independence requirements are genuinely met. Recognition of software would not make Tourify a government service, identity authority, CMO or rights registry.

## Inclusive identity principles

The World Bank ID4D Principles emphasize inclusion, removal of access barriers, robust and accurate identity, interoperability, open standards, privacy, sustainability, clear mandates, accountability and independent grievance mechanisms.

- ID4D Principles: https://id4d.worldbank.org/guide/1-principles
- ID4D Practitioner Guide: https://id4d.worldbank.org/guide/about-guide

Phase 11 is not a civil identity system. These principles are useful design constraints for optional creator identifiers and credentials, particularly inclusion, user control, vendor neutrality, accountability and remedy.

## Decentralized identifiers

W3C DID Core 1.0 remains a Recommendation. DID 1.1 was published as a Candidate Recommendation Snapshot on March 5, 2026. Candidate status must be shown explicitly when selecting a profile.

- DID Core 1.0 Recommendation: https://www.w3.org/TR/did-core/
- DID 1.1 Candidate Recommendation: https://www.w3.org/TR/did-1.1/
- DID Specification Registries: https://www.w3.org/TR/did-spec-registries/

Phase 11 should not invent a new DID method unless independent review proves that existing methods cannot satisfy the requirements. Method choice must consider persistence, governance, key rotation, privacy, resolution availability, cost, recovery and exit.

## Verifiable credentials and OpenID protocols

W3C published the Verifiable Credentials 2.0 family as Recommendations on May 15, 2025. OpenID for Verifiable Presentations 1.0 and OpenID for Verifiable Credential Issuance 1.0 became Final Specifications in July and September 2025. OpenID Federation 1.1 and its OpenID Connect profile became Final Specifications on May 6, 2026.

- VC 2.0 family: https://www.w3.org/news/2025/the-verifiable-credentials-2-0-family-of-specifications-is-now-a-w3c-recommendation/
- OpenID4VP 1.0: https://openid.net/openid-for-verifiable-presentations-1-0-final-specification-approved/
- OpenID4VCI 1.0: https://openid.net/openid-for-verifiable-credential-issuance-1-final-specification-approved/
- OpenID Federation 1.1: https://openid.net/openid-federation-1-1-final-specifications-approved/

Credentials must be narrowly scoped and verified against current source status for high-impact use. Credential validity does not create legal authority beyond the underlying record.

## API and authorization security

IETF RFC 9700 is the January 2025 Best Current Practice for OAuth 2.0 security. It updates earlier security guidance based on practical threats.

- RFC 9700: https://www.ietf.org/rfc/rfc9700.html

Phase 11 should use short-lived tokens, audience restriction, proof-of-possession where appropriate, secure redirect and client registration practices, and explicit authorization policy. Public data access should not weaken authentication for administrative functions.

## Legal and governance work still required

Before production, obtain current advice on:

- public-benefit or nonprofit entity formation and fiduciary duties;
- privacy, data protection, cross-border transfer and localization;
- accessibility and discrimination obligations;
- consumer-protection and certification-mark claims;
- antitrust, labor and collective-action boundaries;
- public procurement, grants, lobbying and government contracting;
- export controls, sanctions and cybersecurity reporting;
- intellectual property, open-source licensing and standards IPR;
- tax treatment and unrelated or commercial activity;
- official registry, identity-provider or regulated-service implications.

No document in this package is a substitute for legal, tax, security, accessibility or public-governance advice.
