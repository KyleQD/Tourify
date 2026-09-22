# SEC-003 — Admin navigation and API capability matrix

**Status:** Blocked on product/security sign-off  
**Repository review:** 2026-07-21

## Canonical sources

- Capability catalog and default roles: `lib/auth/admin-capabilities.ts`
- Navigation rules: `lib/admin/capability-aware-ui.ts`
- API route/method contracts: `lib/admin/api-route-registry.ts`
- Deterministic review renderer: `scripts/security/render-sec003-capability-matrix.ts`

Generate the complete review document without changing application or database state:

```text
npx tsx scripts/security/render-sec003-capability-matrix.ts --output sec003-capability-review.md
```

The output lists every canonical Admin navigation rule and every registered API route/method, its auth class, capability mode, capabilities, computed default roles, and domain owner. The output file is written with mode `0600` and belongs in access-controlled review evidence, not application logs.

## Decisions applied

1. Every canonical sidebar leaf has an explicit navigation rule. The base Dashboard is an exact match so an unknown child route cannot inherit a broad rule accidentally.
2. Unknown `/admin/*` navigation fails closed. Capability-controlled navigation also fails closed while capabilities are loading.
3. Read methods retain their declared view/command capability. Generic writes promote `*.view` to the matching `*.manage`/edit capability.
4. High-risk publish, archive, delete, refund, audit/export, settlement, and delivery commands have explicit overlays.
5. Multi-capability requirements state whether they are `allOf`, `anyOf`, or `actionScoped`. `actionScoped` requires a validated command discriminator to select the exact capability; it is not a permission union.
6. Public-share and service-job routes use their explicit non-user principal contract. They never acquire authority from a normal Admin role.
7. Default roles are computed from the accepted catalog rather than copied into a second stale table. Custom roles remain explicit-only.
8. `department_manager` is now an exact workforce-focused subset: operational reads plus workforce manage/publish, communications send, and audit. Production/tour/event writes require explicit grants.

## Strict limitations

- The registry is a decision/inventory. It does not prove that every route currently enforces the listed method/action capability; `SEC-104` owns route convergence and CI enforcement.
- Legacy routes remain visibly classified `legacy_pending_migration`; a matrix row does not relabel them as secure.
- Product and security sign-off cannot be inferred or self-approved by implementation. Both review rows in the generated artifact must name an approver, date, evidence location, and result.

## Acceptance gate

SEC-003 becomes complete only when the generated artifact is reviewed, all disagreements are corrected in the canonical sources, product and security both sign, and the signed result is retained in the controlled evidence system. Until then the strict ledger remains blocked here while independent Phase 0 work may continue.
