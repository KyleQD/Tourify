# Allocation Engine, Rights Snapshots, and Recoupment

## Allocation input

Every allocation run must bind to:

- accepted royalty journal lines;
- exploitation period and territory;
- revenue/right category;
- issued Rights Passport snapshot effective for that period;
- agreement and allocation-policy versions;
- payee and authority state;
- dispute/hold status.

## Allocation sequence

1. determine the distributable base;
2. apply statement-level permitted deductions;
3. select eligible rights interests by asset, category, territory, and date;
4. apply contractual gross/net basis;
5. apply recoupment waterfall when documented;
6. allocate shares using rational arithmetic;
7. handle rounding with deterministic remainder rules;
8. route unknown or disputed portions to suspense/hold;
9. produce allocation entries and an explanation trace;
10. require approval before statements or payouts.

## Recoupment

Recoupment must be modeled as a versioned waterfall, not a single balance. Store advances, recoupable cost categories, caps, cross-collateralization, priority, recoupment percentage, effective period, and evidence agreement. A user-facing explanation must show why a participant received less than their nominal share.

## Historical changes

A current ownership change does not automatically reallocate past-period royalties. Select the rights owner entitled at the relevant usage period according to the governing agreement and applicable legal rules. Corrections use explicit adjustment runs.

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
