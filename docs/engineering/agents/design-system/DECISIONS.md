# Design System decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DESIGN-001 — Reconciled canonical shared contracts

- Date: 2026-09-10
- Status: accepted
- Task: DESIGN-001 / DESIGN-002 / DESIGN-003
- Decision: `hooks/use-mobile.ts` is the canonical shared responsive hook. The shared
  state contracts are `components/ui/empty-state.tsx`, `error-state.tsx`, and
  `skeleton.tsx`; domain wrappers may remain only while an owning-agent adoption task is
  active.
- Evidence: `docs/engineering/tasks/completed/DESIGN-002.json`,
  `docs/engineering/tasks/completed/DESIGN-003.json`,
  `__tests__/design-system/shared-state-primitives.test.tsx`.
- Consequences: new shared callers use the canonical contracts; the remaining venue/admin
  copies and domain state implementations are migration debt, not new primitives.

## DESIGN-002 — Generated maps are navigation evidence only

- Date: 2026-09-10
- Status: accepted
- Task: DESIGN-001
- Decision: Use refreshed generated route/component/API/database/integration maps to locate
  design-system callers and dependencies, but verify behavior in source, migrations, tests,
  or runtime evidence.
- Evidence: `docs/engineering/generated/README.md`, refreshed maps at SHA
  `7cf660ad8422dbd3adbdb77369d94638cdc2231b`.
- Consequences: generated counts in the baseline are context, not claims that the
  design-system agent owns routes, API handlers, or database objects.

## DOMAIN-001 — A zero-importer claim requires a second, different extraction path

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-034 / Wave 34
- Decision: A count of importers is not evidence that a module is unused. Before any
  deletion, the zero-importer claim is re-proven by a **different** method than the one
  that produced it: an import graph is built by resolving every `import`/`export … from`,
  dynamic `import()`, `require()` and bare side-effect import across all 5,640 source
  files with extensionless, `/index`, alias and relative resolution; then a second pass
  extracts every quoted import specifier in the repository with `rg -o` and resolves
  only root-anchored spellings; then an exhaustive `rg -F` sweep runs over **every** file
  type including docs, JSON manifests, SQL, `.txt` checklists and logs, for both the
  filename and the bare module stem.
- Evidence: `.agents/tmp/lib-services-inventory.mjs` (graph walk),
  `.agents/tmp/crosscheck-specifiers.mjs` (independent specifier extraction),
  `.agents/tmp/ref-sweep.mjs` (exhaustive repository sweep). All 22 claimed
  zero-importer modules survived all three passes.
- Consequences: the Wave 34 brief's "60 objects, 28 live" for the `library` cluster was
  **not** used; the artifact of record said 48 objects / 16 live, and the artifact won.
  The same rule applies to any count handed to a lane, including a count produced by a
  peer lane in the same wave.

## DOMAIN-002 — Zero-importer is necessary but not sufficient for deletion

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-034 / Wave 34
- Decision: Three classes of module are **not** deletable on a zero-importer proof alone,
  and each needs a different resolution:
  1. **Test-asserted source contracts.** A test may `readFileSync` the module and assert
     on its text rather than import it. `lib/services/organization-social-integrations.service.ts`
     is pinned by `__tests__/admin/content-hub.test.ts:216` and
     `lib/services/social-interactions.service.ts` by
     `__tests__/social/profile-follow-route.test.ts:151`. Both are zero-importer, both
     are held. An import-graph sweep alone would have silently broken two test suites.
  2. **Dead importers owned by another lane.** If every importer is unreachable but
     lives outside the current grant, deleting the module trades its diagnostics for a
     new `TS2307` in a file this lane does not own. That is a net loss, so it is a
     handoff naming the exact dead importer and its owner. Twelve modules are in this
     state; `lib/services/mfa.service.ts` (40 measured diagnostics) is the largest.
  3. **Zero-diagnostic, domain-owned, concurrently in flight.** `venue-scheduling.service.ts`
     and `venue-roles-permissions.service.ts` are zero-importer **and** type-clean.
     Deleting them while the venue lane runs in the same wave risks a collision for
     exactly zero diagnostic gain, so they are deferred to the venue lane.
- Evidence: `docs/engineering/agents/design-system/lib-services-inventory-2026-09-25.json`
  (disposition `held`, `held-pending-owner`, `deferred to venue lane`),
  handoffs `HF-DESIGN-034-TEST-ASSERTED-MODULES`, `HF-DESIGN-034-DEAD-IMPORTER-OWNERS`,
  `HF-DESIGN-034-VENUE-DEFERRED`.
- Consequences: every module carries **exactly one** disposition and a per-file reason
  string, and the regression test asserts a module importing a non-resolving
  `lib/services` path fails the suite. A guard nobody has ever seen fail is not a guard,
  so its negative control is run and recorded.

## DOMAIN-003 — Repoint only onto a named object; never invent one to silence a diagnostic

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-034 / Wave 34
- Decision: A type-drift fix is a repoint **only** when the repository already names the
  canonical destination and that destination exists in the active chain or the generated
  contract. The design-system lane does not author schema, does not edit
  `lib/database.types.ts` or any `types/**` file, does not resurrect an archived object,
  and does not choose a new home for an object that has none. Where no destination is
  recorded, the correct action is a handoff naming the object and the consumer `file:line`.
