# Admin Feature Spec Revalidation — Task Log

### 2026-07-21 — `ADR-001`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — acting organization selection, trusted session binding, and ambiguous/missing-context rejection.
- **Phase:** 0
- **Decision trail:** The existing ADR and resolver still allowed a single-membership fallback. That conflicts with the stricter integration requirement that membership authorizes a selected organization but never selects one.
- **Change:** Updated ADR-001 and removed membership-derived fallback behavior from `resolveActingAdminContext`; missing header/session selection now returns `409 acting_context_required` without querying memberships.
- **Integration:** Preserves the existing account switcher, verified profile binding, session selection, capability loading, account-switch cache keys, and structured API errors.
- **SQL:** None. Existing tables remain unchanged.
- **Verify:** `admin-context` focused tests and touched-file lint.

### 2026-07-21 — `ADR-002`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — creator/master invariants, ownership transfer, and mandatory organization ownership for tours/events.
- **Phase:** 0
- **Decision trail:** The accepted ADR is concrete and consistent with the canonical `organizations.created_by`, `org_members.role = owner`, parent `org_id`, and delegated-grant design. Current database policies do not yet guarantee exactly one owner or accepted transfer; those are implementation gaps, not reasons to misstate the ADR decision.
- **Change:** Revalidated the decision without changing live behavior. Recorded exact-one-owner and transfer enforcement as mandatory SQL/API work for `SEC-105` and access-review work for `SEC-604`.
- **SQL:** Deferred to its implementation task so migration order remains phase-correct.
- **Verify:** Schema and policy trace across `organizations`, `org_members`, tour/event ownership, and entity grants.

### 2026-07-21 — `ADR-003`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — capability catalog, default roles, documented manager aliases, custom roles, and deny-by-default behavior.
- **Phase:** 0
- **Decision trail:** The ADR defines effective capabilities as defaults plus configured/custom permissions plus active grants. The resolver previously let an incomplete stored row strip required defaults and omitted the documented manager aliases.
- **Change:** Known roles now retain canonical defaults and union catalog-scoped configured permissions; custom roles receive only explicitly configured catalog permissions; production, department, finance, and ticketing manager aliases are supported; worker remains empty.
- **Integration:** Application resolution and `org_role_permissions` now share the same additive alias contract without overwriting older or customized permissions.
- **SQL:** Generated `supabase/migrations/20260721214919_admin_role_capability_aliases_sec003.sql` with the Supabase CLI. The migration unions permissions, validates minimum alias gates inside the transaction, and remains unapplied for manual push.
- **Verify:** 14 focused capability/UI tests pass; touched-file ESLint passes; the migration safety scanner passes all migrations including the new file.

### 2026-07-21 — `ADR-004`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — authority of tours, operational events, normalized stops, compatibility reads, detach semantics, and retirement gates.
- **Phase:** 0
- **Decision trail:** The identity decision remains correct, but the canonical-first reader treated an empty canonical draft as “missing” and silently revived legacy links. It also swallowed real canonical read errors. The create-with-stops path synthesized an undefined status property that the lifecycle guard correctly rejected.
- **Change:** Canonical draft presence is now distinct from stop count; zero stops is authoritative, non-availability alone enables compatibility reads, and real canonical read failures surface. Create-with-stops no longer introduces an unintended lifecycle write. The focused fake database now mirrors optimistic-version defaults and publication query operators.
- **Integration:** Existing `tour_events` compatibility behavior, normalized `tour_stops`, optimistic versioning, detach-without-event-delete, publication lifecycle, and route projection remain intact.
- **SQL:** None. No hosted or local database was changed.
- **Verify:** 33 focused tour-plan/backfill/tour-event integration tests pass; touched-file ESLint passes.

### 2026-07-21 — `ADR-005`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — immutable snapshots, evaluated audiences, durable delivery, acknowledgements, corrections, retraction, and supersession.
- **Phase:** 0
- **Decision trail:** The service layer preserved payloads during lifecycle transitions, but the database granted authenticated managers broad update access to committed snapshots, sections, audiences, and recipients. The SQL comment promised immutability without enforcing it.
- **Change:** Added a generated manual migration that keeps direct snapshot/child assembly draft-only, prevents committed content mutation, validates same-org committed successors and retraction metadata, requires `tour.publish` for lifecycle changes, and makes terminal snapshots immutable. Delivery, acknowledgement, and share-link operational state remains mutable through its dedicated contracts.
- **Integration:** Transactional publish remains the only committed-insert path; supersede/retract continue to retain history, revoke access, notify recipients, and audit the transition.
- **SQL:** Generated `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql`; unapplied and queued for manual review/push.
- **Verify:** 22 focused publication tests pass; touched-file ESLint and migration safety scan pass.

### 2026-07-21 — `ADR-006`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — default publication blockers versus warnings and authorized override behavior.
- **Phase:** 0
- **Decision trail:** The accepted ADR and shared rule catalog agree that title/schedule/venue identity and a valid confirmed tour stop are default blockers, while venue-profile, staffing, and logistics incompleteness are warnings unless organization policy elevates them. Warning overrides require publish authority and an audited reason; blockers remain forbidden.
- **Change:** Revalidated the decision and shared event/tour rule IDs without changing persistence. The persisted tour engine still needs explicit duplicate-ordinal, org-ownership, route-impossibility, ticketing-reconciliation, and confirmed-show enforcement; those remain mandatory implementation work at `PLAN-206`/`PUB-201` rather than being misreported as complete here.
- **SQL:** None.
- **Verify:** 16 focused readiness, override, remediation, and change-set tests pass.

### 2026-07-21 — `ADR-007`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — canonical ticketing destination, legacy cutoff, organization cutover, reconciliation, and finance handoff.
- **Phase:** 0
- **Decision trail:** The canonical destination and legacy retirement decision is correct. The current read model still treats some canonical query errors as empty arrays and uses environment enablement rather than persisted organization cutover evidence; either can produce false confidence.
- **Change:** Expanded ADR-007 so denied/missing/unavailable canonical sources explicitly block cutover and environment flags cannot replace a persisted per-organization decision. Implementation remains mandatory at `TIX-104`/`TIX-601` rather than hidden in the ADR task.
- **SQL:** None.
- **Verify:** 38 focused legacy-policy, foundation-RLS, command-schema, dual-read, and Phase 6 retirement tests pass.

### 2026-07-21 — `ADR-008`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — operational finance scope, thresholds, settlements, external accounting, currencies, and correction rules.
- **Phase:** 0
- **Decision trail:** The operational-subledger boundary is correct, but “owner override” was too broad without an explicit separation-of-duties boundary and the decision did not state which financial records become immutable.
- **Change:** Clarified that threshold override is reasoned/audited, organization separation rules cannot be silently bypassed by ownership, and approved/posted/final records use linked versions, adjustments, or reversals instead of overwrite.
- **SQL:** None.
- **Verify:** 77 focused finance schema, reversal, domain, settlement, authorization, and RLS contract tests pass.

