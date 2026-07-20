# Phase 3 Tax and Sanctions Runbook

Operational responsibilities for royalty payouts and finance readiness. Not legal advice — counsel owns final determinations.

## Flags

- Payout money movement: `music_payouts_enabled` (keep off until tax/sanctions gates signed).
- Payee/ops tooling: `music_royalties_admin_ops_enabled`, `music_royalties_statements_enabled`.
- Regulated / digital-asset paths: `music_finance_offerings_enabled`, `music_finance_onchain_enabled` (partner+counsel only).
- Valuation is not a tax event by itself: `music_valuation_enabled` may stay off during payout freezes.

## Roles (ADR-P3-010)

| Party | Responsibility |
|---|---|
| Stripe Connect (or approved provider) | Identity, bank collection, provider KYC/KYB, many tax-form workflows |
| Tourify | Store provider IDs + readiness status; allocate royalties; hold when not ready; never store raw bank numbers |
| Finance / compliance | Year-end reporting decisions, OFAC escalations, withhold/block instructions |
| Counsel | 1099-MISC vs 1099-DA applicability, money-transmission and securities posture |

## Tax separation

- **Royalty payouts:** typically evaluated under Form **1099-MISC** (or provider-equivalent) for qualifying royalties — product/payer/year specific.
- **Digital-asset broker events:** Form **1099-DA** path is separate; only relevant if Tourify or a partner is a broker for reportable digital-asset dispositions. Phase 3 default: **no open secondary market**; do not assume 1099-DA covers royalty income.
- Do not enable `music_finance_onchain_enabled` or offering order acceptance without a written tax+securities memo.

## Payee readiness gates

Use `music_royalties_payout_readiness` / hold types (`kyc`, `sanctions`, `legal`, `tax`-related via readiness `tax_status`):

| Gate | Block payout when |
|---|---|
| Tax | `tax_status` in `unknown`, `incomplete`, `blocked` |
| Sanctions | Screening hit or `sanctions review required` / hold_type `sanctions` |
| KYC | Provider requirements outstanding |
| Legal | Active dispute/legal hold |

Blocked payees stay in suspense/holds; statements may still generate if `music_royalties_statements_enabled` is on and counsel agrees.

## Sanctions / OFAC response

1. Disable `music_payouts_enabled` for global risk; otherwise place payee/instruction holds.
2. Do not tip off in a way that violates counsel guidance; freeze quietly, escalate compliance.
3. Preserve provider screening references; do not store full watchlist dumps in app logs.
4. Unfreeze only after compliance clearance and readiness status update.

## Year-end / reporting ops

1. Export allocation + payout settlement evidence for the tax year (provider reports + Tourify instruction IDs).
2. Confirm payer-of-record with finance (Tourify vs partner vs artist entity).
3. File or delegate 1099-* per counsel; never invent a single form for all Phase 3 activity.

## References

- IRS 1099-MISC / 1099-DA instructions; OFAC digital-currency FAQ; Stripe Connect onboarding/payouts docs (see `28_DEFINITION_OF_DONE.md` reference list).
