# Database backlog

The canonical work item is a task JSON. Launch priorities remain in
`docs/DEVELOPMENT_BACKLOG.md`. DB-001 is complete as an audit; owner answers to
`QUESTIONS.md` become new bounded tasks owned by this agent.

## Active

- `DB-002` — reconcile durable release status for the four staged security/money
  migrations; QA/Release still need to distinguish Management API apply claims
  from `production_verified` manifest evidence.
- `DB-005` — ticketing schema reconciliation and deployed-contract proof.
- `DB-006` — choose one `events`/`events_v2` strategy and cutover path.
- `DB-009` — define and verify the shared `artist_events` / `events` /
  `events_v2` identity and access compatibility contract without expanding the
  bounded DB-006 cutover.

## Candidate follow-ups, in priority order

1. **Current chain/live evidence** (GAPS I-1/I-2/I-3): cover the current 289-file
   source chain, advance the validation pipeline beyond `planned`, and record
   production evidence explicitly.
2. **RLS coverage regression** (M-2/R-3/R-4): table-by-table policy/persona
   matrix, view/security-definer checklist, and duplicate-policy disposition.
3. **Ticketing and events decisions** (I-5/I-6): complete DB-005 and DB-006
   before expanding dependent surface work.
4. **Agent identity rollout** (I-4): validate the service-principal migration,
   provision one approved non-production identity, and wire one route.
5. **Trigger/data-propagation inventory** (M-1): map trigger side effects and
   invariants before counter repair or erasure work.
6. **Scale mechanics** (M-3): full FK/hot-path index coverage, initplan policy
   rewrites, telemetry retention/partitioning, and target-based verification.
7. **GDPR erasure coverage** (M-5): table-by-table delete/anonymize/retain
   disposition, including unlinked content and telemetry.
8. **Legacy cleanup** (R-1/R-2/R-5): retire manual apply guidance, clarify
   historical map output, and remove/document placeholder client/type copies
   after Q1/Q2 are settled.
9. **Ticket credential atomicity** (R-6): move QR/credential issuance into an
   RPC when the ticketing contract is stable.

## Done

- Control-plane bootstrap created.
- `AUTH-AGENT-001` — additive service-principal directory, hashed credentials,
  scope helper, provisioning utility, and audit attribution foundation.
- `DB-003` — authoritative active migration root and local baseline
  reconciliation.
- `DB-004` — canonical `lib/database.types.ts` and CI drift check.
- `DB-007` — post-styles/post-appearances and account-follows restoration.
- `DB-001` — baseline, reconciled gap triage, prioritized owner questions, and
  verification evidence (`BASELINE.md`, `GAPS.md`, `QUESTIONS.md`).

## P0 production launch tasks — 2026-09-16

- **DB-002** — close hosted SECURITY DEFINER and money-path permission exposure with staged and production evidence.
- **DB-005** — apply and exercise the additive ticketing schema; regenerate exact hosted types.
- **DB-006** — finish the `events_v2` core-launch cutover and classify every legacy caller.
- **DB-008** — reconcile hosted migration history and maintain the launch migration ledger without reset or forced replay.
- **DB-009** — own the cross-domain event-reference compatibility boundary;
  implementation waits on DB-006 direction plus artist/discover, ticketing,
  work, social, payment, and QA contract review.

## Batch status — 2026-09-16

- DB-002: static security contract passes; hosted migration/probe evidence remains open.
- DB-008: ledger tooling passes in normal mode and intentionally fails strict release mode until hosted history is reconciled.
