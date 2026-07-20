# DDEX and Statement Normalization

DDEX DSR enables digital services to report sales and usage to licensors. Phase 3 should obtain a DDEX Implementation Licence before production exchange and implement the latest applicable profile after confirming partner requirements.

## Canonical normalized fields

Each source line should preserve:

- provider and source statement identifiers;
- reporting and usage periods;
- transaction and correction type;
- service, territory, currency, exchange-rate reference, and commercial model;
- usage type and quantity;
- gross revenue, royalty base, rate, gross royalty, deductions, taxes, net royalty;
- release, recording, work, artist, label, writer, and rights-controller identifiers;
- ISRC, ISWC, UPC/EAN/GRid, IPI/CAE, provider asset IDs;
- source row number and raw payload hash;
- parser version and normalization warnings.

## Money rules

- Store monetary values as integer minor units when currency precision is known.
- Preserve original decimal strings and currency.
- Do not silently convert currency during ingestion.
- Record any FX rate, provider, timestamp, and converted amount separately.
- Never use floating-point arithmetic for allocations.

## Immutable source mapping

Normalized lines point to raw rows. Corrections create reversal and replacement lines rather than overwriting accepted data. Parser upgrades may create a new normalization run, but previously posted ledger records remain traceable to the exact parser and source hash used.

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
