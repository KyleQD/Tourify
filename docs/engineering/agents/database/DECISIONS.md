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
