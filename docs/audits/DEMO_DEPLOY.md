# Demo deploy gap — music-trust routes (Wave 5)

**Finding evidence:** `docs/audits/demo-probe.json` recorded `/licensing`, `/institutional`, `/cooperative` as **404** on `https://demo.tourify.live` while those App Router pages exist locally under `app/`.

## Probe (2026-07-18)

| Host | Path | Result |
|------|------|--------|
| `https://demo.tourify.live` | `/licensing` | HTTP 404 (`x-matched-path: /404`) |
| `https://tourify.live` | `/licensing` | HTTP 404 (same lag class) |
| Local / current branch | `app/licensing/page.tsx` etc. | Present |

Affected readiness shells that need a deploy after merge:

- `/licensing`, `/licensing/projects/[id]`
- `/institutional`, `/institutional/opportunities`
- `/cooperative`, `/federation`, `/creator-commons`
- `/protocol-constitution`, `/public-infrastructure`
- `/rights-admin`, `/rights-intelligence`
- `/music/verify/*` (also needs public-share middleware from remediation sprint 3)
- `/artist/music/marketplace` (+ portfolio)

## Vercel linkage check (do not blind-deploy)

Repo `.vercel/project.json` links to:

| Field | Value |
|-------|-------|
| Project | `tourify-beta-k2` (`prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`) |
| Latest production URL (CLI) | `https://tourify.live` |

`npx vercel --prod` from this checkout therefore targets **`tourify.live` production**, not a dedicated `demo.tourify.live` project alias. Wave 5 **did not** run a production deploy: the working tree has large unrelated WIP, and demo vs prod domain mapping is not confirmed safe for a forced ship.

## Recommended deploy steps (manual)

1. Confirm which Vercel project / domain alias serves `demo.tourify.live` (Dashboard → Domains). If demo is a separate project or a preview alias, deploy **that** target — do not assume `tourify-beta-k2` prod.
2. Merge or cherry-pick the music-trust App Router pages + middleware public-share updates onto the branch that demo tracks.
3. Deploy with an explicit production/preview intent:
   - Preview: `npx vercel` (no `--prod`) and verify the preview URL.
   - Demo alias: attach the deployment to `demo.tourify.live` in Vercel Domains / project settings.
   - Only then promote to prod if intended.
4. Re-probe: `curl -sI https://demo.tourify.live/licensing` → expect **200** (or auth redirect), not `/404`.
5. Refresh `docs/audits/demo-probe.json` after a successful deploy.

## Status for audit remediation

| Item | Status |
|------|--------|
| Code present locally | Yes |
| Documented deploy gap | Yes — this file |
| Production / demo deploy executed in Wave 5 | **No** (unsafe without domain confirmation + clean release branch) |
