# Offering Pathway Decision Framework

Code must not decide which securities exemption an artist should use. It should collect facts, produce a comparison packet, and require counsel/partner approval of a pathway record.

## Candidate pathways

- **Regulation Crowdfunding:** up to $5 million in a rolling 12-month period through one SEC-registered broker-dealer or funding portal; investor limits and one-year resale restrictions generally apply.
- **Rule 506(c):** general solicitation permitted, but every purchaser must be an accredited investor and the issuer must take reasonable verification steps; securities are restricted.
- **Rule 506(b):** no general solicitation; permits accredited investors and a limited number of sophisticated non-accredited investors subject to conditions; securities are restricted.
- **Regulation A Tier 2:** up to $75 million, SEC qualification, audited financial statements, ongoing reporting, and investment limits for certain non-accredited purchasers.
- **Registered offering or other structure:** only after specialist review.

## Decision inputs

Collect:

- issuer jurisdiction and entity type;
- target and maximum raise;
- intended investor population;
- whether public advertising is necessary;
- audited financial-statement readiness;
- offering and reporting budget;
- expected number of investors;
- desired transferability and liquidity timeline;
- underlying rights term and cash-flow history;
- state-law and international distribution goals;
- whether the instrument may be asset-backed or investment-company sensitive;
- promoter, affiliate, and bad-actor information.

## Pathway record

Store an immutable `offering_pathway_decision` containing counsel, partner, date, selected pathway, rejected alternatives, legal assumptions, required filings, investor rules, communication rules, resale restrictions, state notices, reporting obligations, and expiration/reapproval conditions.

## UI constraints

Before approval, label all calculations “planning estimates.” Do not allow public offering pages, reservation of securities, waitlist wording that constitutes an offer, or investor-specific eligibility conclusions.

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
