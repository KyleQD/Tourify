# API Route Contracts

Keep route handlers under `app/api/**`, colocate Zod schemas, and use existing `requireApiUser` / `jsonError` conventions.

## Extend `POST /api/artist/music`

Add fields:

```json
{
  "rights_confirmed": true,
  "ai_use_category": "human_created",
  "ai_tools": [],
  "ai_disclosure_details": null,
  "training_use_policy": "rights_reserved",
  "music_upload_policy_version": "1.0.0",
  "human_music_policy_version": "1.0.0"
}
```

The route must:

1. preserve existing validation and marketplace/preview behavior
2. reject public `unknown` or `materially_generated` submissions under policy
3. insert the declaration snapshot
4. create an origin-processing event/outbox item
5. keep track private if trust writes fail
6. return trust status for UI rendering

## Certification endpoints

Suggested additive routes:

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/artist/music/certification` | Read or create own certification case |
| PATCH | `/api/artist/music/certification/[caseId]` | Draft update/submit/withdraw |
| POST | `/api/artist/music/certification/[caseId]/evidence` | Signed evidence upload preparation/registration |
| GET | `/api/artist/music/certification/[caseId]/events` | Artist-visible case history |
| GET | `/api/music/origin/[publicId]` | Public narrow verification payload |
| GET | `/api/music/certificate/[publicId]` | Public certificate status |
| GET/PATCH | `/api/admin/content/music/certifications` | Existing admin capability-gated review queue |

## Response shape

Return stable machine-readable status and narrow labels:

```json
{
  "trackId": "...",
  "originStatus": "recorded",
  "certificationStatus": "not_requested",
  "certificationLevel": 0,
  "publicLabel": "Artist submitted",
  "eligibleToRequestCertification": true,
  "blockingReasons": []
}
```

## Idempotency

Certification creation, declaration versioning, and origin issuance must be idempotent. Use request IDs or unique version constraints so retries cannot create conflicting active records.
