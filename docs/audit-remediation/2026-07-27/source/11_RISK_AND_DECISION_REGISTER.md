# Risk and Decision Register

## Active risks

| ID | Risk | Likelihood | Impact | Mitigation | Stop condition |
|---|---|---:|---:|---|---|
| R-01 | Wrong Supabase project targeted | Medium until confirmed | Critical | Environment registry, workflow assertion, named approval | Project ref mismatch |
| R-02 | Migration repair hides missing data work | High without ledger | Critical | Object-effect and backfill proof | Unclassified effect |
| R-03 | Additive DDL locks a hot table | Medium | High | Timeouts, small batches, online-safe approach | Lock/latency threshold |
| R-04 | Function revocation breaks legitimate callers | Medium | High | Caller inventory, staged grants, smoke tests | Approved journey denied |
| R-05 | RLS optimization changes authorization | Medium | Critical | Full persona tests before/after | Any cross-tenant difference |
| R-06 | Static references cause unnecessary schema growth | High | High | Active/gated/legacy classification | No active owner/use case |
| R-07 | Tests are changed to match broken behavior | Medium | High | Approve contract before assertions | No product/contract decision |
| R-08 | Type regeneration creates unexplained drift | High during baseline | Medium | Generate from approved disposable target | Unknown type/object change |
| R-09 | Backfill mis-maps users/entities | Medium | Critical | Deterministic mapping and quarantine | Ambiguous mapping |
| R-10 | Performance work destabilizes recovery | Medium | High | Begin only after correctness gates | Schema errors recur |
| R-11 | Legacy cleanup removes required data | Medium | Critical | No destructive cleanup in program | Drop/truncate proposal |
| R-12 | Service-role use bypasses business visibility | Medium | Critical | User-scoped clients and explicit checks | Unscoped service route |
| R-13 | Feature gating is client-only | Medium | High | Server capability checks and tests | Backend still queries absent schema |
| R-14 | Auth role changes remain effective too long | Medium | High | Session/JWT freshness decision and tests | Removed role retains access |
| R-15 | Storage path mismatch loses uploads | Medium | High | Bucket manifest and end-to-end tests | Object/row mismatch |

## Required decisions

| Decision | Owner | Needed before | Options | Recommended default |
|---|---|---|---|---|
| Is `auqddrodjezjlypkzfpi` production? | Release lead | Any DB write | Yes / No / Unknown | Verify independently |
| Canonical root package manager | Platform | CI cleanup | npm / pnpm | npm |
| Disposable recovery environment | Database/platform | Phase 2 | Local / branch / project | Isolated branch/project plus local replay |
| Poll release status | Feed/product | DOM-102 | Active / gated / retire reference | Gate unless already exposed |
| Marketplace connector exposure | Marketplace/product | DOM-302/303 | Released subset / gated | Map and gate first |
| Music trust/origin lifecycle | Music/product/security | DOM-202 | State model choices | Approve before backfill |
| Venue/org/tour authorization source | Architecture/security | DOM-402 | Relationship model | Explicit entity membership |
| Comment visibility contract | Product/backend/security | API-002 | Visibility matrix | Shared parent-aware helper |
| Comment count mechanism | Backend/database | API-006 | Trigger / RPC / derived | Atomic trigger or approved RPC |
| MFA role requirements | Security/product | AUTH-003 | Optional / required tiers | Required for privileged roles |
| `artist-photos` storage | Product/backend | STO-002 | New bucket / canonical existing | Decide from manifest |
| Lint ratchet | QA/platform | QLT-002 | Global count / per-rule | No-new plus per-rule burn-down |
| Observation windows | Release/SRE | REL-004/005 | By risk class | Longer for Auth/finance/PII |

## Decision record template

```text
Decision ID:
Title:
Date:
Owner:
Approvers:
Related task IDs:
Context:
Options considered:
Decision:
Data preservation impact:
Authorization impact:
Compatibility window:
Feature flag:
Validation:
Rollback/forward-fix:
Revisit date:
```

## Escalation rules

Escalate to the release lead when:

- Production identity cannot be proven.
- A migration effect cannot be classified.
- A data mapping is ambiguous.
- A function has no owner but remains callable.
- Product behavior and tests disagree.
- A proposed fix requires destructive DDL.
- A necessary production write exceeds the authorized scope.

Escalate to security when:

- A service-role route lacks explicit authorization.
- Anonymous/authenticated clients can directly call internal functions.
- Cross-tenant access differs from the approved matrix.
- Hiring PII, finance, rights, or private documents may be exposed.

Escalate to product/domain ownership when:

- A missing schema target has no confirmed active use.
- Several overlapping object families compete as canonical.
- A feature must be gated rather than silently returning empty data.

## Risk review cadence

- Daily during Phases 0–3.
- At every production migration batch.
- Weekly during Phases 4–6.
- Immediately after any stop condition or rollback.

Risk closure requires evidence; it is not closed by accepting it informally.
