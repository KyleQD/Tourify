# DB-017 — the 42-capability catalog reconciled with the RLS permission matrix

Task: `docs/engineering/tasks/completed/DB-017.json`. Base SHA
`16fb834f1a03a70f165be470a5f98f389bf6100a`. Branch `release/clean-snapshot`,
dirty worktree (676 entries at session start, every one preserved; nothing
staged, committed, reverted or cleaned).

**No migration was applied to any environment. No `supabase db reset`, no
forced or full-chain replay, no `psql` against any target, no hosted
environment contacted. CP-051 honoured. Nothing in this directory is hosted
evidence and nothing in it is a claim about a deployed posture.**

## What this disposes of

DB-016 handed over: *206 (role, capability) pairs across the full 42-capability
catalog where the application capability gate grants authority the RLS permission
matrix denies*, distributed owner=37, admin=35, tour_manager=26, production=24,
production_manager=24, department_manager=11, finance=13, finance_manager=14,
ticketing=7, ticketing_manager=7, viewer=9, worker=0.

**The total, 206, is reproduced exactly. The per-role distribution does not
reconcile: as printed it sums to 207, and `production` is 23, not 24.** See
"Contradictions" below.

## The instrument

`scripts/ci/check-capability-matrix-agreement.mjs` +
`scripts/ci/check-capability-matrix-agreement.test.mjs`.

Two layers, each read from its own authority:

| layer | source | how |
| --- | --- | --- |
| 1 — application gate | `lib/auth/admin-capabilities.ts` | **imported**, `await import` of the real module. No copy of the logic, so no path by which the check can drift from the code the routes use. |
| 2 — RLS matrix | the active migration chain | **replayed**: 17 `insert into public.org_role_permissions` writes across three files, in version order, each with its own conflict clause modelled. The DB-016 seed is parsed out of the migration that declares it. |

The gate inputs are exactly the ones `loadCapabilities`
(`lib/auth/admin-context.ts:237-242`) supplies, with no target and no department
authority, because `has_perm(uid, oid, perm)` takes no target. `isOrganizationCreator`
and `isMasterAccount` are deliberately unset: they return `ALL_CAPABILITIES` and
bypass the matrix entirely, which is a different path this check does not change.

`--import tsx` is required. A **static** `import` of the `.ts` from a `.mjs`
does not resolve under it and fails with `does not provide an export named
'ADMIN_CAPABILITIES'`; the dynamic form is load-bearing and is commented as such.

## AC-1 — 42 decisions, one per capability, none undecided

The four answers. Three are applied; the fourth is implemented, enforced and
applied to zero capabilities, for a stated reason.

| decision | n | open pairs | meaning |
| --- | --- | --- | --- |
| `matrix_authoritative` | **2** | **0** | the RLS matrix is the control and the gate must not exceed it. Reached by DB-016 for the workforce family. |
| `catalog_authoritative` | **11** | **58** | the catalog states the intent and the matrix has not been projected to it. Every open pair is a **false denial**. |
| `declared_intent_only` | **29** | **148** | **the fourth answer.** No RLS policy reads it, so it constrains no row-level access. |
| `deliberately_unseeded` | **0** | 0 | implemented and enforced; see below. |

`workforce.view` and `workforce.manage` are the two `matrix_authoritative`
capabilities. Both are read by RLS, both were reconciled by DB-016, and both
have zero open pairs. The check exists to keep them at zero.

`deliberately_unseeded` is applied to **zero** capabilities and that is a
finding, not a gap. The one real instance in this repository is a **pair-level**
decision — CP-094's withholding of `workforce.manage` from `department_manager`,
because `has_perm` takes no target and a matrix grant is organization-wide by
construction. That is a property of a `(role, capability)` pair, and forcing it
onto a capability would misdescribe it. The class is nevertheless implemented and
proven reachable, because a class no test can reach is a class that does not
exist: `FORBIDDEN_MATRIX_GRANT` fires the moment a `deliberately_unseeded`
capability gains a matrix grant.

Every decision records a reason, an owner, an `enforcement` class, evidence
citations, and — for the 11 `catalog_authoritative` capabilities — a named
`nextAction` owner (`wfc-003` for the matrix projection; `finance`, `ticketing`,
`org`, `social`, `logistics`, `event`, `tour`, `admin`, `workforce` for the
capabilities the matrix projection alone would not fix).

## AC-2 — the check fails on disagreement

`node --import tsx scripts/ci/check-capability-matrix-agreement.mjs`

| mode | exit | result |
| --- | --- | --- |
| default (decision-aware) | **0** | 504 pairs, every disagreement dispositioned, 42 decisions, 0 undecided vocabulary |
| `--strict` | **1** | **206** `STRICT_PAIR_DISAGREEMENT`, no class exemption |

