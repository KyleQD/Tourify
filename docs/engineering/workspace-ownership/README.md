# Workspace ownership evidence

`manifest.json` is a generated, path-level inventory of the shared dirty
worktree. It is routing evidence for ORCH-002, not permission to delete, move,
restore, commit, or otherwise curate any path.

Generate it with:

```bash
node scripts/agent-tools/generate-workspace-ownership.mjs
```

The manifest records every row from `git status --porcelain=v1 -z
--untracked-files=all`, including staged and unstaged state. Each row receives:

- a candidate domain owner from deterministic path rules;
- exact task ownership when the path itself names a task record;
- otherwise the non-completed task IDs for the candidate owner;
- an explicit `unresolved` status when the path cannot be routed safely;
- a null deletion explanation until a task owner supplies durable evidence.

Candidate mappings are deliberately conservative. They must be confirmed by
the owning domain before an atomic commit plan or release branch is created.
In particular, a candidate task list does not mean every listed task owns the
path. A clear domain path may be `candidate` with an empty task list when that
domain has no non-completed task; this remains routing evidence, not task
acceptance.

## Credential-pattern scan

The generator performs a bounded scan of current changed text files for high
signal credential categories. It writes only the path and rule category; it
never writes or prints a matched value. The latest scan found zero matches.

The following inputs are excluded and counted in the manifest:

- generated activation and G1 evidence directories;
- dependency and Git internals;
- binary/generated media;
- lockfiles;
- missing/deleted paths;
- files larger than 1 MB or files detected as binary.

Zero findings is not a release-grade secret-scan attestation because excluded
content and Git history are not scanned. A release candidate still requires an
approved full scanner over the curated branch and history.

## Snapshot history

Initial 2026-09-18 snapshot:

- Worktree entries: 1,351
- Candidate-owned: 973
- Exact task-record paths: 121
- Unresolved: 257
- Deletions without an evidence-backed explanation: 34
- Credential-pattern findings: 0

Refined 2026-09-18 snapshot:

- Worktree entries: 1,352
- Candidate-owned: 1,220
- Exact task-record paths: 121
- Unresolved: 11
- Deletions without an evidence-backed explanation: 34
- Credential-pattern findings: 0
- Scan exclusions: 48 generated-evidence, 34 missing/deleted, 1 generated
  binary, and 1 lockfile

The refined rules use documented domain working sets, active task evidence,
legacy specialist-ledger ownership, and unambiguous path families. The 11
remaining paths intentionally span ambiguous boundaries: logistics/site-map
(admin, venue, and work), event actions/references/attendance (database,
discover, and social), platform error/upload infrastructure, the deleted root
provider, the cross-domain site-map access helper, and hand-authored shared
database view models.

Adjudicated 2026-09-18 snapshot:

- Worktree entries: 1,355
- Candidate-owned: 1,230
- Exact task-record paths: 121
- Unresolved: 4
- Deletions without an evidence-backed explanation: 33
- Credential-pattern findings: 0
- Scan exclusions: 48 generated-evidence, 34 missing/deleted, 1 generated
  binary, and 1 lockfile

Seven of the 11 cross-domain paths now carry exact evidence in the manifest:
ADMIN-003 owns the logistics guard/version contracts and the site-map access
helper; WORK-003 owns the event-zone bridge contract; TICKET-005 owns the
attending endpoint backed by the ticketing guest-list service; DESIGN-030 owns
the deleted zero-importer root provider; and the database domain owns the
hand-authored view-model contract by its recorded schema-type decision.

Four paths remain unresolved, with the decision needed stored alongside each
manifest entry:

- `app/api/analytics/errors/route.ts`: choose release observability,
  integrations resilience, or a platform-operations owner.
- `app/api/events/_lib/event-reference.ts`: name an event-contract owner for
  the resolver shared across work, ticketing, social, payment, and public
  event routes.
- `app/api/upload/signed-url/route.ts`: choose general-user security,
  integrations/storage, or the product domain that owns its caller contract.
- `app/events/_actions/event-actions.ts`: name the owner for organization-
  scoped event, calendar, and hold mutations.

Only `app/providers.tsx` received a deletion explanation in this pass. The
completed DESIGN-030 record explicitly documents its zero-importer and
zero-symbol checks; the other 33 deletions remain unexplained.

The next curation pass must obtain owner confirmation for candidate mappings,
decide the four cross-domain handoffs, and collect evidence-backed explanations
for the other 33 deletions before any cleanup or atomic commit sequencing
begins.

Sixth-batch 2026-09-18 snapshot:

- Worktree entries: 1,358
- Candidate-owned: 1,234
- Exact task-record paths: 121
- Unresolved: 3
- Deletions without an evidence-backed explanation: 33
- Credential-pattern findings: 0

`app/api/analytics/errors/route.ts` now routes to release / RELEASE-003. The
release charter directly owns production observability, and RELEASE-003 owns
web error monitoring, elevated-error alerts, release metadata, and staging
soak evidence. The remaining three paths deliberately stay unresolved:

- `app/api/events/_lib/event-reference.ts` needs a designated event-contract
  owner; DB-006 explicitly excludes its legacy/artist-events compatibility
  behavior pending identifier and authorization mapping.
- `app/api/upload/signed-url/route.ts` has zero callers per the security audit;
  an authorized curation decision must either retire it or name a tested
  general-user/storage consumer to adopt it.
- `app/events/_actions/event-actions.ts` needs an event-lifecycle owner. The
  organization and database charters cover tenant context and schema integrity
  respectively, but neither charter or active task owns this complete event,
  calendar, and hold mutation surface.

Candidate confirmation, these three ownership decisions, and evidence-backed
explanations for the other 33 deletions remain prerequisites for curation.

