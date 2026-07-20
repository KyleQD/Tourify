# Runbook — Licensing Rollout and Rollback

## Rollout (pilot only after counsel + partners)

1. Apply additive migrations `20260718020000`–`20300`.
2. Keep all `music_licensing_*` flags off until pilot cohort approved.
3. Enable modules independently: availability → briefs → requests → quotes → agreements → delivery → cues/payments.
4. Keep AI / automated pricing / multi-territory direct / broad self-service off without separate approval.
5. Run `npm run music:licensing-outbox-worker` in staging; verify webhook signatures.

## Rollback

1. Set all licensing flags `enabled=false` (instant UX restore to pre-Phase-6).
2. Stop outbox worker; leave tables intact (never reset DB).
3. Do not mutate Phase 2 passports, Phase 3 journals, Phase 4 TA ownership, or Phase 5 NAV rows.
4. Document compensating actions in `music_licensing_audit_events`.