Eight failure rules, and the rule underneath them is: **the check fails whenever
the measured world and the recorded decisions disagree, in either direction.**
There is no severity level and no safe direction for a stale record.

| rule | fires when |
| --- | --- |
| `DECISION_NOT_SUPPORTED_BY_CHAIN` | measured enforcement is **weaker** than the decision claims — the false-negative direction |
| `DECISION_UNDERSTATES_CHAIN` | measured enforcement is **stronger** than the decision claims |
| `UNDECIDED_CAPABILITY` | a catalog capability has no decision |
| `STALE_DECISION_CAPABILITY` | a decision exists for a capability the catalog dropped |
| `MATRIX_AUTHORITATIVE_BREACH` | an open pair on a `matrix_authoritative` capability |
| `FORBIDDEN_MATRIX_GRANT` | a matrix grant on a `deliberately_unseeded` capability |
| `MATRIX_GRANT_UNMODELLED_BY_GATE` | the matrix grants what the gate does not model, on a `matrix_authoritative` capability |
| `UNDECIDED_MATRIX_VOCABULARY` | a matrix permission or a read permission that nobody decided |
| `EXTRACTOR_CROSS_CHECK` | the instrument's own second extractor disagrees with the first |
| `STRICT_PAIR_DISAGREEMENT` | `--strict` only: any open pair |

A newly added RLS policy is a security improvement and it still fails the check,
because the remedy is a one-line decision update and a check that rewards being
stale is not a check.

## AC-3 — the capabilities nothing reads, enumerated and dispositioned

**29 of 42 capabilities are read by no RLS policy, by no policy-reachable
function, and by no trigger anywhere in the 323-migration chain.** All 29 are
named individually in the decision table with a reason, an owner and a next
action. There is no wildcard entry, because a wildcard is how a declared intent
becomes an unexamined assumption.

### The method, and why a policy-text grep is the wrong instrument

A capability is row-level enforced **iff** its literal is passed to
`public.has_perm` inside a statement that creates a policy, **or** inside a
chain-defined function transitively reachable from such a policy. The chain has
287 chain-defined functions, 50 of them policy-reachable.

Transitivity is load-bearing and the two cases prove it:

- `logistics.view` and `logistics.manage` are read **only** through
  `private.user_can_read_staff_zone` / `user_can_edit_staff_zone`
  (`20260903120000:53500`, `:53568`). Neither literal appears in any
  `create policy` statement. A grep of policy text calls both unenforced; they
  are enforced. That is a **false negative about a live control**.
- `event.manage` has 46 literal and **14 dynamically built** policy sites
  (`execute $p$ ... $p$` inside `DO` blocks). A splitter that mishandles
  dollar-quotes loses the dynamically built half.

The chain's only policy that touches the matrix directly is
`roleperms_select ... using (true)` (`20250816132000:112`), which is
**world-readable and authorizes nothing**. Every RLS enforcement path goes
through `has_perm`; there is no other consumer, and the check fails with
`UNDECIDED_MATRIX_VOCABULARY` if one ever appears.

### `workforce.publish` — the named test case, treated as one

`workforce.publish` is read by **no policy, by no function and by no trigger
anywhere in the chain.** Its only occurrences are
`org_members_permissions_check` (`20260821180438:88`), which **admits the value
and authorizes nothing**, and DB-016's own seed and post-condition. It changes
**no** row-level access.

DB-016 seeded it into eight roles so the matrix would agree with the route gate
at `app/api/admin/events/[id]/work-mode/route.ts:32`. It is reported here as
declared intent and is **not** counted among the 13 enforced capabilities. It
changes no row-level access, and it is not described as an enforced control
anywhere in this report or in the check.

### A second instance, previously unrecorded

`finance.manage` is the only capability that is in the catalog, **in the
matrix**, and read by nothing. `owner`, `admin` and `finance` have carried it
since `20250816132000:45-48` and it has gated nothing for the whole life of the
chain. Together with `finance.view`, `finance.approve`, `finance.pay` and
`advance.manage`, **the chain enforces no finance capability at the row level.**
That is a launch-relevant fact, not a catalog observation.

### The inert grants, printed

Nine matrix values are **inert** — they look like authority in a table dump and
grant nothing:

```
owner/workforce.publish  admin/workforce.publish  production/workforce.publish
tour_manager/workforce.publish  production_manager/workforce.publish
department_manager/workforce.publish
owner/finance.manage  admin/finance.manage  finance/finance.manage
```

`workforce.manage` is absent from all twelve rows, which is CP-102's subtraction
working.

### The nine permissions the RLS enforces and the catalog cannot express

