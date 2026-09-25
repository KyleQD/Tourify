# Database decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DB-003 — Active root migration chain is the only apply source

- Date: 2026-09-09
- Status: accepted
- Task: DB-003
- Decision: Only numbered SQL files directly in `supabase/migrations/` are active. Archive directories and root-level Supabase SQL are historical evidence, not apply inputs. Target applies use `supabase db push` so the Supabase migration-history table determines what is pending.
- Evidence: `scripts/ci/check-active-migration-chain.mjs`, `supabase/migrations/README.md`, and the removal of the divergent manual file list in `scripts/run-migrations.sh`.
- Consequences: A fresh local replay uses `supabase db reset`; no operator may replay selected SQL through the Management API or `psql` outside Supabase migration history.

## DB-004 — Generated schema types have one canonical path

- Date: 2026-09-09
- Status: accepted
- Task: DB-004
- Decision: `lib/database.types.ts` is the sole generated Supabase schema contract. `types/supabase.ts` remains only as a re-export compatibility path, while `types/database.types.ts` is explicitly hand-authored application view models.
- Evidence: `scripts/ci/generate-database-types.mjs`, `scripts/ci/check-database-types.mjs`, and the Database Types CI job.
- Consequences: Schema changes require a fresh local replay followed by `npm run generate:database-types`; CI rejects a committed generated file that does not match that replay.

## DB-011 — An absent relation is classified before it is created, and creation is the last option

- Date: 2026-09-25
- Status: accepted
- Task: DB-008 (Wave 33)
- Decision: When product code queries a relation or RPC that the generated Supabase contract does not declare, the database lane first decides which of four states it is in, and records the decision with evidence, before writing any SQL. `stale-types` (the chain has it) is fixed by regeneration. `schema-missing` (nobody has it and no archived definition exists) is fixed by an additive forward-only migration, but only when the column contract is derivable from the repository. `code-drift` (archived, renamed, or the repository names another destination) is fixed by repointing or removing the consumer. `unknown` is recorded, not guessed. An archived object is never re-created on the strength of a compile error alone.
- Evidence: `docs/engineering/database-type-inventory-2026-09-25.json`; the ordered CREATE/DROP/RENAME replay in `supabase/tests/db008_chain_surface_replay.mjs` and the column replay in `supabase/tests/db008_chain_column_replay.mjs`, both validated against every diagnostic in the preserved CI log.
- Consequences: 128 objects classified: 107 `code-drift`, 9 `schema-missing`, 10 `unknown`, 2 `stale-types`. Only `venue_profiles.social_links` and `venue_profiles.cover_image_url` had a derivable contract, so only they were migrated. The retired venue workforce surface stays retired; `exec_sql` is recorded as never-create. See CP-064 and CP-065 in `docs/engineering/DECISIONS.md`.

## DB-012 — Regenerating the generated contract requires a reconciled target, and the target is currently not reconciled

- Date: 2026-09-25
- Status: accepted
- Task: DB-008 (Wave 33)
- Decision: `npm run generate:database-types` is not run, and `lib/database.types.ts` is not hand-edited, until both the target is reachable and the active chain is known to describe it. A regenerated contract is only accepted if the post-generation type surface is a superset of the pre-generation one for every relation the chain creates; any column present in the committed contract and absent from the chain is treated as evidence of out-of-band DDL and blocks the regeneration.
- Evidence (SUPERSEDED 2026-09-26, see DB-013): the `venue_profiles` evidence line was `42 declared vs 19 created`. That was an instrument defect. DB-002's separate observation stands: some target migration versions are absent from `supabase_migrations.schema_migrations` because prior application used raw Management API SQL.
- Consequences: CP-016 regeneration was blocked in Wave 33. Docker is unavailable on this machine and no linked or project-id target is configured, so `supabase gen types typescript --local` cannot run at all. The staleness watermark is recorded precisely: the committed contract reflects the chain through `20260910000001_get_active_organizer_account_for_org.sql`.
- **Superseded in part.** The BLOCKING reason is withdrawn by DB-013: the chain is a strict superset of the contract, so regeneration can no longer delete coverage. The remaining reasons are operational only — no reachable target, and the marketplace relations that were absent from both sides and are now captured by DB-014.