### 2026-07-21 — `ADR-009`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — archive versus deletion and retention for finance, ticketing, contracts, incidents, documents, and audit history.
- **Phase:** 0
- **Decision trail:** The accepted archive-first and draft-only hard-delete rules are aligned with the eligibility service. The physical-purge boundary needed explicit operational safety requirements rather than relying only on a future job name.
- **Change:** Clarified that archive never weakens retention/legal hold/audit history and that purge is service-owned, org-scoped, previewable, idempotent, audited, and fail-closed on unavailable evidence.
- **SQL:** None.
- **Verify:** 60 focused deletion eligibility, archive/restore, lifecycle, state-aware authorization, and retention-control tests pass.

### 2026-07-21 — `ADR-010`

- **Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md` — UTC storage, venue-local display, DST behavior, reporting currency, FX evidence, and rounding.
- **Phase:** 0
- **Decision trail:** The accepted time/currency basis is correct. The current pure currency helper still defaults unknown codes to two decimals, and some reporting helpers omit unavailable FX amounts from converted totals; those fallbacks must not become the product contract.
- **Change:** Clarified explicit DST fold/gap handling, uppercase supported-currency validation, and unavailable/stale reporting state when FX evidence is missing rather than silent shifting, zeroing, or omission. Implementation remains tracked at `REL-301`/`FIN-511`.
- **SQL:** None.
- **Verify:** 103 focused DST, route-timezone, FX, expense, and event setup tests pass.

### 2026-07-21 — `ADR-011` (supplemental SEC-111 decision)

- **Spec:** `docs/architecture/adr/ADR-011-security-audit-fail-policy.md`; aligns with `SEC-111` although it is not an additional ID in the canonical 362-task inventory.
- **Phase:** 0 safety harness
- **Decision trail:** The writer labeled mutations fail-closed, but `executeOrgCommand` wrote only after the handler and forced the write open. An audit outage therefore could not stop the mutation.
- **Change:** Shared commands now persist an organization-scoped authorized-intent event before invoking the handler. Audit failure returns structured `503 dependency_unavailable` and does not call the handler. Outcome logging remains best-effort; critical domains still require state mutation and outcome audit/outbox in one database transaction.
- **SQL:** None; existing append-only security audit schema/RPC remains unchanged.
- **Verify:** 22 focused command, writer, and authorization tests pass; touched-file ESLint passes.

### 2026-07-21 — `PLAN-001`

- **Spec:** `docs/admin-feature-specs/03_Tour_Builder_Stops_Routing_and_Holds.md` — approve stop/event identity rules for every creation, attachment, retention, and protection case.
- **Phase:** 0
- **Decision trail:** ADR-004 selected the correct canonical records and detach semantics but did not spell out every acceptance case, leaving cancellation, archive, draft deletion, and settlement protection implicit.
- **Change:** Added an explicit operation/result matrix covering new, existing, and shared events; non-show days; detach; cancel; archive; eligible draft hard-delete; and protected/settled stop changes.
- **SQL:** None.
- **Verify:** Cross-checked against canonical plan/event services, lifecycle protection, archive preview, draft deletion eligibility, and the 33 passing ADR-004 integration tests.

### 2026-07-21 — `PLAN-002`

- **Spec:** `docs/admin-feature-specs/03_Tour_Builder_Stops_Routing_and_Holds.md` — every current route/settings field needs a canonical destination, migration/default rule, compatibility period, and retirement owner.
- **Phase:** 0
- **Decision trail:** The historical inventory still called `tour_events` authoritative, described `tour_stops`/route legs as unfinished, used vague “Yes” compatibility periods, and omitted most stop-editor fields.
- **Change:** Rebuilt the inventory around canonical versioned stops; added explicit mappings for identity, type, ordinal, local date/time/zone, windows, venue, market, capacity, status, notes, contacts, assignment metadata, legacy aliases, operational intent, and domain-owned free text. Documented the real builder save path and per-org reconciliation/telemetry retirement gates.
- **SQL:** None.
- **Verify:** Source trace across the builder, canonical plan service, normalization/backfill, stop/hold migrations, event compatibility service, and route-leg schema.

### 2026-07-21 — `PLAN-003`

- **Spec:** Same document — venue-profile and staffing requirements must be decided and UI/server/tests must use one explainable contract.
- **Phase:** 0
- **Decision trail:** ADR-006 and the shared rule catalog consistently define venue identity as a blocker while venue-profile and staffing gaps are warnings by default. Organization policy may elevate warnings later.
- **Change:** Revalidated the shared rule IDs, severity, evidence, remediation URLs, and capability-only warning overrides without adding a second readiness implementation.
- **SQL:** None.
- **Verify:** 33 focused builder utility, tour/event operation, event readiness, and persisted plan readiness/change-set tests pass.

### 2026-07-21 — `PUB-001`

- **Spec:** `docs/admin-feature-specs/04_Publication_Sharing_and_Work_Mode.md` — publication decision must cover immutable snapshots, publication types, readiness/overrides, evaluated audiences, acknowledgement, correction, retraction, and retention.
- **Phase:** 0
- **Decision trail:** The publication decision and ADR-005 together cover every acceptance item. The earlier database audit found that immutability was not fully enforced below the service layer; that is now addressed by an expand-only manual migration rather than by weakening or rewriting the accepted decision.
- **Change:** Revalidated PUB-001 as the implementation contract. No duplicate publication model or route was introduced.
- **SQL:** Uses the already queued, unapplied `supabase/migrations/20260721215705_admin_publication_snapshot_immutability_adr005.sql` database guard.
- **Verify:** ADR trace plus the 22 passing focused publication tests and migration safety scan recorded under ADR-005.

### 2026-07-21 — `PUB-002`

- **Spec:** `docs/admin-feature-specs/04_Publication_Sharing_and_Work_Mode.md` — every publication section and field must carry an audience class.
- **Phase:** 0
- **Decision trail:** The discovery note listed broad families, but the live commit path only recognized contacts and itinerary and silently classified every other section as internal. No runtime contract classified nested fields, so the acceptance criterion was documentation-only.
- **Change:** Added a canonical fail-closed section/field policy. Every included payload leaf inherits a section class, protected leaf rules raise sensitivity, caller overrides may raise but never downgrade policy, and unknown custom sections require an explicit class. The renderer records normalized field paths and effective access classification in the immutable manifest; transactional section rows retain that evidence in `source_ref`.
- **Integration:** Extended the existing publish endpoint and snapshot renderer rather than creating a parallel publishing route. Rebuilt the discovery inventory to cover all twelve publication types and the protected-field families.
- **SQL:** None. The existing JSON manifest/source-reference columns carry the additive classification evidence.
- **Verify:** 23 focused policy, renderer, audience, schema, and transactional-publish tests pass; touched-file ESLint passes.

### 2026-07-21 — `PUB-101`

- **Spec:** `docs/admin-feature-specs/04_Publication_Sharing_and_Work_Mode.md` — atomic domain/outbox persistence, idempotent workers, retry/backoff, dead letters, replay, and correlation.
- **Phase:** 0–1 infrastructure
- **Decision trail:** The base schema had the correct durable model and atomic publication commit, but authenticated callers could invoke an overly broad security-definer enqueue, worker completion/failure/replay functions accepted only an outbox ID, crashed claims never expired, suppressed work retried, and replay retained an exhausted attempt count.
- **Change:** Hardened the existing contract without replacing its tables. The commit RPC now verifies actor/capability and serializes idempotency keys, rejecting payload conflicts. New worker RPCs require `org_id` and the current worker lease. Claiming recovers 15-minute stale leases, limits batches, and replay resets attempts. The application uses only the scoped RPCs and the cron discovers both due and stale work.
- **SQL:** Generated `supabase/migrations/20260721221325_admin_publication_outbox_hardening_pub101.sql`; unapplied and queued for manual review/push. It contains no row/table/column deletion.
- **Verify:** 31 focused outbox, transactional-publish, lifecycle, and fault-injection tests pass; touched-file ESLint and migration safety scan pass.

### 2026-07-21 — `PUB-102`

- **Spec:** `docs/admin-feature-specs/04_Publication_Sharing_and_Work_Mode.md` — snapshot, section, audience, recipient, delivery, acknowledgement, share token, access log, and outbox relations require organization-scoped RLS.
- **Phase:** 0–1 infrastructure
- **Decision trail:** Every table carried `org_id`, but child rows did not prove it matched the canonical parent. Broad `tour.view` read policies also exposed full snapshot bodies, recipient PII, delivery evidence, and hashed share credentials to any viewer in the organization.
- **Change:** Added deterministic parent-derived ownership repair and composite `(parent_id, org_id)` foreign keys. Ambiguous historical parentage is copied to an RLS-protected quarantine table and retained for review; clean constraints are validated while every new write is protected even if an old mismatch keeps a constraint `NOT VALID`. Replaced broad read policies in-transaction so direct sensitive reads require manage/publish or audit authority, and self-acknowledgement is bound to the authenticated recipient.
- **SQL:** Generated `supabase/migrations/20260721221811_admin_publication_parent_scope_rls_pub102.sql`; unapplied and queued for manual review/push. No row, table, or column is removed.
- **Verify:** 47 focused schema, policy, classification, transactional publish, and tour-book tests pass; touched-file ESLint and migration safety scan pass. Local database parsing was unavailable because the Docker-backed Supabase runtime is not accessible in this sandbox, so isolated-branch execution remains a required manual gate.

### 2026-07-21 — `PUB-103` (early Phase 1 hardening)

- **Spec:** `docs/admin-feature-specs/04_Publication_Sharing_and_Work_Mode.md` — in-app is first class and all channel adapters expose request, provider ID, delivery state, retryability, cost, and consent metadata.
- **Phase:** 1 (completed early while closing the publication safety chain; strict pointer returns to Phase 0 at TIX-001)
- **Decision trail:** The normalized adapter contract existed, but lower-level senders discarded Resend IDs, Twilio message SIDs, and Expo ticket IDs. Adapters substituted an internal idempotency key as the provider receipt. Email/push also defaulted consent to granted even while declaring consent required.
- **Change:** Channel senders now return provider identity and receipt references; adapters preserve them or return `null` rather than inventing evidence. Email, SMS, and push fail consent closed unless grant evidence is supplied; in-app remains the first-class transactional channel.
- **SQL:** None.
- **Verify:** 10 focused channel-adapter and outbox tests pass; touched-file ESLint passes.

### 2026-07-21 — `TIX-001`

- **Spec:** `docs/admin-feature-specs/09_Ticketing_Admissions_and_Guest_Lists.md` — canonical destination, inventory ledger, provider boundary, cutover, refunds, capacity source, and retention must all be decided.
- **Phase:** 0
- **Decision trail:** ADR-007 correctly selected the July 2026 foundation and fail-closed cutover, but left ledger semantics, provider authority, capacity, correction behavior, exact destination families, and retention implicit.
- **Change:** Expanded ADR-007/TIX-001 with the canonical relation families; balanced append-only inventory movements; transactional oversell protection; explicit non-fabricated capacity; distinct signed/idempotent provider imports and quarantine; reasoned separation-of-duties refund/void/transfer/comp/override commands; reconciliation gates; finance handoff; and ADR-009 retention/legal hold.
- **SQL:** None.
- **Verify:** 41 focused legacy RLS, foundation RLS, command schema, dual-read, reconciliation, and retirement tests pass.

### 2026-07-21 — `TIX-002`

- **Spec:** `docs/admin-feature-specs/09_Ticketing_Admissions_and_Guest_Lists.md` — every table, route, page, job, webhook, and report must map to a destination, compatibility period, reconciliation query, and retirement milestone.
- **Phase:** 0
- **Decision trail:** The prior discovery page named only the Admin folder, API folder, and legacy policies. Repository tracing showed that `ticket_types` and `ticket_sales` are active bridge anchors extended and referenced by the July foundation, many Admin/public/artist/venue/reporting consumers still use them, and no persisted inventory-ledger table or provider/offline reconciliation workers exist.
- **Change:** Rebuilt the inventory across data relations, Admin/public/artist/venue/business UI and APIs, checkout/issuance/admission services, Stripe webhook, analytics/exports/settlement, and absent jobs. Added read-only comparison SQL, source-unavailable semantics, named domain ownership, per-organization compatibility gates, and explicit no-delete retirement rules. Classified backup-only provider tables as non-deployed artifacts and `event_ticket_types` as inactive read-only compatibility.
- **SQL:** None. The included SQL is read-only branch reconciliation evidence, not a migration.
- **Verify:** 33 focused ticketing read-model, legacy-policy, reporting-consumer, and Phase 6 reconciliation tests pass; independent admin audit cross-check incorporated.

### 2026-07-21 — `FIN-001`

- **Spec:** `docs/admin-feature-specs/10_Finance_Budgets_Expenses_and_Settlements.md` — authoritative records, statuses/posting, currency/FX/rounding, approval/separation, settlement, correction, retention, and external system boundary.
- **Phase:** 0
- **Decision trail:** ADR-008 had the correct operational-subledger scope and separation/immutability principles but left record authority, lifecycle/posting semantics, detailed FX evidence, retention, and export acknowledgement implicit.
- **Change:** Defined authority for budgets, commitments/POs, claims, postings/payments, settlements, and governed read models; draft-to-posted/payment state boundaries; linked adjustments/reversals; uppercase supported currencies and minor-unit/FX evidence; ADR-009 retention; and durable versioned external exports that cannot rewrite internal authorization history.
- **SQL:** None.
- **Verify:** 142 focused finance command/domain/expense/projection/reversal/RLS/scope/tenant, settlement, and time-currency tests pass.

### 2026-07-21 — `FIN-002` (blocked on hosted read-only evidence)

- **Spec:** `docs/admin-feature-specs/10_Finance_Budgets_Expenses_and_Settlements.md` — deployed tables/policies/grants/row counts, org/parent coverage, currency formats, duplicates, orphans/raw IDs, and legacy consumers.
- **Phase:** 0
- **Decision trail:** Repository evidence can prove intended migrations and consumers but cannot truthfully prove hosted migration history, effective policy overlays/grants, row counts, quarantine contents, duplicates, parent mismatches, or advisors. Treating query failure as zero would violate the request-state and finance contracts.
- **Change:** Rebuilt the repository inventory for core and optional hosted tables, effective migration stack, currency/immutability/duplicate risks, and every UI/API/report/lifecycle consumer. Added a single read-only hosted evidence pack at `docs/admin-feature-specs/revalidation/sql/FIN-002-hosted-audit.sql` with migration, schema, RLS, grant, count, mismatch, duplicate, currency, constraint/index, verification-RPC, and quarantine queries.
- **SQL:** Read-only audit SQL only; it is not a migration and has not been executed. No hosted database was contacted or changed.
- **Blocker:** Run the unchanged evidence pack and Supabase Security/Performance advisors on an isolated branch and Tourify Demo, preserving project/time metadata. Any unresolved mismatch requires an expand-only quarantine/forward-fix migration before this item can become `done`.
- **Verify:** Repository audit cross-checked by the admin audit agent; no destructive statements are present in the evidence pack.

### 2026-07-21 — `CONT-101`

- **Spec:** `docs/admin-feature-specs/11_Vendors_Procurement_and_Contracts.md` — contract types/states, template/version, approval, signature modes, executed definition, amendment, obligation, retention, and provider boundary.
- **Phase:** 0
- **Decision trail:** The prior 18-line ADR omitted approval and execution definitions, conflicted with canonical status/provider types, and allowed an external-provider configuration failure to be conceptually hidden by an internal fallback. Current contract code is pure/test-only or legacy hiring compatibility, not canonical persistence.
- **Change:** Expanded the ADR with canonical types and exact template/contract states; immutable version/input/render/checksum pinning; version-bound legal/finance/business approval and separation; separate signature modes/providers; evidence-based executed/active semantics; linked amendment/termination/renewal; typed obligations/evidence/escalation; seven-year-plus ADR-009 retention/legal hold; and signed, idempotent, replay-safe, fail-closed provider/webhook rules.
- **Integration:** Legacy `artist_contracts`, hiring helpers, and pure domain functions are explicitly compatibility/backend contracts until CONT-501–602 implement persistence, RLS, commands, UI, provider operations, and acceptance tests.
- **SQL:** None.
- **Verify:** 64 focused contract and vendor domain tests pass; independent contract audit cross-check incorporated.

### 2026-07-21 — `SEC-001` (blocked on database evidence)

- **Spec:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` — automated deployed export must cover relations/RLS, policies, functions, triggers, grants, migration versions, and reviewed repository drift.
- **Phase:** 0
- **Decision trail:** The previous document counted migration text and labeled itself complete even though it did not inspect a database, omitted several required object classes, and was stale by 48 top-level migrations. Repository SQL cannot prove hosted state or manual drift.
- **Change:** Replaced the stale claim with a strict inventory runbook; added one SELECT-only normalized JSON exporter and a deterministic fail-closed comparator with tests. The same SQL is designed to run against an isolated migration-built branch and Tourify Demo, so the comparison is based on database state rather than regex inference. Raw hosted output is explicitly excluded from the repository and application logs.
- **SQL:** `docs/admin-feature-specs/revalidation/sql/SEC-001-security-inventory.sql` is a read-only evidence query, not a migration, and has not been executed against a hosted database.
- **Blocker:** Isolated-branch and Tourify Demo exports, Supabase Security/Performance Advisor reports, drift disposition, and product/security sign-off require external database access and cannot be fabricated locally.
- **Verify:** Comparator syntax and three deterministic drift tests pass. Executable statements in the export are SELECT-only. No database was contacted or changed.