- Evidence: one repoint was made — `lib/services/staff-onboarding.service.ts`,
  `venue_profiles.name` → `venue_profiles.venue_name`, using the database lane's recorded
  `canonicalReplacement`, independently confirmed against `lib/database.types.ts`
  (`venue_profiles.Row` carries `venue_name` and no `name`) and
  `supabase/migrations/20260721120000_venue_profiles_url_slug.sql:5`. Measured 4 → 2
  primary diagnostics. **50** objects still reference `lib/services` and **28** have
  `canonicalReplacement: null`; all 28 are handed off, none repointed.
  `hiring_candidates` and the three `user_mfa_*` tables were confirmed to have no
  `CREATE TABLE` in the active chain, in any archive, in any backup, or in any script.
- Consequences: colliding objects (`staff_applications`, `staff_jobs`, `user_skills`,
  `artist_merchandise`) are handled by each lane repointing only its own files. This lane
  removed its own references to the first two by deletion and explicitly declined to
  repoint the latter two, whose live consumers have no recorded destination.

## DOMAIN-004 — Measure drift reduction with scoped tsc, and label it as scoped

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-034 / Wave 34
- Decision: In a multi-lane wave where a full `npm run typecheck` is prohibited and
  OOM-prone, the sanctioned substitute is a **scoped** tsc: a generated per-run
  `tsconfig.ds-scope.json` whose `include` is exactly the named roots, inheriting the
  repository's own `compilerOptions`. Every reported reduction must be a counted
  primary-diagnostic line from such a run, and each run must record `tsFilesParsed` so a
  short-circuiting invocation cannot be mistaken for a clean one. A scoped figure is
  never presented as a whole-repo total.
- Evidence: `.agents/tmp/scope-typecheck.mjs`. It produced the 211-diagnostic figure
  (209 from the 15 deleted files, 2 from the repoint) and proved no diagnostic migrated
  into surviving files: the three modules the work lane named
  (`venue.service.ts`, `artist.service.ts`, `account-management.service.ts`) measured 29
  primary diagnostics before the deletion and 29 after, with an identical `byCode`
  distribution. The work lane's "29+ pre-existing errors, pristine at HEAD" is confirmed
  at 29.
- Consequences: the 1,384-diagnostic whole-repo baseline is **still unmeasured** and must
  be re-measured by a lane that can afford a full run. A peer lane's
  `tscDiagnosticHits` figure is per-object and overlapping by construction (tsc repeats
  the rejected literal inside the printed overload union) and is never summed.

## DOMAIN-005 — An implementing lane is never the accepting lane for its own gate

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-033
- Decision: An owner-gated change is not gated until the owner's decision is recorded
  somewhere the implementing lane did not author. Asserting the approval inside the
  implementing lane's own token registry, inventory, STATE and task record is circular
  evidence, however confident the wording. The design-system lane does not self-approve
  C-03 or any equivalent gate.
- Evidence: `--radius: 0.5rem` is at `app/globals.css:76` and is **committed at HEAD**
  (`git status --porcelain -- app/globals.css tailwind.config.ts` is empty), re-verified
  by a scoped `tailwindcss v3.4.17` build emitting `var(--radius)`,
  `calc(var(--radius) - 2px)` and `calc(var(--radius) - 4px)` verbatim for 8/6/4px, with
  `.staff-scheduling-prototype` unchanged at 0.625rem/10px. Yet
  `rg -n 'C-03|--radius|rounded-lg' docs/engineering/DECISIONS.md` returns **zero**
  matches and `HF-DESIGN-033-QA` has been `pending` since 2026-09-13T19:40:00Z with no
  acceptance. Every affirmative statement about the owner's approval is a document this
  lane wrote. Routed as `HF-DESIGN-034-C03-APPROVAL-PROVENANCE`.
- Consequences: owner-gated decisions in this domain get a `docs/engineering/DECISIONS.md`
  entry with a named approver and a date. If the owner did **not** approve, the lane
  reverts `--radius: 0.5rem` — a one-line change with the same ~3,068-usage blast radius
  in the opposite direction — which needs the same explicit decision. Either way, DESIGN-033
  stays `active`; it does not close on self-attestation.

## DOMAIN-006 — An empty acceptance_criteria list is a pass claim with nothing behind it

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-036
- Decision: A task may not carry `verification.result: "passed"` while
  `acceptance_criteria` is empty or `last_run_at` is null. Write the criteria down, mark
  each MET / NOT MET with the reason, and only then record a result.
- Evidence: DESIGN-036 carried `result: "passed"`, `last_run_sha: null`,
  `last_run_at: null`, an empty `acceptance_criteria` array and a single evidence
  sentence. Writing the criteria from its own goal — "navigation, scope, attention,
  readiness, source-health, loading, empty, and error" — immediately showed that
  **navigation and scope do not exist** in
  `components/admin/logistics/command-center/`. Six of eight families are delivered
  (attention, readiness, source-health, summary, loading, empty, error) and
  test-guarded by 5 real accessibility assertions; the scope UI is a one-off
  `components/admin/logistics/logistics-scope-bar.tsx` outside the set, unexported from
  the barrel, untested, and mid-edit by the admin lane. There is no navigation primitive
  at all. Both missing families would have to be written under `components/admin/**`,
  which this wave's grant excludes.
- Consequences: DESIGN-036 stays `active` and records the gap rather than claiming a pass.
  The 200% zoom and show-day mobile review is handed to QA-007 as
  `HF-DESIGN-036-QA-EVIDENCE` instead of being left as a prose next step with no
  trackable owner. When the admin lane adds the two patterns, this lane extends the
  pattern test the same way the other six are covered.