## DB-013 — The chain is a superset of the generated contract, and that is now a runnable gate rather than a claim

- Date: 2026-09-26
- Status: accepted
- Task: DB-008 (Wave 34)
- Decision: The condition CP-016 requires — the active chain must be a superset of `lib/database.types.ts` — is expressed as an executable gate, `node supabase/tests/db008_chain_contract_replay.mjs <root> <out> --check`, and the gate is the precondition for any regeneration, not a review step. The gate's own correctness is a separate obligation: it carries positive controls on the instrument, negative controls shaped to the superset property, a cross-implementation check against the Wave 33 surface replay, and a post-state re-assertion. The `venue_profiles` 42-vs-19 finding from Wave 33 is withdrawn.
- Evidence: 305-migration chain reconstructs to 401 tables + 14 views, 5335 columns, 224 routines (142 callable + 82 trigger). The contract declares 402 relations, 5275 columns, 100 callables. **Zero** contract columns, relations or callables lack chain provenance. 5170 attributions independently re-verified against the cited migration file with 0 unsupported. 13 view relations covered by column-name occurrence in their defining migration, 0 without. Six ALTERs are skipped by a fresh replay (all guarded, none an abort); the one genuine live-versus-fresh divergence is `scheduled_posts.platform_status` / `platform_errors` and is routed to the social lane.
- Consequences: regeneration would ADD 13 relations, 54 columns and 42 callables, and DELETE nothing. `lib/database.types.ts` is NOT regenerated and NOT hand-edited in this wave, because the canonical command still cannot run: Docker is unavailable, no linked or project-id target is configured, and no hosted evidence is claimed. The operator's regeneration is now safe from the deletion direction; it is still blocked on reachability. The corrected instrument also fixed two Wave 33 counting defects in `db008_chain_surface_replay.mjs` (contract callables 125 -> 100; it had only counted functions with a literal `Args: {` block). See CP-070.

## DB-014 — Marketplace reconciliation takes its column contract from the archive and the caller, and nothing else

- Date: 2026-09-26
- Status: accepted
- Task: DB-011 (Wave 34)
- Decision: For a relation that product code reads but no active migration creates, the column contract is taken from the reviewed archived migration and from the columns the calling code demonstrably writes. Where the archive and the caller disagree the caller wins, and the difference is a named departure in the migration header and the manifest. No column is added that neither source names. Where the archived design's stated intent is not achieved by the archived DDL, the fix narrows access and is flagged for a named security reviewer.
- Evidence: `marketplace_checkout_attempts` (archive `20260728000011`, MANIFEST.csv:257) has no `guest_email`, but `app/api/marketplace/checkout/route.ts:467` writes it; that is the only addition beyond the archive. The same route inserts six P6 guest-checkout columns on `marketplace_orders` at :377 that the archive defines in `20260728000014` and no active migration creates. `marketplace_external_listings` (`20260728000003`) shipped a public-read policy whose comment claimed `canonical_url` was excluded, which a `USING` predicate cannot do, so it is replaced by a column-limited view with the base table revoked from anon. Executed on a throwaway PostgreSQL 16.15 cluster: 33/33 harness checks, 5 negative controls, two applies each for idempotence.
- Consequences: three migrations, three `planned` manifests, three contract postflights, and `HF-DB-011-MARKETPLACE-CHAIN-SURFACE-AUTHORED` carrying two decisions the database lane refused to guess: whether `max_downloads = 0` means unlimited, and the switch from the service-role client to the authenticated one. 61 further marketplace surface items are inventoried and left open. `HF-DB-009` is consumed. See CP-071.

## DB-015 — The nine `schema-missing` objects are seven, and none of the seven has a contract

