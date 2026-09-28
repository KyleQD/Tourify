# Admin Completion Engineering Constitution

This document governs implementation of the Tourify Admin completion program. The JSON registry in this directory remains the only status authority.

## Safety and authority

- Treat historical ledgers, handoffs, chats, and external branches as reference material. They never promote status without current evidence.
- Preserve working behavior and use additive migrations. Never reset a persistent database or guess a tenant key during backfill; quarantine unresolved rows.
- Resolve organization, actor, capability, sender, and lifecycle authority from authenticated server state. UI visibility is never the security boundary.
- Keep service-role access inside reviewed jobs with explicit scope, actor attribution, audit events, durable idempotency, bounded retry, and dead-letter handling.
- Keep finance read-only for organization Admins, contracts tracking-only, and provider administration platform-internal.

## Execution discipline

- Work from one dependency-ready execution batch and its generated context pack.
- Open only the referenced specification sections, code paths, tests, and current official service documentation needed by that batch.
- Extend a canonical implementation before creating a parallel route, data model, component, or status system.
- Record individual specification-task outcomes even when tightly coupled tasks share one vertical implementation and verification cycle.
- Stop and repair registry drift, a changed security boundary, an unexplained broad-gate failure, or a stale reference/baseline hash before continuing.

## Verification and evidence

- Focused verification runs during implementation. Batch closure also requires integration, isolation, recipient, idempotency, retry, rollback, and audit assertions appropriate to the batch.
- Full type-check, build, migration, security, accessibility, responsive, performance, and clean-context verification remain release gates.
- Store full command output outside the registry and attach its hash through an immutable evidence receipt. Human-facing summaries must be derived from evidence.
- A batch implementation commit and its evidence commit are separate. A checkpoint or WIP commit receives no completion credit.
- A workflow is Done only after immutable CI and staging evidence, producer and recipient proof, negative security proof, recovery proof, independent verification, and required human sign-offs.

## Context budget

- Generated context packs are capped at 32 KiB and contain summaries plus source paths, never copied source files or historical narratives.
- If a pack exceeds the limit, split the batch or reduce duplicated prose; never omit linked records or weaken acceptance criteria.
- Reload the full registry only for discovery, drift investigation, security-boundary changes, or final release verification.
