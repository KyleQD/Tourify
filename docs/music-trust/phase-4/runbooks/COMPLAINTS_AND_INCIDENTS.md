# Runbook — Complaints and Incidents

## Intake

- Record in `music_marketplace_complaints` (or escalate to partner case systems).
- Capture subject type/id, summary, evidence hashes — never store raw identity documents in app tables.

## Severity

- **Critical:** fund movement mismatch, unauthorized transfer, custody key exposure (must not exist in Tourify), market manipulation alert.
- **High:** disclosure mismatch, eligibility sync failure, settlement break.
- **Medium:** stale market data, UX confusion between downloads marketplace and securities shell.
- **Low:** documentation / labeling issues.

## Response

1. Open compliance hold if investor/offering/position risk.
2. Notify responsible partner (intermediary / ATS / TA).
3. Dual-control admin actions for kill switches.
4. Compensating corrections only — no destructive financial edits.
5. Close with written disposition and partner reference.