- Date: 2026-09-26
- Status: accepted
- Task: DB-008 (Wave 34)
- Decision: Re-count before re-reporting. The Wave 33 `schema-missing` bucket of 9 included `venue_profiles.social_links` and `venue_profiles.cover_image_url`, which the same wave captured as `20260925210000`; the open set is 7. `event_staff` was named in Wave 33 prose but is not in the inventory's `schema-missing` list, so no contract should be chased for it under this bucket. A domain that cannot supply a column contract resolves the object by deleting the code that queries it, not by receiving an invented table.
- Evidence: all 53 handoffs under `docs/engineering/handoffs/pending/` scanned for an inbound contract addressed to `database`: zero. The four `HF-DB008-SCHEMA-MISSING-*` handoffs remain `pending`, unanswered, addressed to artist (event_equipment, event_tasks, artist_licensing_deals, artist_license_templates — 75 diagnostic hits), work (hiring_candidates — 4), qa (pending_password_resets — 14) and admin (error_reports — 6).
- Consequences: nothing was migrated for the seven, and the non-delivery is raised as `HF-DB-011-SCHEMA-MISSING-CONTRACTS-NOT-DELIVERED` to the orchestrator rather than absorbed into a green gate: `check:migration-chain`, `check:migration-validation` and `check:migration-ledger` are all green and none of them knows these objects exist.

## DB-035 — Regeneration is blocked by a 1 MB pipe in the repository's own generator, and the linked project is a different database

- Date: 2026-09-26
- Status: accepted
- Task: DB-008, DB-011 (Wave 35)
- Decision: Record the three regeneration paths with their exact measured blockers, and rule the linked project out as a source. `local` needs a running Docker daemon. `linked` works today and must not be used. `project-id` needs a real access token. The hard blocker on all three is `spawnSync` with no `maxBuffer` in `scripts/ci/generate-database-types.mjs` and `scripts/ci/check-database-types.mjs`, which fails with ENOBUFS above 1 MB of type output. Fix and apply are handed to the scripts owner.
- Evidence: Each path executed, not reasoned about. `supabase gen types typescript --schema public --linked` exits 0 and returns 1,183,384 bytes. `node supabase/tests/db008_linked_type_delta.mjs` measures that payload against the committed contract: 609/8,020/151 vs 402/5,275/100, with 78 relations, 112 columns and 27 callables only in the contract and 285 relations only in the target, 276 of which no active migration creates.
- Consequences: `lib/database.types.ts` is byte-unchanged and CP-016 stays unexecuted. Cross-domain decision CP-089 carries the reasoning.

## DB-036 — A view's columns are resolved by the server, not by a better regex

- Date: 2026-09-26
- Status: accepted
- Task: DB-008 (Wave 35)
- Decision: The 13 chain view relations move from column-name occurrence to a real SELECT-list replay. The view DDL is sliced byte-verbatim by offset from a length-preserving mask, applied to a throwaway PostgreSQL 16.15 cluster with a server-discovered dependency closure, and the resolved columns are read from `pg_attribute`. A reproducer is only believed if its own post-state is asserted and a control can fail.
- Evidence: `supabase/tests/db008_view_column_replay.harness.sh` — 13/13 views resolved, 0 contract columns uncovered, 0 view-only columns, 3 negative controls fire. Four defects were found and fixed on the way, all of the same shape as the Wave 33 and Wave 34 instrument defects: emitting the masked text instead of the original, iterating only the resolved side of a comparison, reading materialized views through `information_schema.columns`, and a BSD-`sed` `\?` that made an error branch dead.
- Consequences: The CP-016 superset proof is a replay on every surface. `db008_chain_contract_replay.mjs` marks the old caveat SUPERSEDED rather than deleting it, and one Wave 34 assertion that began failing when the ordering bug was fixed was rewritten into three that pin the repaired invariant. Cross-domain decision CP-090 carries the reasoning.

## DB-037 — The storage-replay harness is self-contained, and the unguarded form is synthesised rather than read from git history

