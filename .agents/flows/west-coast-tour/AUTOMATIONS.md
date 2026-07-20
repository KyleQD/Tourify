# Cursor Automations drafts

Finish these in the **Agents Window** Automations editor (this chat session has no Automations editor handoff tool).

Open Agents Window → Automations → create from the tables below. Repo prompts live under `.agents/flows/west-coast-tour/` (commit + push before referencing file paths in automation instructions, or paste the prompt text inline).

---

## 1. Tourify Flow — Seed & Smoke

| Field | Value |
|-------|-------|
| Name | Tourify Flow — Seed & Smoke |
| Description | Seeds the 7-account cast + scenario, then runs Playwright click-through |
| Trigger | Manual (or daily schedule) |
| Tools | Shell / terminal, repo checkout |
| Instructions | See prompt below |
| To finish in editor | Confirm repo/branch; ensure `QA_FLOW_*` + Supabase keys available to the runner |

**Prompt / instructions:**

```
You are running the Tourify West Coast tour flow smoke.

1. Ensure the app can reach QA_BASE_URL (start npm run dev if local).
2. Run: npm run qa:seed:flow
3. Run: npm run qa:seed:flow:scenario
4. Run: npm run qa:flow:clickthrough
5. If failures, open the West Coast flow orchestrator runbook and file UX notes under docs/audits/flow-notes/.
6. Summarize pass/fail counts and link artifact paths (qa-flow-accounts.json, qa-flow-scenario.json).
```

---

## 2. Tourify Flow — Org Planner

| Field | Value |
|-------|-------|
| Name | Tourify Flow — Org Planner |
| Description | Org persona verifies tour admins and completes 10-city planning checklist |
| Trigger | Manual |
| Tools | Browser, shell |
| Instructions | Follow org tour-admins then org tour-plan runbooks |
| To finish in editor | Bind browser tool; confirm QA_FLOW_ORG credentials |

**Prompt / instructions:**

```
Login as the West Coast Touring Co org QA user (QA_FLOW_ORG_*).
Read docs/audits/qa-flow-scenario.json for tourId and URLs.
Execute the checklists for granting tour admins and completing the 10-city West Coast plan
(route, lodging, budget, crew shifts, band schedule).
Write findings to docs/audits/flow-notes/02-org-tour-admins.md and 04-org-tour-plan.md.
Fix P0/P1 product blockers in-repo when clear and small; otherwise document only.
```

---

## 3. Tourify Flow — Hire Loop

| Field | Value |
|-------|-------|
| Name | Tourify Flow — Hire Loop |
| Description | Org hiring hub + three workers complete hire-token onboarding |
| Trigger | Manual |
| Tools | Browser, shell |
| Instructions | Follow org jobs/hire runbook |
| To finish in editor | Bind browser; confirm worker + org credentials |

**Prompt / instructions:**

```
Read docs/audits/qa-flow-scenario.json for hirePaths.
Run the hire loop for Org and Workers 1–3.
Each worker must open /onboarding/hire/{token} (not legacy /onboarding/{token}).
Write notes to docs/audits/flow-notes/03-org-jobs-hire.md.
```

---

## Handoff checklist

- [ ] Open Automations editor from Agents Window
- [ ] Create the three automations above
- [ ] Attach this repo + branch (after committing flow files)
- [ ] Ensure secrets / `.env.local` available to the runner
- [ ] Run Seed & Smoke once manually to verify
