# Database questions for the product owner

Audit task `DB-001` (read-only). These questions convert the open findings in
`GAPS.md` into bounded follow-up work. The audit is not blocked on answers;
each answer should become a task record owned by the Database agent.

## P1 — correctness, security, and release evidence

### Q1. What is the release evidence boundary for the current chain? (I-1, I-2, I-3)

**Recommended action: fix; sequence first.** The source chain has 289 files,
but the latest local apply proof covers 287 and the 106 manifests contain no
`production_verified` entry. Should the two-file delta be applied and verified
locally, and should DB-002's Management API evidence be promoted to explicit
production status by Release? Define the required evidence for G2/G7 and the
owner of each gate.

### Q2. Which table/persona matrix is the RLS contract? (M-2, R-3, R-4, I-6)

**Recommended action: build + fix; sequence before public scale.** Approve the
table-by-table RLS matrix, including anonymous/public reads, authenticated
member access, organization/venue/artist scope, service principals, restrictive
policies, view invoker behavior, and the SELECT prerequisite for UPDATE. Should
legacy duplicate policies be dropped after the matrix passes, or retained with
an explicit compatibility reason?

### Q3. What is the canonical ticketing schema and cutover gate? (I-5)

**Recommended action: fix; sequence before ticketing expansion.** Confirm the
canonical tables and columns across ticket types, sales/orders, admissions,
invites, guest lists, and settlement/read models. Should DB-005 reconcile the
planned ticketing migrations in place, and what delta or zero-drift test blocks
cutover?

### Q4. Is the agent identity path ready for one approved route? (I-4)

**Recommended action: fix; sequence after Q1.** Approve the non-production
service-principal provisioning scope, validation evidence, credential rotation
owner, and first route to wire through `authenticateAgentRequest`. If not yet
ready, should the migration remain source-only and which verification is the
next gate?

## P2 — product direction, integrity, and scale

### Q5. Which events table is canonical? (I-6)

**Recommended action: fix or drop; sequence before more event work.** Choose
`events` or `events_v2`, define the migration/read-write cutover, and decide
whether runtime schema probing is forbidden after the cutover. This answers the
open DB-006 task and the conflict documented in
`.agents/plans/phase-0-data-integrity.md`.

### Q6. What trigger/data-propagation inventory is required? (M-1)

**Recommended action: build; sequence before counter repair or erasure.** Approve
the generated trigger map fields: table, event, function, security context,
side effects, idempotency, and rollback/erase behavior. Identify which counters,
fanout jobs, and sync triggers need invariants or repair migrations.

### Q7. What scale targets govern indexes and hot policies? (M-3)

**Recommended action: build + fix.** Provide expected row volumes, p95 latency,
lock budget, and retention targets for ticketing, hiring, telemetry, and
organization-scoped queries. Then DB work can prioritize FK indexes, initplan
rewrites, partitions, retention jobs, and concurrent index operations.

### Q8. What is the required GDPR erasure disposition? (M-5)

**Recommended action: build.** Approve whether each table without an
`auth.users` foreign key is deleted, anonymized, retained for audit, or excluded
by legal policy. Define treatment of telemetry, content, payment, integration,
and service-principal records.

### Q9. Which legacy artifacts may be retired? (R-1, R-2, R-5)

**Recommended action: drop after Q1/Q2.** Confirm retirement of manual SQL
instructions, backup/archive apply ambiguity, and the two local placeholder
Supabase client/type files. The active root and canonical generated type are now
established; the remaining decision is the safe removal/documentation sequence.

## Cross-domain sequencing

- Q1 gates release confidence and should be answered before promoting more
  migrations.
- Q2 gates every surface agent's authorization assumptions.
- Q3 and Q5 gate ticketing and event-facing agents.
- Q4 gates service-principal route adoption.
- Q6–Q8 are database hardening follow-ups; Q9 is cleanup after the source and
  authorization contracts are stable.

## Owner decisions — 2026-09-10

- Q1: require both staging and production evidence before release claims.
- Q2: retain a hybrid persona/RLS matrix; `docs/organization-personas.md` is
  the canonical human-readable source and live database evidence is authoritative.
- Q3: use an additive ticketing reconciliation and a zero-drift/cutover test.
- Q5: make `events_v2` canonical and remove hot-path schema probing after cutover.
- Q6: staged migrations are approved for the gated manual-apply pipeline with
  explicit postflight evidence; CP-051 forbids reset or forced replay.
- Q4, Q7–Q9 remain follow-up evidence and retirement decisions.
