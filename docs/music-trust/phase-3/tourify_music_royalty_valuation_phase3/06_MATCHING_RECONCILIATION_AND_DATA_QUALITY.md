# Matching, Reconciliation, and Data Quality

## Matching hierarchy

1. exact external provider asset ID;
2. exact ISRC or ISWC plus compatible title/party metadata;
3. UPC plus track sequence and title;
4. acoustic fingerprint for sound recordings;
5. deterministic metadata candidate scoring;
6. manual review.

Never auto-match solely on title and artist name.

## Match states

- exact;
- high-confidence candidate;
- ambiguous;
- unmatched;
- conflicting identifier;
- excluded;
- manually confirmed.

## Reconciliation views

- statement totals versus normalized totals;
- normalized totals versus posted journal totals;
- posted distributable totals versus allocated totals;
- allocated totals versus participant statements;
- payable totals versus provider transfers;
- provider transfer totals versus bank/payout completion events.

## Data-quality score

Score statement completeness, identifier coverage, rights confidence, match confidence, historical consistency, and unresolved exception rate. This score may affect valuation confidence but must not alter earned money.

## Operations queue

Provide queue filters for materiality, age, source, artist, unmatched value, disputed value, identifier conflict, and repeated parser failures.

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