The 42×12 pair table is **not** the whole authorization story. Nine matrix
permissions are not catalog capabilities, and **three of them are read by RLS**:
`org.manage` (1 policy + `can_view_hiring_pii`), `org.invite` (2 policies),
`staff.manage` (1 dynamically built policy). The other six (`offer.manage`,
`task.manage`, `schedule.manage`, `report.view`, `storage.read`, `storage.write`)
are in the matrix and read by nothing. All nine are recorded in
`LEGACY_MATRIX_VOCABULARY`; a tenth would fail the check.

`org.roles.manage` and `org.settings.manage` are the catalog's names for
authority that the chain enforces as `org.manage`. The gap is a **vocabulary
gap, not a missing control**, and that is the more useful statement.

## AC-4 — proven able to fail, and both error directions recorded

### Red on inversion, at the CLI, with real exit codes

Four inversions, each a copy of the real chain with one edit, run through the
same CLI an operator or a pipeline would run.

| # | injection | rule | count | exit |
| --- | --- | --- | --- | --- |
| 1 | remove `workforce.view` from `finance`'s matrix row in `20260926200000` | `MATRIX_AUTHORITATIVE_BREACH` | 1 | **1** |
| 2 | make `organizations` UPDATE read `workforce.publish` in `20250816132000` | `DECISION_UNDERSTATES_CHAIN` | 1 | **1** |
| 3 | make a policy read `mystery.perm` in `20250816132000` | `UNDECIDED_MATRIX_VOCABULARY` | 1 | **1** |
| 4 | none — the unmutated chain under `--strict` | `STRICT_PAIR_DISAGREEMENT` | **206** | **1** |

Verbatim, inversion 2 — the AC-3 test case, falsified:

```
✗ 1 failures:
  [DECISION_UNDERSTATES_CHAIN] (error) workforce.publish: the decision claims
  enforcement "none" but the chain measures "rls_policy". A new enforcement site
  is an improvement, and it still fails until the record is current: a check that
  rewards being stale is not a check.
```

Reproduce with `CAPABILITY_MATRIX_CHAIN_DIR=<dir>`, which is documented and is
why the inversions are runnable outside the test file.

### Both error directions

**FALSE POSITIVE — safe.** An unrecognised capability construct: a permission
literal the chain reads that is neither a catalog capability nor a recorded
legacy permission. It is reported loudly as `UNDECIDED_MATRIX_VOCABULARY` and an
operator adds it. Inversion 3 is that direction, firing with the safe label
`FALSE_POSITIVE_DIRECTION_SAFE`. The check never silently ignores a construct it
does not understand, **because a silently ignored construct is indistinguishable
from a capability that constrains nothing** — which is exactly how
`workforce.publish` came to be believed.

**FALSE NEGATIVE — unsafe, and the dangerous one.** A recognised construct that
constrains nothing while the record says it constrains something.
`DECISION_NOT_SUPPORTED_BY_CHAIN` is the rule, it is printed **first**, and it
carries its own severity label `FALSE_NEGATIVE_DIRECTION`. Inversion 4 in the
test file drives it by claiming `rls_policy` for a capability measured at
`none`.

### The instrument's own post-state is asserted, and its own floors are cross-checked

Two defects in this check's first revision, both found by running it, and both
produced a confident clean report from a broken instrument:

1. **The statement splitter's dollar-quote branch had wrong index arithmetic.**
   `do $x$ ... $x$; create policy ...` produced ONE statement and the second
   half was invisible.
2. **The `has_perm` argument extractor was non-greedy** and stopped at the first
   `)`, so `has_perm(auth.uid(), org_id, 'x')` yielded the argument `auth.uid(` —
   zero string literals — and **41 of the 42 capabilities were reported as
   constraining nothing.**

Both are now prevented structurally:

- a splitter probe and a call-argument probe run on **every invocation**, and a
  failed probe returns `instrumentBroken` and reports that the run proves
  nothing;
- a **second, independent extractor** — deliberately wrong in one specific way,
  hunting the closing paren with a plain depth counter that does not skip quoted
  strings — must find **exactly the same set** of 16 permission literals. A
  broken extractor cannot return a superset of that one, so a future regression
  cannot ship silently. The test asserts the first revision's non-greedy
  extractor loses ≥10 literals, so the floor has real work to do.

A third defect was found by the test file rather than by running the check:
`Object.keys` on a `Map` returns `[]`, so the per-capability table printed
**empty** on the first run — a report that looked complete and omitted the table
that is the point.

## The 206 is a false-denial inventory, not a disclosure inventory

`resolveAdminCapabilities` unions `configuredPermissions` — the matrix row —
into the role's catalog defaults (SEC-102). So for every role and every
**catalog** capability, `matrix(role) ⊆ gate(role)` **structurally**. The
matrix-exceeds-gate direction is unreachable for a catalog capability, and
asserted over all 504 pairs and against the real resolver: **zero** counterexamples.

