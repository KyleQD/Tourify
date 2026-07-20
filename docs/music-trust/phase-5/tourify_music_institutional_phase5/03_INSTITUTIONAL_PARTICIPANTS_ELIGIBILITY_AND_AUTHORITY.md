# Institutional Participants, Eligibility, and Authority

## Organization types

Support separately modeled organizations for:

- catalog acquirers and strategic buyers;
- labels, publishers, distributors, administrators, and PRO/CMO-related entities;
- private funds, SPVs, family offices, endowments, foundations, pensions, and insurers;
- registered investment advisers and exempt reporting advisers;
- broker-dealers, placement agents, funding portals, ATS operators, and execution venues;
- transfer agents, custodians, banks, trustees, escrow providers, and fund administrators;
- valuation firms, auditors, law firms, tax providers, and diligence vendors.

## Identity versus eligibility

Tourify stores a normalized organization identity and current partner assertions. It must not independently certify legal statuses such as accredited investor, qualified purchaser, qualified institutional buyer, registered adviser, broker-dealer, or qualified custodian unless the status is verified by the designated provider and current source.

## Delegated authority

Institutional members require explicit organization roles such as:

- organization administrator;
- portfolio viewer;
- analyst;
- diligence contributor;
- investment-committee voter;
- bidder or order submitter;
- signer;
- compliance reviewer;
- fund administrator;
- auditor or external adviser.

High-risk actions require current authority evidence and step-up authentication. User-controlled profile metadata must never grant authorization.

## Eligibility assertions

Store versioned assertions with:

- assertion type;
- provider and provider reference;
- subject organization/person;
- jurisdiction;
- verified or self-certified status;
- effective and expiration dates;
- evidence pointer in restricted storage;
- permitted product classes and transaction limits;
- revocation status and reason.

Do not hardcode legal thresholds into UI copy. Thresholds and definitions can change and may differ by pathway. The approved intermediary or counsel owns the final eligibility decision.

## Data minimization

Tourify should receive status, permitted scopes, limits, expiration, and provider references rather than raw financial statements, passports, accreditation records, tax forms, or beneficial-owner files whenever possible.
