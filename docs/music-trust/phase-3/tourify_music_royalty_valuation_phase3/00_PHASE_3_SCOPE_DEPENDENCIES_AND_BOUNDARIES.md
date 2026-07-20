# Phase 3 Scope, Dependencies, and Boundaries

Phase 3 turns issued Phase 2 Rights Passports into an operational financial data layer. It must extend the existing Tourify music stack and must not redefine catalog ownership, playback, or storage.

## Required dependencies

Phase 3 may begin only after the repository audit confirms that:

- `artist_music` remains the canonical catalog row;
- the Phase 1 origin record and declaration workflow is live or safely feature-flagged;
- Phase 2 has immutable, versioned rights snapshots for musical works, sound recordings, parties, claims, agreements, disputes, and passport status;
- accepted claims include rights category, share, territory, validity period, recipient, gross/net basis, deductions, recoupment terms, and authority;
- disputed or suspended interests can be frozen;
- the existing marketplace, Stripe/commerce, notifications, jobs, audit logs, and admin capability model have been audited.

## Phase 3 outcome

An eligible artist or rights administrator can:

1. import royalty statements and direct Tourify revenue;
2. normalize usage and money into a traceable ledger;
3. match statement lines to sound recordings, works, releases, and rights interests;
4. allocate earnings using the issued Rights Passport snapshot that applied to the exploitation period;
5. reconcile adjustments, reserves, refunds, recoupment, and disputes;
6. issue transparent participant statements;
7. prepare or execute payouts through a regulated provider without Tourify holding private bank data;
8. receive a model-governed catalog valuation range and confidence score;
9. create nonfinancial fan-access collectibles without implying investment value;
10. prepare a regulated royalty-participation pilot through licensed partners;
11. optionally represent a partner-administered security on-chain without making the token the legal source of truth.

## Explicit exclusions from the initial Phase 3 production release

- an unrestricted public token sale;
- guaranteed appreciation or automatic token-price increases;
- an unlicensed securities exchange or alternative trading system;
- Tourify custody of customer crypto assets;
- Tourify acting as a broker, dealer, investment adviser, transfer agent, funding portal, exchange, money transmitter, or tax adviser without a documented legal basis and required registrations;
- secondary trading between users;
- paying disputed claims;
- valuing unverified revenue as if it were audited;
- using blockchain balances as the authoritative rights ledger;
- automatically importing third-party statements without user authorization and a data-processing agreement.

## Product boundaries

Phase 3 is four bounded contexts:

- **Royalty Accounting:** ingestion, normalization, matching, ledger, allocation, reconciliation, statements.
- **Payout Operations:** payee readiness, tax status, sanctions/KYC state, payout instructions, provider events.
- **Catalog Valuation:** revenue verification, forecast scenarios, risk adjustments, model versions, confidence.
- **Financial Products:** fan utility and partner-led regulated royalty participation. This context consumes signed snapshots and may never mutate core rights.

Each context has its own tables, services, APIs, permissions, feature flags, jobs, and audit events.

## Current authoritative references

- DDEX Digital Sales Reporting Message Suite: https://kb.ddex.net/implementing-each-standard/digital-sales-reporting-message-suite-%28dsr%29/
- DDEX DSR Part 6 Royalty Reporting Profile: https://dsr6.ddex.net/digital-sales-report-message-suite%3A-part-6-royalty-reporting-profile/1-introduction/
- DDEX DSR Part 9 Financial Reporting to Record Companies: https://dsr9.ddex.net/digital-sales-report-message-suite%3A-part-9-financial-reporting-to-record-companies-profile/1-introduction/
- The MLC: https://www.themlc.com/
- SoundExchange: https://www.soundexchange.com/
- U.S. Copyright Office music modernization audits: https://www.copyright.gov/music-modernization/audits/
- SEC 2026 crypto-asset interpretation: https://www.sec.gov/rules-regulations/2026/03/s7-2026-09
- SEC statement on tokenized securities: https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities
- SEC offering pathways: https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/offering-pathways
- FinCEN virtual-currency guidance: https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering
- IRS Form 1099-DA instructions: https://www.irs.gov/instructions/i1099da
- IRS Form 1099-MISC: https://www.irs.gov/forms-pubs/about-form-1099-misc
- OFAC digital-currency compliance FAQ: https://ofac.treasury.gov/faqs/560
- IVS effective January 31, 2025, including IVS 210 Intangible Assets: https://ivsc.org/standards/
- Stripe Connect onboarding and payouts: https://docs.stripe.com/connect/onboarding and https://docs.stripe.com/connect/payouts-connected-accounts
