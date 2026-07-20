# Phase 2 Residual Risks and Pilot Notes

Updated: 2026-07-17

## Residual risks

| Risk | Severity | Mitigation / safe state |
|---|---|---|
| Migrations not applied to production | High until authorized | Additive local migrations only; all flags default off |
| Issuer signing uses HMAC env secret until KMS/Ed25519 wired | Medium | Public verify fails closed without issuer secret; passport issuance flag off |
| C2PA/watermark SDKs stubbed | Medium | Adapters no-op unless modules configured; clean master never modified |
| Sepolia signer/RPC absent | Medium | Anchor worker marks failed/pending; passport remains valid off-chain |
| Agreement templates pending counsel | High for public launch | Template status `pending_counsel`; agreements flag off |
| Contributor org-authority incomplete vs full team matrix | Medium | Owner-scoped RLS + invitation rows; expand with acting-context later |
| Dirty worktree baseline lint/build deferred | Medium | Targeted unit tests green; full CI before rollout |
| Pilot cohort not enrolled | Medium | Synthetic/fixture validation only |

## Pilot checklist

- [ ] Apply additive migrations in staging
- [ ] Enable `music_rights_workspace_enabled` for pilot users only
- [ ] Create project → parties → contributions → claims → agreement → evidence → passport
- [ ] Verify public `/music/verify/passport/[publicId]` redacts private shares
- [ ] Confirm stream/Jukebox/mobile unchanged with flags off and on
- [ ] Confirm DMCA/`content_reports` still operate independently
- [ ] Counsel sign-off on agreement + certification public language
- [ ] Staged flag enable order per execution plan

## Staged rollout order

1. `music_rights_workspace_enabled`
2. `music_contributor_workflows_enabled` / `music_catalog_import_enabled`
3. `music_agreements_enabled`
4. `music_human_origin_v2_enabled`
5. `music_rights_passport_enabled`
6. `music_public_passport_verification_enabled`
7. protection / watermark / training reservation flags
8. `music_testnet_anchor_enabled` (testnet only)
9. `music_rights_ops_enabled`
