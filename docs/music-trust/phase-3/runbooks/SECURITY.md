# Phase 3 Security Runbook

Royalty, valuation, and finance surfaces. Flags default off via `lib/music/royalties/music-royalties-flags.ts`.

## Flag kill switches

| Incident class | Disable first |
|---|---|
| Statement / storage exposure | `music_royalties_ingestion_enabled` |
| Match queue abuse / mis-match | `music_royalties_matching_enabled` |
| Ledger integrity | `music_royalties_ledger_enabled` |
| Statement disclosure | `music_royalties_statements_enabled` |
| Money movement | `music_payouts_enabled` |
| Valuation misuse | `music_valuation_enabled` |
| Fan utility copy/compliance | `music_fan_utility_enabled` |
| Regulated offering paths | `music_finance_offerings_enabled`, `music_finance_onchain_enabled` |
| Admin ops escalation | `music_royalties_admin_ops_enabled` |

Disable the narrowest flag that stops harm. Do not disable Phase 1/2 music upload, playback, or marketplace unless the blast radius requires it.

## Severity triggers

- **Critical:** cross-owner access to `music_royalties_*` / `music_valuation_*` / `music_finance_*`; private statement signed-URL leak; payout redirection; service-role key exposure; raw bank/tax docs in Tourify storage.
- **High:** webhook forgery / replay; maker-checker bypass; RLS policy gap for participants/teams/ops; connector token theft.
- **Medium:** anomalous duplicate imports; failed anomaly alerts; stale connector credentials without confirmed abuse.

## Immediate response

1. Flip affected flags to `enabled=false` (and `rollout_percentage=0`).
2. Freeze payouts per `PAYOUT_FREEZE.md` if money movement is in scope.
3. Rotate compromised secrets (Stripe Connect webhook secret, connector tokens, service role if leaked). Revoke sessions for affected users.
4. Preserve audit rows and provider event IDs; **never** paste signed URLs, raw statement contents, bank details, tax IDs, or webhook full payloads into chat.
5. For storage exposure: revoke/rotate signed URL capability, inventory recent access logs, quarantine affected import batches.
6. For key compromise: treat as Critical — rotate, invalidate sessions, freeze `music_payouts_enabled` and `music_finance_*`, open `INCIDENTS.md` Critical track.

## Tables / surfaces to audit

- Ingestion: `music_royalties_import_batches`, `music_royalties_raw_rows`, private statement storage.
- Ledger: `music_royalties_journals`, `music_royalties_journal_entries` (posted = immutable).
- Payouts: `music_royalties_payout_*`, Stripe Connect IDs only (no raw bank numbers).
- Valuation: `music_valuation_*` (must not mutate rights/ledger).
- Finance: `music_finance_*` (`accepts_orders` must stay false without counsel+partner).

## Re-enable gates

1. Root cause + blast radius written.
2. Flag-off regression confirms core music still healthy.
3. Security/ops sign-off; staging replay of the failing path.
4. Re-enable one flag at a time with low rollout % and monitoring.

No production flag enablement is authorized by docs alone.
