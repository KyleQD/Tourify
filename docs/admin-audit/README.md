# Tourify Admin Audit Registry

This directory is the canonical control plane for the Admin workflow completion program.

## Authority

- Hand-edited source records live in `registry/`.
- Immutable evidence receipts live in `evidence/<year>/`.
- Imported source provenance lives in `sources/manifest.json`.
- Files in `generated/` are derived views and must not be edited by hand.
- Historical ledgers and the August 25 handoff are evidence inputs only; their status claims never promote a record automatically.

## Status progression

`observed → reproduced → in_progress → implemented → ready_for_staging → ready_for_independent_verification → done`

A record may keep its current status while a structured blocker is open. `done` requires an immutable implementation commit, green CI, named staging evidence, producer and recipient proof, negative security proof, retry and rollback proof, an independent verifier, and product/security sign-off where applicable.

## Commands

- `npm run generate:admin-audit` validates the registry and regenerates the Markdown/CSV/coverage views.
- `npm run check:admin-audit` validates source records and fails when generated views drift.
- `npm run verify:admin-baseline` runs the pinned type-check plus migration, route, legacy-route, service-role, registry, and complete Admin test gates.

The generated workbook is a presentation view. It includes the reviewed service-role remediation debt, but the JSON registry remains authoritative. A passing baseline gate does not promote a finding or workflow without the required immutable, staging, recipient, security, recovery, independent, and human evidence.
