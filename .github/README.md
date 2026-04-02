## Fresh GitHub Deploy Structure

This repo uses a clean two-workflow setup:

- `ci.yml`: lint + build checks for PRs and pushes to `main`
- `deploy-demo.yml`: deploys to `demo.tourify.live` only after `CI` succeeds on `main` (or manual dispatch)

### Required GitHub Secrets

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Required Vercel Setup

- Connect this GitHub repo to the demo Vercel project.
- Add the custom domain `demo.tourify.live` to that Vercel project.
- Set all required runtime environment variables in Vercel.

### Recommended Branch Protection For `main`

- Require pull requests before merging.
- Require status checks to pass before merging.
- Select `Lint And Build` from the `CI` workflow as a required check.
- Restrict direct pushes to `main` unless explicitly needed.
