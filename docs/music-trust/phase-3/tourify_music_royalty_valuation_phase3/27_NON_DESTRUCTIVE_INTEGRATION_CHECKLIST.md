# Non-Destructive Integration Checklist

## Before coding

- audit all Phase 1 and 2 files and migrations;
- inspect `artist_music`, rights snapshot types, Stripe/marketplace code, jobs, capabilities, RLS, generated types, and financial tables;
- identify pre-existing accounting or payout logic;
- create feature flags and rollout ownership;
- record architecture decisions.

## Database

- additive migrations only;
- never reset the database;
- no destructive column changes;
- no automatic backfill that treats old revenue as verified;
- create validation and rollback/compensating scripts;
- test RLS before exposing routes;
- regenerate types after approved migrations.

## Application

- preserve `/artist/music`, Jukebox, stream access, preview jobs, marketplace, library, feed, profile, EPK, and mobile behavior;
- reuse existing account and team permissions;
- keep financial modules lazy-loaded and flag-gated;
- no new global music store;
- no direct storage URLs;
- no secrets in client components.

## Money

- shadow mode before posting;
- no real payouts until reconciled and approved;
- no valuation-driven payout or token pricing;
- no regulated CTA without partner eligibility response;
- freeze affected interests during disputes or legal holds.

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
