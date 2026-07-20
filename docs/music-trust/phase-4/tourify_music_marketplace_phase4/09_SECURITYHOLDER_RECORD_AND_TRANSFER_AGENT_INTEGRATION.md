# Securityholder Record and Transfer Agent Integration

The official ownership record must be explicitly designated. A blockchain token, Tourify portfolio row, and transfer-agent record must never compete as ambiguous sources of truth.

## Official record model

Preferred hierarchy:

1. Registered transfer agent or legally approved official Master Securityholder File.
2. Regulated partner books and records.
3. Tourify synchronized read model.
4. Optional blockchain representation or commitment.

If DLT forms part of the official file, personal identity information should remain off-chain while transaction and position references may be on-chain under the transfer agent's architecture.

## Integration events

- security class created;
- position opened or adjusted;
- legend/restriction applied or removed;
- wallet linked or changed;
- transfer pending/approved/rejected/completed;
- lost holder or returned communication;
- corporate action and distribution eligibility;
- position frozen, escheated, cancelled, redeemed, or matured.

## Reconciliation

Run daily and event-driven reconciliation among transfer agent, broker/ATS, custody provider, blockchain indexer when used, Phase 3 distribution ledger, and Tourify. Differences create financial-operations cases; they must not be silently overwritten.

## Privacy

Never expose legal holder names, tax IDs, addresses, wallet-risk details, or exact holdings publicly. Public holder counts and aggregate figures require disclosure approval and privacy review.

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
