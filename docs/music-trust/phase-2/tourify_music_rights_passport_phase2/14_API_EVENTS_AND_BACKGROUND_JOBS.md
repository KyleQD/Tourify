# API, Events, and Background Jobs

## API conventions

- route handlers under `app/api/**`;
- colocated Zod schemas;
- `requireApiUser` and `jsonError`;
- RORO helpers;
- idempotency keys for mutations;
- optimistic concurrency/version checks;
- no service-role secrets in clients;
- no request-time ffmpeg or blockchain wait.

## Suggested route groups

```text
/api/artist/music/rights/projects
/api/artist/music/rights/works
/api/artist/music/rights/recordings
/api/artist/music/rights/parties
/api/artist/music/rights/contributions
/api/artist/music/rights/claims
/api/artist/music/rights/invitations
/api/artist/music/rights/agreements
/api/artist/music/rights/signatures
/api/artist/music/rights/evidence
/api/artist/music/rights/passports
/api/artist/music/rights/protected-derivatives
/api/artist/music/catalog-imports

/api/music/rights/passports/[publicId]
/api/music/rights/verify/[publicId]

/api/admin/content/music/rights/review
/api/admin/content/music/rights/disputes
```

Actual paths must match repository conventions after audit.

## Events

```text
music.rights.project.created
music.rights.work.created
music.rights.recording.linked
music.rights.party.invited
music.rights.contribution.confirmed
music.rights.claim.proposed
music.rights.claim.accepted
music.rights.claim.disputed
music.rights.agreement.generated
music.rights.agreement.signed
music.rights.certification.submitted
music.rights.certification.decided
music.rights.passport.issued
music.rights.passport.superseded
music.rights.passport.suspended
music.rights.derivative.requested
music.rights.c2pa.signed
music.rights.anchor.requested
music.rights.anchor.confirmed
```

Future systems consume events, not undocumented table reads.

## Jobs

- catalog import normalization;
- source hash/fingerprint;
- duplicate matching;
- evidence scanning;
- agreement rendering;
- signature sealing;
- passport manifest generation;
- credential issuance;
- C2PA derivative generation;
- watermark embedding/detection;
- blockchain anchoring;
- external monitoring match intake;
- export package generation.

## Job requirements

- idempotency;
- deduplication key;
- attempts;
- next retry;
- lease/lock;
- heartbeat where needed;
- error class;
- dead-letter state;
- source event ID;
- owner/project context;
- trace ID;
- metrics.

## Observability

Track:

- queue depth;
- processing latency;
- failure rate;
- retry rate;
- orphaned uploads;
- signature webhook failures;
- manifest validation failures;
- C2PA failures;
- blockchain pending age;
- reviewer backlog;
- dispute backlog;
- public verification errors.

Sensitive data must not enter logs.
