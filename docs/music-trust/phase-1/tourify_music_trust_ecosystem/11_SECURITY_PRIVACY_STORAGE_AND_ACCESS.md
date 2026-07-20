# Security, Privacy, Storage, and Access

## Storage

- Continue using private `artist-music` for audio.
- Keep signed upload URLs short-lived and path scoped.
- Keep signed stream URLs server-generated after `resolveMusicAccess`.
- Certification evidence should use a new private evidence prefix or private bucket after audit.
- Do not expose service-role credentials to clients.

## RLS

Every new exposed table must have RLS. Policies must distinguish:

- track owner
- authorized artist team member if supported
- invited contributor in later Rights Passport work
- capability-gated operations reviewer
- public verification data through a narrow API

Do not authorize using user-editable JWT metadata.

## Evidence privacy

Classify evidence as confidential or highly restricted. Use:

- short-lived signed download URLs
- reviewer access logs
- download restrictions where practical
- retention policy
- deletion/withdrawal rules that preserve legally necessary audit records

## Application security

- validate MIME and extension
- enforce size limits
- quarantine unsafe documents
- avoid request-time FFmpeg processing
- protect against IDOR/BOLA in certification routes
- require reauthentication for sensitive submissions or signatures
- rate limit upload URL, certification, public verification, and report endpoints
- make background tasks idempotent

## Key separation

Future credential signing, blockchain transaction, and storage credentials must be separate. Phase 1 should not add blockchain keys.