Wave-7 deletion-evidence snapshot, 2026-09-18:

- Worktree entries: 1,362
- Candidate-owned: 1,238
- Exact task-record paths: 121
- Unresolved: 3
- Deletions without an evidence-backed explanation: 25
- Credential-pattern findings: 0

Eight deletions were explained from explicit completed-task records, reducing
the unexplained count from 33 to 25:

- DESIGN-030 Phase 3: the three deleted provider duplicates under
  `components/venue`, `app/venue/components`, and
  `app/admin/dashboard/components` had recorded negative module-path, symbol,
  and barrel checks.
- DESIGN-030 Phase 5: the four deleted CSS roots under `app/venue`,
  `app/admin/dashboard/components/styles`, `styles`, and `styles/venue` had
  recorded zero-importer checks, live replacement verification for their
  classes/tokens, and preserved authored-value provenance.
- DESIGN-002: `components/ui/use-mobile.tsx` was explicitly retired after
  static import verification in favor of canonical `hooks/use-mobile.ts`.

The pass was capped at eight deletions. No reason was inferred for the other
25, and no deletion, restoration, cleanup, or source edit occurred.

Wave-8 deletion-evidence snapshot, 2026-09-18:

- Worktree entries: 1,365
- Candidate-owned: 1,241
- Exact task-record paths: 121
- Unresolved: 3
- Deletions without an evidence-backed explanation: 17
- Credential-pattern findings: 0

This different eight-path subset also has explicit completed-task evidence:

- DESIGN-002 records `hooks/use-mobile.tsx` as a verified duplicate retired in
  favor of canonical `hooks/use-mobile.ts` after static import checks.
- DESIGN-029 records `alert-dialog`, `alert`, `aspect-ratio`, `avatar`,
  `carousel`, `context-menu`, and `drawer` under `components/venue/ui/` as
  compatibility twins retired under CP-037 after per-file parity review,
  per-file and aggregate zero-consumer checks, and barrel checks. The task
  explicitly preserves the documented `avatar` data-slot divergence in its
  disposition evidence.

The pass was capped at eight. The remaining 17 deletions retain null
explanations until their explicit task or decision evidence is recorded.

Wave-9 deletion-evidence snapshot, 2026-09-18:

- Worktree entries: 1,368
- Candidate-owned: 1,244
- Exact task-record paths: 121
- Unresolved: 3
- Deletions without an evidence-backed explanation: 9
- Credential-pattern findings: 0

Eight additional DESIGN-029 venue UI twins now carry the task's explicit
CP-037 retirement evidence: `dropdown-menu`, `form`, `hover-card`, `input-otp`,
`menubar`, `navigation-menu`, `pagination`, and `resizable`. DESIGN-029 records
their per-file parity dispositions, per-file and aggregate zero-consumer
checks, barrel checks, register retirement, and staged deletion.

No explanation was inferred for the remaining nine deletions, and no product
file was deleted, restored, cleaned, moved, or edited.

Wave-10 deletion-evidence snapshot, 2026-09-18:

- Worktree entries: 1,371
- Candidate-owned: 1,247
- Exact task-record paths: 121
- Unresolved: 3
- Deletions without an evidence-backed explanation: 1
- Credential-pattern findings: 0

Eight more DESIGN-029 venue UI twins now carry explicit retirement evidence:
`select`, `separator`, `sidebar`, `sonner`, `table`, `toggle-group`, `toggle`,
and `use-mobile`. The task records per-file parity dispositions, per-file and
aggregate zero-consumer checks, barrel checks, CP-037 authorization, register
retirement, and staged deletion. The explanations preserve the documented
`separator` missing-data-slot divergence and the `use-mobile` stale-target
contract divergence.

This pass was capped at eight. `components/venue/ui/use-toast.ts` remains the
only deletion without a manifest explanation, pending its own bounded evidence
pass. No product file was deleted, restored, cleaned, moved, or edited.

Wave-11 deletion-evidence snapshot, 2026-09-18:

- Worktree entries: 1,374
- Candidate-owned: 1,250
- Exact task-record paths: 121
- Unresolved: 3
- Deletions without an evidence-backed explanation: 0
- Credential-pattern findings: 0

The final deletion, `components/venue/ui/use-toast.ts`, now carries explicit
DESIGN-004 and DESIGN-029 evidence. DESIGN-004 records `hooks/use-toast.ts` as
the canonical target and the byte-identical comparison. DESIGN-029 records the
matching SHA-256 and `cmp` result, per-file and aggregate zero-consumer checks,
barrel checks, CP-037 authorization, register retirement, and staged deletion.

All 34 worktree deletions now have evidence-backed explanations. The three
cross-domain ownership paths remain deliberately unresolved; this pass did not
assign them or change product code.

Wave-12 ownership-formalization snapshot, 2026-09-18:

- Worktree entries: 1,380
- Candidate-owned: 1,253
- Exact task-record paths: 127
- Unresolved: 0
- Deletions without an evidence-backed explanation: 0
- Credential-pattern findings: 0

The final three cross-domain paths now have explicit active task contracts:

- `app/api/events/_lib/event-reference.ts` → database / DB-009 for the shared
  `artist_events` / `events` / `events_v2` identity and access contract.
- `app/api/upload/signed-url/route.ts` → general-user / USER-006 for a named
  consumer adoption or explicitly authorized retirement decision.
- `app/events/_actions/event-actions.ts` → organization / ORG-006 for the
  org-scoped event, calendar, status, and hold action disposition.

Each task records scope, exclusions, dependencies, verification, blockers, and
handoffs. Their product behavior remains unchanged. The manifest marks only
these three new exact assignments as task-backed; candidate confirmation and a
release-grade branch/history scan still remain before curation.
