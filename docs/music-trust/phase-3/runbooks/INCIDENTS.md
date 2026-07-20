# Phase 3 Incident Runbook

Financial royalty / valuation / finance incidents. Complements Phase 1 `docs/music-trust/phase-1/runbooks/INCIDENTS.md` for trust badges/origin.

## Severity

| Level | Examples |
|---|---|
| Critical | Cross-owner royalty data leak; unauthorized payout; key compromise; accepting regulated orders without partner (`music_finance_*`) |
| High | Unbalanced posted journal; maker-checker bypass; webhook replay credit; rights freeze ignored in allocation |
| Medium | Duplicate import storm; valuation copy implying guarantees; connector outage |
| Low | Single-batch parse failure; delayed statement generation |

## Response (all severities)

1. **Contain with flags** — narrowest kill switch (see `SECURITY.md`). Money risk → `music_payouts_enabled` off immediately (`PAYOUT_FREEZE.md`).
2. **Preserve evidence** — import batch IDs, journal IDs, payout instruction IDs, provider event IDs, flag state timestamps. No raw bank/tax/statement bodies in chat.
3. **Stop writers** — pause workers/outbox consumers for the affected domain; do not delete `music_royalties_*` rows.
4. **Correct accounting only via reversal** — posted journals are immutable; open reversing + replacement journals under `music_royalties_ledger_enabled`.
5. **Communicate** — ops + finance + compliance; for investor/offering paths also counsel before any user message.
6. **Close** — scope, impact, containment, remediation, flag-off/flag-on regression, exercise note for the relevant runbook.

## Domain playbooks

| Domain | First flags | Notes |
|---|---|---|
| Ingestion / storage | `music_royalties_ingestion_enabled` | Quarantine batch; rotate signed URLs |
| Matching | `music_royalties_matching_enabled` | Never auto-accept title/artist-only |
| Ledger | `music_royalties_ledger_enabled` | Freeze posting; reverse if needed |
| Statements | `music_royalties_statements_enabled` | Reproducibility over speed |
| Payouts | `music_payouts_enabled` | Freeze; reconcile; no silent retry |
| Valuation | `music_valuation_enabled` | Ranges only; no ledger mutation |
| Fan utility | `music_fan_utility_enabled` | Strip profit/appreciation language |
| Offerings / on-chain | `music_finance_offerings_enabled`, `music_finance_onchain_enabled` | Orders must reject; tokens ≠ legal SoT |
| Admin | `music_royalties_admin_ops_enabled` | Revoke elevated capabilities |

## Escalation

- Security/privacy → `SECURITY.md`
- Money movement → `PAYOUT_FREEZE.md`
- Tax / OFAC / reporting → `TAX_AND_SANCTIONS.md`
- Phase 1 evidence/badge → Phase 1 INCIDENTS runbook

Production enablement of any Phase 3 flag requires staged verification; this runbook alone does not authorize go-live.
