# First Implementation Slice

The first code-bearing Phase 11 slice must remain sandbox-only and disabled by default.

## Scope

1. Create `creator_public_infrastructure_readiness_enabled` and keep it false.
2. Audit and document Phase 10 sources.
3. Add participation and withdrawal records without changing Tourify account status.
4. Add a sandbox identifier record with proof-of-control and no public PII.
5. Add a sandbox trust registry projection.
6. Add a minimal rights-reference resolver that returns source, version, freshness and dispute status only.
7. Add unit, route and RLS tests.
8. Demonstrate export and withdrawal.

## Explicitly excluded

- production public identifiers;
- universal creator identifiers;
- licensing, payment, registration or enforcement authority;
- public access to confidential rights records;
- collective action or representation;
- migration of any canonical music or rights table.