Therefore **none of the 206 is a disclosure.** Every one is a caller who passes
the route gate and is then denied rows — a plausible zero, which is what CP-098
forbids, but a narrower surface rather than a wider one. This is what decides the
dispositions: `catalog_authoritative` for the 11 enforced-with-open-pairs
capabilities is the correct answer precisely because a gate that exceeds the
matrix narrows access.

The direction is still implemented and still fails
(`MATRIX_GRANT_UNMODELLED_BY_GATE`), because a comparator that only computed one
direction would report the same 0.

## Contradictions and corrections

1. **`production` is 23, not 24.** The per-role distribution as printed in the
   DB-016 brief **sums to 207**, not 206. DB-016's own evidence line already
   flagged "production 23 vs 24" and then recorded 24 as authoritative, with an
   explanation about a matrix snapshot that does not account for the arithmetic.
   The chain-derived measurement gives **23**, and the total is **206** only at 23.
   The cause is precise: `production_manager`'s catalog slice is **identical** to
   `production`'s, but DB-016 created its matrix row with only the `workforce.*`
   slice, so `production_manager` is 24 and `production` is the same 24 minus the
   one capability `production` already carried in the matrix — `event.manage`.
   Pinned by a test that asserts both the 207 sum and the 23.
2. **9 open pairs for the nine inherited-but-unread legacy permissions are not
   pairs at all.** `owner` and `admin` carry `org.manage`, `org.invite`,
   `staff.manage`, `event.manage` and `finance.manage`; three of those are read
   by RLS and two of them (`org.manage`, `org.invite`) have no catalog capability
   to disagree with.
3. **`finance.manage` is an unrecorded second instance of the fourth answer**
   (see AC-3).
4. **A capability read only by a helper a policy calls is enforced.** A
   policy-text grep calls `logistics.view` and `logistics.manage` unenforced.
5. **`tour.publish` is enforced and no policy reads it.** Three publication RPCs
   call `has_perm` and then `RAISE`. It is enforced at a command boundary, which
   a policy-only instrument cannot see, and it is on a launch-critical path with
   three open pairs.
6. **`production_manager` alone accounts for 24 of the 206**, and its 24 are an
   artefact of DB-016 creating its row empty rather than a designed asymmetry.

## What this check does NOT do

- **It is not wired into CI.** `package.json` and `.github/workflows/ci.yml` are
  shared artefacts in a dirty multi-lane worktree and are outside this task's
  grant. Until release wires it, the detector exists, is proven, and runs on
  nobody's behalf. That is stated, not left implied.
- **It is not a name blacklist.** It classifies by *transitive reachability* from
  a policy predicate, so a capability whose enforcement is indirect is enforced and
  a capability with no site is declared intent, and the two are reported
  differently.
- **It does not prove a capability is correctly scoped.** It proves a capability
  is read by an enforcement site, not that the site constrains the right rows.
  Correct scoping is a behavioural question and belongs to the harnesses.
- **The matrix it derives is a CHAIN PREDICTION, not a measurement of any
  target.** DB-002 found some hosted versions applied by raw Management API SQL,
  so "the chain says X" and "the target has X" are two different claims.
- **It does not decide the 11 `catalog_authoritative` capabilities' remedies.**
  Widening the matrix is the WFC-003 projection CP; this task decides and
  detects, and does not seed.

## Files and commands

```
scripts/ci/check-capability-matrix-agreement.mjs        (NEW)
scripts/ci/check-capability-matrix-agreement.test.mjs   (NEW)
docs/engineering/verification/db017-capability-matrix-agreement/report.json
docs/engineering/verification/db017-capability-matrix-agreement/check-output.txt
docs/engineering/verification/db017-capability-matrix-agreement/strict-output.txt
docs/engineering/verification/db017-capability-matrix-agreement/test-output.txt
```

```
node --import tsx scripts/ci/check-capability-matrix-agreement.mjs            # exit 0
node --import tsx scripts/ci/check-capability-matrix-agreement.mjs --strict   # exit 1, 206 failures
node --import tsx scripts/ci/check-capability-matrix-agreement.mjs --json     # report.json
node --import tsx --test scripts/ci/check-capability-matrix-agreement.test.mjs # 25 pass / 0 fail
CAPABILITY_MATRIX_CHAIN_DIR=<dir> node --import tsx scripts/ci/check-capability-matrix-agreement.mjs
```

`check-output.txt` is the default-mode run, `strict-output.txt` the `--strict`
run, `test-output.txt` the `node --test` run, all captured verbatim at this SHA.