### 2026-07-21 — `SEC-002`

- **Spec:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` — acting-context ADR must decide session format, switching, multi-tab behavior, expiry, support access, `409` behavior, and threats.
- **Phase:** 0
- **Decision trail:** The accepted ADR still made unsigned client headers the first authority source and claimed stale tabs were detected even though the resolver returns before reading the server session. It named no signature format, session binding, selection version, issuance/expiry claims, or support-grant limits.
- **Change:** Defined a versioned HMAC/JWS-compatible HTTP-only envelope bound to the authenticated subject/session and a matching server-side profile/org/epoch record; made headers assertions only; specified compare-and-swap switching, stale-tab `409` behavior, complete `actingContextKey`, synchronous old-data removal, eight-hour/earlier-bound expiry, revocation, constrained support grants, typed failures, and an expanded threat model.
- **Boundary:** This Phase 0 task approves the contract. The current unsigned-header-first implementation is explicitly compatibility code until `SEC-101` implements and tests the signed/session epoch behavior; the ADR no longer overstates current enforcement.
- **SQL:** None.
- **Verify:** 16 existing acting-context, authorized-organization, and request-state tests pass. They validate current no-fallback behavior; the new signature/switch-race/expiry/support cases remain acceptance work for `SEC-101`.

### 2026-07-21 — `SEC-003` (blocked on human sign-off)

- **Spec:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` — every Admin navigation item and API command maps to one or more capabilities and default roles, with product/security approval.
- **Phase:** 0
- **Decision trail:** The previous matrix omitted eight live sidebar leaves, explicitly deferred API methods, failed unknown navigation open, and contained no approver evidence. The route registry assigned one capability to whole multi-method routes, allowing read capabilities to describe writes.
- **Change:** Added explicit rules for every canonical sidebar leaf and an exact-only Dashboard rule; unknown Admin paths and permission-loading states fail closed. Added a route-method matrix that promotes generic writes, supplies explicit high-risk publish/archive/refund/settlement/export/delivery overlays, declares `allOf`/`anyOf`/`actionScoped`/principal semantics, and computes default roles from the canonical catalog. Added a deterministic owner-only review renderer and corrected `department_manager` to the accepted workforce-focused subset in code and the unapplied manual migration.
- **Boundary:** The matrix does not pretend legacy routes already enforce it; `SEC-104` still owns route/command convergence. Product and security approval cannot be self-issued by code.
- **SQL:** Corrected the still-unapplied `20260721214919_admin_role_capability_aliases_sec003.sql`; no database was contacted or changed. Existing configured permissions remain additive.
- **Blocker:** Generate the controlled review artifact and obtain named product and security approvers, dates, evidence location, and acceptance after disagreements are resolved.
- **Verify:** 19 capability/nav/API matrix tests pass; touched ESLint passes; manual migration safety scan passes; review renderer executes and emits the full matrix.

