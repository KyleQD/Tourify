# Tourify Music Marketplace and Liquidity — Phase 4

Phase 4 extends the Phase 1 safe upload ecosystem, Phase 2 Rights Passport, and Phase 3 royalty/valuation infrastructure into a partner-led primary-offering, investor-portfolio, transfer, and controlled secondary-liquidity system.

## Launch boundary

Tourify is initially the artist experience, rights-data, analytics, disclosure, and partner-orchestration layer. Registered partners control regulated securities activities. No Tourify-operated matching engine, custody, escrow, or unrestricted token transfer is included.

## Canonical reading order

- `00_PHASE_4_SCOPE_DEPENDENCIES_AND_BOUNDARIES.md`
- `01_PRODUCT_MODEL_AND_USER_JOURNEYS.md`
- `02_REGULATORY_ROLE_AND_ENTITY_BOUNDARIES.md`
- `03_OFFERING_PATHWAY_DECISION_FRAMEWORK.md`
- `04_ISSUER_AND_CATALOG_ELIGIBILITY.md`
- `05_OFFERING_STRUCTURING_AND_DISCLOSURE_DATA_ROOM.md`
- `06_PRIMARY_OFFERING_WORKFLOW.md`
- `07_INVESTOR_ONBOARDING_KYC_ELIGIBILITY_LIMITS.md`
- `08_SUBSCRIPTION_ESCROW_CLOSING_AND_REFUNDS.md`
- `09_SECURITYHOLDER_RECORD_AND_TRANSFER_AGENT_INTEGRATION.md`
- `10_TOKENIZED_INSTRUMENT_AND_SMART_CONTRACT_LIFECYCLE.md`
- `11_WALLETS_CUSTODY_AND_KEY_RECOVERY.md`
- `12_SECONDARY_LIQUIDITY_PARTNER_ATS.md`
- `13_ORDER_ROUTING_MARKET_DATA_AND_EXECUTION.md`
- `14_SETTLEMENT_RECONCILIATION_AND_CORPORATE_ACTIONS.md`
- `15_TRANSFER_RESTRICTIONS_HOLDS_AND_REPURCHASES.md`
- `16_LIQUIDITY_RISK_PRICE_DISCOVERY_AND_VALUATION_DISPLAY.md`
- `17_MARKET_SURVEILLANCE_MANIPULATION_AND_ABUSE.md`
- `18_COMMUNICATIONS_PROMOTIONS_AND_SOCIAL_CONTROLS.md`
- `19_INVESTOR_PORTFOLIO_STATEMENTS_TAX_REPORTING.md`
- `20_ISSUER_REPORTING_AND_ONGOING_DISCLOSURES.md`
- `21_FAN_UTILITY_AND_SECURITIES_SEPARATION.md`
- `22_DATABASE_MIGRATIONS_RLS_AND_STORAGE.md`
- `23_API_EVENTS_BACKGROUND_JOBS_PARTNERS.md`
- `24_UI_UX_AND_EXISTING_SURFACE_INTEGRATION.md`
- `25_ADMIN_MARKET_OPS_COMPLIANCE.md`
- `26_SECURITY_PRIVACY_FINANCIAL_CONTROLS.md`
- `27_COMPLAINTS_DISPUTES_INCIDENT_RESPONSE.md`
- `28_TESTING_PILOT_AND_ROLLOUT.md`
- `29_PHASE_5_INSTITUTIONAL_MARKETPLACE.md`
- `30_NON_DESTRUCTIVE_INTEGRATION_CHECKLIST.md`
- `31_DEFINITION_OF_DONE.md`
- `32_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`
- `33_CURRENT_STANDARDS_LEGAL_TAX_RESEARCH.md`

## Control files

- `CURRENT_STATE_AUDIT_TEMPLATE.md`
- `phase-4-execution-plan.schema.json`
- `phase-4-execution-plan.template.json`
- `32_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`

## Reference material

The `reference/` directory contains non-production TypeScript, SQL, and partner payload examples. Codex must adapt them only after auditing the actual repository, deployed Supabase schema, Phase 1–3 implementation, partner contracts, and legal role map.

## Core architectural rule

> The legal instrument defines investor rights. The registered intermediary controls offers and transactions. The transfer agent or approved official ledger controls ownership. Tourify supplies verified music-rights data, issuer workflow, portfolio presentation, analytics, and synchronized evidence.
