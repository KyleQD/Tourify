# Tourify Engineering Execution System

This directory is the canonical, token-efficient execution layer for Tourify development. Existing long-form audits, roadmaps, handoff suites, and historical implementation reports remain valid reference material and are not deleted or rewritten by this system.

## Source-of-truth hierarchy

1. `ENGINEERING_CONSTITUTION.md` — invariant engineering and safety rules.
2. `baselines/<domain>.json` — verified snapshot of what exists at a known commit.
3. `reference-maps/<domain>-reference-map.json` — reusable/reference implementations and reconciliation decisions.
4. `execution/<domain>.json` — canonical task status and acceptance evidence requirements.
5. `phases/<domain>/Pxx.md` — thin phase briefs containing only phase-specific context.
6. `evidence/*.json` — machine-readable proof of completed work.
7. `decisions/DECISIONS.md` — durable architecture decisions that should not be rediscovered.

Historical documents under `docs/` are supporting evidence. They are loaded only when an active task explicitly needs deeper context.

## Operating modes

### Discovery Mode
Use for a new major domain, a materially changed architecture, or when the baseline is no longer trustworthy. Discovery Mode may inspect the full domain: routes, components, APIs, schema, RLS, tests, integrations, reference branches, and dependencies. Its outputs are an updated baseline, reference map, decisions, and execution tasks. Do not repeat Discovery Mode for every phase.

### Execution Mode
This is the default development loop. For an active task batch, load only the Engineering Constitution, relevant baseline entries, relevant reference-map entries, active task records, the thin phase brief, and changed source files/direct dependencies. Then run a drift check, implement the vertical slice, test it, and record evidence. Do not re-audit unaffected systems.

## Audit levels

- **Level 1 — Full forensic audit:** once per major domain or after material architecture drift.
- **Level 2 — Phase audit:** only the subsystem and direct dependencies involved in the current phase.
- **Level 3 — Drift audit:** git diff, schema/migration diff, dependency changes, and new test failures. This is the normal check between implementation passes.

## Reference-build policy

Reference builds are a lookup database, not recurring reading material. Discovery Mode records exact reusable paths and behaviors in the reference map. Execution Mode opens only the referenced files needed by the active task. Reference code is evidence, not automatic source of truth; reconcile it with current architecture, schema, security rules, and working behavior before reuse.

## Progress policy

The execution JSON is the canonical task state. Do not maintain competing status ledgers. Markdown phase briefs describe intent; evidence JSON proves completion. Human-readable completion reports are generated only when requested or when a blocker cannot be represented cleanly in structured files.

## Current pilot

The Work/Work Mode domain is the first migration. Its baseline is anchored to `main` commit `76d8389ebf939cee70f7070abf74a6bacc46f5de` and reconciles against `backup/pre-reconcile-local-work-2026-08-20` at `6039e75679050471e24655f778b2a61a5f634d63`.

Once the Work pilot is validated, use the same structure for Admin, World/Discover, Venue, Artist, Ticketing, and other major domains.