# Secondary Liquidity and ATS Partner Architecture

Phase 4 secondary liquidity should be supplied by a registered broker-dealer/ATS or another legally approved partner. Tourify should not operate an independent matching engine.

## Partner modes

- **Redirect:** Tourify links the eligible user to the partner venue.
- **Embedded partner UI:** partner-hosted components collect orders and display regulatory disclosures.
- **API orchestration:** Tourify sends authorized instructions to partner APIs while the partner remains the order receiver and execution venue.
- **Read-only synchronization:** Tourify only displays orders, executions, and market data supplied by partner.

Start with redirect or embedded partner UI; progress only after written role approval.

## Access gates

Require partner account approval, instrument eligibility, holding-period completion, transfer-agent clearance, jurisdiction permission, sanctions/tax status, position availability, lockup/legend status, and market session availability.

## No liquidity promises

Display that a venue may have no buyers, wide spreads, sparse quotes, limited sessions, transfer fees, partner rejection, and long settlement. Do not infer liquidity from a token's existence or from one historical execution.

## Venue records

Store partner venue ID, subscriber/account reference, order/execution IDs, timestamps, security identifiers, side, quantity, price, fees, status, cancellation reason, settlement reference, and source payload hash. The partner remains authoritative.

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