- Date: 2026-09-26
- Status: accepted
- Task: DB-008 (Wave 35)
- Decision: `db008_storage_replay_guard.harness.sh` no longer depends on a committed `manifest.json`, a committed `00-bootstrap.sql`, or a cluster the reader must have already created. It creates and destroys its own cluster, generates its own manifest, and loads the committed `db008_storage_replay_bootstrap.sql`. `db008_storage_replay_extract.mjs` synthesises the unguarded form by unwrapping the CP-059 `do $storage_replay_guard_N$` blocks instead of reading `git show HEAD:<file>`, because the guard is now committed and the historical comparison silently degrades to guarded-vs-guarded.
- Evidence: `git ls-files supabase/tests/ | grep db008_storage` returns four files and neither fixture name — confirming the Wave 33 fixture gap, which was a filename mismatch against a fixture that existed under a different name. The harness now runs 10 scenarios, 10 passed, exit 0. Zero scenarios remains a hard failure, and `supabase/tests/db008_run_all.sh` fails if zero harnesses run.
- Consequences: The CP-059 proof is reproducible from the tree. Honest delta from Wave 33: 5 of the 10 unguarded forms abort as a non-owner rather than all 10, because their inner body carries a `pg_policies` existence guard that is a no-op on a fresh schema; the synthesised original is not the historical blob and the report says so. The package.json script and the CI job are outside this lane's grant and are handed over as `HF-DB-008-STORAGE-GUARD-HARNESS-WIRED`.

## DB-038 — The marketplace surface is 46 blocking items, and 36 of them are one product decision

- Date: 2026-09-26
- Status: accepted
- Task: DB-011 (Wave 35)
- Decision: Author the two money-path tables now (`20260926140100`), triage the rest, and refuse the 36-item external-fulfilment cluster until the marketplace lane decides whether external fulfilment ships. The instrument's column-consumer matching is fixed: it now requires the file to bind the TABLE and mention the COLUMN within a window, instead of matching a bare column name anywhere in the repository.
- Evidence: 66 surface items from 17 archived `local_only_unapplied` migrations classify as 14 chain-has, 46 blocking, 6 dead. The pre-fix instrument reported `marketplace_storefronts.status` with 2,158 consumers citing `hooks/use-travel-coordination.ts`, and `marketplace_moderation_queue.action` with 557 — neither file reads a marketplace table. After the fix those are 16 and 1. `20260926140100` is reproduced from the archive with the consumer column contract read out of the code, and `db011_marketplace_money_path.harness.sh` passes with 3 negative controls.
- Consequences: `marketplace_payment_events` ships service-role-only with the unique constraint that stops a retried Stripe event fulfilling an order twice; `marketplace_fee_rules` ships admin-gated with its default rule INACTIVE so applying it cannot start charging a fee. The remaining 44 blocking items are 36 external-fulfilment, 4 service-marketplace, 2 `search_vector` and 2 moderation-queue column sets; **none is a money path**, which is why this wave stopped here. The instrument is a lower bound for dynamically-built column lists, so money-path items were verified by hand before authoring.

## DB-039 — A column absent from the contract, present in the chain, and read by a live route is a schema bug, not a contract gap

- Date: 2026-09-26
- Status: accepted
- Task: DB-008, DB-011 (Wave 35)
- Decision: Repair `scheduled_posts.platform_status` / `.platform_errors` forward with `20260926140200` rather than accepting the divergence, deleting the columns, or leaving it to a regeneration question. The earlier migration cannot be edited (it has already run) and renumbering would not move it after the creating migration.
- Evidence: Reproduced from the repository's own files, not asserted: `20250904110000` applied to an empty schema creates nothing because the table does not exist yet, then `20260413200000`'s block creates the table, and the two columns are still absent — so a chain-built target breaks `app/api/artist/content/overview/route.ts:137`, which selects them, and cannot accept the write at `lib/services/cross-platform-posting.service.ts:195`.
- Consequences: The Wave 34 conclusion that "the contract and the chain agree" was correct about the CONTRACT and was the wrong place to stop, because the product reads the columns. The contract still declares neither, which is now recorded as CP-016 debt rather than as safety. One reproducibility-harness assertion began failing on the fix and was rewritten, not deleted.
