# Agent 03 — Jobs, approval, hire onboarding

## Actors

| Key | Env | Job |
|-----|-----|-----|
| Org | `QA_FLOW_ORG_*` | Posts / manages hiring |
| Worker1 | `QA_FLOW_WORKER_1_*` | Tour Stagehand |
| Worker2 | `QA_FLOW_WORKER_2_*` | Tour Security Guard |
| Worker3 | `QA_FLOW_WORKER_3_*` | Tour Bartender |

Read `docs/audits/qa-flow-scenario.json` → `jobs[].hirePath` and template names.

## Org checklist

1. Login as Org → `/admin/dashboard/hiring`
2. Confirm employer scope resolves (not MissingScope empty state)
3. Confirm three published jobs for the tour, each with a different onboarding template
4. Open Applications / Onboarding tabs; confirm candidates for workers exist
5. If posting manually (no bootstrap): `/admin/dashboard/jobs/new` with `onboarding_template_id` set; publish

## Worker checklist (each worker)

1. Login as worker → `/dashboard`
2. Open hire URL from scenario: `/onboarding/hire/{token}` (do **not** use `/onboarding/{token}`)
3. Complete onboarding modules required by the template
4. Confirm progress saves; note any dead ends

## Bootstrap bypass

Scenario seed mints `staff_invitations.token` + `staff_onboarding_candidates` so email/SendGrid is not required. Tokens are in `qa-flow-scenario.json`.

## Template mapping (preferred → fallback)

| Job | Preferred | Fallback |
|-----|-----------|----------|
| Stagehand | General Staff | New Staff |
| Security | Security Guard | Security |
| Bartender | Bartender | Volunteers / Media |

## UX notes

Log to `docs/audits/flow-notes/03-org-jobs-hire.md`.

Watch for:

- MissingScope on hiring hub without acting org
- Template picker unclear on job create
- Platform `/onboarding` vs hire-token confusion
- Invite email dependency in non-seeded paths
