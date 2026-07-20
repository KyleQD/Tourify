# Database, Migrations, RLS, and Storage

## Additive schemas

Prefer bounded schemas or clear prefixes such as `music_royalties`, `music_valuation`, and `music_finance`. Do not move or duplicate `artist_music`.

## Table groups

### Ingestion and matching

`royalty_sources`, `royalty_connections`, `royalty_import_batches`, `royalty_source_files`, `royalty_raw_rows`, `royalty_normalization_runs`, `royalty_normalized_lines`, `royalty_match_candidates`, `royalty_matches`.

### Ledger and allocation

`royalty_accounts`, `royalty_journals`, `royalty_journal_entries`, `royalty_periods`, `royalty_allocation_runs`, `royalty_allocations`, `royalty_recoupment_ledgers`, `royalty_holds`, `participant_statements`.

### Payout

`payee_accounts`, `payout_readiness`, `payout_batches`, `payout_instructions`, `payout_provider_events`, `payout_reconciliations`.

### Valuation

`valuation_models`, `valuation_model_versions`, `valuation_input_snapshots`, `catalog_valuations`, `valuation_scenarios`, `valuation_cash_flows`, `valuation_reviews`.

### Finance

Keep regulated-product tables separate and feature flagged.

## RLS

- owners and authorized team members see catalog-level results;
- participants see only interests and statements they are permitted to inspect;
- raw provider files are restricted;
- financial Operations and Compliance use explicit capabilities;
- public users never query internal royalty tables;
- service workers use narrowly scoped server credentials;
- views exposed through the Data API use `security_invoker` where supported;
- UPDATE policies include SELECT, USING, and WITH CHECK requirements.

## Storage

Create private buckets for royalty statements, financial evidence, and generated statements after auditing current storage. Use owner/organization scoped paths and signed URLs. No public raw statements.

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
