# Publication, sharing, tour books, and Work Mode delivery

## Outcome

Replace best-effort “publish” and private Admin URL sharing with a durable, versioned distribution system. An authorized manager must know exactly what version was sent, to whom, through which channel, whether it arrived, whether acknowledgement is required, and what changed after publication.

## Current baseline and gaps

- Builder/readiness and Work Mode concepts provide a useful foundation.
- Current tour publish can be a direct status update followed by best-effort row inserts; server readiness is not consistently enforced and fan-out failures may be swallowed.
- A user can see success while workers receive no assignment/publication.
- Sharing commonly copies an authenticated Admin URL instead of creating a revocable, audience-scoped share.
- Advances, day sheets, maps, schedules, travel, contacts, and documents do not share one snapshot/audience/delivery model.
- There is no durable acknowledgement/retraction/correction workflow or offline/mobile package contract.

## Publication model

### Snapshot

A publication snapshot is immutable and records:

- organization, tour/event, source plan version, publication type, title, sequence/version;
- included sections and source record/version references;
- rendered payload/package checksum and access classification;
- publisher/approver, timestamp, superseded/retracted state and reason;
- audience definition and protected-field projection policy.

Publication types include tour book, itinerary, advance request/response, day sheet, run of show, schedule, site map, contact sheet, travel brief, change notice, and emergency notice.

### Audience

Audiences may derive from tour roles, department, event assignment, shift, travel group, named users, vendor/external contact, or secure public link. Audience evaluation is snapshotted so the system can prove who was targeted at send time. Sensitive sections require recipient eligibility in addition to audience membership.

### Delivery

Each recipient/channel has a delivery row with queued, processing, delivered, opened, acknowledged, failed, suppressed, expired, or revoked state; attempts; provider reference; last error class; and timestamps. Publication transaction writes the snapshot, audience, and outbox atomically. Workers process idempotently with retry/dead-letter handling.

### Change and retraction

- Publishing a new version does not mutate the old snapshot.
- A change notice contains a structured diff and impact severity.
- Acknowledgement can be required for selected audiences/changes with deadline/escalation.
- Retraction marks access invalid and sends a notice; it cannot erase audit history or guarantee deletion of already downloaded content.

## UX requirements

- Publish preview lists blockers, warnings/overrides, included sections, protected information, audiences, delivery channels, and recipients excluded by policy.
- Confirmation shows immutable version number and starts visible progress; “published” is not shown until the transaction succeeds.
- Delivery dashboard filters failures, unopened, and unacknowledged recipients and supports safe retry.
- Viewer shows version, generated time, local time zone context, offline freshness, superseded/retracted banner, and changes from prior version.
- Share dialog creates named, scoped, expiring, optionally passcode-protected links; copying an Admin route is not presented as sharing.

## Detailed task plan

### Phase 0–1 — decisions and infrastructure

| ID | Task | Acceptance criteria |
|---|---|---|
| PUB-001 | Approve publication ADR | Defines snapshot immutability, types, readiness, overrides, audience evaluation, acknowledgement, corrections, retraction, and retention. |
| PUB-002 | Classify publishable fields | Every section/field has audience class such as internal, worker, department, vendor, public, financial, personnel, or sensitive traveler data. |
| PUB-101 | Create outbox infrastructure | Domain transaction and outbox write are atomic; workers are idempotent; retry/backoff/dead letter/replay and correlation are implemented. |
| PUB-102 | Create publication schema | Snapshot, section, audience, recipient, delivery, acknowledgement, share token, access log, and outbox relations have org-scoped RLS. |
| PUB-103 | Build channel adapter contract | In-app is first-class; email/SMS/push adapters expose request, provider ID, delivery state, retryability, and cost/consent metadata. |

### Phase 2 — authoritative publishing and secure sharing

| ID | Task | Acceptance criteria |
|---|---|---|
| PUB-201 | Enforce server readiness in publish command | Command reloads persisted plan, evaluates rules inside transaction, rejects blockers, records authorized warning overrides, and cannot be bypassed by command-center UI. |
| PUB-202 | Build snapshot renderer | Same source version always generates equivalent manifest/checksum; missing section fails or is explicitly excluded rather than silently omitted. |
| PUB-203 | Build audience preview | Recipient resolution shows count, role/source, excluded recipients and reason, protected fields, and channel availability before confirmation. |
| PUB-204 | Implement transactional publish | Snapshot, audience, deliveries, lifecycle transition, audit, and outbox commit together; duplicate idempotency key returns original publication. |
| PUB-205 | Implement delivery dashboard | Managers see queued/delivered/opened/acknowledged/failed by channel/recipient, retry safe failures, and export authorized delivery evidence. |
| PUB-206 | Implement secure share links | Token is high entropy and hashed at rest; scope, expiry, optional passcode, download permission, max-use/revocation, and access logging are enforced. |
| PUB-207 | Implement retract/supersede | Access reflects current state immediately; recipients receive correction/retraction; old versions remain in authorized audit/history. |
| PUB-208 | Replace private URL copy | Tour, event, advance, map, and day-sheet sharing invoke the scoped share/publication service with no misleading Admin URL action. |

### Phase 3–4 — tour book and Work Mode

| ID | Task | Acceptance criteria |
|---|---|---|
| PUB-301 | Create composable tour-book sections | Itinerary, contacts, travel, lodging, schedules, advance, maps, hospitality, equipment, tickets/credentials, and emergency info render through versioned section contracts. |
| PUB-302 | Add recipient-specific projections | A worker/vendor/public viewer receives only permitted sections/fields; snapshot manifest records projection version and test fixture proves no data leakage. |
| PUB-303 | Add mobile/offline package | Authorized content can be cached with encrypted/local policy, expiry, sync status, and revoked/superseded warning; sensitive content follows platform security constraints. |
| PUB-401 | Unify Work Mode assignments | Publication creates/updates stable worker-facing assignment references rather than best-effort duplicates; role/shift changes reconcile deterministically. |
| PUB-402 | Add acknowledgement workflows | Publisher chooses required recipients/deadline; reminders/escalations are deduplicated; acknowledgement stores version and time. |
| PUB-403 | Add structured change notices | Post-publication change sets identify affected recipients/sections, show before/after in local context, require re-ack when policy says, and link remediation. |
| PUB-404 | Add emergency broadcast | Authorized high-priority notice supports bounded audience, multi-channel fanout, escalation, clear cancellation/correction, and abuse/audit controls. |

### Phase 6 — operations and release

| ID | Task | Acceptance criteria |
|---|---|---|
| PUB-601 | Publication SLO dashboard | Measures queue age, success, provider latency/error, retry/dead-letter count, open/ack rate, stale offline clients, and unauthorized-token attempts. |
| PUB-602 | Failure-injection tests | Database/outbox/provider/offline failures cannot lose a publication, duplicate recipients, mark false success, or expose another audience's content. |
| PUB-603 | Token/security review | Tests cover enumeration, replay, referrer leakage, caching, brute force, passcode throttling, revocation, screenshot/download expectations, and child assets. |
| PUB-604 | Retire legacy Work Mode fanout | Comparison shows canonical assignments/deliveries complete; legacy inserts and status-only publish paths are removed. |

## Deployment readiness

- Publish is one server command with readiness, immutable snapshot, audience, audit, and outbox transaction.
- Delivery failures are visible, retryable, and never reported as successful delivery.
- Every external link is scoped, expiring/revocable, access-logged, and field-filtered.
- New versions produce diffs; required recipients can acknowledge the exact version.
- Offline and Work Mode clients clearly identify stale/superseded/retracted content.