### 2026-07-21 — `SEC-004` (blocked on persistence and isolated execution)

- **Spec:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` — a two-organization fixture needs a multi-org user, distinct owners/managers/viewers/workers, and parent/child records in every audited domain.
- **Phase:** 0
- **Decision trail:** The old scaffold used invalid PostgreSQL UUIDs, supplied manager/viewer/worker only for Org A, represented the multi-org user as labels without role rows, and named most domains without record identities. The live RLS suite remained a skipped placeholder.
- **Change:** Replaced invalid tour/stop/event IDs; added symmetric roles in Org B and explicit multi-org membership roles; defined distinct parent/child identities and canonical relation pairs for tours, events, travel, lodging, equipment, ticketing, finance, contracts, site maps, publications, and workforce; expanded the RLS parent/child inventory; added a SELECT-only isolated fixture preflight.
- **Boundary:** Canonical `contracts`/`contract_obligations` persistence does not exist, so an all-domain database seed cannot truthfully be claimed. The fixture contract explicitly reports this gap rather than seeding a fake parallel table. Direct-client RLS execution remains `SEC-601`/`REL-101` work.
- **SQL:** `SEC-004-isolated-fixture-preflight.sql` is read-only. Synthetic fixture data must never be seeded into Tourify Demo.
- **Blocker:** Complete canonical contract persistence in the ordered contract tasks, implement the isolated seed adapter, and execute the full two-org fixture against a disposable/isolated database.
- **Verify:** 10 structural fixture/RLS tests pass and one live database placeholder is skipped; touched ESLint passes; every fixture identity is a valid PostgreSQL UUID.

### 2026-07-21 — `SEC-005`

- **Spec:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` — migration process must cover dry run, counts, unresolved bucket, forward-fix, lock budget, and reusable verification queries.
- **Phase:** 0
- **Decision trail:** Documentation existed, but clean CI checkouts could skip committed PR migrations, deploy workflows bypassed the scanner, and the template had only a commented null-org example. The scanner did not fail blocking constraints, unscoped insert-select backfills, or per-table policy replacement.
- **Change:** Combined unstaged, staged, untracked, PR-base, push-before, and reviewed-base diffs; added safe Git argument handling and fail-closed invalid base behavior; rejected destructive SQL, unscoped data movement, blocking FK/check and not-null changes without evidence, and policy drops without same-table replacement. Added deterministic scanner tests. Expanded the template with row preservation, quarantine, parent mismatch, constraint, RLS, grants, migration history, and advisor evidence. Staging/production workflows now require committed-base validation, migration-history reconciliation, and official dry-run preview; production is manual-dispatch-only with controlled evidence reference.
- **SQL:** No migration generated or applied. Existing manual queue remains expand-only and passes the upgraded scanner.
- **Verify:** 4 scanner tests and 3 SEC-001 comparator tests pass; all five queued migrations pass the upgraded scanner; both evidence SQL files are SELECT-only; workflow YAML parses in the formatter check. Official Supabase CLI documentation confirms `migration list --linked` compares local/remote history and `db push --dry-run` previews changes without applying them.

