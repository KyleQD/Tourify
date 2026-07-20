# Runbook — MNPI and Institutional Security

## Controls

- Data-room document classification (`mnpi`, `counsel_only`, etc.)
- Access logs on document actions
- No raw QP/QIB/tax/bank credentials in ordinary tables
- No Tourify private keys or custody wallets
- Partner webhook signature verification + immutable receipts

## Incident steps

1. Freeze data-room / deals flags if MNPI leak suspected.
2. Rotate webhook secrets; disable unsigned mode.
3. Audit access logs and admin actions.
4. Engage counsel + partners; preserve evidence hashes.
