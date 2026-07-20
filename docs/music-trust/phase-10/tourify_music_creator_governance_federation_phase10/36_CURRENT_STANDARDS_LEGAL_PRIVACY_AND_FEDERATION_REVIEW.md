# Current Standards, Legal, Privacy and Federation Review

Research date: 2026-07-17. This document is an implementation research baseline, not legal advice.

## Digital credentials

### W3C Verifiable Credentials 2.0

The W3C Verifiable Credentials Data Model v2.0 became a Recommendation on 15 May 2025. Its related Recommendation family includes Data Integrity mechanisms, Controlled Identifiers and Bitstring Status List v1.0. Phase 10 should version its credential profiles and avoid inventing a Tourify-only credential format when a standards-based profile can satisfy the use case.

Official sources:

- https://www.w3.org/TR/vc-data-model-2.0/
- https://www.w3.org/TR/vc-bitstring-status-list/
- https://www.w3.org/2025/credentials/

### DIDs and controlled identifiers

DID Core v1.0 remains a W3C Recommendation. DID v1.1 was a Candidate Recommendation Snapshot in March 2026. Production code should pin an approved profile rather than automatically adopting a candidate specification.

Official sources:

- https://www.w3.org/TR/did-core/
- https://www.w3.org/TR/did-1.1/

### OpenID credential protocols

OpenID for Verifiable Presentations 1.0 became a Final Specification in July 2025, and OpenID for Verifiable Credential Issuance 1.0 became Final in September 2025. Phase 10 may use these as protocol candidates for wallet interoperability after security and conformance review.

Official sources:

- https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html
- https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-final.html

### European Digital Identity

Regulation (EU) 2024/1183 amended eIDAS to establish the European Digital Identity Framework. Implementing regulations published in late 2024 define wallet protocols, interfaces, integrity and attribute requirements. Phase 10 should treat EUDI compatibility as a jurisdiction-specific adapter, not as a universal Tourify identity system.

Official sources:

- https://eur-lex.europa.eu/eli/reg/2024/1183/oj
- https://eur-lex.europa.eu/eli/reg_impl/2024/2982/oj/eng
- https://eur-lex.europa.eu/eli/reg_impl/2024/2977/oj/eng

## Cooperative federation principles

The International Cooperative Alliance describes a cooperative as autonomous, voluntary, jointly owned and democratically controlled. Its autonomy and independence principle supports Phase 10’s default-local-sovereignty design. The ICA principles are governance guidance, not a substitute for jurisdiction-specific entity law.

Official source:

- https://ica.coop/en/cooperatives/cooperative-identity

## Cross-border data governance

GDPR Chapter V requires lawful conditions for transfers of personal data to third countries and onward transfers. The OECD describes trusted cross-border data flows as requiring privacy, security and intellectual-property safeguards and notes growing data-localization requirements. Phase 10 must maintain versioned transfer mechanisms and localization rules rather than treating federation membership as transfer authority.

Official sources:

- https://eur-lex.europa.eu/eli/reg/2016/679/art_46/pnt_c/oj
- https://www.oecd.org/en/topics/cross-border-data-flows.html
- https://www.oecd.org/en/topics/privacy-principles.html

## EU Data Governance Act comparison

The EU Data Governance Act creates rules for neutral data intermediation services and recognized data-altruism organizations. The European Commission states that data intermediaries must be structurally separated and cannot use intermediated data for their own financial profit. Applicability to a future Tourify federation requires specific EU analysis; the model is still useful when designing entity separation and conflicts controls.

Official sources:

- https://digital-strategy.ec.europa.eu/en/policies/data-governance-act-explained
- https://digital-strategy.ec.europa.eu/en/policies/data-intermediary-services

## Competition and collective action

The U.S. DOJ and FTC opened a joint inquiry in February 2026 regarding updated guidance for competitor collaborations, specifically identifying data sharing, algorithmic pricing and labor collaborations. The public-comment period was extended to May 21, 2026. Until current guidance and matter-specific counsel support a workflow, Phase 10 must keep coordinated pricing, rate recommendations, joint refusals to deal and external collective action disabled.

Official sources:

- https://www.justice.gov/opa/pr/justice-department-and-federal-trade-commission-seek-public-comment-guidance-business
- https://www.justice.gov/opa/pr/doj-and-ftc-extend-deadline-public-comment-guidance-business-collaborations

## Engineering interpretation

1. Pin approved credential and protocol profiles.
2. Treat credentials as evidence, not automatic authority.
3. Implement privacy-preserving status and revocation.
4. Preserve local organization sovereignty.
5. Require separate transfer and data-contribution authority.
6. Keep collective action and representation hard-disabled.
7. Build conformance tests before production interoperability.
8. Re-review standards and law immediately before implementation because candidate specifications and jurisdiction rules may change.