### 2026-07-21 — `REL-001`

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — Node 20 strategy, package manager, and lockfile must be enforced locally and in CI without a legacy-peer bypass.
- **Phase:** 0
- **Decision trail:** The repository declared Node 20.x and had an untracked `.nvmrc`, but did not declare the package manager, enforce lockfile format, prevent `legacy-peer-deps`, or fail unsupported local tooling before install. Vercel still carried a legacy-peer override, assigned to REL-002.
- **Change:** Declared `npm@11.5.2`, npm engine range, npm lockfile v3 policy, strict engines, and no legacy peers; added a preinstall/toolchain gate and main-CI step that verify Node, npm invocation, lockfile, package-manager declaration, and engine contract.
- **SQL:** None.
- **Verify:** Current host passes on Node v20.19.0/npm 11.5.2/lockfile v3; two deterministic toolchain tests cover accepted and rejected configurations; diff checks pass.

### 2026-07-21 — `REL-002`

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — Base UI, date-fns, and DayPicker must use a supported peer set and clean lockfile install without `--legacy-peer-deps`.
- **Phase:** 0
- **Decision trail:** The prior artifact claimed success while both package overrides and Vercel's legacy-peer install remained. A clean isolated install succeeded but `npm ls` exposed the v8 DayPicker override as an invalid React peer graph.
- **Change:** Upgraded DayPicker to 9.11.1, removed both date-fns peer overrides, removed Vercel's legacy-peer flag, migrated all three calendar wrappers to v9 class names and Chevron component API, synchronized the lockfile, and added a silent CI peer-graph gate.
- **SQL:** None.
- **Verify:** Fresh disposable `npm ci --ignore-scripts` installs 1,855 packages with no legacy flag; focused peer graph exits 0 for Base UI 1.5.0, date-fns 4.4.0, DayPicker 9.11.1, and React/DOM 18.3.1. Touched calendar ESLint passes. Full typecheck reaches unrelated existing Admin/service errors and reports no calendar/DayPicker error.

### 2026-07-21 — `REL-003` (blocked on integrated source errors)

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — production build must exit 0 from a clean supported filesystem, with an environment-specific cleanup regression guard if needed.
- **Phase:** 0
- **Decision trail:** The old artifact claimed a green build from an earlier code state. Current Node 20 typecheck fails on integrated Admin routes/services before build completion; no DayPicker error and no historical `.next/export` ENOTEMPTY failure appears.
- **Change:** Corrected the evidence document, retained clean-checkout `npm run build:vercel` as the regression gate, and documented the exact evidence to capture if the filesystem cleanup race recurs. No compiler/build bypass was introduced.
- **SQL:** None.
- **Blocker:** Resolve the current source TypeScript errors and prove a clean exit-0 production build. These are implementation errors, not an environment waiver.
- **Verify:** Supported toolchain, clean install, peer graph, and touched lint pass; full typecheck fails on recorded non-calendar source errors.

