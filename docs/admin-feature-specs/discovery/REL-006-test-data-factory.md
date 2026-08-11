# REL-006 — Deterministic Admin test-data factory

**Status:** Blocked on canonical contract persistence and isolated database execution  
**Date:** 2026-07-21

## Implemented contract

Deterministic **two-org**, multi-role, multi-stop tour covering:

- tours / events / stops
- travel, lodging, equipment, catering, vendors, and site maps
- workforce assignments / shifts
- ticketing parent/child
- finance budget + expense
- contract parent/obligation payload contract, explicitly marked unpersisted
- publication snapshot/section identities and realistic volume payloads
- `minimal`, `realistic`, `edge`, and `crossTenantAttack` deterministic scenarios
- fixed clock with DST fall-back ambiguity and local-day boundary
- USD/EUR two-decimal and JPY zero-decimal values
- stale versions, expired grants, revoked membership, replay keys, and guessed cross-org IDs
- protected buyer/traveler/payment/contract examples represented as projections, never logs

## Locations

- Stable identities and persistence declarations: `lib/testing/admin-feature-factory.ts`
- Scenario database rows/API payloads: `lib/testing/admin-feature-scenarios.ts`
- RLS persona/parent-child matrix: `lib/testing/rls-persona-matrix.ts`
- Read-only isolated preflight: `docs/admin-feature-specs/revalidation/sql/SEC-004-isolated-fixture-preflight.sql`

## Safety and remaining blocker

The scenario contract is deterministic and refuses any target that is not clearly local/test/preview; Tourify Demo and production targets are explicitly forbidden. No database seed adapter is enabled yet because canonical `contracts` and `contract_obligations` tables do not exist. After ordered contract persistence lands, REL-101 may map these payloads to an isolated database and Playwright lifecycle, run direct-client RLS, and clean only its isolated fixture namespace. No fixture may ever be seeded into Tourify Demo.
