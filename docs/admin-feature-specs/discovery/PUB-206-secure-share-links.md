# PUB-206 — Secure share links

**Date:** 2026-07-20  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Acceptance criteria

Token is high entropy and hashed at rest; scope, expiry, optional passcode, download permission, max-use/revocation, and access logging are enforced.

## Implementation

| Piece | Path |
|---|---|
| Pure token/gate helpers | `lib/admin/publication-share-links.ts` |
| Create / list / revoke / resolve | `lib/admin/publication-share-links.service.ts` |
| Admin APIs | `GET/POST /api/admin/publication/share-links`, `POST .../[id]/revoke` |
| Public resolve | `GET/POST /api/publication/shared/[token]` + viewer `/p/[token]` |
| Admin UI | `PublicationShareLinkDialog` (tour command center Share) |

## Security notes

- Token: 32-byte `base64url` plaintext returned **once**; `token_hash` = SHA-256 at rest  
- Passcode: bcrypt hash at rest; gate requires verified passcode when set  
- Access logs: view/download/denied/passcode_failed/revoked_hit/expired_hit/superseded_hit with IP hash  
- Responses: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`  
- Public path registered in `isPublicShareRoute`  

## Upstream

Uses PUB-102 `admin_publication_share_tokens` + `admin_publication_access_logs` and committed snapshots from PUB-204.
