# Tokenized Instrument Data Model and Transfer Restrictions

## Legal instrument first

Create a legally controlling instrument with defined issuer, holder rights, revenue source, percentage or payment formula, gross/net basis, deductions, term, territory, reporting, audit rights, transfer restrictions, defaults, disputes, termination, and governing law.

## Separate records

- `financial_offerings`;
- `financial_instruments`;
- `instrument_terms_versions`;
- `offering_disclosures`;
- `partner_investor_accounts`;
- `subscription_orders`;
- `instrument_positions`;
- `distribution_entitlements`;
- `transfer_restrictions`;
- `compliance_holds`;
- `partner_reconciliation_events`;
- optional `token_representations`.

## Token representation

A token record stores network, contract, token/position ID, quantity, status, controlling-ledger reference, and synchronization state. If on-chain and partner records conflict, freeze transfers and treat the legally designated ledger as controlling.

## Transfer restrictions

Support lockups, investor eligibility, jurisdiction, maximum holders, partner approval, sanctions, legal holds, and instrument maturity. Enforce at application, partner, and contract layers when possible.

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
