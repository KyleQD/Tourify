# Runbook — Rights Admin Rollout and Rollback

## Rollout (pilot only after counsel + partners + written mandates)

1. Apply additive migrations `20260718030000`–`30300`.
2. Keep all `music_rights_admin_*` flags off until pilot cohort approved.
3. Enable modules independently: mandates → cases → registration → usage/claims → enforcement/DMCA → settlements.
4. Keep automated submission / auto-takedown / litigation off without separate approval.
5. Run `npm run music:rights-admin-outbox-worker` in staging; verify webhook signatures.

## Rollback

1. Set all rights-admin flags `enabled=false` (instant UX restore to pre-Phase-7).
2. Stop outbox worker; leave tables/evidence intact (never reset DB).
3. Do not mutate Phase 2 passports, Phase 3 journals, Phase 4–6 source records.
4. Document compensating actions in `music_rights_admin_audit_events`.
