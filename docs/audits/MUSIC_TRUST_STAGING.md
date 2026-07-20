# Music-trust staging enablement matrix (AUD-0106)

**Status:** Production keeps ~180 music-trust / marketplace / rights flags **default off**.  
**Do not** flip the full set on in production. Staging may enable **named cohorts** only.

Canonical inventory: `docs/audits/music-trust-flags.json` (`totalFlags: 180`).

## Default production posture

| Rule | Detail |
|------|--------|
| Resolver fallback | Every `DISABLED_*` map in `lib/music/**/**-flags.ts` resolves `false` when `feature_flags` is empty or errors |
| Exception | `music_public_verification_enabled` defaults **on** in `lib/music/music-trust-flags.ts` so `/music/verify/*` can serve public readiness |
| UI | Readiness shells render with sandbox disclaimers + **Flag off** empty-state notes |
| Nav | Artist marketplace entry on `/artist/music` appears only when marketplace flags resolve true |

## Environments

| Env | Enablement | Notes |
|-----|------------|-------|
| **production** (`tourify.live` / prod DB) | Keep defaults | No bulk SQL enable. Public verify only |
| **staging / preview** | Selective rows in `feature_flags` | Use modules below; keep hard-disabled kill switches off |
| **local** | Optional seed / SQL | Same keys as staging; never commit enabled production seeds |

Flags are **not** primarily env-vars. They live in Supabase `feature_flags` (`key`, `enabled`, `rollout_percentage`). Env only configures which Supabase project the app reads.

Optional env documentation (no runtime flip):

```bash
# .env.local / staging — documentation only; flags are DB-backed
# MUSIC_TRUST_STAGING_COHORT=readiness   # see cohorts below
NEXT_PUBLIC_SITE_URL=https://your-staging-host.example
```

## Staging cohorts (safe enable sets)

Enable **one cohort at a time**. Prefer `enabled=true` with `rollout_percentage` 0–25 for first soak, then 100.

### Cohort A — Public verify + artist trust UX

| Key | Staging | Production |
|-----|---------|------------|
| `music_public_verification_enabled` | on | on (default) |
| `music_trust_upload_fields_enabled` | optional | off |
| `music_origin_processing_enabled` | optional | off |
| `music_certification_requests_enabled` | optional | off |
| `music_certification_admin_review_enabled` | optional | off |
| `music_human_only_public_gate_enabled` | optional | off |

### Cohort B — Marketplace issuer / investor (discoverability)

| Key | Staging | Production |
|-----|---------|------------|
| `music_marketplace_offerings_enabled` | optional | off |
| `music_marketplace_investor_portal_enabled` | optional | off |
| `music_marketplace_subscriptions_enabled` | keep off until B stable | off |
| `music_marketplace_transfers_enabled` | keep off | off |
| `music_marketplace_secondary_sync_enabled` | keep off | off |
| `music_marketplace_tokenization_enabled` | **hard keep off** | off |
| `music_marketplace_admin_ops_enabled` | ops-only staging | off |

When B is on, `/artist/music` shows the marketplace link (via `/api/music-marketplace/flags`).

### Cohort C — Licensing / institutional readiness

Enable the matching `music_licensing_*` / `music_institutional_*` readiness flags only. Keep payment, DDEX, automated pricing, and multi-territory direct flags off until partner dry-runs pass.

### Cohort D — Rights admin / intelligence sandboxes

Enable read/education/consent flags first. Keep automated submission, auto-takedown, litigation, external negotiation, and collective licensing **off**.

### Cohort E — Cooperative / federation / commons / constitution / public infra

Enable `*_readiness_enabled` and public-status stubs only. Keep irreversible transfer, tokenized identity, universal identifier, global mandate, collective action, and fork-continuity production flags **off**.

## Example staging SQL (single key)

```sql
insert into public.feature_flags (key, enabled, rollout_percentage)
values ('music_marketplace_offerings_enabled', true, 25)
on conflict (key) do update
set enabled = excluded.enabled,
    rollout_percentage = excluded.rollout_percentage;
```

## Sandbox disclaimers

Readiness pages and APIs must keep partner / non-fiduciary / no-liquidity disclaimers even when flags are on. Flag-on never implies production securities, CMO, or custody authority.

## Related docs

- Deploy lag for music-trust routes on demo: `docs/audits/DEMO_DEPLOY.md`
- Flag inventory: `docs/audits/music-trust-flags.json`
- Remediation tracker: `docs/audits/REMEDIATION_STATUS.md`