### 2026-07-21 — `REL-004`

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — required, optional, build-time, and runtime production values must be documented and fail once with a clear message before expensive build work.
- **Phase:** 0
- **Decision trail:** The previous artifact was documentation-only. The root layout emitted warnings during render/build, instrumentation logged another error without failing, both production build commands started Next directly, and the environment example did not express one enforceable contract.
- **Change:** Added one typed environment contract covering public, server-secret, required, conditional, and optional values; validates HTTPS URLs, exact encryption-key shape, separation of public/service-role keys, and complete optional adapter groups. Both production build commands now run one aggregate validator before Next compilation. Production instrumentation asserts the same contract once per process, and root-render warnings were removed. Main CI uses clearly labeled non-secret fixtures rather than hosted credentials.
- **Boundary:** The validator names variables and remediation only; it never prints values or reads/changes hosted secrets. Optional provider absence remains an explicit `unavailable` UI responsibility in its owning feature task, never a mock fallback.
- **SQL:** None. No database was contacted or changed.
- **Verify:** Four deterministic contract tests pass; touched ESLint passes; the validator exits nonzero with one aggregated message for the incomplete local production contract and exits zero with the complete non-secret CI fixture contract.

### 2026-07-21 — `REL-005`

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — product must decide venue-profile/staff blockers and implementation, UI, tests, fixtures, and migration behavior must share one rule contract.
- **Phase:** 0
- **Decision trail:** The shared severities already treated venue identity as a blocker and venue-profile/staffing gaps as warnings, but the builder omitted `staff_count`, persisted evaluation trusted a JSON venue id, and persisted staffing counted JSON selections rather than actual shifts. Warning overrides also lacked required reason evidence.
- **Change:** Recorded the product decision; the builder now reports selected crew separately from artists/vendors and waits for acting context before hydration. Persisted evaluation verifies the referenced venue-profile row and counts non-cancelled, event/org-scoped `staff_shifts`; missing/unavailable evidence fails to warning rather than ready. Publish continues to reload the persisted evaluation, and warning overrides now require a reason preserved in publication and audit evidence.
- **Migration boundary:** No event SQL function independently evaluates readiness, so no duplicate migration rule table was added. A future transactional RPC must consume versioned server evidence rather than hand-copy severities.
- **SQL:** None. No database was contacted or changed.
- **Verify:** 33 focused engine, persisted-evidence, and publish hardening tests pass; all touched files lint without errors or warnings.

### 2026-07-21 — `REL-006` (blocked on contract persistence and isolated execution)

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — deterministic two-org, multi-role, multi-stop data must cover every sensitive parent/child domain plus realistic volume, edge dates, and currencies.
- **Phase:** 0
- **Decision trail:** The prior module was only a stable identity catalog. It lacked scenario row/payload builders, volume, time/currency edges, protected projections, stale/revoked/replay states, and a hard guard against accidental hosted seeding. Catering and vendor protected documents were also absent from the audited domain set.
- **Change:** Added deterministic `minimal`, `realistic`, `edge`, and `crossTenantAttack` builders for 13 parent/child domains; database-shaped rows and API payloads share identities. Added DST fall-back/local-boundary times, USD/EUR/JPY exponents, realistic domain volumes, stale versions, expired grants, revoked membership, duplicate idempotency, guessed foreign IDs, and protected projections. Expanded the structural RLS matrix for catering and vendor documents. Any future seed target must be clearly local/test/preview and explicitly rejects Demo/production names.
- **Boundary:** `contracts`/`contract_obligations` remain a typed unpersisted contract until their ordered persistence task lands. No seed adapter or cleanup routine is enabled, so the factory cannot yet satisfy database execution or Playwright lifecycle acceptance.
- **SQL:** Existing `SEC-004-isolated-fixture-preflight.sql` remains SELECT-only and unapplied. No database was contacted or changed; fixtures are forbidden on Tourify Demo.
- **Blocker:** Land canonical contract persistence, map all scenario rows through an isolated-only adapter, execute direct-client RLS for all personas/domains, and prove isolated cleanup. This is also tracked by SEC-004/REL-101.
- **Verify:** 14 structural scenario/factory/RLS tests pass and one live database test remains deliberately skipped; touched ESLint passes.

### 2026-07-21 — `REL-007`

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — use supported ESLint CLI/config, snapshot warnings by rule/path, reject growth, and trend the Admin backlog to zero.
- **Phase:** 0
- **Decision trail:** `next lint` remained in package scripts even though the flat config and ESLint 9 were installed. The previous artifact proposed a suppressed command and had no baseline, comparator, exception governance, or CI gate. A whole-repository JSON pass under the compatibility adapter exceeded five minutes, while the governed Admin/CI scan is deterministic and completes in under one minute.
- **Change:** Replaced `next lint` with direct `eslint .`; added a normalized path+rule comparator, explicit baseline generation command, CI no-growth gate, and exception schema requiring owner/rationale/issue/expiry. Errors are never baselined; warning reductions are accepted automatically. The initial governed baseline covers Admin pages/routes/components/contracts/tests plus CI scripts and records the current count for burn-down.
- **Boundary:** Direct repository lint remains the first CI gate. The warning budget is initially Admin/CI-scoped for practical runtime and must expand as the compatibility config is replaced and backlog falls; baseline refresh is review-only, never automatic CI behavior.
- **SQL:** None.
- **Verify:** Three comparator/exception tests pass; the generated baseline records 101 governed warnings with zero errors; an immediate independent comparator run reports 101 current/101 baseline and exits zero; touched lint passes.

### 2026-07-21 — `REL-008` (blocked on isolated migration/RLS evidence)

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — organization flags require owner, purpose, environments, safe default, audit, metrics, rollback, expiry/removal issue, and safe unavailable behavior.
- **Phase:** 0
- **Decision trail:** The legacy global table used target arrays, broad organizer policies, profile-derived audit organization, direct service-role clients, destructive DELETE, and no governed metadata. Documentation alone overstated completion.
- **Change:** Added a code registry and deterministic fail-closed resolver; generated an expand-only schema for governed definitions, org/environment assignments, and immutable change history. Assignment commands now require explicit acting organization, `org.settings.manage`, user-scoped RLS, reason, idempotency key, actor, and expected version. Definitions are code/migration governed, assignments disable instead of delete, and the page clears account data while loading and shows owner, rollout, expiry, rollback, removal issue, errors, and unavailable states. The legacy table and rows remain untouched and are never used as a mock fallback.
- **SQL:** Added `20260721235608_admin_feature_flag_governance_rel008.sql` to the manual queue. It creates new tables/policies/triggers and two safe-default-off definitions; it does not infer assignments, remove policies/tables/rows, or modify legacy flags. No database was contacted or changed.
- **Blocker:** Parse/apply on an isolated Supabase branch, execute two-org owner/manager/viewer/outsider RLS and history immutability cases, review advisors/history, then promote the identical file manually. Until applied, the UI intentionally returns unavailable rather than using global legacy state.
- **Verify:** Six registry/resolver and capability-matrix tests pass; touched API/UI/contracts lint passes; the migration safety scanner explicitly passes the new migration. The aggregate scanner still fails unrelated pre-existing dirty-worktree migrations, which were preserved unchanged.

