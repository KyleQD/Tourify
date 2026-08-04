## GitHub deploy structure

- **`ci.yml`** — lint + build on PRs and pushes to `main`
- **`deploy-demo.yml`** — deploys the **demo** Vercel project after CI succeeds on `main` (or manual **Run workflow**)
- **`deploy-production.yml`** — optional; deploys a **separate** production Vercel project (see below)

### Fastest path: one Vercel project, two domains (recommended)

Use this when `demo.tourify.live` and `tourify.live` should show the **same** app build.

1. In **Vercel** → project linked to this repo → **Domains**: add `tourify.live` and `www.tourify.live` (remove them from any old waitlist project first).
2. **Production** env vars in that project: set `NEXT_PUBLIC_SITE_URL` to your canonical URL (`https://tourify.live` or `https://demo.tourify.live`).
3. Keep using **`Deploy Demo`** only; **disable** *Deploy Production* under **Actions** so you do not deploy twice.

No extra GitHub secrets beyond the demo flow.

### Two Vercel projects (demo vs production)

Use this when production is a different Vercel project ID.

**Secrets** (repository):

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Team / user ID |
| `VERCEL_PROJECT_ID` | Demo project (e.g. `demo.tourify.live`) |
| `VERCEL_PROJECT_ID_PRODUCTION` | Production project (e.g. `tourify.live`) |

**Optional repository variable** (Settings → Secrets and variables → Actions → Variables):

| Variable | Value | Effect |
|----------|--------|--------|
| `ENABLE_VERCEL_PRODUCTION_DEPLOY` | `true` | After CI on `main`, **also** run *Deploy Production* automatically |

If that variable is **not** set to `true`, production only deploys when you **Run workflow** manually on *Deploy Production*.

### Supabase (both paths)

In **Authentication → URL configuration**, add redirect URLs for **every** public origin you use (`https://tourify.live/...`, `https://demo.tourify.live/...`, etc.).

### Local check before you push

```bash
npm run verify:ci
```

Uses the same lint + production build as CI (give Node enough memory: already set in the script).
