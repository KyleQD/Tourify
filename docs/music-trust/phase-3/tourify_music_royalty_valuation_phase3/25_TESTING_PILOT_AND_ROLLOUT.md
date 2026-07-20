# Testing, Pilot, and Rollout

## Testing layers

- parser fixtures and malformed statements;
- property-based money and allocation tests;
- ledger balance invariants;
- historical rights snapshot selection;
- recoupment waterfall scenarios;
- dispute and hold propagation;
- duplicate import and webhook replay;
- payout failure and reversal;
- RLS and cross-account access;
- valuation reproducibility, sensitivity, backtesting, and drift;
- regression for upload, streaming, marketplace, library, feed, EPK, and mobile.

## Pilot

Start with 10–20 artists and diverse catalogs. Use statement uploads before broad API connectors. Run in shadow mode: calculate without moving money, reconcile against existing artist statements, and require signed approval.

## Rollout gates

1. read-only imports and analytics;
2. reviewed ledger and participant statements;
3. provider sandbox payout onboarding;
4. limited real payouts under counsel/accounting approval;
5. valuation beta with strong disclaimers;
6. fan utility beta;
7. partner-led financing readiness;
8. no regulated offering until partner, counsel, security, tax, and operations gates are signed.

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
