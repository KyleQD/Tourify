# Phase 4 Scope, Dependencies, and Boundaries

Phase 4 converts the Phase 3 financing-readiness layer into a controlled marketplace experience for primary offerings and partner-operated secondary liquidity. It must not turn Tourify into an unlicensed broker-dealer, funding portal, exchange, ATS, transfer agent, custodian, clearing agency, money transmitter, or investment adviser.

## Prerequisites

Phase 4 may begin only after production evidence confirms:

- Phase 1 uploads, private storage, playback, marketplace purchases, and moderation remain stable.
- Phase 2 Rights Passports can issue, suspend, supersede, and expose historical rights snapshots.
- Phase 3 can ingest statements, reconcile revenue, allocate by historical rights snapshots, produce participant statements, and calculate governed valuation ranges.
- Artist catalog disputes, recoupment obligations, liens, licenses, and collection mandates are represented.
- A partner responsibility matrix has been approved by securities, music, tax, privacy, and payments counsel.

## Production launch boundary

The recommended first production version is a **partner-led marketplace shell**:

1. Tourify presents eligible artists, verified catalog data, approved disclosures, and portfolio summaries.
2. A registered intermediary controls securities onboarding, solicitation rules, recommendations, investment limits, subscriptions, escrow, execution, official position records, custody, and required reporting.
3. A registered transfer agent or approved partner record is the legal source of truth for securityholder positions.
4. An ATS or other legally permitted partner controls secondary orders and executions.
5. Tourify stores synchronized read models and immutable partner-event receipts, but does not independently match buyers and sellers.

## Explicit exclusions

Do not launch:

- an unrestricted order book or automated matching engine;
- a liquidity pool or automated market maker;
- peer-to-peer transfers outside the approved transfer workflow;
- guaranteed liquidity, guaranteed appreciation, or guaranteed royalty returns;
- a Tourify stablecoin, custodial wallet, or internal cash balance;
- anonymous wallet participation;
- tokens that can transfer while the official transfer-agent record rejects the transfer;
- tokenized offerings before issuer-specific counsel selects and documents the offering pathway.

## Core architectural rule

> The legal instrument defines the investor's rights. The registered intermediary controls the offering and transaction. The transfer agent or approved official ledger controls ownership. Tourify provides the music-rights data, issuer workflow, user experience, analytics, and synchronized evidence.

## Current authoritative references

- SEC Statement on Tokenized Securities (Jan. 28, 2026): https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities
- SEC Trading and Markets FAQs for crypto asset activities and DLT, updated Dec. 17, 2025: https://www.sec.gov/rules-regulations/staff-guidance/trading-markets-frequently-asked-questions/frequently-asked-questions-relating-crypto-asset-activities-distributed-ledger-technology
- SEC Regulation ATS overview and current ATS list: https://www.sec.gov/foia/frequently-requested-documents/alternative-trading-system-ats-list
- SEC broker-dealer registration guide: https://www.sec.gov/about/divisions-offices/division-trading-markets/division-trading-markets-compliance-guides/guide-broker-dealer-registration
- SEC Regulation Crowdfunding guidance: https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/regulation-crowdfunding-guidance-issuers
- SEC Rule 506(c) guidance: https://www.sec.gov/resources-small-businesses/exempt-offerings/general-solicitation-rule-506c
- SEC Regulation A guidance: https://www.sec.gov/resources-small-businesses/small-business-compliance-guides/regulation-guidance-issuers
- SEC private secondary markets overview: https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/private-secondary-markets
- SEC Rule 144 overview: https://www.sec.gov/reports/rule-144-selling-restricted-control-securities
- FINRA 2026 Private Placements report: https://www.finra.org/rules-guidance/guidance/reports/2026-finra-annual-regulatory-oversight-report/private-placements
- FINRA 2026 Best Execution report: https://www.finra.org/rules-guidance/guidance/reports/2026-finra-annual-regulatory-oversight-report/best-execution
- FINRA crypto asset activities update: https://www.finra.org/rules-guidance/guidance/crypto-assets-update
- OFAC FAQ 560 and virtual-currency sanctions guidance: https://ofac.treasury.gov/faqs/560
- FinCEN convertible virtual currency guidance: https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering
- IRS 2026 Form 1099-DA instructions: https://www.irs.gov/instructions/i1099da
