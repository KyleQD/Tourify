# Tourify Engineering Constitution

These rules are invariant across Tourify implementation work. Phase prompts should reference this file instead of repeating these rules.

## 1. Preserve production data and behavior

- Use additive migrations by default.
- Never reset, truncate, reseed, or destructively rebuild Supabase to implement a feature.
- Preserve existing production data, identifiers, URLs, permissions, and working user flows unless an explicit migration plan says otherwise.
- Separate pre-existing defects from regressions introduced by the current task.

## 2. Reuse before replacement

- Identify the canonical route, component, service, table, and permission boundary before creating a replacement.
- Prefer extraction, composition, adapters, and incremental refactors over parallel systems.
- Do not duplicate a domain model because a reference build has a different shape.
- Reference builds are evidence and reuse candidates, not automatic source of truth.

## 3. Database and authorization safety

- Preserve and extend RLS deliberately; do not bypass it to make UI work.
- Never expose service-role credentials to clients.
- Never hard-code user, organization, venue, artist, event, tour, job, assignment, or tenant IDs.
- Verify ownership and authorization server-side for mutations and sensitive reads.
- Record proposed tables or migrations as proposals until their need is verified against the live/current schema.

## 4. Canonical Work-domain rules

- `employment_assignments` is the canonical post-hire worker assignment relationship unless a verified architecture decision supersedes it.
- Existing messaging, notifications, jobs, staffing, tours, events, documents, and account-context systems must be reused where they already provide the required capability.
- Work Mode is a transient operational context for a general user, not a separate account type, unless an explicit future product decision changes that model.

## 5. UI/UX completion standard

A user-facing feature is not complete because its happy-path UI renders. Address, where applicable:

- loading;
- empty;
- partial-data;
- error;
- offline/retry;
- forbidden/permission;
- destructive-action confirmation;
- mobile/responsive behavior;
- accessibility and keyboard behavior;
- real data rather than placeholder-only data.

## 6. Testing and evidence

- Add characterization tests before risky refactors when working behavior is not already protected.
- Run targeted tests for the changed subsystem before broader gates.
- Run typecheck/build/appropriate integration tests at phase or release gates, not after every tiny task when that would duplicate effort.
- A task may be marked `verified` only when its acceptance criteria have evidence.
- Store machine-readable evidence under `docs/engineering/evidence/`; do not rely on narrative completion claims alone.

## 7. Execution discipline

- Discovery Mode performs broad audits and creates/refreshes baselines.
- Execution Mode is the default: load only relevant baseline entries, reference-map entries, active tasks, thin phase context, git/schema drift, and affected code.
- Do not repeat a full-system audit if the baseline remains trustworthy.
- Batch tightly coupled tasks so code is inspected once, implemented once, and tested once.
- Do not restate the entire task or reproduce source documents unless the user explicitly requests a report.

## 8. Tracking discipline

- `docs/engineering/execution/*.json` is the canonical task-status source.
- Evidence files prove completion; phase briefs provide only unique phase context.
- Existing long-form audits and handoffs remain reference material and must not become competing progress trackers.
- When a durable architecture choice is made, record it in `docs/engineering/decisions/DECISIONS.md` so it is not rediscovered repeatedly.

## 9. Stop conditions

Stop and record a blocker instead of fabricating progress when:

- required schema or permissions cannot be verified;
- a migration could destroy or ambiguously transform production data;
- two canonical systems conflict and the correct owner cannot be established;
- tests demonstrate a regression that cannot be safely resolved within the active task scope;
- credentials, environment access, or external dependencies required for verification are unavailable.

## 10. Definition of Done

A phase is complete only when all required tasks are `verified`, required tests/gates have passed or have explicitly documented pre-existing failures, migrations are additive and reviewed, authorization has been checked, and the evidence file contains the changed files, tests, migrations, decisions, regressions, and unresolved blockers.