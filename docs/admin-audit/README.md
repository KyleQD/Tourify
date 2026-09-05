# Tourify Admin Audit Registry

This directory is the canonical control plane for the Admin workflow completion program.

## Authority

- Hand-edited source records live in `registry/`.
- Execution batches, reference records, and baseline slices live in the same registry and classify every finding, specification task, and workflow completion exactly once.
- Immutable evidence receipts live in `evidence/<year>/`.
- Imported source provenance lives in `sources/manifest.json`.
- The Admin route registry, its debt ceiling, and the reviewed service-role debt are hashed inputs to generated coverage.
- Files in `generated/` are derived views and must not be edited by hand.
- Historical ledgers and the August 25 handoff are evidence inputs only; their status claims never promote a record automatically.

## Status progression

`observed → reproduced → in_progress → implemented → ready_for_staging → ready_for_independent_verification → done`

A record may keep its current status while a structured blocker is open. `done` requires an immutable implementation commit, green CI, named staging evidence, producer and recipient proof, negative security proof, retry and rollback proof, an independent verifier, and product/security sign-off where applicable.

## Commands

- `npm run generate:admin-audit` validates the registry and regenerates the Markdown/CSV/coverage views.
- `npm run check:admin-audit` validates source records and fails when generated views drift.
- `npm run admin:next` selects the first dependency-ready batch below its exit status.
- `npm run admin:context -- --batch ADM-BXX` writes the batch's generated context packet. Packets are capped at 32 KiB and are not status authorities.
- `npm run verify:admin:focused -- --batch ADM-BXX` runs the batch's focused checks, retains complete ignored logs, and prints no more than 20 actionable failure lines per command.
- `npm run verify:admin-baseline` runs the pinned type-check plus migration, route, legacy-route, service-role, registry, and complete Admin test gates.

The generated workbook is a presentation view. It includes the reviewed service-role remediation debt, but the JSON registry remains authoritative. A passing baseline gate does not promote a finding or workflow without the required immutable, staging, recipient, security, recovery, independent, and human evidence.

Normal implementation follows [EXECUTION_MODE.md](EXECUTION_MODE.md) and [ENGINEERING_CONSTITUTION.md](ENGINEERING_CONSTITUTION.md). Historical handoffs and full specifications are discovery inputs, not recurring execution context.
