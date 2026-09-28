# Work packet: `INTG-003`

## Goal

- Goal: Cryptographically hash MFA backup codes and move verification-code storage off process memory.
- Out of scope: Applying or replaying migrations against hosted environments, destructive database resets, production changes, and unrelated MFA or authentication redesign.
- Owner/status: `integrations` / `active`

## Context

- Affected subsystem: MFA service backup-code and persistent verification-code boundaries.
- Routes/components/services: `lib/services/mfa.service.ts`, the shared store contract, the server-only Supabase repository, the additive MFA migration, and focused service/migration coverage.
- References to read first: `docs/DEVELOPMENT_WORKFLOW.md`, Integrations charter/state, `docs/engineering/tasks/active/INTG-003.json`, `docs/engineering/agents/integrations/QUESTIONS.md`, and `docs/engineering/DECISIONS.md`.
- Scope expansion: The parent assignment explicitly authorized the Database/Auth handoff. Code evidence required the store contract, server-only repository, migration, service-role import classification, migration manifest/ledger, and focused tests. Hosted apply and generated types remain under DB-008.

## Checklist

- [x] Confirm the current MFA hashing and in-memory code-store behavior
- [x] Implement cryptographic backup-code hashing within the authorized service
- [x] Add focused tests for hashing and one-time redemption
- [x] Run focused lint and tests
- [x] Record the database dependency and remaining blocker
- [x] Implement the authoritative additive schema and server-only Supabase repository
- [x] Add RLS/default-deny ACLs, service-role-only RPCs, and deterministic repository/migration checks
- [ ] Apply and validate the migration in isolated staging, regenerate canonical types, and run the staged account lifecycle

## Acceptance criteria

- [x] Backup codes are stored as bcrypt hashes and verified with bcrypt comparison.
- [x] Production composition uses an authoritative DB-backed server-only store rather than process memory.
- [ ] Isolated staging proves restart/deploy persistence and the full account lifecycle.

## Verification

- Tier: `feature`
- Commands: focused Vitest for the MFA service and migration contract; focused ESLint for the changed TypeScript; targeted migration-manifest validation; active migration-chain and hosted-ledger checks; service-role allowlist check; changed-path diff check; narrow TypeScript slice.
- Evidence: 2 Vitest files / 11 tests passed; focused ESLint passed; the new migration manifest, 295-file active chain, and 295-file hosted ledger passed. The global service-role check reached only seven unrelated dirty-tree imports, confirming the new MFA repository is classified. The narrow TypeScript slice exhausted the default 2 GB heap, so no typecheck pass is claimed. No hosted database was mutated.

## Handoff

- Changed areas: MFA service/store/repository, additive Supabase migration and security probe, focused tests, migration validation/ledger evidence, service-role classification, task packet, task record, and Integrations state.
- Failures and pre-existing failures: Repository-wide migration validation still reports historical migration findings; the new migration passes targeted validation. The service-role allowlist reports seven unrelated dirty-tree imports; the MFA repository itself is classified. The narrow TypeScript slice exhausted its 2 GB heap. Checksum rendering requires a CI base SHA that was not present, and database-type drift cannot be certified until DB-008 stages the migration on a reconciled Supabase target.
- Blockers: No isolated-staging apply, advisor output, generated database types, restart/deploy persistence proof, or account-lifecycle staging evidence is available. Existing legacy numeric backup-code hashes still need an explicit regeneration decision.
- Next action: DB-008 should apply the migration one-at-a-time to approved isolated staging, run the security and lifecycle/concurrency fixtures plus advisors, update hosted ledger evidence, and regenerate canonical types. USER-005/QA-003 should then certify the deployed MFA account lifecycle.