### 2026-07-21 — `REL-101` (blocked on isolated all-domain/prior-snapshot evidence)

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — migrations must apply from empty and a supported prior snapshot, then direct-role RLS tests must cover every persona and parent/child record.
- **Phase:** 1
- **Decision trail:** The old workflow ran a reset despite the no-reset operating rule and invoked only structural tests; its live suite was a skipped placeholder. It did not export local API credentials, create authenticated personas, or execute direct-client reads/writes.
- **Change:** Replaced reset with `supabase migration up --local` against the fresh ephemeral stack; exports throwaway local credentials and runs the canonical npm suite. Added a real live test that seeds deterministic users/organizations/tours through the ephemeral service role only, then verifies owner A/B isolation, viewer reads/write denial, outsider/anonymous denial, and service-role visibility. The discarded CI instance is the lifecycle boundary; no cleanup delete/reset is used.
- **Boundary:** Local runs skip live tests unless URL, anonymous key, and service key are all explicitly supplied. Fixture variables must never target Tourify Demo/production. Core tours are executable now; the all-domain matrix still depends on canonical contract persistence and an isolated seed adapter.
- **SQL:** None generated or applied. The workflow may apply repository migrations only to its disposable CI database.
- **Blocker:** Run the workflow, add every parent/child domain after ordered persistence, prove a supported prior-snapshot upgrade, and retain CI evidence. No isolated Supabase stack was started in this workspace.
- **Verify:** 14 structural tests pass and two live tests skip without isolated credentials; touched ESLint passes; workflow YAML parses.

### 2026-07-21 — `REL-102` (blocked on representative isolated evidence)

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — every migration requires preflight counts, locks/timing, batching, resume, unresolved-row handling, constraints/indexes, recovery, and postflight evidence.
- **Decision trail:** The prior scanner covered dangerous SQL but only checked that a generic Markdown template existed. Free-form exception comments bypassed checks, and hosted workflows could promote without a migration-specific record or completed isolated/staging proof.
- **Change:** Added a versioned v1 manifest schema and one truthful `planned` manifest for each of the six rerun SQL files. The scanner now prospectively requires matching manifests and machine-validates owner/reviewer, domains/risk, representative snapshot, preflight/affected rows, lock and timeout budgets, batching, resume cursor/idempotency, quarantine, constraints/indexes, rollback/forward-fix, postflight queries, verification owner, evidence stages, and governed exceptions. Free-form exception markers no longer bypass checks. Staging now requires `isolated_validated`; production requires `staging_validated`.
- **Safety boundary:** No manifest claims execution. All evidence fields remain null and all statuses remain `planned`; the staging gate was explicitly proven to fail. Existing applied migration history was not rewritten, and no database or Supabase project was contacted.
- **SQL:** No new SQL. The six existing manual migrations remain unchanged and unapplied.
- **Blocker:** Run the exact files on an isolated production-like branch, capture row counts, locks/timing, interruption/resume behavior, RLS matrix, postflight/advisor artifacts, and update each manifest with real evidence IDs before any staging or Tourify Demo promotion.
- **Verify:** Seven scanner/manifest/exception tests pass; all six queued migrations pass SQL plus manifest validation; touched ESLint, script syntax, and all JSON parsing pass; the isolated-required invocation exits 1 on `planned` as designed.

### 2026-07-21 — `REL-103` (blocked on legacy handler convergence)

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — every Admin endpoint must declare acting context, capability, request/response schema, idempotency, audit, and ownership, and CI must reject unclassified routes.
- **Decision trail:** The previous checker searched registry source text for route strings and could not detect stale entries, duplicate routes, method drift, or coarse route-level contracts. About half of the registry remains intentionally legacy and cannot truthfully be treated as runtime-enforced.
- **Change:** Added a canonical per-method contract projection containing acting-context class, capability/mode, stable request/response schema IDs, idempotency, audit, owner, and legacy state. Replaced string matching with TypeScript-AST comparison against actual exported handlers; CI now rejects missing/duplicate/stale routes and methods, missing declarations, and growth above the checked-in 122-route legacy ceiling. Synchronized registry methods to all current handlers and expanded the generated security review matrix and focused contract tests.
- **Boundary:** No handler was silently reclassified or rewritten. Schema IDs make missing runtime validators reviewable but do not pretend to validate payloads. `legacy_missing` makes absent write idempotency/audit explicit, and declarations alone do not prove handler authorization.
- **SQL:** None. No database or Supabase environment was contacted.
- **Blocker:** Convert the 122 legacy routes by domain to shared acting-context/capability wrappers, concrete request/response validators, idempotency, audit emission, and denial/replay tests; reduce the checked-in ceiling with each conversion until zero.
- **Verify:** Registry gate passes with exact 232-route parity and 122/122 legacy ceiling; four focused matrix tests pass; touched ESLint passes; capability-review generation succeeds.

### 2026-07-21 — `REL-104` (blocked on hosted security-control evidence)

- **Spec:** `docs/admin-feature-specs/14_QA_Observability_Migrations_and_Deployment.md` — prevent committed secrets and known critical vulnerabilities; every exception requires ownership, rationale, expiry, and production exploitability review.
- **Decision trail:** The prior artifact called a single `npm audit` step and assumed GitHub push protection sufficient while explicitly deferring SAST/SBOM. The repository did not enforce secret scanning, CodeQL, PR dependency review, retained SBOMs, or machine-valid exception metadata.
- **Change:** Added a dedicated security workflow for full-history Gitleaks, CodeQL JavaScript/TypeScript `security-extended`, critical-severity PR dependency review, and CycloneDX JSON SBOM artifact retention. Added a versioned empty exception registry and validator requiring finding identity, owner, rationale, issue, future expiry, mitigation, and a reviewed `not_exploitable`, `mitigated`, or `production_blocked` decision; unknown exploitability cannot waive a failure. Existing critical `npm audit` remains.
- **Boundary:** No scanner finding is suppressed, and no hosted GitHub setting is inferred from workflow YAML. No SQL or Supabase environment was touched.
- **Blocker:** Prove successful hosted runs/artifacts; enable required GitHub Dependency Graph, code scanning/GHAS, native secret scanning/push protection, any required Gitleaks license, safe fork permissions, and branch-protection required checks.
- **Verify:** Empty registry validation passes; three validator tests pass; touched ESLint and workflow YAML parsing pass.

