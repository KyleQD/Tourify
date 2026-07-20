# West Coast Tour Flow — Orchestrator

Coordinate the multi-agent campaign for Pacific Signal + West Coast Touring Co.

## Prerequisites

1. Dev server: `npm run dev` (or `QA_BASE_URL` pointing at a live app)
2. Env: `QA_FLOW_*` credentials in `.env.local` (see `.env.example`)
3. Seed cast: `npm run qa:seed:flow`
4. Bootstrap scenario: `npm run qa:seed:flow:scenario`
5. Artifacts:
   - `docs/audits/qa-flow-accounts.json`
   - `docs/audits/qa-flow-scenario.json`

## Execution order

1. Confirm seed + scenario succeeded (tourId, 3 jobs, 3 hire tokens present).
2. Run agent **01-artist-band** (verify personas + band roster).
3. Run agent **02-org-tour-admins** (org, tour, artist tour admins).
4. Run agent **03-org-jobs-hire** (jobs → apply/approve path → hire tokens).
5. Run agent **04-org-tour-plan** (10-city logistics, hotels, budget, shifts, band schedule).
6. Aggregate notes using **05-ux-notes** into `docs/audits/flow-notes/`.
7. Fix any P0/P1 blockers found; re-run failed stages.
8. Smoke: `npm run qa:flow:clickthrough`

## Pass criteria

- [ ] 3 artists on Pacific Signal roster (`status=accepted`)
- [ ] Org owns tour with 10 stops
- [ ] Artists 1–3 are tour team `admin`
- [ ] 3 jobs published with 3 different onboarding templates
- [ ] Each worker can open `/onboarding/hire/[token]` authenticated
- [ ] Tour settings include lodging, budget, band_schedule
- [ ] UX notes filed for every friction (even if fixed)

## Outputs

| Artifact | Path |
|----------|------|
| Cast IDs | `docs/audits/qa-flow-accounts.json` |
| Scenario | `docs/audits/qa-flow-scenario.json` |
| UX notes | `docs/audits/flow-notes/*.md` |
| Summary | `docs/audits/flow-notes/SUMMARY.md` |

## Fix policy

- P0 (blocks flow): fix in-repo immediately, re-seed if schema needed
- P1 (severe UX): fix or stub minimum path in same campaign
- P2+: document in UX notes only