### 2026-07-21 — phase-order correction

- `REP-001` is the final Phase 0 inventory item after `REL-008`. It was omitted when the rerun pointer advanced to REL-101. The pointer is restored to `REP-001` before any further Phase 1 task; completed REL-101–104 hardening is preserved and not rewritten.

### 2026-07-21 — `REP-001`

- **Spec:** `docs/admin-feature-specs/13_Reporting_Exports_and_Analytics.md` — product/data owners document definition, source, freshness, access, and reconciliation for every current/planned Admin metric; duplicate/conflicting metrics are flagged.
- **Decision trail:** The previous artifact listed only eight names and short formulas. It omitted business question, dimensions, inclusion/exclusion, statuses, currency/time zone, version mode, separate product/data ownership, reconciliation, consumers, and conflict governance; it also did not cover the REP-101 inventory.
- **Change:** Added a typed 24+ field KPI catalog. Eight canonical seed metrics now define exact business/formula/population/source/status/grain/unit/currency/time-zone/freshness/version/access/degraded/reconciliation contracts. Every one of the 60 inventoried reporting consumers receives an explicit `legacy_conflict` record retaining its discovered source/formula/owner while flagging unresolved access, currency, time zone, organization scope, mock/empty behavior, and duplicate replacement families. Validation rejects duplicate IDs, uncovered consumers, incomplete records, and unflagged legacy metrics.
- **Boundary:** Catalog metadata does not make legacy client formulas authoritative. All 60 legacy records stay conflicting until REP-201+ replaces and reconciles them; zero/failure ambiguity is not normalized into fake metrics.
- **SQL:** None. No database or Supabase environment was contacted.
- **Verify:** Four focused catalog tests pass; touched ESLint passes; integrated TypeScript reports no KPI-catalog errors. Catalog stats are 68 total, 8 canonical, 60 legacy conflicts, and 15 duplicate candidates.

### 2026-07-21 — `SEC-101` (blocked on isolated SQL and runtime cutover)

- **Spec:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` — implement the ADR-001 signed acting selection, trusted server session, stale-tab/epoch behavior, expiry/revocation, and complete context key without membership fallback.
- **Decision trail:** The existing resolver treats unsigned headers as authority and otherwise trusts two compatibility `user_sessions` fields. Client switching updates visible state first, persists best-effort, and has no epoch/CAS, session binding, expiry/revocation, or membership/capability version. A code-only rewrite would fail closed for every current user without the required persistence boundary.
- **Change:** Generated an expand-only canonical migration with per-auth-session profile/org/epoch/selected/expiry/nonce/revocation/version state and append-only audit. Direct authenticated table access is revoked; own-session SECURITY DEFINER RPCs bind to `auth.uid()` plus the JWT session ID hash, verify active profile/membership/capabilities, perform epoch CAS, return an auditable stale result, resolve only unexpired/unrevoked/current-version records, and revoke with reason. Added HMAC-SHA256 `v1.kid.payload.signature` primitives with key overlap, exact-claim validation, subject/session/expiry/tamper checks, nonce/session hashes, and full context-key hashing.
- **Safety boundary:** Existing `user_sessions`, rows, and policies are untouched; no selection is inferred/backfilled. The new schema is inert until an authenticated explicit switch and runtime cutover. No Supabase project was contacted and no SQL was applied.
- **SQL:** Added `20260722002848_admin_signed_acting_context_sec101.sql` as manual queue item 7 with a truthful `planned` validation manifest.
- **Blocker:** Parse/apply on an isolated branch; prove RLS/grants/CAS/concurrent sessions/expiry/revocation/version invalidation/advisors; configure rotated server-only signing keys; add cookie switch/resolve/revoke routes; replace unsigned/header compatibility authority; wire server-confirmed client switching, synchronous cache clearing, stale response discard, and no mutation replay.
- **Verify:** Migration safety scan and manifest pass; three static migration contract tests and four signing/envelope/context-key tests pass; touched ESLint passes.

### 2026-07-21 — `SEC-102`

- **Spec:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` — effective capabilities combine system role, custom role, creator/master invariant, membership state, and scoped grants with precedence/expiry tests.
- **Decision trail:** The existing resolver defaulted missing/unknown membership status to active and flattened every non-expired grant into organization-wide capabilities, so an entity grant could escape its target. It did not separately model custom roles, creator/master state, membership expiry, grant revocation, or exact entity scope.
- **Change:** Membership now must be explicitly active and have a valid future expiry when supplied. Active creator/master retains the full catalog; otherwise system defaults union catalog-valid legacy/canonical custom capabilities. Grants must be non-revoked, unexpired, and match the organization or exact tour/event/site-map/document target; unscoped compatibility grants never promote into an entity command. Added a target-aware decision helper and a written precedence contract.
- **Boundary:** Capability resolution does not replace acting-context, target-org, record-state, command-schema, audit, or idempotency enforcement; SEC-103/104 own those wrappers and migrations.
- **SQL:** None. No database or Supabase environment was contacted.
- **Verify:** 35 focused capability, lifecycle, and authorization-contract tests pass; touched ESLint passes.

### 2026-07-21 — `SEC-103`

- **Spec:** `docs/admin-feature-specs/01_Platform_Tenancy_RBAC_and_Audit.md` — new Admin endpoints cannot execute without context, schema validation, capability, target assertion, correlation ID, and structured error mapping.
- **Decision trail:** The canonical wrapper already authenticated, resolved context/capability, parsed Zod input, attached correlation, and failed closed on audit storage, but target assertion was optional. Bulk commands verified only the first tour ID, and organization commands did not reject a supplied cross-org ID at the wrapper boundary.
- **Change:** Every `withOrgCommand` declaration now requires an explicit organization or entity target. Organization targets reject mismatched `org_id`/`orgId`; entity targets resolve and verify every unique ID before audit intent or handler execution, including complete bulk lists. Invalid body parsing returns structured 422. Migrated all five existing wrapper call sites to explicit targets and documented the fixed enforcement order.
- **Boundary:** Legacy `withAdminAuth` remains a named compatibility gate and cannot be used for new canonical commands; SEC-104 owns its route-by-route removal. Domain services still enforce action-specific state and child ownership after the common parent boundary.
- **SQL:** None. No database or Supabase environment was contacted.
- **Verify:** 20 focused wrapper and authorization-contract tests pass; touched ESLint passes; integrated TypeScript reports no touched wrapper/route errors.
